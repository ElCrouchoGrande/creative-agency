import { describe, it, expect } from 'vitest'
import { teamLabel, agentLabel, teamIdentity, TEAM_IDENTITY, ALL_TEAM_NAMES } from './teams'

describe('teamLabel', () => {
  it('returns known label for earned_media', () => {
    expect(teamLabel('earned_media')).toBe('Earned Media')
  })
  it('returns known label for investor_relations', () => {
    expect(teamLabel('investor_relations')).toBe('Investor Relations')
  })
  it('falls back to title-cased for unknown', () => {
    expect(teamLabel('foo_bar_baz')).toBe('Foo Bar Baz')
  })
})

describe('agentLabel', () => {
  it('maps landscape_analyst', () => {
    expect(agentLabel('landscape_analyst')).toBe('Landscape Analyst')
  })
  it('maps strategist_close to Strategist', () => {
    expect(agentLabel('strategist_close')).toBe('Strategist')
  })
  it('falls back for unknown', () => {
    expect(agentLabel('some_agent')).toBe('Some Agent')
  })
})

describe('teamIdentity', () => {
  it('returns correct accent for paid_media', () => {
    const id = teamIdentity('paid_media')
    expect(id.accent).toBe(TEAM_IDENTITY.paid_media.accent)
    expect(id.icon).toBe('🤠')
  })
  it('returns content identity with correct icon', () => {
    const id = teamIdentity('content')
    expect(id.icon).toBe('✍️')
  })
  it('returns deterministic fallback for unknown team', () => {
    const a = teamIdentity('mystery_team')
    const b = teamIdentity('mystery_team')
    expect(a.accent).toBe(b.accent)
    expect(a.label).toBe('Mystery Team')
  })
  it('fallback has non-empty accent', () => {
    const id = teamIdentity('zz_unknown')
    expect(id.accent).toMatch(/^#/)
  })
})

describe('ALL_TEAM_NAMES', () => {
  it('has 9 entries', () => {
    expect(ALL_TEAM_NAMES).toHaveLength(9)
  })
  it('includes content and paid_media', () => {
    expect(ALL_TEAM_NAMES).toContain('content')
    expect(ALL_TEAM_NAMES).toContain('paid_media')
  })
})
