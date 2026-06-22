'use client'

import React, { useState } from 'react'

interface BinderProps {
  title: string
  content: string
  onClose: () => void
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <div key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--accent2)', marginTop: 14, marginBottom: 6 }}>
          {line.slice(3).trim()}
        </div>
      )
    }
    if (line.startsWith('# ')) {
      return (
        <div key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 9, marginTop: 16, marginBottom: 8 }}>
          {line.slice(2).trim()}
        </div>
      )
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <span style={{ flexShrink: 0, color: 'var(--accent2)' }}>▸</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    }
    if (line.trim() === '') {
      return <div key={i} style={{ height: 8 }} />
    }
    return (
      <div key={i} style={{ marginBottom: 4 }}>
        {renderInline(line)}
      </div>
    )
  })
}

function getSummary(content: string): { intro: string; headings: string[] } {
  const lines = content.split('\n')
  const introLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('#') || (introLines.length > 0 && line.trim() === '')) break
    introLines.push(line)
  }
  const intro = introLines.join(' ').trim().slice(0, 420)

  const headings: string[] = []
  for (const line of lines) {
    if (line.startsWith('## ')) headings.push(line.slice(3).trim())
    else if (line.startsWith('# ')) headings.push(line.slice(2).trim())
  }
  return { intro, headings }
}

export function Binder({ title, content, onClose }: BinderProps) {
  const [page, setPage] = useState<1 | 2>(1)
  const { intro, headings } = getSummary(content)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{ width: '100%', maxWidth: 680, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '3px solid var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--accent2)' }}>
            📂 {title}
          </div>
          <button className="pixel-button" style={{ fontSize: 8, padding: '4px 8px' }} onClick={onClose}>
            ✕ CLOSE
          </button>
        </div>

        {/* Page label */}
        <div style={{ padding: '5px 16px', background: 'var(--panel2)', borderBottom: '2px solid var(--ink)', fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--ink-dim)', flexShrink: 0 }}>
          {page === 1 ? 'SUMMARY · PAGE 1 OF 2' : 'FULL REPORT · PAGE 2 OF 2'}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.35, color: 'var(--ink)' }}>
          {page === 1 ? (
            <>
              <p style={{ marginBottom: 18, lineHeight: 1.4 }}>{intro}</p>
              {headings.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--ink-dim)', marginBottom: 10 }}>CONTENTS</div>
                  {headings.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 7 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: 'var(--accent2)', flexShrink: 0 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            renderMarkdown(content)
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '10px 16px', borderTop: '3px solid var(--ink)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <button
            className="pixel-button"
            style={{ fontSize: 8, padding: '6px 10px' }}
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            ◀ PREV
          </button>
          <button
            className="pixel-button"
            style={{ fontSize: 8, padding: '6px 10px' }}
            onClick={() => setPage(2)}
            disabled={page === 2}
          >
            NEXT ▶
          </button>
        </div>
      </div>
    </div>
  )
}
