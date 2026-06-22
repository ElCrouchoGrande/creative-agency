import Link from 'next/link'
import { db } from '@/lib/db'
import type { Brief } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CampaignSummary {
  id: string
  status: string
  brief: Brief
  createdAt: Date
}

const STATUS_LABELS: Record<string, string> = {
  briefing:       'BRIEFING',
  researching:    'RESEARCHING',
  creative:       'CREATIVE',
  awaiting_path:  'CHOOSE PATH',
  specialist:     'TEAMS AT WORK',
  challenge:      'CHALLENGE',
  measuring:      'MEASURING',
  awaiting_review:'REVIEW',
  complete:       'COMPLETE',
}

export default async function HomePage() {
  let campaigns: CampaignSummary[] = []
  try {
    const rows = await db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, brief: true, createdAt: true },
    })
    campaigns = rows.map((r) => ({ ...r, brief: JSON.parse(r.brief) as Brief }))
  } catch {
    // DB not ready yet
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 18px' }}>
      {/* HUD bar */}
      <div style={{
        background: 'var(--hud)', color: 'var(--hud-ink)',
        borderBottom: '4px solid var(--ink)',
        boxShadow: '0 4px 0 rgba(0,0,0,.4)',
        padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1 }}>♛ BRANDS BY BOWSER</span>
        <span style={{ flex: 1 }} />
        <Link
          href="/campaigns/new"
          style={{
            fontFamily: 'var(--font-display)', fontSize: 9,
            padding: '8px 12px', background: 'var(--accent)', color: '#241405',
            border: '2px solid var(--ink)', textDecoration: 'none',
          }}
        >
          ▶ NEW CAMPAIGN
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 22, color: 'var(--ink-dim)', marginBottom: 24 }}>
            No campaigns yet. Deploy your first team.
          </div>
          <Link
            href="/campaigns/new"
            style={{
              fontFamily: 'var(--font-display)', fontSize: 10,
              padding: '12px 20px', background: 'var(--accent)', color: '#241405',
              border: '3px solid var(--ink)', textDecoration: 'none',
              boxShadow: '4px 4px 0 rgba(0,0,0,.3)',
            }}
          >
            ▶ START FIRST CAMPAIGN
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--panel)', border: '4px solid var(--ink)',
                boxShadow: 'inset 3px 3px 0 var(--border-light), inset -3px -3px 0 var(--border-dark), 4px 4px 0 rgba(0,0,0,.25)',
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--ink)', marginBottom: 4 }}>
                    {campaign.brief.goal}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-dim)' }}>
                    {campaign.brief.brand}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 7,
                    padding: '4px 8px',
                    background: campaign.status === 'complete' ? 'var(--led-done)' :
                                campaign.status === 'awaiting_review' ? 'var(--led-run)' :
                                'var(--ink)',
                    color: '#fff',
                  }}>
                    {STATUS_LABELS[campaign.status] ?? campaign.status.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-dim)' }}>
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
