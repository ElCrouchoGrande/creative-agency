import { db } from '@/lib/db'
import { campaignEvents } from '@/lib/events'
import { runResearchPhase } from '@/lib/agents/research'
import { runCreativePhase } from '@/lib/agents/creative'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { runAllSpecialistTeams } from '@/lib/agents/specialist'
import { runFacilitatorPhase } from '@/lib/agents/facilitator'
import { runAllCreationTeams } from '@/lib/agents/creation'
import { runMeasurementPhase } from '@/lib/agents/measurement'
import { runSummaryPhase } from '@/lib/agents/summary'
import { runNamingPhase } from '@/lib/agents/naming'
import { runIntegrationPhase } from '@/lib/agents/integration'
import type { CampaignStatus } from '@/lib/types'

async function setStatus(campaignId: string, status: CampaignStatus): Promise<void> {
  await db.campaign.update({ where: { id: campaignId }, data: { status } })
  campaignEvents.emit(campaignId, { type: 'phase_change', status })
}

export async function runCampaign(campaignId: string): Promise<void> {
  try {
    await setStatus(campaignId, 'researching')
    await runResearchPhase(campaignId)

    await setStatus(campaignId, 'creative')
    await runCreativePhase(campaignId)

    // Pause for client to select a creative path
    await setStatus(campaignId, 'awaiting_path')
  } catch (error) {
    console.error(`Campaign ${campaignId} failed in pre-approval phase:`, error)
    throw error
  }
}

export async function runCampaignPostApproval(campaignId: string): Promise<void> {
  try {
    await runOrchestrator(campaignId)

    await setStatus(campaignId, 'specialist')
    await runAllSpecialistTeams(campaignId)

    await setStatus(campaignId, 'challenge')
    await runFacilitatorPhase(campaignId)

    // Pause for client to approve asset generation
    await setStatus(campaignId, 'awaiting_creation')
  } catch (error) {
    console.error(`Campaign ${campaignId} failed in post-approval phase:`, error)
    throw error
  }
}

export async function runCampaignPostCreationApproval(campaignId: string): Promise<void> {
  try {
    await setStatus(campaignId, 'creating')
    await runAllCreationTeams(campaignId)

    await setStatus(campaignId, 'measuring')
    await runMeasurementPhase(campaignId)
    await runSummaryPhase(campaignId)
    await runNamingPhase(campaignId)
    await runIntegrationPhase(campaignId)

    await setStatus(campaignId, 'awaiting_review')
  } catch (error) {
    console.error(`Campaign ${campaignId} failed in post-creation phase:`, error)
    try {
      await db.campaign.update({ where: { id: campaignId }, data: { status: 'failed' } })
      campaignEvents.emit(campaignId, { type: 'phase_change', status: 'failed' })
    } catch { /* ignore secondary failure */ }
    throw error
  }
}

export async function recoverStuckCampaigns(): Promise<void> {
  const ACTIVE: CampaignStatus[] = ['researching', 'creative', 'specialist', 'challenge', 'creating', 'measuring']
  const stuck = await db.campaign.findMany({ where: { status: { in: ACTIVE } } })
  for (const campaign of stuck) {
    console.warn(`[recovery] Campaign ${campaign.id} stuck at ${campaign.status} — marking failed`)
    await db.campaign.update({ where: { id: campaign.id }, data: { status: 'failed' } })
    campaignEvents.emit(campaign.id, { type: 'phase_change', status: 'failed' })
  }
}
