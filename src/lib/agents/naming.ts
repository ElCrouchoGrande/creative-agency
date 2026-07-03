import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL } from './tools'
import { NAMING_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runNamingPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief) as { goal: string; brand: string; audience: string }
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Brand: ${brief.brand}
Goal: ${brief.goal}
Audience: ${brief.audience}

Chosen Creative Path:
${JSON.stringify(warRoom.chosenPath, null, 2)}

Campaign Summary:
${warRoom.summary ?? 'Not yet available'}

Name this campaign.`

  await runAgent({
    campaignId,
    phase: 'measuring',
    team: 'system',
    agent: 'naming',
    model: MODEL.creative,
    systemPrompt: NAMING_PROMPT,
    messages: [{ role: 'user', content: context }],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: (name, input) => handleToolCall(name, input, campaignId, ['campaignName', 'campaignTagline']),
  })
}
