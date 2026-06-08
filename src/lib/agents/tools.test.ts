import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleToolCall, WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'

vi.mock('@/lib/db', () => ({
  db: {
    campaign: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ warRoom: '{}' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

global.fetch = vi.fn()

describe('handleToolCall', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls Tavily API for web_search and returns formatted results', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ title: 'Result', url: 'https://example.com', content: 'Body text' }],
      }),
    })
    const result = await handleToolCall('web_search', { query: 'test query' }, 'camp-1')
    expect(result).toContain('Result')
    expect(result).toContain('https://example.com')
  })

  it('writes to war room at the given path for write_war_room', async () => {
    const { db } = await import('@/lib/db')
    await handleToolCall(
      'write_war_room',
      { path: 'research.landscape', content: 'Landscape analysis here' },
      'camp-1'
    )
    expect(db.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          warRoom: expect.stringContaining('Landscape analysis here'),
        }),
      })
    )
  })

  it('throws for unknown tool name', async () => {
    await expect(handleToolCall('unknown_tool', {}, 'camp-1')).rejects.toThrow('Unknown tool')
  })
})
