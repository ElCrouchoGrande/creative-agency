import type { CampaignEvent } from '@/lib/types'
import { agentLabel, teamLabel } from './teams'

export interface DialogueLine {
  team: string
  agent: string
  text: string
}

export function eventToDialogueLine(event: CampaignEvent): DialogueLine | null {
  switch (event.type) {
    case 'agent_start':
      return {
        team: event.team,
        agent: event.agent,
        text: `${agentLabel(event.agent)} from ${teamLabel(event.team)} is getting to work…`,
      }
    case 'agent_complete':
      return {
        team: event.team,
        agent: event.agent,
        text: `${agentLabel(event.agent)} has finished.`,
      }
    case 'agent_failed':
      return {
        team: event.team,
        agent: event.agent,
        text: `${agentLabel(event.agent)} encountered a problem.`,
      }
    case 'phase_change':
      return {
        team: 'system',
        agent: 'orchestrator',
        text: phaseChangeText(event.status),
      }
    case 'agent_token':
    case 'war_room_update':
      return null
  }
}

function phaseChangeText(status: string): string {
  switch (status) {
    case 'researching':    return 'Research phase beginning — analysts deploying…'
    case 'creative':       return 'Creative strategists taking the brief…'
    case 'awaiting_path':  return 'Three creative paths ready. Choose your direction.'
    case 'specialist':     return 'Specialist teams entering the building…'
    case 'challenge':      return 'Cross-team challenge round beginning.'
    case 'measuring':      return 'Measurement strategist drawing up the framework…'
    case 'awaiting_review':return 'Campaign complete. Results ready for review.'
    case 'complete':       return 'Campaign archived.'
    default:               return `Status: ${status}`
  }
}
