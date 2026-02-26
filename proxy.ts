import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function proxy(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'

  const result = await rateLimit(ip, request.nextUrl.pathname)
  if (!result) return NextResponse.next()

  // Let Upstash flush analytics after the response is sent
  const ctx = (request as unknown as { event?: { waitUntil: (p: Promise<unknown>) => void } }).event
  if (ctx?.waitUntil) ctx.waitUntil(result.pending)

  if (!result.allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/.well-known/:path*'],
}
