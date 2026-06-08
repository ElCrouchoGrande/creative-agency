import type { Tool } from '@anthropic-ai/sdk/resources'
import { db } from '@/lib/db'

export const WEB_SEARCH_TOOL: Tool = {
  name: 'web_search',
  description: 'Search the web for current information. Returns titles, URLs, and content excerpts.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
}

export const WRITE_WAR_ROOM_TOOL: Tool = {
  name: 'write_war_room',
  description:
    'Write your output to the shared campaign war room. Use dot notation for path, e.g. "research.landscape" or "teamOutputs.earned_media.draft".',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Dot-notation path in the war room JSON' },
      content: { type: 'string', description: 'The content to write at this path' },
    },
    required: ['path', 'content'],
  },
}

export const ACTIVATE_TEAMS_TOOL: Tool = {
  name: 'activate_teams',
  description: 'Select which specialist teams should work on this campaign.',
  input_schema: {
    type: 'object',
    properties: {
      teams: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of team names to activate',
      },
    },
    required: ['teams'],
  },
}

export const ROUTE_CHALLENGE_TOOL: Tool = {
  name: 'route_challenge',
  description: 'Define which team pairs challenge each other in the cross-team round.',
  input_schema: {
    type: 'object',
    properties: {
      pairs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            challenger: { type: 'string' },
            challenged: { type: 'string' },
          },
          required: ['challenger', 'challenged'],
        },
      },
    },
    required: ['pairs'],
  },
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

export async function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  campaignId: string
): Promise<string> {
  if (name === 'web_search') {
    const query = input.query as string
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5, search_depth: 'basic' }),
    })
    const data = (await response.json()) as {
      results: Array<{ title: string; url: string; content: string }>
    }
    return data.results
      .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
      .join('\n\n---\n\n')
  }

  if (name === 'write_war_room') {
    const path = input.path as string
    const content = input.content as string
    const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
    const warRoom = JSON.parse(campaign.warRoom) as Record<string, unknown>
    setNestedValue(warRoom, path, content)
    await db.campaign.update({
      where: { id: campaignId },
      data: { warRoom: JSON.stringify(warRoom) },
    })
    return `Written to war room at path: ${path}`
  }

  if (name === 'activate_teams') {
    const teams = input.teams as string[]
    await db.campaign.update({
      where: { id: campaignId },
      data: { activeTeams: JSON.stringify(teams) },
    })
    return `Activated teams: ${teams.join(', ')}`
  }

  if (name === 'route_challenge') {
    return JSON.stringify(input.pairs)
  }

  throw new Error(`Unknown tool: ${name}`)
}
