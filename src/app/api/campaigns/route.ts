import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaign } from '@/lib/runner/campaign-runner'
import { checkIpLimit, getIp } from '@/lib/rate-limit'
import type { Brief } from '@/lib/types'

const ACTIVE_STATUSES = ['researching', 'creative', 'specialist', 'challenge', 'measuring']
const MAX_CONCURRENT = 2

export async function POST(req: Request) {
  const body = (await req.json()) as Brief

  if (!body.goal || !body.brand || !body.audience) {
    return NextResponse.json(
      { error: 'goal, brand, and audience are required' },
      { status: 400 }
    )
  }

  for (const field of ['goal', 'brand', 'audience', 'background'] as const) {
    if (((body[field] as string) ?? '').length > 1000) {
      return NextResponse.json(
        { error: 'Brief fields must be under 1000 characters.' },
        { status: 400 }
      )
    }
  }
  if ((body.urls ?? []).length > 5) {
    return NextResponse.json({ error: 'Maximum 5 reference URLs.' }, { status: 400 })
  }

  // Check concurrency first so a full war room doesn't burn the user's daily attempt
  const active = await db.campaign.count({ where: { status: { in: ACTIVE_STATUSES } } })
  if (active >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'The war room is full. Try again in a few minutes.' },
      { status: 429 }
    )
  }

  // IP rate limit — 1 campaign per IP per 24 hours (disabled in development)
  if (process.env.NODE_ENV !== 'development') {
    const ip = getIp(req)
    if (!checkIpLimit(ip).allowed) {
      return NextResponse.json(
        { error: 'Daily briefing limit reached. Return tomorrow.' },
        { status: 429 }
      )
    }
  }

  const campaign = await db.campaign.create({
    data: {
      brief: JSON.stringify(body),
      status: 'briefing',
    },
  })

  setImmediate(() => {
    runCampaign(campaign.id).catch((err) =>
      console.error(`Campaign ${campaign.id} runner failed:`, err)
    )
  })

  return NextResponse.json({ id: campaign.id, status: campaign.status }, { status: 201 })
}

