import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  togglePrepared,
  preparedCount,
  countsAgainstCap,
  canonSpellToSheet,
  maxPrepared,
  LONG_REST_SWAP_RULE,
  type PrepareResult,
} from './toggle'
import { PREPARED_SPELL_RULES, SPELLS } from '../../canon'
import { spellByName } from '../canon/lookup'
import { composeTurn } from '../turn/compose'
import type { Character, Spell } from '../character'

/* ===========================================================================
   PREPARING, THE WAY THE RULE WORKS — Open Book slice 5.

   Marcus: "I now understand that i can only prepare a certain number of spells,
   and thats accurate. The app should teach me on preparing spells and when i
   can (i think on long rests i can swap out a spell or something. The documents
   should have information on this.)"

   They do — five sentences of it, in `paladin-progression.json`, which nothing
   had ever read. These tests hold the app to all five, and to the two things
   Gate 3 did not anticipate: that a tap on an Oath grant would have UNPREPARED
   it, and that a wrong name would have returned ok having changed nothing.

   THE FIXTURE PROBLEM, MET FOR THE THIRD TIME THIS PHASE. Slices 3 and 4 both
   found that his real sheet cannot falsify an open-world claim — canon's own
   strings are all recognised, so nothing real is ever unrecognised. Same here,
   in a new shape: the `'no-slots'` refusal is STRUCTURALLY UNREACHABLE for Nix,
   because canon's `unlocksAtPaladinLevel` tracks slot availability, so `locked`
   always fires first. Only a hand-built sheet can reach it, and one is built
   below rather than the branch being left unproved.
   ========================================================================= */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

function nixOrNull(): Character | null {
  try {
    return JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    return null
  }
}

const nix = nixOrNull()

/** The naive count — the one six call sites in this app compute today. Kept
 *  here so the difference between it and `preparedCount` is a number in a test
 *  rather than a claim in a comment. */
const naiveCount = (c: Character) => c.spells.filter(s => s.prepared && s.level > 0).length

/** Canon spells he could legally prepare right now: on the Paladin list,
 *  unlocked at 7, counting against the cap, not already ticked. Chosen by RULE
 *  rather than by name so the test does not go stale the day canon renames one. */
function preparableNow(character: Character): string[] {
  const ticked = new Set(character.spells.filter(s => s.prepared).map(s => s.name))
  return SPELLS.filter(
    s =>
      s.onPaladinList &&
      s.countsAgainstPreparedLimit &&
      s.unlocksAtPaladinLevel <= character.level &&
      character.spellSlots?.[s.level]?.max > 0 &&
      !ticked.has(s.name),
  ).map(s => s.name)
}

function expectOk(result: PrepareResult): Character {
  if (!result.ok) throw new Error(`expected ok, got refusal '${result.refusal.code}'`)
  return result.next
}

/* ── Canon's five sentences ────────────────────────────────────────────────── */

describe('canon supplies the rules — this module only quotes them', () => {
  it('the five rules are canon\'s five rules, and none of them is empty', () => {
    /* THE GUARD ON EVERY OTHER TEST IN THIS FILE. A refusal quotes by index. If
     * canon dropped or reordered these, every `rule` assertion below would
     * compare '' to '' and pass. This is the line that stops that. */
    expect(PREPARED_SPELL_RULES.length).toBe(5)
    for (const [i, rule] of PREPARED_SPELL_RULES.entries()) {
      expect(rule.length, `rule ${i + 1} is empty`).toBeGreaterThan(20)
    }
  })

  it('rule 3 is the sentence Marcus was reaching for — the Long Rest swap', () => {
    expect(LONG_REST_SWAP_RULE).toBe(PREPARED_SPELL_RULES[2])
    expect(LONG_REST_SWAP_RULE).toMatch(/Long Rest/i)
  })

  it('canon\'s countsAgainstPreparedLimit says exactly what rules 4 and 5 say', () => {
    /* This module reads canon's FIELD rather than re-deriving the rule. That is
     * only safe while the field and the rule agree, so the agreement is checked
     * across all 71 records instead of assumed across the handful sampled. A
     * canon package that disagrees goes red here, which is where someone can
     * still do something about it. */
    for (const spell of SPELLS) {
      const shape = !(spell.alwaysPrepared || spell.level === 0)
      expect(
        spell.countsAgainstPreparedLimit,
        `${spell.name}: canon says counts=${spell.countsAgainstPreparedLimit}, shape says ${shape}`,
      ).toBe(shape)
    }
    // And the field is not uniformly true or uniformly false, which would make
    // the loop above pass while proving nothing.
    const yes = SPELLS.filter(s => s.countsAgainstPreparedLimit).length
    expect(yes).toBeGreaterThan(0)
    expect(yes).toBeLessThan(SPELLS.length)
  })
})

/* ── The number the app has been getting wrong ─────────────────────────────── */

describe.skipIf(!nix)('the count the cap enforces', () => {
  const c = nix!

  it('is 2 of 7 for Nix, where the app has been showing 6', () => {
    /* THE FINDING THIS SLICE EXISTS FOR. Four of his six ticked spells are Oath
     * grants; canon rule 4 excludes them. The app told him he had one prepared
     * spell left. He has five. */
    expect(naiveCount(c), 'what six call sites in this app compute today').toBe(6)
    expect(preparedCount(c), 'what canon rule 4 actually counts').toBe(2)
    expect(maxPrepared(c), 'canon levels table, level 7').toBe(7)
  })

  it('and names which four it excludes, so the number is auditable', () => {
    const excluded = c.spells.filter(s => s.prepared && s.level > 0 && !countsAgainstCap(s))
    expect(excluded.map(s => s.name).sort()).toEqual([
      'Burning Hands',
      'Faerie Fire',
      'Scorching Ray',
      'Warding Bond',
    ])
    for (const spell of excluded) {
      expect(spellByName(spell.name)?.alwaysPrepared, `${spell.name} is an Oath grant`).toBe(true)
    }
  })

  it('cantrips never count, whether canon knows them or not', () => {
    const homebrewCantrip: Spell = { ...c.spells[0], name: 'Ember Flick', level: 0, prepared: true }
    expect(countsAgainstCap(homebrewCantrip)).toBe(false)
  })

  it('but a prepared spell canon has never heard of DOES count', () => {
    // The open-world rule cuts both ways: canon widens what he can prepare, and
    // a homebrew level-1 spell he has ticked is occupying a place regardless.
    const homebrew: Spell = { ...c.spells[0], name: 'Hearthbrand', level: 1, prepared: true }
    expect(countsAgainstCap(homebrew)).toBe(true)
  })
})

/* ── The cap ───────────────────────────────────────────────────────────────── */

describe.skipIf(!nix)('rule 1 — the cap', () => {
  it('an eighth prepared spell is refused, and the seventh is not', () => {
    let c = nix!
    const queue = preparableNow(c)
    expect(queue.length, 'canon offers him more than the five places he has free')
      .toBeGreaterThan(5)

    // Fill from 2 to 7 by the rule, not by a hand-picked list of five names.
    for (let i = 0; preparedCount(c) < maxPrepared(c); i++) {
      const result = togglePrepared(c, queue[i])
      c = expectOk(result)
    }
    expect(preparedCount(c)).toBe(7)

    const eighth = togglePrepared(c, queue[queue.length - 1])
    expect(eighth.ok).toBe(false)
    if (eighth.ok) return
    expect(eighth.refusal.code).toBe('cap')
    if (eighth.refusal.code !== 'cap') return
    expect(eighth.refusal.max).toBe(7)
  })

  it('the refusal carries canon\'s sentence verbatim, and the way out', () => {
    let c = nix!
    const queue = preparableNow(c)
    for (let i = 0; preparedCount(c) < maxPrepared(c); i++) c = expectOk(togglePrepared(c, queue[i]))

    const refused = togglePrepared(c, queue[queue.length - 1])
    expect(refused.ok).toBe(false)
    if (refused.ok || refused.refusal.code !== 'cap') throw new Error('expected a cap refusal')
    // Verbatim — not "contains", not paraphrased. The app quotes canon or says
    // nothing; wording its own version of a rule is how it starts being wrong.
    expect(refused.refusal.rule).toBe(PREPARED_SPELL_RULES[0])
    expect(refused.refusal.swapRule).toBe(PREPARED_SPELL_RULES[2])
  })

  it('unpreparing is never refused, even standing at the cap', () => {
    let c = nix!
    const queue = preparableNow(c)
    for (let i = 0; preparedCount(c) < maxPrepared(c); i++) c = expectOk(togglePrepared(c, queue[i]))
    expect(preparedCount(c)).toBe(7)

    const next = expectOk(togglePrepared(c, 'Bless'))
    expect(preparedCount(next)).toBe(6)
    // Gate 3 decision 5: unpreparing forgets the tick, never the record.
    expect(next.spells.some(s => s.name === 'Bless')).toBe(true)
    expect(next.spells.find(s => s.name === 'Bless')!.prepared).toBe(false)
  })

  it('always-prepared spells do not eat into the cap he can spend', () => {
    // Restated as a consequence rather than as a property: with rule 4 applied
    // he can add five; under the naive count he could add one.
    let c = nix!
    let added = 0
    const queue = preparableNow(c)
    for (const name of queue) {
      const result = togglePrepared(c, name)
      if (!result.ok) break
      c = result.next
      added++
    }
    expect(added).toBe(5)
  })
})

/* ── The other four refusals ───────────────────────────────────────────────── */

describe.skipIf(!nix)('rule 2 — a prepared spell must be of a level he has slots for', () => {
  it('is refused for a tier his sheet does not have', () => {
    /* HAND-BUILT, and it has to be. For Nix this branch is unreachable: canon's
     * `unlocksAtPaladinLevel` tracks slot availability, so a spell he has no
     * slot tier for is a spell that is also locked, and `locked` fires first.
     * The branch is only reachable when the SHEET has fewer tiers than canon
     * grants — which is a real state (a mis-imported sheet) and exactly the one
     * worth refusing clearly. Real data cannot catch this; a fixture can. */
    const noSecondTier: Character = {
      ...nix!,
      spellSlots: { 1: { max: 4, current: 4 } },
    }
    const secondLevel = SPELLS.find(
      s => s.level === 2 && s.onPaladinList && s.unlocksAtPaladinLevel <= 7,
    )!
    const result = togglePrepared(noSecondTier, secondLevel.name)
    expect(result.ok).toBe(false)
    if (result.ok || result.refusal.code !== 'no-slots') {
      throw new Error(`expected no-slots, got ${result.ok ? 'ok' : result.refusal.code}`)
    }
    expect(result.refusal.spellLevel).toBe(2)
    expect(result.refusal.rule).toBe(PREPARED_SPELL_RULES[1])
  })
})

describe.skipIf(!nix)('a spell he does not have yet', () => {
  it('is refused as locked, and says the level it arrives at', () => {
    const locked = SPELLS.find(s => s.onPaladinList && s.unlocksAtPaladinLevel > 7)!
    const result = togglePrepared(nix!, locked.name)
    expect(result.ok).toBe(false)
    if (result.ok || result.refusal.code !== 'locked') throw new Error('expected locked')
    expect(result.refusal.unlocksAt).toBe(locked.unlocksAtPaladinLevel)
    expect(result.refusal.unlocksAt).toBeGreaterThan(7)
  })
})

describe.skipIf(!nix)('the two refusals Gate 3 did not anticipate', () => {
  it('an Oath grant is refused rather than silently UNPREPARED', () => {
    /* THE BUG GATE 3'S CALL STACK WOULD HAVE SHIPPED. Warding Bond sits on his
     * sheet with prepared true because the Oath grants it permanently. Gate 3
     * put "already prepared? → unprepare, always ok" at the top of the stack,
     * so one tap would have taken it away — and the count would not even have
     * moved, because rule 4 already excludes it. Silent, and wrong. */
    const before = nix!.spells.find(s => s.name === 'Warding Bond')!
    expect(before.prepared, 'the fixture only proves this while it is ticked').toBe(true)

    const result = togglePrepared(nix!, 'Warding Bond')
    expect(result.ok).toBe(false)
    if (result.ok || result.refusal.code !== 'granted') throw new Error('expected granted')
    expect(result.refusal.why).toBe('always-prepared')
    expect(result.refusal.rule).toBe(PREPARED_SPELL_RULES[3])
  })

  it('a cantrip is refused, quoting rule 5', () => {
    const cantrip = SPELLS.find(s => s.level === 0)!
    const result = togglePrepared(nix!, cantrip.name)
    expect(result.ok).toBe(false)
    if (result.ok || result.refusal.code !== 'granted') throw new Error('expected granted')
    expect(result.refusal.why).toBe('cantrip')
    expect(result.refusal.rule).toBe(PREPARED_SPELL_RULES[4])
  })

  it('a feature name is refused, not accepted with nothing changed', () => {
    // `togglePrepared` is keyed by name, so this is one typo away at every call
    // site. Returning ok on an unchanged character is the silent no-op this
    // phase keeps finding; refusing is the whole difference.
    const result = togglePrepared(nix!, 'Aura of Protection')
    expect(result.ok).toBe(false)
    if (result.ok || result.refusal.code !== 'not-a-spell') throw new Error('expected not-a-spell')
    expect(result.refusal.name).toBe('Aura of Protection')
  })
})

/* ── Canon → sheet, and the wire ───────────────────────────────────────────── */

describe.skipIf(!nix)('preparing a canon spell it has never seen', () => {
  const unseen = () => {
    const c = nix!
    const onSheet = new Set(c.spells.map(s => s.name))
    return SPELLS.find(
      s =>
        s.onPaladinList &&
        s.countsAgainstPreparedLimit &&
        s.unlocksAtPaladinLevel <= 7 &&
        s.castingTimeType === 'action' &&
        s.level === 1 &&
        !onSheet.has(s.name),
    )!
  }

  it('puts a real Spell on the sheet, not a stub', () => {
    const spell = unseen()
    const next = expectOk(togglePrepared(nix!, spell.name))
    expect(next.spells.length).toBe(nix!.spells.length + 1)

    const added = next.spells.find(s => s.name === spell.name)!
    expect(added.prepared).toBe(true)
    expect(added.level).toBe(spell.level)
    expect(added.school).toBe(spell.school)
    expect(added.castingTime).toBe(spell.castingTime)
    expect(added.range).toBe(spell.range)
    expect(added.duration).toBe(spell.duration)
    expect(added.description).toBe(spell.summary)
    expect(added.components, 'components is a rendered line, not an object').toMatch(/^[VSM,\s]/)
  })

  it('and drops canon\'s tactics paragraph on purpose', () => {
    const spell = unseen()
    expect(spell.tactics.length, 'canon has tactics for it — so the drop is a choice')
      .toBeGreaterThan(100)
    expect(canonSpellToSheet(spell).tacticalNote).toBeUndefined()
  })

  it('…AND THE TURN ENGINE CAN THEN SEE IT', () => {
    /* THE WIRE (finding BM). Every assertion above is aimed at the reducer: it
     * proves the sheet changed. None of them proves the change reaches the
     * screen he plays from. `turn/options.ts:240` reads `character.spells` and
     * filters on `prepared` — so this asserts through `composeTurn`, the same
     * function the combat tab calls, and would go red if the converter produced
     * a shape the engine skips. A test aimed at a function is not aimed at the
     * wire. */
    const spell = unseen()
    const rowNames = (c: Character) => {
      const turn = composeTurn({ character: c, combat: null })
      return [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)].map(o => o.name)
    }

    expect(rowNames(nix!), 'it must be absent BEFORE, or the after proves nothing')
      .not.toContain(spell.name)

    const next = expectOk(togglePrepared(nix!, spell.name))
    expect(rowNames(next)).toContain(spell.name)
  })
})

/* ── Purity ────────────────────────────────────────────────────────────────── */

describe.skipIf(!nix)('the character handed in is never the character handed back', () => {
  it('does not mutate the input, on any path', () => {
    const frozen: Character = Object.freeze({
      ...nix!,
      spells: Object.freeze(nix!.spells.map(s => Object.freeze({ ...s }))) as Spell[],
    })
    const before = JSON.stringify(frozen.spells)

    // One of each outcome: a push, a flip, an untick, and a refusal.
    expectOk(togglePrepared(frozen, preparableNow(frozen)[0]))
    expectOk(togglePrepared(frozen, 'Cure Wounds'))
    expectOk(togglePrepared(frozen, 'Bless'))
    togglePrepared(frozen, 'Warding Bond')

    expect(JSON.stringify(frozen.spells)).toBe(before)
  })

  it('returns a new object every time, so React sees the change', () => {
    const next = expectOk(togglePrepared(nix!, 'Cure Wounds'))
    expect(next).not.toBe(nix!)
    expect(next.spells).not.toBe(nix!.spells)
    expect(next.spells.find(s => s.name === 'Cure Wounds')!.prepared).toBe(true)
  })
})
