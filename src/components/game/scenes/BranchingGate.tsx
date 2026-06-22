'use client'

import { useState } from 'react'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import { Sprite, personalityForTeam } from '../Sprite'
import { PixelButton } from '../ui/PixelButton'

interface BranchingGateProps {
  state: CampaignClientState
  approvePath(pathId: 'A' | 'B' | 'C'): Promise<void>
}

export function BranchingGate({ state, approvePath }: BranchingGateProps) {
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const paths = state.creativePaths

  async function handleConfirm() {
    if (!selected) return
    setConfirming(true)
    await approvePath(selected)
  }

  if (!paths.length) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', marginBottom: 16 }}>CHOOSE YOUR PATH</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, color: 'var(--ink-dim)' }}>Creative strategists are working…</div>
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 40 }}>
          {['A','B','C'].map((_, i) => (
            <div key={i} style={{ width: 60, height: 120, background: 'var(--stone-dark)', border: '5px solid var(--ink)', borderRadius: '60px 60px 0 0', opacity: .4 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', letterSpacing: 2, marginBottom: 8 }}>CHOOSE YOUR PATH</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 6 }}>Three doors await</h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-dim)', marginBottom: 24 }}>Your chosen creative direction shapes everything that follows.</p>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${paths.length}, 1fr)`, gap: 20 }}>
        {paths.map((path) => {
          const isSel = selected === path.id
          return (
            <div
              key={path.id}
              onClick={() => setSelected(path.id)}
              style={{
                cursor: 'pointer', paddingBottom: 14,
                boxShadow: isSel ? '0 0 0 4px var(--accent), 6px 6px 0 rgba(0,0,0,.3)' : undefined,
                transition: 'box-shadow .1s',
              }}
            >
              {/* Arch door */}
              <div style={{ margin: '14px 14px 0', height: 120, position: 'relative', background: 'linear-gradient(180deg,#1a120a,var(--stone-dark))', border: '5px solid var(--ink)', borderRadius: '62px 62px 0 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                {isSel && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 95%, var(--accent) 0%, transparent 62%)', opacity: .5 }} />}
                <div style={{ marginBottom: 8, position: 'relative', zIndex: 2 }}>
                  <Sprite status="complete" personality={personalityForTeam('creative')} scale={2.1} style={{ position: 'relative', left: 'auto', top: 'auto' }} />
                </div>
              </div>

              {/* Path ID */}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--accent2)', margin: '12px 0 6px', display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                PATH {path.id}
                {isSel && <span style={{ fontFamily: 'var(--font-display)', fontSize: 8, background: 'var(--accent)', color: '#241405', padding: '5px 7px' }}>SELECTED</span>}
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.4, padding: '0 12px', minHeight: 44 }}>{path.concept}</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-dim)', padding: '8px 12px 4px', lineHeight: 1.05 }}>{path.rationale}</p>
              {path.keyMessages.length > 0 && (
                <ul style={{ listStyle: 'none', fontFamily: 'var(--font-body)', fontSize: 15, padding: '6px 14px 4px', textAlign: 'left' }}>
                  {path.keyMessages.map((m, i) => (
                    <li key={i} style={{ '::before': { content: '▸ ', color: 'var(--accent2)' } } as React.CSSProperties}>▸ {m}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 22 }}>
          <PixelButton onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'DEPLOYING TEAMS…' : `▶ CONFIRM PATH ${selected}`}
          </PixelButton>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-dim)', marginTop: 10 }}>
            Teams will enter the building and start work immediately.
          </p>
        </div>
      )}
    </div>
  )
}
