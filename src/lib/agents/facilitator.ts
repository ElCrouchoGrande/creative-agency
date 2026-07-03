import { runAgent } from './runner'
import { handleToolCall, ROUTE_CHALLENGE_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'
import { FACILITATOR_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'
import { withCampaignLock } from '@/lib/warRoomMutex'

interface ChallengePair {
  challenger: TeamName
  challenged: TeamName
}

export async function runFacilitatorPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  const teamDrafts = activeTeams
    .map((team) => {
      const output = warRoom.teamOutputs?.[team]
      return `**${team.replace(/_/g, ' ').toUpperCase()}**:\n${output?.draft ?? 'No draft yet'}`
    })
    .join('\n\n---\n\n')

  let challengePairs: ChallengePair[] = []

  await runAgent({
    campaignId,
    phase: 'challenge',
    team: 'system',
    agent: 'facilitator',
    model: MODEL.facilitator,
    systemPrompt: FACILITATOR_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are all the specialist team drafts:\n\n${teamDrafts}\n\nSelect 2-3 challenge pairs and route them.`,
      },
    ],
    tools: [ROUTE_CHALLENGE_TOOL],
    onToolCall: async (name, input) => {
      if (name === 'route_challenge') {
        challengePairs = input.pairs as ChallengePair[]
        return `Routing ${challengePairs.length} challenge pairs`
      }
      return handleToolCall(name, input, campaignId)
    },
  })

  await Promise.allSettled(
    challengePairs.map(async ({ challenger, challenged }) => {
      const challengerDraft = warRoom.teamOutputs?.[challenger]?.draft ?? ''

      const challengeInput = `The ${challenger.replace(/_/g, ' ')} team is approaching this campaign as follows:\n\n${challengerDraft}\n\nRead their plan carefully. Identify: (1) one assumption in your own plan that their approach calls into question, (2) one specific thing they are doing that your plan should connect to or account for, and (3) one place where the tension between your two approaches can become a sharper, more integrated campaign moment.\n\nThen write a complete revised version of your own plan that reflects these adjustments — a full deliverable, not a commentary.`

      // Write challengeInput to war room
      await withCampaignLock(campaignId, async () => {
        const current = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
        const wr = JSON.parse(current.warRoom) as WarRoom
        if (!wr.teamOutputs) wr.teamOutputs = {}
        if (!wr.teamOutputs[challenged]) {
          wr.teamOutputs[challenged] = { draft: '', challengeInput: '', challengeResponse: '' }
        }
        wr.teamOutputs[challenged]!.challengeInput = challengeInput
        await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(wr) } })
      })

      // Run challenge response agent
      await runAgent({
        campaignId,
        phase: 'challenge',
        team: challenged,
        agent: 'challenge_response',
        model: MODEL.specialist,
        systemPrompt: `You are the ${challenged.replace(/_/g, ' ')} team strategist. A peer team has reviewed the same campaign from their vantage point and their approach puts pressure on yours. Your job is to genuinely reconsider your plan in light of what they are doing — not to restate what you already wrote with minor tweaks.

Be specific about what changes and why. The revised plan must be meaningfully different from your original in at least one substantive way: a changed assumption, a new integration point, a sharpened angle, or a deliverable that now explicitly connects to the challenger's work.`,
        messages: [
          {
            role: 'user',
            content: `${challengeInput}\n\nWrite your complete, revised campaign plan as a deliverable document. Use write_war_room with path "teamOutputs.${challenged}.challengeResponse" to save it.`,
          },
        ],
        tools: [WRITE_WAR_ROOM_TOOL],
        onToolCall: (name, input) =>
          handleToolCall(name, input, campaignId, [`teamOutputs.${challenged}.challengeResponse`]),
      })
    })
  )
}
