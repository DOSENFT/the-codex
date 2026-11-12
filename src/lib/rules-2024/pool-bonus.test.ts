// DM-granted pool bonuses: Nix's brazier blessing (session "Rings of the Divine
// Foundry", 2026-11) gave him a third Channel Divinity use at level 8, where the
// class table says 2. Before `poolBonuses`, `applyPoolMaxima` clamped the gift
// straight back to 2 on every load, so the sheet silently lied at the table.
import { describe, expect, it } from 'vitest'
import type { Character, CharacterBase } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { resolveCharacter, storableOf } from './derive'
import { poolsOf } from './resources'
import { MAX_POOL_BONUS, poolBonusFor, poolMaxFor } from './pools'

function at(level: number, over: Partial<CharacterBase> = {}): Character {
  return resolveCharacter({
    ...storableOf(NIX),
    level,
    paladinResources: {
      layOnHands: { max: 35, current: 35 },
      channelDivinity: { max: 2, current: 2 },
      auraRange: 10,
    },
    ...over,
  })
}

function cdMax(sheet: Character): number | undefined {
  return poolsOf(sheet).find(p => p.id === 'channel-divinity')?.max
}

describe('poolBonuses — a DM gift the class table does not know about', () => {
  it('canon alone gives a level 8 paladin 2 Channel Divinity uses', () => {
    expect(poolMaxFor('channel-divinity', 'Paladin', 8)).toBe(2)
    expect(cdMax(at(8))).toBe(2)
  })

  it('a +1 bonus makes it 3, and the bonus survives a level change', () => {
    const bonus = { poolBonuses: { 'channel-divinity': 1 } }
    expect(cdMax(at(8, bonus))).toBe(3)
    // Level 11 is where canon itself goes to 3; the gift stacks on top.
    expect(cdMax(at(11, bonus))).toBe(4)
  })

  it('Lay on Hands is still 5 x level with no bonus', () => {
    const loh = poolsOf(at(8)).find(p => p.id === 'lay-on-hands')
    expect(loh?.max).toBe(40)
  })

  it('raising the max is not a refill: spent uses stay spent', () => {
    const sheet = at(8, {
      poolBonuses: { 'channel-divinity': 1 },
      paladinResources: {
        layOnHands: { max: 35, current: 10 },
        channelDivinity: { max: 2, current: 1 },
        auraRange: 10,
      },
    })
    const cd = poolsOf(sheet).find(p => p.id === 'channel-divinity')
    expect(cd?.max).toBe(3)
    expect(cd?.current).toBe(1)
  })

  it('also reaches a Channel Divinity counter stored as a feature', () => {
    const sheet = resolveCharacter({
      ...storableOf(NIX),
      level: 8,
      paladinResources: undefined,
      poolBonuses: { 'channel-divinity': 1 },
      features: [
        { name: 'Channel Divinity', level: 3, description: 'x', usesMax: 2, usesCurrent: 2, usesPerRest: 'short' },
      ],
    })
    expect(sheet.features.find(f => f.name === 'Channel Divinity')?.usesMax).toBe(3)
  })

  describe('garbage in a hand-edited file is ignored, never trusted', () => {
    const bad: unknown[] = [0, -1, 1.5, MAX_POOL_BONUS + 1, 30, '1', null, NaN, Infinity]
    for (const value of bad) {
      it(`ignores ${String(value)}`, () => {
        const bonuses = { 'channel-divinity': value } as CharacterBase['poolBonuses']
        expect(poolBonusFor(bonuses, 'channel-divinity')).toBe(0)
        expect(cdMax(at(8, { poolBonuses: bonuses }))).toBe(2)
      })
    }
    it('ignores a missing bonuses object', () => {
      expect(poolBonusFor(undefined, 'channel-divinity')).toBe(0)
    })
  })
})
