import { runAgent } from './runner'
import { handleToolCall, WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'
import {
  LANDSCAPE_ANALYST_PROMPT,
  TREND_SPOTTER_PROMPT,
  WHITE_SPACE_FINDER_PROMPT,
} from './prompts/research'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runResearchPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)

  const briefText = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}
Background: ${brief.background}
${brief.urls?.length > 0 ? `Reference URLs: ${brief.urls.join(', ')}` : ''}`

  const makeToolHandler = (id: string, allowedPaths: string[]) => (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, id, allowedPaths)

  // Landscape Analyst and Trend Spotter run in parallel
  await Promise.allSettled([
    runAgent({
      campaignId,
      phase: 'research',
      team: 'research',
      agent: 'landscape_analyst',
      model: MODEL.research,
      systemPrompt: LANDSCAPE_ANALYST_PROMPT,
      messages: [{ role: 'user', content: briefText }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId, ['research.landscape']),
    }),
    runAgent({
      campaignId,
      phase: 'research',
      team: 'research',
      agent: 'trend_spotter',
      model: MODEL.research,
      systemPrompt: TREND_SPOTTER_PROMPT,
      messages: [{ role: 'user', content: briefText }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId, ['research.trends']),
    }),
  ])

  // White Space Finder synthesises after both complete
  const updatedCampaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const warRoom = JSON.parse(updatedCampaign.warRoom) as WarRoom

  await runAgent({
    campaignId,
    phase: 'research',
    team: 'research',
    agent: 'white_space_finder',
    model: MODEL.research,
    systemPrompt: WHITE_SPACE_FINDER_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${briefText}\n\nWar room research so far:\n${JSON.stringify(warRoom.research ?? {}, null, 2)}\n\nIdentify the white space and write your synthesis.`,
      },
    ],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: makeToolHandler(campaignId, ['research.whiteSpace', 'research.synthesis']),
  })
}
