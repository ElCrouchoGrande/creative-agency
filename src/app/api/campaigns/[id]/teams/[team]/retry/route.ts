import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runSpecialistTeam } from '@/lib/agents/specialist'
import type { TeamName } from '@/lib/types'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; team: string }> }
) {
  const { id, team } = await params
  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
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
