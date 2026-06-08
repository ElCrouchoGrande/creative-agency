import type { MessageParam } from '@anthropic-ai/sdk/resources'
import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL } from './tools'
import { SPECIALIST_PROMPTS } from './prompts/specialist'
import { MODEL, TEAM_CONVERSATION_TURNS } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

export async function runSpecialistTeam(campaignId: string, teamName: TeamName): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}

Chosen creative path:
${JSON.stringify(warRoom.chosenPath, null, 2)}

Research:
${JSON.stringify(warRoom.research, null, 2)}

Write your team's campaign plan.`

  const prompts = SPECIALIST_PROMPTS[teamName]
  const makeToolHandler = (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, campaignId)

  const messages: MessageParam[] = []

  // Turn 1: Strategist opens
  messages.push({ role: 'user', content: context })
  const strategistOutput = await runAgent({
    campaignId,
    phase: 'specialist',
    team: teamName,
    agent: 'strategist',
    model: MODEL.specialist,
    systemPrompt: prompts.strategist,
    messages: [...messages],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: makeToolHandler,
  })
  messages.push({ role: 'assistant', content: strategistOutput })

  // Turn 2: Specialist challenges
  messages.push({
    role: 'user',
    content: 'Review this plan critically. What specific elements are weak or too generic? Push back hard with concrete examples.',
  })
  const specialistOutput = await runAgent({
    campaignId,
    phase: 'specialist',
    team: teamName,
    agent: 'specialist',
    model: MODEL.specialist,
    systemPrompt: prompts.specialist,
    messages: [...messages],
  })
  messages.push({ role: 'assistant', content: specialistOutput })

  // Turn 3: Strategist closes (if turns >= 3)
  if (TEAM_CONVERSATION_TURNS >= 3) {
    messages.push({
      role: 'user',
      content: `Incorporate this feedback. Write the final, sharpened team plan. Use write_war_room to save the draft to "teamOutputs.${teamName}.draft".`,
    })
    await runAgent({
      campaignId,
      phase: 'specialist',
      team: teamName,
      agent: 'strategist_close',
      model: MODEL.specialist,
      systemPrompt: prompts.strategist,
      messages: [...messages],
      tools: [WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler,
    })
  }
}

export async function runAllSpecialistTeams(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  await Promise.allSettled(activeTeams.map((team) => runSpecialistTeam(campaignId, team)))
}
