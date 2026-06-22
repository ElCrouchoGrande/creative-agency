import type { CreativePath } from '@/lib/types'

type RawPath = CreativePath | string | { concept?: string; rationale?: string; keyMessages?: string[] }

export function normalizePaths(raw: unknown): CreativePath[] {
  if (!raw) return []

  let items: Array<[string, RawPath]>

  if (Array.isArray(raw)) {
    items = raw.map((item, i) => [String(i), item])
  } else if (typeof raw === 'object' && raw !== null) {
    items = Object.entries(raw as Record<string, RawPath>)
  } else {
    return []
  }

  const paths: CreativePath[] = []

  for (const [key, value] of items) {
    if (typeof value === 'string') {
      const id = (key.toUpperCase() === 'A' || key.toUpperCase() === 'B' || key.toUpperCase() === 'C')
        ? (key.toUpperCase() as 'A' | 'B' | 'C')
        : 'A'
      paths.push({ id, concept: value, rationale: '', keyMessages: [] })
    } else if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      const rawId = (obj.id as string | undefined)?.toUpperCase()
      const id: 'A' | 'B' | 'C' =
        rawId === 'A' || rawId === 'B' || rawId === 'C' ? rawId : 'A'
      const concept = typeof obj.concept === 'string' ? obj.concept : ''
      const rationale = typeof obj.rationale === 'string' ? obj.rationale : ''
      const keyMessages = Array.isArray(obj.keyMessages)
        ? (obj.keyMessages as unknown[]).filter((m): m is string => typeof m === 'string')
        : []
      if (concept) {
        paths.push({ id, concept, rationale, keyMessages })
      }
    }
  }

  return paths.sort((a, b) => a.id.localeCompare(b.id))
}
