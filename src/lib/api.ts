import type { Brief, CampaignStatus, WarRoom, AgentRunStatus } from './types'

export interface AgentRun {
  id: string
  campaignId: string
  phase: string
  team: string
  agent: string
  status: AgentRunStatus
  output: string
  tokensUsed: number
  createdAt: string
}

export interface Campaign {
  id: string
  status: CampaignStatus
  brief: Brief
  warRoom: WarRoom
  activeTeams: string[]
  createdAt: string
  agentRuns?: AgentRun[]
}

export async function createCampaign(brief: Brief): Promise<{ id: string }> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCampaign(id: string): Promise<Campaign> {
  const res = await fetch(`/api/campaigns/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns', { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function approvePath(campaignId: string, pathId: 'A' | 'B' | 'C'): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/approve-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathId }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function retryTeam(campaignId: string, team: string): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/teams/${team}/retry`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
}
