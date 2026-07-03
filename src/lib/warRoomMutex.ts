const locks = new Map<string, Promise<void>>()

export async function withCampaignLock<T>(campaignId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(campaignId) ?? Promise.resolve()
  let releaseLock!: () => void
  const acquired = new Promise<void>((resolve) => {
    releaseLock = resolve
  })
  // Chain: next waiter will wait for `acquired` to resolve
  locks.set(campaignId, acquired)
  // Wait for the previous holder to finish
  await prev
  try {
    return await fn()
  } finally {
    releaseLock()
    // Clean up map entry if we're still the last waiter
    if (locks.get(campaignId) === acquired) {
      locks.delete(campaignId)
    }
  }
}
