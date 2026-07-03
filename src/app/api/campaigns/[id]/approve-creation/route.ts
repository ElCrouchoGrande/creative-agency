import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaignPostCreationApproval } from '@/lib/runner/campaign-runner'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.status !== 'awaiting_creation') {
    return NextResponse.json(
      { error: 'Campaign is not awaiting creation approval' },
      { status: 409 }
    )
  }

  await db.campaign.update({
    where: { id },
    data: { status: 'creating' },
  })

  setImmediate(() => {
    runCampaignPostCreationApproval(id).catch((err) =>
      console.error(`Post-creation-approval runner failed for ${id}:`, err)
    )
  })

  return NextResponse.json({ ok: true })
}
