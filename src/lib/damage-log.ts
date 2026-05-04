import { generateId } from './character'

export interface DamageEntry {
  timestamp: string
  source: string        // spell/weapon/ability name
  damageType: string    // fire, radiant, slashing, etc.
  amount: number
  target?: string       // optional target name
  critical: boolean
}

export interface CombatLog {
  id: string
  startedAt: string
  endedAt?: string
  entries: DamageEntry[]
  totalDamage: number
}

const STORAGE_PREFIX = 'codex-damage-'
const MAX_LOGS = 20

export function createCombatLog(): CombatLog {
  return {
    id: generateId(),
    startedAt: new Date().toISOString(),
    entries: [],
    totalDamage: 0,
  }
}

export function logDamage(log: CombatLog, entry: Omit<DamageEntry, 'timestamp'>): CombatLog {
  const newEntry: DamageEntry = { ...entry, timestamp: new Date().toISOString() }
  const entries = [...log.entries, newEntry]
  return { ...log, entries, totalDamage: entries.reduce((sum, e) => sum + e.amount, 0) }
}

export function endCombatLog(log: CombatLog): CombatLog {
  return { ...log, endedAt: new Date().toISOString() }
}

export function getDamageBreakdown(log: CombatLog): { type: string; total: number; percentage: number }[] {
  const byType = new Map<string, number>()
  for (const entry of log.entries) {
    byType.set(entry.damageType, (byType.get(entry.damageType) ?? 0) + entry.amount)
  }
  const total = log.totalDamage || 1
  return Array.from(byType.entries())
    .map(([type, sum]) => ({ type, total: sum, percentage: Math.round((sum / total) * 100) }))
    .sort((a, b) => b.total - a.total)
}

export function getTopSources(log: CombatLog): { source: string; total: number; count: number; avgDamage: number }[] {
  const bySource = new Map<string, { total: number; count: number }>()
  for (const entry of log.entries) {
    const prev = bySource.get(entry.source) ?? { total: 0, count: 0 }
    bySource.set(entry.source, { total: prev.total + entry.amount, count: prev.count + 1 })
  }
  return Array.from(bySource.entries())
    .map(([source, stats]) => ({
      source,
      total: stats.total,
      count: stats.count,
      avgDamage: Math.round((stats.total / stats.count) * 10) / 10,
    }))
    .sort((a, b) => b.total - a.total)
}

export function getAverageDPR(log: CombatLog, rounds: number): number {
  if (rounds <= 0) return 0
  return Math.round((log.totalDamage / rounds) * 10) / 10
}

// Persistence
export function saveDamageLogs(characterId: string, logs: CombatLog[]): void {
  localStorage.setItem(STORAGE_PREFIX + characterId, JSON.stringify(logs.slice(-MAX_LOGS)))
}

export function loadDamageLogs(characterId: string): CombatLog[] {
  const raw = localStorage.getItem(STORAGE_PREFIX + characterId)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CombatLog[]
  } catch {
    return []
  }
}
