@AGENTS.md

# Creative Agency — Codebase Guide

## What this is

An AI-powered campaign planning app. Users submit a campaign brief; a multi-agent pipeline runs research, generates creative concepts, lets the user pick a path, then dispatches specialist teams (earned media, social, content, etc.) who debate internally and cross-challenge each other. A measurement agent closes out the run. Everything streams live to the UI via SSE.

## Tech stack

- Next.js 16 App Router (see AGENTS.md — breaking changes from training data)
- Prisma 7 + SQLite, adapter-based PrismaClient (`src/lib/db.ts`)
- Anthropic Claude SDK — `claude-sonnet-4-6` for research/creative/orchestrator/facilitator, `claude-haiku-4-5-20251001` for specialist agents (see `src/lib/config.ts`)
- Tavily for web search (used by research agent)
- SSE for real-time streaming: `GET /api/campaigns/[id]/stream`
- Background jobs via `setImmediate` (no queue, single-process)

## Pipeline stages (CampaignStatus)

```
briefing → researching → creative → awaiting_path
                                         ↓ (user picks creative path)
                              specialist → challenge → measuring → awaiting_review → complete
```

`runCampaign()` runs everything up to `awaiting_path`. `runCampaignPostApproval()` runs the rest after the user selects a path.

## War room

Single `warRoom` JSON column on the `Campaign` row. All agents read/write here. Shape defined in `src/lib/types.ts → WarRoom`. Key fields:
- `research` — landscape, trends, whiteSpace, synthesis
- `creativePaths` — array of 3 paths (A/B/C)
- `chosenPath` — user-selected path
- `teamOutputs[teamName].draft` — team's final plan (from strategist_close)
- `teamOutputs[teamName].challengeResponse` — revised plan after cross-team challenge
- `measurement` — measurement framework from measurement agent

## Specialist team 3-turn debate

Each team runs in `src/lib/agents/specialist.ts`:
1. **strategist** (Turn 1) — writes initial plan, calls `write_war_room` tool
2. **specialist** (Turn 2) — specialist reviews/critiques the plan
3. **strategist_close** (Turn 3) — strategist revises incorporating feedback

**Critical:** Turn 3 has NO tools. It must produce pure text output. `writeTeamDraft()` saves `closingOutput || strategistOutput` (falls back to Turn 1 if Turn 3 is empty). Do not add `write_war_room` back to Turn 3 — it previously caused the agent to write a short intro sentence and the tool to be ignored.

## Agent runner (`src/lib/agents/runner.ts`)

`runAgent()` handles the full tool-use loop. Returns the final text response. Emits SSE events (`agent_start`, `agent_token`, `agent_complete`, `agent_failed`). Anthropic SDK timeout is 15 minutes — do not reduce this; research agents with multiple web searches exceed 10 minutes.

## Key files

| File | Purpose |
|------|---------|
| `src/lib/runner/campaign-runner.ts` | Top-level pipeline orchestration |
| `src/lib/agents/runner.ts` | Core agent executor (tool-use loop, SSE emit) |
| `src/lib/agents/specialist.ts` | 3-turn intra-team debate |
| `src/lib/agents/facilitator.ts` | Cross-team challenge round |
| `src/lib/agents/measurement.ts` | KPI/targets measurement agent |
| `src/lib/agents/prompts/system.ts` | All system prompts (including MEASUREMENT_PROMPT) |
| `src/lib/types.ts` | Shared types: WarRoom, CampaignStatus, TeamName, etc. |
| `src/lib/config.ts` | Model assignments, team list, env config |
| `src/lib/events.ts` | In-process SSE event emitter (campaignEvents) |
| `src/app/api/campaigns/[id]/stream/route.ts` | SSE endpoint |
| `src/hooks/useSSE.ts` | Client SSE hook |
| `src/app/campaigns/[id]/teams/page.tsx` | Live team debate page (all 3 turns visible) |
| `src/app/campaigns/[id]/output/page.tsx` | Final output page with regenerate + measurement |

## Output page behaviour

- Shows `draft` as the primary team plan
- Shows `challengeResponse` (if present) below as "Revised after cross-team challenge"
- Measurement framework shown at top in a dark-bordered card
- Regenerate button polls every 5 seconds until `draft` appears

## Teams page behaviour

On load, populates all three agent turn slots (strategist, specialist, strategist_close) from `campaign.agentRuns` — so past debates are visible, not just live runs. Live updates arrive via SSE and update state in-place.

## AgentRun records

Every `runAgent()` call writes a `AgentRun` row: `campaignId`, `phase`, `team`, `agent`, `status`, `output`. The Campaign API includes these via `include: { agentRuns }`.

## Retry flow

`POST /api/campaigns/[id]/teams/[team]/retry` — clears `draft` and `challengeResponse` for that team, then re-runs the specialist pipeline for it. The output page polls for the new draft.

## Environment variables

```
DATABASE_URL          # SQLite path, e.g. file:./dev.db
ANTHROPIC_API_KEY     # Required
TAVILY_API_KEY        # Required for research agent
TEAM_CONVERSATION_TURNS  # Optional, defaults to 3
```

## Running locally

```bash
npm install
npx prisma migrate dev
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run build      # Type-check + build
```
