'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCampaign } from '@/hooks/useCampaign'
import { GameShell } from '@/components/game/GameShell'
import { ScreenWipe } from '@/components/game/ui/ScreenWipe'
import { QuestScroll } from '@/components/game/scenes/QuestScroll'
import { IntelRoom } from '@/components/game/scenes/IntelRoom'
import { BranchingGate } from '@/components/game/scenes/BranchingGate'
import { AgencyBuilding } from '@/components/game/scenes/AgencyBuilding'
import { ResultsRoom } from '@/components/game/scenes/ResultsRoom'
import type { CampaignStatus } from '@/lib/types'

function sceneKey(status: CampaignStatus): string {
  if (status === 'researching' || status === 'creative') return 'intel'
  if (status === 'awaiting_path') return 'gate'
  if (['specialist', 'challenge', 'measuring'].includes(status)) return 'building'
  if (status === 'awaiting_review' || status === 'complete') return 'results'
  if (status === 'failed') return 'failed'
  return status
}

export default function CampaignWorld() {
  const { id } = useParams<{ id: string }>()
  const { state, loading, error, connected, approvePath, retryTeam } = useCampaign(id)

  // null = not yet initialised (prevents spurious gate on first load)
  const [displayedStatus, setDisplayedStatus] = useState<CampaignStatus | null>(null)

  // Snap to actual status on first meaningful hydration, then hold
  useEffect(() => {
    if (displayedStatus === null && state.brief.brand) {
      setDisplayedStatus(state.status)
    }
  }, [state.brief.brand, state.status, displayedStatus])

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
        <div style={{ fontSize: 14 }}>✕</div>
        <div style={{ fontSize: 10 }}>Campaign not found</div>
      </div>
    )
  }

  if (loading && !state.brief.brand) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--ink)' }}>
        Loading…
      </div>
    )
  }

  const effectiveStatus = displayedStatus ?? state.status
  const hasNewPhase = displayedStatus !== null && displayedStatus !== state.status
  const displayedState = { ...state, status: effectiveStatus }
  const key = sceneKey(effectiveStatus)

  const scene = (() => {
    switch (key) {
      case 'intel':    return <IntelRoom state={displayedState} />
      case 'gate':     return <BranchingGate state={displayedState} approvePath={approvePath} />
      case 'building': return <AgencyBuilding state={displayedState} />
      case 'results':  return <ResultsRoom state={displayedState} retryTeam={retryTeam} />
      case 'failed':   return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 16 }}>✕</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--accent-red, #e53)', marginBottom: 8 }}>CAMPAIGN FAILED</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-dim)' }}>
            Something went wrong during the pipeline. The agents have been notified.
          </div>
        </div>
      )
      default:         return <QuestScroll />
    }
  })()

  return (
    <GameShell state={state} connected={connected}>
      <ScreenWipe key={key} />
      {scene}
      {hasNewPhase && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 95 }}>
          <button
            className="pixel-button"
            onClick={() => setDisplayedStatus(state.status)}
            style={{ animation: 'nudge 1s steps(2) infinite' }}
          >
            ▶ CONTINUE
          </button>
        </div>
      )}
    </GameShell>
  )
}
