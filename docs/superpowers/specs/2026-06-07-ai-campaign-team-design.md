# AI PR + Marketing Campaign Team — Design Spec

**Date:** 2026-06-07
**Status:** Approved

---

## Overview

A web application that runs a full PR and marketing campaign team using multi-agent AI. The user (client) submits a brief, a research team analyses the landscape and finds white space, a creative strategy team proposes three campaign paths, the client picks one, and nine specialist teams brainstorm their domains — debating internally and being challenged across teams by a facilitator agent. The client reviews all team plans and exports a final campaign document.

---

## Tech Stack

- **Framework:** Next.js (full-stack — frontend + API routes in one repo)
- **Language:** TypeScript
- **AI:** Anthropic Claude API via the official TypeScript SDK
- **Database:** SQLite via Prisma
- **Real-time:** Server-Sent Events (SSE) — UI streams live agent output from `/api/campaigns/[id]/stream`
- **Background jobs:** Node `setImmediate` chaining (no Redis dependency for hobby-project simplicity)

---

## Communication Model (Hybrid)

**Within a team:** 2–3 agents hold a short real conversation — a strategist and a specialist debate, then close. Capped at **3 turns** (configurable). This is where organic creative sparks happen.

**Between teams:** The orchestrator and facilitator mediate. They read one team's output, extract the sharpest point, and pass it as a challenge prompt to another team. One prompt in, one response out — no open-ended cross-team threads. Cost-predictable and auditable.

---

## Data Model

### `campaigns` table

| Column | Type | Notes |
|---|---|---|
| id | text | cuid, PK |
| status | text | state machine (see below) |
| brief | json | goal, brand context, audience, background text, source URLs |
| war_room | json | grows through the campaign lifecycle |
| active_teams | json | array of team names selected by the orchestrator |
| created_at | datetime | |
| updated_at | datetime | |

**Status state machine:**
```
briefing → researching → creative → awaiting_path → specialist → challenge → awaiting_review → complete
```
`awaiting_*` states pause the campaign and wait for client action in the UI.

### `agent_runs` table

| Column | Type | Notes |
|---|---|---|
| id | text | cuid, PK |
| campaign_id | text | FK → campaigns |
| phase | text | research \| creative \| specialist \| challenge |
| team | text | e.g. "earned_media", "research" |
| agent | text | e.g. "landscape_analyst" |
| status | text | pending \| running \| complete \| failed |
| output | text | raw agent response |
| tokens_used | integer | for cost tracking |
| created_at | datetime | |

### War Room (JSON column on `campaigns`)

The war room is a single JSON object passed whole to every agent as context. No joins required.

```json
{
  "research": {
    "landscape": "...",
    "trends": "...",
    "white_space": "...",
    "synthesis": "..."
  },
  "creative_paths": [
    { "id": "A", "concept": "...", "rationale": "...", "key_messages": [] },
    { "id": "B", "concept": "...", "rationale": "...", "key_messages": [] },
    { "id": "C", "concept": "...", "rationale": "...", "key_messages": [] }
  ],
  "chosen_path": { "id": "A", "concept": "...", "rationale": "...", "key_messages": [] },
  "team_outputs": {
    "earned_media": {
      "draft": "...",
      "challenge_input": "...",
      "challenge_response": "..."
    }
  }
}
```

---

## Agent Tools

Tools are defined as Claude API tool definitions and passed to the relevant agents:

- **`web_search(query)`** — calls a search API (Tavily or Brave Search) and returns results. Used by research agents to fetch live landscape and trend data.
- **`write_war_room(path, content)`** — writes a value to a specific path in the campaign's `war_room` JSON column (e.g. `path: "research.landscape"`). This is how agents persist their output to the shared context.
- **`activate_teams(teams[])`** — orchestrator-only. Sets `active_teams` on the campaign row.
- **`set_status(status)`** — orchestrator-only. Advances the campaign state machine.
- **`route_challenge(pairs[])`** — facilitator-only. Defines which team pairs challenge each other in the cross-team round.

---

## Agent Roster

Every agent is composed of: **system prompt** (role + expertise) + **war room context** + **task prompt** (what to do right now) + **optional tools**.

| Agent | Team | Model | Tools | Role |
|---|---|---|---|---|
| Orchestrator | System | Sonnet 4.6 | activate_teams, set_status, route_challenge | Reads brief, selects active teams, manages phase transitions, pairs teams for challenge round |
| Landscape Analyst | Research | Sonnet 4.6 | web_search, write_war_room | Competitor coverage, market position, owned narrative |
| Trend Spotter | Research | Sonnet 4.6 | web_search, write_war_room | Cultural moments, emerging conversations, timing windows |
| White Space Finder | Research | Sonnet 4.6 | write_war_room | Synthesises Analyst + Spotter; identifies gaps the brand can own |
| Creative Strategist A/B/C | Creative | Sonnet 4.6 | write_war_room | Same base prompt, each instructed to produce a distinct approach (contrarian / emotional / rational) |
| Earned Media | Specialist | Haiku 4.5 | write_war_room | Stories, journalist angles, embargo timing |
| Social | Specialist | Haiku 4.5 | write_war_room | Platform-native formats, cadence, creator partnerships |
| Employee Engagement | Specialist | Haiku 4.5 | write_war_room | Internal amplification, advocacy, culture alignment |
| Public Affairs | Specialist | Haiku 4.5 | write_war_room | Policy landscape, stakeholder mapping, regulatory framing |
| Field Marketing | Specialist | Haiku 4.5 | write_war_room | On-the-ground activations, regional nuance, experiential |
| Influencer | Specialist | Haiku 4.5 | write_war_room | Creator fit, briefing approach, authenticity vs reach |
| Paid Media | Specialist | Haiku 4.5 | write_war_room | Channel mix, targeting, creative formats, budget allocation |
| Content | Specialist | Haiku 4.5 | write_war_room | Long-form, SEO, editorial calendar, owned channels |
| Investor Relations | Specialist | Haiku 4.5 | write_war_room | Financial narrative, analyst comms, earnings alignment |
| Facilitator | System | Sonnet 4.6 | route_challenge, write_war_room | Reads all team drafts, selects 2–3 meaningful cross-team pairs, writes challenge prompts |

**Not every team fires for every campaign.** The orchestrator reads the brief and activates only relevant teams. This is stored in `active_teams` and drives which panels the UI renders.

---

## Frontend Pages

### `/` — Campaign List
All past and active campaigns. Status chip, created date. New campaign button.

### `/campaigns/new` — Brief Intake
Form: campaign goal, brand context, target audience, background (paste text or URLs). Submit creates the campaign row and triggers the research phase in a background job.

### `/campaigns/[id]/research` — Research Room
Three streaming agent panels (Landscape Analyst, Trend Spotter, White Space Finder). Each shows live output via SSE. War room synthesis shown when all three complete. Continue button unlocks when synthesis is written.

### `/campaigns/[id]/creative` — Creative Path Selection *(client gate)*
Three cards — one per creative path. Each shows concept, rationale, and key messages. Client selects one. Selection writes `chosen_path` to the war room and triggers the specialist phase.

### `/campaigns/[id]/teams` — Team Channels
Grid of active team panels. Each panel streams the internal agent conversation live (within-team debate, capped at 3 turns). Final team output shown when the conversation closes.

After all teams complete, the facilitator runs the cross-team challenge round on the same page. Team panels update in place: draft → challenge prompt → sharpened response.

### `/campaigns/[id]/output` — Campaign Output *(client gate)*
Full campaign document: per-team final plans, key messages, recommended channel mix, timing suggestions. Export to markdown. "Request changes" re-runs just that one team without restarting the campaign.

---

## Streaming Architecture

The UI connects to `/api/campaigns/[id]/stream` (SSE endpoint). This endpoint watches `agent_runs` rows for the campaign and pushes events as they change:

```
event: agent_token      // individual token as agent streams
event: agent_complete   // agent run finished, includes full output
event: phase_change     // campaign status changed
event: war_room_update  // war room JSON updated
```

The background job runner updates the database; the SSE endpoint reads from it. The UI never calls agents directly.

---

## Background Job Pattern

On brief submission:
1. API route creates campaign row with `status: briefing`, returns campaign ID immediately
2. Background runner picks up via `setImmediate` chain
3. Runner executes the phase sequence, updating `agent_runs` and `war_room` at each step
4. Campaign pauses at `awaiting_*` states until the client takes action via a separate API route

This avoids all platform timeout issues without requiring Redis or BullMQ.

---

## Cost Controls

- **Model tiering:** Sonnet 4.6 for reasoning-heavy roles (orchestrator, research, facilitator); Haiku 4.5 for specialist teams
- **Turn cap:** Within-team conversations capped at 3 turns (config value: `TEAM_CONVERSATION_TURNS`)
- **Team activation:** Orchestrator only activates relevant teams per brief
- **Token tracking:** `tokens_used` stored per `agent_run` row — total campaign cost calculable at any time
- **Model config:** Model per agent type defined in a single config file, easy to adjust

---

## Error Handling

- If an agent run fails, its `agent_runs` row is set to `status: failed`
- The campaign does not crash — the phase completes with available outputs
- Failed runs are shown in the UI with a retry button (re-runs just that agent)
- The orchestrator skips failed research agents when synthesising (notes the gap)

---

## Out of Scope (for now)

- Sprite/office UI
- User authentication (single-user hobby project)
- Multi-campaign collaboration
- Paid hosting / deployment config
