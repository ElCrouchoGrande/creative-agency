import { runAgent } from './runner'
import { handleToolCall, ROUTE_CHALLENGE_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'
import { FACILITATOR_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

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

      const challengeInput = `The ${challenger.replace(/_/g, ' ')} team is approaching this campaign as follows:\n\n${challengerDraft}\n\nReview their angle against yours and write a complete revised version of your own plan — a full deliverable, not feedback or critique.`

      // Write challengeInput to war room
      const current = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
      const wr = JSON.parse(current.warRoom) as WarRoom
      if (!wr.teamOutputs) wr.teamOutputs = {}
      if (!wr.teamOutputs[challenged]) {
        wr.teamOutputs[challenged] = { draft: '', challengeInput: '', challengeResponse: '' }
      }
      wr.teamOutputs[challenged]!.challengeInput = challengeInput
      await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(wr) } })

      // Run challenge response agent
      await runAgent({
        campaignId,
        phase: 'challenge',
        team: challenged,
        agent: 'challenge_response',
        model: MODEL.specialist,
        systemPrompt: `You are the ${challenged.replace(/_/g, ' ')} team. You have just received a challenge from another team. Respond specifically and sharpen your plan.`,
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
