import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAiStatus, handleAiRequest } from '../server/aiHandler.js'
import { checkPremium, clientIp, consumeAiAction } from './lib/quota.js'

function allowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS
  if (fromEnv) return fromEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
  return [
    'https://housesphere.vercel.app',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
  ]
}

function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (!origin || allowedOrigins().includes(origin)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'GET') {
    res.status(200).json(getAiStatus(process.env))
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }
  }

  const payload = (body ?? {}) as Record<string, unknown>
  const ownKey = typeof payload.apiKey === 'string' && payload.apiKey.trim().length > 0

  if (!ownKey) {
    const userId = headerValue(req.headers?.['x-user-id'])
    const premium = await checkPremium(userId)
    const quota = await consumeAiAction(userId, premium, clientIp(req.headers))
    if (!quota.allowed) {
      res.status(429).json({
        error: premium
          ? `You have used today's ${quota.limit} Pro AI actions. Try again tomorrow.`
          : `You have used today's ${quota.limit} free AI actions. Upgrade to Pro for 10 a day, or add your own API key in Settings.`,
        limit: quota.limit,
        used: quota.used,
      })
      return
    }
  }

  const result = await handleAiRequest(payload, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER,
  })

  res.status(result.status).json(result.body)
}
