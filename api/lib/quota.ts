const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
const hasUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

export const FREE_AI_DAILY_LIMIT = Number(process.env.FREE_AI_DAILY_LIMIT ?? 3)
export const PRO_AI_DAILY_LIMIT = Number(process.env.PRO_AI_DAILY_LIMIT ?? 10)

const SANITIZE_RE = /[^a-zA-Z0-9_.-]/g
const DAY_SECONDS = 24 * 60 * 60

interface Bucket {
  count: number
  resetAt: number
}
const fallbackBuckets = new Map<string, Bucket>()

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
}

export function kvKey(userId: string, suffix: string): string {
  return `housesphere:${suffix}:${userId.replace(SANITIZE_RE, '_')}`
}

export function clientIp(headers: Record<string, unknown> | undefined): string {
  const forwarded = headers?.['x-forwarded-for']
  const value = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ''
  return value || 'unknown'
}

export async function checkPremium(userId: string | undefined): Promise<boolean> {
  if (!userId || !hasUpstash) return false
  try {
    const url = `${UPSTASH_URL.replace(/\/$/, '')}/get/${encodeURIComponent(kvKey(userId, 'entitlement'))}`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } })
    if (!response.ok) return false
    const data = (await response.json()) as { result?: unknown }
    return data.result === '1'
  } catch {
    return false
  }
}

export async function consumeAiAction(
  userId: string | undefined,
  premium: boolean,
  ip: string,
): Promise<QuotaResult> {
  const identity = userId ? `u-${userId}` : `i-${ip}`
  const limit = premium ? PRO_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT

  if (hasUpstash) {
    try {
      const key = kvKey(identity, 'ai-daily')
      const response = await fetch(`${UPSTASH_URL.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, DAY_SECONDS, 'NX'],
        ]),
      })
      if (!response.ok) return fallbackConsume(identity, limit)
      const results = (await response.json()) as { result?: unknown }[]
      const value = results?.[0]?.result
      const used = typeof value === 'number' ? value : 0
      return { allowed: used <= limit, used, limit }
    } catch {
      return fallbackConsume(identity, limit)
    }
  }

  return fallbackConsume(identity, limit)
}

function fallbackConsume(identity: string, limit: number): QuotaResult {
  const now = Date.now()
  const bucket = fallbackBuckets.get(identity)
  if (!bucket || bucket.resetAt <= now) {
    fallbackBuckets.set(identity, { count: 1, resetAt: now + DAY_SECONDS * 1000 })
    return { allowed: true, used: 1, limit }
  }
  bucket.count += 1
  return { allowed: bucket.count <= limit, used: bucket.count, limit }
}
