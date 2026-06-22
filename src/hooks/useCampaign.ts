'use client'

import { useReducer, useEffect, useCallback, useRef } from 'react'
import { getCampaign, approvePath as apiApprovePath, retryTeam as apiRetryTeam } from '@/lib/api'
import { useSSE } from './useSSE'
import { campaignReducer, initialState } from '@/lib/game/campaignReducer'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import type { CampaignEvent } from '@/lib/types'

const ACTIVE_STATUSES = new Set(['specialist', 'challenge', 'measuring'])
const POLL_FAST_MS = 3000
const POLL_SLOW_MS = 8000

interface UseCampaignReturn {
  state: CampaignClientState
  loading: boolean
  error: string | null
  approvePath(pathId: 'A' | 'B' | 'C'): Promise<void>
  retryTeam(team: string): Promise<void>
  refetch(): Promise<void>
}

export function useCampaign(id: string): UseCampaignReturn {
  const [state, dispatch] = useReducer(campaignReducer, initialState(id))
  const loadingRef = useRef(true)
  const errorRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    loadingRef.current = true

    getCampaign(id)
      .then((campaign) => {
        if (!mountedRef.current) return
        dispatch({ type: 'HYDRATE', campaign })
        loadingRef.current = false
      })
      .catch((e) => {
        if (!mountedRef.current) return
        errorRef.current = String(e)
        loadingRef.current = false
      })

    return () => { mountedRef.current = false }
  }, [id])

  // SSE events
  const handleEvent = useCallback((event: CampaignEvent) => {
    dispatch({ type: 'SSE_EVENT', event })
  }, [])
  useSSE(id, handleEvent)

  // Fast poll: 3s while active but activeTeams empty (orchestrator async gap)
  useEffect(() => {
    if (!ACTIVE_STATUSES.has(state.status) || state.activeTeams.length > 0) return
    const iv = setInterval(async () => {
      if (!mountedRef.current) return
      const campaign = await getCampaign(id).catch(() => null)
      if (campaign && mountedRef.current) {
        dispatch({ type: 'HYDRATE_STATUS_ONLY', campaign })
      }
    }, POLL_FAST_MS)
    return () => clearInterval(iv)
  }, [id, state.status, state.activeTeams.length])

  // Slow poll: 8s status check to catch missed phase_change SSE events
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!mountedRef.current) return
      const campaign = await getCampaign(id).catch(() => null)
      if (campaign && mountedRef.current) {
        dispatch({ type: 'HYDRATE_STATUS_ONLY', campaign })
      }
    }, POLL_SLOW_MS)
    return () => clearInterval(iv)
  }, [id])

  const approvePath = useCallback(async (pathId: 'A' | 'B' | 'C') => {
    await apiApprovePath(id, pathId)
    dispatch({ type: 'SSE_EVENT', event: { type: 'phase_change', status: 'specialist' } })
  }, [id])

  const retryTeam = useCallback(async (team: string) => {
    await apiRetryTeam(id, team)
  }, [id])

  const refetch = useCallback(async () => {
    const campaign = await getCampaign(id)
    dispatch({ type: 'HYDRATE', campaign })
  }, [id])

  return {
    state,
    loading: loadingRef.current,
    error: errorRef.current,
    approvePath,
    retryTeam,
    refetch,
  }
}
