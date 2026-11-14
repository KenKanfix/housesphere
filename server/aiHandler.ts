export interface AiEnv {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  OPENAI_BASE_URL?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  AI_PROVIDER?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiRequestBody {
  mode?: 'chat' | 'scan'
  messages?: ChatMessage[]
  context?: string
  kind?: 'label' | 'receipt' | 'manual' | 'bill'
  images?: string[]
  apiKey?: string
  provider?: AiProvider
  model?: string
}

export interface AiResult {
  status: number
  body: Record<string, unknown>
}

export type AiProvider = 'gemini' | 'openai'

export interface AiStatus {
  configured: boolean
  provider: AiProvider
  model: string
}

interface ModelMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ModelRequest {
  model: string
  temperature: number
  maxTokens: number
  system?: string
  messages?: ModelMessage[]
  prompt?: string
  images?: string[]
  json?: boolean
}

interface ProviderResult {
  ok: boolean
  status: number
  text?: string
  payload?: any
}

interface GeminiPart {
  text?: string
  thought?: boolean
  inlineData?: { mimeType: string; data: string }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

const SCAN_PROMPTS: Record<string, string> = {
  label: `You are reading a photo of an appliance or product label.
Return ONLY a JSON object with this exact shape:
{
  "name": "short product name",
  "brand": "brand or empty string",
  "model": "model number or empty string",
  "serial": "serial number or empty string",
  "category": "Appliance | Furniture | Electronics | Tools | Outdoor | Other",
  "notes": "any other useful detail such as capacity, colour, voltage or manufacture date"
}
Use empty strings when a value is not visible. Do not invent serial numbers.`,
  receipt: `You are reading one or two photos of a purchase receipt, invoice or bill. You may be given the front and the back of the same document; combine the details from both images into a single result.
Return ONLY a JSON object with this exact shape:
{
  "vendor": "store or business name",
  "date": "YYYY-MM-DD or empty string",
  "amount": 0,
  "category": "electricity | gas | water | maintenance | appliance | insurance | project | other",
  "description": "a short summary of what was purchased or paid for",
  "items": ["up to 5 line items as short strings"]
}
Amount must be a number in the receipt currency, without symbols. Use 0 if it cannot be read.`,
  manual: `You are reading a photo of an appliance manual, cover page or product document.
Return ONLY a JSON object with this exact shape:
{
  "title": "document title",
  "brand": "brand or empty string",
  "model": "model number or empty string",
  "type": "manual",
  "notes": "a one sentence description"
}`,
  bill: `You are reading one or two photos of a utility bill, rates notice or insurance notice (for example electricity, gas, water, council rates or insurance). You may be given the front and the back of the same document; combine the details from both images into a single result.
Return ONLY a JSON object with this exact shape:
{
  "vendor": "utility, council or insurer name",
  "date": "YYYY-MM-DD issue date or empty string",
  "dueDate": "YYYY-MM-DD payment due date or empty string",
  "amount": 0,
  "category": "electricity | gas | water | insurance | other",
  "description": "a short summary such as Quarterly electricity bill",
  "accountNumber": "account or reference number or empty string",
  "frequency": "weekly | fortnightly | monthly | quarterly | half-yearly | yearly"
}
Set "frequency" from the billing period shown on the bill (for example a quarterly rates notice is "quarterly"). Only leave it empty if the bill gives no indication at all.
Amount must be a number in the bill currency, without symbols. Use 0 if it cannot be read.`,
}

function sanitizedKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.trim()
  if (key.length < 8 || key.length > 400 || /\s/.test(key)) return undefined
  return key
}

function sanitizedModel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const model = value.trim()
  if (!/^[A-Za-z0-9._-]{2,80}$/.test(model)) return fallback
  return model
}

function geminiKey(env: AiEnv): string | undefined {
  return env.GEMINI_API_KEY || env.OPENAI_API_KEY
}

function geminiModel(env: AiEnv): string {
  if (env.GEMINI_MODEL) return env.GEMINI_MODEL
  if (env.OPENAI_MODEL?.startsWith('gemini-')) return env.OPENAI_MODEL
  return DEFAULT_GEMINI_MODEL
}

function resolveProvider(env: AiEnv): AiProvider {
  if (env.AI_PROVIDER === 'gemini' || env.AI_PROVIDER === 'openai') {
    return env.AI_PROVIDER
  }
  if (env.GEMINI_API_KEY) return 'gemini'
  if (env.OPENAI_BASE_URL?.includes('generativelanguage.googleapis.com')) return 'gemini'
  return 'openai'
}

export function getAiStatus(env: AiEnv): AiStatus {
  const provider = resolveProvider(env)
  const model = provider === 'gemini' ? geminiModel(env) : env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  const configured = provider === 'gemini' ? Boolean(geminiKey(env)) : Boolean(env.OPENAI_API_KEY)
  return { configured, provider, model }
}

function resolveRequestConfig(body: AiRequestBody, env: AiEnv): RequestConfig {
  const ownKey = sanitizedKey(body.apiKey)

  if (ownKey) {
    const provider: AiProvider = body.provider === 'openai' ? 'openai' : 'gemini'
    const fallback = provider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL
    return {
      configured: true,
      provider,
      model: sanitizedModel(body.model, fallback),
      apiKey: ownKey,
      ownKey: true,
    }
  }

  const status = getAiStatus(env)
  return {
    configured: status.configured,
    provider: status.provider,
    model: status.model,
    apiKey: status.provider === 'gemini' ? geminiKey(env) : env.OPENAI_API_KEY,
    ownKey: false,
    baseUrl: env.OPENAI_BASE_URL,
  }
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function buildChatSystem(context?: string): string {
  const base = `You are the HouseSphere home assistant. You help a household understand their home inventory, warranties, maintenance, projects, documents, expenses and trusted trades.
Be concise and practical. Use short paragraphs and bullet points. Amounts are in the household's chosen currency.
If the household context does not contain the answer, say what is missing instead of making it up.
You may suggest sensible maintenance schedules based on the appliances listed.`
  if (!context) return base
  return `${base}\n\nHere is the household's current stored information:\n${context}`
}

function parseDataUrl(image: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(image)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

interface ProviderConfig {
  apiKey: string
  baseUrl?: string
}

interface RequestConfig {
  configured: boolean
  provider: AiProvider
  model: string
  apiKey?: string
  ownKey: boolean
  baseUrl?: string
}

async function callOpenAI(
  config: ProviderConfig,
  request: ModelRequest,
): Promise<ProviderResult> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  const messages: Record<string, unknown>[] = []

  if (request.system) {
    messages.push({ role: 'system', content: request.system })
  }

  if (request.prompt) {
    const content: Record<string, unknown>[] = [{ type: 'text', text: request.prompt }]
    for (const image of request.images ?? []) {
      content.push({ type: 'image_url', image_url: { url: image, detail: 'high' } })
    }
    messages.push({ role: 'user', content })
  } else {
    messages.push(
      ...(request.messages ?? []).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    )
  }

  const body: Record<string, unknown> = {
    model: request.model,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    messages,
  }
  if (request.json) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  const payload = await response.json().catch(() => ({}))
  const text = payload?.choices?.[0]?.message?.content
  return {
    ok: response.ok,
    status: response.status,
    text: typeof text === 'string' ? text : undefined,
    payload,
  }
}

async function callGemini(
  apiKey: string,
  request: ModelRequest,
): Promise<ProviderResult> {
  const contents: GeminiContent[] = []

  if (request.prompt) {
    const parts: GeminiPart[] = [{ text: request.prompt }]
    for (const dataUrl of request.images ?? []) {
      const image = parseDataUrl(dataUrl)
      if (image) {
        parts.push({ inlineData: image })
      }
    }
    contents.push({ role: 'user', parts })
  } else {
    for (const message of request.messages ?? []) {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })
    }
  }

  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature,
    maxOutputTokens: Math.max(request.maxTokens, 2048),
  }
  if (request.json) {
    generationConfig.responseMimeType = 'application/json'
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  }
  if (request.system) {
    body.systemInstruction = { parts: [{ text: request.system }] }
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(request.model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  const payload = await response.json().catch(() => ({}))
  const parts = payload?.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts)
    ? parts
        .filter((part: GeminiPart) => part && !part.thought && typeof part.text === 'string')
        .map((part: GeminiPart) => part.text)
        .join('')
        .trim()
    : ''

  return {
    ok: response.ok,
    status: response.status,
    text: text || undefined,
    payload,
  }
}

function requestError(provider: AiProvider, status: number, payload?: any, ownKey = false): string {
  const detail =
    typeof payload?.error?.message === 'string' ? payload.error.message : undefined

  if (status === 401 || status === 403) {
    if (ownKey) {
      return provider === 'gemini'
        ? 'Google AI Studio rejected your API key. Check it in Settings.'
        : 'OpenAI rejected your API key. Check it in Settings.'
    }
    return provider === 'gemini'
      ? 'Google AI Studio rejected the API key. Check GEMINI_API_KEY.'
      : 'OpenAI rejected the API key. Check OPENAI_API_KEY.'
  }
  if (status === 429) {
    return 'The AI rate limit was reached. Please try again shortly.'
  }
  if (status === 400) {
    return detail
      ? `The AI provider rejected the request: ${detail}`
      : 'The AI provider rejected the request. Please try again.'
  }
  return `AI request failed (${status}). Please try again.`
}

export async function handleAiRequest(body: AiRequestBody, env: AiEnv): Promise<AiResult> {
  const config = resolveRequestConfig(body, env)

  if (typeof body.apiKey === 'string' && body.apiKey.trim() && !config.ownKey) {
    return { status: 400, body: { error: 'That API key looks invalid. Paste the full key in Settings.' } }
  }

  if (!config.configured || !config.apiKey) {
    return {
      status: 503,
      body: {
        error:
          'The AI assistant is not configured yet. Add your own API key in Settings, or set GEMINI_API_KEY / OPENAI_API_KEY on the server and redeploy.',
      },
    }
  }

  const provider = config.provider
  const model = config.model
  const apiKey = config.apiKey
  const openAiConfig: ProviderConfig = { apiKey, baseUrl: config.ownKey ? undefined : config.baseUrl }

  try {
    if (body.mode === 'scan') {
      const images = (body.images ?? []).filter((entry) => typeof entry === 'string' && entry.startsWith('data:image/'))
      if (images.length === 0) {
        return { status: 400, body: { error: 'A photo is required for scanning.' } }
      }
      const kind = body.kind ?? 'label'
      const prompt = SCAN_PROMPTS[kind]
      if (!prompt) {
        return { status: 400, body: { error: 'Unknown scan type.' } }
      }

      const result =
        provider === 'gemini'
          ? await callGemini(apiKey, {
              model,
              temperature: 0.1,
              maxTokens: 2048,
              prompt,
              images,
              json: true,
            })
          : await callOpenAI(openAiConfig, {
              model,
              temperature: 0.1,
              maxTokens: 700,
              prompt,
              images,
              json: true,
            })

      if (!result.ok) {
        return {
          status: 502,
          body: { error: requestError(provider, result.status, result.payload, config.ownKey) },
        }
      }

      const data = result.text ? extractJson(result.text) : null
      if (!data) {
        return { status: 502, body: { error: 'The AI response could not be read. Try a clearer photo.' } }
      }
      return { status: 200, body: { data } }
    }

    const messages = (body.messages ?? [])
      .filter((message) => message && typeof message.content === 'string')
      .slice(-12)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })) as ModelMessage[]

    if (messages.length === 0) {
      return { status: 400, body: { error: 'A question is required.' } }
    }

    const system = buildChatSystem(body.context)
    const result =
      provider === 'gemini'
        ? await callGemini(apiKey, {
            model,
            temperature: 0.4,
            maxTokens: 4096,
            system,
            messages,
          })
        : await callOpenAI(openAiConfig, {
            model,
            temperature: 0.4,
            maxTokens: 900,
            system,
            messages,
          })

    if (!result.ok) {
      return {
        status: 502,
        body: { error: requestError(provider, result.status, result.payload, config.ownKey) },
      }
    }

    if (!result.text?.trim()) {
      return { status: 502, body: { error: 'The AI returned an empty response.' } }
    }

    return { status: 200, body: { text: result.text } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { status: 502, body: { error: `Could not reach the AI service: ${message}` } }
  }
}
