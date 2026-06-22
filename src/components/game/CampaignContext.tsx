'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface PinnedAgent {
  team: string
  agent: string
}

interface CampaignContextValue {
  pinned: PinnedAgent | null
  pin(team: string, agent: string): void
  unpin(): void
}

const CampaignContext = createContext<CampaignContextValue>({
  pinned: null,
  pin: () => {},
  unpin: () => {},
})

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<PinnedAgent | null>(null)
  return (
    <CampaignContext.Provider value={{ pinned, pin: (team, agent) => setPinned({ team, agent }), unpin: () => setPinned(null) }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaignContext() {
  return useContext(CampaignContext)
}
