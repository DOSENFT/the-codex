// ---------------------------------------------------------------------------
// Contention — one decision, several faces
// ---------------------------------------------------------------------------
//
// D's defining element.  Under the 2024 rules Divine Smite, Shield of Faith,
// Misty Step, Lay on Hands and Channel Divinity all want Nix's bonus action,
// and the first three additionally contend under the one-spell-slot-per-turn
// rule.  That is ONE DECISION WITH FIVE FACES.  Listing it as five rows in a
// scrolling list is not a layout preference — it is a lie about the rules, and
// it is the specific lie that makes a turn take ninety seconds instead of fifteen.
//
// WHAT COUNTS AS A FACE.  Only options with a LIMITED cost: a spell slot, or a
// pool.  A weapon attack costs nothing you can run out of, so bracketing it
// with a Smite would say something false — you can always swing again next
// turn.  This is why Nix's Action bracket contains Cure Wounds and Warding
// Bond but not Hearthbrand, Javelin or Sacred Flame.
//
// SCOPE NOTE.  `04-slices.md` put contention in Slice 5 alongside `rank.ts`.
// It landed here in Slice 4 instead, deliberately: contention is a statement
// about what is LEGAL — Slice 4's remit — whereas ranking is a statement about
// what is WISE, which is Slice 5's. Deferring it would also have shipped a
// turn screen visibly poorer than Slice 1's, which the standing "never reduce
// capability" rule forbids. Slice 5 still owns rank.ts and may widen the rule
// below.

import type { EconomySlot } from '../rules-2024/economy'
import type { MutexGroup, TurnOption } from './types'

const CAPTION: Partial<Record<EconomySlot, string>> = {
  action: 'One of these — your action',
  bonusAction: 'One of these — your bonus action',
  reaction: 'One of these — your reaction',
  movement: 'One of these — your movement',
}

/** WHY these cannot coexist, in the words you would say to a DM.
 *
 *  Slice R3, 2026-09-04, and it lives HERE rather than in a component because
 *  `reason` is computed thirty lines below and a sentence that explains a value
 *  should not be able to drift from the code that decides it. `ContentionBand`
 *  holds a private copy of these four strings; that file is mounted nowhere
 *  (its live wrapper went in slice 8b) and is a deletion candidate for 8c, so
 *  it is left alone rather than churned.
 *
 *  A `Record`, not an index signature: `reason` is a four-member union and this
 *  map must be TOTAL, or the day the fourth arm starts being emitted the screen
 *  paints an `undefined` where the rule should be. */
export const CONTENTION_WHY: Readonly<Record<MutexGroup['reason'], string>> = {
  both: 'They want the same slot — and only one levelled spell slot leaves your hands per turn.',
  resource: 'They draw on the same pool, so spending one leaves less for the other.',
  economy: 'They want the same slot, so this turn you get one of them.',
  /* `findContention`'s ternary yields both / resource / economy and never this.
     The sentence is written anyway, for the reason above. */
  spellSlot: 'Only one levelled spell slot leaves your hands per turn, so casting one rules out the other.',
}

/** True if this option spends something finite.  Free options never contend:
 *  there is no decision in "which unlimited thing shall I do", only in "which
 *  of my limited things do I spend". */
function hasLimitedCost(option: TurnOption): boolean {
  return option.cost.spellSlotLevel !== undefined || option.cost.resourcePoolId !== undefined
}

/** Group the options that cannot coexist this turn.
 *
 *  Faces are marked `contended` so the caller can SAY SO ON THE ROW — Slice R2,
 *  2026-09-04. This used to read "so the caller can keep them out of the flat
 *  lists", and that removal was the defect: because the loop below skips
 *  unavailable options, an option left its band for exactly as long as it was
 *  takeable and returned the moment it was not. The screen was emptiest when it
 *  had the most to offer.
 *
 *  The claim this module makes is still true and still worth making — these
 *  five are one decision, not five — and after R3 it is made where the decision
 *  is: a marker on each row and one sentence at the foot of the band. Nothing
 *  is listed twice, which was always the property worth defending. */
export function findContention(options: readonly TurnOption[]): MutexGroup[] {
  const bySlot = new Map<EconomySlot, TurnOption[]>()
  for (const option of options) {
    if (!option.available) continue          // a blocked option is not a choice
    if (!hasLimitedCost(option)) continue
    const slot = option.cost.slot
    if (slot === 'free') continue
    const bucket = bySlot.get(slot) ?? []
    bucket.push(option)
    bySlot.set(slot, bucket)
  }

  const groups: MutexGroup[] = []
  for (const [slot, faces] of bySlot) {
    if (faces.length < 2) continue           // one face is not a decision

    const slotSpenders = faces.filter(f => f.cost.spellSlotLevel !== undefined).length
    const poolIds = faces.map(f => f.cost.resourcePoolId).filter(Boolean)

    // Two INDEPENDENT causes can apply at once, and saying which is the whole
    // value of the caption: the bonus action alone would still let you Smite
    // next turn, whereas the one-slot rule is what stops Smite and Misty Step
    // ever sharing a turn.
    const reason: MutexGroup['reason'] =
      slotSpenders >= 2 ? 'both'
      : new Set(poolIds).size < poolIds.length ? 'resource'
      : 'economy'

    for (const face of faces) face.contended = true
    groups.push({
      id: `mutex-${slot}`,
      label: CAPTION[slot] ?? `One of these — ${slot}`,
      reason,
      faces,
    })
  }

  // Stable order: the bonus action first, because it is the slot people
  // actually agonise over, then the action, then the rest.
  const ORDER: EconomySlot[] = ['bonusAction', 'action', 'reaction', 'movement']
  return groups.sort(
    (a, b) => ORDER.indexOf(a.faces[0].cost.slot) - ORDER.indexOf(b.faces[0].cost.slot),
  )
}
