import type { TeamName } from './types'

export const TEAM_CONVERSATION_TURNS = parseInt(
  process.env.TEAM_CONVERSATION_TURNS ?? '3',
  10
)

export const MODEL = {
  orchestrator: 'claude-sonnet-4-6',
  research: 'claude-sonnet-4-6',
  creative: 'claude-sonnet-4-6',
  specialist: 'claude-haiku-4-5-20251001',
  facilitator: 'claude-sonnet-4-6',
} as const

export const ALL_TEAMS: TeamName[] = [
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
