import React from 'react'

export function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

export function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## '))
      return <div key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--accent2)', marginTop: 14, marginBottom: 6 }}>{line.slice(3).trim()}</div>
    if (line.startsWith('# '))
      return <div key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 9, marginTop: 16, marginBottom: 8 }}>{line.slice(2).trim()}</div>
    if (line.startsWith('- ') || line.startsWith('* '))
      return <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: 'var(--accent2)', flexShrink: 0 }}>▸</span><span>{renderInline(line.slice(2))}</span></div>
    if (line.trim() === '')
      return <div key={i} style={{ height: 8 }} />
    return <div key={i} style={{ marginBottom: 4 }}>{renderInline(line)}</div>
  })
}
