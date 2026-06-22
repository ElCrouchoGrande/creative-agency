'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from '@/lib/api'
import { PixelButton } from '../ui/PixelButton'
import { PixelPanel } from '../ui/PixelPanel'
import type { Brief } from '@/lib/types'

export function QuestScroll() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<Brief>({
    goal: '',
    brand: '',
    audience: '',
    background: '',
    urls: [],
  })
  const [urlInput, setUrlInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brief.goal || !brief.brand) return
    setLoading(true)
    setError(null)
    try {
      const { id } = await createCampaign(brief)
      router.push(`/campaigns/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: 'block', width: '100%',
    fontFamily: 'var(--font-body)', fontSize: 18,
    padding: '8px 10px', marginTop: 6,
    background: 'var(--panel2)', color: 'var(--ink)',
    border: '3px solid var(--ink)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 9,
    color: 'var(--accent2)', display: 'block', marginTop: 18,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--accent2)', letterSpacing: 2, marginBottom: 8 }}>NEW QUEST</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 18 }}>Submit Your Brief</h2>

      <PixelPanel style={{ padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>BRAND *</label>
          <input
            style={fieldStyle}
            value={brief.brand}
            onChange={(e) => setBrief((b) => ({ ...b, brand: e.target.value }))}
            placeholder="e.g. Acme Corp"
            required
          />

          <label style={labelStyle}>CAMPAIGN GOAL *</label>
          <input
            style={fieldStyle}
            value={brief.goal}
            onChange={(e) => setBrief((b) => ({ ...b, goal: e.target.value }))}
            placeholder="e.g. World Cup 2026 awareness campaign"
            required
          />

          <label style={labelStyle}>TARGET AUDIENCE</label>
          <input
            style={fieldStyle}
            value={brief.audience}
            onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))}
            placeholder="e.g. Enterprise CISOs and IT security leaders"
          />

          <label style={labelStyle}>BACKGROUND & CONTEXT</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 100, resize: 'vertical' }}
            value={brief.background}
            onChange={(e) => setBrief((b) => ({ ...b, background: e.target.value }))}
            placeholder="Any context, constraints, existing messaging, competitive landscape…"
          />

          <label style={labelStyle}>REFERENCE URLs (one per line)</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value)
              setBrief((b) => ({
                ...b,
                urls: e.target.value.split('\n').map((u) => u.trim()).filter(Boolean),
              }))
            }}
            placeholder="https://…"
          />

          <div style={{ marginTop: 24 }}>
            <PixelButton disabled={loading}>
              {loading ? 'DEPLOYING TEAMS…' : '▶ START CAMPAIGN'}
            </PixelButton>
          </div>
          {error && (
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              color: 'var(--ink)',
              marginTop: 14,
              padding: '8px 12px',
              border: '3px solid var(--ink)',
              background: 'var(--panel2)',
              lineHeight: 1.6,
            }}>
              ⚠ {error}
            </p>
          )}
        </form>
      </PixelPanel>
    </div>
  )
}
