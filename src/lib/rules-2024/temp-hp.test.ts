// The decision half of canon HEARTH-04, tested on its own.
//
// None of these can pass against slice 10c's code: `tempHPReplacement` did not
// exist, `Character.tempHPSource` did not exist, and `setTempHP` took two
// arguments. The behaviour they pin is the thing VAL-06 was pinned as VIOLATED
// for — `setTempHP(11 → 5)` yielding 5 with nobody asked.
import { describe, expect, it } from 'vitest'
import { setTempHP, applyDamage, type Character } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { replacementWarning, tempHPReplacement } from './temp-hp'

const cloaked = (amount = 11, source: string | null = 'Flaming Cloak'): Character => ({
  ...NIX,
  tempHP: amount,
  tempHPSource: source,
})

describe('tempHPReplacement — when there is something to lose', () => {
  it('reports the pool that would be destroyed, and names it when the app knows', () => {
    const r = tempHPReplacement(cloaked(), 5, 'Heroism')
    expect(r).not.toBeNull()
    expect(r!.losing).toBe(11)
    expect(r!.source).toBe('Flaming Cloak')
    expect(r!.incoming).toBe(5)
  })

  it('says the app does not know, rather than guessing, for a hand-typed pool', () => {
    // The HP tracker's temp field cannot know where a number came from. Naming
    // the wrong feature would be worse than naming none.
    const r = tempHPReplacement(cloaked(11, null), 5)
    expect(r!.source).toBeNull()
    expect(replacementWarning(r!)).toContain('the 11 temporary hit points you already have')
    expect(replacementWarning(r!)).not.toMatch(/cloak/i)
  })

  it('flags the strictly-worse trade WITHOUT vetoing it', () => {
    // 2024 gives the player the choice on purpose: a smaller pool from a source
    // with a better duration is a real decision.
    expect(tempHPReplacement(cloaked(), 5)!.smaller).toBe(true)
    expect(tempHPReplacement(cloaked(), 20)!.smaller).toBe(false)
  })

  it('warns about a LARGER incoming pool too — replacement is not about size', () => {
    // The cloak "lasts until the Temporary Hit Points are depleted", so a bigger
    // pool from elsewhere still ends it. This is the case a naive
    // "only warn if it is worse" guard would miss.
    const r = tempHPReplacement(cloaked(), 20, 'Inspiring Leader')
    expect(r).not.toBeNull()
    expect(replacementWarning(r!)).toContain('Accepting 20 replaces your Flaming Cloak pool (11)')
  })
})

describe('tempHPReplacement — when a prompt would be noise', () => {
  it('is silent when there is no live pool', () => {
    expect(tempHPReplacement({ ...NIX, tempHP: 0 }, 11, 'Flaming Cloak')).toBeNull()
  })

  it('is silent for a non-grant', () => {
    expect(tempHPReplacement(cloaked(), 0)).toBeNull()
    expect(tempHPReplacement(cloaked(), -3)).toBeNull()
    expect(tempHPReplacement(cloaked(), Number.NaN)).toBeNull()
  })

  it('is silent when the same source re-applies the same pool', () => {
    // Re-cloaking at the same level is the cloak being refreshed by the cloak,
    // not a decision between two pools.
    expect(tempHPReplacement(cloaked(), 11, 'Flaming Cloak')).toBeNull()
  })

  it('still warns when the SAME source offers a DIFFERENT number', () => {
    expect(tempHPReplacement(cloaked(), 12, 'Flaming Cloak')).not.toBeNull()
  })

  it('still warns when a DIFFERENT source happens to offer the same number', () => {
    const r = tempHPReplacement(cloaked(), 11, 'Heroism')
    expect(r).not.toBeNull()
    expect(r!.source).toBe('Flaming Cloak')
  })
})

describe('setTempHP — one writer for the number AND its label', () => {
  it('records what granted the pool', () => {
    const after = setTempHP(NIX, 11, 'Flaming Cloak')
    expect(after.tempHP).toBe(11)
    expect(after.tempHPSource).toBe('Flaming Cloak')
  })

  it('defaults to "the app does not know" rather than inventing a source', () => {
    expect(setTempHP(NIX, 7).tempHPSource).toBeNull()
  })

  it('clears the label whenever the pool reaches 0', () => {
    // A dead pool must not keep naming a cloak that has ended. This is why the
    // label lives beside the number instead of in a separate "cloak active"
    // flag that could drift out of step with it.
    const dropped = setTempHP(cloaked(), 0)
    expect(dropped.tempHP).toBe(0)
    expect(dropped.tempHPSource).toBeNull()
    expect(setTempHP(cloaked(), -4).tempHPSource).toBeNull()
  })

  it('is still the blind setter — it decides nothing', () => {
    // Deliberate. A setter that silently refused would leave every caller unable
    // to tell "refused" from "applied". The asking belongs to the surfaces that
    // can reach a human.
    expect(setTempHP(cloaked(), 5).tempHP).toBe(5)
  })
})

describe('applyDamage — the cloak ends when the pool is eaten', () => {
  it('clears the label when damage depletes the pool', () => {
    const after = applyDamage(cloaked(), 11)
    expect(after.tempHP).toBe(0)
    expect(after.tempHPSource).toBeNull()
  })

  it('keeps the label while any of the pool survives', () => {
    const after = applyDamage(cloaked(), 4)
    expect(after.tempHP).toBe(7)
    expect(after.tempHPSource).toBe('Flaming Cloak')
  })

  it('spills the remainder into hit points, unchanged from before this slice', () => {
    const after = applyDamage(cloaked(), 15)
    expect(after.tempHP).toBe(0)
    expect(after.hitPoints.current).toBe(NIX.hitPoints.current - 4)
  })
})
