import { describe, it, expect } from 'vitest'
import { nextToAim, quietFor, quietLabel, markSpotlight } from './table'
import type { TableMember, TableState } from './types'

/* ============================================================================
   THE SPOTLIGHT ARITHMETIC.

   Marcus: "Explicitly the table — I'm the social engine." Tonight two people at
   his table have never played D&D. The one judgement call in this module is
   asserted below rather than left in a sort comparator, because it is a real
   opinion and it could be wrong.
   ========================================================================== */

const NOW = 1_000_000_000

const member = (over: Partial<TableMember> & { name: string }): TableMember => ({
  id: over.name.toLowerCase(),
  isNew: false,
  lastSpotlightAt: null,
  beatsAimed: 0,
  ...over,
})

const table = (...members: TableMember[]): TableState => ({ scene: '', mood: '', members })

describe('nextToAim — who most needs the spotlight', () => {
  it('puts a brand-new player who has had nothing above a veteran quiet for an hour', () => {
    /* THE OPINION. A veteran CHOOSES their silence and can end it whenever they
       like. A first-timer is usually not quiet by choice — they are quiet
       because they do not yet know it is allowed. */
    const t = table(
      member({ name: 'Tom', lastSpotlightAt: NOW - 60 * 60_000 }),
      member({ name: 'Sarah', isNew: true }),
    )
    expect(nextToAim(t, NOW)!.name).toBe('Sarah')
  })

  it('prefers a new player over a veteran who has also had nothing', () => {
    const t = table(member({ name: 'Tom' }), member({ name: 'Dev', isNew: true }))
    expect(nextToAim(t, NOW)!.name).toBe('Dev')
  })

  it('between two new players, takes the one with fewer beats aimed at them', () => {
    const t = table(
      member({ name: 'Sarah', isNew: true, beatsAimed: 2 }),
      member({ name: 'Dev', isNew: true, beatsAimed: 0 }),
    )
    expect(nextToAim(t, NOW)!.name).toBe('Dev')
  })

  it('between two who have both spoken, takes whoever spoke longer ago', () => {
    const t = table(
      member({ name: 'Tom', lastSpotlightAt: NOW - 5 * 60_000 }),
      member({ name: 'Priya', lastSpotlightAt: NOW - 22 * 60_000 }),
    )
    expect(nextToAim(t, NOW)!.name).toBe('Priya')
  })

  it('is stable when nothing distinguishes two people', () => {
    // A nudge that changes its mind every render is a nudge he learns to ignore.
    const t = table(member({ name: 'Tom' }), member({ name: 'Ana' }))
    expect(nextToAim(t, NOW)!.name).toBe('Tom')
    expect(nextToAim(t, NOW + 5000)!.name).toBe('Tom')
  })

  it('returns null for an empty table instead of throwing', () => {
    // He has not entered a roster. The page still has to render.
    expect(nextToAim(table(), NOW)).toBeNull()
  })
})

describe('quietFor distinguishes "never" from "a while ago"', () => {
  it('is null, not zero, for someone who has never had the spotlight', () => {
    /* Collapsing these is how a brand-new player who has been handed nothing all
       night ends up looking identical to someone who spoke twenty minutes ago. */
    expect(quietFor(member({ name: 'Dev' }), NOW)).toBeNull()
  })

  it('measures from the last spotlight', () => {
    expect(quietFor(member({ name: 'Tom', lastSpotlightAt: NOW - 90_000 }), NOW)).toBe(90_000)
  })

  it('never goes negative on a clock that moved backwards', () => {
    expect(quietFor(member({ name: 'Tom', lastSpotlightAt: NOW + 5000 }), NOW)).toBe(0)
  })
})

describe('quietLabel — the chip text, decided in one place', () => {
  it('says "not yet tonight" for someone untouched', () => {
    expect(quietLabel(member({ name: 'Dev' }), NOW)).toBe('not yet tonight')
  })

  it('rounds down to whole minutes', () => {
    expect(quietLabel(member({ name: 'Tom', lastSpotlightAt: NOW - 22 * 60_000 }), NOW)).toBe('quiet 22m')
  })

  it('says "just now" under a minute rather than "quiet 0m"', () => {
    expect(quietLabel(member({ name: 'Tom', lastSpotlightAt: NOW - 5_000 }), NOW)).toBe('just now')
  })
})

describe('markSpotlight touches exactly one person', () => {
  it('stamps and counts only the named member', () => {
    const t = table(member({ name: 'Sarah' }), member({ name: 'Tom' }))
    const after = markSpotlight(t, 'sarah', NOW)
    expect(after.members[0]).toMatchObject({ lastSpotlightAt: NOW, beatsAimed: 1 })
    expect(after.members[1]).toMatchObject({ lastSpotlightAt: null, beatsAimed: 0 })
  })

  it('does not mutate the table it was given', () => {
    // The cockpit holds this in React state; a mutation here is a stale render.
    const t = table(member({ name: 'Sarah' }))
    markSpotlight(t, 'sarah', NOW)
    expect(t.members[0].beatsAimed).toBe(0)
  })

  it('ignores an id that is not at the table', () => {
    const t = table(member({ name: 'Sarah' }))
    expect(markSpotlight(t, 'nobody', NOW).members[0].beatsAimed).toBe(0)
  })
})
