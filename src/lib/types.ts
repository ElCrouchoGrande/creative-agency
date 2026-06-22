export type TeamName =
  | 'earned_media'
  | 'social'
  | 'employee_engagement'
  | 'public_affairs'
  | 'field_marketing'
  | 'influencer'
  | 'paid_media'
  | 'content'
  | 'investor_relations'

export const TEAM_NAMES: TeamName[] = [
  'earned_media',
  'social',
  'employee_engagement',
  'public_affairs',
  'field_marketing',
  'influencer',
  'paid_media',
  'content',
  'investor_relations',
]

export type AgentRunStatus = 'pending' | 'running' | 'complete' | 'failed'

export type CampaignStatus =
  | 'briefing'
  | 'researching'
  | 'creative'
  | 'awaiting_path'
  | 'specialist'
  | 'challenge'
  | 'measuring'
  | 'awaiting_review'
  | 'complete'

export interface Brief {
  goal: string
  brand: string
  audience: string
  background: string
  urls: string[]
}

export interface ResearchOutput {
  landscape: string
  trends: string
  whiteSpace: string
  synthesis: string
}

export interface CreativePath {
  id: 'A' | 'B' | 'C'
  concept: string
  rationale: string
  keyMessages: string[]
}

export interface TeamOutput {
  draft: string
  challengeInput: string
  challengeResponse: string
}

export interface WarRoom {
  research?: Partial<ResearchOutput>
  creativePaths?: CreativePath[]
  chosenPath?: CreativePath
  teamOutputs?: Partial<Record<TeamName, Partial<TeamOutput>>>
  measurement?: string
  summary?: string
}

export type CampaignEvent =
  | { type: 'agent_start'; team: string; agent: string; phase: string }
  | { type: 'agent_token'; team: string; agent: string; token: string }
  | { type: 'agent_complete'; team: string; agent: string; output: string }
  | { type: 'agent_failed'; team: string; agent: string }
  | { type: 'phase_change'; status: CampaignStatus }
  | { type: 'war_room_update'; warRoom: WarRoom }
