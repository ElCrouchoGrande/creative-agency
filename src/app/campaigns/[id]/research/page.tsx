'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCampaign } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { AgentPanel } from '@/components/AgentPanel'
import type { CampaignEvent, WarRoom } from '@/lib/types'
import type { AgentRunStatus } from '@/lib/types'

interface AgentState {
  output: string
  status: AgentRunStatus
}

const RESEARCH_AGENTS = [
  { team: 'research', agent: 'landscape_analyst', label: 'Landscape Analyst' },
  { team: 'research', agent: 'trend_spotter', label: 'Trend Spotter' },
  { team: 'research', agent: 'white_space_finder', label: 'White Space Finder' },
]

export default function ResearchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [agents, setAgents] = useState<Record<string, AgentState>>(() =>
    Object.fromEntries(
      RESEARCH_AGENTS.map((a) => [a.agent, { output: '', status: 'pending' as AgentRunStatus }])
    )
  )
  const [warRoom, setWarRoom] = useState<WarRoom>({})
  const [campaignStatus, setCampaignStatus] = useState<string>('researching')

  // Load initial state from DB (for page refreshes)
  useEffect(() => {
    getCampaign(id).then((campaign) => {
      setCampaignStatus(campaign.status)
      setWarRoom(campaign.warRoom)
      for (const run of campaign.agentRuns ?? []) {
        if (run.phase === 'research') {
          setAgents((prev) => ({
            ...prev,
            [run.agent]: { output: run.output, status: run.status as AgentRunStatus },
          }))
        }
      }
      if (['awaiting_path', 'specialist', 'challenge', 'awaiting_review', 'complete'].includes(campaign.status)) {
        router.push(`/campaigns/${id}/creative`)
      }
    })
  }, [id, router])

  const handleEvent = useCallback((event: CampaignEvent) => {
    if (event.type === 'agent_start' && event.phase === 'research') {
      setAgents((prev) => ({
        ...prev,
        [event.agent]: { output: '', status: 'running' },
      }))
    }
    if (event.type === 'agent_token' && event.team === 'research') {
      setAgents((prev) => ({
        ...prev,
        [event.agent]: {
          output: (prev[event.agent]?.output ?? '') + event.token,
          status: 'running',
        },
      }))
    }
    if (event.type === 'agent_complete' && event.team === 'research') {
      setAgents((prev) => ({
        ...prev,
        [event.agent]: { output: event.output, status: 'complete' },
      }))
    }
    if (event.type === 'agent_failed' && event.team === 'research') {
      setAgents((prev) => ({
        ...prev,
        [event.agent]: { ...prev[event.agent], status: 'failed' },
      }))
    }
    if (event.type === 'phase_change') {
      setCampaignStatus(event.status)
      if (event.status === 'awaiting_path') {
        setTimeout(() => router.push(`/campaigns/${id}/creative`), 500)
      }
    }
    if (event.type === 'war_room_update') {
      setWarRoom(event.warRoom)
    }
  }, [id, router])

  useSSE(id, handleEvent)

  const allComplete = RESEARCH_AGENTS.every((a) => agents[a.agent]?.status === 'complete')
  const synthesis = warRoom.research?.synthesis

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phase 1 of 3</p>
        <h1 className="text-2xl font-bold text-gray-900">Research</h1>
        <p className="text-gray-500 mt-1">Three agents are analysing the landscape and finding white space.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {RESEARCH_AGENTS.map((a) => (
          <AgentPanel
            key={a.agent}
            team={a.team}
            agent={a.label}
            output={agents[a.agent]?.output ?? ''}
            status={agents[a.agent]?.status ?? 'pending'}
          />
        ))}
      </div>

      {synthesis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">War Room Synthesis</p>
          <p className="text-sm text-blue-900 leading-relaxed">{synthesis}</p>
        </div>
      )}

      {allComplete && (
        <button
          onClick={() => router.push(`/campaigns/${id}/creative`)}
          className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Review Creative Paths →
        </button>
      )}
    </div>
  )
}
