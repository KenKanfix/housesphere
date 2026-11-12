export interface AiEnv {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  OPENAI_BASE_URL?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiRequestBody {
  mode?: 'chat' | 'scan'
  messages?: ChatMessage[]
  context?: string
  kind?: 'label' | 'receipt' | 'manual'
  image?: string
}

export interface AiResult {
  status: number
  body: Record<string, unknown>
}

const DEFAULT_MODEL = 'gpt-4o-mini'

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
  receipt: `You are reading a photo of a purchase receipt, invoice or bill.
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

async function callOpenAI(
  env: AiEnv,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: any }> {
  const baseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload }
}

export async function handleAiRequest(body: AiRequestBody, env: AiEnv): Promise<AiResult> {
  if (!env.OPENAI_API_KEY) {
    return {
      status: 503,
      body: {
        error:
          'The AI assistant is not configured yet. Add OPENAI_API_KEY to your environment (see .env.example) and redeploy.',
      },
    }
  }

  const model = env.OPENAI_MODEL || DEFAULT_MODEL

  try {
    if (body.mode === 'scan') {
      if (!body.image || !body.image.startsWith('data:image/')) {
        return { status: 400, body: { error: 'A photo is required for scanning.' } }
      }
      const kind = body.kind ?? 'label'
      const prompt = SCAN_PROMPTS[kind]
      if (!prompt) {
        return { status: 400, body: { error: 'Unknown scan type.' } }
      }

      const result = await callOpenAI(env, {
        model,
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: body.image, detail: 'high' } },
            ],
          },
        ],
      })

      if (!result.ok) {
        return {
          status: result.status === 401 ? 502 : 502,
          body: {
            error:
              result.status === 401
                ? 'OpenAI rejected the API key. Check OPENAI_API_KEY.'
                : `AI request failed (${result.status}). Please try again.`,
          },
        }
      }

      const text = result.payload?.choices?.[0]?.message?.content ?? ''
      const data = extractJson(text)
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
      }))

    if (messages.length === 0) {
      return { status: 400, body: { error: 'A question is required.' } }
    }

    const result = await callOpenAI(env, {
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: 'system', content: buildChatSystem(body.context) },
        ...messages,
      ],
    })

    if (!result.ok) {
      return {
        status: 502,
        body: {
          error:
            result.status === 401
              ? 'OpenAI rejected the API key. Check OPENAI_API_KEY.'
              : `AI request failed (${result.status}). Please try again.`,
        },
      }
    }

    const text = result.payload?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      return { status: 502, body: { error: 'The AI returned an empty response.' } }
    }

    return { status: 200, body: { text } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { status: 502, body: { error: `Could not reach the AI service: ${message}` } }
  }
}
