# Creative Agency

**An AI-powered campaign planning team, played out as a retro pixel-art game.**

You write a short campaign brief. A team of AI agents researches the market, pitches three creative directions, and, once you choose one, nine specialist teams (earned media, social, content, paid media and more) argue over the plan, challenge each other, and hand back a finished campaign with measurement targets. You watch it all happen live.

*Why "Brands by Bowser"?* The agency's tagline says it best:

> *The only integrated marketing agency run by 16-bit pixel sprites. Give us a brief and we'll create mushroom magic.*

The fictional agency is run by Bowser, the arch-villain of the Mario games, and the pixel-art look borrows from that world. It's a tongue-in-cheek homage, not an official or affiliated project.

<!-- TODO: add a screenshot or short screen recording here, e.g. ![The agency at work](docs/images/agency.png) -->

## Why I built this

I wanted to understand what AI can and can't do on a task that is genuinely hard: planning a PR and marketing campaign. That means research, creative judgement, specialist knowledge and people disagreeing with each other, not just one prompt and one answer.

Rather than ask one AI for "a campaign", I tried to mirror how a real agency works. Different roles, different expertise, a debate, a challenge from outside the team, and a human making the key decisions.

## What it does

```
Brief  →  Research  →  Three creative paths  →  YOU choose  →  Specialist teams
                                                                     ↓
                  Final plan  ←  Measurement  ←  Assets  ←  Cross-team challenge
```

1. **Brief.** You describe the goal, brand, audience and background.
2. **Research.** Agents map the competitive landscape, spot cultural trends and look for "white space" the competition isn't using. They search the live web as they go.
3. **Creative.** Three distinct campaign paths (A, B and C) are proposed.
4. **You choose.** The pipeline pauses and waits for a human decision.
5. **Specialist teams.** Relevant teams are selected from nine disciplines. Within each team, a strategist drafts a plan, a specialist critiques it, and the strategist revises it.
6. **Cross-team challenge.** A facilitator picks the sharpest point from one team and puts it to another, so plans are tested against each other, not written in isolation.
7. **Assets.** After a second human approval, each team produces a sample deliverable, such as a press release or social content.
8. **Measurement.** A final agent proposes KPIs and targets for the whole campaign.

Everything streams to the screen as it happens, so you can read the agents' working, not just the answer.

## The nine teams

Earned media · Social · Employee engagement · Public affairs · Field marketing · Influencer · Paid media · Content · Investor relations

## What I learned

Building this taught me more about AI's limits than any amount of reading:

- **Structure beats a bigger prompt.** Splitting the work into roles, with research feeding creative and creative feeding the teams, produced far better results than a single request.
- **Disagreement is useful.** The strategist, specialist and cross-team challenge stages exist because the first draft is rarely the best one.
- **Humans stay in charge of the big calls.** The pipeline stops twice: once to choose the creative path and once to approve asset creation. I wanted AI to do the legwork while a person kept the decisions.
- **Small details break things.** In the debate, the final turn originally had a tool available. The agent would write one introductory sentence and call the tool, and the real answer was lost. Removing the tool fixed it. Simple, but it took watching real runs to find.
- **Parallel agents cause race conditions.** Several agents writing to shared state at once overwrote each other's work, so I added a per-campaign lock.
- **Cost needs managing.** Cheaper, faster models handle the specialist agents. The stronger model handles research, creative direction and facilitation. Public visitors are limited to one campaign per day.

## How it was built

This project was built with AI assistance, using [Claude Code](https://claude.com/claude-code). I directed the design and made the decisions, and the AI wrote much of the code. The design spec and implementation plans I worked from are in [`docs/superpowers/`](docs/superpowers/).

## Under the hood

For the technically curious:

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript, Tailwind |
| AI | Anthropic Claude: a stronger model for research, creative and facilitation, and a smaller, faster one for specialist agents |
| Web research | Tavily search API |
| Image generation | OpenAI images API (optional) |
| Data | SQLite via Prisma; the whole campaign state lives in one shared JSON "war room" that every agent reads |
| Live updates | Server-Sent Events, with heartbeat and automatic reconnection |
| Background work | In-process jobs, with no queue to run |
| Tests | Vitest |

Agents run in a tool-use loop, so they can search the web, write to the war room, and select which teams to activate.

### Run it yourself

You'll need Node.js and API keys for Anthropic and Tavily. An OpenAI key is optional and only needed for image generation.

```bash
npm install
# create a .env file with the variables below
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

```
DATABASE_URL=file:./dev.db
ANTHROPIC_API_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...            # optional: image generation
TEAM_CONVERSATION_TURNS=3     # optional: debate length per team
```

Other commands: `npm test` runs the test suite and `npm run build` type-checks and builds.

> **Note:** a full campaign makes many AI calls, so a run costs real money in API usage.

## Limitations

- It's a prototype and a learning project, not a production tool.
- AI-generated plans need human review. Facts, statistics and claims in the output should be checked before anyone relies on them.
- The agents work from the brief and a handful of web searches, not from deep knowledge of your organisation.
- Output quality varies between runs.

## Status

Personal project, work in progress.
