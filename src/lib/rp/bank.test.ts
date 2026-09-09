import { describe, it, expect } from 'vitest'
import { bankFor, pickBanked, bankedToBeat } from './bank'
import { BEAT_INTENTS } from './types'

/* ============================================================================
   THE BANK IS THE PART THAT ONLY RUNS WHEN EVERYTHING ELSE IS BROKEN.

   Which is exactly why it needs the strictest tests in this feature. A missing
   field in a banked beat is invisible in every good session and appears for the
   first time at 9pm on a night with no signal — the one moment it was written
   to survive.
   ========================================================================== */

describe('every intent can answer, and answer completely', () => {
  it('has at least three beats for every intent', () => {
    // Fewer than three and the ↻ button starts repeating within one scene.
    for (const intent of BEAT_INTENTS) {
      expect(bankFor(intent).length, `${intent} is thin`).toBeGreaterThanOrEqual(3)
    }
  })

  it('has no banked beat with an empty band', () => {
    /* THE ONE THAT MATTERS. A bank entry missing `out` is a card with a blank
       heading, shown only during an outage, which is when he is least able to
       work around it. */
    for (const intent of BEAT_INTENTS) {
      for (const b of bankFor(intent)) {
        for (const field of ['useWhen', 'goal', 'followUp', 'out'] as const) {
          expect(b[field]?.trim().length, `${b.bankId}.${field}`).toBeGreaterThan(20)
        }
        expect(b.moves.length, `${b.bankId}.moves`).toBeGreaterThan(0)
        expect(b.directions.length, `${b.bankId}.directions`).toBeGreaterThanOrEqual(2)
        for (const m of b.moves) expect(m.text.trim().length, `${b.bankId} move`).toBeGreaterThan(10)
        for (const d of b.directions) expect(d.text.trim().length, `${b.bankId} direction`).toBeGreaterThan(10)
      }
    }
  })

  it('gives every beat a unique id', () => {
    const ids = BEAT_INTENTS.flatMap(i => bankFor(i).map(b => b.bankId))
    // `custom` deliberately reuses other intents' entries, so dedupe first.
    const distinct = new Set(ids)
    const perIntent = BEAT_INTENTS.filter(i => i !== 'custom').flatMap(i => bankFor(i).map(b => b.bankId))
    expect(new Set(perIntent).size).toBe(perIntent.length)
    expect(distinct.size).toBeGreaterThan(10)
  })
})

describe('nothing in the bank belongs to one campaign', () => {
  it('names no character, world or campaign', () => {
    /* A banked beat has to work at a campfire, in a throne room and in the back
       of a cart. It can only lean on STRUCTURE — offer, heighten, button — and
       never on content. The moment one of these says "Nix" it is a beat that is
       wrong everywhere except one table. */
    const forbidden = /\b(Nix|Faer[uû]n|Waterdeep|Baldur|Neverwinter|paladin|wizard|rogue|goblin|dragon)\b/i
    for (const intent of BEAT_INTENTS) {
      for (const b of bankFor(intent)) {
        const all = [b.useWhen, b.goal, b.followUp, b.out,
          ...b.moves.map(m => m.text), ...b.directions.map(d => d.text)].join(' ')
        expect(all, `${b.bankId} names something campaign-specific`).not.toMatch(forbidden)
      }
    }
  })

  it('mentions no dice, no spell slots and no rules', () => {
    // The bank fills a ROLEPLAY card. A mechanical suggestion here is the exact
    // failure mode `improvBeat` drops BASE_PROMPT to avoid.
    const mechanical = /\b(d20|d6|spell slot|saving throw|initiative roll|armor class|\bAC\b|hit points|\bHP\b)\b/i
    for (const intent of BEAT_INTENTS) {
      for (const b of bankFor(intent)) {
        const all = [b.useWhen, b.goal, b.followUp, b.out,
          ...b.moves.map(m => m.text), ...b.directions.map(d => d.text)].join(' ')
        expect(all, `${b.bankId} talks mechanics`).not.toMatch(mechanical)
      }
    }
  })
})

describe('pickBanked walks the bank instead of repeating it', () => {
  it('moves forward as nth increases', () => {
    const a = pickBanked('pull-in', 0)
    const b = pickBanked('pull-in', 1)
    expect(a.bankId).not.toBe(b.bankId)
  })

  it('never returns the entry it was told to avoid', () => {
    // ↻ pressed twice must not show the same card twice.
    for (const intent of BEAT_INTENTS) {
      const first = pickBanked(intent, 0)
      const second = pickBanked(intent, 0, first.bankId)
      expect(second.bankId, `${intent} repeated`).not.toBe(first.bankId)
    }
  })

  it('wraps instead of running off the end', () => {
    const n = bankFor('react').length
    expect(pickBanked('react', n).bankId).toBe(pickBanked('react', 0).bankId)
    // And a negative — which is what a decrementing counter would hand it.
    expect(() => pickBanked('react', -1)).not.toThrow()
    expect(pickBanked('react', -1).bankId).toBeTruthy()
  })
})

describe('bankedToBeat aims a generic beat at a real person', () => {
  it('puts the name in when the beat wants a person', () => {
    const person = bankFor('pull-in').find(b => b.aimKind === 'person')!
    const beat = bankedToBeat(person, 'pull-in', 'Sarah', 'first session', 'x')
    expect(beat.aim).toBe('Sarah')
    expect(beat.aimNote).toBe('first session')
    expect(beat.source).toBe('bank')
  })

  it('does not invent a name for a beat aimed at the room', () => {
    const room = bankFor('open-scene').find(b => b.aimKind === 'room')!
    const beat = bankedToBeat(room, 'open-scene', 'Sarah', 'first session', 'x')
    expect(beat.aim).not.toBe('Sarah')
    expect(beat.aimNote).toBeNull()
  })

  it('still aims somewhere when no name is known', () => {
    // He has not entered the roster yet. The card must still say who it is for.
    const person = bankFor('pull-in').find(b => b.aimKind === 'person')!
    expect(bankedToBeat(person, 'pull-in', null, null, 'x').aim.length).toBeGreaterThan(0)
  })
})
