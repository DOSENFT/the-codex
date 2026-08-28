/* The retaliation tally — a number the app CAPTURES rather than computes.
 *
 * ── WHY THIS IS DIFFERENT FROM EVERY OTHER NUMBER IN THE APP ────────────────
 * Canon's HEARTH-05 `appAction` asks for it in as many words: *"Implement as
 * written but display the total retaliation damage dealt per encounter so the
 * DM can see the real numbers."*
 *
 * Every other number on the Play tab is DERIVED — save DC from the sheet, temp
 * HP from a formula, a cost from a rules table. Give the app the character and
 * it can recompute all of them from scratch. This one it cannot: a d10 came up
 * 7, and nothing about Nix's sheet implies 7. If the app does not write it
 * down at the moment it happens, the number is gone.
 *
 * That single property drives every decision below.
 *
 * ── WHY THE TALLY IS NOT THE SESSION LOG ────────────────────────────────────
 * The obvious implementation is to sum the retaliations out of the undo log.
 * It is wrong, and quietly: `events.ts` sets `LOG_DEPTH = 25` and truncates,
 * because the log rides in localStorage next to the character and is a safety
 * net for the last thing you did, not a session replay. A long fight is well
 * over 25 entries, so the earliest retaliations would fall off the end and the
 * DM's total would SHRINK as the fight went on — displaying a smaller number
 * with every hit, while looking exactly as authoritative as a correct one.
 *
 * A wrong total that looks right is worse at the table than no total. So the
 * running sum lives in `CombatState`, which is never truncated, and the log
 * carries only the individual events for undo.
 *
 * ── WHY IT IS OPTIONAL ON `CombatState` ─────────────────────────────────────
 * Straight off slice 7's precedent, quoted from `combat-state.ts`:
 *
 *     "OPTIONAL ON PURPOSE. Marcus's live combat state is in his browser's
 *      localStorage and predates this field; `reconcile` reads a missing value
 *      as `true`, which is exactly the behaviour he has today. Nothing he has
 *      saved changes meaning."
 *
 * Same here, and easier: absent means nothing has been recorded, which is
 * exactly zero. Unlike `yourTurn` there is no behaviour riding on the default,
 * so `reconcile` needs no new branch — `tallyOf` reads absent as `{0, 0}` and
 * the phase's definition-of-done 8 (Nix's stored keys unchanged in shape) is
 * satisfied for anyone who never triggers one.
 *
 * ── WHY RECOGNITION IS BY SHAPE, NEVER BY NAME ──────────────────────────────
 * Nothing here says "Flaming Cloak" or "Hearthfire Manifest", and that is the
 * open-world rule this phase has held since slice 1. A retaliation is a fact
 * canon marked `free` (slice 10e's `isFreeRider`: it fires on a trigger of its
 * own and names no price) whose shape is `dice`. Any feature in any future
 * canon package that carries such a fact gets the button and the tally, for
 * free, with no code change and no list to maintain.
 *
 * The inverse matters just as much: Smoldering Smite's `1d8 Fire` states no
 * trigger — it is the damage the Smite you cast is MADE of — so it is not
 * `free`, gets no button, and is not tallied. The distinction is canon's
 * sentence, not our opinion.
 *
 * Table Truth slice 10f (HEARTH-05).
 */
import type { Character } from '../character'
import type { CombatState } from '../combat-state'
import type { CanonFeature } from '../canon/types'
import { featureByName } from '../canon/lookup'
import { featureFacts, type FeatureContext } from '../canon/feature'
import type { DieType } from '../dice'

/** A die that fires for free on a trigger of its own, ready to roll. */
export interface RetaliationDie {
  /** Canon's notation, verbatim: "1d10". */
  notation: string
  quantity: number
  dieType: DieType
  /** "Fire". Canon's word — the DM asked for real numbers, and a damage type
   *  is half of what makes a number real. */
  damageType: string
  /** The feature canon hangs it off, for the label on the log entry. */
  feature: string
}

export interface RetaliationTally {
  total: number
  hits: number
}

const NONE: RetaliationTally = { total: 0, hits: 0 }

/* `rollDice` takes a DieType, not any integer, and that is a constraint worth
   honouring rather than casting past. Canon could name a die this app cannot
   roll — d3, or something a future package invents — and the honest answer to
   that is no button, not a button that rolls the wrong solid. */
const ROLLABLE: readonly number[] = [4, 6, 8, 10, 12, 20, 100]

/** "1d10 Fire damage in retaliation" → the parts needed to roll it.
 *
 *  Deliberately re-parses canon's `raw` rather than the fact's rendered
 *  `value`. `value` is built for reading ("1d10 Fire retaliation"), and a
 *  display string is allowed to change; `raw` is what canon wrote. */
const DICE_AND_TYPE = /(\d+)d(\d+)\s+([A-Z][a-z]+)/

/** The free retaliation die this feature carries, or null.
 *
 *  Null for the overwhelming majority of features, and that is the point: this
 *  returns something only when canon states a die that costs nothing and fires
 *  on the world doing something to you. */
export function retaliationOf(
  feature: CanonFeature | undefined,
  ctx: FeatureContext,
): RetaliationDie | null {
  if (!feature) return null

  for (const fact of featureFacts(feature, ctx)) {
    // BOTH halves, and they come from slice 10e rather than from here: `free`
    // is `isFreeRider(raw)` and `dice` is the classifier. This module adds no
    // new opinion about what a retaliation is.
    if (!fact.free || fact.shape !== 'dice') continue

    const m = DICE_AND_TYPE.exec(fact.raw)
    if (!m) continue

    const quantity = Number(m[1])
    const dieType = Number(m[2])
    if (!Number.isFinite(quantity) || quantity < 1) continue
    if (!ROLLABLE.includes(dieType)) continue

    return {
      notation: `${quantity}d${dieType}`,
      quantity,
      dieType: dieType as DieType,
      damageType: m[3],
      feature: feature.name,
    }
  }
  return null
}

/** The retaliation currently ACTIVE on this character, or null.
 *
 *  "Active" is not a new concept invented here — `character.ts` already states
 *  the model in its own comment on `tempHPSource`:
 *
 *      "the cloak is up exactly while `tempHP > 0` and this [source]"
 *
 *  So: a live pool, a source that names something, and that something carrying
 *  a free die. All three, or nothing. This is what decides whether logging
 *  damage offers the prompt, and it must stay silent the rest of the time — a
 *  prompt that fires on every damage entry is a prompt that gets dismissed
 *  without reading. */
export function activeRetaliation(
  character: Character,
  ctx: FeatureContext,
): RetaliationDie | null {
  if (character.tempHP <= 0) return null
  const source = character.tempHPSource
  if (!source) return null
  return retaliationOf(featureByName(source), ctx)
}

/** What has been recorded this encounter. Absent reads as zero — see the header.
 *
 *  Defensive about the values themselves, not out of habit but because this
 *  field is parsed straight off localStorage, where a half-written record from
 *  a killed tab is a real thing that happens. A NaN total would render as
 *  "NaN" next to the DM. */
export function tallyOf(combat: CombatState): RetaliationTally {
  const t = combat.retaliation
  if (!t) return NONE
  const total = Number.isFinite(t.total) ? Math.max(0, Math.trunc(t.total)) : 0
  const hits = Number.isFinite(t.hits) ? Math.max(0, Math.trunc(t.hits)) : 0
  return { total, hits }
}

/** Record one retaliation. Pure; the reducer owns when this is allowed. */
export function addRetaliation(combat: CombatState, amount: number): CombatState {
  const { total, hits } = tallyOf(combat)
  return { ...combat, retaliation: { total: total + amount, hits: hits + 1 } }
}

/** "23 damage over 4 hits" — the DM's sentence.
 *
 *  Hits as well as damage, because the two answer different questions. The
 *  total is what the DM asked for; the count is what tells Marcus whether the
 *  app missed one, which is the failure mode of a tally that a human has to
 *  remember to tap. */
export function tallyLine(tally: RetaliationTally, damageType?: string): string {
  if (tally.hits === 0) return 'none yet'
  const type = damageType ? `${damageType} ` : ''
  return `${tally.total} ${type}over ${tally.hits} ${tally.hits === 1 ? 'hit' : 'hits'}`
}
