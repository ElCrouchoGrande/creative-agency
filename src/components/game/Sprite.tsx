'use client'

import { useEffect, useRef, CSSProperties } from 'react'
import type { AgentRunStatus } from '@/lib/types'

export interface SpritePersonality {
  skinTone?: string
  hairColor?: string
  shirtColor?: string
  hairStyle?: 'normal' | 'spike' | 'pony'
  extras?: ('glasses' | 'thick-glasses' | 'beard' | 'headset' | 'tie' | 'badge' | 'cowboy-hat')[]
  blink?: boolean
  smile?: boolean
}

interface SpriteProps {
  status: AgentRunStatus
  personality?: SpritePersonality
  scale?: number
  style?: CSSProperties
  className?: string
}

const DEFAULT_SKIN = '#f0c88a'
const DEFAULT_HAIR = '#3a230f'
const DEFAULT_SHIRT = '#049cd8'

// Per-personality defined in teams — keyed by team+agent for determinism
const TEAM_PERSONALITIES: Record<string, SpritePersonality> = {
  earned_media:        { hairColor: '#1a120a', shirtColor: '#e52521', hairStyle: 'spike', extras: ['tie'] },
  social:              { hairColor: '#2244aa', shirtColor: '#049cd8', hairStyle: 'pony', extras: ['headset'] },
  employee_engagement: { hairColor: '#4a2a0a', shirtColor: '#5fcf3f', extras: ['badge'] },
  public_affairs:      { hairColor: '#2a1a6a', shirtColor: '#9966cc', extras: ['tie'] },
  field_marketing:     { hairColor: '#8a4a1a', shirtColor: '#ff8c00', extras: ['badge'] },
  influencer:          { hairColor: '#cc44aa', shirtColor: '#e24ec0', hairStyle: 'pony', extras: [] },
  paid_media:          { hairColor: '#3a1a0a', shirtColor: '#a5642c', extras: ['cowboy-hat'] },
  content:             { hairColor: '#1a1a1a', shirtColor: '#2e6db4', extras: ['thick-glasses'] },
  investor_relations:  { hairColor: '#6a6a6a', shirtColor: '#1a7a4a', extras: ['tie', 'beard'] },
  research:            { hairColor: '#2a4a2a', shirtColor: '#5a8a5a', extras: ['glasses'] },
  creative:            { hairColor: '#aa2244', shirtColor: '#e52521', hairStyle: 'spike' },
  system:              { hairColor: '#4a4a4a', shirtColor: '#9a7a4a', extras: [] },
}

export function personalityForTeam(team: string): SpritePersonality {
  return TEAM_PERSONALITIES[team] ?? {}
}

export function Sprite({ status, personality = {}, scale = 2.6, style, className = '' }: SpriteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const wanderRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const skin = personality.skinTone ?? DEFAULT_SKIN
  const hair = personality.hairColor ?? DEFAULT_HAIR
  const shirt = personality.shirtColor ?? DEFAULT_SHIRT
  const extras = personality.extras ?? []
  const hairStyle = personality.hairStyle ?? 'normal'

  const isRunning = status === 'running'

  useEffect(() => {
    if (!isRunning || !ref.current) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const doWander = () => {
      // Small wander relative to the slot wrapper — keeps sprite near its assigned position
      const x = (Math.random() - 0.5) * 32  // ±16px
      const y = (Math.random() - 0.5) * 16  // ±8px
      ref.current!.style.left = `${x}px`
      ref.current!.style.top = `${y}px`
    }

    wanderRef.current = setInterval(doWander, 2200)
    doWander()

    return () => {
      if (wanderRef.current) clearInterval(wanderRef.current)
    }
  }, [isRunning])

  const spriteClass = [
    'sprite',
    isRunning ? 'work' : 'idle',
    personality.smile ? 'smile' : '',
    personality.blink ? 'blinky' : '',
    extras.includes('thick-glasses') ? 'gthick' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={ref}
      className={spriteClass}
      style={{
        '--s': scale,
        '--skin': skin,
        '--hair': hair,
        '--shirt': shirt,
        position: 'absolute',
        transition: 'left 2s steps(8), top 2s steps(8)',
        ...style,
      } as CSSProperties}
    >
      <div className="shadow" />
      <div className="hair" style={{ background: hair }} />
      {hairStyle === 'pony' && <div className="hair pony" style={{ background: hair }} />}
      {hairStyle === 'spike' && <div className="hair spike" style={{ background: hair }} />}
      {extras.includes('cowboy-hat') && <div className="hat" />}
      {extras.includes('headset') && (
        <>
          <div className="headset" />
          <div className="mic" />
        </>
      )}
      <div className="head" style={{ background: skin }} />
      <div className="brow l" style={{ background: hair }} />
      <div className="brow r" style={{ background: hair }} />
      <div className="eye l" />
      <div className="eye r" />
      <div className="mouth" />
      {extras.includes('thick-glasses') && <div className="glasses" />}
      {!extras.includes('thick-glasses') && extras.includes('glasses') && <div className="glasses" style={{ width: '8px', height: '3px' }} />}
      {extras.includes('beard') && <div className="beard" style={{ background: hair }} />}
      <div className="torso" style={{ background: shirt }} />
      {extras.includes('tie') && <div className="tie" />}
      {extras.includes('badge') && <div className="badge" />}
      <div className="arm l" style={{ background: shirt }} />
      <div className="arm r" style={{ background: shirt }} />
      <div className="leg l" />
      <div className="leg r" />
      {status === 'complete' && (
        <div style={{ position: 'absolute', top: -14, right: -6, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--led-done)' }}>✓</div>
      )}
      {status === 'failed' && (
        <div style={{ position: 'absolute', top: -14, right: -6, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--led-fail)' }}>✗</div>
      )}
    </div>
  )
}
