import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const campaign = await db.campaign.findUniqueOrThrow({
      where: { id },
      include: { agentRuns: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({
      ...campaign,
      brief: JSON.parse(campaign.brief),
      warRoom: JSON.parse(campaign.warRoom),
      activeTeams: JSON.parse(campaign.activeTeams),
    })
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
}
