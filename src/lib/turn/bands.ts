import type { ComposedTurn, TurnOption } from './types'

/* ============================================================================
   THE FOUR BANDS — item 5, and the only new logic in this phase.
   ----------------------------------------------------------------------------
   Marcus, on the two boxes that between them list everything he can do:
   "neither of them organize between Action, bonus action, etc visually that
   well. It should be a very apparent and masterful organization visually."

   The organisation is a FACT THE ENGINE ALREADY KNOWS — every option carries
   `cost.slot`, and every slot's open/spent state is on `turn.economy`. So this
   file computes nothing and decides nothing. It re-shelves what compose.ts
   already answered, and it is pure so that the shelving rule can be proved
   without a browser.

   TWO PROPERTIES, both tested:

     1. NOTHING IS DROPPED.  count(ranked) + count(rest) === sum of band sizes,
        always. A band scheme that silently loses an option is worse than the
        flat list it replaces, because the flat list at least showed everything.

     2. ORDER IS NOT INVENTED.  Within a band the options keep the order
        compose.ts ranked them in — available first, then blocked, each half in
        rank order. Re-sorting here would put this file in disagreement with
        rank.ts about what matters, and rank.ts is the one with the reasons.
   ========================================================================== */

/** The four bands, in the order they are spent at a table.
 *
 *  `'free'` is the fifth member of `EconomySlot` and is deliberately NOT one of
 *  these four — see `groupBySlot` for where a free-cost option goes and why. */
export type BandSlot = 'action' | 'bonusAction' | 'reaction' | 'movement' | 'free'

/** The four economy bands, always rendered, always in this order. */
export const BAND_ORDER: readonly BandSlot[] = ['action', 'bonusAction', 'reaction', 'movement']

/** His words, item 5. Uppercased in the markup by CSS, not here — the label is
 *  data and a screen reader should not have to hear it spelled out. */
export const BAND_LABEL: Record<BandSlot, string> = {
  action: 'Action',
  bonusAction: 'Bonus',
  reaction: 'Reaction',
  movement: 'Movement',
  free: 'No cost',
}

export interface Band {
  slot: BandSlot
  label: string
  /** Is this economy slot still his to spend? Read from `turn.economy`, which
   *  is already inverted for us — true means OPEN, not spent. */
  open: boolean
  /** Everything of that kind: available first, then blocked-with-a-reason. */
  options: TurnOption[]
  /** How many he could actually take right now. The band's "3 ready".
   *
   *  ALWAYS a number, including 0. A count that went absent for an empty band
   *  would be a negative marker checked by looking for it — the fault
   *  HANDOFF.md §4 names, paid for once already in phase 4. */
  readyCount: number
}

/** `ranked` + `rest`, shelved on `option.cost.slot`.
 *
 *  CONTENDED FACES ARE HERE — Slice R2, 2026-09-04, and this is the reversal.
 *  This header used to say mutex faces "were removed from `ranked`/`rest` by
 *  compose.ts before this function ever sees them", which made the NOTHING IS
 *  DROPPED property above a claim about two lists rather than about the turn.
 *  A reader who trusted it was trusting a promise the screen did not keep:
 *  contention removed an option from its band for exactly as long as it was
 *  available, which is the one span of time it mattered.
 *
 *  compose.ts no longer filters, so the property is now what every reader
 *  already took it to mean — EVERY option the engine composed lands in exactly
 *  one band. A contended one lands in the band its price names, like the rest,
 *  and carries `contended` so the row can say it competes and the band can
 *  print the sentence at its foot.
 *
 *  WHERE A FREE-COST OPTION GOES. Measured on the composer rather than assumed:
 *  `everything` is built from three buckets at three fixed prices — actions at
 *  `'action'`, bonus actions at `'bonusAction'`, reactions and opportunity
 *  attacks at `'reaction'` (compose.ts:655-661) — and passives never become
 *  options at all; they become `upon` entries, which is the "always active"
 *  strip Marcus asked to keep. So today NOTHING in `ranked` or `rest` costs
 *  `'free'` or `'movement'`, and the MOVEMENT band is honestly empty.
 *
 *  It is still wrong to drop a free option if one ever arrives. Filing it under
 *  ACTION would be a lie about the economy — free is precisely the price that
 *  closes no slot — so it gets a fifth band of its own, appended ONLY when it
 *  has something in it. On his sheet that band does not render at all, and if
 *  the engine ever produces one, the option is on screen instead of gone. */
export function groupBySlot(turn: ComposedTurn): Band[] {
  const bands: Band[] = BAND_ORDER.map(slot => ({
    slot,
    label: BAND_LABEL[slot],
    // `EconomyState` carries exactly these four booleans plus
    // `spellSlotUsedThisTurn`, which is a rule about slots and not a band.
    open: turn.economy[slot as 'action' | 'bonusAction' | 'reaction' | 'movement'],
    options: [],
    readyCount: 0,
  }))
  const free: Band = {
    slot: 'free',
    label: BAND_LABEL.free,
    // Free is the one price that is never spent, so this band is never closed.
    open: true,
    options: [],
    readyCount: 0,
  }

  const shelf = new Map<string, Band>(bands.map(b => [b.slot, b]))

  for (const option of [...turn.ranked, ...turn.rest]) {
    // `?? free` is the catch-all, and it is deliberate: an option arriving with
    // a price this file has never heard of lands somewhere visible rather than
    // being filtered out of existence. Dropping whole segments, never
    // characters — the open-world rule, applied to a shelf.
    const band = shelf.get(option.cost.slot) ?? free
    band.options.push(option)
  }

  for (const band of [...bands, free]) {
    const available = band.options.filter(o => o.available)
    const blocked = band.options.filter(o => !o.available)
    // A blocked option is greyed WITH ITS REASON and kept — D never hides —
    // but it sinks below the things he can actually do.
    band.options = [...available, ...blocked]
    band.readyCount = available.length
  }

  return free.options.length > 0 ? [...bands, free] : bands
}
