# AI Campaign Team — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full backend for the AI campaign team system — project setup, database, agent pipeline (research → creative → specialist → challenge), and all API routes — producing a working backend testable via curl.

**Architecture:** Next.js 15 full-stack. A background runner (`setImmediate` chain) runs the agent pipeline, writing to SQLite via Prisma. An in-memory EventEmitter emits campaign events consumed by the SSE endpoint. All agent calls go through a single `runAgent` function that records every call to `agent_runs`.

**Tech Stack:** Next.js 15, TypeScript, Prisma + SQLite, `@anthropic-ai/sdk`, Tailwind CSS, Vitest

---

## File Map

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | DB schema (Campaign, AgentRun) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/types.ts` | All shared TypeScript types |
| `src/lib/config.ts` | Model names, team list, turn cap |
| `src/lib/events.ts` | In-memory EventEmitter for SSE |
| `src/lib/agents/runner.ts` | Core Claude API call + agent_run recording |
| `src/lib/agents/tools.ts` | Tool definitions + handlers |
| `src/lib/agents/prompts/research.ts` | Research agent system prompts |
| `src/lib/agents/prompts/creative.ts` | Creative strategist system prompts |
| `src/lib/agents/prompts/specialist.ts` | All 9 specialist team system prompts |
| `src/lib/agents/prompts/system.ts` | Orchestrator + facilitator prompts |
| `src/lib/agents/research.ts` | Research phase (3 agents in parallel) |
| `src/lib/agents/creative.ts` | Creative phase (3 strategists in parallel) |
| `src/lib/agents/orchestrator.ts` | Orchestrator (team selection + phase control) |
| `src/lib/agents/specialist.ts` | Specialist team runner (within-team conversation) |
| `src/lib/agents/facilitator.ts` | Facilitator + cross-team challenge round |
| `src/lib/runner/campaign-runner.ts` | Background job chain (setImmediate) |
| `src/app/api/campaigns/route.ts` | POST /api/campaigns |
| `src/app/api/campaigns/[id]/route.ts` | GET /api/campaigns/[id] |
| `src/app/api/campaigns/[id]/stream/route.ts` | GET SSE stream |
| `src/app/api/campaigns/[id]/approve-path/route.ts` | POST approve creative path |
| `src/app/api/campaigns/[id]/teams/[team]/retry/route.ts` | POST retry failed team |
| `src/lib/agents/runner.test.ts` | Agent runner tests |
| `src/lib/agents/tools.test.ts` | Tool handler tests |
| `src/lib/agents/specialist.test.ts` | Within-team conversation tests |
| `src/lib/runner/campaign-runner.test.ts` | State machine transition tests |

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `vitest.config.ts`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted: yes to TypeScript, yes to Tailwind, yes to App Router, no to `src/` directory. After scaffolding, move everything into `src/`:

```bash
mkdir -p src/app src/lib src/components
mv app src/
mv components src/ 2>/dev/null || true
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk @prisma/client @paralleldrive/cuid2
npm install -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Create .env.local**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="your-key-here"
TAVILY_API_KEY="your-key-here"
TEAM_CONVERSATION_TURNS="3"
EOF
```

Replace the placeholder values with your actual keys. Get a Tavily key at tavily.com (free tier is sufficient).

- [ ] **Step 5: Update tsconfig.json to include src/**

Open `tsconfig.json` and ensure paths includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Vitest"
```

---

## Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env` (you already have it in `.env.local` — ignore the `.env` file Prisma creates).

- [ ] **Step 2: Write the schema**

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Campaign {
  id          String     @id @default(cuid())
  status      String     @default("briefing")
  brief       String
  warRoom     String     @default("{}")
  activeTeams String     @default("[]")
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  agentRuns   AgentRun[]
}

model AgentRun {
  id         String   @id @default(cuid())
  campaignId String
  phase      String
  team       String
  agent      String
  status     String   @default("pending")
  output     String   @default("")
  tokensUsed Int      @default(0)
  createdAt  DateTime @default(now())
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Create db.ts singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 6: Verify DB works**

```bash
npx prisma studio
```

Open http://localhost:5555 and confirm Campaign and AgentRun tables exist. Close with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema and SQLite database"
```

---

## Task 3: Types, Config, and Events

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/config.ts`
- Create: `src/lib/events.ts`

- [ ] **Step 1: Write types.ts**

Create `src/lib/types.ts`:

```typescript
export type TeamName =
  | 'earned_media'
  | 'social'
  | 'employee_engagement'
  | 'public_affairs'
  | 'field_marketing'
  | 'influencer'
  | 'paid_media'
  | 'content'
  | 'investor_relations'

export type CampaignStatus =
  | 'briefing'
  | 'researching'
  | 'creative'
  | 'awaiting_path'
  | 'specialist'
  | 'challenge'
  | 'awaiting_review'
  | 'complete'

export interface Brief {
  goal: string
  brand: string
  audience: string
  background: string
  urls: string[]
}

export interface ResearchOutput {
  landscape: string
  trends: string
  whiteSpace: string
  synthesis: string
}

export interface CreativePath {
  id: 'A' | 'B' | 'C'
  concept: string
  rationale: string
  keyMessages: string[]
}

export interface TeamOutput {
  draft: string
  challengeInput: string
  challengeResponse: string
}

export interface WarRoom {
  research?: Partial<ResearchOutput>
  creativePaths?: CreativePath[]
  chosenPath?: CreativePath
  teamOutputs?: Partial<Record<TeamName, Partial<TeamOutput>>>
}

export type CampaignEvent =
  | { type: 'agent_start'; team: string; agent: string; phase: string }
  | { type: 'agent_token'; team: string; agent: string; token: string }
  | { type: 'agent_complete'; team: string; agent: string; output: string }
  | { type: 'agent_failed'; team: string; agent: string }
  | { type: 'phase_change'; status: CampaignStatus }
  | { type: 'war_room_update'; warRoom: WarRoom }
```

- [ ] **Step 2: Write config.ts**

Create `src/lib/config.ts`:

```typescript
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
```

- [ ] **Step 3: Write events.ts**

Create `src/lib/events.ts`:

```typescript
import { EventEmitter } from 'events'
import type { CampaignEvent } from './types'

class CampaignEventEmitter extends EventEmitter {
  emit(campaignId: string, event: CampaignEvent): boolean {
    return super.emit(`campaign:${campaignId}`, event)
  }

  on(campaignId: string, listener: (event: CampaignEvent) => void): this {
    return super.on(`campaign:${campaignId}`, listener)
  }

  off(campaignId: string, listener: (event: CampaignEvent) => void): this {
    return super.off(`campaign:${campaignId}`, listener)
  }
}

export const campaignEvents = new CampaignEventEmitter()
campaignEvents.setMaxListeners(200)
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/config.ts src/lib/events.ts
git commit -m "feat: add types, config, and event emitter"
```

---

## Task 4: Core Agent Runner

**Files:**
- Create: `src/lib/agents/runner.ts`
- Create: `src/lib/agents/runner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/agents/runner.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- runner.test
```

Expected: FAIL — `Cannot find module './runner'`

- [ ] **Step 3: Implement runner.ts**

Create `src/lib/agents/runner.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources'
import { db } from '@/lib/db'
import { campaignEvents } from '@/lib/events'

const anthropic = new Anthropic()

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

export async function runAgent(options: AgentRunOptions): Promise<string> {
  const { campaignId, phase, team, agent, model, systemPrompt, messages, tools = [], onToolCall } = options

  const run = await db.agentRun.create({
    data: { campaignId, phase, team, agent, status: 'running' },
  })

  campaignEvents.emit(campaignId, { type: 'agent_start', team, agent, phase })

  try {
    let currentMessages = [...messages]
    let finalOutput = ''
    let tokensUsed = 0

    while (true) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools: tools.length > 0 ? tools : undefined,
      })

      tokensUsed += response.usage?.output_tokens ?? 0

      const textBlock = response.content.find((b) => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''

      if (text) {
        finalOutput = text
        campaignEvents.emit(campaignId, { type: 'agent_token', team, agent, token: text })
      }

      if (response.stop_reason !== 'tool_use' || !onToolCall) break

      const toolUseBlock = response.content.find((b) => b.type === 'tool_use')
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break

      const toolResult = await onToolCall(
        toolUseBlock.name,
        toolUseBlock.input as Record<string, unknown>
      )

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }],
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
    await db.agentRun.update({ where: { id: run.id }, data: { status: 'failed' } })
    campaignEvents.emit(campaignId, { type: 'agent_failed', team, agent })
    throw error
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- runner.test
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/runner.ts src/lib/agents/runner.test.ts
git commit -m "feat: add core agent runner with agent_run recording"
```

---

## Task 5: Tool Definitions and Handlers

**Files:**
- Create: `src/lib/agents/tools.ts`
- Create: `src/lib/agents/tools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/agents/tools.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tools.test
```

Expected: FAIL — `Cannot find module './tools'`

- [ ] **Step 3: Implement tools.ts**

Create `src/lib/agents/tools.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tools.test
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/tools.ts src/lib/agents/tools.test.ts
git commit -m "feat: add agent tool definitions and handlers"
```

---

## Task 6: Agent System Prompts

**Files:**
- Create: `src/lib/agents/prompts/research.ts`
- Create: `src/lib/agents/prompts/creative.ts`
- Create: `src/lib/agents/prompts/specialist.ts`
- Create: `src/lib/agents/prompts/system.ts`

- [ ] **Step 1: Write research prompts**

Create `src/lib/agents/prompts/research.ts`:

```typescript
export const LANDSCAPE_ANALYST_PROMPT = `You are a sharp PR and communications strategist specialising in competitive landscape analysis.

Your job: analyse the competitive media landscape and brand position for a campaign brief.

Focus on:
- How competitors and peers are communicating in this space
- What narrative the client currently owns (if any)
- Where the client sits relative to category conversations
- Recent media coverage patterns in this sector

Be specific. Cite what you find. Avoid generalities.

When you have gathered enough information, use write_war_room to save your analysis to path "research.landscape".`

export const TREND_SPOTTER_PROMPT = `You are a cultural strategist and trend analyst with a sharp eye for what conversations are breaking through.

Your job: identify relevant cultural moments, emerging conversations, and timing windows for a campaign brief.

Focus on:
- What topics are gaining cultural momentum right now
- Conversations the brand's audience is already in
- Timing opportunities (events, news cycles, cultural moments)
- Platforms or formats where these conversations are happening

Be specific. Avoid generic trend lists. Use web_search to find what's actually happening.

When done, use write_war_room to save your analysis to path "research.trends".`

export const WHITE_SPACE_FINDER_PROMPT = `You are a strategic planning director who finds the white space between what competitors are saying and what audiences actually want to hear.

Your job: synthesise the landscape analysis and trends research to identify gaps — territory no competitor owns, conversations no brand has credibly entered, angles that are both true to this brand and genuinely interesting.

You will receive the full war room context including landscape and trends research. Your synthesis should identify 2-3 specific white space opportunities, ranked by potential.

When done, use write_war_room to save your synthesis to path "research.whiteSpace", and a one-paragraph summary to "research.synthesis".`
```

- [ ] **Step 2: Write creative strategist prompts**

Create `src/lib/agents/prompts/creative.ts`:

```typescript
export const CREATIVE_STRATEGIST_PROMPTS = {
  A: `You are a contrarian creative strategist. You find the unexpected angle — the one that challenges category conventions or takes a position that makes people stop.

Your job: propose one creative campaign path based on the brief and research. Your path should feel brave, distinctive, and slightly uncomfortable.

Structure your response as:
- **Concept** (one punchy sentence)
- **Rationale** (2-3 sentences on why this works and why it's true to the brand)
- **Key messages** (3 bullet points)
- **Why this is unexpected** (one sentence)

Use write_war_room to save your path to "creativePaths.A" as a JSON object with keys: id, concept, rationale, keyMessages.`,

  B: `You are an emotionally-led creative strategist. You find the human truth at the heart of a brand or issue and build from there.

Your job: propose one creative campaign path based on the brief and research. Your path should connect emotionally and feel human, not corporate.

Structure your response as:
- **Concept** (one punchy sentence)
- **Rationale** (2-3 sentences on the human truth this taps into)
- **Key messages** (3 bullet points)
- **The emotional hook** (one sentence)

Use write_war_room to save your path to "creativePaths.B" as a JSON object with keys: id, concept, rationale, keyMessages.`,

  C: `You are a rationally-led creative strategist. You build on evidence, facts, and clear logic — making a case so well-argued it's impossible to ignore.

Your job: propose one creative campaign path based on the brief and research. Your path should be clear, credible, and grounded in something real.

Structure your response as:
- **Concept** (one punchy sentence)
- **Rationale** (2-3 sentences on the evidence base and logical argument)
- **Key messages** (3 bullet points)
- **The proof point** (one sentence)

Use write_war_room to save your path to "creativePaths.C" as a JSON object with keys: id, concept, rationale, keyMessages.`,
}
```

- [ ] **Step 3: Write specialist team prompts**

Create `src/lib/agents/prompts/specialist.ts`:

```typescript
import type { TeamName } from '@/lib/types'

interface TeamPrompts {
  strategist: string
  specialist: string
}

export const SPECIALIST_PROMPTS: Record<TeamName, TeamPrompts> = {
  earned_media: {
    strategist: `You are a senior PR strategist with deep earned media expertise. You think in stories, hooks, and journalist angles.

Review the campaign war room and write a comprehensive earned media plan. Cover: story angles, target media and journalists, exclusive opportunities, embargo timing, spokesperson strategy, and reactive media handling.

Be specific. Name the types of outlets and journalists. Give real story hooks.`,
    specialist: `You are a veteran PR account director who has placed thousands of stories. You are sceptical of anything that sounds like marketing dressed up as news.

Review this earned media plan critically. Push back hard on:
- Angles that no journalist would actually care about
- Any claim that sounds like a press release, not a story
- Missing opportunities the plan has overlooked
- Anything that's too safe or too generic

Be direct. Name specific weaknesses.`,
  },

  social: {
    strategist: `You are a social media strategist who thinks platform-native. You know how content actually performs, not how brands wish it performed.

Review the campaign war room and write a comprehensive social media plan. Cover: platform priorities and why, content formats per platform, posting cadence, community engagement approach, creator/influencer integration points, and how organic and paid will work together.`,
    specialist: `You are a social media manager who has run brand channels day-to-day. You know what gets skipped and what gets saved.

Review this social plan critically. Push back on:
- Content formats that don't actually work on each platform
- Cadence that's unrealistic or too sparse
- Anything that sounds like a brand talking AT people rather than participating in a conversation
- Missing platform-native opportunities`,
  },

  employee_engagement: {
    strategist: `You are an internal communications and employee engagement strategist. You know that employees are often a brand's most credible advocates — and most overlooked audience.

Review the campaign war room and write a comprehensive employee engagement plan. Cover: internal narrative and how it connects to the external campaign, employee advocacy activation, internal channels and timing, leadership communications, and how to turn employees into genuine ambassadors (not forced promoters).`,
    specialist: `You are an employee experience professional who knows what actually motivates people at work versus what feels like corporate PR.

Review this employee engagement plan critically. Challenge anything that:
- Treats employees as a distribution channel rather than an audience with their own needs
- Ignores potential cynicism or internal scepticism
- Overlooks the difference between advocacy and coercion`,
  },

  public_affairs: {
    strategist: `You are a public affairs and government relations strategist. You think in stakeholder maps, policy windows, and reputational risk.

Review the campaign war room and write a comprehensive public affairs plan. Cover: policy and regulatory landscape, key stakeholder groups (government, regulators, NGOs, trade bodies), engagement approach per stakeholder, coalition-building opportunities, and potential political risks to navigate.`,
    specialist: `You are a former government adviser who now works in communications. You have seen how political and stakeholder dynamics actually play out.

Review this public affairs plan critically. Challenge:
- Any assumption that stakeholders will simply be receptive
- Missing political or regulatory risks
- Engagement tactics that feel naïve about how government actually works
- Coalition-building ideas that need more realistic assessment`,
  },

  field_marketing: {
    strategist: `You are a field and experiential marketing strategist. You think in moments, places, and physical touchpoints that create real memory.

Review the campaign war room and write a comprehensive field marketing plan. Cover: activation formats and locations, regional strategy, event integration, sampling or demonstration opportunities, how field activity connects to the broader campaign, and measurement approach.`,
    specialist: `You are a field marketing manager who has run hundreds of activations. You know the gap between a good idea and one that actually works on the ground.

Review this field plan critically. Challenge:
- Logistics that are more complex than acknowledged
- Activations that will feel low-energy or amateur in execution
- Regional strategy that ignores local nuance
- Missing connections between field activity and digital amplification`,
  },

  influencer: {
    strategist: `You are an influencer and creator strategy lead. You think carefully about creator fit, authentic partnership, and the difference between reach and resonance.

Review the campaign war room and write a comprehensive influencer strategy. Cover: creator tier strategy (mega/macro/micro/nano), platform priorities, creator selection criteria, briefing approach, content rights, exclusivity considerations, and how creator content integrates with owned and earned media.`,
    specialist: `You are a talent manager who works with creators. You know what makes creators say yes — and what makes them post something that feels forced.

Review this influencer strategy critically. Push back on:
- Creator criteria that are too vague or too focused on follower count
- Briefing approaches that will produce inauthentic content
- Budget assumptions that don't reflect real creator market rates
- Missing considerations around disclosure and authenticity`,
  },

  paid_media: {
    strategist: `You are a paid media strategist who thinks about channel mix, audience targeting, and how paid amplifies earned and owned.

Review the campaign war room and write a comprehensive paid media plan. Cover: channel mix and rationale, audience targeting approach per channel, creative format recommendations, budget allocation principles, how paid supports the rest of the campaign, and measurement framework.`,
    specialist: `You are a performance media buyer who has managed large budgets. You are allergic to channel recommendations that aren't backed by audience data.

Review this paid media plan critically. Challenge:
- Channel choices that aren't matched to where the target audience actually spends time
- Budget allocation that doesn't reflect real CPM/CPC realities
- Creative format suggestions that won't perform in each environment
- Missing retargeting or sequencing strategy`,
  },

  content: {
    strategist: `You are a content strategist who thinks about owned media, SEO, and building lasting brand authority through editorial.

Review the campaign war room and write a comprehensive content strategy. Cover: content pillars aligned to the campaign, formats (long-form, video, interactive, etc.), publishing cadence, SEO considerations, distribution beyond owned channels, and how content supports the full campaign lifecycle.`,
    specialist: `You are a managing editor with experience running brand newsrooms. You know the difference between content that builds authority and content that just fills a calendar.

Review this content strategy critically. Challenge:
- Formats that don't match the audience's actual content consumption habits
- Topics that won't rank or won't resonate
- Production ambitions that are unrealistic for the timeline
- Missing repurposing or atomisation strategy`,
  },

  investor_relations: {
    strategist: `You are an investor relations and financial communications strategist. You understand how campaigns need to align with the financial narrative and what analysts and investors are watching.

Review the campaign war room and write a comprehensive investor relations communications plan. Cover: financial narrative alignment with the campaign, analyst and investor messaging, earnings cycle considerations, regulatory disclosure requirements, how the campaign supports the investment thesis, and risk communications.`,
    specialist: `You are a former sell-side analyst who now advises on IR communications. You know exactly what makes investors sceptical and what builds confidence.

Review this IR communications plan critically. Challenge:
- Any campaign claims that could create forward-looking statement risks
- Messaging that doesn't connect to financial metrics investors care about
- Missing consideration of how short sellers or critics might frame this campaign
- Gaps in the disclosure and regulatory compliance approach`,
  },
}
```

- [ ] **Step 4: Write orchestrator and facilitator prompts**

Create `src/lib/agents/prompts/system.ts`:

```typescript
import { ALL_TEAMS } from '@/lib/config'

export const ORCHESTRATOR_PROMPT = `You are the campaign orchestrator for an AI PR and marketing agency. Your job is to read a campaign brief and select the most relevant specialist teams to work on it.

Available teams: ${ALL_TEAMS.join(', ')}

Rules for team selection:
- Always include earned_media, social, and content — these are core to almost every campaign
- Include investor_relations only if the brief involves a publicly listed company, fundraise, or financial event
- Include public_affairs only if the brief involves regulatory, policy, or government dimensions
- Include employee_engagement for employer brand, internal culture, or large workforce communications
- Include field_marketing for product launches, FMCG, events, or physical retail contexts
- Include influencer for consumer brands, lifestyle, or audience-first campaigns
- Include paid_media for campaigns with any media budget dimension

Use the activate_teams tool with the array of team names you've selected. Then explain your selection rationale briefly.`

export const FACILITATOR_PROMPT = `You are the campaign facilitator. You have read all the specialist team plans and your job is to create the most productive cross-team challenge pairs.

A good challenge pair is two teams whose work will genuinely benefit from being challenged by the other — where there's creative tension, overlap, or where one team's insight could sharpen the other's thinking.

Good pairs:
- Earned media + social (story angles vs platform-native content)
- Influencer + paid media (organic creator content vs paid amplification)
- Content + earned media (owned publishing vs media placement)
- Employee engagement + public affairs (internal vs external stakeholder narrative)

Select 2-3 pairs maximum. Use the route_challenge tool with your selected pairs, where each pair has a "challenger" (the team doing the challenging) and "challenged" (the team receiving the challenge).

After routing, write a brief (1-2 sentence) challenge prompt for each challenged team explaining what to focus on.`
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/prompts/
git commit -m "feat: add all agent system prompts"
```

---

## Task 7: Research Phase Runner

**Files:**
- Create: `src/lib/agents/research.ts`

- [ ] **Step 1: Implement research.ts**

Create `src/lib/agents/research.ts`:

```typescript
import { runAgent } from './runner'
import { handleToolCall, WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'
import {
  LANDSCAPE_ANALYST_PROMPT,
  TREND_SPOTTER_PROMPT,
  WHITE_SPACE_FINDER_PROMPT,
} from './prompts/research'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runResearchPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const briefText = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}
Background: ${brief.background}
${brief.urls.length > 0 ? `Reference URLs: ${brief.urls.join(', ')}` : ''}`

  const makeToolHandler = (id: string) => (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, id)

  // Landscape and Trend run in parallel
  await Promise.allSettled([
    runAgent({
      campaignId,
      phase: 'research',
      team: 'research',
      agent: 'landscape_analyst',
      model: MODEL.research,
      systemPrompt: LANDSCAPE_ANALYST_PROMPT,
      messages: [{ role: 'user', content: briefText }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId),
    }),
    runAgent({
      campaignId,
      phase: 'research',
      team: 'research',
      agent: 'trend_spotter',
      model: MODEL.research,
      systemPrompt: TREND_SPOTTER_PROMPT,
      messages: [{ role: 'user', content: briefText }],
      tools: [WEB_SEARCH_TOOL, WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId),
    }),
  ])

  // White Space synthesises after both complete
  const updatedCampaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const warRoom = JSON.parse(updatedCampaign.warRoom) as WarRoom

  await runAgent({
    campaignId,
    phase: 'research',
    team: 'research',
    agent: 'white_space_finder',
    model: MODEL.research,
    systemPrompt: WHITE_SPACE_FINDER_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${briefText}\n\nWar room research so far:\n${JSON.stringify(warRoom.research ?? {}, null, 2)}\n\nIdentify the white space and write your synthesis.`,
      },
    ],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: makeToolHandler(campaignId),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/research.ts
git commit -m "feat: add research phase runner"
```

---

## Task 8: Creative Phase Runner

**Files:**
- Create: `src/lib/agents/creative.ts`

- [ ] **Step 1: Implement creative.ts**

Create `src/lib/agents/creative.ts`:

```typescript
import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL } from './tools'
import { CREATIVE_STRATEGIST_PROMPTS } from './prompts/creative'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { WarRoom } from '@/lib/types'

export async function runCreativePhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}

Research findings:
${JSON.stringify(warRoom.research ?? {}, null, 2)}

Propose your creative path now.`

  const makeToolHandler = (id: string) => (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, id)

  await Promise.allSettled([
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_a',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.A,
      messages: [{ role: 'user', content: context }],
      tools: [WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId),
    }),
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_b',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.B,
      messages: [{ role: 'user', content: context }],
      tools: [WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId),
    }),
    runAgent({
      campaignId,
      phase: 'creative',
      team: 'creative',
      agent: 'strategist_c',
      model: MODEL.creative,
      systemPrompt: CREATIVE_STRATEGIST_PROMPTS.C,
      messages: [{ role: 'user', content: context }],
      tools: [WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler(campaignId),
    }),
  ])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/creative.ts
git commit -m "feat: add creative phase runner (3 parallel strategists)"
```

---

## Task 9: Orchestrator Agent

**Files:**
- Create: `src/lib/agents/orchestrator.ts`

- [ ] **Step 1: Implement orchestrator.ts**

Create `src/lib/agents/orchestrator.ts`:

```typescript
import { runAgent } from './runner'
import { handleToolCall, ACTIVATE_TEAMS_TOOL } from './tools'
import { ORCHESTRATOR_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

export async function runOrchestrator(campaignId: string): Promise<TeamName[]> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}
Background: ${brief.background}

Research synthesis: ${warRoom.research?.synthesis ?? 'Not yet available'}
Chosen creative path: ${warRoom.chosenPath ? JSON.stringify(warRoom.chosenPath) : 'Not yet selected'}

Select the appropriate specialist teams for this campaign.`

  await runAgent({
    campaignId,
    phase: 'specialist',
    team: 'system',
    agent: 'orchestrator',
    model: MODEL.orchestrator,
    systemPrompt: ORCHESTRATOR_PROMPT,
    messages: [{ role: 'user', content: context }],
    tools: [ACTIVATE_TEAMS_TOOL],
    onToolCall: (name, input) => handleToolCall(name, input, campaignId),
  })

  const updated = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  return JSON.parse(updated.activeTeams) as TeamName[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/orchestrator.ts
git commit -m "feat: add orchestrator agent for team selection"
```

---

## Task 10: Specialist Team Runner

**Files:**
- Create: `src/lib/agents/specialist.ts`
- Create: `src/lib/agents/specialist.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/agents/specialist.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
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
    const calls = (runAgent as ReturnType<typeof vi.fn>).mock.calls
    const agents = calls.map((c: unknown[]) => (c[0] as { agent: string }).agent)
    expect(agents).toEqual(['strategist', 'specialist', 'strategist_close'])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- specialist.test
```

Expected: FAIL — `Cannot find module './specialist'`

- [ ] **Step 3: Implement specialist.ts**

Create `src/lib/agents/specialist.ts`:

```typescript
import type { MessageParam } from '@anthropic-ai/sdk/resources'
import { runAgent } from './runner'
import { handleToolCall, WRITE_WAR_ROOM_TOOL } from './tools'
import { SPECIALIST_PROMPTS } from './prompts/specialist'
import { MODEL, TEAM_CONVERSATION_TURNS } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

export async function runSpecialistTeam(campaignId: string, teamName: TeamName): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const brief = JSON.parse(campaign.brief)
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom

  const context = `Campaign Brief:
Goal: ${brief.goal}
Brand: ${brief.brand}
Audience: ${brief.audience}

Chosen creative path:
${JSON.stringify(warRoom.chosenPath, null, 2)}

Research:
${JSON.stringify(warRoom.research, null, 2)}

Write your team's campaign plan.`

  const prompts = SPECIALIST_PROMPTS[teamName]
  const makeToolHandler = (name: string, input: Record<string, unknown>) =>
    handleToolCall(name, input, campaignId)

  const messages: MessageParam[] = []

  // Turn 1: Strategist opens
  messages.push({ role: 'user', content: context })
  const strategistOutput = await runAgent({
    campaignId,
    phase: 'specialist',
    team: teamName,
    agent: 'strategist',
    model: MODEL.specialist,
    systemPrompt: prompts.strategist,
    messages: [...messages],
    tools: [WRITE_WAR_ROOM_TOOL],
    onToolCall: makeToolHandler,
  })
  messages.push({ role: 'assistant', content: strategistOutput })

  // Turn 2: Specialist challenges
  messages.push({ role: 'user', content: 'Review this plan critically. What specific elements are weak or too generic? Push back hard with concrete examples.' })
  const specialistOutput = await runAgent({
    campaignId,
    phase: 'specialist',
    team: teamName,
    agent: 'specialist',
    model: MODEL.specialist,
    systemPrompt: prompts.specialist,
    messages: [...messages],
  })
  messages.push({ role: 'assistant', content: specialistOutput })

  // Turn 3: Strategist closes (if turns >= 3)
  if (TEAM_CONVERSATION_TURNS >= 3) {
    messages.push({
      role: 'user',
      content: 'Incorporate this feedback. Write the final, sharpened team plan. Use write_war_room to save the draft to "teamOutputs.' + teamName + '.draft".',
    })
    await runAgent({
      campaignId,
      phase: 'specialist',
      team: teamName,
      agent: 'strategist_close',
      model: MODEL.specialist,
      systemPrompt: prompts.strategist,
      messages: [...messages],
      tools: [WRITE_WAR_ROOM_TOOL],
      onToolCall: makeToolHandler,
    })
  }
}

export async function runAllSpecialistTeams(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  await Promise.allSettled(activeTeams.map((team) => runSpecialistTeam(campaignId, team)))
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- specialist.test
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/specialist.ts src/lib/agents/specialist.test.ts
git commit -m "feat: add specialist team runner with within-team conversation"
```

---

## Task 11: Facilitator + Challenge Round

**Files:**
- Create: `src/lib/agents/facilitator.ts`

- [ ] **Step 1: Implement facilitator.ts**

Create `src/lib/agents/facilitator.ts`:

```typescript
import { runAgent } from './runner'
import { handleToolCall, ROUTE_CHALLENGE_TOOL, WRITE_WAR_ROOM_TOOL } from './tools'
import { FACILITATOR_PROMPT } from './prompts/system'
import { MODEL } from '@/lib/config'
import { db } from '@/lib/db'
import type { TeamName, WarRoom } from '@/lib/types'

interface ChallengePair {
  challenger: TeamName
  challenged: TeamName
}

export async function runFacilitatorPhase(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })
  const warRoom = JSON.parse(campaign.warRoom) as WarRoom
  const activeTeams = JSON.parse(campaign.activeTeams) as TeamName[]

  const teamDrafts = activeTeams.map((team) => {
    const output = warRoom.teamOutputs?.[team]
    return `**${team.replace(/_/g, ' ').toUpperCase()}**:\n${output?.draft ?? 'No draft yet'}`
  }).join('\n\n---\n\n')

  // Facilitator selects pairs
  let challengePairs: ChallengePair[] = []

  await runAgent({
    campaignId,
    phase: 'challenge',
    team: 'system',
    agent: 'facilitator',
    model: MODEL.facilitator,
    systemPrompt: FACILITATOR_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are all the specialist team drafts:\n\n${teamDrafts}\n\nSelect 2-3 challenge pairs and route them.`,
      },
    ],
    tools: [ROUTE_CHALLENGE_TOOL],
    onToolCall: async (name, input) => {
      if (name === 'route_challenge') {
        challengePairs = input.pairs as ChallengePair[]
        return `Routing ${challengePairs.length} challenge pairs`
      }
      return handleToolCall(name, input, campaignId)
    },
  })

  // Run each challenge pair
  await Promise.allSettled(
    challengePairs.map(async ({ challenger, challenged }) => {
      const challengerDraft = warRoom.teamOutputs?.[challenger]?.draft ?? ''
      const challengedDraft = warRoom.teamOutputs?.[challenged]?.draft ?? ''

      const challengeInput = `The ${challenger.replace(/_/g, ' ')} team says:\n${challengerDraft}\n\nChallenge the ${challenged.replace(/_/g, ' ')} team's plan in light of this. What should they change or strengthen?`

      await db.campaign.findUniqueOrThrow({ where: { id: campaignId } }).then(async (c) => {
        const wr = JSON.parse(c.warRoom) as WarRoom
        if (!wr.teamOutputs) wr.teamOutputs = {}
        if (!wr.teamOutputs[challenged]) wr.teamOutputs[challenged] = { draft: '', challengeInput: '', challengeResponse: '' }
        wr.teamOutputs[challenged]!.challengeInput = challengeInput
        await db.campaign.update({ where: { id: campaignId }, data: { warRoom: JSON.stringify(wr) } })
      })

      await runAgent({
        campaignId,
        phase: 'challenge',
        team: challenged,
        agent: 'challenge_response',
        model: MODEL.specialist,
        systemPrompt: `You are the ${challenged.replace(/_/g, ' ')} team. You've just received a challenge from another team. Respond specifically and sharpen your plan.`,
        messages: [{ role: 'user', content: challengeInput + '\n\nRevise and sharpen your plan in response. Use write_war_room to save your response to "teamOutputs.' + challenged + '.challengeResponse".' }],
        tools: [WRITE_WAR_ROOM_TOOL],
        onToolCall: (name, input) => handleToolCall(name, input, campaignId),
      })
    })
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/facilitator.ts
git commit -m "feat: add facilitator and cross-team challenge round"
```

---

## Task 12: Campaign Background Runner

**Files:**
- Create: `src/lib/runner/campaign-runner.ts`
- Create: `src/lib/runner/campaign-runner.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/runner/campaign-runner.test.ts`:

```typescript
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

vi.mock('@/lib/agents/research', () => ({ runResearchPhase: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/agents/creative', () => ({ runCreativePhase: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/agents/orchestrator', () => ({ runOrchestrator: vi.fn().mockResolvedValue(['social']) }))
vi.mock('@/lib/agents/specialist', () => ({ runAllSpecialistTeams: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/agents/facilitator', () => ({ runFacilitatorPhase: vi.fn().mockResolvedValue(undefined) }))

describe('runCampaign', () => {
  beforeEach(() => vi.clearAllMocks())

  it('advances status through researching → creative → awaiting_path', async () => {
    const { db } = await import('@/lib/db')
    await runCampaign('camp-1')
    const updateCalls = (db.campaign.update as ReturnType<typeof vi.fn>).mock.calls
    const statuses = updateCalls.map((c: unknown[]) => (c[0] as { data: { status: string } }).data.status)
    expect(statuses).toContain('researching')
    expect(statuses).toContain('creative')
    expect(statuses).toContain('awaiting_path')
  })

  it('calls research, creative, and orchestrator in order', async () => {
    const { runResearchPhase } = await import('@/lib/agents/research')
    const { runCreativePhase } = await import('@/lib/agents/creative')
    const { runOrchestrator } = await import('@/lib/agents/orchestrator')
    await runCampaign('camp-1')
    expect(runResearchPhase).toHaveBeenCalledWith('camp-1')
    expect(runCreativePhase).toHaveBeenCalledWith('camp-1')
    expect(runOrchestrator).toHaveBeenCalledWith('camp-1')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- campaign-runner.test
```

Expected: FAIL — `Cannot find module './campaign-runner'`

- [ ] **Step 3: Implement campaign-runner.ts**

Create `src/lib/runner/campaign-runner.ts`:

```typescript
import { db } from '@/lib/db'
import { campaignEvents } from '@/lib/events'
import { runResearchPhase } from '@/lib/agents/research'
import { runCreativePhase } from '@/lib/agents/creative'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { runAllSpecialistTeams } from '@/lib/agents/specialist'
import { runFacilitatorPhase } from '@/lib/agents/facilitator'
import type { CampaignStatus } from '@/lib/types'

async function setStatus(campaignId: string, status: CampaignStatus): Promise<void> {
  await db.campaign.update({ where: { id: campaignId }, data: { status } })
  campaignEvents.emit(campaignId, { type: 'phase_change', status })
}

export async function runCampaign(campaignId: string): Promise<void> {
  try {
    // Phase 1: Research
    await setStatus(campaignId, 'researching')
    await runResearchPhase(campaignId)

    // Phase 2: Creative
    await setStatus(campaignId, 'creative')
    await runCreativePhase(campaignId)

    // Pause for client to choose a creative path
    await setStatus(campaignId, 'awaiting_path')
  } catch (error) {
    console.error(`Campaign ${campaignId} failed in pre-approval phase:`, error)
    throw error
  }
}

export async function runCampaignPostApproval(campaignId: string): Promise<void> {
  try {
    // Phase 3: Orchestrator selects teams
    await runOrchestrator(campaignId)

    // Phase 4: Specialist teams brainstorm
    await setStatus(campaignId, 'specialist')
    await runAllSpecialistTeams(campaignId)

    // Phase 5: Cross-team challenge round
    await setStatus(campaignId, 'challenge')
    await runFacilitatorPhase(campaignId)

    // Pause for client review
    await setStatus(campaignId, 'awaiting_review')
  } catch (error) {
    console.error(`Campaign ${campaignId} failed in post-approval phase:`, error)
    throw error
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- campaign-runner.test
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runner/campaign-runner.ts src/lib/runner/campaign-runner.test.ts
git commit -m "feat: add campaign background runner with state machine"
```

---

## Task 13: API Routes

**Files:**
- Create: `src/app/api/campaigns/route.ts`
- Create: `src/app/api/campaigns/[id]/route.ts`
- Create: `src/app/api/campaigns/[id]/stream/route.ts`
- Create: `src/app/api/campaigns/[id]/approve-path/route.ts`
- Create: `src/app/api/campaigns/[id]/teams/[team]/retry/route.ts`

- [ ] **Step 1: POST /api/campaigns**

Create `src/app/api/campaigns/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaign } from '@/lib/runner/campaign-runner'
import type { Brief } from '@/lib/types'

export async function POST(req: Request) {
  const body = (await req.json()) as Brief

  if (!body.goal || !body.brand || !body.audience) {
    return NextResponse.json({ error: 'goal, brand, and audience are required' }, { status: 400 })
  }

  const campaign = await db.campaign.create({
    data: {
      brief: JSON.stringify(body),
      status: 'briefing',
    },
  })

  // Fire and forget — runs in background
  setImmediate(() => {
    runCampaign(campaign.id).catch((err) =>
      console.error(`Campaign ${campaign.id} runner failed:`, err)
    )
  })

  return NextResponse.json({ id: campaign.id, status: campaign.status }, { status: 201 })
}

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, brief: true, createdAt: true },
  })
  return NextResponse.json(
    campaigns.map((c) => ({ ...c, brief: JSON.parse(c.brief) }))
  )
}
```

- [ ] **Step 2: GET /api/campaigns/[id]**

Create `src/app/api/campaigns/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const campaign = await db.campaign.findUniqueOrThrow({
      where: { id },
      include: { agentRuns: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({
      ...campaign,
      brief: JSON.parse(campaign.brief),
      warRoom: JSON.parse(campaign.warRoom),
      activeTeams: JSON.parse(campaign.activeTeams),
    })
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
}
```

- [ ] **Step 3: GET /api/campaigns/[id]/stream (SSE)**

Create `src/app/api/campaigns/[id]/stream/route.ts`:

```typescript
import { campaignEvents } from '@/lib/events'
import type { CampaignEvent } from '@/lib/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CampaignEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Send a heartbeat immediately so client knows connection is alive
      controller.enqueue(encoder.encode(`: connected\n\n`))

      campaignEvents.on(id, send)

      req.signal.addEventListener('abort', () => {
        campaignEvents.off(id, send)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: POST /api/campaigns/[id]/approve-path**

Create `src/app/api/campaigns/[id]/approve-path/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runCampaignPostApproval } from '@/lib/runner/campaign-runner'
import type { WarRoom, CreativePath } from '@/lib/types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { pathId } = (await req.json()) as { pathId: 'A' | 'B' | 'C' }

  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status !== 'awaiting_path') {
    return NextResponse.json({ error: 'Campaign is not awaiting path selection' }, { status: 409 })
  }

  const warRoom = JSON.parse(campaign.warRoom) as WarRoom
  const chosen = warRoom.creativePaths?.find((p) => p.id === pathId)
  if (!chosen) return NextResponse.json({ error: 'Path not found' }, { status: 404 })

  const updatedWarRoom: WarRoom = { ...warRoom, chosenPath: chosen }
  await db.campaign.update({
    where: { id },
    data: { warRoom: JSON.stringify(updatedWarRoom), status: 'specialist' },
  })

  setImmediate(() => {
    runCampaignPostApproval(id).catch((err) =>
      console.error(`Post-approval runner failed for ${id}:`, err)
    )
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: POST /api/campaigns/[id]/teams/[team]/retry**

Create `src/app/api/campaigns/[id]/teams/[team]/retry/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runSpecialistTeam } from '@/lib/agents/specialist'
import type { TeamName } from '@/lib/types'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; team: string }> }
) {
  const { id, team } = await params
  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  setImmediate(() => {
    runSpecialistTeam(id, team as TeamName).catch(console.error)
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all API routes (campaigns, stream, approve-path, retry)"
```

---

## Task 14: Smoke Test the Backend

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Create a test campaign via curl**

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Launch our new sustainable packaging initiative",
    "brand": "GreenBox — a B2B packaging company",
    "audience": "Procurement directors at mid-market FMCG brands",
    "background": "We have switched to 100% recycled materials and want to own the sustainability conversation in our category",
    "urls": []
  }'
```

Expected: `{"id":"<cuid>","status":"briefing"}`

- [ ] **Step 4: Open SSE stream in a second terminal**

```bash
# Replace <id> with the campaign ID from step 3
curl -N http://localhost:3000/api/campaigns/<id>/stream
```

Expected: SSE events flowing as agents run (`agent_start`, `agent_token`, `agent_complete`, `phase_change`)

- [ ] **Step 5: Check campaign status**

```bash
curl http://localhost:3000/api/campaigns/<id>
```

Wait until `status` is `awaiting_path`, then check `warRoom.creativePaths` has 3 paths.

- [ ] **Step 6: Approve a creative path**

```bash
curl -X POST http://localhost:3000/api/campaigns/<id>/approve-path \
  -H "Content-Type: application/json" \
  -d '{"pathId": "A"}'
```

Expected: `{"ok":true}` and SSE stream resumes with specialist team events.

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: backend complete — all phases running end to end"
```

---

## Run All Tests

```bash
npm test
```

Expected output:
```
✓ src/lib/agents/runner.test.ts (3)
✓ src/lib/agents/tools.test.ts (3)
✓ src/lib/agents/specialist.test.ts (2)
✓ src/lib/runner/campaign-runner.test.ts (2)

Test Files  4 passed (4)
Tests      10 passed (10)
```
