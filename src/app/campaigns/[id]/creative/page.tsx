'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCampaign, approvePath } from '@/lib/api'
import type { CreativePath } from '@/lib/types'

export default function CreativePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [paths, setPaths] = useState<CreativePath[]>([])
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('creative')

  useEffect(() => {
    getCampaign(id).then((campaign) => {
      setStatus(campaign.status)
      setPaths(campaign.warRoom.creativePaths ?? [])
      if (['specialist', 'challenge', 'awaiting_review', 'complete'].includes(campaign.status)) {
        router.push(`/campaigns/${id}/teams`)
      }
    })
  }, [id, router])

  async function handleApprove() {
    if (!selected) return
    setLoading(true)
    try {
      await approvePath(id, selected)
      router.push(`/campaigns/${id}/teams`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving path')
      setLoading(false)
    }
  }

  if (status === 'creative' && paths.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Creative strategists are working…
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phase 2 of 3</p>
        <h1 className="text-2xl font-bold text-gray-900">Choose a Creative Path</h1>
        <p className="text-gray-500 mt-1">
          Three strategists have proposed different campaign approaches. Pick the one that resonates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {paths.map((path) => (
          <button
            key={path.id}
            onClick={() => setSelected(path.id)}
            className={`text-left p-5 rounded-lg border-2 transition-all ${
              selected === path.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Path {path.id}
              </span>
              {selected === path.id && (
                <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">Selected</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-2 leading-tight">{path.concept}</p>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{path.rationale}</p>
            {path.keyMessages.length > 0 && (
              <ul className="space-y-1">
                {path.keyMessages.map((msg, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-gray-400 mt-0.5">–</span>
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleApprove}
        disabled={!selected || loading}
        className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Starting specialist teams…' : `Go with Path ${selected ?? '…'} →`}
      </button>
    </div>
  )
}
