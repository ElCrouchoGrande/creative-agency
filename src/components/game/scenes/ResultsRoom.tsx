'use client'

import { useState, useEffect } from 'react'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import { teamLabel } from '@/lib/game/teams'
import { PixelButton } from '../ui/PixelButton'
import { Binder } from '../Binder'
import type { TeamName } from '@/lib/types'

interface ResultsRoomProps {
  state: CampaignClientState
  retryTeam(team: string): Promise<void>
}

export function ResultsRoom({ state, retryTeam }: ResultsRoomProps) {
  const [copying, setCopying] = useState(false)
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<'summary' | 'measurement' | 'integration' | null>(null)
  const { warRoom, activeTeams, brief } = state
  const teams = activeTeams as TeamName[]

  // Clear regenerating spinner when draft arrives via state update
  useEffect(() => {
    if (regenerating.size === 0) return
    setRegenerating((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const team of next) {
        if (warRoom.teamOutputs?.[team as TeamName]?.draft) {
          next.delete(team)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [warRoom.teamOutputs, regenerating.size])

  function buildMarkdown() {
    const lines: string[] = []
    lines.push(`# Campaign: ${brief.goal}`)
    lines.push(`\n**Brand:** ${brief.brand}`)
    lines.push(`**Audience:** ${brief.audience}`)
    if (warRoom.summary) {
      lines.push('\n## Campaign Summary')
      lines.push(warRoom.summary)
    }
    if (warRoom.chosenPath) {
      lines.push(`\n## Creative Path: ${warRoom.chosenPath.concept}`)
      lines.push(warRoom.chosenPath.rationale)
      lines.push('\n**Key Messages:**')
      warRoom.chosenPath.keyMessages.forEach((m) => lines.push(`- ${m}`))
    }
    for (const team of teams) {
      const output = warRoom.teamOutputs?.[team]
      if (!output?.draft) continue
      lines.push(`\n## ${teamLabel(team)}`)
      lines.push(output.challengeResponse || output.draft)
    }
    if (warRoom.measurement) {
      lines.push('\n## Measurement Framework')
      lines.push(warRoom.measurement)
    }
    if (warRoom.integration) {
      lines.push('\n## Campaign Integration Map')
      lines.push(warRoom.integration)
    }
    return lines.join('\n')
  }

  async function handleCopy() {
    setCopying(true)
    await navigator.clipboard.writeText(buildMarkdown())
    setTimeout(() => setCopying(false), 1500)
  }

  async function handleRegenerate(team: string) {
    setRegenerating((prev) => new Set([...prev, team]))
    await retryTeam(team)
  }

  const teamPlan = openTeam ? (warRoom.teamOutputs?.[openTeam as TeamName]?.challengeResponse || warRoom.teamOutputs?.[openTeam as TeamName]?.draft) ?? '' : ''

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', marginBottom: 6 }}>CAMPAIGN COMPLETE</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{brief.goal}</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-dim)' }}>{brief.brand}</p>
          {warRoom.campaignName && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, marginTop: 4, color: 'var(--accent2)' }}>
              {warRoom.campaignName}
            </div>
          )}
          {warRoom.campaignTagline && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-dim)', marginTop: 2 }}>
              {warRoom.campaignTagline}
            </div>
          )}
        </div>
        <PixelButton onClick={handleCopy}>{copying ? 'COPIED!' : '⧉ COPY MD'}</PixelButton>
      </div>

      {/* Chosen path */}
      {warRoom.chosenPath && (
        <div style={{ marginBottom: 20, padding: 20, background: 'var(--ink)', color: '#fff', border: '4px solid var(--ink)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--ink-dim)', marginBottom: 8 }}>CHOSEN CREATIVE PATH</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, marginBottom: 8 }}>{warRoom.chosenPath.concept}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#ccc', marginBottom: 12 }}>{warRoom.chosenPath.rationale}</div>
          {warRoom.chosenPath.keyMessages.map((m, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#aaa' }}>— {m}</div>
          ))}
        </div>
      )}

      {/* Dossier — summary, measurement, integration, team plans as folder entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--ink-dim)', marginBottom: 4, letterSpacing: 1 }}>
          CAMPAIGN DOSSIER
        </div>

        {/* Campaign summary entry */}
        {warRoom.summary && (
          <FolderEntry
            icon="📋"
            label="CAMPAIGN SUMMARY"
            onClick={() => setOpenSection('summary')}
          />
        )}

        {/* Measurement entry */}
        {warRoom.measurement && (
          <FolderEntry
            icon="📊"
            label="MEASUREMENT FRAMEWORK"
            onClick={() => setOpenSection('measurement')}
          />
        )}

        {/* Integration Map entry */}
        {warRoom.integration && (
          <div
            onClick={() => setOpenSection('integration')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', marginBottom: 8,
              background: 'var(--panel)', border: '4px solid var(--ink)',
              boxShadow: '4px 4px 0 rgba(0,0,0,.3)', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>🔗</span>
            <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 8 }}>INTEGRATION MAP</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--hud)' }}>▶ READ</div>
          </div>
        )}

        {/* Team plan entries */}
        {teams.map((team) => {
          const output = warRoom.teamOutputs?.[team]
          const hasPlan = Boolean(output?.draft)
          const isRunning = regenerating.has(team)
          return (
            <div
              key={team}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--panel)', border: '4px solid var(--ink)',
                boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
                cursor: hasPlan ? 'pointer' : 'default',
                opacity: hasPlan ? 1 : 0.5,
              }}
              onClick={() => hasPlan && !isRunning && setOpenTeam(team)}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 8 }}>{teamLabel(team)}</div>
              {output?.challengeResponse && (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: 'var(--led-done)', flexShrink: 0 }}>REVISED</span>
              )}
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid var(--ink)', flexShrink: 0,
                background: hasPlan ? 'var(--led-done)' : 'transparent',
              }} />
              <button
                onClick={(e) => { e.stopPropagation(); handleRegenerate(team) }}
                disabled={isRunning}
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                {isRunning ? '⟳' : '↺'}
              </button>
              {hasPlan && !isRunning && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--hud)', flexShrink: 0 }}>▶ READ</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Binders */}
      {openSection === 'summary' && warRoom.summary && (
        <Binder title="CAMPAIGN SUMMARY" content={warRoom.summary} onClose={() => setOpenSection(null)} />
      )}
      {openSection === 'measurement' && warRoom.measurement && (
        <Binder title="MEASUREMENT FRAMEWORK" content={warRoom.measurement} onClose={() => setOpenSection(null)} />
      )}
      {openSection === 'integration' && warRoom.integration && (
        <Binder title="INTEGRATION MAP" content={warRoom.integration} onClose={() => setOpenSection(null)} />
      )}
      {openTeam && teamPlan && (
        <Binder
          title={teamLabel(openTeam).toUpperCase()}
          content={teamPlan}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </div>
  )
}

function FolderEntry({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'var(--panel)', border: '4px solid var(--ink)',
        boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 8 }}>{label}</div>
      <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--led-done)', flexShrink: 0 }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--hud)', flexShrink: 0 }}>▶ READ</div>
    </div>
  )
}
