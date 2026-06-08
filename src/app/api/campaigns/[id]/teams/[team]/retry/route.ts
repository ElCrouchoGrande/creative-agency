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

  setImmediate(() => {
    runSpecialistTeam(id, team as TeamName).catch(console.error)
  })

  return NextResponse.json({ ok: true })
}
