'use client'

import { useState } from 'react'
import type { TeamState } from '@/lib/game/campaignReducer'
import { teamLabel, agentLabel } from '@/lib/game/teams'
import { renderMarkdown } from '@/lib/renderMarkdown'

interface RoomDetailProps {
  teamState: TeamState
  onClose: () => void
}

const AGENT_ORDER = ['strategist', 'specialist', 'strategist_close', 'challenge_response',
  'landscape_analyst', 'trend_spotter', 'white_space_finder',
  'strategist_a', 'strategist_b', 'strategist_c',
  'orchestrator', 'facilitator', 'measurement', 'summary']

export function RoomDetail({ teamState, onClose }: RoomDetailProps) {
  const agentTabs = AGENT_ORDER.filter((a) => teamState.agents[a]?.output)

  const tabs: Array<{ key: string; label: string }> = [
    ...agentTabs.map((a) => ({ key: a, label: agentLabel(a) })),
    ...(teamState.challengeInput ? [{ key: 'challenge', label: 'CHALLENGE' }] : []),
    ...(teamState.challengeResponse ? [{ key: 'revised', label: 'REVISED PLAN' }] : []),
  ]

  const defaultTab = teamState.challengeResponse ? 'revised'
    : teamState.challengeInput ? 'challenge'
    : agentTabs[agentTabs.length - 1] ?? ''

  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.key || '')

  function tabContent(key: string): string {
    if (key === 'challenge') return teamState.challengeInput ?? ''
    if (key === 'revised') return teamState.challengeResponse ?? ''
    return teamState.agents[key]?.output ?? ''
  }

  function statusIcon(key: string): string {
    const s = teamState.agents[key]?.status
    if (s === 'running') return ' ⟳'
    if (s === 'complete') return ' ✓'
    if (s === 'failed') return ' ✗'
    return ''
  }

  const content = tabContent(activeTab)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(58,35,15,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{
          maxWidth: 800, width: '100%', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'var(--hud)', color: 'var(--hud-ink)',
          padding: '12px 16px', borderBottom: '3px solid var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-display)', fontSize: 10, flexShrink: 0,
        }}>
          <span>{teamLabel(teamState.team)}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--hud-ink)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-display)' }}
          >
            ✕
          </button>
        </div>

        {/* Tab row */}
        {tabs.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4,
            padding: '8px 12px', borderBottom: '3px solid var(--ink)',
            background: 'var(--panel2)', flexShrink: 0,
          }}>
            {tabs.map(({ key, label }) => {
              const isActive = key === activeTab
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: 7,
                    padding: '5px 8px', cursor: 'pointer',
                    border: `2px solid ${isActive ? 'var(--ink)' : 'var(--ink-dim)'}`,
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#241405' : 'var(--ink-dim)',
                  }}
                >
                  {label}{key !== 'challenge' && key !== 'revised' ? statusIcon(key) : ''}
                </button>
              )
            })}
          </div>
        )}

        {/* Content area */}
        <div style={{ overflow: 'auto', flex: 1, padding: '16px 20px', fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.35, color: 'var(--ink)' }}>
          {content
            ? renderMarkdown(content)
            : <em style={{ color: 'var(--ink-dim)' }}>Working…</em>
          }
        </div>
      </div>
    </div>
  )
}
