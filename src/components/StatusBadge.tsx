import type { CampaignStatus } from '@/lib/types'

const LABELS: Record<CampaignStatus, string> = {
  briefing: 'Briefing',
  researching: 'Researching',
  creative: 'Creative',
  awaiting_path: 'Choose Path',
  specialist: 'Teams Working',
  challenge: 'Challenge Round',
  awaiting_review: 'Ready to Review',
  complete: 'Complete',
}

const COLORS: Record<CampaignStatus, string> = {
  briefing: 'bg-gray-100 text-gray-600',
  researching: 'bg-blue-100 text-blue-700',
  creative: 'bg-purple-100 text-purple-700',
  awaiting_path: 'bg-yellow-100 text-yellow-700',
  specialist: 'bg-blue-100 text-blue-700',
  challenge: 'bg-orange-100 text-orange-700',
  awaiting_review: 'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  )
}
