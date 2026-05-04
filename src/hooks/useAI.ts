import { useState, useCallback } from 'react'
import { queryAI, queryAIStructured } from '../lib/ai'

interface UseAIReturn {
  response: string | null
  loading: boolean
  error: string | null
  query: (systemPrompt: string, message: string) => Promise<string>
  queryStructured: <T>(systemPrompt: string, message: string) => Promise<T>
  clearResponse: () => void
}

export function useAI(): UseAIReturn {
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useCallback(async (systemPrompt: string, message: string): Promise<string> => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryAI(systemPrompt, message)
      setResponse(result)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI query failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const queryStructuredFn = useCallback(async <T>(systemPrompt: string, message: string): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryAIStructured<T>(systemPrompt, message)
      setResponse(JSON.stringify(result))
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI query failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResponse = useCallback(() => {
    setResponse(null)
    setError(null)
  }, [])

  return { response, loading, error, query, queryStructured: queryStructuredFn, clearResponse }
}
