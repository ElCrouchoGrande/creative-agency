'use client'

import { useState } from 'react'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import { teamLabel } from '@/lib/game/teams'
import { PixelButton } from '../ui/PixelButton'
import { Binder } from '../Binder'
import type { TeamName } from '@/lib/types'

interface AwaitingCreationGateProps {
  state: CampaignClientState
  approveCreation(): Promise<void>
}

export function AwaitingCreationGate({ state, approveCreation }: AwaitingCreationGateProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  const { warRoom, activeTeams } = state
  const teams = activeTeams as TeamName[]

  async function handleApprove() {
    setConfirming(true)
    setConfirmError(null)
    try {
      await approveCreation()
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const openPlan = openTeam
    ? (warRoom.teamOutputs?.[openTeam as TeamName]?.challengeResponse || warRoom.teamOutputs?.[openTeam as TeamName]?.draft) ?? ''
    : ''

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', letterSpacing: 2, marginBottom: 8 }}>STRATEGY COMPLETE</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 6 }}>Review team plans</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-dim)', marginBottom: 24 }}>
          Teams have finished their strategies. Review the plans below, then generate the actual campaign materials.
        </p>
      </div>

      {/* Team plan list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {teams.map((team) => {
          const output = warRoom.teamOutputs?.[team]
          const plan = output?.challengeResponse || output?.draft
          return (
            <div
              key={team}
              onClick={() => plan && setOpenTeam(team)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--panel)', border: '4px solid var(--ink)',
                boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
                cursor: plan ? 'pointer' : 'default',
                opacity: plan ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 16 }}>📄</span>
              <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 8 }}>{teamLabel(team)}</div>
              {output?.challengeResponse && (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: 'var(--led-done)' }}>REVISED</span>
              )}
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid var(--ink)',
                background: plan ? 'var(--led-done)' : 'transparent',
              }} />
              {plan && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--hud)' }}>▶ READ</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Approve button */}
      <div style={{ textAlign: 'center' }}>
        <PixelButton onClick={handleApprove} disabled={confirming}>
          {confirming ? 'GENERATING…' : '▶ GENERATE ASSETS'}
        </PixelButton>
        {confirmError && (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--error, #c0392b)', marginTop: 10, letterSpacing: 1 }}>
            ✕ {confirmError}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-dim)', marginTop: 10 }}>
          Teams will produce press releases, social posts, creator briefs, and more.
        </p>
      </div>

      {/* Plan binder */}
      {openTeam && openPlan && (
        <Binder
          title={teamLabel(openTeam).toUpperCase()}
          content={openPlan}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </div>
  )
}
