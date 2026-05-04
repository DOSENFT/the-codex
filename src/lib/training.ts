// ---------------------------------------------------------------------------
// Training Academy — Persistence, XP, Spaced Repetition (SM-2)
// ---------------------------------------------------------------------------

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuizRecord {
  id: string
  category: string
  difficulty: 'apprentice' | 'journeyman' | 'master'
  correct: boolean
  timestamp: string
}

export interface DrillRecord {
  id: string
  scene: string
  score: number
  timestamp: string
}

export interface FlashcardProgress {
  cardId: string
  easeFactor: number     // SM-2: starts at 2.5
  interval: number       // days until next review
  repetitions: number    // consecutive correct
  nextReviewDate: string // ISO date string
  lastRating?: 'again' | 'hard' | 'good' | 'easy'
}

export interface TrainingProfile {
  characterId: string
  quizHistory: QuizRecord[]
  quizStreaks: { current: number; best: number }
  drillHistory: DrillRecord[]
  flashcardProgress: FlashcardProgress[]
  totalXP: number
  level: number
  weakCategories: string[]
  lastSessionDate: string
  totalSessions: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = 'codex-training-'

/** Quadratic XP thresholds: L1=0, L2=100, L3=300 ... L10=4500 */
const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]

const XP_BY_DIFFICULTY: Record<string, number> = {
  apprentice: 10,
  journeyman: 20,
  master: 30,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + Math.round(days))
  return d.toISOString().split('T')[0]
}

/* ------------------------------------------------------------------ */
/*  Core Functions                                                     */
/* ------------------------------------------------------------------ */

/** Create a blank training profile for a character. */
function createDefaultProfile(characterId: string): TrainingProfile {
  return {
    characterId,
    quizHistory: [],
    quizStreaks: { current: 0, best: 0 },
    drillHistory: [],
    flashcardProgress: [],
    totalXP: 0,
    level: 1,
    weakCategories: [],
    lastSessionDate: todayISO(),
    totalSessions: 0,
  }
}

/** Load training profile from localStorage. Returns default if not found. */
export function loadTrainingProfile(characterId: string): TrainingProfile {
  const key = STORAGE_PREFIX + characterId
  const raw = localStorage.getItem(key)
  if (!raw) return createDefaultProfile(characterId)
  try {
    const parsed = JSON.parse(raw) as TrainingProfile
    // Ensure all fields exist (migration safety)
    return {
      characterId: parsed.characterId ?? characterId,
      quizHistory: parsed.quizHistory ?? [],
      quizStreaks: parsed.quizStreaks ?? { current: 0, best: 0 },
      drillHistory: parsed.drillHistory ?? [],
      flashcardProgress: parsed.flashcardProgress ?? [],
      totalXP: parsed.totalXP ?? 0,
      level: parsed.level ?? computeTrainingLevel(parsed.totalXP ?? 0),
      weakCategories: parsed.weakCategories ?? [],
      lastSessionDate: parsed.lastSessionDate ?? todayISO(),
      totalSessions: parsed.totalSessions ?? 0,
    }
  } catch {
    return createDefaultProfile(characterId)
  }
}

/** Persist training profile to localStorage. */
export function saveTrainingProfile(profile: TrainingProfile): void {
  const key = STORAGE_PREFIX + profile.characterId
  localStorage.setItem(key, JSON.stringify(profile))
}

/* ------------------------------------------------------------------ */
/*  XP & Level                                                         */
/* ------------------------------------------------------------------ */

/** Compute level from total XP. L1=0, L2=100, L3=300 ... L10=4500. */
export function computeTrainingLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 1; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i
  }
  return 1
}

/** Returns XP threshold for a given level. */
export function xpForLevel(level: number): number {
  if (level < 1) return 0
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  return LEVEL_THRESHOLDS[level]
}

/** Award XP for a quiz answer. Updates streak and level. */
export function awardQuizXP(
  profile: TrainingProfile,
  difficulty: string,
  correct: boolean,
): TrainingProfile {
  if (!correct) {
    return {
      ...profile,
      quizStreaks: { current: 0, best: profile.quizStreaks.best },
    }
  }

  const xpGain = XP_BY_DIFFICULTY[difficulty] ?? 10
  const totalXP = profile.totalXP + xpGain
  const newCurrent = profile.quizStreaks.current + 1
  const best = Math.max(newCurrent, profile.quizStreaks.best)

  return {
    ...profile,
    totalXP,
    level: computeTrainingLevel(totalXP),
    quizStreaks: { current: newCurrent, best },
  }
}

/** Award XP for a drill completion. Score x5 XP. */
export function awardDrillXP(profile: TrainingProfile, score: number): TrainingProfile {
  const xpGain = Math.max(0, Math.round(score * 5))
  const totalXP = profile.totalXP + xpGain
  return {
    ...profile,
    totalXP,
    level: computeTrainingLevel(totalXP),
  }
}

/* ------------------------------------------------------------------ */
/*  Spaced Repetition (SM-2 Algorithm)                                 */
/* ------------------------------------------------------------------ */

/** Create a new flashcard progress entry. */
export function createFlashcardProgress(cardId: string): FlashcardProgress {
  return {
    cardId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: todayISO(),
  }
}

/**
 * SM-2 spaced repetition algorithm.
 * Updates interval, ease factor, and repetitions based on user rating.
 */
export function reviewFlashcard(
  progress: FlashcardProgress,
  rating: 'again' | 'hard' | 'good' | 'easy',
): FlashcardProgress {
  let { easeFactor, interval, repetitions } = progress

  switch (rating) {
    case 'again':
      repetitions = 0
      interval = 1
      easeFactor = Math.max(1.3, easeFactor - 0.2)
      break

    case 'hard':
      repetitions += 1
      if (repetitions === 1) {
        interval = 1
      } else if (repetitions === 2) {
        interval = 6
      } else {
        interval = Math.round(interval * 1.2)
      }
      easeFactor = Math.max(1.3, easeFactor - 0.15)
      break

    case 'good':
      repetitions += 1
      if (repetitions === 1) {
        interval = 1
      } else if (repetitions === 2) {
        interval = 6
      } else {
        interval = Math.round(interval * easeFactor)
      }
      // easeFactor unchanged
      break

    case 'easy':
      repetitions += 1
      if (repetitions === 1) {
        interval = 1
      } else if (repetitions === 2) {
        interval = 6
      } else {
        interval = Math.round(interval * easeFactor * 1.3)
      }
      easeFactor = easeFactor + 0.15
      break
  }

  const nextReviewDate = addDays(todayISO(), interval)

  return {
    ...progress,
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastRating: rating,
  }
}

/** Returns flashcards where nextReviewDate <= today. */
export function getDueFlashcards(progress: FlashcardProgress[]): FlashcardProgress[] {
  const today = todayISO()
  return progress.filter((card) => card.nextReviewDate <= today)
}

/* ------------------------------------------------------------------ */
/*  Adaptive Difficulty                                                 */
/* ------------------------------------------------------------------ */

/**
 * Suggest difficulty based on quiz history accuracy.
 * After 10+ questions: >80% → master, 50-80% → journeyman, <50% → apprentice.
 * With category filter optional.
 */
export function suggestDifficulty(
  history: QuizRecord[],
  category?: string,
): 'apprentice' | 'journeyman' | 'master' {
  const relevant = category
    ? history.filter((r) => r.category === category)
    : history

  if (relevant.length < 10) return 'apprentice'

  const correctCount = relevant.filter((r) => r.correct).length
  const accuracy = correctCount / relevant.length

  if (accuracy > 0.8) return 'master'
  if (accuracy >= 0.5) return 'journeyman'
  return 'apprentice'
}

/**
 * Identify categories with <60% accuracy (minimum 5 questions in category).
 */
export function identifyWeakCategories(history: QuizRecord[]): string[] {
  const catMap = new Map<string, { correct: number; total: number }>()

  for (const record of history) {
    const entry = catMap.get(record.category) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (record.correct) entry.correct += 1
    catMap.set(record.category, entry)
  }

  const weak: string[] = []
  for (const [category, stats] of catMap.entries()) {
    if (stats.total >= 5 && stats.correct / stats.total < 0.6) {
      weak.push(category)
    }
  }

  return weak
}

/* ------------------------------------------------------------------ */
/*  Record Entries                                                      */
/* ------------------------------------------------------------------ */

/** Record a quiz answer — adds record, updates streak, awards XP, recalculates weak categories. */
export function recordQuiz(
  profile: TrainingProfile,
  category: string,
  difficulty: string,
  correct: boolean,
): TrainingProfile {
  const record: QuizRecord = {
    id: generateRecordId(),
    category,
    difficulty: difficulty as QuizRecord['difficulty'],
    correct,
    timestamp: new Date().toISOString(),
  }

  const updatedHistory = [...profile.quizHistory, record]
  const today = todayISO()
  const isNewSession = profile.lastSessionDate !== today

  let updated: TrainingProfile = {
    ...profile,
    quizHistory: updatedHistory,
    lastSessionDate: today,
    totalSessions: isNewSession ? profile.totalSessions + 1 : profile.totalSessions,
  }

  // Award XP and update streaks
  updated = awardQuizXP(updated, difficulty, correct)

  // Recalculate weak categories
  updated = {
    ...updated,
    weakCategories: identifyWeakCategories(updatedHistory),
  }

  return updated
}

/** Record a drill completion — adds record, awards XP. */
export function recordDrill(
  profile: TrainingProfile,
  scene: string,
  score: number,
): TrainingProfile {
  const record: DrillRecord = {
    id: generateRecordId(),
    scene,
    score,
    timestamp: new Date().toISOString(),
  }

  const today = todayISO()
  const isNewSession = profile.lastSessionDate !== today

  let updated: TrainingProfile = {
    ...profile,
    drillHistory: [...profile.drillHistory, record],
    lastSessionDate: today,
    totalSessions: isNewSession ? profile.totalSessions + 1 : profile.totalSessions,
  }

  // Award XP
  updated = awardDrillXP(updated, score)

  return updated
}
