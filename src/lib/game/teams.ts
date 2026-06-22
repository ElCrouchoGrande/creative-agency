import type { TeamName } from '@/lib/types'

export interface TeamIdentity {
  label: string
  icon: string
  accent: string
  accentDark: string
}

export const TEAM_IDENTITY: Record<string, TeamIdentity> = {
  earned_media:        { label: 'Earned Media',        icon: '📣', accent: '#e52521', accentDark: '#9a1a18' },
  social:              { label: 'Social',               icon: '📱', accent: '#049cd8', accentDark: '#02699a' },
  employee_engagement: { label: 'Employee Engagement',  icon: '🤝', accent: '#5fcf3f', accentDark: '#3a8a28' },
  public_affairs:      { label: 'Public Affairs',       icon: '🏛️', accent: '#9966cc', accentDark: '#664488' },
  field_marketing:     { label: 'Field Marketing',      icon: '⛺', accent: '#ff8c00', accentDark: '#c05800' },
  influencer:          { label: 'Influencer',           icon: '⭐', accent: '#e24ec0', accentDark: '#9a3080' },
  paid_media:          { label: 'Paid Media',           icon: '🤠', accent: '#a5642c', accentDark: '#6a3a18' },
  content:             { label: 'Content',              icon: '✍️', accent: '#2e6db4', accentDark: '#1a4880' },
  investor_relations:  { label: 'Investor Relations',   icon: '📈', accent: '#1a7a4a', accentDark: '#0f4a2a' },
  research:            { label: 'Research',             icon: '🔬', accent: '#6a3a18', accentDark: '#3a1a08' },
  creative:            { label: 'Creative',             icon: '🎨', accent: '#e52521', accentDark: '#9a1a18' },
  system:              { label: 'System',               icon: '⚙️', accent: '#9a7a4a', accentDark: '#6a5030' },
}

const FALLBACK_ACCENTS = [
  '#e52521', '#049cd8', '#5fcf3f', '#9966cc', '#ff8c00',
  '#e24ec0', '#a5642c', '#2e6db4', '#1a7a4a',
]

export function teamIdentity(key: string): TeamIdentity {
  if (TEAM_IDENTITY[key]) return TEAM_IDENTITY[key]
  const idx = Math.abs(hashStr(key)) % FALLBACK_ACCENTS.length
  const accent = FALLBACK_ACCENTS[idx]
  return { label: teamLabel(key), icon: '●', accent, accentDark: accent }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

export function teamLabel(key: string): string {
  if (TEAM_IDENTITY[key]) return TEAM_IDENTITY[key].label
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export const AGENT_LABELS: Record<string, string> = {
  landscape_analyst: 'Landscape Analyst',
  trend_spotter:     'Trend Spotter',
  white_space_finder:'White Space Finder',
  strategist_a:      'Strategist A',
  strategist_b:      'Strategist B',
  strategist_c:      'Strategist C',
  strategist:        'Strategist',
  specialist:        'Specialist',
  strategist_close:  'Strategist',
  challenge_response:'Challenge Response',
  orchestrator:      'Orchestrator',
  facilitator:       'Facilitator',
  measurement:       'Measurement',
  summary:           'Summary',
}

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? agent.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export const ALL_TEAM_NAMES: TeamName[] = [
  'earned_media', 'social', 'employee_engagement', 'public_affairs',
  'field_marketing', 'influencer', 'paid_media', 'content', 'investor_relations',
]
