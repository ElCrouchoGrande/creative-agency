import { runAgent } from './runner'
import { GENERATE_IMAGE_TOOL, handleToolCall } from './tools'
import { CREATION_PROMPTS } from './prompts/creation'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'
import { withCampaignLock } from '@/lib/warRoomMutex'

async function writeTeamCreation(
  campaignId: string,
  teamName: TeamName,
  creation: string,
  creationImages?: string[]
): Promise<void> {
  await withCampaignLock(campaignId, async () => {
    const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
    const warRoom = JSON.parse(campaign.warRoom) as Record<string, unknown>
    const teamOutputs = (warRoom.teamOutputs ?? {}) as Record<string, unknown>
    teamOutputs[teamName] = {
      ...(teamOutputs[teamName] as object ?? {}),
      creation,
      ...(creationImages && creationImages.length > 0 ? { creationImages } : {}),
    }
    warRoom.teamOutputs = teamOutputs
    await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(warRoom) } })
  })
}

export async function runCreationTeam(campaignId: string, teamName: TeamName): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const teamOutput = warRoom.teamOutputs?.[teamName]
  const finalPlan = teamOutput?.challengeResponse || teamOutput?.draft || ''

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}
${warRoom.campaignName ? `Campaign Name: ${warRoom.campaignName}` : ''}
${warRoom.campaignTagline ? `Campaign Tagline: ${warRoom.campaignTagline}` : ''}

Chosen creative path:
${JSON.stringify(warRoom.chosenPath, null, 2)}

Research synthesis:
${warRoom.research?.synthesis ?? 'No research available'}

Your team's final campaign plan:
${finalPlan}

Now produce the deliverable described in your brief.`

  const isSocial = teamName === 'social'
  const imageUrls: string[] = []

  const creation = await runAgent({
    campaignId,
    phase: 'creating',
    team: teamName,
    agent: 'creator',
    model: MODEL.creation,
    systemPrompt: CREATION_PROMPTS[teamName],
    messages: [{ role: 'user', content: context }],
    tools: isSocial ? [GENERATE_IMAGE_TOOL] : [],
    maxTokens: (teamName === 'content' || teamName === 'earned_media') ? 6000 : 4096,
    onToolCall: isSocial
      ? async (name, input) => {
          const result = await handleToolCall(name, input, campaignId)
          if (name === 'generate_image' && result.startsWith('http')) {
            imageUrls.push(result)
          }
          return result
        }
      : undefined,
  })

  await writeTeamCreation(campaignId, teamName, creation, imageUrls.length > 0 ? imageUrls : undefined)
}

export async function runAllCreationTeams(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]
  await Promise.allSettled(activeTeams.map((team) => runCreationTeam(campaignId, team)))
}
