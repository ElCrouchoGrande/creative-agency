import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCreationTeam } from '@/lib/agents/creation'
import { ALL_TEAMS } from '@/lib/config'
import type { TeamName } from '@/lib/types'

const RETRYABLE_STATUSES = ['awaiting_review', 'complete']

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; team: string }> }
) {
  const { id, team } = await params

  if (!(ALL_TEAMS as string[]).includes(team)) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 })
  }

  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (!RETRYABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign is not in a retryable state' }, { status: 409 })
  }

  const warRoom = JSON.parse(campaign.warRoom)
  if (warRoom.teamOutputs?.[team]) {
    delete warRoom.teamOutputs[team].creation
    delete warRoom.teamOutputs[team].creationImages
  }
  await db.campaign.update({ where: { id }, data: { warRoom: JSON.stringify(warRoom) } })

  setImmediate(() => {
    runCreationTeam(id, team as TeamName).catch((err) =>
      console.error(`Creation team retry failed for ${id}/${team}:`, err)
    )
  })

  return NextResponse.json({ ok: true })
}
