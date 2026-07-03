'use client'

import { useEffect, useRef, useState } from 'react'
import type { CampaignEvent } from '@/lib/types'

export function useSSE(
  campaignId: string | null,
  onEvent: (event: CampaignEvent) => void
): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const lastEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!campaignId) return

    let source: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 1000
    let cancelled = false

    function connect() {
      if (cancelled) return
      const url = lastEventIdRef.current
        ? `/api/campaigns/${campaignId}/stream?lastEventId=${lastEventIdRef.current}`
        : `/api/campaigns/${campaignId}/stream`
      source = new EventSource(url)

      source.onopen = () => {
        setConnected(true)
        retryDelay = 1000 // reset backoff on successful connection
      }

      source.onmessage = (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId
        try {
          const event = JSON.parse(e.data) as CampaignEvent
          onEventRef.current(event)
        } catch {
          // ignore malformed events
        }
      }

      source.onerror = () => {
        setConnected(false)
        source?.close()
        source = null
        if (!cancelled) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000) // cap at 30s
            connect()
          }, retryDelay)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      setConnected(false)
      if (retryTimeout) clearTimeout(retryTimeout)
      source?.close()
    }
  }, [campaignId])

  return { connected }
}
