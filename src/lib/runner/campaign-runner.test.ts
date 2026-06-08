import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCampaign } from './campaign-runner'

vi.mock('@/lib/db', () => ({
  db: {
    campaign: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'camp-1',
        status: 'briefing',
        brief: JSON.stringify({ goal: 'Test' }),
        warRoom: '{}',
        activeTeams: '[]',
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('@/lib/events', () => ({
  campaignEvents: { emit: vi.fn() },
}))

vi.mock('@/lib/agents/research', () => ({
  runResearchPhase: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/agents/creative', () => ({
  runCreativePhase: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/agents/orchestrator', () => ({
  runOrchestrator: vi.fn().mockResolvedValue(['social']),
}))

vi.mock('@/lib/agents/specialist', () => ({
  runAllSpecialistTeams: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/agents/facilitator', () => ({
  runFacilitatorPhase: vi.fn().mockResolvedValue(undefined),
}))

describe('runCampaign', () => {
  beforeEach(() => vi.clearAllMocks())

  it('advances status through researching → creative → awaiting_path', async () => {
    const { db } = await import('@/lib/db')
    await runCampaign('camp-1')
    const updateCalls = (db.campaign.update as ReturnType<typeof vi.fn>).mock.calls
    const statuses = updateCalls.map(
      (c: unknown[]) => (c[0] as { data: { status: string } }).data.status
    )
    expect(statuses).toContain('researching')
    expect(statuses).toContain('creative')
    expect(statuses).toContain('awaiting_path')
  })

  it('calls research then creative phases in order', async () => {
    const { runResearchPhase } = await import('@/lib/agents/research')
    const { runCreativePhase } = await import('@/lib/agents/creative')
    const { runOrchestrator } = await import('@/lib/agents/orchestrator')
    await runCampaign('camp-1')
    expect(runResearchPhase).toHaveBeenCalledWith('camp-1')
    expect(runCreativePhase).toHaveBeenCalledWith('camp-1')
    expect(runOrchestrator).not.toHaveBeenCalled()
  })
})
