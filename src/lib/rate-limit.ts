interface IpRecord {
  count: number
  resetAt: number
}

const ipMap = new Map<string, IpRecord>()
const WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_PER_WINDOW = 1

export function checkIpLimit(ip: string): { allowed: boolean } {
  const now = Date.now()
  const record = ipMap.get(ip)

  if (!record || now > record.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (record.count >= MAX_PER_WINDOW) {
    return { allowed: false }
  }

  record.count++
  return { allowed: true }
}

export function getIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
