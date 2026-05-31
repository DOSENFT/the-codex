import type { Character, CampaignData } from './character'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HookCategory = 'ask' | 'observe' | 'connect' | 'offer' | 'muse'

export interface RPHook {
  id: string
  category: HookCategory
  text: string
  context?: 'combat' | 'social' | 'discovery' | 'emotional'
  targetPartyMember?: string
  isCustom?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Class-appropriate generic questions when no party/relationship data exists */
const CLASS_QUESTIONS: Record<string, string[]> = {
  Paladin:  ['how you handle doubt in your oath', 'what justice means to you on the road'],
  Cleric:   ['how your faith guides you in dark places', 'what prayer means to you when the gods are silent'],
  Fighter:  ['the toughest fight you ever survived', 'what keeps you swinging when it all goes wrong'],
  Rogue:    ['the best score you ever pulled off', 'who taught you to move like that'],
  Wizard:   ['your earliest memory of magic', 'what drove you to study the arcane'],
  Ranger:   ['the wildest creature you have tracked', 'what the wild has taught you about people'],
  Barbarian:['what rage feels like from the inside', 'the strongest thing you ever broke'],
  Bard:     ['the song that means the most to you', 'a crowd that changed your life'],
  Warlock:  ['what your patron asked of you first', 'whether the pact was worth it'],
  Sorcerer: ['when your power first manifested', 'how it feels when the magic moves through you'],
  Druid:    ['the most sacred grove you have visited', 'what nature has shown you about balance'],
  Monk:     ['how you center yourself before a fight', 'what discipline has cost you'],
}

const DEFAULT_QUESTIONS = [
  'what brought you out on the road',
  'what you are fighting for',
  'the place you call home',
]

/** Class/race fallback physical tics */
const DEFAULT_TICS: Record<string, string[]> = {
  Paladin:  ['grip tightens on your holy symbol', 'stand a little straighter, shoulders squared'],
  Cleric:   ['fingers trace a prayer gesture', 'lips move in silent devotion'],
  Rogue:    ['fingers flex, counting exits', 'eyes flick to every shadow in the room'],
  Wizard:   ['fingers twitch through a somatic component', 'eyes lose focus as you recall a theorem'],
  Fighter:  ['hand drifts to your weapon hilt', 'roll your shoulders, loosening old tension'],
  Ranger:   ['nostrils flare, reading the wind', 'crouch slightly, weight on the balls of your feet'],
  Barbarian:['crack your knuckles absently', 'jaw tightens, teeth grinding'],
  Bard:     ['hum a half-remembered melody', 'tap a rhythm on your thigh'],
  Warlock:  ['the mark of your pact itches', 'whisper a word in a language you did not learn'],
  Sorcerer: ['static crackles between your fingertips', 'a faint glow pulses under your skin'],
  Druid:    ['press your palm to the nearest natural surface', 'tilt your head, listening to something others cannot hear'],
  Monk:     ['regulate your breathing into a measured rhythm', 'settle your weight, perfectly balanced'],
}

const DEFAULT_TIC = 'shift your weight, eyes scanning the surroundings'

// ---------------------------------------------------------------------------
// Hook generators (one per category)
// ---------------------------------------------------------------------------

function generateAskHooks(
  char: Character,
  campaign: CampaignData | null,
): RPHook[] {
  const hooks: RPHook[] = []

  // Mine party members
  const party = campaign?.partyMembers ?? []
  for (const pm of party.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'ask',
      text: `Ask ${pm.name} about their ${pm.class} training`,
      context: 'social',
      targetPartyMember: pm.name,
    })
  }

  // Mine backstory relationships
  const DEAD_STATUSES = ['dead', 'deceased', 'missing', 'lost', 'gone', 'unknown']
  const rels = (char.backstory?.relationships ?? []).filter(
    r => !DEAD_STATUSES.includes(r.status.toLowerCase())
  )
  for (const rel of rels.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'ask',
      text: `Bring up ${rel.name} — what do they mean to you now?`,
      context: 'emotional',
    })
  }

  // Quest-related question aimed at a party member
  if (campaign?.currentQuest && party.length > 0) {
    const target = pick(party)
    hooks.push({
      id: '',
      category: 'ask',
      text: `Ask ${target.name} if they've dealt with ${campaign.currentQuest.toLowerCase().split(' ').slice(0, 4).join(' ')} before`,
      context: 'social',
      targetPartyMember: target.name,
    })
  }

  // Fallback: class-appropriate generic questions
  if (hooks.length < 3) {
    const pool = CLASS_QUESTIONS[char.class] ?? DEFAULT_QUESTIONS
    for (const q of pool) {
      if (hooks.length >= 5) break
      hooks.push({
        id: '',
        category: 'ask',
        text: `Ask someone nearby about ${q}`,
        context: 'social',
      })
    }
  }

  return hooks.slice(0, 5)
}

function generateObserveHooks(
  char: Character,
): RPHook[] {
  const hooks: RPHook[] = []

  // Physical tics + memories
  const tics = char.persona?.physicalTics ?? []
  const memories = char.backstory?.keyMemories ?? []

  for (let i = 0; i < Math.min(tics.length, 2); i++) {
    const tic = tics[i]
    const memory = memories[i]
    hooks.push({
      id: '',
      category: 'observe',
      text: memory
        ? `*${cap(tic)} — a habit from ${memory.title.toLowerCase()}*`
        : `*${cap(tic)}*`,
      context: memory?.emotionalCore === 'grief' || memory?.emotionalCore === 'betrayal' ? 'emotional' : undefined,
    })
  }

  // Color traits
  const colorTraits = char.persona?.colorTraits ?? []
  for (const ct of colorTraits.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'observe',
      text: `*Notice ${ct.text.toLowerCase()}*`,
      context: 'discovery',
    })
  }

  // Memory-driven physical behavior
  for (const mem of memories.slice(0, 2)) {
    if (hooks.length >= 5) break
    hooks.push({
      id: '',
      category: 'observe',
      text: `*Your hands move instinctively, remembering ${mem.title}*`,
      context: 'emotional',
    })
  }

  // Fallback: class/race defaults
  if (hooks.length < 3) {
    const fallbackTics = DEFAULT_TICS[char.class] ?? [DEFAULT_TIC]
    for (const t of fallbackTics) {
      if (hooks.length >= 5) break
      hooks.push({
        id: '',
        category: 'observe',
        text: `*${cap(t)}*`,
      })
    }
  }

  return hooks.slice(0, 5)
}

function generateConnectHooks(
  char: Character,
  campaign: CampaignData | null,
): RPHook[] {
  const hooks: RPHook[] = []
  const party = campaign?.partyMembers ?? []
  const threads = char.backstory?.unresolvedThreads ?? []
  const wants = char.persona?.wants ?? []

  // Unresolved threads aimed at party members
  for (let i = 0; i < Math.min(threads.length, party.length, 2); i++) {
    hooks.push({
      id: '',
      category: 'connect',
      text: `Mention ${threads[i].toLowerCase()} to ${party[i].name} — they might relate`,
      context: 'social',
      targetPartyMember: party[i].name,
    })
  }

  // Wants shared with party members
  for (let i = 0; i < Math.min(wants.length, party.length, 2); i++) {
    const pm = party[i % party.length]
    hooks.push({
      id: '',
      category: 'connect',
      text: `Tell ${pm.name} about your desire to ${wants[i].toLowerCase()}`,
      context: 'social',
      targetPartyMember: pm.name,
    })
  }

  // Quest-topic discussion
  if (campaign?.currentQuest && party.length > 0) {
    const target = pick(party)
    hooks.push({
      id: '',
      category: 'connect',
      text: `Ask ${target.name} what they think about ${campaign.currentQuest.toLowerCase().split(' ').slice(0, 5).join(' ')}`,
      context: 'social',
      targetPartyMember: target.name,
    })
  }

  // Fallback
  if (hooks.length < 3) {
    const fallbacks = [
      'Share a quiet moment of honesty with someone in the group',
      'Ask the party what they plan to do when this is all over',
      'Mention something from your past that connects to the current situation',
    ]
    for (const f of fallbacks) {
      if (hooks.length >= 5) break
      hooks.push({ id: '', category: 'connect', text: f, context: 'social' })
    }
  }

  return hooks.slice(0, 5)
}

function generateOfferHooks(
  char: Character,
): RPHook[] {
  const hooks: RPHook[] = []
  const traits = char.persona?.coreTraits ?? []
  const defaultState = char.persona?.defaultState ?? ''

  // Trait-driven offers
  for (const trait of traits.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'offer',
      text: `*Your ${trait.text.toLowerCase()} nature moves you — offer to help with something others overlooked*`,
    })
  }

  // Default-state-driven offers
  if (defaultState) {
    hooks.push({
      id: '',
      category: 'offer',
      text: `*Your ${defaultState.toLowerCase()} nature compels you to check on the most tired-looking party member*`,
      context: 'social',
    })
  }

  // Generic helpful actions keyed to class
  const classOffers: Record<string, string[]> = {
    Paladin:  ['offer to stand watch so others can rest', 'offer to heal someone who looks worse for wear'],
    Cleric:   ['offer a blessing before the group moves on', 'offer to mend a companion\'s wound'],
    Fighter:  ['offer to scout ahead and clear the path', 'offer to carry the heaviest gear'],
    Rogue:    ['offer to check for traps before anyone moves', 'offer to keep first watch — you don\'t sleep much anyway'],
    Wizard:   ['offer to identify a mysterious item', 'offer to ward the campsite with an alarm spell'],
    Ranger:   ['offer to forage for the group', 'offer to scout the trail ahead'],
    Barbarian:['offer to break down the barricade', 'offer to carry the wounded'],
    Bard:     ['offer to lift spirits with a story or song', 'offer to negotiate on the group\'s behalf'],
    Warlock:  ['offer to consult your patron for guidance', 'offer to keep watch — your eyes see in darkness'],
    Sorcerer: ['offer a spark of warmth to the shivering', 'offer to light the way with a cantrip'],
    Druid:    ['offer to find clean water for the group', 'offer to speak with local animals for intel'],
    Monk:     ['offer to share a meditative technique for rest', 'offer to silently scout ahead'],
  }

  const offers = classOffers[char.class] ?? ['offer to share rations', 'offer to mend someone\'s equipment']
  for (const o of offers) {
    if (hooks.length >= 5) break
    hooks.push({
      id: '',
      category: 'offer',
      text: `*${cap(o)}*`,
      context: 'social',
    })
  }

  return hooks.slice(0, 5)
}

function generateMuseHooks(
  char: Character,
): RPHook[] {
  const hooks: RPHook[] = []
  const memories = char.backstory?.keyMemories ?? []
  const fears = char.persona?.fears ?? []
  const patron = char.persona?.patron

  // Memory reflections
  for (const mem of memories.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'muse',
      text: `*Think about ${mem.title} and what it means now*`,
      context: 'emotional',
    })
  }

  // Fear-driven moments
  for (const fear of fears.slice(0, 2)) {
    hooks.push({
      id: '',
      category: 'muse',
      text: `*${cap(fear)} crosses your mind — you push it down, but it lingers*`,
      context: 'emotional',
    })
  }

  // Patron prayer
  if (patron?.name) {
    hooks.push({
      id: '',
      category: 'muse',
      text: `*Whisper a prayer to ${patron.name}*`,
      context: 'emotional',
    })
  }

  // Catchphrase as internal echo
  const catchphrases = char.persona?.catchphrases ?? []
  if (catchphrases.length > 0) {
    hooks.push({
      id: '',
      category: 'muse',
      text: `*Murmur to yourself: "${pick(catchphrases)}"*`,
      context: 'emotional',
    })
  }

  // Fallback
  if (hooks.length < 3) {
    const fallbacks = [
      `*Wonder if ${char.name} is becoming someone different than who they started as*`,
      `*Stare at nothing for a moment, lost in a memory you can't quite place*`,
      `*Take a breath and remind yourself why you're here*`,
    ]
    for (const f of fallbacks) {
      if (hooks.length >= 5) break
      hooks.push({ id: '', category: 'muse', text: f, context: 'emotional' })
    }
  }

  return hooks.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Scene context filter
// ---------------------------------------------------------------------------

const CONTEXT_MAP: Record<string, RPHook['context'][]> = {
  combat:    ['combat', undefined],
  social:    ['social', 'emotional', undefined],
  discovery: ['discovery', 'social', undefined],
  emotional: ['emotional', 'social', undefined],
}

function filterByScene(hooks: RPHook[], sceneContext?: string): RPHook[] {
  if (!sceneContext || !CONTEXT_MAP[sceneContext]) return hooks
  const allowed = CONTEXT_MAP[sceneContext]
  return hooks.filter(h => allowed.includes(h.context))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate static RP hooks from character + campaign data.
 * No AI calls — purely deterministic template expansion.
 */
export function generateStaticHooks(
  character: Character,
  campaign: CampaignData | null,
  sceneContext?: string,
): RPHook[] {
  const askHooks = generateAskHooks(character, campaign)
  const observeHooks = generateObserveHooks(character)
  const connectHooks = generateConnectHooks(character, campaign)
  const offerHooks = generateOfferHooks(character)
  const museHooks = generateMuseHooks(character)

  let all = [...askHooks, ...observeHooks, ...connectHooks, ...offerHooks, ...museHooks]

  // Assign IDs
  all = all.map((hook, i) => ({ ...hook, id: `${hook.category}-${i}` }))

  // Filter by scene context if provided
  if (sceneContext) {
    all = filterByScene(all, sceneContext)
  }

  return all
}

/**
 * Fisher-Yates shuffle. Returns a new array — does not mutate the input.
 */
export function shuffleHooks(hooks: RPHook[]): RPHook[] {
  const result = [...hooks]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
