import { campaignEvents } from '@/lib/events'
import type { CampaignEvent } from '@/lib/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CampaignEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Heartbeat so client knows connection is alive
      controller.enqueue(encoder.encode(`: connected\n\n`))

      campaignEvents.on(id, send)

      req.signal.addEventListener('abort', () => {
        campaignEvents.off(id, send)
        controller.close()
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
