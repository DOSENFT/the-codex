import { ACCENT_PROFILES, type AccentProfile } from './accent-data'
import { saveOrAnnounce } from './character'

// ---------------------------------------------------------------------------
// Voice Parameter Definitions
// ---------------------------------------------------------------------------

export interface VoiceSliderDef {
  key: keyof VoiceParams
  label: string
  lowLabel: string
  highLabel: string
}

export interface VoiceParams {
  gravel: number       // 0 = silk, 100 = gravel
  breathiness: number  // 0 = clear, 100 = airy
  resonance: number    // 0 = head voice, 100 = chest voice
  age: number          // 0 = youthful, 100 = ancient
  tension: number      // 0 = relaxed, 100 = tight
  nobility: number     // 0 = street, 100 = royal
  menace: number       // 0 = warm, 100 = threatening
  warmth: number       // 0 = cold, 100 = inviting
  madness: number      // 0 = stable, 100 = unhinged
  exhaustion: number   // 0 = fresh, 100 = haggard
  confidence: number   // 0 = meek, 100 = commanding
  intelligence: number // 0 = simple, 100 = erudite
  speed: number        // 0 = deliberate, 100 = rapid
}

export const VOICE_SLIDERS: VoiceSliderDef[] = [
  { key: 'gravel', label: 'Gravel', lowLabel: 'Silk', highLabel: 'Gravel' },
  { key: 'breathiness', label: 'Breathiness', lowLabel: 'Clear', highLabel: 'Airy' },
  { key: 'resonance', label: 'Resonance', lowLabel: 'Head', highLabel: 'Chest' },
  { key: 'age', label: 'Age', lowLabel: 'Youthful', highLabel: 'Ancient' },
  { key: 'tension', label: 'Tension', lowLabel: 'Relaxed', highLabel: 'Tight' },
  { key: 'nobility', label: 'Nobility', lowLabel: 'Street', highLabel: 'Royal' },
  { key: 'menace', label: 'Menace', lowLabel: 'Warm', highLabel: 'Threatening' },
  { key: 'warmth', label: 'Warmth', lowLabel: 'Cold', highLabel: 'Inviting' },
  { key: 'madness', label: 'Madness', lowLabel: 'Stable', highLabel: 'Unhinged' },
  { key: 'exhaustion', label: 'Exhaustion', lowLabel: 'Fresh', highLabel: 'Haggard' },
  { key: 'confidence', label: 'Confidence', lowLabel: 'Meek', highLabel: 'Commanding' },
  { key: 'intelligence', label: 'Intelligence', lowLabel: 'Simple', highLabel: 'Erudite' },
  { key: 'speed', label: 'Speed', lowLabel: 'Deliberate', highLabel: 'Rapid' },
]

export const DEFAULT_PARAMS: VoiceParams = {
  gravel: 30,
  breathiness: 20,
  resonance: 50,
  age: 40,
  tension: 30,
  nobility: 40,
  menace: 20,
  warmth: 60,
  madness: 10,
  exhaustion: 10,
  confidence: 50,
  intelligence: 50,
  speed: 45,
}

// ---------------------------------------------------------------------------
// Voice Profile
// ---------------------------------------------------------------------------

export interface VoiceProfile {
  id: string
  name: string
  params: VoiceParams
  linkedCharacterId?: string
  suggestedAccentId?: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface VoicePreset {
  id: string
  name: string
  description: string
  params: VoiceParams
  suggestedAccentId?: string
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'tavern-keeper',
    name: 'Tavern Keeper',
    description: 'Boisterous, warm, slightly rough from years of shouting over rowdy patrons.',
    params: {
      gravel: 45, breathiness: 15, resonance: 70, age: 55,
      tension: 25, nobility: 20, menace: 15, warmth: 85,
      madness: 5, exhaustion: 30, confidence: 70, intelligence: 40, speed: 55,
    },
    suggestedAccentId: 'dwarven',
  },
  {
    id: 'noble-villain',
    name: 'Noble Villain',
    description: 'Silky smooth with razor precision. Every word is a veiled threat.',
    params: {
      gravel: 15, breathiness: 30, resonance: 60, age: 50,
      tension: 70, nobility: 95, menace: 85, warmth: 10,
      madness: 25, exhaustion: 5, confidence: 90, intelligence: 85, speed: 30,
    },
    suggestedAccentId: 'noble',
  },
  {
    id: 'ancient-dragon',
    name: 'Ancient Dragon',
    description: 'Deep, resonant, impossibly slow. Each word trembles with eons of power.',
    params: {
      gravel: 70, breathiness: 25, resonance: 95, age: 100,
      tension: 40, nobility: 80, menace: 75, warmth: 15,
      madness: 10, exhaustion: 5, confidence: 100, intelligence: 90, speed: 15,
    },
    suggestedAccentId: 'draconic',
  },
  {
    id: 'street-urchin',
    name: 'Street Urchin',
    description: 'Fast, clipped, always looking over their shoulder. Charming when needed.',
    params: {
      gravel: 10, breathiness: 15, resonance: 30, age: 15,
      tension: 55, nobility: 5, menace: 10, warmth: 50,
      madness: 15, exhaustion: 25, confidence: 35, intelligence: 45, speed: 80,
    },
    suggestedAccentId: 'cockney',
  },
  {
    id: 'mad-wizard',
    name: 'Mad Wizard',
    description: 'Manic, unpredictable pitch swings. Brilliant but barely holding it together.',
    params: {
      gravel: 30, breathiness: 40, resonance: 40, age: 70,
      tension: 80, nobility: 50, menace: 45, warmth: 20,
      madness: 90, exhaustion: 60, confidence: 55, intelligence: 95, speed: 70,
    },
    suggestedAccentId: 'fey',
  },
  {
    id: 'war-general',
    name: 'War General',
    description: 'Measured, commanding, built for battlefields. Speaks in declarations, not requests.',
    params: {
      gravel: 55, breathiness: 5, resonance: 85, age: 55,
      tension: 50, nobility: 70, menace: 60, warmth: 25,
      madness: 5, exhaustion: 20, confidence: 95, intelligence: 65, speed: 40,
    },
    suggestedAccentId: 'german',
  },
  {
    id: 'fey-trickster',
    name: 'Fey Trickster',
    description: 'Lilting, playful, constantly shifting. You never know if they\'re joking or deadly serious.',
    params: {
      gravel: 5, breathiness: 55, resonance: 25, age: 30,
      tension: 30, nobility: 60, menace: 35, warmth: 65,
      madness: 50, exhaustion: 0, confidence: 70, intelligence: 75, speed: 65,
    },
    suggestedAccentId: 'fey',
  },
  {
    id: 'undead-horror',
    name: 'Undead Horror',
    description: 'Hollow, rattling, each word pulled from beyond the grave. Pauses between words.',
    params: {
      gravel: 80, breathiness: 70, resonance: 75, age: 95,
      tension: 60, nobility: 35, menace: 90, warmth: 0,
      madness: 40, exhaustion: 85, confidence: 60, intelligence: 50, speed: 10,
    },
    suggestedAccentId: 'undead',
  },
]

// ---------------------------------------------------------------------------
// Derived Voice Description (for AI prompts)
// ---------------------------------------------------------------------------

function describeRange(value: number, low: string, mid: string, high: string): string {
  if (value <= 25) return low
  if (value <= 75) return mid
  return high
}

/** Convert voice parameters to a natural language description for AI prompts. */
export function describeVoice(params: VoiceParams): string {
  const parts: string[] = []

  // Core vocal quality
  const gravel = describeRange(params.gravel, 'silky smooth', 'slightly rough', 'gravelly and textured')
  const breath = describeRange(params.breathiness, 'clear and focused', 'natural breathing', 'breathy and airy')
  parts.push(`Voice quality: ${gravel}, ${breath}`)

  // Resonance + age
  const res = describeRange(params.resonance, 'light and head-placed', 'balanced resonance', 'deep chest voice')
  const age = describeRange(params.age, 'youthful', 'middle-aged', 'elderly or ancient')
  parts.push(`${res}, sounding ${age}`)

  // Emotional character
  const tension = describeRange(params.tension, 'relaxed and easy', 'moderate tension', 'tight and strained')
  const menace = describeRange(params.menace, 'warm and approachable', 'with an edge', 'overtly threatening')
  parts.push(`Delivery is ${tension}, ${menace}`)

  // Social register
  const noble = describeRange(params.nobility, 'common and street-level', 'educated but accessible', 'aristocratic and refined')
  const intel = describeRange(params.intelligence, 'simple vocabulary', 'articulate', 'scholarly and erudite')
  parts.push(`Social register: ${noble}, ${intel}`)

  // Personality
  const warmth = describeRange(params.warmth, 'cold and distant', 'measured warmth', 'genuinely warm and inviting')
  const conf = describeRange(params.confidence, 'uncertain and hesitant', 'self-assured', 'commanding and authoritative')
  parts.push(`Personality: ${warmth}, ${conf}`)

  // Quirks
  if (params.madness > 50) {
    parts.push(`Mental state: ${describeRange(params.madness, '', 'slightly erratic', 'unhinged and unpredictable')}`)
  }
  if (params.exhaustion > 50) {
    parts.push(`Physical state: ${describeRange(params.exhaustion, '', 'weary', 'haggard and barely standing')}`)
  }

  // Pacing
  const speed = describeRange(params.speed, 'very slow and deliberate', 'moderate pace', 'rapid-fire delivery')
  parts.push(`Speaking pace: ${speed}`)

  return parts.join('. ') + '.'
}

/** Derive vocabulary level from params. */
export function deriveVocabularyLevel(params: VoiceParams): 'simple' | 'moderate' | 'ornate' {
  const score = (params.intelligence * 0.5) + (params.nobility * 0.3) + ((100 - params.speed) * 0.2)
  if (score <= 35) return 'simple'
  if (score <= 65) return 'moderate'
  return 'ornate'
}

/** Derive sentence structure from params. */
export function deriveSentenceStructure(params: VoiceParams): 'choppy' | 'flowing' | 'complex' {
  if (params.speed > 70 || params.tension > 70 || params.intelligence < 30) return 'choppy'
  if (params.intelligence > 70 && params.nobility > 60) return 'complex'
  return 'flowing'
}

// ---------------------------------------------------------------------------
// Accent Matching
// ---------------------------------------------------------------------------

/**
 * Find the closest matching AccentProfile based on voice parameters.
 * Maps VoiceParams (0-100) to the 1-10 vocal params scale in accent data.
 */
export function findSuggestedAccent(params: VoiceParams): AccentProfile | null {
  let bestMatch: AccentProfile | null = null
  let bestScore = Infinity

  for (const accent of ACCENT_PROFILES) {
    const vp = accent.vocalParams
    // Map voice params to accent's 1-10 scale
    const diffs = [
      Math.abs((params.gravel / 10) - vp.gravel),
      Math.abs((params.breathiness / 10) - vp.breathiness),
      Math.abs((params.resonance / 10) - vp.resonance),
      Math.abs(((100 - params.speed) / 10) - (10 - vp.pacing)), // Invert: slow speed = low pacing
      Math.abs(((params.age > 50 ? 3 : params.age > 25 ? 5 : 7) - vp.pitch)), // Age inversely maps to pitch
    ]
    const score = diffs.reduce((a, b) => a + b, 0)
    if (score < bestScore) {
      bestScore = score
      bestMatch = accent
    }
  }

  // Only suggest if the match is reasonably close (score < 15 on 5 params * 0-10 scale)
  return bestScore < 15 ? bestMatch : null
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'codex-voice-profiles'

export function loadVoiceProfiles(): VoiceProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveVoiceProfile(profile: VoiceProfile): void {
  const profiles = loadVoiceProfiles()
  const idx = profiles.findIndex(p => p.id === profile.id)
  if (idx >= 0) {
    profiles[idx] = profile
  } else {
    profiles.push(profile)
  }
  saveOrAnnounce(STORAGE_KEY, JSON.stringify(profiles))
}

export function deleteVoiceProfile(id: string): void {
  const profiles = loadVoiceProfiles().filter(p => p.id !== id)
  saveOrAnnounce(STORAGE_KEY, JSON.stringify(profiles))
}

/** Generate a unique ID for a new voice profile. */
export function generateProfileId(): string {
  return `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
