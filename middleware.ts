import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Lazy-init: one Redis client, three Ratelimit tiers, shared ephemeral cache
// ---------------------------------------------------------------------------
const PREFIX = 'x402-base-sepolia:rl'

let limiters:
  | { cowsays: Ratelimit; events: Ratelimit; defaultRL: Ratelimit }
  | null
  | 'disabled' = null

function getLimiters() {
  if (limiters !== null) return limiters

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    limiters = 'disabled'
    return limiters
  }

  const redis = new Redis({ url, token })
  const cache = new Map()

  limiters = {
    cowsays: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: `${PREFIX}:cowsays`,
      ephemeralCache: cache,
    }),
    events: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: `${PREFIX}:events`,
      ephemeralCache: cache,
    }),
    defaultRL: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: `${PREFIX}:default`,
      ephemeralCache: cache,
    }),
  }
  return limiters
}

function pickLimiter(pathname: string, l: Exclude<ReturnType<typeof getLimiters>, 'disabled' | null>) {
  if (pathname === '/api/cowsays') return l.cowsays
  if (pathname === '/api/events') return l.events
  return l.defaultRL
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const l = getLimiters()
  if (l === 'disabled') return NextResponse.next()

  const ip =
    request.ip ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'

  const pathname = request.nextUrl.pathname
  const limiter = pickLimiter(pathname, l)

  const { success, pending, reset } = await limiter.limit(ip)

  // Let Upstash flush analytics even after the response is sent
  const ctx = (request as unknown as { event?: { waitUntil: (p: Promise<unknown>) => void } }).event
  if (ctx?.waitUntil) ctx.waitUntil(pending)

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/.well-known/:path*'],
}
