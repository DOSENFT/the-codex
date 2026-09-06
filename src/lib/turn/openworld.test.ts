// The open-world pass — Slice 6c
//
// Every other suite in this folder drives NIX. Nix is homebrew, but he is
// homebrew *around a Paladin*: `paladinResources` exists on him, his features
// are called "Lay on Hands" and "Channel Divinity", his sword declares a
// mastery the 2024 table knows by name. Each of those is a recognised name,
// and a fixture that keeps landing on the recognised branch cannot tell us
// anything about the other one.
//
// This file drives TIDEWRIGHT, where nothing is real. It asserts the whole
// loop — compose → rank → spend → undo — against content the engine has never
// seen, and it opens by asserting the premise itself, so that "nothing here is
// known" is a checked fact rather than a claim in a comment.
//
// One test in here (`offers a feature Marcus declared an Action`) fails
// against the code of Slice 6b, which filed any feature with 'aura' in its
// NAME as a passive and hid it. See the note on that test.

import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { poolIdFor } from './ids'
import { reduce, reconcile, revert, takenFrom, type SessionState } from './reduce'
import type { CombatState } from '../combat-state'
import type { TurnOption } from './types'
import { allConditions, effectOf } from '../rules-2024/conditions'
import { coerceMastery, masteryForWeaponName } from '../rules-2024/mastery'
import { TIDEWRIGHT, TALLY_ID } from './fixtures/openworld'
import { NIX } from './fixtures/nix'

const FIGHTING: CombatState = {
  inCombat: true,
  round: 2,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 3 } },
  concentrating: null,
}

function session(character = TIDEWRIGHT): SessionState {
  return reconcile({ character, combat: FIGHTING })
}

const turnFor = (character = TIDEWRIGHT) =>
  composeTurn({ character, combat: FIGHTING })

/** Every option the screen can show, wherever the composer filed it. There is
 *  no `all` on ComposedTurn, and a test that forgets the mutex faces will pass
 *  while missing exactly the options that contend. */
const listed = (turn: ReturnType<typeof turnFor>): TurnOption[] => [
  ...turn.ranked,
  ...turn.rest,
  ...turn.mutex.flatMap(g => g.faces),
]

const find = (turn: ReturnType<typeof turnFor>, name: string) =>
  listed(turn).find(o => o.name === name)

// ---------------------------------------------------------------------------
// 1. The premise, checked
// ---------------------------------------------------------------------------

describe('the premise — nothing in this fixture is content the engine knows', () => {
  it('has no weapon the 2024 table recognises, by name or by declaration', () => {
    for (const weapon of TIDEWRIGHT.weapons) {
      expect(masteryForWeaponName(weapon.name)).toBeNull()
      expect(coerceMastery(weapon.masteryProperty)).toBeNull()
    }
  })

  it('has no condition that appears in the rulebook', () => {
    const book = new Set(allConditions().map(c => c.name.toLowerCase()))
    for (const name of TIDEWRIGHT.conditions) {
      expect(book.has(name.toLowerCase())).toBe(false)
    }
  })

  it('has no feature that mints one of the two bespoke paladin pool ids', () => {
    // `poolIdFor` is the one place a NAME still becomes a specific id. If a
    // Tidewright feature ever routed into 'lay-on-hands', this fixture would
    // be quietly testing the Paladin path again.
    for (const feature of TIDEWRIGHT.features) {
      expect(poolIdFor(feature.name)).toBeUndefined()
    }
  })

  it('carries no paladinResources, because most characters do not', () => {
    expect(TIDEWRIGHT.paladinResources).toBeUndefined()
    // And composing still works — the bespoke pair is genuinely optional.
    expect(turnFor().resources.map(r => r.id)).not.toContain('lay-on-hands')
  })
})

// ---------------------------------------------------------------------------
// 2. Composing
// ---------------------------------------------------------------------------

describe('composing a turn out of invented content', () => {
  const turn = turnFor()

  it('offers a feature Marcus declared an Action, whatever he called it', () => {
    // THE BUG THIS SLICE FOUND. `options.ts` filed a feature as passive if its
    // NAME contained 'aura', overriding the actionType Marcus had explicitly
    // written. Nix cannot see it: all three of his auras declare `passive`
    // anyway, so the sniff never changes his answer. For anyone else it means
    // the app disregards a declaration and hides a usable ability — the exact
    // failure mode Slice 6c exists to find.
    const aura = find(turn, 'Undertow Aura')
    expect(aura).toBeDefined()
    expect(aura!.cost.slot).toBe('action')
  })

  it('still files a feature that genuinely says passive as a passive', () => {
    // The other half of the same fix. Removing the name sniff must not start
    // offering Brine-Marked as something you can spend an action on.
    expect(find(turn, 'Brine-Marked')).toBeUndefined()
  })

  it('keeps an unrecognised mastery\'s words, and admits it does not know it', () => {
    expect(find(turn, 'Brinehook')!.rider).toMatchObject({
      property: 'Undertow',
      known: false,
      text: 'Undertow',
      automatic: false,
      expires: 'unspecified',
    })
  })

  it('invents no rider for a weapon that declares none', () => {
    expect(find(turn, "Tidewright's Lash")!.rider).toBeUndefined()
  })

  it('shows a condition Marcus wrote, in his words, not in a summary of it', () => {
    const upon = turn.upon.find(u => u.name === 'Undertowed')
    expect(upon).toBeDefined()
    // `known: true`, and that is the strong claim, not a weak one. A condition
    // Marcus authored is not a stranger the app is being polite about — it has
    // a definition, so the engine can enforce it. `known: false` is reserved
    // for a bare name typed at the table with no definition behind it, which
    // the app can display and nothing more.
    expect(upon!.known).toBe(true)
    // And the words are HIS. Not a sentence assembled from the flags — the
    // note is the half of a homebrew condition no boolean can carry.
    expect(upon!.text).toBe(TIDEWRIGHT.customConditions![0]!.note)
  })

  it('displays a bare name it has no definition for, rather than dropping it', () => {
    // The other arm: no `customConditions` entry, so nothing is known. It must
    // still reach the screen. A condition that vanishes because the app did
    // not recognise it is the failure that loses a round at the table.
    const bare = turnFor({ ...TIDEWRIGHT, customConditions: [] })
    const upon = bare.upon.find(u => u.name === 'Undertowed')
    expect(upon).toBeDefined()
    expect(upon!.known).toBe(false)
    expect(upon!.text).toBeTruthy()
  })

  it('lets that condition close the slot it says it closes', () => {
    const ward = find(turn, 'Salt Ward')!
    expect(ward.available).toBe(false)
    expect(ward.blockedReason).toBeTruthy()
  })

  it('shows an authored pool with its own unit, recharge and note', () => {
    // `dice` and `dawn` are enum arms no other fixture reaches.
    expect(turn.resources.find(r => r.id === TALLY_ID)).toMatchObject({
      name: 'Saltwater Tally',
      current: 6,
      max: 6,
      unit: 'dice',
      recharge: 'dawn',
      note: 'Rolled, not spent — the sea keeps its own count.',
      homebrew: true,
    })
  })

  it('marks two invented bonus actions as contending, and still lists them', () => {
    const group = turn.mutex.find(g => g.faces.some(f => f.name === 'Riptide Step'))
    expect(group).toBeDefined()
    expect(group!.faces.map(f => f.name)).toContain('Set Your Feet')

    // And a face is shown ONCE — that property survives Slice R2 intact and is
    // still the thing worth guarding, because "three rows for one decision" is
    // exactly the lie contention.ts exists to prevent, and homebrew is where a
    // duplicate gets forgotten.
    //
    // What changed is WHICH list holds the one row. This line used to read
    // `not.toContain('Riptide Step')`: a homebrew bonus action had to be ABSENT
    // from the flat list because its bracket held it instead. That absence is
    // the defect Marcus reported — an option left its band for exactly as long
    // as he could still take it. The face now sits in `ranked`, once, carrying
    // `contended` so the row can say it competes.
    const flat = [...turn.ranked, ...turn.rest].map(o => o.name)
    expect(flat.filter(n => n === 'Riptide Step')).toHaveLength(1)
    expect(find(turn, 'Riptide Step')!.contended).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. Ranking
// ---------------------------------------------------------------------------

describe('ranking content it cannot recognise', () => {
  const turn = turnFor()

  it('scores every option with a real number', () => {
    // A rank rule that reaches for a property invented content does not have
    // yields NaN, and NaN sorts arbitrarily — the list would look ranked and
    // be random. Cheap to assert, impossible to notice on a screenshot.
    for (const option of listed(turn)) {
      expect(Number.isFinite(option.score)).toBe(true)
    }
  })

  it('returns the ranked list in descending score order', () => {
    const scores = turn.ranked.map(o => o.score)
    expect(scores).toStrictEqual([...scores].sort((a, b) => b - a))
  })

  it('ranks something — an all-homebrew sheet is not an empty turn', () => {
    expect(turn.ranked.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Spending, and putting it back
// ---------------------------------------------------------------------------

describe('spending invented content and undoing it', () => {
  it('spends an authored pool through an option it composed itself', () => {
    // No hand-built TakenOption: the id compose PRICES with has to be the id
    // reduce PAYS with, for content neither of them has a table for.
    const state = session()
    const aura = find(turnFor(), 'Undertow Aura')!
    expect(aura.available).toBe(true)

    const applied = reduce(state, { type: 'takeOption', option: takenFrom(aura) }, [])
    expect(applied.refused).toBeUndefined()
    expect(applied.state.character.resourcePools![0]!.current).toBe(4)
    expect(applied.entry!.restore.pools).toStrictEqual({ [TALLY_ID]: 6 })
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })

  it('spends a feature that keeps its own counter, and puts that back too', () => {
    const state = session()
    const step = find(turnFor(), 'Riptide Step')!

    const applied = reduce(state, { type: 'takeOption', option: takenFrom(step) }, [])
    expect(applied.refused).toBeUndefined()
    expect(
      applied.state.character.features.find(f => f.name === 'Riptide Step')!.usesCurrent,
    ).toBe(2)
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })

  it('refuses the aura once the tally cannot cover it, and changes nothing', () => {
    const thin = {
      ...TIDEWRIGHT,
      resourcePools: [{ ...TIDEWRIGHT.resourcePools![0]!, current: 1 }],
    }
    const state = session(thin)
    const aura = find(turnFor(thin), 'Undertow Aura')!

    // The row must say so BEFORE the tap, not after it.
    expect(aura.available).toBe(false)
    expect(aura.blockedReason).toBe('Not enough Saltwater Tally left')

    const out = reduce(state, { type: 'takeOption', option: takenFrom(aura) }, [])
    expect(out.entry).toBeNull()
    expect(out.state.character).toBe(state.character)
  })

  it('blocks a binding whose pool has been deleted, instead of going free', () => {
    // The third thing Slice 6b wrote down for 6c. Delete the pool and the two
    // features bound to it are still on the sheet, still pointing at an id
    // that resolves to nothing. Before this the reducer charged nothing and
    // the row stayed live: an ability that costs whatever Marcus said it
    // costs, silently becoming free, is a worse bug than one that refuses —
    // because nothing on the screen ever looks wrong.
    const orphaned = { ...TIDEWRIGHT, resourcePools: [] }
    const aura = find(turnFor(orphaned), 'Undertow Aura')!
    expect(aura.available).toBe(false)
    expect(aura.blockedReason).toBe('Its resource pool no longer exists')
  })

  it('still lets the reducer undo an orphaned binding without throwing', () => {
    // DIFFERENTIAL CONTROL — this one passes before the 6c change as well as
    // after, and is here on purpose. Its job is not to catch the regression
    // above; it is to catch me fixing that regression in the wrong LAYER. A
    // pool can vanish between the spend and the undo, so the reducer must stay
    // tolerant even while the row turns strict. If a later edit makes the
    // reducer throw or refuse instead, this fails and the other still passes.
    const orphaned = { ...TIDEWRIGHT, resourcePools: [] }
    const state = session(orphaned)
    const step = find(turnFor(orphaned), 'Riptide Step')!
    const applied = reduce(state, { type: 'takeOption', option: takenFrom(step) }, [])
    expect(applied.refused).toBeUndefined()
    expect(revert(applied.state, applied.entry!)).toStrictEqual(state)
  })

  it('runs a whole round of invented content and unwinds to the start', () => {
    const start = session()
    const turn = turnFor()
    const spell = find(turn, 'Drown the Lantern')!
    const step = find(turn, 'Riptide Step')!

    const first = reduce(start, { type: 'takeOption', option: takenFrom(spell) }, [])
    expect(first.refused).toBeUndefined()
    const second = reduce(first.state, { type: 'takeOption', option: takenFrom(step) }, [])
    expect(second.refused).toBeUndefined()

    const back = revert(revert(second.state, second.entry!), first.entry!)
    expect(back).toStrictEqual(start)
  })
})

// ---------------------------------------------------------------------------
// 5. The condition Marcus wrote is not merely decorative
// ---------------------------------------------------------------------------

describe('a homebrew condition the rulebook has never heard of', () => {
  it('is obeyed, not merely tolerated', () => {
    const effect = effectOf('Undertowed', TIDEWRIGHT.customConditions)
    expect(effect.known).toBe(true)
    expect(effect.blocks).toContain('reaction')
    expect(effect.attacksAgainstYouHaveAdvantage).toBe(true)
  })

  it('leaves the slots it says nothing about alone', () => {
    // It closes the Reaction and nothing else. A homebrew condition that
    // over-reached would be worse than one that under-reached: it would take
    // Marcus's turn away from him and he would have no idea why.
    const turn = turnFor()
    expect(turn.economy.action).toBe(true)
    expect(turn.economy.bonusAction).toBe(true)
    expect(turn.economy.reaction).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. The one line under the name says each thing once
// ---------------------------------------------------------------------------
//
// `detail` is built in compose.ts by joining `mechanicsLine` and
// `effectsLine`. Both are assembled independently in options.ts and both end
// up carrying the feature's range, so every feature that declares one printed
// it twice — "Self · Self", "10 feet · 10 feet", and on Nix "Touch · Touch ·
// 15/40 uses". No unit test in the repo caught it and no assertion could have:
// the string was correct on both sides of the join. It was found by looking at
// the iPad screenshot.
//
// These two fail against the code of the first half of Slice 6c.

/** The detail line as the eye reads it: the ` · ` segments, normalised. */
const segmentsOf = (o: TurnOption) =>
  o.detail
    .split(' · ')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)

function firstRepeat(o: TurnOption): string | null {
  const seen = new Set<string>()
  for (const s of segmentsOf(o)) {
    if (seen.has(s)) return s
    seen.add(s)
  }
  return null
}

describe('the detail line', () => {
  it('never says the same thing twice, for content nobody wrote a rule for', () => {
    const turn = turnFor()
    const offenders = listed(turn)
      .map(o => ({ name: o.name, repeat: firstRepeat(o), detail: o.detail }))
      .filter(x => x.repeat !== null)
    expect(offenders).toStrictEqual([])

    // Anchored, so this cannot pass by the composer quietly emitting nothing.
    // Undertow Aura declares `range: '10 feet'`; the mechanics line ends with
    // it and the effects line pushed it again.
    const aura = find(turn, 'Undertow Aura')
    expect(aura).toBeDefined()
    expect(segmentsOf(aura!)).toContain('10 feet')
    expect(segmentsOf(aura!).filter(s => s === '10 feet')).toHaveLength(1)
  })

  it('never says the same thing twice for Nix either', () => {
    // The same defect, on the character Marcus actually plays. Lay on Hands
    // read "Touch · Touch · 15/40 uses · recharges on long rest" — the
    // duplicated word pushed the number he needs off the end of a phone row.
    const turn = turnFor(NIX)
    const offenders = listed(turn)
      .map(o => ({ name: o.name, repeat: firstRepeat(o), detail: o.detail }))
      .filter(x => x.repeat !== null)
    expect(offenders).toStrictEqual([])

    // And nothing was lost in the deduping: every option still has a line, and
    // the ones that carry a resource reading still carry it.
    for (const o of listed(turn)) expect(o.detail.length).toBeGreaterThan(0)
    // The reading Marcus needs is still ON THE ROW. It moved from cream to
    // gold rather than being deleted — see the counter test below, which is
    // where that move is asserted properly. Checked against `cost.label`
    // deliberately: an earlier draft of this line looked for it in `detail`
    // and so was pinning the duplication itself.
    const hands = find(turn, 'Lay on Hands')
    if (hands) expect(`${hands.cost.label} ${hands.detail}`).toMatch(/15\/40/)
  })

  it('does not repeat in cream what the cost already says in gold', () => {
    // Riptide Step was priced "Bonus action · 3/3 uses" and then said "3/3
    // uses" again on the line directly beneath it. Whatever states a cost owns
    // it; nothing else on the row repeats it.
    for (const character of [TIDEWRIGHT, NIX]) {
      for (const o of listed(turnFor(character))) {
        const costSegs = o.cost.label
          .split(' · ')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean)
        for (const seg of segmentsOf(o)) {
          expect(
            costSegs,
            `${character.name} · ${o.name} — "${seg}" appears in both the cost ("${o.cost.label}") and the detail ("${o.detail}")`,
          ).not.toContain(seg)
        }
      }
    }
  })

  it('catches the same counter wearing two different nouns', () => {
    // Lay on Hands is priced "Bonus action · 15/40 points" and its detail said
    // "15/40 uses". Two words for one pool, and a player reading fast has to
    // stop and work out whether they are the same number by accident.
    const hands = find(turnFor(NIX), 'Lay on Hands')
    expect(hands).toBeDefined()
    expect(hands!.cost.label).toMatch(/15\/40/)
    expect(hands!.detail).not.toMatch(/15\/40/)
    // ...without eating the rest of the line.
    expect(hands!.detail).toContain('Touch')
    expect(hands!.detail).toContain('recharges on long rest')
  })

  it('does not mistake dice or a bonus for a counter reading', () => {
    // The counter rule matches only a LEADING "n/m". "1d8+4 Slashing" and
    // "+7 to hit" carry numbers too, and losing either would cost Marcus the
    // roll he opened the app to find.
    const hearthbrand = find(turnFor(NIX), 'Hearthbrand')
    expect(hearthbrand).toBeDefined()
    expect(hearthbrand!.detail).toContain('1d8+4 Slashing')
    expect(hearthbrand!.detail).toContain('+7 to hit')
    expect(hearthbrand!.detail).toContain('Versatile (1d10)')
  })

  it('leaves a near-miss alone, because it is a different fact', () => {
    // "1st-level slot" in the cost must not swallow "1st-level" in the detail:
    // the first is what it costs, the second is what it is cast at, and they
    // come apart the moment a spell is upcast.
    const lantern = find(turnFor(), 'Drown the Lantern')
    expect(lantern).toBeDefined()
    expect(lantern!.cost.label).toContain('1st-level slot')
    expect(segmentsOf(lantern!)).toContain('1st-level')
  })

  it('never leaves a row with nothing under its name', () => {
    // Deduping must not be able to empty the line. If everything a line had to
    // say is already said, the summary is what remains.
    for (const character of [TIDEWRIGHT, NIX]) {
      for (const o of listed(turnFor(character))) {
        expect(o.detail.trim().length, `${o.name} has an empty detail`).toBeGreaterThan(0)
      }
    }
  })
})
