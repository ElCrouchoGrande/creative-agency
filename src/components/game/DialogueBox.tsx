'use client'

import { useEffect, useRef, useState } from 'react'
import { Sprite, personalityForTeam } from './Sprite'
import { teamIdentity, agentLabel, teamLabel } from '@/lib/game/teams'
import type { DialogueLine } from '@/lib/game/dialogue'

interface DialogueBoxProps {
  line: DialogueLine
  pinned?: boolean
  onUnpin?: () => void
}

export function DialogueBox({ line, pinned, onUnpin }: DialogueBoxProps) {
  const [renderedLen, setRenderedLen] = useState(0)
  const prevTextRef = useRef('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (line.text === prevTextRef.current) return
    prevTextRef.current = line.text

    if (intervalRef.current) clearInterval(intervalRef.current)
    setRenderedLen(0)

    const CHARS_PER_TICK = 3
    intervalRef.current = setInterval(() => {
      setRenderedLen((prev) => {
        if (prev >= line.text.length) {
          clearInterval(intervalRef.current!)
          return prev
        }
        return Math.min(prev + CHARS_PER_TICK, line.text.length)
      })
    }, 30)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [line.text])

  const displayed = line.text.slice(0, renderedLen)
  const isTyping = renderedLen < line.text.length
  const identity = teamIdentity(line.team)
  const personality = personalityForTeam(line.team)

  return (
    <div className="dialogue-box">
      <div className="dialogue-box__inner">
        {/* Portrait */}
        <div className="dialogue-box__portrait">
          <Sprite
            status="running"
            personality={personality}
            scale={2.9}
            style={{ position: 'relative', left: 'auto', top: 'auto', transform: `scale(2.9)`, transformOrigin: 'bottom center' }}
          />
        </div>

        {/* Text */}
        <div className="dialogue-box__text">
          <div className="dialogue-box__who">
            <span style={{ color: identity.accent }}>{agentLabel(line.agent)}</span>
            {' · '}<span style={{ color: 'var(--ink)' }}>{teamLabel(line.team)}</span>
          </div>
          <div className="dialogue-box__line">
            {displayed || <span style={{ color: 'var(--ink-dim)' }}>Standing by…</span>}
            {isTyping && <span className="dialogue-box__caret">&nbsp;</span>}
          </div>
        </div>

        {/* Unpin */}
        {pinned && onUnpin && (
          <button
            onClick={onUnpin}
            style={{
              position: 'absolute', right: 14, top: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-dim)',
            }}
          >
            📌 unpin
          </button>
        )}
      </div>
    </div>
  )
}
