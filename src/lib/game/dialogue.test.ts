import { describe, it, expect } from 'vitest'
import { eventToDialogueLine } from './dialogue'
import type { CampaignEvent } from '@/lib/types'

describe('eventToDialogueLine', () => {
  it('returns a line for agent_start', () => {
    const event: CampaignEvent = { type: 'agent_start', team: 'earned_media', agent: 'strategist', phase: 'specialist' }
    const line = eventToDialogueLine(event)
    expect(line).not.toBeNull()
    expect(line!.team).toBe('earned_media')
    expect(line!.text).toContain('Strategist')
    expect(line!.text).toContain('Earned Media')
  })

  it('returns a line for agent_complete', () => {
    const event: CampaignEvent = { type: 'agent_complete', team: 'social', agent: 'specialist', output: 'done' }
    const line = eventToDialogueLine(event)
    expect(line).not.toBeNull()
    expect(line!.text).toContain('finished')
  })

  it('returns a line for agent_failed', () => {
    const event: CampaignEvent = { type: 'agent_failed', team: 'content', agent: 'strategist_close' }
    const line = eventToDialogueLine(event)
    expect(line).not.toBeNull()
    expect(line!.text).toContain('problem')
  })

  it('returns a line for phase_change', () => {
    const event: CampaignEvent = { type: 'phase_change', status: 'specialist' }
    const line = eventToDialogueLine(event)
    expect(line).not.toBeNull()
    expect(line!.team).toBe('system')
    expect(line!.text).toContain('Specialist')
  })

  it('returns null for agent_token', () => {
    const event: CampaignEvent = { type: 'agent_token', team: 'social', agent: 'strategist', token: 'hi' }
    expect(eventToDialogueLine(event)).toBeNull()
  })

  it('returns null for war_room_update', () => {
    const event: CampaignEvent = { type: 'war_room_update', warRoom: {} }
    expect(eventToDialogueLine(event)).toBeNull()
  })

  it('returns awaiting_path text for that status', () => {
    const event: CampaignEvent = { type: 'phase_change', status: 'awaiting_path' }
    const line = eventToDialogueLine(event)
    expect(line!.text).toContain('Three creative paths')
  })
})
