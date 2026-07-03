import { campaignEvents } from '@/lib/events'
import type { CampaignEvent } from '@/lib/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const enc = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let eventId = 0

      // Initial comment — no id needed
      controller.enqueue(enc.encode(`: connected\n\n`))

      // Heartbeat prevents proxy/load-balancer timeouts on long-running campaigns
      const heartbeat = setInterval(() => {
        try { controller.enqueue(enc.encode(': heartbeat\n\n')) } catch { /* closed */ }
      }, 30000)

      const listener = (event: CampaignEvent) => {
        eventId++
        try {
          controller.enqueue(enc.encode(`id: ${eventId}\ndata: ${JSON.stringify(event)}\n\n`))
        } catch { /* stream closed */ }
      }

      campaignEvents.on(id, listener)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        campaignEvents.off(id, listener)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
