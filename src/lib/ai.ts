import type { ChatMessage } from '../../server/aiHandler'
import { db, todayISO } from './db'
import { getDailyAiLimit } from './entitlement'
import { getAppUserId } from './userId'

export type AiProvider = 'gemini' | 'openai'
export type AiMode = 'app' | 'own'

export interface AiStatus {
  configured: boolean
  model?: string
  provider?: AiProvider
}

export type ScanKind = 'label' | 'receipt' | 'manual' | 'bill'

const AI_USAGE_KEY = 'housesphere:ai-usage'

export interface AiUsage {
  used: number
  limit: number
  remaining: number
}

export interface AiSetup {
  enabled: boolean
  mode: AiMode
  provider: AiProvider
  model?: string
  apiKey?: string
  hasKey: boolean
  usage: AiUsage
}

interface AiTicket {
  payload: { apiKey?: string; provider?: AiProvider; model?: string }
  track: () => void
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path
}

function requestHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-User-Id': getAppUserId() }
}

function readUsage(): AiUsage {
  const limit = getDailyAiLimit()
  if (typeof localStorage === 'undefined') {
    return { used: 0, limit, remaining: limit }
  }
  try {
    const raw = JSON.parse(localStorage.getItem(AI_USAGE_KEY) ?? 'null') as { date?: string; count?: number } | null
    if (raw?.date === todayISO() && typeof raw.count === 'number' && raw.count >= 0) {
      const used = Math.min(raw.count, limit)
      return { used, limit, remaining: Math.max(0, limit - used) }
    }
  } catch {
    // Ignore malformed usage records.
  }
  return { used: 0, limit, remaining: limit }
}

export function getAiUsage(): AiUsage {
  return readUsage()
}

function recordAiUsage(): AiUsage {
  const usage = readUsage()
  const used = Math.min(usage.limit, usage.used + 1)
  try {
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify({ date: todayISO(), count: used }))
  } catch {
    // If storage is unavailable the in-memory count still applies for this session.
  }
  return { used, limit: usage.limit, remaining: Math.max(0, usage.limit - used) }
}

export async function getAiSetup(): Promise<AiSetup> {
  const settings = await db.settings.get('app')
  const apiKey = settings?.aiApiKey?.trim() || undefined
  return {
    enabled: settings?.aiEnabled ?? false,
    mode: settings?.aiMode === 'own' ? 'own' : 'app',
    provider: settings?.aiProvider === 'openai' ? 'openai' : 'gemini',
    model: settings?.aiModel?.trim() || undefined,
    apiKey,
    hasKey: Boolean(apiKey),
    usage: readUsage(),
  }
}

async function beginAiAction(): Promise<AiTicket> {
  const setup = await getAiSetup()

  if (!setup.enabled) {
    throw new Error('AI is turned off. Turn it on in Settings to use the assistant.')
  }

  if (setup.mode === 'own') {
    if (!setup.apiKey) {
      throw new Error('Add your own AI API key in Settings, or switch back to the HouseSphere AI.')
    }
    return {
      payload: { apiKey: setup.apiKey, provider: setup.provider, model: setup.model },
      track: () => undefined,
    }
  }

  if (setup.usage.remaining <= 0) {
    throw new Error(
      `You have used today's ${setup.usage.limit} AI actions. Upgrade to Pro for 10 a day, or add your own API key in Settings.`,
    )
  }

  return { payload: {}, track: () => void recordAiUsage() }
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof body?.error === 'string' ? body.error : `Request failed (${response.status}). Please try again.`
    throw new Error(message)
  }
  return body as Record<string, unknown>
}

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const response = await fetch(apiUrl('/api/ai'))
    if (!response.ok) return { configured: false }
    const body = (await response.json()) as AiStatus
    return { configured: Boolean(body.configured), model: body.model, provider: body.provider }
  } catch {
    return { configured: false }
  }
}

export async function askAi(messages: ChatMessage[], context: string): Promise<string> {
  const ticket = await beginAiAction()
  const response = await fetch(apiUrl('/api/ai'), {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ mode: 'chat', messages, context, ...ticket.payload }),
  })
  const body = await parseResponse(response)
  if (typeof body.text !== 'string') throw new Error('The AI returned an unexpected response.')
  ticket.track()
  return body.text
}

export async function scanImage(kind: ScanKind, images: string[]): Promise<Record<string, unknown>> {
  const ticket = await beginAiAction()
  const response = await fetch(apiUrl('/api/ai'), {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ mode: 'scan', kind, images, ...ticket.payload }),
  })
  const body = await parseResponse(response)
  const data = body.data
  if (!data || typeof data !== 'object') throw new Error('The AI could not read that photo. Try again.')
  ticket.track()
  return data as Record<string, unknown>
}
