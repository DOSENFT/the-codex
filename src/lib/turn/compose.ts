// ---------------------------------------------------------------------------
// composeTurn — SLICE 4: the extraction
// ---------------------------------------------------------------------------
//
// Slice 1 shipped this function as a signature with a fixture behind it: it
// returned Nix mid-fight and ignored its arguments. That fixture is gone. The
// body below reads the real character and the real persisted combat state, and
// the composition logic it leans on is not a reimplementation — it is
// `src/lib/turn/options.ts`, which is byte-for-byte the code that shipped
// inside TurnSummary.tsx and which Slice 2's seven characterization tests
// pin. There is one implementation of "what can this character do", and both
// the V0.9 screen and this composer call it.
//
// That is the whole proof of this slice: those seven tests are still green,
// unmodified, importing from the path they always imported from.
//
// WHAT THIS SLICE DOES AND DOES NOT DO.
//
//   Does:     legality and affordability. Conditions, the action economy, the
//             one-spell-slot-per-turn rule, spent slots, empty pools, and the
//             contention brackets that follow from them.
//   Does not: ranking. Every `score` below is 0 and the shortlist is simply
//             the first five affordable options in build order. Slice 5 owns
//             rank.ts and is the only place a score should ever be computed.
//
// D'S RULE ON BLOCKED OPTIONS. An option that is YOURS but unaffordable right
// now is shown greyed with a reason; an option that is not yours at all today
// (unprepared, above your level, a spell tier you do not possess) is not shown.
// The distinction is why `options.ts` gained `includeUnaffordable` rather than
// having its filter deleted: pass it, and the two cases separate cleanly.
// "Why can't I smite?" is a question the app should answer, not dodge.
//
// PURE. No storage reads, no clock, no randomness — same input, same output,
// forever. That is what makes the 15-second metric testable.

import { HOMEBREW_CONTENT } from '../dnd-data'
import type { Character, ClassFeature, Weapon } from '../character'
import type { CombatState } from '../combat-state'
import {
  blockedSlots,
  bloodiedThreshold,
  effectsOf,
  isBloodied,
  type ConditionEffect,
} from '../rules-2024/conditions'
import {
  type EconomySlot,
  type SlotSpendRecord,
  spellSlotSpentThisTurn,
} from '../rules-2024/economy'
import { riderFor } from '../rules-2024/mastery'
import { findPool, poolIdForFeature, poolsOf } from '../rules-2024/resources'
import { findContention } from './contention'
// slug/poolIdFor moved to ./ids in Slice 6 so the reducer PAYS with exactly the
// id the composer PRICES with. Same functions, one home — see ids.ts.
import { slug } from './ids'
import {
  categorizeTurnOptions,
  levelLabel,
  type ActionOption,
  type CategorizedOptions,
} from './options'
import { featReactionOptions } from './feats'
import { facesOf, sentencesOf } from './faces'
import { readsAsTrigger } from './trigger'
import { featureContextOf, overlayCanon, type EconomyFiling, type OverlaidOption } from './overlay'
import { grantedTempHP } from '../rules-2024/temp-hp'
import { featureByName } from '../canon/lookup'
import type { CanonFeature } from '../canon/types'
import { sortByRank, withRank, type RankContext } from './rank'
import type {
  ComposedTurn,
  OptionCost,
  OptionKind,
  OptionRider,
  TurnOption,
  TurnResource,
  UponYou,
} from './types'

export interface ComposeInput {
  character: Character
  /** Null before the first `startCombat`, and that is a legal state. */
  combat: CombatState | null
  /** Initiative entries and their conditions. Unread until Slice 9. */
  board?: unknown
  /** Events this encounter, for the one-spell-slot-per-turn rule.
   *
   *  Empty until Slice 6 builds the event log, and that is deliberate: the
   *  rule is stated correctly here and is simply inert until something feeds
   *  it. Wiring it later is one argument, not a redesign. */
  log?: readonly SlotSpendRecord[]
  /** How many options reach the shortlist before the fold. */
  shortlistSize?: number
}

const DEFAULT_SHORTLIST = 5

const ECONOMY_LABEL: Record<EconomySlot, string> = {
  action: 'Action',
  bonusAction: 'Bonus action',
  reaction: 'Reaction',
  movement: 'Movement',
  free: 'Free',
}

const KIND: Record<ActionOption['type'], OptionKind> = {
  weapon: 'attack',
  spell: 'spell',
  feature: 'feature',
}

/** The four buckets `categorizeTurnOptions` returns, and the economy each one
 *  means. `passives` has no economy, which is the whole reason it is a bucket
 *  and not a slot. */
type Bucket = 'actions' | 'bonusActions' | 'reactions' | 'passives'

const BUCKET_FOR: Record<EconomyFiling, Bucket> = {
  action: 'actions',
  bonusAction: 'bonusActions',
  reaction: 'reactions',
  passive: 'passives',
}

const ECONOMY_OF_BUCKET: Record<Bucket, ActionOption['actionEconomy'] | undefined> = {
  actions: 'action',
  bonusActions: 'bonusAction',
  reactions: 'reaction',
  passives: undefined,
}

/** "This canon record already has a row in this bucket." */
const bucketKey = (canonId: string, bucket: Bucket): string => `${canonId}|${bucket}`

/** One option per separately-priced ability canon states inside this feature.
 *
 *  ── WHY THE COMPOSER ─────────────────────────────────────────────────────────
 *  The composer owns the action economy (the ruling at the foot of this file),
 *  and `options.ts` is pinned byte-identical. `overlay.ts` finds the faces
 *  because that is where canon is consulted; spending them is this layer's job.
 *
 *  ── THE BASE OPTION IS KEPT ──────────────────────────────────────────────────
 *  It carries everything canon states WITHOUT a price — the flavour, the light
 *  radius, the 30-foot leash — plus the sheet's own words. Deleting it would
 *  remove a row Marcus can see today in order to fix a row he cannot, which is
 *  a trade this phase does not make.
 *
 *  ── A FACE SOMETHING ALREADY OFFERS IS NOT EMITTED ───────────────────────────
 *  `occupied` is the set of "this canon record already has a row in this
 *  bucket", built from every sheet option before any face is minted — and the
 *  key is the CANON ID, not the name. That is what makes this work on a sheet
 *  where the split was already done by hand: `nix.ts` carries "Hearthfire
 *  Manifest" as a Bonus Action and "Flaming Cloak" as a Reaction, two names that
 *  both resolve to the one canon feature, so both faces find their buckets taken
 *  and nothing is added. Marcus's own sheet carries one undeclared feature, so
 *  both faces are new. Neither case is written down anywhere; the difference is
 *  entirely in the data.
 *
 *  Matching on the name instead would have shipped him two Reaction rows for one
 *  ability the moment he renamed anything — the precise thing a reader cannot
 *  tell apart from the real one.
 *
 *  ── WHICH SENTENCE LEADS THE ROW ─────────────────────────────────────────────
 *  The face's trigger-shaped sentence, when it has one; otherwise the priced
 *  sentence that opened it. The price is already stated by the row's cost label,
 *  so leading with "As a Reaction," spends the row's first segment repeating the
 *  gold text beside it — the duplication `detailOf` exists to remove. Promoting
 *  a sentence is not reordering canon: nothing is dropped, and the rest follow
 *  in the order canon wrote them.
 *
 *  Held Reaction slice 1. */
function facesToOptions(
  option: OverlaidOption,
  occupied: ReadonlySet<string>,
): OverlaidOption[] {
  const faces = option.canonFaces
  if (!faces || faces.length === 0 || !option.canonId) return []

  // Dropped, not carried: a face is not itself made of faces, and leaving the
  // field on would invite a second pass over the same record.
  const { canonFaces: _spent, ...base } = option

  const out: OverlaidOption[] = []
  for (const face of faces) {
    // `facesOf` only ever names a cost, so 'passive' is unreachable today. It is
    // handled rather than asserted away because a bucket with no economy is not
    // something to do, and a future canon package is not this file's to predict.
    if (face.economy === 'passive') continue
    if (occupied.has(bucketKey(option.canonId, BUCKET_FOR[face.economy]))) continue

    const sentences = sentencesOf(face.text)
    // sentences[0] is the opener, because `face.text` begins with it.
    const lead = sentences.findIndex(readsAsTrigger)
    const head = lead >= 0 ? lead : 0

    out.push({
      ...base,
      actionEconomy: face.economy,
      mechanicsLine: sentences[head] ?? face.opener,
      effectsLine: sentences.filter((_, i) => i !== head).join(' '),
    })
  }
  return out
}

/** Prose that GRANTS temporary hit points, as opposed to prose that merely
 *  mentions them.
 *
 *  Both sentences are in Hearthfire's Reaction face and only the first is a
 *  grant:
 *
 *      "The cloak immediately GRANTS YOU Temporary Hit Points equal to …"
 *      "This effect lasts until the Temporary Hit Points are depleted."
 *
 *  So the term alone is not the shape — the shape is a granting verb reaching
 *  the term inside one sentence, which `[^.]*` enforces by being unable to cross
 *  a full stop. Same reasoning as `faces.ts`'s COST_IN_PROSE, which matches the
 *  preposition rather than the bare cost word: it is the verb that turns a noun
 *  into something that happens to you.
 *
 *  "temp HP" as well as "temporary hit points", because canon packages and
 *  homebrew both write it short and neither is wrong. */
const GRANTS_TEMP_HP =
  /\b(?:gain|gains|grant|grants|granted|granting|receive|receives)\b[^.]*\btemp(?:orary)?\s+(?:hit\s+points|hp)\b/i

/** The economy canon prices this feature's temp-HP grant under, or undefined.
 *
 *  `undefined` in three cases, all of which mean "this constraint has nothing to
 *  say" rather than "no": canon does not know the feature, canon prices it once
 *  so `facesOf` returns nothing to choose between, or MORE than one face states a
 *  grant — which is a shape this cannot honestly divide, so it refuses to divide
 *  it, exactly as `facesOf` refuses a sentence naming two costs. */
function grantingFaceEconomy(feature: CanonFeature | undefined): EconomyFiling | undefined {
  const granting = facesOf(feature).filter(f => GRANTS_TEMP_HP.test(f.text))
  return granting.length === 1 ? granting[0].economy : undefined
}

/** The temporary hit points taking this option would grant, or undefined.
 *
 *  ── Why the composer, and why a number ───────────────────────────────────────
 *  Canon states the cloak's pool as the FORMULA "Paladin level + Charisma
 *  modifier", and `featureFacts` already resolves it against this character in
 *  order to print "11 temp HP" on the detail sheet. Up to slice 10d that was the
 *  end of it: the app showed Marcus the number and then made him type it into
 *  the HP tracker by hand, which is a computed fact reduced to a suggestion.
 *  Resolving it here — once, in the same pass that prices the option — is what
 *  lets the reducer grant it, and keeps slice 8b's law: the app COMPUTES the
 *  scaling, it never reads a level off a table of names.
 *
 *  ── Which of the rows carries it, and why it is no longer the pool ───────────
 *  Hearthfire Manifest composes as SEVERAL options that share one canon feature,
 *  and only one of them grants. Attaching the grant to all of them would double
 *  it — summon, then cloak, and the app hands out 20.
 *
 *  Slice 10d separated them by asking "does this option pay a resource pool?".
 *  On the `nix.ts` fixture that worked, because the fixture's hand-split "Flaming
 *  Cloak" declares `usesPerRest`/`usesMax` and so derives a pool. Measured
 *  against Marcus's REAL export it refuses everything he owns: his sheet carries
 *  Hearthfire Manifest as ONE undeclared feature with no uses on it, so no row
 *  derives a pool, so no row ever granted, so `tempHPSource` was never set, so
 *  `activeRetaliation` returned null and the retaliation prompt had never once
 *  received data. Item 7 — "i dont think the hearthfire manifest reaction is
 *  working" — is this line.
 *
 *  Slice 1's law: a fixture that models the sheet AFTER the repair cannot show
 *  the fault. The pool was a property of the fixture's hand-split, not of the
 *  rule.
 *
 *  ── The replacement: the grant belongs to the FACE canon prices it under ─────
 *  Canon writes the grant inside one of the priced abilities it states in prose,
 *  and `facesOf` already cuts those apart (slice 1). Exactly one of Hearthfire's
 *  two faces says "grants you Temporary Hit Points"; it is the Reaction. So the
 *  economy of THAT face is the economy a row must be filed under to carry the
 *  grant, and every other row of the same feature — the free Bonus Action summon,
 *  and the leftover base option that only reached the Action slot because
 *  `featureActionType` defaulted it there — is refused.
 *
 *  This is the phase's law applied to itself: A DEFAULT IS NOT AN ANSWER. The
 *  base row's Action slot is the app's own guess, and a guess does not get to be
 *  the thing that hands out hit points.
 *
 *  Still SHAPE, NEVER A NAME: nothing below says "Flaming Cloak" or "Hearthfire".
 *  It reads canon's prose for a granting verb applied to temporary hit points,
 *  and canon's own sentence split for which price that verb sits under. A
 *  homebrew feature written the same way behaves the same way with no code
 *  change. Where canon prices the feature only once there are no faces to
 *  disagree about, the constraint does not apply, and the single row grants.
 *
 *  `compose.temphp.test.ts` pins every side of this, because getting it
 *  backwards is a bug that would ship looking like a feature.
 *  Table Truth slice 10d · Held Reaction slice 3. */
function tempHPGrantOf(
  option: OverlaidOption,
  cost: OptionCost,
  character: Character,
): number | undefined {
  if (option.type !== 'feature') return undefined

  const feature = featureByName(option.name)
  const priced = grantingFaceEconomy(feature)
  // `cost.slot` and not `option.actionEconomy`: the slot is where the row
  // actually landed after every refile, which is what the player sees, and the
  // only thing the reducer will ever spend.
  if (priced !== undefined && cost.slot !== priced) return undefined

  // `grantedTempHP` and not an inline read of the fact: slice 4's source picker
  // asks the SAME question of the same features in order to decide what to
  // offer, and two readers of `mechanics.tempHP` would eventually disagree. The
  // way they would disagree is the app offering Marcus a source that then arms
  // nothing. One reader, in `rules-2024/temp-hp.ts`, which is where the temp-HP
  // rules already live.
  return grantedTempHP(feature, featureContextOf(character))
}

/**
 * Compose everything the player can actually do this turn.
 */
export function composeTurn(input: ComposeInput): ComposedTurn {
  const { character, combat } = input
  const shortlistSize = input.shortlistSize ?? DEFAULT_SHORTLIST
  const log = input.log ?? []
  const round = combat?.round ?? 1
  const hitPoints = character.hitPoints ?? { max: 0, current: 0 }

  // Slice 7. `!== false`, not `=== true`: a combat state saved before this
  // field existed, and the null combat state of a character standing outside a
  // fight, both mean "your turn" — which is the behaviour Marcus has today and
  // the only sane default for a screen you opened deliberately. The one way to
  // land off-turn is for something to have said so out loud.
  const yourTurn = combat?.yourTurn !== false

  // -- what is upon you ------------------------------------------------------
  const conditionNames = Array.isArray(character.conditions) ? character.conditions : []
  // Slice 6b. Marcus's own conditions are consulted before the book's, so a
  // homebrew condition that says "you can't take Reactions" actually closes the
  // reaction row instead of merely appearing above it. Before this, an authored
  // condition was a label the app displayed and then ignored.
  const customConditions = Array.isArray(character.customConditions) ? character.customConditions : []
  const conditionEffects = effectsOf(conditionNames, customConditions)
  const forbidden = blockedSlots(conditionNames, customConditions)

  // Which condition to blame for a closed slot. Stunned closes the action via
  // Incapacitated, and naming Incapacitated would be true but useless at the
  // table — so the name the player was actually given wins where it can.
  const blamedFor = new Map<EconomySlot, string>()
  for (const effect of conditionEffects) {
    for (const slot of effect.blocks) {
      if (!blamedFor.has(slot)) blamedFor.set(slot, effect.name)
    }
  }

  // -- what you have already spent ------------------------------------------
  const spent = (slot: EconomySlot): boolean => {
    if (slot === 'free') return false
    const used = combat?.turnActions as Partial<CombatState['turnActions']> | undefined
    return used?.[slot as keyof CombatState['turnActions']] === true
  }
  const slotSpentThisTurn = spellSlotSpentThisTurn(log, round)

  // -- the options themselves ------------------------------------------------
  //
  // `includeUnaffordable` is the ONLY behavioural difference between what this
  // composer sees and what TurnSummary sees. Everything else — every summary
  // string, every mechanics line, every pinned quirk — is identical because it
  // is literally the same call.
  const sheetOptions = categorizeTurnOptions(character, { includeUnaffordable: true })

  /* ── Feats reach the turn, at last. Slice 10e. ─────────────────────────────
   *
   * Marcus, 2026-08-27, sending his real character sheet: "I have Sentinel and
   * interception". The app showed neither, and the cause was not ranking and not
   * a missing row — `character.feats` was read by NOTHING across
   * `src/lib/turn/` and `src/lib/canon/`. A feat could not become an option no
   * matter what its text said. Both of his are REACTIONS, and a reaction you
   * forget you have is a reaction you never take.
   *
   * Spliced HERE for the same reason the Opportunity Attack is synthesised
   * eighty lines below: `options.ts` is a pinned characterization record of the
   * V0.9 screen and this composer is the layer allowed to know about the action
   * economy. Splicing BEFORE the overlay loop means these rows go through every
   * step the others do — canon overlay, ranking, contention, the band, the
   * detail sheet — rather than round the back of them.
   *
   * LAST IN THE LIST, and deduped by name, because the sheet outranks canon. If
   * Marcus wrote Sentinel into his features by hand — which is exactly what a
   * player does when the app never shows it — his words win and this stays out.
   * That is the open-world rule pointing the other way for once. */
  const claimed = new Set(sheetOptions.reactions.map(o => o.name.trim().toLowerCase()))
  const sheet: CategorizedOptions = {
    ...sheetOptions,
    reactions: [
      ...sheetOptions.reactions,
      ...featReactionOptions(character).filter(o => !claimed.has(o.name.trim().toLowerCase())),
    ],
  }

  const weaponsByName = new Map<string, Weapon>()
  for (const weapon of character.weapons ?? []) weaponsByName.set(weapon.name, weapon)
  const featuresByName = new Map<string, ClassFeature>()
  for (const feature of character.features ?? []) featuresByName.set(feature.name, feature)

  // -- the canon overlay -----------------------------------------------------
  //
  // Slice 5. Every option's display strings get one pass through `overlayCanon`
  // before anything else looks at them, so `build()` and `detailOf()` below see
  // canon's numbers where canon has them and the sheet's words where it does
  // not. The overlay never throws and never removes an option; a miss simply
  // marks the row `provenance: 'sheet'` and changes nothing else.
  //
  // IT ALSO RE-FILES — BUT ONLY WHERE THE SHEET NEVER SAID.
  //
  // `options.ts:365-367` files any feature whose NAME contains "aura" as a
  // passive when the record declares no `actionType`, and a passive is never
  // offered as something to do. Canon has three spells called "Aura of
  // Vitality", "Aura of Life" and "Aura of Purity", all cast with an Action;
  // put any of them on a sheet as an undeclared feature and it disappears from
  // the turn list with no message and nothing to tap.
  //
  // The gate is `declaredEconomy`. A feature whose record DOES declare an
  // actionType is Marcus stating the answer, and canon does not get to
  // contradict him — the same precedence options.ts already applies, one layer
  // up. A spell is never re-filed at all: its `castingTime` string is always
  // present, so it is always a declaration. Where the sheet and canon genuinely
  // disagree about a declared cost, that is an ERRATUM, and slice 8 is where
  // the app shows both readings rather than silently picking one.
  const declaredEconomy = new Set(
    (character.features ?? []).filter(f => f.actionType !== undefined).map(f => f.name),
  )
  const raw: Record<Bucket, OverlaidOption[]> = {
    actions: [],
    bonusActions: [],
    reactions: [],
    passives: [],
  }
  /* Every row the sheet itself produced, keyed by the canon record behind it.
   * Filled by the first pass and read by the second, because "does this ability
   * already have a row?" cannot be answered until every sheet option has landed
   * — the option that answers it may sit in a bucket this loop has not reached. */
  const occupied = new Set<string>()
  const facedOptions: OverlaidOption[] = []

  for (const bucket of Object.keys(raw) as Bucket[]) {
    for (const sheetOption of sheet[bucket]) {
      const option = overlayCanon(sheetOption, character)
      const refile =
        option.canonEconomy !== undefined &&
        option.type === 'feature' &&
        !declaredEconomy.has(option.name)
      const target = refile ? BUCKET_FOR[option.canonEconomy!] : bucket
      const economy = ECONOMY_OF_BUCKET[target]
      raw[target].push(
        target === bucket || economy === undefined ? option : { ...option, actionEconomy: economy },
      )
      if (option.canonId) occupied.add(bucketKey(option.canonId, target))
      if (option.canonFaces) facedOptions.push(option)
    }
  }

  /* AND THE FACES, second, on top of a settled board.
   *
   * `canonEconomy` is undefined for exactly these records — canon named two
   * prices, so there was no single one to refile under, and `options.ts`'s
   * default of 'action' stood over both of them. Each face canon prices, and
   * that nothing already offers, becomes its own option in its own bucket.
   *
   * Purely additive. Every row the loop above produced is still there, in the
   * order it was produced, and a feature canon prices once emits nothing here —
   * so on a sheet with no two-priced feature this whole pass is a no-op. */
  for (const option of facedOptions) {
    for (const face of facesToOptions(option, occupied)) {
      raw[BUCKET_FOR[face.actionEconomy]].push(face)
    }
  }

  /* AN ID HAS TO BE UNIQUE, and until slice 10e nothing made it so.
   *
   * `id` is minted from the option's type and its NAME, and `reactions.ts`
   * dedupes the band by id — so two options that share a name silently become
   * one row, and the second one Marcus owns disappears into the first with no
   * message. It stayed invisible while every name on the sheet happened to be
   * distinct.
   *
   * Sentinel is what makes it visible: ONE feat, TWO reactions, two different
   * triggers (a creature Disengages; a creature attacks somebody else). Both are
   * called "Sentinel" because that is what they are called — the app does not
   * invent sub-names for rules that have none — so the collision is not a defect
   * in the data, and it is the id that has to give.
   *
   * A suffix, and only from the second collision on, so every id the app has
   * ever minted is byte-identical to what it was. The order is deterministic
   * (bucket order, then list order), which is what makes the suffix stable
   * across re-renders — an id that moved between renders would break the open
   * detail sheet mid-turn. */
  const mintedIds = new Set<string>()
  const uniqueId = (base: string): string => {
    if (!mintedIds.has(base)) {
      mintedIds.add(base)
      return base
    }
    let n = 2
    while (mintedIds.has(`${base}-${n}`)) n += 1
    const id = `${base}-${n}`
    mintedIds.add(id)
    return id
  }

  const build = (option: OverlaidOption, slot: EconomySlot): TurnOption => {
    const weapon = option.type === 'weapon' ? weaponsByName.get(option.name) : undefined
    const feature = option.type === 'feature' ? featuresByName.get(option.name) : undefined
    const cost = costOf(option, slot, feature, character)

    // PRECEDENCE: say the reason that OUTLIVES THE TURN.
    //
    // An option can be blocked several times over and only one sentence fits
    // on the row, so the order is not arbitrary. A condition lasts until it is
    // removed; an empty pool lasts until a rest; a spent slot and the one-slot
    // rule both evaporate when the turn ends. Leading with a reason that ends
    // in six seconds implies "wait a turn and this works", which for Divine
    // Sense at 0 of 4 is simply false — and a player who is Paralyzed needs to
    // hear that he is Paralyzed, not that his bonus action is spent.
    //
    // The transient reasons are not lost: the economy strip at the top of the
    // screen already shows the whole slot closed, so repeating it on every row
    // would be the redundant half of the message, not the useful half.
    let blockedReason: string | undefined
    const blamed = blamedFor.get(slot)
    if (blamed) {
      blockedReason = `You are ${blamed}`
    } else if (option.unaffordableReason) {
      blockedReason = option.unaffordableReason
    } else if (!yourTurn && slot !== 'reaction' && slot !== 'free') {
      // Slice 7, and it sits HERE for the same reason the rest of this chain is
      // ordered the way it is. It is below a condition and below an empty pool,
      // both of which outlive the moment; it is above "your action is spent",
      // which off-turn is not merely less useful but usually not even true —
      // `endTurn` cleared those flags, so the row would otherwise show as
      // perfectly available in the middle of the ogre's swing.
      //
      // `free` is exempt on purpose, matching the reducer: a free rider is
      // bookkeeping attached to something else, not a thing you spend a turn on.
      // Reactions are exempt because they are the entire point of the moment.
      blockedReason = 'It is not your turn'
    } else if (spent(slot)) {
      blockedReason = `Your ${ECONOMY_LABEL[slot].toLowerCase()} is spent`
    } else if (cost.spellSlotLevel !== undefined && slotSpentThisTurn) {
      blockedReason = 'You may expend only one spell slot on a turn'
    }

    const rider = weapon ? riderOf(weapon) : undefined
    const grantsTempHP = tempHPGrantOf(option, cost, character)

    return {
      id: uniqueId(`${option.type}-${slug(option.name)}`),
      name: option.name,
      kind: KIND[option.type],
      detail: detailOf(option, cost.label),
      dice: option.rollNotation,
      cost,
      ...(rider ? { rider } : {}),
      available: blockedReason === undefined,
      ...(blockedReason ? { blockedReason } : {}),
      // Left at 0 here and set by rank.ts a few lines below. build() knows
      // what an option IS; only the ranker knows what it is worth today, and
      // keeping those apart is what lets ranking be tested on a flat object
      // instead of a whole character sheet.
      score: 0,
      // What taking this would put you on concentration for. Carried on the
      // option rather than looked up later, because by the time the reducer
      // runs the option is a flat record and the spell it came from may have
      // been re-prepared. Slice 8 builds the concentration UI on top of this;
      // Slice 6 needs it so Undo can put the PREVIOUS spell back.
      ...(option.isConcentration ? { concentration: option.name } : {}),
      ...(feature?.source ? { source: feature.source } : {}),
      ...(feature?.source?.toLowerCase().includes('homebrew') ? { homebrew: true } : {}),
      // Slice 5. Carried, not recomputed: the row and the detail sheet must
      // agree about which book they are quoting, and the only way to guarantee
      // that is for both to read the same field off the same object.
      ...(option.canonId ? { canonId: option.canonId } : {}),
      ...(option.provenance ? { provenance: option.provenance } : {}),
      // Slice 10d. Carried on the option for the same reason `concentration` is:
      // by the time the reducer runs, the row is a flat record and the character
      // it was computed against may have levelled.
      ...(grantsTempHP !== undefined ? { grantsTempHP } : {}),
    }
  }

  // Scoring happens HERE — before contention, before the split — so that one
  // number is computed once and every downstream list, including the faces of
  // a mutex bracket, is ordered by the same rule. Ranking a list after it has
  // been carved up is how two parts of one screen end up disagreeing.
  const rankCtx: RankContext = {
    hpFraction: hitPoints.max > 0 ? Math.max(0, Math.min(1, hitPoints.current / hitPoints.max)) : 1,
    bloodied: isBloodied(hitPoints),
    concentratingOn: combat?.concentrating ?? null,
    yourTurn,
  }
  const rank = (o: OverlaidOption, slot: EconomySlot): TurnOption => {
    const built = build(o, slot)
    return withRank(built, rankCtx, {
      prose: o.summary,
      ...(o.isConcentration !== undefined ? { concentration: o.isConcentration } : {}),
    })
  }

  // -- the opportunity attack ------------------------------------------------
  //
  // 2024 PHB: when a creature you can see leaves your reach, you may spend your
  // Reaction to make ONE melee attack against it with a weapon or an Unarmed
  // Strike. It is the single most common thing a melee character does off-turn.
  // It was written down in `dnd-data.ts`'s REACTIONS array as prose, read by
  // nothing, and until this slice it was offered to Marcus never — on any turn,
  // in any fight, since the app was built.
  //
  // Synthesised HERE and not in options.ts on purpose. options.ts is pinned
  // byte-identical to the code that shipped inside TurnSummary.tsx, and Slice
  // 2's seven characterization tests exist to keep it that way; adding a row
  // there would silently change what the V0.9 screen renders. The composer is
  // the layer that is allowed to know about the action economy, so it is the
  // layer that gets to know about reactions.
  //
  // Derived from the weapon options options.ts ALREADY built, rather than from
  // the Weapon records directly, so the to-hit bonus, the magic bonus, the feat
  // tips and the damage line are computed in exactly one place. An opportunity
  // attack can never quietly disagree with the attack row above it about what
  // Hearthbrand does, because it is the same object with a different price.
  const opportunityAttacks: TurnOption[] = raw.actions
    .filter(o => o.type === 'weapon' && weaponsByName.get(o.name)?.attackType === 'melee')
    .map(o => {
      const built = rank(
        {
          ...o,
          name: `Opportunity Attack — ${o.name}`,
          actionEconomy: 'reaction',
          // THE NAMED TRIGGER, and it goes at the FRONT of the mechanics line
          // rather than in `summary`, because `detailOf` builds the row from
          // mechanics + effects and falls back to the summary only when both
          // are empty — which for a weapon they never are. A reaction row that
          // does not say WHEN is a button that does nothing when pressed, so
          // the trigger has to be the first thing under the name, ahead of the
          // to-hit. Everything after it is the weapon's own arithmetic,
          // untouched.
          mechanicsLine: `When a creature you can see leaves your reach · ${o.mechanicsLine}`,
          summary: `One melee attack with ${o.name}, as a Reaction.`,
        },
        'reaction',
      )
      // build() finds a weapon's mastery rider by looking the NAME up, and this
      // option's name is deliberately no longer the weapon's. Restored by hand
      // because a mastery does apply on an opportunity attack, and Nix shoving
      // the goblin as it disengages is the whole reason he took the property.
      const weapon = weaponsByName.get(o.name)
      const rider = weapon ? riderOf(weapon) : undefined
      return { ...built, synthetic: true, ...(rider ? { rider } : {}) }
    })

  const everything: TurnOption[] = [
    ...raw.actions.map(o => rank(o, 'action')),
    ...raw.bonusActions.map(o => rank(o, 'bonusAction')),
    ...raw.reactions.map(o => rank(o, 'reaction')),
    ...opportunityAttacks,
  ]

  // Contention runs over EVERYTHING, before the split, because a bracket that
  // only saw the shortlist would show two faces of a three-face decision.
  // findContention marks faces in place, so it must see the scored objects.
  const mutex = findContention(everything).map(g => ({ ...g, faces: sortByRank(g.faces) }))
  const loose = everything.filter(o => !o.contended)

  const affordable = sortByRank(loose.filter(o => o.available))
  // Blocked options are sorted too. They are greyed, not gone, and a greyed
  // list in arbitrary order is a wall of text: the thing he most wishes he
  // could do should be the first thing he cannot do.
  const blocked = sortByRank(loose.filter(o => !o.available))

  // The shortlist is headed "Your turn", so it holds only things you can do ON
  // your turn. A reaction is by definition something that happens on someone
  // ELSE's turn, and Nix has few enough uncontended options that Flaming Cloak
  // would otherwise have ridden into the top five on a technicality — the list
  // would have been telling him to do something he cannot do yet. It is not
  // hidden: D never hides. It drops to the fold, and Slice 7 gives reactions a
  // home of their own.
  //
  // SLICE 7 — AND OFF-TURN THE TWO HALVES SIMPLY SWAP. During the moment a
  // reaction is not "later"; it is the only thing there is, and every action,
  // bonus action and movement row has already been greyed with "It is not your
  // turn" by build() above. Same two lists, same fold, one fact read the other
  // way round, and the shortlist keeps its single meaning in both worlds:
  // THESE ARE THE THINGS YOU MAY DO RIGHT NOW.
  const isReaction = (o: TurnOption) => o.cost.slot === 'reaction'
  const now = affordable.filter(o => (yourTurn ? !isReaction(o) : isReaction(o)))
  const later = affordable.filter(o => (yourTurn ? isReaction(o) : !isReaction(o)))
  const shortlist = now.slice(0, shortlistSize)
  const rest = [...now.slice(shortlistSize), ...later, ...blocked]

  // -- the rest of the screen ------------------------------------------------
  const upon: UponYou[] = [
    ...conditionEffects.map(uponFromCondition),
    // Passives are never offered as things to DO — that was the point of
    // options.ts filing them separately — but they are absolutely things that
    // are TRUE, and the table needs to see Aura of Solace without hunting.
    ...raw.passives.map((o): UponYou => {
      const text = o.summary || o.effectsLine || o.mechanicsLine
      const full = fullTextOfPassive(o.name, character)
      return {
        name: o.name,
        known: true,
        text,
        // Only when it says more. See `UponYou.detail`.
        ...(full && full !== text ? { detail: full } : {}),
        side: 'you',
        tone: 'good',
      }
    }),
  ]

  return {
    actor: {
      name: character.name,
      // 2024 renamed race to species. The stored field is still `race` and
      // renaming it would break every saved character in Marcus's browser;
      // the rename happens at this boundary instead, for free.
      species: character.race,
      className: character.class,
      subclass: character.subclass,
      level: character.level,
      ...(character.subclass in HOMEBREW_CONTENT ? { homebrewSubclass: true } : {}),
    },
    round,
    yourTurn,

    vitals: {
      hp: hitPoints.current,
      maxHp: hitPoints.max,
      tempHp: character.tempHP ?? 0,
      ac: character.armorClass,
      bloodied: isBloodied(hitPoints),
      bloodiedAt: bloodiedThreshold(hitPoints.max),
    },

    upon,

    economy: {
      // NOTE THE INVERSION. `CombatState.turnActions` is true when a slot is
      // SPENT; `EconomyState` is true when it is OPEN. Getting this backwards
      // would offer a player everything he had just used, so it is stated once,
      // here, and nowhere else.
      //
      // Slice 7: and `yourTurn` closes three of the four. Off-turn the reaction
      // pip is the ONLY one lit, which is what makes the strip readable at a
      // glance during someone else's turn — one dot of gold in a row of dim,
      // saying exactly what you still hold.
      action: yourTurn && !spent('action') && !forbidden.includes('action'),
      bonusAction: yourTurn && !spent('bonusAction') && !forbidden.includes('bonusAction'),
      reaction: !spent('reaction') && !forbidden.includes('reaction'),
      movement: yourTurn && !spent('movement') && !forbidden.includes('movement'),
      spellSlotUsedThisTurn: slotSpentThisTurn,
    },

    ranked: shortlist,
    mutex,
    rest,
    resources: resourcesOf(character),
    spellSlots: spellSlotsOf(character),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The one line D shows under the option name.
 *
 *  Both halves, joined — the mechanics are what you need to roll and the
 *  effects are what you need to say. Dropping either to save a line would be
 *  the "elegance that reduces capability" the standing rule forbids.
 *
 *  Slice 6c: joined, but not repeated. Both halves are assembled independently
 *  in options.ts — `mechanicsLine` ends with the range, and `featureEffects`
 *  pushes the range again — so every feature that declares one printed it
 *  twice: "Self · Self", "10 feet · 10 feet", and for Nix "Touch · Touch ·
 *  15/40 uses". Found by looking at the iPad shot, not by any assertion.
 *
 *  The dedupe lives HERE and not in options.ts on purpose: options.ts is
 *  pinned byte-identical to the legacy TurnSummary code it was lifted from, so
 *  the two producers stay independently correct and this seam — the only place
 *  that knows both lines will share a line of screen — owns the join.
 *
 *  Order is first-wins, so the mechanics keep their position; only the later
 *  echo is dropped. Comparison is case- and space-insensitive because the two
 *  producers capitalise independently. Nothing is ever dropped from a single
 *  line's own sequence unless it genuinely says the same thing twice, which is
 *  also not something worth showing.
 *
 *  `costLabel` is the third producer sharing the row. Riptide Step priced
 *  "Bonus action · 3/3 uses" in gold and then said "3/3 uses" again in cream
 *  directly beneath it — the same reading, twice, on one row. The rule the
 *  screen already follows elsewhere is that whatever states a cost owns it and
 *  nothing repeats it: `mutexPrices` in TurnScreenD drops a pool from the
 *  resource strip on exactly those grounds. This applies it one level down.
 *  Match is EXACT (after normalising), so "1st-level" is not swallowed by
 *  "1st-level slot" — a near-miss is a different fact and stays.
 *
 *  With one deliberate exception: a COUNTER READING — a leading "n/m" — is
 *  matched on the numbers alone, because the two producers disagree about the
 *  noun. Lay on Hands is priced "Bonus action · 15/40 points" and its detail
 *  said "15/40 uses": the same number, on the same row, in two words for the
 *  same thing. Exact matching would keep both, and the row would still be
 *  telling Marcus his hit point pool twice while implying they might be
 *  different pools. Only the fraction is compared, so 15/40 never suppresses
 *  1/2, and a segment that merely CONTAINS a number ("1d8+4 Slashing", "+7 to
 *  hit") is untouched — the pattern must start the segment. */
function detailOf(option: ActionOption, costLabel = ''): string {
  const parts = [option.mechanicsLine, option.effectsLine].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  )
  /** What two segments must share to be the same statement. */
  const keyOf = (raw: string): string => {
    const seg = raw.trim().toLowerCase()
    const counter = /^(\d+\s*\/\s*\d+)\b/.exec(seg)
    return counter ? `#${counter[1].replace(/\s+/g, '')}` : seg
  }
  const seen = new Set<string>(
    costLabel
      .split(' · ')
      .map(keyOf)
      .filter(s => s.length > 0),
  )
  const segments: string[] = []
  for (const part of parts) {
    for (const raw of part.split(' · ')) {
      const seg = raw.trim()
      const key = keyOf(seg)
      if (!key || seen.has(key)) continue
      seen.add(key)
      segments.push(seg)
    }
  }
  return segments.join(' · ') || option.summary
}

function costOf(
  option: ActionOption,
  slot: EconomySlot,
  feature: ClassFeature | undefined,
  character: Character,
): OptionCost {
  const base = ECONOMY_LABEL[slot]

  if (option.type === 'spell') {
    const level = option.spellLevel ?? 0
    if (level > 0) {
      return { slot, spellSlotLevel: level, label: `${base} · ${levelLabel(level)}-level slot` }
    }
    return { slot, label: `${base} · no slot` }
  }

  if (feature) {
    // `poolIdForFeature` prefers an explicit `resourcePoolId` over the
    // name-derived one. That is the whole of Slice 6b's wiring on this side:
    // without it a pool Marcus authors has no consumer, and "create a pool,
    // spend it from the turn screen" cannot happen. With it, several features
    // can draw on ONE shared pool at different prices — the case a per-feature
    // `usesMax` counter has never been able to express.
    const poolId = poolIdForFeature(feature)
    if (poolId) {
      // Absent means 1, matching the reducer's `option.resourceAmount ?? 1`.
      // Both sides state the default rather than one of them inferring it.
      const amount = feature.resourceAmount ?? 1
      // The reading comes from the POOL, not from the option's own
      // `usesRemaining` string. Two reasons, and the first was a real bug:
      //
      //  1. A mutex face suppresses its pool from the resource strip on the
      //     grounds that the face already shows it (TurnScreenD:148). For a
      //     feature bound to an authored pool there is no `usesRemaining` —
      //     the counter lives on the pool, not on the feature — so the label
      //     fell back to a bare "Action", the strip stayed silent, and Hearth
      //     Embers was invisible on the only screen that spends it.
      //  2. The pool knows its unit. `usesRemaining` said "40/40 uses" for Lay
      //     on Hands, which is 40 POINTS. Slice 6b fixed that in the model; it
      //     would be strange to keep saying the wrong word on the screen.
      //
      // A price of 1 is not stated — every other option on the screen costs
      // one of itself and does not say so. A price above 1 always is.
      const pool = findPool(character, poolId)
      const reading = pool
        ? amount > 1
          ? `${amount} of ${pool.current} ${pool.unit}`
          : `${pool.current}/${pool.max} ${pool.unit}`
        : option.usesRemaining
      return {
        slot,
        resourcePoolId: poolId,
        resourceAmount: amount,
        label: reading ? `${base} · ${reading}` : base,
      }
    }
  }

  return { slot, label: base }
}

/** The mastery rider on a weapon, if it has one.
 *
 *  A mastery this build has never heard of is NOT dropped. Marcus writes
 *  homebrew; a rider that vanishes because the engine could not automate it
 *  would be the app quietly editing his character sheet. It comes through with
 *  `known: false`, its declared name intact, and no behaviour invented for it. */
function riderOf(weapon: Weapon): OptionRider | undefined {
  const known = riderFor(weapon)
  if (known) {
    return {
      property: known.property,
      known: true,
      text: known.text,
      automatic: known.automatic,
      expires: known.expires,
    }
  }

  const declared = typeof weapon.masteryProperty === 'string' ? weapon.masteryProperty.trim() : ''
  if (!declared) return undefined
  return {
    property: declared,
    known: false,
    text: declared,
    automatic: false,
    expires: 'unspecified',
  }
}

/** One line of prose for a condition, preferring the rules text.
 *
 *  `note` is the printed caveat and is always better than anything assembled
 *  from booleans. The fallback exists for homebrew conditions, which have no
 *  note and no flags — and for those, saying only the name is honest. */
/** The whole paragraph behind an always-active passive.  Slice 8d-2.
 *
 *  CANON FIRST, THE SHEET SECOND, AND THIS IS NOT A NEW RULE. It is the order
 *  `canonBands` already applies to a feature — `feature?.rawText ||
 *  fallbackText`, canon/bands.ts:198 — reused rather than restated, because two
 *  judges of one fact is how they come to disagree, and the aura and the detail
 *  sheet must not end up quoting different paragraphs of the same feature.
 *
 *  THE OPEN-WORLD RULE HOLDS AT THIS BOUNDARY TOO. A feature canon has never
 *  heard of is not a lesser citizen: it falls through to the sheet's own
 *  `description` and reads in full, in Marcus's words. Undefined only when
 *  there is genuinely no longer text anywhere, which is the honest answer and
 *  the one that leaves the disclosure undrawn. */
function fullTextOfPassive(name: string, character: Character): string | undefined {
  const canon = featureByName(name)
  if (canon && typeof canon.rawText === 'string' && canon.rawText.trim()) return canon.rawText
  const own = character.features.find(f => f.name === name)
  return own?.description?.trim() || undefined
}

function uponFromCondition(effect: ConditionEffect): UponYou {
  const harmful =
    effect.blocks.length > 0 ||
    effect.yourAttacksHaveDisadvantage ||
    effect.attacksAgainstYouHaveAdvantage
  const helpful = effect.yourAttacksHaveAdvantage || effect.attacksAgainstYouHaveDisadvantage

  return {
    name: effect.name,
    known: effect.known,
    text: effect.note ?? describe(effect),
    side: 'you',
    tone: !effect.known ? 'neutral' : harmful ? 'bad' : helpful ? 'good' : 'neutral',
  }
}

function describe(effect: ConditionEffect): string {
  const parts: string[] = []
  if (effect.blocks.length > 0) {
    parts.push(`No ${effect.blocks.map(s => ECONOMY_LABEL[s].toLowerCase()).join(', ')}.`)
  }
  if (effect.yourAttacksHaveDisadvantage) parts.push('Disadvantage on your attack rolls.')
  if (effect.yourAttacksHaveAdvantage) parts.push('Advantage on your attack rolls.')
  if (effect.attacksAgainstYouHaveAdvantage) parts.push('Attacks against you have advantage.')
  if (effect.attacksAgainstYouHaveDisadvantage) parts.push('Attacks against you have disadvantage.')
  if (parts.length === 0) return effect.known ? 'No mechanical effect on your turn.' : 'Homebrew — ask your DM.'
  return parts.join(' ')
}

/** Every pool the screen can show, deduplicated by id.
 *
 *  Slice 6b hollowed this out. It used to build the list itself — paladin pair,
 *  then feature counters, deduped, with the units correction — which meant the
 *  screen's idea of "your pools" and the reducer's idea of "the pool I am about
 *  to charge" were two separate pieces of code that had to stay in agreement by
 *  hand. They didn't have to disagree by much: charge one pool, display
 *  another, and the screen still looks right.
 *
 *  `poolsOf()` is now the single answer, and it kept every rule this function
 *  documented — paladin-before-feature precedence (a feature named "Lay on
 *  Hands" must point at THAT pool rather than minting a second one showing the
 *  same 40 points twice), the level gate, both-halves-or-untracked, and the
 *  points/uses correction. What remains here is the projection down to what the
 *  screen needs: `origin` and `editable` are the editor's business, not the
 *  turn screen's, so they are dropped at this boundary rather than travelling
 *  as dead weight into every render. */
function resourcesOf(character: Character): TurnResource[] {
  return poolsOf(character).map(pool => ({
    id: pool.id,
    name: pool.name,
    current: pool.current,
    max: pool.max,
    unit: pool.unit,
    recharge: pool.recharge,
    ...(pool.homebrew ? { homebrew: true as const } : {}),
    ...(pool.note ? { note: pool.note } : {}),
  }))
}

/** Slot tiers you actually possess, lowest first.
 *
 *  A tier with max 0 is not a tier you have; showing "0 of 0" would be noise
 *  on the one screen that cannot afford any. */
function spellSlotsOf(character: Character) {
  const slots = character.spellSlots ?? {}
  return Object.keys(slots)
    .map(Number)
    .filter(level => Number.isFinite(level) && (slots[level]?.max ?? 0) > 0)
    .sort((a, b) => a - b)
    .map(level => ({ level, current: slots[level].current, max: slots[level].max }))
}
