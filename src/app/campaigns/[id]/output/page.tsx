'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getCampaign, retryTeam } from '@/lib/api'
import type { Campaign } from '@/lib/api'
import type { TeamName } from '@/lib/types'

export default function OutputPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [copying, setCopying] = useState(false)
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())

  useEffect(() => {
    getCampaign(id).then(setCampaign)
  }, [id])

  if (!campaign) {
    return <p className="text-gray-500 text-sm">Loading…</p>
  }

  const { warRoom, activeTeams } = campaign
  const teams = activeTeams as TeamName[]

  function buildMarkdown(): string {
    if (!campaign) return ''
    const lines: string[] = []
    lines.push(`# Campaign: ${campaign.brief.goal}`)
    lines.push(`\n**Brand:** ${campaign.brief.brand}`)
    lines.push(`**Audience:** ${campaign.brief.audience}`)
    if (warRoom.chosenPath) {
      lines.push(`\n## Creative Path: ${warRoom.chosenPath.concept}`)
      lines.push(warRoom.chosenPath.rationale)
      lines.push('\n**Key Messages:**')
      warRoom.chosenPath.keyMessages.forEach((m) => lines.push(`- ${m}`))
    }
    for (const team of teams) {
      const output = warRoom.teamOutputs?.[team]
      if (!output?.draft) continue
      const label = team.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      lines.push(`\n## ${label}`)
      lines.push(output.challengeResponse || output.draft)
    }
    if (warRoom.measurement) {
      lines.push('\n## Measurement Framework')
      lines.push(warRoom.measurement)
    }
    return lines.join('\n')
  }

  async function handleCopy() {
    setCopying(true)
    await navigator.clipboard.writeText(buildMarkdown())
    setTimeout(() => setCopying(false), 1500)
  }

  async function handleRegenerate(team: string) {
    setRegenerating((prev) => new Set([...prev, team]))
    await retryTeam(id, team)
    const poll = setInterval(async () => {
      const updated = await getCampaign(id)
      setCampaign(updated)
      if (updated.warRoom.teamOutputs?.[team as TeamName]?.draft) {
        setRegenerating((prev) => {
          const next = new Set(prev)
          next.delete(team)
          return next
        })
        clearInterval(poll)
      }
    }, 5000)
  }

  const teamLabel = (name: string) =>
    name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Campaign Output</p>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.brief.goal}</h1>
          <p className="text-gray-500 mt-1">{campaign.brief.brand}</p>
        </div>
        <button
          onClick={handleCopy}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {copying ? 'Copied!' : 'Copy as Markdown'}
        </button>
      </div>

      {warRoom.chosenPath && (
        <div className="mb-8 p-5 bg-gray-900 text-white rounded-xl">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Chosen Creative Path</p>
          <p className="text-lg font-semibold mb-2">{warRoom.chosenPath.concept}</p>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{warRoom.chosenPath.rationale}</p>
          <ul className="space-y-1">
            {warRoom.chosenPath.keyMessages.map((msg, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-gray-500 mt-0.5">—</span>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {warRoom.measurement && (
          <div className="border-2 border-gray-900 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-900">
              <h3 className="text-sm font-semibold text-white">Measurement Framework</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{warRoom.measurement}</p>
            </div>
          </div>
        )}
        {teams.map((team) => {
          const output = warRoom.teamOutputs?.[team]
          const isRunning = regenerating.has(team)

          return (
            <div key={team} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{teamLabel(team)}</h3>
                  {isRunning && (
                    <span className="flex items-center gap-1 text-xs text-blue-500">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      Regenerating…
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRegenerate(team)}
                  disabled={isRunning}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Regenerate
                </button>
              </div>
              <div className="p-5">
                {output?.draft ? (
                  <div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{output.draft}</p>
                    {output.challengeResponse && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                          Revised after cross-team challenge
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {output.challengeResponse}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isRunning ? (
                  <p className="text-sm text-gray-400 italic">Working on it — this takes a few minutes…</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No output yet. Click Regenerate to run this team.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
