import { describe, expect, it } from 'vitest'
import { buildCatalogue } from '../catalogue/build'
import { entryDetail } from '../catalogue/detail'
import { NIX } from '../turn/fixtures/nix'

/* ===========================================================================
   THE PIN — Combat Open Book slice 2.

   WRITTEN AND RUN BEFORE `canon/promote.ts` EXISTED, and that ordering is the
   entire value of this file. Slice 2 moves `heroCostFor`, `heroDiceFor` and the
   `consumed` list out of `catalogue/detail.ts` so the Combat page can ask the
   same question the Grimoire asks. A move is the most dangerous shape of change
   available: it produces no new behaviour to look at, so nothing on the screen
   tells you it went wrong — a spell quietly loses its hero die and it looks the
   same as a spell that never had one.

   So the answer is frozen first, for EVERY entry in the catalogue, and the move
   is required to reproduce it byte for byte. If this file goes red, the refactor
   is wrong; there is no reading of a red result here where the snapshot is the
   thing at fault.

   THE SNAPSHOT IS COMMITTED. Regenerating it to get to green would delete the
   only proof this slice has — see the standing rule in `04-slices.md`. If a
   LATER slice legitimately changes these numbers (slice 4 changes Damage; slice
   6 adds a reach fact), the diff is read line by line and the change is stated
   in the commit, never waved through with `-u`.
   ========================================================================= */

/** `buildCatalogue` returns the entry array itself (`build.ts:208`) — there is no
 *  wrapper object. Every entry, locked ones included: a spell that arrives at
 *  level 9 still has to survive the move. */
const entries = buildCatalogue(NIX)

/** Only the four promotions and the fall-through list. Deliberately NOT the
 *  whole `EntryDetail`: band 2's prose and band 3's advice are canon's, and
 *  pinning them here would make this file fail every time a spell's text is
 *  corrected — which would train exactly the habit of regenerating it. */
const promotionsOf = (name: string) => {
  const entry = entries.find(e => e.name === name)
  if (!entry) throw new Error(`catalogue has no entry named ${name}`)
  const d = entryDetail(entry, NIX)
  return { cost: d.cost, hero: d.hero, higherLevel: d.higherLevel, source: d.source, consumed: d.consumed }
}

describe('the promotions, frozen before they move', () => {
  it('every entry in the catalogue', () => {
    const all: Record<string, unknown> = {}
    for (const entry of entries) all[entry.name] = promotionsOf(entry.name)
    expect(all).toMatchSnapshot()
  })

  /* The four cases the move is most likely to break, named so a failure says
     WHICH kind of promotion broke rather than only that something did. */

  it('a spell whose cost comes from a Casting Time row consumes that row', () => {
    const p = promotionsOf('Cure Wounds')
    expect(p.cost).not.toBeNull()
    expect(p.consumed).toContain('Casting Time')
  })

  it('a feature whose cost comes from turnCost consumes NOTHING', () => {
    /* The case `detail.ts:329-332` calls out by name: a hero line built from
       `entry.turnCost` rather than from a fact must not claim a fact. Getting
       this wrong hides a Casting Time row that was really there. */
    const p = promotionsOf('Lay On Hands')
    expect(p.cost).not.toBeNull()
    expect(p.consumed).not.toContain('Casting Time')
  })

  it('the die is promoted, and consumes its row only when it carried the whole value', () => {
    /* ── CHANGED IN SLICE 4, AND THE OLD VALUE WAS THE COMPLAINT ──────────────
       This read `'2d8'` with a note of "+ spellcasting ability modifier" —
       canon's WORDS for a number, in the 34px numeral, which is precisely
       "the wording doesn't include my actual data". `statBlockFor` resolves the
       modifier, so the Healing row is now "2d8 + 4" and the whole of it parses
       as the die. He reads the number he actually heals for.

       The snapshot above moved with it, by hand — four lines across two
       entries, edited in the .snap file rather than regenerated with `-u`, so
       any OTHER entry that moved would still be red. Cure Wounds and Sacred
       Flame are the only two of 86 that changed. */
    const p = promotionsOf('Cure Wounds')
    expect(p.hero?.dice).toBe('2d8+4')
    expect(p.hero?.tone).toBe('healing')
  })

  it('an upcast line and a book line are both promoted out of the grid', () => {
    const p = promotionsOf('Cure Wounds')
    expect(p.higherLevel).not.toBeNull()
    expect(p.source).toBe('PHB 2024')
    expect(p.consumed).toContain('Higher Level')
    expect(p.consumed).toContain('Source')
  })
})
