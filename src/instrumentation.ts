export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/config')
    validateEnv()
    const { recoverStuckCampaigns } = await import('./lib/runner/campaign-runner')
    await recoverStuckCampaigns()
  }
}
