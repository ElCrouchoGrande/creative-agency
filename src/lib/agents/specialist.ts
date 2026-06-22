import type { MessageParam } from '@anthropic-ai/sdk/resources'
import { runAgent } from './runner'
import { handleToolCall, WEB_SEARCH_TOOL } from './tools'
import { SPECIALIST_PROMPTS } from './prompts/specialist'
import { MODEL, TEAM_CONVERSATION_TURNS } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

async function writeTeamDraft(campaignId: string, teamName: TeamName, draft: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const warRoom = JSON.parse(campaign.warRoom) as Record<string, unknown>
  const teamOutputs = (warRoom.teamOutputs ?? {}) as Record<string, unknown>
  teamOutputs[teamName] = { ...(teamOutputs[teamName] as object ?? {}), draft }
  warRoom.teamOutputs = teamOutputs
  await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(warRoom) } })
}

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

  const messages: MessageParam[] = []

  // Turn 1: Strategist opens
  messages.push({ role: 'user', content: context })
  // Turn 1: strategist researches and plans — web search only, no war room writes yet
  const strategistOutput = await runAgent({
    campaignId,
    phase: 'specialist',
    team: teamName,
    agent: 'strategist',
    model: MODEL.specialist,
    systemPrompt: prompts.strategist,
    messages: [...messages],
    tools: [WEB_SEARCH_TOOL],
    onToolCall: (name, input) => handleToolCall(name, input, campaignId),
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
  // No tool here — pure text output. The agent calling write_war_room was writing the
  // specialist's critique as content instead of a revised plan. Capturing text directly is reliable.
  if (TEAM_CONVERSATION_TURNS >= 3) {
    messages.push({
      role: 'user',
      content: `The specialist has reviewed your plan and given feedback above. Now write the complete, final ${teamName} plan incorporating their suggestions. Output the full plan as your response — do not summarise the feedback or critique the previous version. Write the deliverable.`,
    })
    const closingOutput = await runAgent({
      campaignId,
      phase: 'specialist',
      team: teamName,
      agent: 'strategist_close',
      model: MODEL.specialist,
      systemPrompt: prompts.strategist,
      messages: [...messages],
    })
    // Fall back to original strategist plan rather than the critique
    await writeTeamDraft(campaignId, teamName, closingOutput || strategistOutput)
  }
}

export async function runAllSpecialistTeams(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  await Promise.allSettled(activeTeams.map((team) => runSpecialistTeam(campaignId, team)))
}
