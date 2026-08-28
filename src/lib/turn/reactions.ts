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

/* ── FINDING BJ: one feat, one name, two triggers ───────────────────────────
   Found at Phase 1's close by reading a passing check's own printout: the band
   rendered «Sentinel | Sentinel». Neither row is a duplicate — Sentinel has two
   separate reaction clauses (a creature within 5 feet Disengages; a creature
   within 5 feet attacks someone other than you) and `feats.ts` is right to
   split them, because collapsing them answers "when can I use it" wrongly and
   dropping one loses a reaction he owns. But two rows under one heading read,
   at a glance, as the app stuttering. It was also an accessibility fault nobody
   had noticed: both detail buttons were named «Sentinel — details», so a screen
   reader offered the same door twice.

   THE SUFFIX IS COMPUTED, NEVER WRITTEN. The tempting fix is a label —
   "Sentinel (Disengage)" — and it is the open-world rule's exact trap: it works
   for the one feat I can see and invents a name for every feat I cannot. So the
   disambiguator is lifted VERBATIM out of each row's own trigger, at the word
   where the triggers stop agreeing. For Marcus that yields «takes the Disengage
   action» and «attacks a target other than you» — his book's words, not mine.

   IT REFUSES RATHER THAN GUESSES. If any row in a colliding group has no stated
   trigger, if one trigger is a prefix of another, or if the divergent tails are
   not themselves distinct, nothing is renamed. A heading collision is a fault
   worth naming; a heading collision plus an invented distinction is worse than
   the collision.

   Cut at a comma, never mid-word, and never with an ellipsis — the same rule
   the rest of this phase runs on. Table Truth, phase-1 close-out. */
const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean)

/** The leading SEGMENT of a phrase. Whole clauses are dropped; characters never
 *  are, so nothing this returns can end mid-word or need an ellipsis. */
function firstSegment(words: string[]): string {
  const joined = words.join(' ')
  const comma = joined.indexOf(', ')
  return comma > 0 ? joined.slice(0, comma) : joined
}

/** How many leading words every one of these lists shares. */
function commonPrefixLength(lists: string[][]): number {
  const shortest = Math.min(...lists.map(l => l.length))
  let n = 0
  while (n < shortest && lists.every(l => l[n] === lists[0][n])) n++
  return n
}

/** Give rows that share a heading their own heading, out of their own triggers.
 *
 *  Mutates the freshly-built row objects rather than rebuilding them: they were
 *  created one statement ago in `reactionRows` and are visible to nobody else.
 *  `option.name` is deliberately NOT touched — canon is matched by it two lines
 *  earlier, and a renamed option is an option canon can no longer find. */
export function disambiguateHeadings(rows: ReactionRow[]): ReactionRow[] {
  const groups = new Map<string, ReactionRow[]>()
  for (const row of rows) {
    const group = groups.get(row.name)
    if (group) group.push(row)
    else groups.set(row.name, [row])
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    const triggers = group.map(r => r.when)
    if (triggers.some(t => !t || !t.trim())) continue

    const lists = triggers.map(t => wordsOf(t as string))
    const shared = commonPrefixLength(lists)
    const tails = lists.map(l => firstSegment(l.slice(shared)))

    /* A tail that is empty distinguishes nothing — that is one trigger being a
       prefix of another, or the two being identical. Leave the rows alone. */
    if (tails.some(t => t.length === 0)) continue
    /* The second line is a POSTCONDITION, not an expected case, and the tests
       say so. Because the shared prefix is maximal, two tails always differ at
       their first word; the only way to collide is for the triggers to be
       equal, which the line above already caught. It stays because it is free
       and it is the invariant the whole rename rests on: never turn one
       collision into a longer one. */
    if (new Set(tails).size !== tails.length) continue

    group.forEach((row, i) => { row.name = `${row.name} · ${tails[i]}` })
  }

  return rows
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

  return disambiguateHeadings(allOptions(turn)
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
    }))
}
