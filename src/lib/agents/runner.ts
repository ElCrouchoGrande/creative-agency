import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources'
import { db } from '@/lib/db'
import { campaignEvents } from '@/lib/events'

export interface AgentRunOptions {
  campaignId: string
  phase: string
  team: string
  agent: string
  model: string
  systemPrompt: string
  messages: MessageParam[]
  tools?: Tool[]
  onToolCall?: (name: string, input: Record<string, unknown>) => Promise<string>
}

// Wraps instantiation in a way that is compatible with vi.fn() mocks (which use arrow functions)
// and the real Anthropic class (which requires `new`). The mock returns an object directly;
// the real class uses `new`. We try `new` first, and fall back to a direct call for mocks.
function makeClient(): Anthropic {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = Anthropic as any
  // Try calling without `new` first — works with vi.fn() arrow-function mocks
  // In production, Anthropic is a class so we use new
  try {
    const instance = Ctor.call(Object.create(Ctor.prototype))
    if (instance && typeof instance.messages?.create === 'function') return instance as Anthropic
  } catch {
    // fall through
  }
  return new Anthropic({ timeout: 15 * 60 * 1000 }) // 15 min — research agents do multiple web searches
}

export async function runAgent(options: AgentRunOptions): Promise<string> {
  const { campaignId, phase, team, agent, model, systemPrompt, messages, tools = [], onToolCall } = options

  const anthropic = makeClient()

  const run = await db.agentRun.create({
    data: { campaignId, phase, team, agent, status: 'running' },
  })

  campaignEvents.emit(campaignId, { type: 'agent_start', team, agent, phase })

  try {
    let currentMessages = [...messages]
    let finalOutput = ''
    let tokensUsed = 0

    while (true) {
      const stream = anthropic.messages.stream({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools: tools.length > 0 ? tools : undefined,
      })

      stream.on('text', (token) => {
        campaignEvents.emit(campaignId, { type: 'agent_token', team, agent, token })
      })

      const response = await stream.finalMessage()
      tokensUsed += response.usage?.output_tokens ?? 0

      const textBlock = response.content.find((b) => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      if (text) finalOutput = text

      if (response.stop_reason !== 'tool_use' || !onToolCall) break

      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
      if (toolUseBlocks.length === 0) break

      // Execute all tool calls — API requires a tool_result for every tool_use in the message
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== 'tool_use') return null
          const result = await onToolCall(block.name, block.input as Record<string, unknown>)
          return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
        })
      )

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: toolResults.filter((r): r is NonNullable<typeof r> => r !== null),
        },
      ]
    }

    await db.agentRun.update({
      where: { id: run.id },
      data: { status: 'complete', output: finalOutput, tokensUsed },
    })

    campaignEvents.emit(campaignId, { type: 'agent_complete', team, agent, output: finalOutput })
    return finalOutput
  } catch (error) {
    console.error(`[agent:${agent}] failed:`, error)
    await db.agentRun.update({ where: { id: run.id }, data: { status: 'failed' } })
    campaignEvents.emit(campaignId, { type: 'agent_failed', team, agent })
    throw error
  }
}
