import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const PREFIX = 'x402-base-sepolia:rl'

// ---------------------------------------------------------------------------
// Tier config — add/remove routes here, everything else is derived
// ---------------------------------------------------------------------------
const tiers = [
  { route: '/api/cowsays', limit: 10, window: '60 s' as Duration },
  { route: '/api/events', limit: 5, window: '60 s' as Duration },
]

const DEFAULT_TIER = { limit: 30, window: '60 s' as Duration }

// ---------------------------------------------------------------------------
// Lazy singleton — skips init when env vars are missing (local dev)
// ---------------------------------------------------------------------------
type Limiters = { routes: Map<string, Ratelimit>; fallback: Ratelimit }

let instance: Limiters | null | 'disabled' = null

function init(): Limiters | 'disabled' {
  if (instance !== null) return instance

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    instance = 'disabled'
    return instance
  }

  const redis = new Redis({ url, token })
  const cache = new Map()

  const make = (prefix: string, limit: number, window: Duration) =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `${PREFIX}:${prefix}`,
      ephemeralCache: cache,
    })

  const routes = new Map<string, Ratelimit>()
  for (const t of tiers) {
    routes.set(t.route, make(t.route.replace(/^\/api\//, ''), t.limit, t.window))
  }

  instance = { routes, fallback: make('default', DEFAULT_TIER.limit, DEFAULT_TIER.window) }
  return instance
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export type RateLimitResult =
  | { allowed: true; pending: Promise<unknown> }
  | { allowed: false; retryAfter: number; pending: Promise<unknown> }

export async function rateLimit(ip: string, pathname: string): Promise<RateLimitResult | null> {
  const l = init()
  if (l === 'disabled') return null

  const limiter = l.routes.get(pathname) ?? l.fallback
  const { success, pending, reset } = await limiter.limit(ip)

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { allowed: false, retryAfter, pending }
  }

  return { allowed: true, pending }
}
