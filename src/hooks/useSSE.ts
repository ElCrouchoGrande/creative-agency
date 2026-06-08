'use client'

import { useEffect, useRef } from 'react'
import type { CampaignEvent } from '@/lib/types'

export function useSSE(
  campaignId: string | null,
  onEvent: (event: CampaignEvent) => void
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!campaignId) return

    const source = new EventSource(`/api/campaigns/${campaignId}/stream`)

    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as CampaignEvent
        onEventRef.current(event)
      } catch {
        // ignore malformed events
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => source.close()
  }, [campaignId])
}
