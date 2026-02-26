import { subscribe } from '@/lib/events'

// Force Node.js runtime — SSE needs a persistent connection, not edge/serverless
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  const encoder = new TextEncoder()

  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial comment so the browser receives the first byte
      // immediately and fires EventSource.onopen without waiting for
      // the first real event or the 25 s heartbeat.
      controller.enqueue(encoder.encode(': ok\n\n'))

      unsubscribe = subscribe((event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Client disconnected — ignore; cancel() will clean up
        }
      })

      // Keep the connection alive through proxies / load balancers
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          if (heartbeat) clearInterval(heartbeat)
          if (unsubscribe) unsubscribe()
        }
      }, 25000)
    },

    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      if (unsubscribe) unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tell nginx/Vercel not to buffer SSE responses
      'X-Accel-Buffering': 'no',
    },
  })
}
