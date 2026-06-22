import { describe, it, expect } from 'vitest'
import { normalizePaths } from './normalizePaths'

describe('normalizePaths', () => {
  it('returns empty for null/undefined', () => {
    expect(normalizePaths(null)).toEqual([])
    expect(normalizePaths(undefined)).toEqual([])
  })

  it('handles array of proper CreativePath objects', () => {
    const input = [
      { id: 'A', concept: 'Alpha', rationale: 'Why A', keyMessages: ['msg1'] },
      { id: 'B', concept: 'Beta',  rationale: 'Why B', keyMessages: [] },
      { id: 'C', concept: 'Gamma', rationale: 'Why C', keyMessages: ['m1','m2'] },
    ]
    const result = normalizePaths(input)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('A')
    expect(result[1].id).toBe('B')
    expect(result[2].concept).toBe('Gamma')
  })

  it('handles object of strings', () => {
    const input = { A: 'Path A text', B: 'Path B text' }
    const result = normalizePaths(input)
    expect(result).toHaveLength(2)
    expect(result[0].concept).toBe('Path A text')
    expect(result[1].concept).toBe('Path B text')
  })

  it('handles object of nested objects', () => {
    const input = {
      A: { id: 'A', concept: 'Concept A', rationale: 'R A', keyMessages: ['k1'] },
      B: { id: 'B', concept: 'Concept B', rationale: 'R B', keyMessages: [] },
    }
    const result = normalizePaths(input)
    expect(result).toHaveLength(2)
    expect(result[0].rationale).toBe('R A')
  })

  it('filters out entries without concept', () => {
    const input = [
      { id: 'A', concept: 'Valid', rationale: '', keyMessages: [] },
      { id: 'B', concept: '',     rationale: 'No concept', keyMessages: [] },
    ]
    const result = normalizePaths(input)
    expect(result).toHaveLength(1)
    expect(result[0].concept).toBe('Valid')
  })

  it('sorts by id', () => {
    const input = [
      { id: 'C', concept: 'C first', rationale: '', keyMessages: [] },
      { id: 'A', concept: 'A last',  rationale: '', keyMessages: [] },
      { id: 'B', concept: 'B mid',   rationale: '', keyMessages: [] },
    ]
    const result = normalizePaths(input)
    expect(result.map((p) => p.id)).toEqual(['A', 'B', 'C'])
  })

  it('returns empty for non-array non-object', () => {
    expect(normalizePaths('string')).toEqual([])
    expect(normalizePaths(42)).toEqual([])
  })
})
