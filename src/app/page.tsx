import Link from 'next/link'
import { listCampaigns } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import type { CampaignStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = []
  try {
    campaigns = await listCampaigns()
  } catch {
    // DB not ready yet — show empty state
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No campaigns yet.</p>
          <Link
            href="/campaigns/new"
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start your first campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={getCampaignHref(campaign.id, campaign.status)}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{campaign.brief.goal}</p>
                <p className="text-xs text-gray-500 mt-0.5">{campaign.brief.brand}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={campaign.status} />
                <span className="text-xs text-gray-400">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getCampaignHref(id: string, status: CampaignStatus): string {
  switch (status) {
    case 'briefing':
    case 'researching':
    case 'creative':
      return `/campaigns/${id}/research`
    case 'awaiting_path':
      return `/campaigns/${id}/creative`
    case 'specialist':
    case 'challenge':
    case 'awaiting_review':
      return `/campaigns/${id}/teams`
    case 'complete':
      return `/campaigns/${id}/output`
    default:
      return `/campaigns/${id}/research`
  }
}
