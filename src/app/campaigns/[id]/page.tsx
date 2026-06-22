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
  return status
}

export default function CampaignWorld() {
  const { id } = useParams<{ id: string }>()
  const { state, loading, approvePath, retryTeam } = useCampaign(id)

  // null = not yet initialised (prevents spurious gate on first load)
  const [displayedStatus, setDisplayedStatus] = useState<CampaignStatus | null>(null)

  // Snap to actual status on first meaningful hydration, then hold
  useEffect(() => {
    if (displayedStatus === null && state.brief.brand) {
      setDisplayedStatus(state.status)
    }
  }, [state.brief.brand, state.status, displayedStatus])

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
      default:         return <QuestScroll />
    }
  })()

  return (
    <GameShell state={state}>
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
