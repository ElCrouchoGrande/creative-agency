import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgent } from './runner'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Agent response text' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
      }),
    },
  })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    agentRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('@/lib/events', () => ({
  campaignEvents: { emit: vi.fn() },
}))

describe('runAgent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the agent text output', async () => {
    const result = await runAgent({
      campaignId: 'camp-1',
      phase: 'research',
      team: 'research',
      agent: 'landscape_analyst',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'You are an analyst.',
      messages: [{ role: 'user', content: 'Analyse this.' }],
    })
    expect(result).toBe('Agent response text')
  })

  it('creates an agent_run record with status running then complete', async () => {
    const { db } = await import('@/lib/db')
    await runAgent({
      campaignId: 'camp-1',
      phase: 'research',
      team: 'research',
      agent: 'landscape_analyst',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'You are an analyst.',
      messages: [{ role: 'user', content: 'Analyse this.' }],
    })
    expect(db.agentRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'running' }) })
    )
    expect(db.agentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) })
    )
  })

  it('sets status failed and rethrows on API error', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as ReturnType<typeof vi.fn>
    Anthropic.mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockRejectedValue(new Error('API error')) },
    }))
    const { db } = await import('@/lib/db')
    await expect(
      runAgent({
        campaignId: 'camp-1',
        phase: 'research',
        team: 'research',
        agent: 'landscape_analyst',
        model: 'claude-haiku-4-5-20251001',
        systemPrompt: 'You are an analyst.',
        messages: [{ role: 'user', content: 'Analyse this.' }],
      })
    ).rejects.toThrow('API error')
    expect(db.agentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
    )
  })
})
