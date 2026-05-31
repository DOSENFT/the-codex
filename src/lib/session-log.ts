import { generateId } from './character'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RPMoment {
  id: string
  type: 'speak' | 'react' | 'engage' | 'spark'
  text: string
  context?: string
  rating?: 'nailed' | 'close' | 'off'
  timestamp: number
}

export interface SessionRPLog {
  id: string
  characterId: string
  startedAt: number
  endedAt?: number
  moments: RPMoment[]
  patterns?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = 'codex-session-log-'
const MAX_LOGS_PER_CHARACTER = 20

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Load all session logs for a character from localStorage. */
export function loadSessionLogs(characterId: string): SessionRPLog[] {
  const raw = localStorage.getItem(LOG_PREFIX + characterId)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SessionRPLog[]
  } catch {
    return []
  }
}

/** Save session logs for a character, capping at MAX_LOGS_PER_CHARACTER. */
export function saveSessionLogs(characterId: string, logs: SessionRPLog[]): void {
  // Keep only the most recent logs
  const capped = logs.slice(-MAX_LOGS_PER_CHARACTER)
  localStorage.setItem(LOG_PREFIX + characterId, JSON.stringify(capped))
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/** Create a new empty session for a character. */
export function createSession(characterId: string): SessionRPLog {
  return {
    id: generateId(),
    characterId,
    startedAt: Date.now(),
    moments: [],
  }
}

/** Add a moment to an existing session log. Returns a new log object. */
export function addMoment(
  log: SessionRPLog,
  moment: Omit<RPMoment, 'id' | 'timestamp'>,
): SessionRPLog {
  const newMoment: RPMoment = {
    ...moment,
    id: generateId(),
    timestamp: Date.now(),
  }
  return {
    ...log,
    moments: [...log.moments, newMoment],
  }
}

/** End a session — stamps endedAt and computes pattern distribution percentages. */
export function endSession(log: SessionRPLog): SessionRPLog {
  const total = log.moments.length
  if (total === 0) {
    return {
      ...log,
      endedAt: Date.now(),
      patterns: { speak: 0, react: 0, engage: 0, spark: 0 },
    }
  }

  const counts: Record<string, number> = { speak: 0, react: 0, engage: 0, spark: 0 }
  for (const m of log.moments) {
    counts[m.type] = (counts[m.type] ?? 0) + 1
  }

  // Convert to percentages
  const patterns: Record<string, number> = {}
  for (const key of Object.keys(counts)) {
    patterns[key] = Math.round((counts[key] / total) * 100)
  }

  return {
    ...log,
    endedAt: Date.now(),
    patterns,
  }
}
