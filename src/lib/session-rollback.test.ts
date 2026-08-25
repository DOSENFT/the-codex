import { describe, it, expect } from 'vitest'
import { findSessionRollback, describeRollback } from './session-rollback'
import type { Character } from './character'

/**
 * These tests exist because criterion R-10 failed in the run of record: the
 * harness healed for 5, re-imported the very same file, and Lay on Hands went
 * back to 35/35 with no word said. The bug was never in the parser — the file
 * is fine and the parse is fine. The bug is that nothing ever compared the
 * incoming file to the session it was about to overwrite.
 *
 * Every assertion below fails against the pre-change code, because before this
 * module there was no comparison to assert about.
 *
 * The fixtures are SYNTHETIC, for the same reason `import-character.test.ts`
 * says: Marcus's real export carries his persona and his backstory, and those
 * do not belong in a repo.
 */

/** Only the fields this module reads. Cast once, here, rather than building a
 *  fake 60-field Character in every test — a fixture that big stops being read. */
function ch(partial: Record<string, unknown>): Character {
  return {
    name: 'Testwright',
    hitPoints: { max: 67, current: 67 },
    spellSlots: {},
    ...partial,
  } as unknown as Character
}

describe('findSessionRollback — what it catches', () => {
  it('catches the R-10 case: re-importing a file refills Lay on Hands', () => {
    // The exact shape of the failure: file says 35, he has spent 5 this session.
    const live = ch({
      paladinResources: {
        layOnHands: { max: 35, current: 30 },
        channelDivinity: { max: 2, current: 2 },
      },
    })
    const incoming = ch({
      paladinResources: {
        layOnHands: { max: 35, current: 35 },
        channelDivinity: { max: 2, current: 2 },
      },
    })

    const entries = findSessionRollback(live, incoming)
    expect(entries).toEqual([{ label: 'Lay on Hands', from: 30, to: 35 }])
  })

  it('catches a spell slot handed back, and names the level the way he says it', () => {
    const live = ch({ spellSlots: { 1: { max: 4, current: 1 }, 2: { max: 3, current: 3 } } })
    const incoming = ch({ spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } } })

    const entries = findSessionRollback(live, incoming)
    expect(entries).toHaveLength(1)
    expect(entries[0].label).toBe('1st-level spell slots')
    expect(entries[0].from).toBe(1)
    expect(entries[0].to).toBe(4)
  })

  it('catches Channel Divinity', () => {
    const live = ch({
      paladinResources: {
        layOnHands: { max: 35, current: 35 },
        channelDivinity: { max: 2, current: 0 },
      },
    })
    const incoming = ch({
      paladinResources: {
        layOnHands: { max: 35, current: 35 },
        channelDivinity: { max: 2, current: 2 },
      },
    })

    expect(findSessionRollback(live, incoming)).toEqual([
      { label: 'Channel Divinity', from: 0, to: 2 },
    ])
  })

  it('catches hit points, because damage taken is session state too', () => {
    const live = ch({ hitPoints: { max: 67, current: 22 } })
    const incoming = ch({ hitPoints: { max: 67, current: 67 } })

    expect(findSessionRollback(live, incoming)).toEqual([
      { label: 'Hit points', from: 22, to: 67 },
    ])
  })

  it('catches a homebrew pool, and matches it by id even when it was renamed', () => {
    const pool = (over: object) => ({
      id: 'p1', name: 'Hearth Embers', max: 3, current: 3,
      unit: 'uses', recharge: 'longRest', ...over,
    })
    const live = ch({ resourcePools: [pool({ current: 0 })] })
    const incoming = ch({
      resourcePools: [pool({ name: 'Embers of the Hearth', current: 3 })],
    })

    expect(findSessionRollback(live, incoming)).toEqual([
      { label: 'Embers of the Hearth', from: 0, to: 3 },
    ])
  })

  it('reports every pool that moved, not just the first', () => {
    const live = ch({
      hitPoints: { max: 67, current: 40 },
      spellSlots: { 1: { max: 4, current: 2 } },
      paladinResources: {
        layOnHands: { max: 35, current: 5 },
        channelDivinity: { max: 2, current: 1 },
      },
    })
    const incoming = ch({
      hitPoints: { max: 67, current: 67 },
      spellSlots: { 1: { max: 4, current: 4 } },
      paladinResources: {
        layOnHands: { max: 35, current: 35 },
        channelDivinity: { max: 2, current: 2 },
      },
    })

    expect(findSessionRollback(live, incoming).map(e => e.label)).toEqual([
      'Hit points',
      '1st-level spell slots',
      'Lay on Hands',
      'Channel Divinity',
    ])
  })
})

describe('findSessionRollback — conditions (§ 9.14a)', () => {
  it('catches a condition the file would clear', () => {
    const live = ch({ conditions: ['Charmed'] })
    const incoming = ch({ conditions: [] })
    expect(findSessionRollback(live, incoming)).toEqual([
      { label: 'Condition', from: 'Charmed', to: 'cleared' },
    ])
  })

  it('names every condition that goes, and pluralises', () => {
    const live = ch({ conditions: ['Charmed', 'Prone', 'Frightened'] })
    const incoming = ch({ conditions: ['Prone'] })
    expect(findSessionRollback(live, incoming)).toEqual([
      { label: 'Conditions', from: 'Charmed, Frightened', to: 'cleared' },
    ])
  })

  it('says nothing when the file ADDS a condition — that is the file being newer', () => {
    const live = ch({ conditions: [] })
    const incoming = ch({ conditions: ['Charmed'] })
    expect(findSessionRollback(live, incoming)).toEqual([])
  })

  it('says nothing when the conditions match', () => {
    const live = ch({ conditions: ['Prone'] })
    const incoming = ch({ conditions: ['Prone'] })
    expect(findSessionRollback(live, incoming)).toEqual([])
  })
})

describe('findSessionRollback — what it must stay quiet about', () => {
  /* This half matters more than the half above. A notice that fires on an
     ordinary re-import is a notice he learns to dismiss without reading, and a
     dismissed notice is worse than no notice: it costs him a tap AND still
     lets the real one through. */

  it('says nothing when the file matches the session exactly', () => {
    const c = ch({
      hitPoints: { max: 67, current: 30 },
      spellSlots: { 1: { max: 4, current: 2 } },
      paladinResources: {
        layOnHands: { max: 35, current: 30 },
        channelDivinity: { max: 2, current: 1 },
      },
    })
    expect(findSessionRollback(c, c)).toEqual([])
  })

  it('says nothing when the incoming file is FURTHER SPENT than the session', () => {
    // He played on his phone, exported, and is importing that later state onto
    // a stale tab. Nothing is being handed back — this is what import is for.
    const live = ch({ spellSlots: { 1: { max: 4, current: 4 } } })
    const incoming = ch({ spellSlots: { 1: { max: 4, current: 1 } } })
    expect(findSessionRollback(live, incoming)).toEqual([])
  })

  it('says nothing about a pool the live session has never heard of', () => {
    // A brand-new homebrew pool arriving full is an addition, not a refill.
    const incoming = ch({
      resourcePools: [{ id: 'new', name: 'Tide Marks', max: 3, current: 3, unit: 'uses', recharge: 'longRest' }],
    })
    expect(findSessionRollback(ch({}), incoming)).toEqual([])
  })

  it('says nothing when neither side has paladin resources', () => {
    expect(findSessionRollback(ch({}), ch({}))).toEqual([])
  })

  it('does not crash when the incoming file is an old thin export', () => {
    // THIN, from import-character.test.ts: no spellSlots, no pools, no paladin.
    const live = ch({
      hitPoints: { max: 67, current: 22 },
      spellSlots: { 1: { max: 4, current: 0 } },
      paladinResources: {
        layOnHands: { max: 35, current: 0 },
        channelDivinity: { max: 2, current: 0 },
      },
    })
    const thin = { name: 'Testwright', hitPoints: { max: 67, current: 67 } } as unknown as Character
    expect(() => findSessionRollback(live, thin)).not.toThrow()
    // The one thing a thin file CAN take back is hit points, and it should say so.
    expect(findSessionRollback(live, thin).map(e => e.label)).toEqual(['Hit points'])
  })
})

describe('describeRollback', () => {
  it('is empty for an empty list, so the caller can test the string', () => {
    expect(describeRollback([])).toBe('')
  })

  it('reads as a sentence, not a diff', () => {
    expect(describeRollback([{ label: 'Lay on Hands', from: 30, to: 35 }]))
      .toBe('Lay on Hands 30 → 35')
    expect(describeRollback([
      { label: 'Lay on Hands', from: 30, to: 35 },
      { label: 'Channel Divinity', from: 0, to: 2 },
    ])).toBe('Lay on Hands 30 → 35 and Channel Divinity 0 → 2')
    expect(describeRollback([
      { label: 'Hit points', from: 40, to: 67 },
      { label: '1st-level spell slots', from: 2, to: 4 },
      { label: 'Lay on Hands', from: 5, to: 35 },
    ])).toBe('Hit points 40 → 67, 1st-level spell slots 2 → 4 and Lay on Hands 5 → 35')
  })
})
