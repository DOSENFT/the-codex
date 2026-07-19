export type AIProvider = 'gemini' | 'ollama'

// Available Gemini models (each has its own separate free-tier quota)
export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fastest, best quality' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Lightweight, separate quota' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Stable, separate quota' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', description: 'Smallest, highest limits' },
] as const

export interface AIConfig {
  provider: AIProvider
  geminiApiKey?: string
  geminiModel?: string
  ollamaUrl?: string
  ollamaModel?: string
  /** When true, if the primary provider fails with a network error, try the other */
  fallbackEnabled?: boolean
}

/** Resolve the Ollama URL: use the proxy path when accessed remotely. */
export function getDefaultOllamaUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // If not on localhost/LAN, use the same-origin proxy to avoid CORS
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
      return `${window.location.origin}/ollama`
    }
  }
  return 'http://192.168.1.174:11434'
}

// Load/save config from localStorage
export function loadAIConfig(): AIConfig {
  const saved = localStorage.getItem('codex-ai-config')
  if (saved) {
    const parsed = JSON.parse(saved)
    // Migration: default fallback to true
    if (parsed.fallbackEnabled === undefined) parsed.fallbackEnabled = true
    // Migration: swap direct Ollama URL for proxy when accessed remotely
    if (parsed.ollamaUrl && parsed.ollamaUrl.includes('192.168.') && typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
        parsed.ollamaUrl = `${window.location.origin}/ollama`
      }
    }
    return parsed
  }
  return {
    provider: 'ollama',
    geminiModel: 'gemini-2.0-flash',
    ollamaUrl: getDefaultOllamaUrl(),
    ollamaModel: 'gemma3-27b-abliterated:latest',
    fallbackEnabled: true,
  }
}

// Fetch available models from an Ollama instance
export async function fetchOllamaModels(url: string): Promise<Array<{ name: string; size: string; family: string }>> {
  const response = await fetch(`${url}/api/tags`)
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
  const data = await response.json()
  return (data.models ?? []).map((m: { name: string; size: number; details?: { family?: string; parameter_size?: string } }) => ({
    name: m.name,
    size: m.details?.parameter_size ?? `${Math.round(m.size / 1024 / 1024 / 1024)}GB`,
    family: m.details?.family ?? 'unknown',
  }))
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem('codex-ai-config', JSON.stringify(config))
}

/** Returns true if an error looks like a network/connection failure (not an API error). */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true // fetch() throws TypeError on network failure
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('timeout') ||
      msg.includes('abort')
  }
  return false
}

/** Track which provider actually served the last request (for UI feedback). */
let _lastUsedProvider: AIProvider | null = null
export function getLastUsedProvider(): AIProvider | null { return _lastUsedProvider }

// Main query function — with automatic fallback
export async function queryAI(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig
): Promise<string> {
  const cfg = config || loadAIConfig()

  const primaryQuery = cfg.provider === 'gemini'
    ? () => queryGemini(cfg.geminiApiKey!, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage)
    : () => queryOllama(cfg.ollamaUrl!, cfg.ollamaModel!, systemPrompt, userMessage)

  try {
    const result = await primaryQuery()
    _lastUsedProvider = cfg.provider
    return result
  } catch (primaryErr) {
    // Only fallback on network errors, not API errors (rate limits, bad keys, etc.)
    const canFallback = cfg.fallbackEnabled !== false &&
      isNetworkError(primaryErr) &&
      cfg.provider === 'ollama'
        ? !!cfg.geminiApiKey  // need a Gemini key to fall back to Gemini
        : !!cfg.ollamaUrl     // need an Ollama URL to fall back to Ollama

    if (!canFallback) throw primaryErr

    const fallbackProvider: AIProvider = cfg.provider === 'gemini' ? 'ollama' : 'gemini'
    try {
      const result = fallbackProvider === 'gemini'
        ? await queryGemini(cfg.geminiApiKey!, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage)
        : await queryOllama(cfg.ollamaUrl!, cfg.ollamaModel!, systemPrompt, userMessage)
      _lastUsedProvider = fallbackProvider
      return result
    } catch {
      // Fallback also failed — throw the original error (more useful to the user)
      throw primaryErr
    }
  }
}

// Gemini implementation with auto-retry on rate limits
async function queryGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  attempt = 0,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (response.status === 429 && attempt < 2) {
    // Parse retry delay from response, default 15s
    let waitMs = 15_000
    try {
      const errData = await response.json()
      const retryInfo = errData.error?.details?.find(
        (d: { '@type': string }) => d['@type']?.includes('RetryInfo'),
      )
      if (retryInfo?.retryDelay) {
        const seconds = parseInt(retryInfo.retryDelay, 10)
        if (seconds > 0 && seconds <= 60) waitMs = seconds * 1000
      }
    } catch { /* use default */ }

    await new Promise((r) => setTimeout(r, waitMs))
    return queryGemini(apiKey, model, systemPrompt, userMessage, attempt + 1)
  }

  if (!response.ok) {
    const errText = await response.text()

    // Human-readable error messages
    if (response.status === 429) {
      throw new Error(
        `Rate limited on ${model}. Your free-tier quota is exhausted. Try switching to a different model in Settings — each model has its own quota.`,
      )
    }
    if (response.status === 400 && errText.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key. Check your key at aistudio.google.com/apikey')
    }
    if (response.status === 403) {
      throw new Error('API key does not have permission. Make sure the Generative Language API is enabled.')
    }

    throw new Error(`Gemini error (${response.status}): ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
}

// Ollama implementation
async function queryOllama(url: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      options: { temperature: 0.3 },
    }),
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)

  const data = await response.json()
  return data.message?.content || 'No response generated'
}

/* ─── Streaming ───
   Words arrive as they're thought. The stream carries the same prompts and
   the same fallback doctrine as queryAI: if nothing has arrived yet and the
   primary path dies, we fall back to the full non-streaming pipeline (which
   already knows how to switch providers, retry rate limits, and speak
   human-readable errors). If a stream dies mid-sentence, we surface it. */

/** Ollama chat with stream:true — NDJSON lines, each carrying a content delta */
async function streamOllama(
  url: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  onText: (fullText: string) => void,
): Promise<string> {
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      options: { temperature: 0.3 },
    }),
  })
  if (!response.ok || !response.body) throw new Error(`Ollama error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const chunk = JSON.parse(line)
        const delta = chunk.message?.content
        if (delta) {
          full += delta
          onText(full)
        }
      } catch { /* incomplete line — wait for more */ }
    }
  }
  return full || 'No response generated'
}

/** Gemini streamGenerateContent over SSE */
async function streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  onText: (fullText: string) => void,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  })
  if (!response.ok || !response.body) {
    if (response.status === 429) {
      throw new Error(
        `Rate limited on ${model}. Your free-tier quota is exhausted. Try switching to a different model in Settings — each model has its own quota.`,
      )
    }
    throw new Error(`Gemini error (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload)
        const delta = chunk.candidates?.[0]?.content?.parts?.[0]?.text
        if (delta) {
          full += delta
          onText(full)
        }
      } catch { /* partial SSE frame */ }
    }
  }
  return full || 'No response generated'
}

/**
 * Streaming query. Calls onText with the accumulated text as it grows.
 * Falls back to the full non-streaming pipeline if the stream fails
 * before any text has arrived.
 */
export async function queryAIStream(
  systemPrompt: string,
  userMessage: string,
  onText: (fullText: string) => void,
  config?: AIConfig,
): Promise<string> {
  const cfg = config || loadAIConfig()
  let received = false
  const guardedOnText = (text: string) => {
    received = true
    onText(text)
  }

  try {
    const result = cfg.provider === 'gemini'
      ? await streamGemini(cfg.geminiApiKey!, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage, guardedOnText)
      : await streamOllama(cfg.ollamaUrl!, cfg.ollamaModel!, systemPrompt, userMessage, guardedOnText)
    _lastUsedProvider = cfg.provider
    return result
  } catch (err) {
    if (received) throw err // died mid-sentence — surface it honestly
    // Nothing arrived: hand over to the proven non-streaming path
    const result = await queryAI(systemPrompt, userMessage, cfg)
    onText(result)
    return result
  }
}

// Structured query that parses JSON response
export async function queryAIStructured<T>(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig
): Promise<T> {
  const result = await queryAI(
    systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the JSON object/array.',
    userMessage,
    config,
  )

  // Strip markdown code blocks if AI includes them anyway
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}
