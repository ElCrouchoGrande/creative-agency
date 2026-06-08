import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSpecialistTeam } from './specialist'

vi.mock('./runner', () => ({
  runAgent: vi.fn().mockResolvedValue('Agent output'),
}))

vi.mock('@/lib/db', () => ({
  db: {
    campaign: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        brief: JSON.stringify({ goal: 'Test', brand: 'Brand', audience: 'Audience', background: '' }),
        warRoom: JSON.stringify({ chosenPath: { id: 'A', concept: 'Test concept', rationale: 'Test rationale', keyMessages: [] } }),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('./tools', () => ({
  handleToolCall: vi.fn().mockResolvedValue('Tool result'),
  WRITE_WAR_ROOM_TOOL: { name: 'write_war_room' },
}))

describe('runSpecialistTeam', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs 3 agent calls for a 3-turn conversation', async () => {
    const { runAgent } = await import('./runner')
    await runSpecialistTeam('camp-1', 'earned_media')
    expect(runAgent).toHaveBeenCalledTimes(3)
  })

  it('labels agents strategist, specialist, strategist_close', async () => {
    const { runAgent } = await import('./runner')
    await runSpecialistTeam('camp-1', 'earned_media')
    const calls = (runAgent as ReturnType<typeof vi.fn>).mock.calls
    const agents = calls.map((c: unknown[]) => (c[0] as { agent: string }).agent)
    expect(agents).toEqual(['strategist', 'specialist', 'strategist_close'])
  })
})
