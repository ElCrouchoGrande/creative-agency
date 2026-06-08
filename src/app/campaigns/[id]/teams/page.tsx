'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCampaign, retryTeam } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { AgentPanel } from '@/components/AgentPanel'
import type { CampaignEvent, TeamName } from '@/lib/types'
import type { AgentRunStatus } from '@/lib/types'

interface AgentState {
  output: string
  status: AgentRunStatus
}

interface TeamState {
  agents: Record<string, AgentState>
  challengeInput?: string
  challengeResponse?: string
}

function emptyTeamState(): TeamState {
  return {
    agents: {
      strategist: { output: '', status: 'pending' },
      specialist: { output: '', status: 'pending' },
      strategist_close: { output: '', status: 'pending' },
    },
  }
}

export default function TeamsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [activeTeams, setActiveTeams] = useState<TeamName[]>([])
  const [teamStates, setTeamStates] = useState<Record<string, TeamState>>({})
  const [campaignStatus, setCampaignStatus] = useState<string>('specialist')

  useEffect(() => {
    getCampaign(id).then((campaign) => {
      setCampaignStatus(campaign.status)
      const teams = campaign.activeTeams as TeamName[]
      setActiveTeams(teams)

      const initial: Record<string, TeamState> = {}
      for (const team of teams) {
        initial[team] = emptyTeamState()
        const teamOutput = campaign.warRoom.teamOutputs?.[team]
        if (teamOutput?.draft) {
          initial[team].agents.strategist_close = { output: teamOutput.draft, status: 'complete' }
          if (teamOutput.challengeInput) initial[team].challengeInput = teamOutput.challengeInput
          if (teamOutput.challengeResponse) initial[team].challengeResponse = teamOutput.challengeResponse
        }
      }
      setTeamStates(initial)

      if (campaign.status === 'awaiting_review' || campaign.status === 'complete') {
        router.push(`/campaigns/${id}/output`)
      }
    })
  }, [id, router])

  const handleEvent = useCallback((event: CampaignEvent) => {
    if (event.type === 'agent_start') {
      const team = event.team
      setTeamStates((prev) => {
        if (!prev[team]) return prev
        return {
          ...prev,
          [team]: {
            ...prev[team],
            agents: {
              ...prev[team].agents,
              [event.agent]: { output: '', status: 'running' },
            },
          },
        }
      })
    }
    if (event.type === 'agent_token') {
      const team = event.team
      setTeamStates((prev) => {
        if (!prev[team]) return prev
        return {
          ...prev,
          [team]: {
            ...prev[team],
            agents: {
              ...prev[team].agents,
              [event.agent]: {
                output: (prev[team].agents[event.agent]?.output ?? '') + event.token,
                status: 'running',
              },
            },
          },
        }
      })
    }
    if (event.type === 'agent_complete') {
      const team = event.team
      setTeamStates((prev) => {
        if (!prev[team]) return prev
        return {
          ...prev,
          [team]: {
            ...prev[team],
            agents: {
              ...prev[team].agents,
              [event.agent]: { output: event.output, status: 'complete' },
            },
          },
        }
      })
    }
    if (event.type === 'agent_failed') {
      const team = event.team
      setTeamStates((prev) => {
        if (!prev[team]) return prev
        return {
          ...prev,
          [team]: {
            ...prev[team],
            agents: {
              ...prev[team].agents,
              [event.agent]: { ...(prev[team].agents[event.agent] ?? { output: '' }), status: 'failed' },
            },
          },
        }
      })
    }
    if (event.type === 'phase_change') {
      setCampaignStatus(event.status)
      if (event.status === 'awaiting_review') {
        setTimeout(() => router.push(`/campaigns/${id}/output`), 800)
      }
    }
  }, [id, router])

  useSSE(id, handleEvent)

  const teamLabel = (name: string) =>
    name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phase 3 of 3</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {campaignStatus === 'challenge' ? 'Challenge Round' : 'Specialist Teams'}
        </h1>
        <p className="text-gray-500 mt-1">
          {campaignStatus === 'challenge'
            ? 'Teams are challenging each other to sharpen their plans.'
            : 'Each team is brainstorming their approach internally.'}
        </p>
      </div>

      {activeTeams.length === 0 && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Orchestrator selecting teams…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTeams.map((team) => {
          const state = teamStates[team]
          if (!state) return null

          const agentEntries = Object.entries(state.agents)
          const hasStarted = agentEntries.some(([, s]) => s.status !== 'pending')
          const visibleAgents = hasStarted ? agentEntries : []

          return (
            <div key={team} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{teamLabel(team)}</h3>
                {state.agents.strategist_close?.status === 'failed' && (
                  <button
                    onClick={() => retryTeam(id, team)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Retry
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                {!hasStarted && (
                  <p className="text-xs text-gray-400 italic py-4 text-center">Waiting for orchestrator…</p>
                )}
                {visibleAgents.map(([agentName, agentState]) => (
                  <AgentPanel
                    key={agentName}
                    team={team}
                    agent={agentName}
                    output={agentState.output}
                    status={agentState.status}
                  />
                ))}
                {state.challengeInput && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-medium text-orange-700 mb-1">Challenge received</p>
                    <p className="text-xs text-orange-800">{state.challengeInput}</p>
                  </div>
                )}
                {state.challengeResponse && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-1">Sharpened response</p>
                    <p className="text-xs text-green-800">{state.challengeResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
