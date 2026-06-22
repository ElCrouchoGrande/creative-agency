import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runSpecialistTeam } from '@/lib/agents/specialist'
import { TEAM_NAMES } from '@/lib/types'
import type { TeamName } from '@/lib/types'

const ACTIVE_STATUSES = ['researching', 'creative', 'specialist', 'challenge', 'measuring']
const RETRYABLE_STATUSES = ['awaiting_review', 'complete']
const MAX_CONCURRENT = 2

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; team: string }> }
) {
  const { id, team } = await params

  if (!(TEAM_NAMES as string[]).includes(team)) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 })
  }

  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (!RETRYABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign is not in a retryable state' }, { status: 409 })
  }

  const active = await db.campaign.count({ where: { status: { in: ACTIVE_STATUSES } } })
  if (active >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'The war room is full. Try again in a few minutes.' },
      { status: 429 }
    )
  }

  // Clear stale output so the output page doesn't show old content alongside the new run
  const warRoom = JSON.parse(campaign.warRoom) as Record<string, unknown>
  const teamOutputs = (warRoom.teamOutputs ?? {}) as Record<string, unknown>
  const existing = (teamOutputs[team] ?? {}) as Record<string, unknown>
  teamOutputs[team] = { ...existing, draft: '', challengeResponse: '' }
  warRoom.teamOutputs = teamOutputs
  await db.campaign.update({ where: { id }, data: { warRoom: JSON.stringify(warRoom) } })

  setImmediate(() => {
    runSpecialistTeam(id, team as TeamName).catch(console.error)
  })

  return NextResponse.json({ ok: true })
}
