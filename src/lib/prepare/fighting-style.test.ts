import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  fightingStyles,
  fightingStyleFeat,
  isFightingStyleFeat,
  currentFightingStyle,
  recordFightingStyle,
  clearFightingStyle,
  toggleFightingStyle,
  isFightingStyleCategory,
  shouldAskFightingStyle,
  FIGHTING_STYLE_FEATURE,
} from './fighting-style'
import { FEAT_LIST, CLASS_FEATURES } from '../../canon'
import { featByName, normalizeName } from '../canon/lookup'
import { composeTurn } from '../turn/compose'
import { buildCatalogue, catalogueSpells } from '../catalogue/build'
import type { CanonFeat } from '../canon/types'
import type { Character, CharacterFeat } from '../character'
import type { CombatState } from '../combat-state'

/* ===========================================================================
   THE APP LEARNS HE HAS INTERCEPTION — Open Book slice 6.

   Marcus, item 8: "in the combat tab, it doesnt seem to have all of my
   available reactions available. I should have the hearthfire manifest,
   sentinal, and interception." And: "Interception is indeed a fighting style.
   That should be placed somewhere in app so i can read details, and also in
   combat."

   ── THE TEST THAT MATTERS IS THE WIRE, NOT THE FUNCTION ────────────────────

   Finding BM, in this phase's own words: a test aimed at a FUNCTION is not
   aimed at the WIRE. `recordFightingStyle` returning a character with a feat on
   it proves that `recordFightingStyle` returns a character with a feat on it —
   which is what its body says, restated. What Marcus asked for is a row on the
   combat tab, and between the two sit `featReactionOptions`, `compose.ts`'s
   splice, the overlay and the ranking, any of which could drop it.

   So every claim below about "it reaches combat" is read out of `composeTurn`.
   The sheet is never read back to prove the sheet was written.

   ── THE FIXTURE IS HIS ACTUAL EXPORT ───────────────────────────────────────

   Same rule as `build.test.ts` and `toggle.test.ts`: the claim is about HIS
   sheet, so it is checked against his sheet, and skipped rather than silently
   passed when the file is absent.
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

const INTERCEPTION = fightingStyles().find(s => s.name === 'Interception')!
const DEFENSE = fightingStyles().find(s => s.name === 'Defense')!
const PROTECTION = fightingStyles().find(s => s.name === 'Protection')!

const fresh = (): CombatState => ({
  inCombat: true,
  round: 1,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
})

/** Every row the turn engine produces, wherever it filed it. Reading only
 *  `ranked` would let a passing test mean "it is on the shortlist" when the
 *  claim is "it exists at all". */
function everyOption(character: Character) {
  const turn = composeTurn({ character, combat: fresh() })
  return [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
}

function optionsNamed(character: Character, name: string) {
  return everyOption(character).filter(o => o.name === name)
}

describe('fightingStyles — canon\'s menu, by category', () => {
  it('there are eleven fighting styles, and every one says so on its own record', () => {
    // Eleven is canon's count today. The assertion that MATTERS is the second
    // one: the filter is on `category`, so a canon package that ships a twelfth
    // style gets it for free, and a package that renames the category makes
    // this go red rather than making the picker quietly empty.
    const styles = fightingStyles()
    expect(styles).toHaveLength(11)
    for (const s of styles) expect(isFightingStyleCategory(s.category), s.name).toBe(true)
  })

  it('Blessed Warrior is in the menu even though canon files it under its own heading', () => {
    // THE CASE AN `===` MATCH DROPPED. Canon's category for it is
    // "Fighting Style (Paladin-only alternative)" — it is the one style on the
    // list that is Paladin-EXCLUSIVE, so it is the one that must not be lost,
    // and an exact-equality filter lost exactly it.
    const blessed = fightingStyles().find(s => s.name === 'Blessed Warrior')
    expect(blessed).toBeDefined()
    expect(blessed!.category).not.toBe('Fighting Style')
    expect(isFightingStyleCategory(blessed!.category)).toBe(true)
  })

  it('and a category that is not a style heading is still rejected', () => {
    // The other side of the prefix match. Without this, "matched by shape"
    // could quietly mean "matched anything", and the picker would offer all 76.
    expect(isFightingStyleCategory('General')).toBe(false)
    expect(isFightingStyleCategory('Origin')).toBe(false)
    expect(isFightingStyleCategory('Epic Boon')).toBe(false)
    expect(isFightingStyleCategory('Feats that replace a Fighting Style')).toBe(false)
    expect(isFightingStyleCategory(undefined)).toBe(false)
    expect(isFightingStyleCategory(null)).toBe(false)
  })

  it('picks out exactly the styles and nothing else from all 76 feats', () => {
    const styleNames = new Set(fightingStyles().map(s => s.name))
    const missed = FEAT_LIST.filter(
      f => isFightingStyleCategory(f.category) && !styleNames.has(f.name),
    )
    expect(missed).toEqual([])
    expect(FEAT_LIST.length).toBeGreaterThan(styleNames.size)
  })

  it('Interception is one of them, and canon knows what it does', () => {
    expect(INTERCEPTION).toBeDefined()
    expect(INTERCEPTION.effects?.length).toBeGreaterThan(0)
  })

  it('the class feature the picker mounts on still exists in canon, by that name', () => {
    // THE GUARD ON THE ONE NAME MATCH IN THIS MODULE. `GrimoirePage` renders the
    // picker on the catalogue row whose key is `normalizeName('Fighting Style')`.
    // If canon ever renames that feature, the picker mounts on nothing and
    // disappears in silence — a control that is gone and a screen that looks
    // fine. This makes the rename go red instead.
    const named = CLASS_FEATURES.filter(
      f => normalizeName(f.name) === normalizeName(FIGHTING_STYLE_FEATURE),
    )
    expect(named).toHaveLength(1)
    expect(named[0].level).toBe(2)
  })

  it.skipIf(!nix)('…and it is a row in his catalogue, so there is somewhere to mount it', () => {
    // The other half. The name existing in canon is not the same claim as the
    // row existing in the list the page maps over.
    const row = buildCatalogue(nix!).find(
      e => e.key === normalizeName(FIGHTING_STYLE_FEATURE),
    )
    expect(row).toBeDefined()
    expect(row!.kind).toBe('feature')
    expect(row!.lockedUntil).toBeNull() // he is level 7; the picker is pressable
  })
})

describe('fightingStyleFeat — canon record to sheet record', () => {
  it('carries canon\'s effect sentences VERBATIM', () => {
    // The load-bearing line. `turn/feats.ts` reads `feat.effects` first and
    // finds a reaction by the shape of the sentence, so a converter that
    // paraphrases, truncates or joins is a converter that silently deletes a
    // reaction. Compared string for string.
    const feat = fightingStyleFeat(INTERCEPTION)
    expect(feat.effects).toEqual(INTERCEPTION.effects)
  })

  it('carries canon\'s Paladin advice as the tactical note', () => {
    expect(fightingStyleFeat(INTERCEPTION).tacticalNote).toBe(INTERCEPTION.paladinNote)
  })

  it('is not marked homebrew, and says what it required', () => {
    const feat = fightingStyleFeat(INTERCEPTION)
    expect(feat.isHomebrew).toBe(false)
    expect(feat.prerequisites).toBe(INTERCEPTION.prerequisite)
  })

  it('has a description even though canon gives fighting styles no description field', () => {
    // Canon files a style as `effects` only. The Grimoire renders `description`
    // where there is no effects list to render, and a style that shows up as a
    // name over a blank line is the "half-built feature" shape.
    const feat = fightingStyleFeat(INTERCEPTION)
    expect(feat.description.length).toBeGreaterThan(20)
    expect(feat.description).toContain('Reaction')
  })
})

describe('isFightingStyleFeat — which sheet records are styles', () => {
  it('says yes to a style canon knows', () => {
    expect(isFightingStyleFeat(fightingStyleFeat(INTERCEPTION))).toBe(true)
  })

  it('says NO to Sentinel, which canon files under general feats', () => {
    // This is the guard that makes "replacing a style keeps his feats" true
    // STRUCTURALLY rather than by observation. If this ever flips, replacing a
    // style deletes Sentinel, and the deletion is silent.
    expect(isFightingStyleCategory(featByName('Sentinel')?.category)).toBe(false)
    expect(isFightingStyleFeat({
      name: 'Sentinel', description: '', isHomebrew: false, effects: [],
    })).toBe(false)
  })

  it('says yes to a homebrew style canon has never heard of, on its prerequisite', () => {
    // The open-world rule. Marcus's DM invents "Hearthguard Stance" as a
    // Fighting Style; the app must still treat it as the one style he has,
    // or picking Interception leaves him holding two.
    const homebrew: CharacterFeat = {
      name: 'Hearthguard Stance',
      description: 'You may take a Reaction to step into a friend\'s place.',
      isHomebrew: true,
      effects: [],
      prerequisites: 'the Fighting Style feature',
    }
    expect(featByName(homebrew.name)).toBeUndefined()
    expect(isFightingStyleFeat(homebrew)).toBe(true)
  })

  it('says no to a homebrew feat that is not a style', () => {
    expect(isFightingStyleFeat({
      name: 'Kettle Mastery', description: 'You are good with kettles.',
      isHomebrew: true, effects: [],
    })).toBe(false)
  })
})

describe('THE WIRE — Interception reaches the combat tab', () => {
  it.skipIf(!nix)('he has no fighting style recorded today', () => {
    // The precondition, measured rather than assumed. If this ever fails the
    // test below stops meaning anything, because "the row appeared" would no
    // longer be caused by the pick.
    expect(currentFightingStyle(nix!)).toBeNull()
  })

  it.skipIf(!nix)('and the turn engine offers no Interception', () => {
    expect(optionsNamed(nix!, 'Interception')).toEqual([])
  })

  it.skipIf(!nix)('after he picks it, composeTurn produces an Interception row', () => {
    // THE CLAIM OF THIS SLICE. Read out of the engine — not off the sheet.
    const withStyle = recordFightingStyle(nix!, INTERCEPTION)
    const rows = optionsNamed(withStyle, 'Interception')
    expect(rows).toHaveLength(1)
  })

  it.skipIf(!nix)('…and it costs a Reaction', () => {
    const [row] = optionsNamed(recordFightingStyle(nix!, INTERCEPTION), 'Interception')
    expect(row.cost.slot).toBe('reaction')
  })

  it.skipIf(!nix)('…and it is available, not blocked, on a fresh turn', () => {
    // A reaction he is told he has and cannot press is item 8 again with extra
    // steps. Interception costs no resource, so nothing may block it.
    const [row] = optionsNamed(recordFightingStyle(nix!, INTERCEPTION), 'Interception')
    expect(row.available).toBe(true)
    expect(row.blockedReason).toBeUndefined()
  })

  it.skipIf(!nix)('…and it carries canon\'s dice and canon\'s trigger, not a paraphrase', () => {
    // What he needs at the table: WHEN it fires and WHAT it prevents. Both are
    // canon's own words travelling all the way from `feats.json`.
    const [row] = optionsNamed(recordFightingStyle(nix!, INTERCEPTION), 'Interception')
    const text = `${row.detail} ${row.name}`
    expect(text).toMatch(/1d10/)
    expect(text).toMatch(/hits another creature within 5 feet/i)
  })

  it.skipIf(!nix)('the composer did not invent it — no style, no row', () => {
    // The pair. Same function, two sheets, and the ONLY difference between them
    // is the pick. Without this, "the row is there" could be the composer
    // synthesising a reaction for everyone.
    expect(optionsNamed(nix!, 'Interception')).toHaveLength(0)
    expect(optionsNamed(recordFightingStyle(nix!, INTERCEPTION), 'Interception')).toHaveLength(1)
  })
})

describe('one style, replaced and never stacked', () => {
  it.skipIf(!nix)('picking a second style removes the first, in the engine', () => {
    // Asserted through composeTurn, because the failure this forbids is a row
    // on his combat tab for a reaction he does not have — and that is a claim
    // about the tab, not about the array.
    const defended = recordFightingStyle(nix!, PROTECTION)
    expect(optionsNamed(defended, 'Protection')).toHaveLength(1)

    const swapped = recordFightingStyle(defended, INTERCEPTION)
    expect(optionsNamed(swapped, 'Protection')).toHaveLength(0)
    expect(optionsNamed(swapped, 'Interception')).toHaveLength(1)
  })

  it.skipIf(!nix)('and the sheet holds exactly one style, not two', () => {
    const swapped = recordFightingStyle(recordFightingStyle(nix!, DEFENSE), INTERCEPTION)
    expect(swapped.feats.filter(isFightingStyleFeat)).toHaveLength(1)
    expect(currentFightingStyle(swapped)?.name).toBe('Interception')
  })

  it.skipIf(!nix)('his other feats survive every pick', () => {
    const before = nix!.feats.map(f => f.name).sort()
    const after = recordFightingStyle(recordFightingStyle(nix!, DEFENSE), INTERCEPTION)
    for (const name of before) {
      expect(after.feats.map(f => f.name)).toContain(name)
    }
  })

  it.skipIf(!nix)('a homebrew style is replaced too', () => {
    const homebrew: CharacterFeat = {
      name: 'Hearthguard Stance', description: 'Homebrew.',
      isHomebrew: true, effects: [], prerequisites: 'the Fighting Style feature',
    }
    const sheet: Character = { ...nix!, feats: [...nix!.feats, homebrew] }
    const after = recordFightingStyle(sheet, INTERCEPTION)
    expect(after.feats.map(f => f.name)).not.toContain('Hearthguard Stance')
    expect(after.feats.filter(isFightingStyleFeat)).toHaveLength(1)
  })

  it.skipIf(!nix)('recording does not mutate the character handed in', () => {
    const before = JSON.stringify(nix!.feats)
    recordFightingStyle(nix!, INTERCEPTION)
    expect(JSON.stringify(nix!.feats)).toBe(before)
  })
})

describe('un-picking', () => {
  it.skipIf(!nix)('pressing the chosen style again clears it, and the row leaves combat', () => {
    const picked = toggleFightingStyle(nix!, INTERCEPTION)
    expect(optionsNamed(picked, 'Interception')).toHaveLength(1)

    const unpicked = toggleFightingStyle(picked, INTERCEPTION)
    expect(currentFightingStyle(unpicked)).toBeNull()
    expect(optionsNamed(unpicked, 'Interception')).toHaveLength(0)
  })

  it.skipIf(!nix)('pressing a DIFFERENT style swaps rather than clearing', () => {
    const swapped = toggleFightingStyle(toggleFightingStyle(nix!, INTERCEPTION), DEFENSE)
    expect(currentFightingStyle(swapped)?.name).toBe('Defense')
  })

  it.skipIf(!nix)('clearing keeps every other feat', () => {
    const cleared = clearFightingStyle(recordFightingStyle(nix!, INTERCEPTION))
    expect(cleared.feats.map(f => f.name).sort()).toEqual(nix!.feats.map(f => f.name).sort())
  })
})

describe('what the pick does to the Grimoire itself', () => {
  it.skipIf(!nix)('the catalogue grows by exactly one row, and it is the style', () => {
    // 84 is Gate 1's success metric and is pinned in browser checks A, B and D.
    // It moves when he picks a style, and that is CORRECT — the style is a
    // thing he can do. Pinned here so the browser proof's 85 is a prediction
    // this suite already made rather than a surprise nobody understood.
    const before = buildCatalogue(nix!)
    const after = buildCatalogue(recordFightingStyle(nix!, INTERCEPTION))
    expect(after).toHaveLength(before.length + 1)

    const added = after.filter(e => !before.some(b => b.key === e.key))
    expect(added).toHaveLength(1)
    expect(added[0].name).toBe('Interception')
    expect(added[0].kind).toBe('feat')
    expect(added[0].turnCost).toBe('reaction')
  })

  it.skipIf(!nix)('picking Blessed Warrior brings its nine cantrips — through the picker\'s own record', () => {
    // `build.test.ts` already proves the builder reads the style, using a
    // CharacterFeat written by hand in the test. This proves the record THIS
    // MODULE writes is one the builder recognises — the wire, not a twin.
    // It also documents that one of the eleven choices moves the 84 by nine.
    const blessed = fightingStyles().find(s => s.name === 'Blessed Warrior')!
    expect(catalogueSpells(nix!)).toHaveLength(62)
    expect(catalogueSpells(recordFightingStyle(nix!, blessed))).toHaveLength(71)
  })
})

describe('the styles are worth showing — canon has words for all eleven', () => {
  it('every style converts to a sheet record with text on it', () => {
    // A picker with eleven blank rows is a menu of names. Checked across all
    // eleven rather than on Interception alone, because Interception is the one
    // this slice was built for and is therefore the one least likely to be the
    // broken case.
    for (const style of fightingStyles()) {
      const feat = fightingStyleFeat(style as CanonFeat)
      expect(feat.description.length, style.name).toBeGreaterThan(10)
      expect(feat.effects.length, style.name).toBeGreaterThan(0)
    }
  })

  it('canon\'s Paladin advice is a sentence or nothing — never the word "null"', () => {
    // MEASURED, NOT ASSUMED. This test first asserted all eleven carry advice
    // and went red on Archery: canon ships `null` for the five styles a Paladin
    // would not take. `CanonFeat.paladinNote` was typed `string | undefined`,
    // a type that could not describe its own data — so it now says
    // `string | null` and this pins the shape it really has.
    const withAdvice = fightingStyles().filter(s => typeof s.paladinNote === 'string')
    expect(withAdvice.length).toBeGreaterThan(0)
    expect(withAdvice.length).toBeLessThan(fightingStyles().length)
    for (const style of fightingStyles()) {
      expect(
        style.paladinNote === null || typeof style.paladinNote === 'string',
        style.name,
      ).toBe(true)
    }
  })

  it('a style with no advice gets NO tacticalNote, rather than a null one', () => {
    // The converter's guard, aimed at what the reader would actually see. A
    // `tacticalNote: null` reaching the Grimoire renders as an empty advice
    // block over a style canon simply had nothing to say about.
    const silent = fightingStyles().find(s => s.paladinNote === null)!
    expect(silent).toBeDefined()
    expect(fightingStyleFeat(silent as CanonFeat).tacticalNote).toBeUndefined()
    expect(fightingStyleFeat(INTERCEPTION).tacticalNote).toBe(INTERCEPTION.paladinNote)
  })
})

/* ===========================================================================
   WHETHER TO ASK — Your-Turn slice 6, item 8.

   The picker built above has existed since Open Book slice 6 and Marcus never
   found it, which is why his combat tab is still short a reaction. Your-Turn
   slice 6 puts the question where he noticed the gap, and this is the predicate
   that decides whether it is asked at all.

   EVERY GATE IS SHOWN ABLE TO CLOSE IT. A prompt that paints for everybody is
   not gated on anything, and the way that ships is a test that only ever checks
   the true case — so each `true` below is paired with the smallest change to
   his own sheet that must turn it false.
   ========================================================================= */
describe('shouldAskFightingStyle — three gates, each shown able to close', () => {
  it.skipIf(!nix)('HIS SHEET, AS HE EXPORTS IT: yes, ask him', () => {
    // The whole of item 8 in one line. He is a level 7 Paladin with no style
    // recorded, so there is a question outstanding and nothing has asked it.
    expect(currentFightingStyle(nix!)).toBeNull()
    expect(shouldAskFightingStyle(nix!)).toBe(true)
  })

  it.skipIf(!nix)('gate 3 — ANSWERED: picking Interception stops the asking', () => {
    expect(shouldAskFightingStyle(recordFightingStyle(nix!, INTERCEPTION))).toBe(false)
  })

  it.skipIf(!nix)('gate 3 holds for a style that is NOT a reaction, too', () => {
    // The prompt's copy talks about Interception, but the question it asks is
    // "which style", not "is it Interception". Answering "Defense" answers it.
    expect(shouldAskFightingStyle(recordFightingStyle(nix!, DEFENSE))).toBe(false)
  })

  it.skipIf(!nix)('and un-picking asks again', () => {
    // The picker toggles. A prompt that could not come back would leave him with
    // no style recorded and no way to say so.
    const on = recordFightingStyle(nix!, INTERCEPTION)
    expect(shouldAskFightingStyle(clearFightingStyle(on))).toBe(true)
  })

  it.skipIf(!nix)('gate 2 — REACHED: at level 1 the row is locked and nothing is asked', () => {
    // Read off `build.ts`'s own lock rather than a second copy of "level 2".
    const low = { ...nix!, level: 1 }
    const row = buildCatalogue(low).find(
      e => e.kind === 'feature' && normalizeName(e.name) === normalizeName(FIGHTING_STYLE_FEATURE),
    )
    expect(row?.lockedUntil).not.toBeNull()
    expect(shouldAskFightingStyle(low)).toBe(false)
  })

  it.skipIf(!nix)('gate 2 opens at exactly the level canon unlocks it', () => {
    // Not "level 2" written here: whatever the catalogue says the lock is, the
    // question opens there and not a level earlier.
    const row = buildCatalogue({ ...nix!, level: 1 }).find(
      e => e.kind === 'feature' && normalizeName(e.name) === normalizeName(FIGHTING_STYLE_FEATURE),
    )!
    const at = row.lockedUntil!
    expect(shouldAskFightingStyle({ ...nix!, level: at - 1 })).toBe(false)
    expect(shouldAskFightingStyle({ ...nix!, level: at })).toBe(true)
  })

  it.skipIf(!nix)('gate 1 — GRANTED: NOT COVERED, and here is why, measured', () => {
    // This test was written to close gate 1 by turning his sheet into a Wizard's
    // and expecting the Fighting Style row to disappear. It went red: the row is
    // still there, `origin: "Paladin"`, `lockedUntil: null`.
    //
    // The cause is not a bug. `build.ts:249` composes the catalogue from
    // `OATH.features` and `CLASS_FEATURES` unconditionally — this canon package
    // holds one class, so the `class` field on a sheet steers nothing. Gate 1 is
    // therefore a guard against a canon package that ships no such row, not
    // against a character, and NO CHARACTER THIS APP CAN HOLD CAN EXERCISE IT.
    //
    // Recorded rather than deleted, and recorded rather than dressed up as a
    // passing gate test: an uncoverable branch that looks covered is worse than
    // one that says so. If canon ever gains a second class, this becomes a real
    // test and this comment becomes the reason it was already wanted.
    const wizard = { ...nix!, class: 'Wizard' } as Character
    const row = buildCatalogue(wizard).find(
      e => e.kind === 'feature' && normalizeName(e.name) === normalizeName(FIGHTING_STYLE_FEATURE),
    )
    expect(row).toBeDefined()
    expect(row!.origin).toBe('Paladin')
  })

  it.skipIf(!nix)('the ask and the row it is about move together', () => {
    // THE WIRE, not the function. The prompt exists to put a reaction on his
    // combat tab; these two facts are the before and after of that sentence, and
    // a change that broke the link would leave one of them true alone.
    expect(shouldAskFightingStyle(nix!)).toBe(true)
    expect(optionsNamed(nix!, 'Interception')).toHaveLength(0)

    const picked = recordFightingStyle(nix!, INTERCEPTION)
    expect(shouldAskFightingStyle(picked)).toBe(false)
    expect(optionsNamed(picked, 'Interception')).toHaveLength(1)
  })
})
