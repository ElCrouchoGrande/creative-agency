import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaignPostApproval } from '@/lib/runner/campaign-runner'
import type { WarRoom } from '@/lib/types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { pathId } = (await req.json()) as { pathId: 'A' | 'B' | 'C' }

  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
  if (campaign.status !== 'awaiting_path') {
    return NextResponse.json(
      { error: 'Campaign is not awaiting path selection' },
      { status: 409 }
    )
  }

  const warRoom = JSON.parse(campaign.warRoom) as WarRoom
  const chosen = warRoom.creativePaths?.find((p) => p.id === pathId)
  if (!chosen) {
    return NextResponse.json({ error: `Creative path ${pathId} not found` }, { status: 404 })
  }

  const updatedWarRoom: WarRoom = { ...warRoom, chosenPath: chosen }
  await db.campaign.update({
    where: { id },
    data: {
      warRoom: JSON.stringify(updatedWarRoom),
      status: 'specialist',
    },
  })

  setImmediate(() => {
    runCampaignPostApproval(id).catch((err) =>
      console.error(`Post-approval runner failed for ${id}:`, err)
    )
  })

  return NextResponse.json({ ok: true })
}
