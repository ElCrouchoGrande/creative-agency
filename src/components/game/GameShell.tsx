'use client'

import { ReactNode } from 'react'
import type { CampaignStatus } from '@/lib/types'
import { DialogueBox } from './DialogueBox'
import { CampaignProvider, useCampaignContext } from './CampaignContext'
import type { CampaignClientState } from '@/lib/game/campaignReducer'

interface GameShellProps {
  state: CampaignClientState
  children: ReactNode
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  briefing:       'BRIEFING',
  researching:    'RESEARCHING',
  creative:       'CREATIVE',
  awaiting_path:  'CHOOSE YOUR PATH',
  specialist:     'TEAMS AT WORK',
  challenge:      'CROSS-CHALLENGE',
  measuring:      'MEASURING',
  awaiting_review:'REVIEW',
  complete:       'COMPLETE',
}

export function GameShell({ state, children }: GameShellProps) {
  return (
    <CampaignProvider>
      <GameShellInner state={state}>{children}</GameShellInner>
    </CampaignProvider>
  )
}

function GameShellInner({ state, children }: GameShellProps) {
  const { unpin } = useCampaignContext()
  const narration = state.currentNarration

  return (
    <div style={{ minHeight: '100vh', paddingBottom: narration ? 180 : 0 }}>
      {/* HUD top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 80,
        background: 'var(--hud)', color: 'var(--hud-ink)',
        borderBottom: '4px solid var(--ink)',
        boxShadow: '0 4px 0 rgba(0,0,0,.4)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '12px 16px',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1 }}>♛ BRANDS BY BOWSER</span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 16, opacity: .9,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 420, display: 'inline-block',
        }}>
          {state.brief.brand.split(/[-–—·]/)[0].trim()} · {state.brief.goal}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 8,
          background: 'rgba(0,0,0,.25)', padding: '4px 8px',
          border: '2px solid rgba(255,255,255,.3)',
        }}>
          {STATUS_LABELS[state.status] ?? state.status.toUpperCase()}
        </span>
      </div>

      {/* Scene content */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '22px 18px' }}>
        {children}
      </div>

      {/* Dialogue box — short narration lines only, not raw plan text */}
      {narration && (
        <DialogueBox
          line={narration}
          onUnpin={unpin}
        />
      )}
    </div>
  )
}
