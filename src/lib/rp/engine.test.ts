import { describe, it, expect } from 'vitest'
import { requestBeat } from './engine'
import type { BeatRequest } from './types'
import { NIX } from '../turn/fixtures/nix'

/* ============================================================================
   THE CONTRACT: requestBeat NEVER REJECTS.

   Marcus, 2026-09-07, with five screenshots of the Roleplay tab taken while
   prepping a session: "The AI frustratingly doesn't work consistently as seen
   in the images." One of those images is a raw Gemini 503 JSON blob sitting in
   the middle of a roleplay card. His answer when asked how it should behave was
   "Keep it live, but make it never fail visibly."

   `lib/ai.ts` fixed the transport half in be55b6c — a 503 now retries. This is
   the other half, and it is the half that has to hold when the retry ALSO
   fails: no signal at a friend's house, an expired key, a model that answers
   with an apology instead of JSON. At a table every one of those is the same
   event — he taps, and nothing comes.

   EVERY TEST BELOW FAILS AGAINST A `requestBeat` THAT PROPAGATES. That is the
   only reason engine.ts is allowed to promise this in a comment.
   ========================================================================== */

const REQ: BeatRequest = {
  character: NIX,
  table: {
    scene: 'The campfire',
    mood: 'two new players, nobody has said the thing yet',
    members: [
      { id: 'm1', name: 'Sarah', isNew: true, lastSpotlightAt: null, beatsAimed: 0 },
      { id: 'm2', name: 'Tom', isNew: false, lastSpotlightAt: null, beatsAimed: 0 },
    ],
  },
  intent: 'pull-in',
  aimAt: null,
}

/** A complete, well-formed model answer. */
const GOOD = {
  useWhen: 'When the circle has gone quiet.',
  moves: [
    { kind: 'do', text: 'Push a stick into the fire.' },
    { kind: 'say', text: 'You left in a hurry.' },
  ],
  goal: 'Give them a question they cannot fail.',
  followUp: 'Ask who gave it to them.',
  directions: [{ label: 'Warmer', text: 'Answer it yourself first.' }],
  out: 'Answer your own question and move on.',
}

describe('requestBeat never rejects — the whole point of the module', () => {
  it('resolves from the bank when the model throws', async () => {
    const beat = await requestBeat(REQ, () => Promise.reject(new Error('503 UNAVAILABLE')))
    expect(beat.source).toBe('bank')
    expect(beat.moves.length).toBeGreaterThan(0)
  })

  it('resolves from the bank when there is no network at all', async () => {
    const beat = await requestBeat(REQ, () => Promise.reject(new TypeError('fetch failed')))
    expect(beat.source).toBe('bank')
  })

  it('resolves from the bank when the model returns prose instead of JSON', async () => {
    // A model that opens with "Sure! Here's a great beat:" and never closes a
    // brace lands here as a string. Today that is a blank card.
    const beat = await requestBeat(REQ, () => Promise.resolve('Sure! Here is a great beat:'))
    expect(beat.source).toBe('bank')
  })

  it('resolves from the bank when the model returns valid JSON with nothing in it', async () => {
    /* THE FAILURE THE SCREENSHOTS DID NOT SHOW, and the one that would have been
       hardest to spot: a card with six empty headings reads as a bug in the app
       rather than a bad minute at Google. */
    const beat = await requestBeat(REQ, () => Promise.resolve({ say: '', goal: '' }))
    expect(beat.source).toBe('bank')
    expect(beat.goal.length).toBeGreaterThan(20)
  })

  it('resolves from the bank when the model returns null', async () => {
    const beat = await requestBeat(REQ, () => Promise.resolve(null))
    expect(beat.source).toBe('bank')
  })

  it('fills EVERY band on the fallback — a hole here only appears during an outage', async () => {
    const beat = await requestBeat(REQ, () => Promise.reject(new Error('down')))
    for (const field of ['useWhen', 'goal', 'followUp', 'out', 'aim'] as const) {
      expect(beat[field], `${field} was empty on a banked beat`).toBeTruthy()
    }
    expect(beat.moves.length).toBeGreaterThan(0)
    expect(beat.directions.length).toBeGreaterThan(0)
  })
})

describe('requestBeat uses the live answer when there is one', () => {
  it('returns the model’s beat, marked live, and does not reach for the bank', async () => {
    const beat = await requestBeat(REQ, () => Promise.resolve(GOOD))
    expect(beat.source).toBe('live')
    expect(beat.goal).toBe('Give them a question they cannot fail.')
    expect(beat.moves).toHaveLength(2)
  })

  it('aims the live beat at the person the request named', async () => {
    const aimed: BeatRequest = { ...REQ, aimAt: REQ.table.members[0] }
    const beat = await requestBeat(aimed, () => Promise.resolve(GOOD))
    expect(beat.aim).toBe('Sarah')
    expect(beat.aimNote).toBe('first session')   // she has never played before
  })

  it('sends the intent as English, not as the union member', async () => {
    /* `pull-in` is a key in this codebase. "Pull someone in" is an instruction
       to a director. A model follows the second and ignores the first, and the
       difference is invisible in the output until you read a hundred beats. */
    let systemPrompt = ''
    await requestBeat(REQ, (sys) => { systemPrompt = sys; return Promise.resolve(GOOD) })
    expect(systemPrompt).toContain('Pull someone in')
    expect(systemPrompt).not.toContain('WHAT THE PLAYER WANTS TO DO: pull-in')
  })

  it('tells the model which people are new, by name', async () => {
    // The single most useful fact the app has tonight, and until this feature
    // nothing in the app knew it.
    let systemPrompt = ''
    await requestBeat(REQ, (sys) => { systemPrompt = sys; return Promise.resolve(GOOD) })
    expect(systemPrompt).toContain('Sarah')
    expect(systemPrompt).toContain('NEVER PLAYED')
  })

  it('does not put the player’s own character in the list of other humans', async () => {
    const withSelf: BeatRequest = {
      ...REQ,
      table: { ...REQ.table, members: [...REQ.table.members, { id: 'me', name: NIX.name, isNew: false, lastSpotlightAt: null, beatsAimed: 0 }] },
    }
    let systemPrompt = ''
    await requestBeat(withSelf, (sys) => { systemPrompt = sys; return Promise.resolve(GOOD) })
    const others = systemPrompt.split('THE OTHER HUMANS AT THIS TABLE:')[1]?.split('These are real people')[0] ?? ''
    expect(others).not.toContain(NIX.name)
  })

  it('passes his own words through when he typed them', async () => {
    let userMsg = ''
    await requestBeat(
      { ...REQ, intent: 'custom', custom: 'the bard just insulted my god' },
      (_sys, user) => { userMsg = user; return Promise.resolve(GOOD) },
    )
    expect(userMsg).toBe('the bard just insulted my god')
  })
})
