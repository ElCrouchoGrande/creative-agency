import { describe, it, expect } from 'vitest'
import { campaignReducer, initialState } from './campaignReducer'
import type { Campaign } from '@/lib/api'
import type { CampaignEvent, WarRoom } from '@/lib/types'

const baseBrief = { goal: 'Test', brand: 'Brand', audience: 'All', background: '', urls: [] }

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    status: 'specialist',
    brief: baseBrief,
    warRoom: {},
    activeTeams: ['earned_media', 'social'],
    agentRuns: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('HYDRATE', () => {
  it('sets status and activeTeams from campaign', () => {
    const state = initialState('c1')
    const next = campaignReducer(state, { type: 'HYDRATE', campaign: makeCampaign() })
    expect(next.status).toBe('specialist')
    expect(next.activeTeams).toEqual(['earned_media', 'social'])
  })

  it('builds teams from agentRuns', () => {
    const state = initialState('c1')
    const campaign = makeCampaign({
      agentRuns: [
        { id: 'r1', campaignId: 'c1', phase: 'specialist', team: 'social', agent: 'strategist', status: 'complete', output: 'plan text', tokensUsed: 100, createdAt: '' },
      ],
    })
    const next = campaignReducer(state, { type: 'HYDRATE', campaign })
    expect(next.teams['social']).toBeDefined()
    expect(next.teams['social'].agents['strategist'].output).toBe('plan text')
    expect(next.teams['social'].agents['strategist'].status).toBe('complete')
  })

  it('derives overallStatus=complete when all agents complete', () => {
    const state = initialState('c1')
    const campaign = makeCampaign({
      agentRuns: [
        { id: 'r1', campaignId: 'c1', phase: 'specialist', team: 'content', agent: 'strategist', status: 'complete', output: '', tokensUsed: 0, createdAt: '' },
        { id: 'r2', campaignId: 'c1', phase: 'specialist', team: 'content', agent: 'specialist', status: 'complete', output: '', tokensUsed: 0, createdAt: '' },
      ],
    })
    const next = campaignReducer(state, { type: 'HYDRATE', campaign })
    expect(next.teams['content'].overallStatus).toBe('complete')
  })

  it('parses challengerOf from challengeInput', () => {
    const state = initialState('c1')
    const warRoom: WarRoom = {
      teamOutputs: {
        social: { challengeInput: 'The earned_media team is approaching...', challengeResponse: 'revised', draft: 'draft' },
      },
    }
    const campaign = makeCampaign({ warRoom, agentRuns: [] })
    const next = campaignReducer(state, { type: 'HYDRATE', campaign })
    expect(next.teams['social'].challengerOf).toBe('earned_media')
  })
})

describe('HYDRATE_STATUS_ONLY', () => {
  it('updates status but preserves running agent output', () => {
    const base = initialState('c1')
    // Set up a running agent
    const withRunning = campaignReducer(base, {
      type: 'SSE_EVENT',
      event: { type: 'agent_start', team: 'social', agent: 'strategist', phase: 'specialist' } as CampaignEvent,
    })
    const withToken = campaignReducer(withRunning, {
      type: 'SSE_EVENT',
      event: { type: 'agent_token', team: 'social', agent: 'strategist', token: 'live output' } as CampaignEvent,
    })

    const campaign = makeCampaign({
      status: 'challenge',
      agentRuns: [
        { id: 'r1', campaignId: 'c1', phase: 'specialist', team: 'social', agent: 'strategist', status: 'running', output: 'old db output', tokensUsed: 0, createdAt: '' },
      ],
    })
    const next = campaignReducer(withToken, { type: 'HYDRATE_STATUS_ONLY', campaign })
    expect(next.status).toBe('challenge')
    // Should preserve the live streamed output, not overwrite with old db output
    expect(next.teams['social'].agents['strategist'].output).toBe('live output')
  })
})

describe('SSE_EVENT agent_start', () => {
  it('creates team entry and sets running', () => {
    const state = initialState('c1')
    const event: CampaignEvent = { type: 'agent_start', team: 'influencer', agent: 'strategist', phase: 'specialist' }
    const next = campaignReducer(state, { type: 'SSE_EVENT', event })
    expect(next.teams['influencer']).toBeDefined()
    expect(next.teams['influencer'].agents['strategist'].status).toBe('running')
    expect(next.lastActiveKey).toEqual({ team: 'influencer', agent: 'strategist' })
  })

  it('adds team to activeTeams if not present', () => {
    const state = initialState('c1')
    const event: CampaignEvent = { type: 'agent_start', team: 'content', agent: 'strategist', phase: 'specialist' }
    const next = campaignReducer(state, { type: 'SSE_EVENT', event })
    expect(next.activeTeams).toContain('content')
  })

  it('does not duplicate in activeTeams', () => {
    const state = { ...initialState('c1'), activeTeams: ['content'] }
    const event: CampaignEvent = { type: 'agent_start', team: 'content', agent: 'specialist', phase: 'specialist' }
    const next = campaignReducer(state, { type: 'SSE_EVENT', event })
    expect(next.activeTeams.filter((t) => t === 'content')).toHaveLength(1)
  })
})

describe('SSE_EVENT agent_token', () => {
  it('appends token to agent output', () => {
    const state = initialState('c1')
    const start = campaignReducer(state, {
      type: 'SSE_EVENT',
      event: { type: 'agent_start', team: 'earned_media', agent: 'strategist', phase: 'specialist' },
    })
    const t1 = campaignReducer(start, {
      type: 'SSE_EVENT',
      event: { type: 'agent_token', team: 'earned_media', agent: 'strategist', token: 'Hello ' },
    })
    const t2 = campaignReducer(t1, {
      type: 'SSE_EVENT',
      event: { type: 'agent_token', team: 'earned_media', agent: 'strategist', token: 'World' },
    })
    expect(t2.teams['earned_media'].agents['strategist'].output).toBe('Hello World')
  })
})

describe('SSE_EVENT agent_complete', () => {
  it('sets status to complete and updates output', () => {
    const state = initialState('c1')
    const started = campaignReducer(state, {
      type: 'SSE_EVENT',
      event: { type: 'agent_start', team: 'social', agent: 'strategist', phase: 'specialist' },
    })
    const next = campaignReducer(started, {
      type: 'SSE_EVENT',
      event: { type: 'agent_complete', team: 'social', agent: 'strategist', output: 'final output' },
    })
    expect(next.teams['social'].agents['strategist'].status).toBe('complete')
    expect(next.teams['social'].agents['strategist'].output).toBe('final output')
  })
})

describe('SSE_EVENT agent_failed', () => {
  it('sets status to failed', () => {
    const state = initialState('c1')
    const started = campaignReducer(state, {
      type: 'SSE_EVENT',
      event: { type: 'agent_start', team: 'paid_media', agent: 'strategist', phase: 'specialist' },
    })
    const next = campaignReducer(started, {
      type: 'SSE_EVENT',
      event: { type: 'agent_failed', team: 'paid_media', agent: 'strategist' },
    })
    expect(next.teams['paid_media'].agents['strategist'].status).toBe('failed')
    expect(next.teams['paid_media'].overallStatus).toBe('failed')
  })
})

describe('SSE_EVENT phase_change', () => {
  it('updates status', () => {
    const state = initialState('c1')
    const next = campaignReducer(state, {
      type: 'SSE_EVENT',
      event: { type: 'phase_change', status: 'challenge' },
    })
    expect(next.status).toBe('challenge')
  })
})

describe('SSE_EVENT war_room_update', () => {
  it('updates warRoom and creativePaths', () => {
    const state = initialState('c1')
    const warRoom: WarRoom = {
      creativePaths: [
        { id: 'A', concept: 'Alpha', rationale: 'R', keyMessages: [] },
        { id: 'B', concept: 'Beta',  rationale: 'R', keyMessages: [] },
      ],
    }
    const next = campaignReducer(state, {
      type: 'SSE_EVENT',
      event: { type: 'war_room_update', warRoom },
    })
    expect(next.warRoom.creativePaths).toHaveLength(2)
    expect(next.creativePaths).toHaveLength(2)
  })
})
