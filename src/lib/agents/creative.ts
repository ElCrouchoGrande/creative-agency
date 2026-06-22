import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL, WEB_SEARCH_TOOL } from './tools'
import { CREATIVE_STRATEGIST_PROMPTS } from './prompts/creative'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runCreativePhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}

Research findings:
${JSON.stringify(warRoom.research ?? {}, null, 2)}

Propose your creative path now.`

  const makeToolHandler = (id: string, allowedPaths: string[]) => (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, id, allowedPaths)

  await Promise.allSettled([
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_a',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.A,
      messages: [{ role: 'user', content: context }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId, ['creativePaths.A']),
    }),
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_b',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.B,
      messages: [{ role: 'user', content: context }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId, ['creativePaths.B']),
    }),
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_c',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.C,
      messages: [{ role: 'user', content: context }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId, ['creativePaths.C']),
    }),
  ])
}
