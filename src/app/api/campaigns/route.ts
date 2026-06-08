import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaign } from '@/lib/runner/campaign-runner'
import type { Brief } from '@/lib/types'

export async function POST(req: Request) {
  const body = (await req.json()) as Brief

  if (!body.goal || !body.brand || !body.audience) {
    return NextResponse.json(
      { error: 'goal, brand, and audience are required' },
      { status: 400 }
    )
  }

  const campaign = await db.campaign.create({
    data: {
      brief: JSON.stringify(body),
      status: 'briefing',
    },
  })

  // Fire and forget — runs as background job
  setImmediate(() => {
    runCampaign(campaign.id).catch((err) =>
      console.error(`Campaign ${campaign.id} runner failed:`, err)
    )
  })

  return NextResponse.json({ id: campaign.id, status: campaign.status }, { status: 201 })
}

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, brief: true, createdAt: true },
  })
  return NextResponse.json(
    campaigns.map((c) => ({ ...c, brief: JSON.parse(c.brief) }))
  )
}
