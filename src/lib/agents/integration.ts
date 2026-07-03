import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL } from './tools'
import { INTEGRATION_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom, TeamName } from '@/lib/types'

export async function runIntegrationPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief) as { goal: string; brand: string; audience: string }
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  const teamPlans = activeTeams
    .map((team) => {
      const output = warRoom.teamOutputs?.[team]
      const plan = output?.challengeResponse || output?.draft || 'No plan available'
      return `**${team.replace(/_/g, ' ').toUpperCase()}:**\n${plan}`
    })
    .join('\n\n---\n\n')

  const context = `Campaign Brief:
Brand: ${brief.brand}
Goal: ${brief.goal}
Audience: ${brief.audience}

Chosen Creative Path:
${JSON.stringify(warRoom.chosenPath, null, 2)}

Campaign Name: ${warRoom.campaignName ?? 'TBD'}

Team Plans:
${teamPlans}

Measurement Framework:
${warRoom.measurement ?? 'Not available'}

Write the Campaign Integration Map.`

  await runAgent({
    campaignId,
    phase: 'measuring',
    team: 'system',
    agent: 'integration',
    model: MODEL.facilitator,
    systemPrompt: INTEGRATION_PROMPT,
    messages: [{ role: 'user', content: context }],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: (name, input) => handleToolCall(name, input, campaignId, ['integration']),
  })
}
