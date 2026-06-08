'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from '@/lib/api'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)
    const urlsRaw = (data.get('urls') as string).trim()

    try {
      const { id } = await createCampaign({
        goal: data.get('goal') as string,
        brand: data.get('brand') as string,
        audience: data.get('audience') as string,
        background: data.get('background') as string,
        urls: urlsRaw ? urlsRaw.split('\n').map((u) => u.trim()).filter(Boolean) : [],
      })
      router.push(`/campaigns/${id}/research`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">New Campaign</h1>
      <p className="text-gray-500 mb-8">
        Fill in the brief and the research team will get to work immediately.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Campaign Goal" required>
          <textarea
            name="goal"
            rows={3}
            required
            placeholder="What are you trying to achieve? Be specific."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </Field>

        <Field label="Brand" required>
          <input
            name="brand"
            type="text"
            required
            placeholder="Brand name and a sentence about what it does"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </Field>

        <Field label="Target Audience" required>
          <input
            name="audience"
            type="text"
            required
            placeholder="Who are you trying to reach?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </Field>

        <Field label="Background & Context" hint="Paste any relevant context, research, or background information">
          <textarea
            name="background"
            rows={5}
            placeholder="Competitor positioning, brand values, previous campaigns, category context…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </Field>

        <Field label="Reference URLs" hint="One URL per line — agents will search these as additional context">
          <textarea
            name="urls"
            rows={3}
            placeholder="https://example.com/article&#10;https://example.com/report"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
          />
        </Field>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting campaign…' : 'Start Campaign'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
