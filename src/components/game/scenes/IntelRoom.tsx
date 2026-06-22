'use client'

import React, { useState } from 'react'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import { Sprite, personalityForTeam } from '../Sprite'
import { Binder } from '../Binder'
import { agentLabel } from '@/lib/game/teams'

const RESEARCH_AGENTS = ['landscape_analyst', 'trend_spotter', 'white_space_finder']
const CREATIVE_AGENTS = ['strategist_a', 'strategist_b', 'strategist_c']

interface IntelRoomProps {
  state: CampaignClientState
}

export function IntelRoom({ state }: IntelRoomProps) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const isCreative = state.status === 'creative'
  const activeAgentKeys = isCreative ? CREATIVE_AGENTS : RESEARCH_AGENTS
  const teamKey = isCreative ? 'creative' : 'research'
  const teamState = state.teams[teamKey]

  const agents = activeAgentKeys.map((key) => ({
    key,
    agentState: teamState?.agents[key],
  }))

  const research = state.warRoom.research as Record<string, string> | undefined

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', letterSpacing: 2, marginBottom: 8 }}>
        PHASE · {isCreative ? 'CREATIVE' : 'RESEARCH'}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 18 }}>
        {isCreative ? 'Creative Strategy Room' : 'Intel Room'}
      </h2>

      {/* Room scene */}
      <div style={{
        position: 'relative', height: 260,
        background: 'var(--stone-dark)',
        border: '6px solid var(--ink)',
        boxShadow: 'inset 0 0 0 4px var(--stone), 6px 8px 0 rgba(0,0,0,.3)',
        overflow: 'hidden', marginBottom: 24,
      }}>
        {/* Floor */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'var(--floor1)',
          backgroundImage: 'conic-gradient(var(--floor2) 0 25%, var(--floor1) 0 50%, var(--floor2) 0 75%, var(--floor1) 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Big table */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)', width: '55%', height: 90,
          background: 'var(--wood-l)', border: '4px solid var(--ink)', borderRadius: 14,
          boxShadow: 'inset 0 -7px 0 var(--wood-d), inset 0 5px 0 rgba(255,255,255,.18)',
        }}>
          {[{left:'12%',top:'20%',rot:'-8deg'},{left:'38%',top:'38%',rot:'7deg'},{left:'60%',top:'20%',rot:'-4deg'}].map((p,i) => (
            <div key={i} style={{ position:'absolute', width:16, height:20, background:'#fff', border:'2px solid var(--ink)', transform:`rotate(${p.rot})`, left:p.left, top:p.top }} />
          ))}
        </div>

        {/* Sprites */}
        {agents.map((a, i) => {
          const positions: React.CSSProperties[] = [
            { left: '20%', top: 160 },
            { left: '50%', top: 150 },
            { left: '76%', top: 160 },
          ]
          const isRunning = a.agentState?.status === 'running'
          return (
            <div key={a.key} style={{ position: 'absolute', zIndex: 5, ...positions[i] }}>
              {isRunning && (
                <div style={{
                  position: 'absolute', bottom: 66, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  zIndex: 10, pointerEvents: 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 6,
                    background: 'var(--hud)', color: 'var(--hud-ink)',
                    border: '2px solid var(--ink)', padding: '2px 4px',
                    whiteSpace: 'nowrap', boxShadow: '2px 2px 0 rgba(0,0,0,.3)',
                  }}>
                    {agentLabel(a.key)}
                  </div>
                  <div style={{
                    background: '#fff', border: '2px solid var(--ink)', borderRadius: 6,
                    padding: '2px 5px', fontSize: 9,
                    animation: 'blip 0.9s steps(2) infinite',
                  }}>
                    ···
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: -1 }}>
                    <div style={{ width: 3, height: 3, background: '#fff', border: '1px solid var(--ink)', borderRadius: '50%' }} />
                    <div style={{ width: 2, height: 2, background: '#fff', border: '1px solid var(--ink)', borderRadius: '50%', marginTop: 1 }} />
                  </div>
                </div>
              )}
              <Sprite
                status={a.agentState?.status ?? 'pending'}
                personality={personalityForTeam(teamKey)}
                scale={2.1}
              />
            </div>
          )
        })}

        {/* Sign */}
        <div style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--hud)', color: 'var(--hud-ink)',
          fontFamily: 'var(--font-display)', fontSize: 8,
          padding: '7px 9px', border: '2px solid var(--ink)',
          whiteSpace: 'nowrap', boxShadow: '2px 2px 0 rgba(0,0,0,.3)', zIndex: 8,
        }}>
          {isCreative ? '🎨 CREATIVE' : '🔬 RESEARCH'}
        </div>
      </div>

      {/* Research dossier — folder entries */}
      {research ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--ink-dim)', marginBottom: 4, letterSpacing: 1 }}>
            INTEL DOSSIER
          </div>
          {Object.entries(research).map(([key, val]) => {
            const hasContent = Boolean(val)
            const label = key.replace(/([A-Z])/g, ' $1').toUpperCase()
            return (
              <div
                key={key}
                onClick={() => hasContent && setOpenSection(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'var(--panel)', border: '4px solid var(--ink)',
                  boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
                  cursor: hasContent ? 'pointer' : 'default',
                  opacity: hasContent ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 8 }}>{label}</div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: '2px solid var(--ink)', flexShrink: 0,
                  background: hasContent ? 'var(--led-done)' : 'transparent',
                }} />
                {hasContent && (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--hud)', flexShrink: 0 }}>
                    ▶ READ
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          padding: 20, textAlign: 'center',
          background: 'var(--panel)', border: '4px solid var(--ink)',
          boxShadow: 'inset 4px 4px 0 0 var(--border-light), inset -4px -4px 0 0 var(--border-dark), 6px 6px 0 0 rgba(0,0,0,.3)',
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, color: 'var(--ink-dim)' }}>
            Analysts deploying… stand by.
          </div>
        </div>
      )}

      {openSection && research?.[openSection] && (
        <Binder
          title={openSection.replace(/([A-Z])/g, ' $1').toUpperCase()}
          content={research[openSection]}
          onClose={() => setOpenSection(null)}
        />
      )}
    </div>
  )
}
