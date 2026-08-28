/* The reaction band's row models.
 *
 * Marcus asked for this one directly: the combat tab "doesn't show my reactions
 * (like hearth fire manifest and what it does or when i can use it)". Two
 * questions per row — what does it do, and when can I use it — and this module
 * answers both from data, so the components stay dumb and the answers stay
 * testable without a browser.
 *
 * ── WHY IT DOES NOT JUST READ `turn.ranked` ─────────────────────────────────
 * 03-program-design.md:285 says "Your Reactions = turn.ranked.filter(slot ===
 * 'reaction')". That is wrong, and measuring it is how we know: `rank.ts` scores
 * a reaction at −40 ON YOUR TURN, which drops both of Nix's reactions out of
 * `ranked` and into `rest`. A band built on that line would paint EMPTY for the
 * whole of his turn — the exact half of combat he is looking at the screen. So
 * the source is every bucket the engine produced, filtered by cost. Gate 3 has
 * been corrected to match.
 *
 * ── THE CANON BRIDGE ────────────────────────────────────────────────────────
 * `featureByName('Flaming Cloak')` reaches Hearthfire Manifest as of slice 6's
 * alias index. That is what lets this row say "12 temp HP · 1d10 Fire
 * retaliation" instead of the sheet's "1d10 Fire · recharges on short rest",
 * which reads as though the cloak DEALS 1d10 when you use it. If canon has
 * nothing, the sheet's own words stand and the row still renders: a miss is
 * never a missing row.
 *
 * Table Truth slice 6. */

import type { Character } from '../character'
import { featureByName, spellByName, errataForFeature } from '../canon/lookup'
import { featureFacts, factsLine } from '../canon/feature'
import { fitRowDetail, featureContextOf } from './overlay'
import { triggerFor, ruledTrigger, type RuledTrigger, type TriggerSource } from './trigger'
import { retaliationOf, type RetaliationDie } from './retaliation'
import type { ComposedTurn, TurnOption } from './types'
import type { Provenance } from '../canon/types'
import type { ErratumRulings } from '../errata-rulings'

export interface ReactionRow {
  id: string
  name: string
  /** The cost line, from the engine: "Reaction", "Reaction · 1/2 uses". */
  cost: string
  available: boolean
  blockedReason?: string
  /** Null means NOBODY states one — neither the sheet nor canon. The row is
   *  required to show that rather than hide it; see `trigger.ts`. */
  when: string | null
  whenSource: TriggerSource
  /** Present only when `whenSource === 'ruled'` — which erratum Marcus answered
   *  and whose words the clause is. The row must print it: a trigger that
   *  appeared with no attribution is an invented rule, which is the thing slice
   *  6 refused to ship. Slice 8b. */
  whenRuling?: RuledTrigger
  /** What it does, already fitted to the row budget. Never ellipsised. */
  body: string
  provenance: Provenance
  homebrew: boolean
  /** Canon's errata ids for the feature this row matched. Empty when canon has
   *  no match or no errata. Slice 8 renders them; slice 6 only counts them. */
  errataIds: string[]
  /** A die this feature throws back for FREE when its trigger fires, or null.
   *
   *  Null for almost every row, and that is the shape of the fact rather than a
   *  gap in the data: a reaction that costs your Reaction to deal its damage is
   *  already priced by `cost`, and the engine already spends it. This field is
   *  only ever set for the rarer thing — canon stating a die that costs nothing
   *  and fires on the world doing something to you, which the app has no way to
   *  notice and so has to be TOLD about.
   *
   *  Recognised by shape, never by name — see `retaliation.ts`. Slice 10f. */
  retaliation: RetaliationDie | null
  /** The option this row was built from, carried whole — Table Truth slice 7.
   *
   *  The detail sheet takes a `TurnOption`, and a reaction row must be able to
   *  open it just as a turn row does. The alternative was a second lookup: hand
   *  the sheet this row's `id` and have it search the composed turn again. That
   *  is a second way for the same tap to resolve to the wrong thing, and the
   *  first way is already the one that works. One path, one shape. */
  option: TurnOption
}

/** Every option the engine produced, in a stable order, deduped by id.
 *
 *  `ranked` first, then `rest`, then the faces of each mutex group — which is
 *  reading order on screen, so a reaction that IS ranked (off your turn) keeps
 *  the priority the engine gave it. */
function allOptions(turn: ComposedTurn): TurnOption[] {
  const seen = new Set<string>()
  const out: TurnOption[] = []
  for (const option of [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]) {
    if (seen.has(option.id)) continue
    seen.add(option.id)
    out.push(option)
  }
  return out
}

export function reactionRows(
  turn: ComposedTurn,
  character: Character,
  /** What Marcus has settled with his DM. Defaulting to "nothing recorded"
   *  keeps every slice 6 and 7 caller producing the slice 6 row exactly. */
  rulings: ErratumRulings = {}
): ReactionRow[] {
  const ctx = featureContextOf(character)

  return allOptions(turn)
    .filter(option => option.cost.slot === 'reaction')
    .map(option => {
      const feature = featureByName(option.name)
      const spell = spellByName(option.name)
      /* The errata are fetched once and used twice — for the ruled trigger and
         for the flag count — so the row cannot end up counting a set of errata
         it did not read the rulings of. */
      const errata = feature ? errataForFeature(feature.name) : []
      const reading = triggerFor(option, { feature, spell }, ruledTrigger(errata, rulings))

      /* Canon's structured mechanics beat the sheet's summary line when they
       * resolve to anything at all — that is the whole point of reaching the
       * record. When they resolve to nothing (no mechanics bag, or every entry
       * unprovable in this context) the sheet's words stand untouched. */
      const canonBody = factsLine(featureFacts(feature, ctx))
      const body = canonBody.length > 0 ? canonBody : reading.body

      return {
        id: option.id,
        name: option.name,
        cost: option.cost.label,
        available: option.available,
        blockedReason: option.blockedReason,
        when: reading.when,
        whenSource: reading.source,
        whenRuling: reading.ruling,
        body: fitRowDetail(body),
        provenance: feature ? 'canon' : (option.provenance ?? 'sheet'),
        homebrew: option.homebrew === true,
        errataIds: errata.map(e => e.id),
        /* Read off the SAME `feature` and `ctx` the body line was built from, so
           the row can never offer a die its own text does not mention. */
        retaliation: retaliationOf(feature, ctx),
        option,
      }
    })
}
