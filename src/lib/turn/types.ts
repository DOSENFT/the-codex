/* ============================================================================
   THE COMPOSED TURN
   ----------------------------------------------------------------------------
   The 15-second metric lives in this shape.  It is the answer to one question:
   "it is your turn — what can you actually do right now?"

   Two properties matter more than anything else here:

   1.  It is DATA.  No React, no DOM, no side effects.  composeTurn() is a pure
       function of (character, combat, board), which is what lets the whole
       metric be unit-tested without rendering a pixel.

   2.  It is OPEN-WORLD.  Nothing in these types is a closed union of content
       the engine has heard of.  A homebrew feature, a homebrew mastery and a
       homebrew resource travel through here carrying their own declared
       structure and their own text.  Marcus's character IS homebrew; content
       the engine does not recognise is the main case, not the edge case.
   ========================================================================== */

/** The 2024 action economy.  `free` covers riders that cost nothing — Vow of
 *  Enmity is now a free rider on the Attack, not an action of its own. */
export type EconomySlot = 'action' | 'bonusAction' | 'reaction' | 'movement' | 'free'

/** Where an option came from.  Used for grouping and iconography only —
 *  never for rules decisions.  The engine must not branch on provenance. */
export type OptionKind =
  | 'attack'
  | 'spell'
  | 'feature'
  | 'resource'
  | 'condition'
  | 'movement'
  | 'other'

/** What an option costs.  Every field is optional except the economy slot,
 *  because "costs nothing but your bonus action" is a real and common shape. */
export interface OptionCost {
  slot: EconomySlot
  /** Spell slot level consumed, if any.  2024: at most ONE per turn, which is
   *  half of why Smite / Misty Step contend. */
  spellSlotLevel?: number
  /** Id of a ResourcePool this spends from.  A plain string, deliberately —
   *  homebrew pools have ids the engine has never seen. */
  resourcePoolId?: string
  resourceAmount?: number
  /** Rendered cost, authored by whoever declared the option.  ALWAYS
   *  populated, because the engine may not understand the cost well enough to
   *  describe it and must still be able to show it. */
  label: string
}

/** A weapon-mastery rider, or any other consequence that is not in the to-hit
 *  line.  `known: false` means the engine does not recognise the property —
 *  and it still renders `text`, which is the whole point. */
export interface OptionRider {
  property: string
  known: boolean
  /** ALWAYS populated.  An unrecognised rider loses its automation, never its
   *  words.  Silently dropping homebrew is the failure this field prevents. */
  text: string
  automatic: boolean
  /** For the eight standard masteries, `rules-2024/mastery.ts` is the
   *  authority and `RiderExpiry` is the narrower union it uses: no printed
   *  mastery expires on the TARGET's turn, and Sap expires at the START of
   *  yours.  That member survives here anyway, because a homebrew rider is
   *  free to declare a window the rulebook never prints — this union stays
   *  open-world, and only the mastery table is closed. */
  expires:
    | 'startOfYourNextTurn'
    | 'endOfYourNextTurn'
    | 'endOfTargetNextTurn'
    | 'immediate'
    | 'unspecified'
}

/** One thing you could do. */
export interface TurnOption {
  id: string
  name: string
  kind: OptionKind
  /** One line, cream body copy.  What it does, in play terms. */
  detail: string
  /** Dice notation if the option rolls something. */
  dice?: string
  cost: OptionCost
  rider?: OptionRider
  /** Legal and affordable right now. */
  available: boolean
  /** Populated iff `available` is false.  D greys blocked options WITH A
   *  REASON rather than hiding them — an option that vanishes teaches you
   *  nothing, and "why can't I smite?" is a question the app should answer. */
  blockedReason?: string
  /** Ranking score.  Higher sorts first.  See rank.ts. */
  score: number
  /** The one line explaining this option's POSITION, set only when ranking
   *  had something non-obvious to say ("You are bloodied", "Would drop Shield
   *  of Faith").  Distinct from `blockedReason`, which explains why an option
   *  cannot be taken at all; `why` explains why a legal option sits high or
   *  low.  Most rows have neither, and silence is the correct default. */
  why?: string
  /** The spell this would put you on concentration for, if any — set to the
   *  option's own name, because the thing you concentrate on IS the spell.
   *  Read by the reducer so that Undo can restore the PREVIOUS spell rather
   *  than merely clearing this one. */
  concentration?: string
  /** True if this option is a face of a MutexGroup and so is rendered there
   *  rather than in the ranked list. */
  contended?: boolean
  /** Free-form provenance for the UI: "Oath of the Hearth", "Longsword", … */
  source?: string
  /** Set when the content is not book content.  Presentation only. */
  homebrew?: boolean
  /** This row was BUILT BY THE COMPOSER, not read off the character sheet.
   *  Slice 7.
   *
   *  Everything else on this screen traces back to something Marcus wrote down:
   *  a weapon, a prepared spell, a class feature. The Opportunity Attack traces
   *  back to the rulebook instead — it is yours because you have hands and a
   *  reach, and no sheet will ever list it. `compose.equivalence.test.ts` exists
   *  to prove the composer invents nothing, so anything it DOES invent has to
   *  say so out loud rather than quietly widening what that test tolerates. */
  synthetic?: boolean

  /** Canon's own id for the text on this row, when canon knew the name.
   *  Spells carry canon ids; a matched feature is keyed by its normalised
   *  name, because canon's feature records have no ids of their own.
   *  Table Truth slice 5. */
  canonId?: string
  /** Where the words on this row came from.
   *
   *  `'sheet'` is NOT a failure state and must never be rendered as one. It
   *  means canon had nothing to add and Marcus's homebrew kept its own words —
   *  which is the open-world rule working, not breaking. Absent means the row
   *  predates the overlay (the V0.9 screen, and every existing test). */
  provenance?: 'canon' | 'sheet'

  /** Temporary hit points this option GRANTS when taken, already computed for
   *  this character at this level. Absent on every option that grants none,
   *  which is nearly all of them.
   *
   *  A NUMBER, NOT A FORMULA. The composer already resolves "Paladin level +
   *  Charisma modifier" into 11 in order to display it (`featureFacts`), and up
   *  to slice 10d the app showed Marcus that 11 and then made him type it into
   *  the HP tracker by hand. Carrying the resolved number here is what lets the
   *  reducer apply the grant, and it stays consistent with slice 8b's law: the
   *  scaling is COMPUTED, never read off a table of names.
   *
   *  Set only when the option is the one that actually pays for the grant. Nix's
   *  Hearthfire Manifest has two faces — a free Bonus Action summon and a
   *  Reaction "Flaming Cloak" that costs a Channel Divinity use — and only the
   *  cloak grants the pool. See `compose.ts`. Table Truth slice 10d. */
  grantsTempHP?: number
}

/** Several options, one economy slot, pick one.
 *  D's defining element.  Under 2024 Divine Smite, Lay on Hands and Misty Step
 *  all want the bonus action — and one-spell-slot-per-turn excludes casting
 *  Misty Step alongside a Smite twice over.  That is ONE DECISION WITH THREE
 *  FACES, and listing it as three rows is a lie about the rules. */
export interface MutexGroup {
  id: string
  /** "One of these — the bonus action" */
  label: string
  /** Why they contend.  'both' = same economy slot AND the one-slot rule. */
  reason: 'economy' | 'spellSlot' | 'both' | 'resource'
  faces: TurnOption[]
}

/** A spendable pool.  Generic by construction: Lay on Hands, Channel Divinity
 *  and a homebrew Hearth pool are the same shape, and none of them is special
 *  to the engine. */
export interface TurnResource {
  id: string
  name: string
  current: number
  max: number
  unit: 'points' | 'uses' | 'dice'
  recharge: 'shortRest' | 'longRest' | 'dawn' | 'never' | 'manual'
  homebrew?: boolean
  /** Marcus's own words about the pool, carried to the table verbatim.
   *  Slice 6b: the whole point of letting him author a pool is that he can say
   *  what it is for. Dropping the sentence at this boundary would make the
   *  editor's note field a place text goes to die. */
  note?: string
}

/** What is true of you and the board — the "upon you" zone.
 *  A condition the engine does not recognise still displays and still carries
 *  its text.  It just cannot enforce itself. */
export interface UponYou {
  name: string
  known: boolean
  text: string
  /** 'on-you' vs 'on-them' — the board reads differently for each. */
  side: 'you' | 'target'
  /** Rules-relevant enough to tint gold, or merely informational. */
  tone: 'good' | 'bad' | 'neutral'
}

export interface TurnVitals {
  hp: number
  maxHp: number
  tempHp: number
  ac: number
  /** 2024: hp <= floor(max/2).  NOT a condition — a threshold, which is why it
   *  needs edge detection rather than a flag. */
  bloodied: boolean
  bloodiedAt: number
}

export interface EconomyState {
  action: boolean
  bonusAction: boolean
  reaction: boolean
  movement: boolean
  /** 2024 hard rule: one levelled spell slot per turn, full stop. */
  spellSlotUsedThisTurn: boolean
}

export interface SpellSlotLine {
  level: number
  current: number
  max: number
}

/** The whole turn, ready to render.  The D turn screen consumes exactly this
 *  and contains no rules logic of its own. */
export interface ComposedTurn {
  actor: {
    name: string
    /** 2024 naming.  `species`, not race. */
    species: string
    className: string
    subclass: string
    level: number
    homebrewSubclass?: boolean
  }
  round: number
  /** Is the screen showing YOUR turn, or the moment inside someone else's?
   *  Slice 7.
   *
   *  Not optional here, unlike the field of the same name on `CombatState`.
   *  That one is persisted and had to stay kind to what is already sitting in
   *  Marcus's browser; this one is computed fresh on every compose, so there is
   *  no old value to be careful of and every reader is owed a straight answer.
   *
   *  When this is false the screen is not a smaller version of itself. Actions,
   *  bonus actions and movement are all illegal, the reaction list is the whole
   *  list, and `ranked` holds the things you may actually do RIGHT NOW. */
  yourTurn: boolean
  vitals: TurnVitals
  upon: UponYou[]
  economy: EconomyState
  /** Sorted, highest score first.  Excludes anything in `mutex`. */
  ranked: TurnOption[]
  mutex: MutexGroup[]
  /** Legal but low-value, or blocked-with-a-reason.  Behind "everything else". */
  rest: TurnOption[]
  resources: TurnResource[]
  spellSlots: SpellSlotLine[]
  /* `seeded?` lived here through Slices 1-3 and Slice 4 deleted it, exactly as
     its own doc comment promised. composeTurn() now reads the real character,
     so there is no fixture left to warn anyone about. */
}
