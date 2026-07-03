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
  creation: 'claude-sonnet-4-6',
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

export function validateEnv(): void {
  const missing: string[] = []
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY')
  if (!process.env.TAVILY_API_KEY) missing.push('TAVILY_API_KEY')
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[config] OPENAI_API_KEY not set — social team image generation will be disabled')
  }
}
