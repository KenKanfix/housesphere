import type { ChatMessage } from '../../server/aiHandler'

export interface AiStatus {
  configured: boolean
  model?: string
}

export type ScanKind = 'label' | 'receipt' | 'manual'

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
    const response = await fetch('/api/ai')
    if (!response.ok) return { configured: false }
    const body = (await response.json()) as AiStatus
    return { configured: Boolean(body.configured), model: body.model }
  } catch {
    return { configured: false }
  }
}

export async function askAi(messages: ChatMessage[], context: string): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'chat', messages, context }),
  })
  const body = await parseResponse(response)
  if (typeof body.text !== 'string') throw new Error('The AI returned an unexpected response.')
  return body.text
}

export async function scanImage(kind: ScanKind, image: string): Promise<Record<string, unknown>> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'scan', kind, image }),
  })
  const body = await parseResponse(response)
  const data = body.data
  if (!data || typeof data !== 'object') throw new Error('The AI could not read that photo. Try again.')
  return data as Record<string, unknown>
}
