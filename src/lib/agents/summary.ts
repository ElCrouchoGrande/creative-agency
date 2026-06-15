import { runAgent } from './runner'
import { SUMMARY_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runSummaryPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const teamPlans = Object.entries(warRoom.teamOutputs ?? {})
    .map(([team, output]) => {
      const plan = output?.challengeResponse || output?.draft || ''
      if (!plan) return null
      const label = team.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return `## ${label}\n${plan}`
    })
    .filter(Boolean)
    .join('\n\n---\n\n')

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}

Chosen Creative Path: ${warRoom.chosenPath?.concept ?? 'Not set'}
${warRoom.chosenPath?.rationale ? `Rationale: ${warRoom.chosenPath.rationale}` : ''}

Measurement Framework:
${warRoom.measurement ?? 'Not available'}

Full Team Plans:
${teamPlans}

Write the one-page campaign summary.`

  const output = await runAgent({
    campaignId,
    phase: 'summary',
    team: 'system',
    agent: 'summary',
    model: MODEL.specialist,
    systemPrompt: SUMMARY_PROMPT,
    messages: [{ role: 'user', content: context }],
  })

  const updated = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const wr = JSON.parse(updated.warRoom) as Record<string, unknown>
  wr.summary = output
  await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(wr) } })
}
