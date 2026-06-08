import { runAgent } from './runner'
import { handleToolCall, ACTIVATE_TEAMS_TOOL } from './tools'
import { ORCHESTRATOR_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

export async function runOrchestrator(campaignId: string): Promise<TeamName[]> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}
Background: ${brief.background}

Research synthesis: ${warRoom.research?.synthesis ?? 'Not yet available'}
Chosen creative path: ${warRoom.chosenPath ? JSON.stringify(warRoom.chosenPath) : 'Not yet selected'}

Select the appropriate specialist teams for this campaign.`

  await runAgent({
    campaignId,
    phase: 'specialist',
    team: 'system',
    agent: 'orchestrator',
    model: MODEL.orchestrator,
    systemPrompt: ORCHESTRATOR_PROMPT,
    messages: [{ role: 'user', content: context }],
    tools: [ACTIVATE_TEAMS_TOOL],
    onToolCall: (name, input) => handleToolCall(name, input, campaignId),
  })

  const updated = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  return JSON.parse(updated.activeTeams) as TeamName[]
}
