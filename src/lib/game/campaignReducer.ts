import type { CampaignStatus, CampaignEvent, WarRoom, CreativePath } from '@/lib/types'
import type { AgentRun, Campaign } from '@/lib/api'
import type { AgentRunStatus } from '@/lib/types'
import { normalizePaths } from './normalizePaths'
import { eventToDialogueLine } from './dialogue'
import type { DialogueLine } from './dialogue'

export interface AgentState {
  output: string
  status: AgentRunStatus
  lastUpdate: number
}

export interface TeamState {
  team: string
  agents: Record<string, AgentState>
  challengeInput?: string
  challengeResponse?: string
  challengerOf?: string
  overallStatus: AgentRunStatus
}

export interface CampaignClientState {
  id: string
  status: CampaignStatus
  brief: Campaign['brief']
  warRoom: WarRoom
  activeTeams: string[]
  teams: Record<string, TeamState>
  creativePaths: CreativePath[]
  lastActiveKey: { team: string; agent: string } | null
  currentNarration: DialogueLine | null
}

export type CampaignAction =
  | { type: 'HYDRATE'; campaign: Campaign }
  | { type: 'HYDRATE_STATUS_ONLY'; campaign: Campaign }
  | { type: 'SSE_EVENT'; event: CampaignEvent }

export function initialState(id: string): CampaignClientState {
  return {
    id,
    status: 'briefing',
    brief: { goal: '', brand: '', audience: '', background: '', urls: [] },
    warRoom: {},
    activeTeams: [],
    teams: {},
    creativePaths: [],
    lastActiveKey: null,
    currentNarration: null,
  }
}

export function campaignReducer(
  state: CampaignClientState,
  action: CampaignAction
): CampaignClientState {
  switch (action.type) {
    case 'HYDRATE':
      return hydrateFromCampaign(state, action.campaign, false)
    case 'HYDRATE_STATUS_ONLY':
      return hydrateFromCampaign(state, action.campaign, true)
    case 'SSE_EVENT':
      return applySseEvent(state, action.event)
  }
}

function hydrateFromCampaign(
  state: CampaignClientState,
  campaign: Campaign,
  statusOnly: boolean
): CampaignClientState {
  const teams = buildTeamsFromRuns(campaign.agentRuns ?? [], campaign.warRoom, state.teams, statusOnly)
  const creativePaths = extractPaths(campaign.warRoom)

  if (statusOnly) {
    return {
      ...state,
      status: campaign.status,
      warRoom: campaign.warRoom,
      activeTeams: campaign.activeTeams,
      creativePaths,
      teams,
    }
  }

  return {
    ...state,
    id: campaign.id,
    status: campaign.status,
    brief: campaign.brief,
    warRoom: campaign.warRoom,
    activeTeams: campaign.activeTeams,
    creativePaths,
    teams,
  }
}

function buildTeamsFromRuns(
  runs: AgentRun[],
  warRoom: WarRoom,
  existing: Record<string, TeamState>,
  preserveRunning: boolean
): Record<string, TeamState> {
  const teams: Record<string, TeamState> = {}

  for (const run of runs) {
    if (!teams[run.team]) {
      teams[run.team] = emptyTeamState(run.team)
    }
    const ts = teams[run.team]

    const existingAgent = existing[run.team]?.agents[run.agent]
    const isRunning = existingAgent?.status === 'running'

    if (preserveRunning && isRunning) {
      ts.agents[run.agent] = existingAgent
    } else {
      ts.agents[run.agent] = {
        output: run.output ?? '',
        status: run.status,
        lastUpdate: Date.now(),
      }
    }
  }

  // Merge warRoom outputs
  for (const [teamName, output] of Object.entries(warRoom.teamOutputs ?? {})) {
    if (!teams[teamName]) teams[teamName] = emptyTeamState(teamName)
    const ts = teams[teamName]
    if (output?.challengeInput) ts.challengeInput = output.challengeInput
    if (output?.challengeResponse) ts.challengeResponse = output.challengeResponse
    if (output?.challengeInput) ts.challengerOf = parseChallengerOf(output.challengeInput)
  }

  // Derive overallStatus for each team
  for (const ts of Object.values(teams)) {
    ts.overallStatus = deriveOverallStatus(ts.agents)
  }

  return teams
}

function emptyTeamState(team: string): TeamState {
  return { team, agents: {}, overallStatus: 'pending' }
}

function deriveOverallStatus(agents: Record<string, AgentState>): AgentRunStatus {
  const statuses = Object.values(agents).map((a) => a.status)
  if (statuses.includes('running')) return 'running'
  if (statuses.includes('failed')) return 'failed'
  if (statuses.length > 0 && statuses.every((s) => s === 'complete')) return 'complete'
  return 'pending'
}

function parseChallengerOf(challengeInput: string): string | undefined {
  // facilitator.ts writes team name with spaces: "The field marketing team is approaching..."
  const m = challengeInput.match(/^The ([\w ]+?) team/i)
  return m ? m[1].trim().replace(/ /g, '_').toLowerCase() : undefined
}

function extractPaths(warRoom: WarRoom): CreativePath[] {
  if (!warRoom.creativePaths) return []
  // creativePaths may be a proper CreativePath[] OR an object of JSON strings
  // (creative agents write to creativePaths.A/B/C as individual string values)
  const raw = warRoom.creativePaths as unknown
  if (Array.isArray(raw)) return raw as CreativePath[]
  // Object of strings — each value may itself be a JSON string, parse first
  if (typeof raw === 'object' && raw !== null) {
    const parsed: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') {
        try { parsed[k] = JSON.parse(v) } catch { parsed[k] = v }
      } else {
        parsed[k] = v
      }
    }
    return normalizePaths(parsed)
  }
  return []
}

function applySseEvent(state: CampaignClientState, event: CampaignEvent): CampaignClientState {
  const narration = eventToDialogueLine(event)
  const narrationUpdate = narration ? { currentNarration: narration } : {}

  switch (event.type) {
    case 'agent_start': {
      const team = event.team
      const agent = event.agent
      const existing = state.teams[team] ?? emptyTeamState(team)
      const activeTeams = state.activeTeams.includes(team)
        ? state.activeTeams
        : [...state.activeTeams, team]

      return {
        ...state,
        ...narrationUpdate,
        activeTeams,
        lastActiveKey: { team, agent },
        teams: {
          ...state.teams,
          [team]: {
            ...existing,
            agents: {
              ...existing.agents,
              [agent]: { output: '', status: 'running', lastUpdate: Date.now() },
            },
            overallStatus: 'running',
          },
        },
      }
    }

    case 'agent_token': {
      const team = event.team
      const agent = event.agent
      const existing = state.teams[team] ?? emptyTeamState(team)
      const existingAgent = existing.agents[agent] ?? { output: '', status: 'running' as AgentRunStatus, lastUpdate: 0 }
      return {
        ...state,
        teams: {
          ...state.teams,
          [team]: {
            ...existing,
            agents: {
              ...existing.agents,
              [agent]: {
                ...existingAgent,
                output: existingAgent.output + event.token,
                lastUpdate: Date.now(),
              },
            },
          },
        },
      }
    }

    case 'agent_complete': {
      const team = event.team
      const agent = event.agent
      const existing = state.teams[team] ?? emptyTeamState(team)
      const updatedAgents = {
        ...existing.agents,
        [agent]: { output: event.output, status: 'complete' as AgentRunStatus, lastUpdate: Date.now() },
      }
      return {
        ...state,
        ...narrationUpdate,
        teams: {
          ...state.teams,
          [team]: {
            ...existing,
            agents: updatedAgents,
            overallStatus: deriveOverallStatus(updatedAgents),
          },
        },
      }
    }

    case 'agent_failed': {
      const team = event.team
      const agent = event.agent
      const existing = state.teams[team] ?? emptyTeamState(team)
      const updatedAgents = {
        ...existing.agents,
        [agent]: { output: '', status: 'failed' as AgentRunStatus, lastUpdate: Date.now() },
      }
      return {
        ...state,
        ...narrationUpdate,
        teams: {
          ...state.teams,
          [team]: {
            ...existing,
            agents: updatedAgents,
            overallStatus: deriveOverallStatus(updatedAgents),
          },
        },
      }
    }

    case 'phase_change':
      return { ...state, ...narrationUpdate, status: event.status }

    case 'war_room_update': {
      const creativePaths = extractPaths(event.warRoom)
      // Re-derive challengerOf from incoming teamOutputs so ChallengeWalker mounts during live runs
      const updatedTeams = { ...state.teams }
      for (const [teamName, output] of Object.entries(event.warRoom.teamOutputs ?? {})) {
        if (output?.challengeInput) {
          const challengerOf = parseChallengerOf(output.challengeInput)
          if (challengerOf) {
            updatedTeams[teamName] = {
              ...(updatedTeams[teamName] ?? emptyTeamState(teamName)),
              challengeInput: output.challengeInput,
              challengerOf,
            }
          }
        }
      }
      return { ...state, warRoom: event.warRoom, creativePaths, teams: updatedTeams }
    }
  }
}
