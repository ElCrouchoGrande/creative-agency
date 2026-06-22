'use client'

import React, { useRef, useState, useEffect } from 'react'
import type { CampaignClientState } from '@/lib/game/campaignReducer'
import { Room, SlideRoom, PingRoom } from '../Room'
import { Sprite, personalityForTeam } from '../Sprite'
import type { SpritePersonality } from '../Sprite'
import { useCampaignContext } from '../CampaignContext'

interface AgencyBuildingProps {
  state: CampaignClientState
}

function Corridor() {
  return (
    <div style={{
      gridColumn: '1 / -1',
      position: 'relative',
      height: 62,
      overflow: 'hidden',
      backgroundColor: 'var(--floor1)',
      backgroundImage: 'conic-gradient(var(--floor2) 0 25%, var(--floor1) 0 50%, var(--floor2) 0 75%, var(--floor1) 0)',
      backgroundSize: '32px 32px',
      boxShadow: 'inset 0 0 0 5px var(--stone), inset 0 0 0 8px var(--ink)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 'calc(25% - 21px)', width: 42, height: 10, background: 'var(--floor1)', borderLeft: '3px solid var(--ink)', borderRight: '3px solid var(--ink)', zIndex: 4 }} />
      <div style={{ position: 'absolute', top: 0, left: 'calc(75% - 21px)', width: 42, height: 10, background: 'var(--floor1)', borderLeft: '3px solid var(--ink)', borderRight: '3px solid var(--ink)', zIndex: 4 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 'calc(25% - 21px)', width: 42, height: 10, background: 'var(--floor1)', borderLeft: '3px solid var(--ink)', borderRight: '3px solid var(--ink)', zIndex: 4 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 'calc(75% - 21px)', width: 42, height: 10, background: 'var(--floor1)', borderLeft: '3px solid var(--ink)', borderRight: '3px solid var(--ink)', zIndex: 4 }} />

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--font-display)', fontSize: 7, letterSpacing: 2,
        color: 'var(--stone)', opacity: 0.7,
        whiteSpace: 'nowrap',
      }}>
        MAIN CORRIDOR
      </div>
    </div>
  )
}

function ChallengeWalker({
  gridRef,
  challengerTeam,
  targetTeam,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>
  challengerTeam: string
  targetTeam: string
}) {
  const [srcPos, setSrcPos] = useState<{ x: number; y: number } | null>(null)
  const [dstPos, setDstPos] = useState<{ x: number; y: number } | null>(null)
  const [moving, setMoving] = useState(false)
  const [arrived, setArrived] = useState(false)
  const personality: SpritePersonality = personalityForTeam(challengerTeam)

  useEffect(() => {
    let mounted = true
    const timers: ReturnType<typeof setTimeout>[] = []

    function schedule(fn: () => void, ms: number) {
      const t = setTimeout(() => { if (mounted) fn() }, ms)
      timers.push(t)
    }

    schedule(() => {
      const grid = gridRef.current
      if (!grid) return

      const gridRect = grid.getBoundingClientRect()
      const srcEl = grid.querySelector(`[data-team="${challengerTeam}"]`) as HTMLElement | null
      const dstEl = grid.querySelector(`[data-team="${targetTeam}"]`) as HTMLElement | null
      if (!srcEl || !dstEl) return

      const srcRect = srcEl.getBoundingClientRect()
      const dstRect = dstEl.getBoundingClientRect()

      // Position at door gap — centre-bottom of each room, sprite is 20px wide layout
      setSrcPos({
        x: srcRect.left - gridRect.left + srcRect.width / 2 - 10,
        y: srcRect.top - gridRect.top + srcRect.height - 28,
      })
      setDstPos({
        x: dstRect.left - gridRect.left + dstRect.width / 2 - 10,
        y: dstRect.top - gridRect.top + dstRect.height - 28,
      })

      // Let initial position render, then start walking
      schedule(() => {
        setMoving(true)
        // Mark arrived after transition completes (steps(11) × 2.2s)
        schedule(() => setArrived(true), 2400)
      }, 80)
    }, 300)

    return () => {
      mounted = false
      timers.forEach(clearTimeout)
    }
  }, [gridRef, challengerTeam, targetTeam])

  if (!srcPos || !dstPos) return null

  const pos = moving ? dstPos : srcPos
  const goingLeft = dstPos.x < srcPos.x

  return (
    <div style={{
      position: 'absolute',
      left: pos.x,
      top: pos.y,
      zIndex: 25,
      transition: moving ? 'left 2.2s steps(11), top 2.2s steps(11)' : 'none',
      transform: `scaleX(${goingLeft ? -1 : 1})`,
      transformOrigin: '10px bottom',
      pointerEvents: 'none',
    }}>
      <Sprite
        status={arrived ? 'complete' : 'running'}
        personality={personality}
        scale={2.1}
        style={{ position: 'relative', left: 'auto', top: 'auto' }}
      />
    </div>
  )
}

export function AgencyBuilding({ state }: AgencyBuildingProps) {
  const { pin } = useCampaignContext()
  const gridRef = useRef<HTMLDivElement>(null)
  const activeTeams = state.activeTeams

  const specialistTeams = activeTeams.filter((t) => t !== 'system')
  const allRooms: React.ReactNode[] = specialistTeams
    .map((team) => {
      const ts = state.teams[team]
      if (!ts) return null
      return <Room key={team} teamState={ts} onPin={(t, a) => pin(t, a)} />
    })
    .filter(Boolean)

  if (state.teams['system']) {
    allRooms.push(
      <Room
        key="system"
        teamState={{ team: 'system', agents: state.teams['system']?.agents ?? {}, overallStatus: state.teams['system']?.overallStatus ?? 'pending' }}
        layout="desk"
        onPin={(t, a) => pin(t, a)}
      />
    )
  }

  if (specialistTeams.length >= 3) allRooms.push(<SlideRoom key="slide" />)
  if (specialistTeams.length >= 5) allRooms.push(<PingRoom key="ping" />)

  const gridItems: React.ReactNode[] = []
  for (let i = 0; i < allRooms.length; i += 2) {
    const row = allRooms.slice(i, i + 2)
    row.forEach((r) => gridItems.push(r))
    if (i + 2 < allRooms.length) {
      gridItems.push(<Corridor key={`corridor-${i}`} />)
    }
  }

  // Challenge walkers: one sprite per challenged team, walking FROM the challenger's room
  const challengePairs = state.status === 'challenge'
    ? Object.entries(state.teams)
        .filter(([, ts]) => ts.challengerOf)
        .map(([targetTeam, ts]) => ({ challenger: ts.challengerOf!, target: targetTeam }))
    : []

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', letterSpacing: 2, marginBottom: 8 }}>
        PHASE · {state.status === 'challenge' ? 'CROSS-CHALLENGE' : state.status === 'measuring' ? 'MEASURING' : 'TEAMS AT WORK'}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 18 }}>The Agency</h2>

      <div style={{
        position: 'relative', padding: 26, border: '5px solid var(--ink)', overflow: 'hidden',
        backgroundColor: 'var(--ground)',
        backgroundImage: 'conic-gradient(var(--ground2) 0 25%, var(--ground) 0 50%, var(--ground2) 0 75%, var(--ground) 0)',
        backgroundSize: '36px 36px',
        boxShadow: 'inset 4px 4px 0 rgba(255,255,255,.12), inset -4px -4px 0 rgba(0,0,0,.18)',
      }}>
        {[
          { top: 8, left: 10 },
          { top: 10, right: 14 },
          { bottom: 12, left: 24 },
          { bottom: 16, right: 20 },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: i === 3 ? 38 : 30, height: 30, background: 'var(--ground2)', border: '3px solid var(--ink)', borderRadius: 9, boxShadow: 'inset 0 5px 0 var(--ground)', zIndex: 1, ...s as React.CSSProperties }} />
        ))}

        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1, background: 'var(--wood)', border: '3px solid var(--ink)',
          color: '#fff6df', fontFamily: 'var(--font-display)', fontSize: 8,
          padding: '6px 10px', boxShadow: '3px 3px 0 rgba(0,0,0,.3)',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          ♛ BRANDS BY<br />BOWSER
        </div>

        {/* Grid — position: relative so ChallengeWalkers can be absolute inside it */}
        <div
          ref={gridRef}
          style={{
            position: 'relative', zIndex: 2,
            background: 'var(--stone-dark)', border: '6px solid var(--ink)',
            boxShadow: 'inset 0 0 0 4px var(--stone), 6px 8px 0 rgba(0,0,0,.3)',
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            columnGap: 9, rowGap: 0, padding: 11,
            marginTop: 40,
          }}
        >
          {allRooms.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 20, color: 'var(--ink-dim)' }}>
              Orchestrator selecting teams…
            </div>
          ) : gridItems}

          {challengePairs.map(({ challenger, target }) => (
            <ChallengeWalker
              key={`${challenger}->${target}`}
              gridRef={gridRef}
              challengerTeam={challenger}
              targetTeam={target}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
