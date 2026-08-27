// ---------------------------------------------------------------------------
// VAL-01..VAL-15 — canon's own validation rules, run against the real app
// ---------------------------------------------------------------------------
//
// Table Truth slice 10a. Canon ships fifteen rules that say what a correct
// Nix-shaped app must never let happen. This file is those fifteen rules
// pointed back at the code, and it is the first suite in the repo whose
// assertions were written by someone other than us.
//
// ── THE THREE STATES, AND WHY NONE OF THEM IS A WEAKENED TEST ──────────────
//
//   it(…)        The app obeys. The assertion IS canon's rule. Green.
//
//   it.fails(…)  The app VIOLATES. The body asserts canon's rule written
//                straight — no softening, no "for now", no inverted
//                expectation. `it.fails` records that the rule does not hold
//                TODAY, and the suite goes RED the day someone fixes the app,
//                at which point the fixer flips `it.fails` to `it` and the
//                bug can never come back. This is the opposite of weakening:
//                a `describe.skip` around a known violation is silence, and
//                this is a pin that shouts the moment the bug dies.
//
//   it.skip(…)   The app CANNOT EXPRESS the rule — a required field does not
//                exist anywhere in the model. The id and the reason live in
//                the TEST NAME, so `npm test` prints the gap on every run
//                rather than leaving a hole nobody can see. Every skip is
//                paired with a live GAP PIN asserting the absence itself, so
//                the day the app grows the missing shape the pin goes red and
//                somebody has to come back here. A gap with no pin is a gap
//                that stays.
//
// ── EVERY NUMBER HERE WAS MEASURED FIRST ───────────────────────────────────
//
// `docs/plans/table-truth/_probe-val.mjs` graded all fifteen against the real
// exported functions before a line of this file existed. That probe is part of
// the evidence and is kept in the repo (the slice-7 precedent). It also earned
// its own finding: reading `ComposedTurn.ranked` alone MISSES every option
// filed into a mutex group, and Nix's bonus actions are all in one. The first
// run reported 4 options where the engine builds 14, which turned VAL-13 from
// violated into obeyed. Hence `allOptions()` below, and hence the rule that
// nothing in this file may read `.ranked` directly.
//
// ── IDS ARE READ FROM CANON, NEVER TYPED HERE ──────────────────────────────
//
// The `OATH_ERRATA_IDS` lesson from 8b: a hand-typed ledger covers what the
// author remembered. The coverage meta-tests at the bottom read
// `VALIDATION_RULES` and assert this file accounts for every id canon ships
// and agrees with canon's severity for each — so a VAL-16, or a rule canon
// promotes from `info` to `error`, turns this suite red the same day.

import { describe, it, expect } from 'vitest'
import { VALIDATION_RULES, SPELLS } from '../../canon'
import { NIX } from '../turn/fixtures/nix'
import { composeTurn } from '../turn/compose'
import { reduce, type SessionState } from '../turn/reduce'
import { createCombatState } from '../combat-state'
import { critNotation } from '../turn/rolls'
import { toggleSpellPrepared, setTempHP } from '../character'
import { demandOfSpell } from '../rules-2024/economy'
import { effectOf, blockedSlots } from '../rules-2024/conditions'
import type { ComposedTurn, TurnOption } from '../turn/types'
import type { LogEntry, TakenOption } from '../turn/events'
import type { Spell } from '../character'

/** EVERY option the engine produced — `ranked` + `rest` + every mutex FACE.
 *
 *  `ranked` deliberately excludes anything filed into a mutex group. Reading it
 *  alone is the single most dangerous mistake available in this file, because
 *  it fails in the direction that looks like success: an option the engine
 *  offers goes unseen, and a rule saying "never offer X" passes. Mirrors
 *  `turn/reactions.ts:75`, which solved this first. */
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

/** A fresh turn: Nix, no combat state. What the Play tab shows on open. */
const freshTurn = () => composeTurn({ character: NIX, combat: null })

const byName = (turn: ComposedTurn, re: RegExp) =>
  allOptions(turn).find(o => re.test(o.name))

/** Which ids this file accounts for, and how. Read by the coverage meta-test.
 *  Adding a case here is not optional — an id absent from this map fails the
 *  meta-test, which is what stops a new canon rule from being ignored. */
const ACCOUNTED: Record<string, 'enforced' | 'violated' | 'partial' | 'not-mechanisable'> = {
  'VAL-01': 'violated',
  'VAL-02': 'enforced',
  'VAL-03': 'not-mechanisable',
  'VAL-04': 'partial',
  'VAL-05': 'enforced',
  'VAL-06': 'violated',
  'VAL-07': 'not-mechanisable',
  'VAL-08': 'not-mechanisable',
  'VAL-09': 'not-mechanisable',
  'VAL-10': 'not-mechanisable',
  'VAL-11': 'enforced',
  'VAL-12': 'partial',
  'VAL-13': 'violated',
  'VAL-14': 'enforced',
  'VAL-15': 'violated',
}

// ---------------------------------------------------------------------------
describe('VAL-01 — Warding Bond is granted by the oath and is never a prepared choice', () => {
  it('canon marks it always-prepared and free of the limit', () => {
    const wb = SPELLS.find(s => s.name === 'Warding Bond')
    expect(wb?.alwaysPrepared).toBe(true)
    expect(wb?.countsAgainstPreparedLimit).toBe(false)
  })

  it.fails('VIOLATED: toggling Warding Bond must not be able to unprepare it', () => {
    // Canon's rule written straight. `toggleSpellPrepared` guards cantrips and
    // nothing else, so an oath-granted spell flips like any other — Marcus can
    // tap away a spell the oath gives him and the app will believe him.
    const after = toggleSpellPrepared(NIX, 'Warding Bond')
    const wb = after.spells.find(s => s.name === 'Warding Bond')
    expect(wb?.prepared).toBe(true)
  })

  it.fails('VIOLATED: always-prepared spells must not consume the prepared limit', () => {
    // Measured: the app charges 6 of 8, and three of the six — Divine Smite,
    // Warding Bond, Fireball — are `alwaysPrepared` in canon. Nix is paying
    // for three spells he is given. This is finding AZ, and it is why the
    // erratum HEARTH-08 understates the problem: canon's erratum names one
    // spell, the app's bug covers every free spell on the sheet.
    const free = new Set(SPELLS.filter(s => s.alwaysPrepared).map(s => s.name))
    const charged = NIX.spells.filter(s => s.prepared && s.level > 0)
    expect(charged.filter(s => free.has(s.name))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('VAL-02 — only one spell slot may be expended per turn', () => {
  /** Take a real option through the real reducer, then try to take another. */
  const takeSlotted = (state: SessionState, option: TakenOption, log: LogEntry[] = []) =>
    reduce(state, { type: 'takeOption', option }, log)

  const slotted = (name: string): TakenOption => {
    const o = byName(freshTurn(), new RegExp(name, 'i'))
    if (!o) throw new Error(`fixture drift: no option named ${name}`)
    return {
      id: o.id,
      name: o.name,
      slot: o.cost.slot,
      ...(o.cost.spellSlotLevel ? { spellSlotLevel: o.cost.spellSlotLevel } : {}),
    }
  }

  it('a second slotted cast in the same turn is refused, in words', () => {
    const state: SessionState = { character: NIX, combat: createCombatState(NIX) }
    const first = takeSlotted(state, slotted('Divine Smite'))
    expect(first.refused).toBeUndefined()
    expect(first.entry).not.toBeNull()

    const log = [first.entry!]
    const second = takeSlotted(first.state, slotted('Cure Wounds'), log)
    expect(second.refused).toMatch(/already expended a spell slot/i)
    // Refused means NOTHING moved — the sheet is the thing being protected.
    expect(second.state.character.spellSlots).toEqual(first.state.character.spellSlots)
    expect(second.entry).toBeNull()
  })

  it('a cantrip leaves no slot record, so it never trips the rule', () => {
    // Sacred Flame is level 0. If this ever starts carrying a spellSlotLevel,
    // the one-slot rule would fire on a cantrip and Marcus would lose his turn.
    const cantrip = byName(freshTurn(), /sacred flame/i)
    expect(cantrip?.cost.spellSlotLevel).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
describe('VAL-03 — free castings expend no slot and do not count toward VAL-02', () => {
  it.skip('VAL-03 — NOT MECHANISABLE: nothing in the app or canon marks a casting as free', () => {})

  it('GAP PIN: no option carries a free-cast marker, and canon offers only `grantedBy`', () => {
    // The pin, not the rule. Canon names "Paladin's Smite" and "Faithful
    // Steed" as free castings but ships no field saying so — `grantedBy` says
    // where a spell CAME from, which is a different question, and answering
    // VAL-03 from it would mean guessing that granted implies free. It does
    // not: Warding Bond is granted and still costs a 2nd-level slot.
    const marked = allOptions(freshTurn()).filter(o => /free/i.test(JSON.stringify(o)))
    expect(marked).toEqual([])
    const fields = new Set(SPELLS.flatMap(s => Object.keys(s)))
    expect(fields.has('freeCasting')).toBe(false)
    expect(fields.has('grantedBy')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('VAL-04 — only one Bonus Action per turn', () => {
  it('every competing bonus action is filed into ONE mutex group', () => {
    // Canon names eight competitors. Nix carries five of them, and the engine
    // puts all five in a single group — which is the structural form of the
    // rule: they are not five independent rows that happen to be blocked, they
    // are five faces of one choice.
    const turn = freshTurn()
    const group = turn.mutex.find(g => /bonus action/i.test(g.label))
    expect(group).toBeDefined()
    const faces = group!.faces.map(f => f.name).sort()
    expect(faces).toEqual([
      'Channel Divinity: Sacred Weapon',
      'Divine Smite',
      'Lay on Hands',
      'Misty Step',
      'Shield of Faith',
    ])
  })

  it('the reducer refuses a second bonus action, in words', () => {
    const state: SessionState = { character: NIX, combat: createCombatState(NIX) }
    const lay = byName(freshTurn(), /lay on hands/i)!
    const taken: TakenOption = { id: lay.id, name: lay.name, slot: 'bonusAction' }
    const first = reduce(state, { type: 'takeOption', option: taken }, [])
    expect(first.refused).toBeUndefined()
    const second = reduce(first.state, { type: 'takeOption', option: taken }, [])
    expect(second.refused).toMatch(/bonus action is already spent/i)
  })

  it.skip('VAL-04 — PARTIAL, NOT MECHANISABLE: three named competitors are not on the sheet', () => {})

  it('GAP PIN: Compelled Duel, Lesser Restoration and Magic Weapon are absent from the sheet', () => {
    // Canon's list is eight long. The suite can only prove the rule over what
    // Nix actually carries, and this pin says so out loud — so if any of the
    // three is added later, this goes red and the group assertion above must
    // grow to match rather than silently under-covering the rule.
    const names = new Set(NIX.spells.map(s => s.name))
    for (const missing of ['Compelled Duel', 'Lesser Restoration', 'Magic Weapon']) {
      expect(names.has(missing)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
describe('VAL-05 — one Concentration spell; warn before the cast and NAME what drops', () => {
  it('a row that would break concentration says so, and says on what', () => {
    const turn = composeTurn({
      character: NIX,
      combat: { ...createCombatState(NIX), concentrating: 'Shield of Faith' },
    })
    const clash = allOptions(turn).filter(o => /would drop/i.test(o.why ?? ''))
    expect(clash.length).toBeGreaterThan(0)
    // "and name what is being dropped" is half the rule, so it gets its own
    // assertion: a warning reading "this would break your concentration" would
    // pass a laxer test and be useless at a table.
    for (const o of clash) expect(o.why).toContain('Shield of Faith')
  })

  it('the warning arrives BEFORE the tap — it is on the option, not the outcome', () => {
    // The whole point of "warn before a cast". If this ever moves to the
    // reducer's `refused`, Marcus finds out by having already lost the spell.
    const turn = composeTurn({
      character: NIX,
      combat: { ...createCombatState(NIX), concentrating: 'Shield of Faith' },
    })
    const sof = byName(turn, /shield of faith/i)
    expect(sof?.why).toMatch(/would drop/i)
  })

  it('with nothing held, no row cries wolf', () => {
    const clash = allOptions(freshTurn()).filter(o => /would drop/i.test(o.why ?? ''))
    expect(clash).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('VAL-06 — temp HP from another source replaces the cloak pool; prompt first', () => {
  it.fails('VIOLATED: a smaller temp HP pool must not silently replace a larger one', () => {
    // Canon's rule written straight. 2024 temp HP does not stack, and canon
    // agrees — the rule is not "add them", it is "PROMPT before accepting".
    // `setTempHP` is a blind assignment: 11 from the cloak becomes 5, the
    // cloak ends, and nothing anywhere said a word.
    const cloaked = { ...NIX, tempHP: 11 }
    const after = setTempHP(cloaked, 5)
    expect(after.tempHP).toBe(11)
  })

  it('GAP PIN: nothing in the model records that the cloak is the source', () => {
    // Even a correct prompt needs to know WHICH pool is being replaced. There
    // is no field, so the prompt cannot name the cloak — which is exactly what
    // VAL-06 asks for. Recorded here so the fix is scoped honestly: this is a
    // model change, not a one-line guard in `setTempHP`.
    expect(Object.keys(NIX).filter(k => /cloak|hearthfire|tempHPSource/i.test(k))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('VAL-07 — skill proficiency overlap must be prevented', () => {
  it.skip('VAL-07 — NOT MECHANISABLE: proficiencies are a flat string list with no source', () => {})

  it('GAP PIN: skillProficiencies records WHAT, never WHERE FROM', () => {
    // Canon's rule needs three sources compared (Wayfarer, the Paladin list,
    // Changeling Instincts). The app stores `['Persuasion', 'Insight']` — the
    // overlap is invisible because the origins were never kept. Detecting it
    // would mean inventing provenance the sheet does not have, and inventing
    // it is how an app tells a player their character is wrong when it is not.
    expect(NIX.skillProficiencies.every(s => typeof s === 'string')).toBe(true)
    expect(Object.keys(NIX)).not.toContain('skillSources')
  })
})

// ---------------------------------------------------------------------------
describe('VAL-08 — costed and consumed components block casting', () => {
  it.skip('VAL-08 — NOT MECHANISABLE: app components are a display string; inventory has no GP', () => {})

  it('GAP PIN: canon models components structurally and the app models them as prose', () => {
    // Canon knows Revivify needs 300 GP of diamond and that a focus will not
    // substitute. The app's `Spell.components` is the string "V, S" — the
    // material clause is not merely unpriced, it is frequently not written
    // down at all. Two shapes apart, not one guard apart.
    const revivify = SPELLS.find(s => s.name === 'Revivify')
    expect(revivify?.components.materialCostGp).toBe(300)
    expect(revivify?.components.focusAllowed).toBe(false)
    expect(typeof NIX.spells[0].components).toBe('string')
    // And the other half: inventory is a list of names, so "is it in
    // inventory" has no answer to give even if the demand were known.
    expect(NIX.equipment.every(e => typeof e === 'string')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('VAL-09 — Warding Bond rings must be owned AND worn', () => {
  it.skip('VAL-09 — NOT MECHANISABLE: no field distinguishes carried from worn', () => {})

  it('GAP PIN: canon states the worn requirement; the app has no worn state', () => {
    const wb = SPELLS.find(s => s.name === 'Warding Bond')
    expect(wb?.components.materialText).toMatch(/must wear/i)
    expect(Object.keys(NIX).filter(k => /worn|equipped|attun/i.test(k))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('VAL-10 — Smoldering Smite needs a DM ruling before it is enabled', () => {
  it.skip('VAL-10 — NOT MECHANISABLE: passive features compose no turn option to gate', () => {})

  it('GAP PIN: at level 15 Smoldering Smite still composes no option — and neither does any passive', () => {
    // This pin exists because the naive reading is dangerously reassuring.
    // "Smoldering Smite is not offered" LOOKS like VAL-10 being obeyed. It is
    // not: it is never offered at ANY level, because it is `actionType:
    // 'passive'` and passives reach no row at all (finding AT). The level gate
    // is not what is stopping it, so there is nothing here for a DM ruling to
    // gate. Raising Nix to 15 adds no options whatsoever — that equality is
    // the evidence, and the day passives start composing it goes red and
    // somebody must come back and build the ruling gate for real.
    const at15 = composeTurn({ character: { ...NIX, level: 15 }, combat: null })
    expect(byName(at15, /smoldering/i)).toBeUndefined()
    expect(allOptions(at15).length).toBe(allOptions(freshTurn()).length)
    const passives = NIX.features.filter(f => f.actionType === 'passive' && f.level <= 15)
    expect(passives.length).toBeGreaterThan(0)
    for (const p of passives) expect(byName(at15, new RegExp(p.name, 'i'))).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
describe('VAL-11 — the cloak Reaction must have a recorded trigger', () => {
  it('shipped in slice 8b: an unrecorded trigger states the gap and says where to close it', () => {
    // Asserted in full by reactions.test.ts and ReactionsBand.test.tsx. What
    // belongs HERE is the canon-facing half: that the rule this suite is
    // ledgering is the same rule that slice shipped, tied to its erratum.
    const rule = VALIDATION_RULES.find(r => r.id === 'VAL-11')
    expect(rule?.rule).toMatch(/HEARTH-03/)
    expect(rule?.rule).toMatch(/record/i)
  })
})

// ---------------------------------------------------------------------------
describe('VAL-12 — the auras are inactive while Incapacitated', () => {
  it('Incapacitated blocks every economy slot, and every row says why', () => {
    // The mechanisable half, and the app is good at it. All fourteen options
    // go unavailable and each carries a reason in words — not a greyed row
    // with no explanation, which at a table is indistinguishable from a bug.
    expect(effectOf('Incapacitated').blocks).toEqual(['action', 'bonusAction', 'reaction'])
    expect(blockedSlots(['Incapacitated'])).toEqual(['action', 'bonusAction', 'reaction'])
    const inc = composeTurn({ character: { ...NIX, conditions: ['Incapacitated'] }, combat: null })
    const rows = allOptions(inc)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.filter(o => o.available)).toEqual([])
    for (const o of rows) expect(o.blockedReason).toMatch(/incapacitated/i)
  })

  it.skip('VAL-12 — PARTIAL, NOT MECHANISABLE: the auras themselves compose no row to switch off', () => {})

  it('GAP PIN: both auras are on the sheet, and neither reaches a row in EITHER state', () => {
    // The control case is the whole verdict. Asking only "are the auras off
    // while Incapacitated?" would go green against an app that models no auras
    // at all — the test would be measuring its own blind spot. So the healthy
    // case is asserted alongside: they are absent when nothing is wrong too,
    // which makes this finding AT and not a VAL-12 violation.
    const onSheet = NIX.features.filter(f => /^aura of/i.test(f.name) && f.level <= NIX.level)
    expect(onSheet.map(f => f.name)).toEqual(['Aura of Protection', 'Aura of Solace'])
    const inc = composeTurn({ character: { ...NIX, conditions: ['Incapacitated'] }, combat: null })
    expect(allOptions(freshTurn()).filter(o => /aura/i.test(o.name))).toEqual([])
    expect(allOptions(inc).filter(o => /aura/i.test(o.name))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('VAL-13 — a Smite may only follow a resolved melee hit', () => {
  it.fails('VIOLATED: Divine Smite must not be offered before an attack roll resolves', () => {
    // Canon's rule written straight, and its own words are "Never offer it
    // before an attack roll resolves." On a fresh turn with nothing attacked,
    // the app offers it, unblocked. This is the rule most likely to cost
    // Marcus a slot at a real table: the row is right there, and taking it
    // spends a 1st-level slot on damage that cannot legally be dealt.
    const smite = byName(freshTurn(), /divine smite/i)
    expect(smite).toBeUndefined()
  })

  it('GAP PIN: no combat field records the last attack roll or its outcome', () => {
    // Scoping the fix honestly. The guard cannot be written until the state
    // exists — and `combat-state.ts` has five fields, none of them about an
    // attack. This belongs to slice 10b's write path, which is the slice that
    // introduces "something happened" at all.
    const combat = createCombatState(NIX)
    expect(Object.keys(combat).filter(k => /attack|hit|last|target/i.test(k))).toEqual([])
  })

  it('the sheet already carries the human version of the rule', () => {
    // Not a substitute for the guard, and recorded as such: a tactical note is
    // advice, and VAL-13 asks for a gate. But it does mean the app is not
    // silent today, which is worth knowing when 10b prices the fix.
    const smite = NIX.spells.find(s => s.name === 'Divine Smite')
    expect(smite?.tacticalNote).toMatch(/wait for a hit/i)
  })
})

// ---------------------------------------------------------------------------
describe('VAL-14 — a crit doubles every damage die and never a flat modifier', () => {
  it('doubles the dice count and leaves the modifier alone', () => {
    expect(critNotation('2d8+4')).toBe('4d8+4')
    expect(critNotation('1d8+7')).toBe('2d8+7')
    expect(critNotation('3d6')).toBe('6d6')
    expect(critNotation('1d10')).toBe('2d10')
  })

  it('refuses a notation it cannot parse rather than guessing', () => {
    // "5d6 Fire plus 5d6 Radiant" is a real canon shape. Returning null puts
    // the sheet's own text on screen; returning a doubled guess would put a
    // confident wrong number in front of Marcus mid-crit. This is the
    // open-world rule in one function.
    expect(critNotation('5d6+5d6')).toBeNull()
    expect(critNotation('1d6 (scales at character levels 5, 11, 17)')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('VAL-15 — a ritual casting costs no slot', () => {
  it.fails('VIOLATED: a spell cast as a ritual must not consume a spell slot', () => {
    // Canon's rule written straight. `demandOfSpell` never reads `ritual`, so
    // any levelled ritual is priced at a slot. Nix carries none of canon's four
    // rituals today, which is why nothing has gone wrong yet — and is exactly
    // why this is pinned rather than left to be discovered at a table the week
    // he learns Detect Magic.
    const ritual: Spell = {
      name: 'Detect Magic',
      level: 1,
      school: 'Divination',
      castingTime: 'Action',
      range: 'Self',
      components: 'V, S',
      duration: '10 minutes',
      concentration: true,
      ritual: true,
      prepared: true,
      description: 'You sense the presence of magic within 30 feet of you.',
    }
    expect(demandOfSpell(ritual).consumesSpellSlot).toBe(false)
  })

  it('GAP PIN: canon names four rituals and Nix carries none of them', () => {
    // Bounds the blast radius of the violation above, and goes red the day he
    // learns one — at which point the pin stops being reassurance and the
    // `it.fails` above becomes a live bug on his sheet.
    const rituals = SPELLS.filter(s => s.ritual).map(s => s.name).sort()
    expect(rituals).toEqual([
      'Detect Magic',
      'Detect Poison and Disease',
      'Gentle Repose',
      'Purify Food and Drink',
    ])
    const carried = NIX.spells.filter(s => rituals.includes(s.name))
    expect(carried).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The ledger. These are the tests that stop this file from quietly rotting.
// ---------------------------------------------------------------------------
describe('the VAL ledger covers canon, and canon alone', () => {
  it('every id canon ships is accounted for here', () => {
    const canonIds = VALIDATION_RULES.map(r => r.id).sort()
    expect(canonIds.length).toBe(15)
    expect(Object.keys(ACCOUNTED).sort()).toEqual(canonIds)
  })

  it('no id is accounted for that canon does not ship', () => {
    // The other direction, and it is not redundant: it catches a rule deleted
    // from a future canon package, which would otherwise leave this file
    // asserting a rule nobody holds any more.
    const canonIds = new Set(VALIDATION_RULES.map(r => r.id))
    for (const id of Object.keys(ACCOUNTED)) expect(canonIds.has(id)).toBe(true)
  })

  it("canon's severities are what this suite was graded against", () => {
    // Asserted, not restated. If canon promotes VAL-12 from `info` to `error`,
    // the weight of a gap this file currently tolerates has changed, and that
    // should stop a build rather than pass unnoticed.
    const severities = Object.fromEntries(VALIDATION_RULES.map(r => [r.id, r.severity]))
    expect(severities).toEqual({
      'VAL-01': 'error',
      'VAL-02': 'error',
      'VAL-03': 'info',
      'VAL-04': 'error',
      'VAL-05': 'warning',
      'VAL-06': 'warning',
      'VAL-07': 'warning',
      'VAL-08': 'error',
      'VAL-09': 'error',
      'VAL-10': 'error',
      'VAL-11': 'error',
      'VAL-12': 'info',
      'VAL-13': 'error',
      'VAL-14': 'error',
      'VAL-15': 'info',
    })
  })

  it('every rule carries text a human can read, because a gap report quotes it', () => {
    for (const rule of VALIDATION_RULES) {
      expect(rule.rule.length).toBeGreaterThan(20)
      expect(rule.rule.endsWith('…')).toBe(false)
    }
  })
})
