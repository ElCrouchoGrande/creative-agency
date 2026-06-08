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
