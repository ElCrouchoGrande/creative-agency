'use client'

import React, { useState, CSSProperties } from 'react'
import { Sprite, personalityForTeam } from './Sprite'
import { RoomDetail } from './RoomDetail'
import { PixelLed } from './ui/PixelLed'
import { teamIdentity, agentLabel } from '@/lib/game/teams'
import type { TeamState } from '@/lib/game/campaignReducer'

type RoomLayout = 'table' | 'board' | 'desk' | 'slide' | 'ping'

interface RoomProps {
  teamState: TeamState
  layout?: RoomLayout
  onPin?: (team: string, agent: string) => void
}

function layoutForTeam(team: string): RoomLayout {
  const TABLE_TEAMS = ['earned_media', 'influencer', 'content', 'employee_engagement', 'field_marketing']
  const BOARD_TEAMS = ['social', 'public_affairs', 'investor_relations']
  if (TABLE_TEAMS.includes(team)) return 'table'
  if (BOARD_TEAMS.includes(team)) return 'board'
  if (team === 'paid_media') return 'desk'
  return 'table'
}

export function Room({ teamState, layout, onPin }: RoomProps) {
  const [open, setOpen] = useState(false)
  const identity = teamIdentity(teamState.team)
  const resolvedLayout = layout ?? layoutForTeam(teamState.team)
  const agents = Object.entries(teamState.agents)
  const overallStatus = teamState.overallStatus

  const agentEntries = Object.entries(teamState.agents)
    .filter(([, a]) => a.output)
    .sort(([, a], [, b]) => {
      if (a.status === 'running' && b.status !== 'running') return -1
      if (b.status === 'running' && a.status !== 'running') return 1
      return b.lastUpdate - a.lastUpdate
    })
  const latestAgent = agentEntries[0]
  const previewKey = latestAgent?.[0] ?? ''
  const previewText = latestAgent?.[1].output ?? ''

  function handleClick() {
    setOpen(true)
    const firstAgent = agents[0]
    if (firstAgent && onPin) onPin(teamState.team, firstAgent[0])
  }

  return (
    <>
      <div
        data-team={teamState.team}
        onClick={handleClick}
        style={{
          position: 'relative',
          height: 248,
          cursor: 'pointer',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 7px var(--stone), inset 0 0 0 10px var(--ink)',
        }}
        className="room-cell"
      >
        {/* Tiled floor */}
        <div style={{
          position: 'absolute', inset: 7, zIndex: 0,
          backgroundColor: 'var(--floor1)',
          backgroundImage: 'conic-gradient(var(--floor2) 0 25%, var(--floor1) 0 50%, var(--floor2) 0 75%, var(--floor1) 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Furniture */}
        <RoomFurniture layout={resolvedLayout} />

        {/* Name placard */}
        <div style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          zIndex: 8, background: identity.accent, color: '#fff',
          fontFamily: 'var(--font-display)', fontSize: 8,
          padding: '7px 9px', border: '2px solid var(--ink)',
          display: 'flex', gap: 6, alignItems: 'center',
          whiteSpace: 'nowrap', boxShadow: '2px 2px 0 rgba(0,0,0,.3)',
        }}>
          <span style={{ fontSize: 13 }}>{identity.icon}</span>
          {identity.label}
          <PixelLed status={overallStatus} />
        </div>

        {/* Sprites */}
        {agents.slice(0, 3).map(([agentKey, agentState], i) => (
          <SpriteSlot
            key={agentKey}
            team={teamState.team}
            agentKey={agentKey}
            status={agentState.status}
            index={i}
            layout={resolvedLayout}
          />
        ))}

        {/* Activity blip when unfocused + running */}
        {overallStatus === 'running' && (
          <div style={{
            position: 'absolute', top: 40, right: 12, zIndex: 9,
            fontFamily: 'var(--font-display)', fontSize: 12,
            color: 'var(--accent2)',
            animation: 'blip .7s steps(2) infinite',
          }}>‼</div>
        )}

        {/* Pinned notice — click affordance + live preview */}
        <div style={{
          position: 'absolute', bottom: 12, left: 8, right: 8, height: 52,
          background: 'var(--panel2)', border: '2px solid var(--ink)',
          boxShadow: '2px 2px 0 rgba(0,0,0,.3)',
          padding: '4px 7px', overflow: 'hidden', zIndex: 6,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 6 }}>
            <span style={{ color: 'var(--accent2)' }}>
              {previewKey ? agentLabel(previewKey) : 'AWAITING INTEL'}
            </span>
            <span style={{ color: 'var(--hud)' }}>▶ READ</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.2, overflow: 'hidden' }}>
            {previewText ? previewText.slice(0, 130) : 'Stand by…'}
          </div>
        </div>

        {/* Door gap */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 42, height: 10, background: 'var(--floor1)',
          borderLeft: '3px solid var(--ink)', borderRight: '3px solid var(--ink)', zIndex: 4,
        }} />
      </div>

      {open && <RoomDetail teamState={teamState} onClose={() => setOpen(false)} />}
    </>
  )
}

function SpriteSlot({ team, status, index, layout }: {
  team: string; agentKey?: string; status: import('@/lib/types').AgentRunStatus; index: number; layout: RoomLayout
}) {
  const personality = personalityForTeam(team)
  const positions = slotPositions(layout)
  const pos = positions[index] ?? positions[0]
  return (
    <div style={{ position: 'absolute', zIndex: 5, ...pos }}>
      <Sprite status={status} personality={personality} scale={2.1} />
    </div>
  )
}

function slotPositions(layout: RoomLayout): Array<React.CSSProperties> {
  switch (layout) {
    case 'table': return [
      { left: '46%', top: 74 },
      { left: '14%', top: 140 },
      { left: '68%', top: 140 },
    ]
    case 'board': return [
      { left: '18%', top: 150 },
      { left: '46%', top: 160 },
      { left: '72%', top: 150 },
    ]
    case 'desk': return [
      { left: '52%', top: 150 },
    ]
    default: return [{ left: '46%', top: 140 }]
  }
}

function RoomFurniture({ layout }: { layout: RoomLayout }) {
  switch (layout) {
    case 'table':
      return (
        <>
          {/* Meeting table */}
          <div style={{
            position: 'absolute', left: '50%', top: '52%',
            transform: 'translate(-50%,-50%)', width: '46%', height: 88,
            zIndex: 2, background: 'var(--wood-l)', border: '4px solid var(--ink)',
            borderRadius: 14,
            boxShadow: 'inset 0 -7px 0 var(--wood-d), inset 0 5px 0 rgba(255,255,255,.18)',
          }}>
            <div style={{ position: 'absolute', width: 16, height: 20, background: '#fff', border: '2px solid var(--ink)', transform: 'rotate(-8deg)', left: '18%', top: '24%' }} />
            <div style={{ position: 'absolute', width: 16, height: 20, background: '#fff', border: '2px solid var(--ink)', transform: 'rotate(7deg)', left: '40%', top: '40%' }} />
          </div>
          {/* Chairs */}
          {[{left:'50%',ml:'-30px',top:'24%'},{right:'50%',mr:'-30px',top:'24%'},{left:'14%',top:'55%'},{right:'14%',top:'55%'}].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 14, height: 14, background: 'var(--wood-d)', border: '2px solid var(--ink)', borderRadius: 3, zIndex: 1, ...s as CSSProperties }} />
          ))}
          {/* Plant */}
          <div style={{ position: 'absolute', right: 18, bottom: 50, width: 22, height: 26, zIndex: 2 }}>
            <div style={{ position: 'absolute', bottom: 0, left: 4, width: 14, height: 9, background: 'var(--wood)', border: '2px solid var(--ink)' }} />
            <div style={{ position: 'absolute', bottom: 7, left: 0, width: 22, height: 18, background: 'var(--ground2)', border: '2px solid var(--ink)', borderRadius: '50% 50% 42% 42%', boxShadow: 'inset 0 4px 0 var(--ground)' }} />
          </div>
        </>
      )
    case 'board':
      return (
        <>
          {/* Blackboard */}
          <div style={{
            position: 'absolute', left: '50%', top: 14,
            transform: 'translateX(-50%)', width: '62%', height: 62,
            zIndex: 2, background: '#234a2e',
            border: '5px solid var(--wood)',
            boxShadow: 'inset 0 0 0 2px var(--ink), 0 4px 0 rgba(0,0,0,.2)',
          }}>
            {[{left:'10%',top:'24%',width:'48%'},{left:'10%',top:'42%',width:'32%'},{left:'10%',top:'60%',width:'40%'}].map((s,i) => (
              <div key={i} style={{ position: 'absolute', background: 'rgba(244,255,244,.9)', height: 2, ...s as CSSProperties }} />
            ))}
            {/* Bar chart */}
            {[{right:'30%',height:'22%'},{right:'22%',height:'38%'},{right:'14%',height:'54%'}].map((s,i) => (
              <div key={i} style={{ position: 'absolute', bottom: '18%', width: 6, background: '#9fe6a0', ...s as CSSProperties }} />
            ))}
          </div>
        </>
      )
    case 'desk':
      return (
        <>
          {/* Desk */}
          <div style={{
            position: 'absolute', left: '50%', top: '30%',
            transform: 'translate(-50%,-50%)', width: '40%', height: 34,
            zIndex: 2, background: 'var(--wood)', border: '4px solid var(--ink)',
            boxShadow: 'inset 0 5px 0 var(--wood-l), inset 0 -5px 0 var(--wood-d)',
          }}>
            {/* Monitor */}
            <div style={{
              position: 'absolute', left: '50%', top: -20,
              transform: 'translateX(-50%)', width: 34, height: 22,
              background: '#1c2740', border: '3px solid var(--ink)',
            }}>
              <div style={{
                position: 'absolute', inset: 3,
                background: 'linear-gradient(135deg,#3fd0e0,#1c6fd0)',
                opacity: .85, animation: 'blip 1.4s steps(2) infinite',
              }} />
            </div>
          </div>
          {/* Wall chart */}
          <div style={{ position: 'absolute', left: '18%', top: 16, width: 40, height: 30, background: '#f4f7ff', border: '3px solid var(--ink)', zIndex: 2 }}>
            <div style={{ position: 'absolute', left: 6, bottom: 6, width: 4, height: 10, background: 'var(--accent2)', boxShadow: '8px -6px 0 #3aa06a, 16px -3px 0 #049cd8' }} />
          </div>
        </>
      )
    default:
      return null
  }
}

export function SlideRoom() {
  return (
    <div style={{ position: 'relative', height: 248, overflow: 'hidden', boxShadow: 'inset 0 0 0 7px var(--stone), inset 0 0 0 10px var(--ink)' }}>
      <div style={{ position: 'absolute', inset: 7, backgroundColor: 'var(--floor1)', backgroundImage: 'conic-gradient(var(--floor2) 0 25%, var(--floor1) 0 50%, var(--floor2) 0 75%, var(--floor1) 0)', backgroundSize: '32px 32px' }} />
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', zIndex: 8, background: '#e24ec0', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 8, padding: '7px 9px', border: '2px solid var(--ink)', whiteSpace: 'nowrap', boxShadow: '2px 2px 0 rgba(0,0,0,.3)' }}>
        🎢 SLIDE LOUNGE
      </div>
      {/* Ladder */}
      <div style={{ position: 'absolute', left: '14%', top: 40, width: 18, height: 120, background: 'var(--wood)', border: '3px solid var(--ink)', zIndex: 2, backgroundImage: 'repeating-linear-gradient(0deg, var(--wood-d) 0 3px, transparent 3px 14px)' }} />
      {/* Slide */}
      <div style={{ position: 'absolute', left: '30%', top: 46, width: 22, height: 150, transform: 'rotate(20deg)', transformOrigin: 'top center', zIndex: 2, background: 'linear-gradient(180deg,#fbd000,#e52521)', border: '4px solid var(--ink)', borderRadius: 12, boxShadow: 'inset 5px 0 0 rgba(255,255,255,.35)' }} />
      {/* Ball pit */}
      <div style={{ position: 'absolute', right: '14%', bottom: 34, width: 96, height: 60, background: '#1c8fd0', border: '4px solid var(--ink)', borderRadius: 12, overflow: 'hidden', zIndex: 2 }}>
        {[{bg:'#e52521',left:'10%',bottom:'14%'},{bg:'#fbd000',left:'34%',bottom:'36%'},{bg:'#5fcf3f',left:'58%',bottom:'12%'},{bg:'#fffaf0',left:'74%',bottom:'42%'},{bg:'#049cd8',left:'46%',bottom:'62%'}].map((b,i) => (
          <div key={i} style={{ position: 'absolute', width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--ink)', background: b.bg, left: b.left, bottom: b.bottom }} />
        ))}
      </div>
    </div>
  )
}

export function PingRoom() {
  return (
    <div style={{ position: 'relative', height: 248, overflow: 'hidden', boxShadow: 'inset 0 0 0 7px var(--stone), inset 0 0 0 10px var(--ink)' }}>
      <div style={{ position: 'absolute', inset: 7, backgroundColor: 'var(--floor1)', backgroundImage: 'conic-gradient(var(--floor2) 0 25%, var(--floor1) 0 50%, var(--floor2) 0 75%, var(--floor1) 0)', backgroundSize: '32px 32px' }} />
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', zIndex: 8, background: '#e24ec0', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 8, padding: '7px 9px', border: '2px solid var(--ink)', whiteSpace: 'nowrap', boxShadow: '2px 2px 0 rgba(0,0,0,.3)' }}>
        🏓 PING LOUNGE
      </div>
      {/* Ping-pong table */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '54%', height: 104, zIndex: 2, background: '#1f7a3a', border: '5px solid #fff', boxShadow: '0 0 0 4px var(--ink)' }}>
        <div style={{ position: 'absolute', left: '50%', top: -8, bottom: -8, width: 3, background: '#fff', boxShadow: '0 0 0 1px var(--ink)' }} />
        <div style={{ position: 'absolute', left: 6, right: 6, top: '50%', height: 2, background: 'rgba(255,255,255,.7)' }} />
      </div>
      {/* Bouncing ball */}
      <div style={{ position: 'absolute', width: 8, height: 8, background: '#fff', border: '2px solid var(--ink)', borderRadius: '50%', zIndex: 6, top: '42%', animation: 'pong 1s ease-in-out infinite alternate' }} />
      {/* Players — one each side of the table */}
      <div style={{ position: 'absolute', zIndex: 5, left: '16%', top: 148 }}>
        <Sprite status="running" personality={personalityForTeam('social')} scale={2.1} style={{ position: 'relative', left: 'auto', top: 'auto' }} />
      </div>
      <div style={{ position: 'absolute', zIndex: 5, left: '68%', top: 148, transform: 'scaleX(-1)', transformOrigin: '10px bottom' }}>
        <Sprite status="running" personality={personalityForTeam('content')} scale={2.1} style={{ position: 'relative', left: 'auto', top: 'auto' }} />
      </div>
    </div>
  )
}
