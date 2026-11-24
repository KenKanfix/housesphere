import { timingSafeEqual } from 'node:crypto'
import { kvKey } from '../lib/quota.js'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? ''

const ENTITLEMENT_ID = 'pro'
const DEFAULT_TTL_SECONDS = 31 * 24 * 60 * 60
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60

const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_STARTED',
])
const REVOKE_EVENTS = new Set([
  'SUBSCRIPTION_CANCELLED',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
  'SUBSCRIPTION_REVOKED',
])

interface VercelReq {
  method: string
  body: unknown
  headers?: Record<string, string>
}

interface VercelRes {
  status: (code: number) => { json: (data: unknown) => void; send: () => void }
}

interface RevenueCatEvent {
  type?: unknown
  app_user_id?: unknown
  expiration_at_ms?: unknown
  entitlement_ids?: unknown
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function authorized(header: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return false
  const provided = header?.trim() ?? ''
  const token = provided.startsWith('Bearer ') ? provided.slice(7) : provided
  return safeEqual(token, WEBHOOK_SECRET)
}

async function upstash(command: string[]): Promise<boolean> {
  try {
    const response = await fetch(`${UPSTASH_URL.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command]),
    })
    return response.ok
  } catch {
    return false
  }
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!authorized(req.headers?.['authorization'])) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    res.status(500).json({ error: 'Upstash not configured' })
    return
  }

  let body: { event?: unknown }
  try {
    const raw = typeof req.body === 'function' ? await (req.body as () => Promise<unknown>)() : req.body
    body = (await raw) as { event?: unknown }
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const event = body?.event as RevenueCatEvent | undefined
  const type = typeof event?.type === 'string' ? event.type : ''
  const userId = typeof event?.app_user_id === 'string' ? event.app_user_id : ''
  if (!event || !type || !userId) {
    res.status(200).json({ ok: true })
    return
  }

  const entitlementIds = event.entitlement_ids
  const relevant =
    !Array.isArray(entitlementIds) ||
    entitlementIds.length === 0 ||
    entitlementIds.includes(ENTITLEMENT_ID)

  let ok = true
  const key = kvKey(userId, 'entitlement')
  if (relevant && GRANT_EVENTS.has(type)) {
    const expires = typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : undefined
    const ttl = Math.max(
      60,
      Math.min(MAX_TTL_SECONDS, expires ? Math.floor((expires - Date.now()) / 1000) : DEFAULT_TTL_SECONDS),
    )
    ok = await upstash(['SET', key, '1', 'EX', String(ttl)])
  } else if (relevant && REVOKE_EVENTS.has(type)) {
    ok = await upstash(['DEL', key])
  }

  if (!ok) {
    res.status(500).json({ error: 'Entitlement update failed' })
    return
  }
  res.status(200).json({ ok: true })
}
