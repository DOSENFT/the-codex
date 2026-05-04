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
}

// Load/save config from localStorage
export function loadAIConfig(): AIConfig {
  const saved = localStorage.getItem('codex-ai-config')
  if (saved) return JSON.parse(saved)
  return {
    provider: 'ollama',
    geminiModel: 'gemini-2.0-flash',
    ollamaUrl: 'http://192.168.1.174:11434',
    ollamaModel: 'gemma3-27b-abliterated:latest',
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

// Main query function
export async function queryAI(
  systemPrompt: string,
  userMessage: string,
  config?: AIConfig
): Promise<string> {
  const cfg = config || loadAIConfig()

  if (cfg.provider === 'gemini') {
    return queryGemini(cfg.geminiApiKey!, cfg.geminiModel || 'gemini-2.0-flash', systemPrompt, userMessage)
  } else {
    return queryOllama(cfg.ollamaUrl!, cfg.ollamaModel!, systemPrompt, userMessage)
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
