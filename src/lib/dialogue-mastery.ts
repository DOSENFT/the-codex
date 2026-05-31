// ---------------------------------------------------------------------------
// Dialogue Mastery System — Progressive training tracker for dialogue lines
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogueMastery {
  lineKey: string         // text hash or first 40 chars as key
  level: number           // 0=untrained, 1=guided, 2=solo, 3=improv
  practiceCount: number
  lastPracticed: number   // Date.now()
  ratings: ('nailed' | 'close' | 'off')[]  // last 10
}

export interface WarmupRecord {
  date: string            // ISO date string (YYYY-MM-DD)
  completed: boolean
  linesRehearsed: number
}

export interface MasteryBadge {
  id: string
  name: string
  description: string
  icon: string            // lucide icon name
  condition: (profile: MasteryProfile) => boolean
}

export interface MasteryProfile {
  characterId: string
  lines: DialogueMastery[]
  warmups: WarmupRecord[]
  warmupStreak: number
  bestStreak: number
  badges: string[]        // earned badge IDs
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MASTERY_LEVELS = ['Untrained', 'Guided', 'Solo', 'Improv'] as const

export const MASTERY_BADGES: MasteryBadge[] = [
  {
    id: 'first-social',
    name: 'First Social Line',
    description: 'Practice your first social dialogue line',
    icon: 'MessageSquare',
    condition: (p) => p.lines.some(l => l.practiceCount > 0),
  },
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    description: 'Practice 3 combat lines',
    icon: 'Sword',
    condition: (p) => p.lines.filter(l => l.practiceCount > 0).length >= 3,
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Practice 5 days in a row',
    icon: 'Flame',
    condition: (p) => p.warmupStreak >= 5,
  },
  {
    id: 'masterful',
    name: 'Masterful',
    description: 'Get a line to Improv level',
    icon: 'Crown',
    condition: (p) => p.lines.some(l => l.level >= 3),
  },
  {
    id: 'versatile',
    name: 'Versatile',
    description: 'Practice lines in 4 different contexts',
    icon: 'Compass',
    condition: (p) => p.lines.filter(l => l.practiceCount > 0).length >= 4,
  },
  {
    id: 'gold-standard',
    name: 'Gold Standard',
    description: 'Get 5 "Nailed It" ratings in a row',
    icon: 'Star',
    condition: (p) => {
      const all = p.lines.flatMap(l => l.ratings)
      for (let i = 0; i <= all.length - 5; i++) {
        if (all.slice(i, i + 5).every(r => r === 'nailed')) return true
      }
      return false
    },
  },
  {
    id: 'warming-up',
    name: 'Warming Up',
    description: 'Complete your first warmup',
    icon: 'Sunrise',
    condition: (p) => p.warmups.some(w => w.completed),
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 10 warmups',
    icon: 'Trophy',
    condition: (p) => p.warmups.filter(w => w.completed).length >= 10,
  },
]

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

/** Generate a stable key from dialogue text: normalized first 40 chars. */
export function lineKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'codex-dialogue-mastery-'

/** Load mastery profile from localStorage, or return a fresh one. */
export function loadMasteryProfile(characterId: string): MasteryProfile {
  const raw = localStorage.getItem(STORAGE_PREFIX + characterId)
  if (!raw) {
    return {
      characterId,
      lines: [],
      warmups: [],
      warmupStreak: 0,
      bestStreak: 0,
      badges: [],
    }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      characterId: parsed.characterId ?? characterId,
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      warmups: Array.isArray(parsed.warmups) ? parsed.warmups : [],
      warmupStreak: parsed.warmupStreak ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    }
  } catch {
    return {
      characterId,
      lines: [],
      warmups: [],
      warmupStreak: 0,
      bestStreak: 0,
      badges: [],
    }
  }
}

/** Persist mastery profile to localStorage. */
export function saveMasteryProfile(profile: MasteryProfile): void {
  localStorage.setItem(
    STORAGE_PREFIX + profile.characterId,
    JSON.stringify(profile),
  )
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Find the mastery record for a specific dialogue line by text. */
export function getMasteryForLine(
  profile: MasteryProfile,
  text: string,
): DialogueMastery | undefined {
  const key = lineKey(text)
  return profile.lines.find(l => l.lineKey === key)
}

// ---------------------------------------------------------------------------
// Mutation — Record Practice
// ---------------------------------------------------------------------------

/**
 * Record a practice attempt for a dialogue line.
 *
 * Auto-leveling rules:
 * - Level 0 -> 1: First practice
 * - Level 1 -> 2: 3 practices with at least 2 'nailed' or 'close' ratings
 * - Level 2 -> 3: 6 practices with at least 2 'nailed' ratings
 *
 * Returns a new profile (immutable).
 */
export function recordPractice(
  profile: MasteryProfile,
  text: string,
  rating: 'nailed' | 'close' | 'off',
): MasteryProfile {
  const key = lineKey(text)
  const existing = profile.lines.find(l => l.lineKey === key)

  let updatedLine: DialogueMastery

  if (existing) {
    const newRatings = [...existing.ratings, rating].slice(-10) // keep last 10
    const newCount = existing.practiceCount + 1
    let newLevel = existing.level

    // Auto-level logic
    if (newLevel === 0) {
      // Level 0 -> 1: First practice
      newLevel = 1
    } else if (newLevel === 1 && newCount >= 3) {
      // Level 1 -> 2: 3 practices with at least 2 'nailed' or 'close'
      const goodRatings = newRatings.filter(r => r === 'nailed' || r === 'close').length
      if (goodRatings >= 2) {
        newLevel = 2
      }
    } else if (newLevel === 2 && newCount >= 6) {
      // Level 2 -> 3: 6 practices with at least 2 'nailed'
      const nailedCount = newRatings.filter(r => r === 'nailed').length
      if (nailedCount >= 2) {
        newLevel = 3
      }
    }

    updatedLine = {
      ...existing,
      practiceCount: newCount,
      lastPracticed: Date.now(),
      ratings: newRatings,
      level: newLevel,
    }
  } else {
    // First time practicing this line
    updatedLine = {
      lineKey: key,
      level: 1, // auto-level 0 -> 1 on first practice
      practiceCount: 1,
      lastPracticed: Date.now(),
      ratings: [rating],
    }
  }

  const updatedLines = existing
    ? profile.lines.map(l => (l.lineKey === key ? updatedLine : l))
    : [...profile.lines, updatedLine]

  return {
    ...profile,
    lines: updatedLines,
  }
}

// ---------------------------------------------------------------------------
// Mastery Colors
// ---------------------------------------------------------------------------

/** Return a Tailwind color class for a mastery level. */
export function masteryColor(level: number): string {
  switch (level) {
    case 1:
      return 'text-ember' // bronze/ember
    case 2:
      return 'text-arcane' // silver/arcane
    case 3:
      return 'text-verdant' // gold/verdant
    default:
      return 'text-forge-2' // untrained
  }
}

/** Return a Tailwind bg color class for a mastery level dot fill. */
export function masteryBgColor(level: number): string {
  switch (level) {
    case 1:
      return 'bg-ember' // bronze/ember
    case 2:
      return 'bg-arcane' // silver/arcane
    case 3:
      return 'bg-verdant' // gold/verdant
    default:
      return 'bg-transparent' // untrained — border only
  }
}

// ---------------------------------------------------------------------------
// Badge Checking
// ---------------------------------------------------------------------------

/**
 * Check all badge conditions against the profile.
 * Adds newly earned badge IDs. Returns a new profile (immutable).
 */
export function checkBadges(profile: MasteryProfile): MasteryProfile {
  const newBadges = [...profile.badges]
  let changed = false

  for (const badge of MASTERY_BADGES) {
    if (!newBadges.includes(badge.id) && badge.condition(profile)) {
      newBadges.push(badge.id)
      changed = true
    }
  }

  if (!changed) return profile

  return {
    ...profile,
    badges: newBadges,
  }
}

// ---------------------------------------------------------------------------
// Warmup Streak Helpers
// ---------------------------------------------------------------------------

/** Calculate and update warmup streak based on warmup records. */
export function updateWarmupStreak(profile: MasteryProfile): MasteryProfile {
  const completedDates = profile.warmups
    .filter(w => w.completed)
    .map(w => w.date)
    .sort()
    .reverse() // most recent first

  if (completedDates.length === 0) {
    return { ...profile, warmupStreak: 0 }
  }

  // Calculate consecutive days from today backwards
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let checkDate = today

  for (let i = 0; i < 365; i++) {
    if (completedDates.includes(checkDate)) {
      streak++
      // Move to previous day
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().slice(0, 10)
    } else if (i === 0) {
      // Today isn't done yet, check if yesterday was
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().slice(0, 10)
      if (completedDates.includes(checkDate)) {
        streak++
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().slice(0, 10)
      } else {
        break
      }
    } else {
      break
    }
  }

  return {
    ...profile,
    warmupStreak: streak,
    bestStreak: Math.max(profile.bestStreak, streak),
  }
}

/** Record a completed warmup. Returns a new profile (immutable). */
export function recordWarmup(
  profile: MasteryProfile,
  linesRehearsed: number,
): MasteryProfile {
  const today = new Date().toISOString().slice(0, 10)
  const existing = profile.warmups.find(w => w.date === today)

  let updatedWarmups: WarmupRecord[]
  if (existing) {
    updatedWarmups = profile.warmups.map(w =>
      w.date === today
        ? { ...w, completed: true, linesRehearsed: w.linesRehearsed + linesRehearsed }
        : w,
    )
  } else {
    updatedWarmups = [
      ...profile.warmups,
      { date: today, completed: true, linesRehearsed },
    ]
  }

  const updatedProfile = { ...profile, warmups: updatedWarmups }
  return updateWarmupStreak(updatedProfile)
}
