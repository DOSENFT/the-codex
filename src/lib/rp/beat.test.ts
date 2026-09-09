import { describe, it, expect } from 'vitest'
import { normaliseBeat } from './beat'
import type { BeatRequest } from './types'
import { NIX } from '../turn/fixtures/nix'

/* ============================================================================
   A MODEL ASKED FOR EIGHT FIELDS RETURNS SIX OF THEM OFTEN ENOUGH TO MATTER.

   Every one of those is a hole in a card at a table. This repo has no jsdom, so
   a hole that only appears in a rendered component is a hole no test can see —
   which is why the filling happens here, in a pure function, and is asserted
   here rather than in the card.
   ========================================================================== */

const REQ: BeatRequest = {
  character: NIX,
  table: { scene: 'The campfire', mood: '', members: [] },
  intent: 'pull-in',
  aimAt: null,
}

const AIMED: BeatRequest = {
  ...REQ,
  aimAt: { id: 'm1', name: 'Sarah', isNew: true, lastSpotlightAt: null, beatsAimed: 0 },
}

describe('normaliseBeat fills the bands a model leaves out', () => {
  it('completes a beat that arrived with only a move and a goal', () => {
    const beat = normaliseBeat({ say: 'You left in a hurry.', goal: 'Open a door for them.' }, REQ, 'b1')
    expect(beat).not.toBeNull()
    expect(beat!.useWhen.length).toBeGreaterThan(10)
    expect(beat!.followUp.length).toBeGreaterThan(10)
    expect(beat!.out.length).toBeGreaterThan(10)
  })

  it('never returns a beat with an empty band', () => {
    const beat = normaliseBeat({ do: 'Sit down.', goal: 'Slow the scene.' }, REQ, 'b2')!
    for (const f of ['useWhen', 'goal', 'followUp', 'out', 'aim'] as const) {
      expect(beat[f], `${f} was empty`).toBeTruthy()
    }
  })

  it('reads the flat say/do/think shape the old prompt returns', () => {
    /* `impulseReaction` has always returned {say, do, think} and a prompt change
       does not reach a model that is already mid-answer — nor a cached one. */
    const beat = normaliseBeat(
      { say: 'Behind me.', do: 'Step in front of them.', think: 'Claim the first four seconds.' },
      REQ, 'b3',
    )!
    expect(beat.moves.map(m => m.kind)).toEqual(['do', 'say'])
    expect(beat.goal).toBe('Claim the first four seconds.')
  })

  it('reads the moves array shape the new prompt asks for', () => {
    const beat = normaliseBeat({
      moves: [{ kind: 'ask', text: 'What did you take?' }],
      goal: 'One small question.',
    }, REQ, 'b4')!
    expect(beat.moves).toEqual([{ kind: 'ask', text: 'What did you take?' }])
  })

  it('accepts directions as bare strings and splits the label off', () => {
    // Models return this shape roughly as often as they return objects.
    const beat = normaliseBeat({
      say: 'x', goal: 'y',
      directions: ['Warmer — answer it yourself first', 'Darker — the object was stolen'],
    }, REQ, 'b5')!
    expect(beat.directions[0]).toEqual({ label: 'Warmer', text: 'answer it yourself first' })
    expect(beat.directions[1].label).toBe('Darker')
  })

  it('keeps an unlabelled direction rather than inventing a label', () => {
    // A wrong label is worse than no label: it tells him the direction is
    // something it is not.
    const beat = normaliseBeat({ say: 'x', goal: 'y', directions: ['it gets worse'] }, REQ, 'b6')!
    expect(beat.directions[0].text).toBe('it gets worse')
    expect(beat.directions[0].label).toBe('')
  })

  it('caps the moves at three and the directions at three', () => {
    // The card is read mid-scene on a phone. A model that returns nine moves
    // has written an essay, and an essay is the thing he asked us to stop.
    const beat = normaliseBeat({
      goal: 'y',
      moves: Array.from({ length: 9 }, (_, i) => ({ kind: 'say', text: `line ${i}` })),
      directions: Array.from({ length: 9 }, (_, i) => `d${i} — text ${i}`),
    }, REQ, 'b7')!
    expect(beat.moves).toHaveLength(3)
    expect(beat.directions).toHaveLength(3)
    expect(beat.moves[0].text).toBe('line 0')   // kept the first, not a sample
  })
})

describe('normaliseBeat refuses what is not worth showing', () => {
  it('returns null when there is no move at all', () => {
    // Handing this back would be six headings and no beat.
    expect(normaliseBeat({ goal: 'a goal with no move' }, REQ, 'b8')).toBeNull()
  })

  it('returns null when there is no goal', () => {
    /* A move with no goal IS the one-liner he complained about, wearing six
       headings. Rejecting it sends the moment to the bank, where the goal is
       guaranteed. */
    expect(normaliseBeat({ say: 'a line, alone' }, REQ, 'b9')).toBeNull()
  })

  it('returns null for prose, for null and for a number', () => {
    expect(normaliseBeat('Sure! Here is a beat:', REQ, 'x')).toBeNull()
    expect(normaliseBeat(null, REQ, 'x')).toBeNull()
    expect(normaliseBeat(42, REQ, 'x')).toBeNull()
  })

  it('treats whitespace-only fields as absent', () => {
    expect(normaliseBeat({ say: '   ', goal: '  ' }, REQ, 'x')).toBeNull()
  })
})

describe('normaliseBeat aims the beat', () => {
  it('uses the name from the request over anything the model said', () => {
    // He tapped "Aim a beat →" on a specific person. The model does not get a
    // vote on who that was.
    const beat = normaliseBeat({ say: 'x', goal: 'y', aim: 'Tom' }, AIMED, 'x')!
    expect(beat.aim).toBe('Sarah')
  })

  it('flags a first-timer so the card can say so', () => {
    expect(normaliseBeat({ say: 'x', goal: 'y' }, AIMED, 'x')!.aimNote).toBe('first session')
  })

  it('falls back to the circle rather than leaving the aim blank', () => {
    expect(normaliseBeat({ say: 'x', goal: 'y' }, REQ, 'x')!.aim).toBe('the circle')
  })

  it('marks a normalised beat as live', () => {
    expect(normaliseBeat({ say: 'x', goal: 'y' }, REQ, 'x')!.source).toBe('live')
  })
})
