// ---------------------------------------------------------------------------
// rules-2024/mastery — the riders nobody remembers correctly
// ---------------------------------------------------------------------------
//
// The whole file exists for one asymmetry, and so does this suite: Sap and Vex
// look like a matched pair and are different in two independent ways.
//
//     Sap   fires on a HIT, expires at the START of your next turn
//     Vex   fires on DAMAGE, expires at the END   of your next turn
//
// Both differences are pinned below, separately, so that fixing one cannot
// silently break the other.

import { describe, it, expect } from 'vitest'
import type { Weapon } from '../character'
import { NIX } from '../turn/fixtures/nix'
import { allRiders, coerceMastery, masteryForWeaponName, riderFor } from './mastery'

const weapon = (over: Partial<Weapon> = {}): Weapon => ({
  name: 'Longsword',
  attackType: 'melee',
  abilityMod: 'STR',
  proficient: true,
  damageDice: '1d8',
  damageType: 'Slashing',
  properties: [],
  ...over,
})

describe('riderFor', () => {
  it('Longsword yields the Sap rider', () => {
    const rider = riderFor(weapon())
    expect(rider?.property).toBe('Sap')
    expect(rider?.text).toContain('disadvantage')
  })

  it('Sap and Vex are automatic; Topple is the only rider carrying a save', () => {
    const withSave = allRiders().filter(r => r.save !== undefined)
    expect(withSave.map(r => r.property)).toEqual(['Topple'])
    expect(withSave[0].automatic).toBe(false)
    expect(withSave[0].save).toEqual({ ability: 'CON', dc: 'weaponAttackDC' })

    for (const p of ['Sap', 'Vex'] as const) {
      const rider = allRiders().find(r => r.property === p)
      expect(rider?.automatic).toBe(true)
      expect(rider?.save).toBeUndefined()
    }
  })

  it('Sap expires at the START of your next turn; Vex at the END of it', () => {
    // Gate 3 wrote this down as "end of the TARGET's next turn" and was wrong.
    // Both windows are keyed to YOUR turn, and Vex's strictly contains Sap's:
    // get them the same way round and the app promises advantage that expired
    // a turn ago. This is the assertion the slice was worth writing for.
    const sap = riderFor(weapon({ masteryProperty: 'Sap' }))
    const vex = riderFor(weapon({ name: 'Shortsword' }))
    expect(sap?.expires).toBe('startOfYourNextTurn')
    expect(vex?.expires).toBe('endOfYourNextTurn')
    expect(sap?.expires).not.toBe(vex?.expires)
  })

  it('Vex requires the hit to deal damage; Sap does not', () => {
    // The second difference between them, independent of expiry. A Sap hit
    // absorbed entirely by resistance-to-zero still saps.
    expect(riderFor(weapon({ masteryProperty: 'Sap' }))?.trigger).toBe('onHit')
    expect(riderFor(weapon({ masteryProperty: 'Vex' }))?.trigger).toBe('onHitDealingDamage')
    expect(riderFor(weapon({ masteryProperty: 'Graze' }))?.trigger).toBe('onMiss')
  })

  it("prefers the weapon's own declared mastery over the standard table", () => {
    // Homebrew is the main case. Marcus can hand a Longsword the Topple
    // mastery and the app believes him — the name table is only a fallback for
    // weapons saved before this file existed.
    expect(riderFor(weapon({ name: 'Longsword' }))?.property).toBe('Sap')
    expect(riderFor(weapon({ name: 'Longsword', masteryProperty: 'Topple' }))?.property).toBe('Topple')
  })

  it('gives a homebrew weapon its declared rider, and nothing to a nameless one', () => {
    // Hearthbrand is not in any table. It declares Sap and gets Sap.
    expect(riderFor(NIX.weapons[0])?.property).toBe('Sap')
    // Javelin is a real 2024 weapon with no masteryProperty saved — the table
    // fills it in. This is every character saved before today.
    expect(riderFor(NIX.weapons[1])?.property).toBe('Slow')
    // Homebrew name, no declaration: no rider, and no invention.
    expect(riderFor(weapon({ name: 'Sunder-Ash' }))).toBeNull()
  })
})

describe('coerceMastery', () => {
  it('returns null for an unrecognised free-text value and does not throw', () => {
    // masteryProperty is a hand-typed string on saved characters. A typo in
    // one weapon must not be able to take down the turn screen mid-combat.
    for (const bad of ['', '   ', 'Sapp', 'disadvantage', 'null', '🔥']) {
      expect(coerceMastery(bad)).toBeNull()
    }
    expect(coerceMastery(undefined)).toBeNull()
    expect(coerceMastery(null)).toBeNull()
    expect(coerceMastery(42 as unknown as string)).toBeNull()
  })

  it('accepts the casings and prefixes that exist in the wild', () => {
    expect(coerceMastery('Sap')).toBe('Sap')
    expect(coerceMastery('sap ')).toBe('Sap')
    expect(coerceMastery('  VEX')).toBe('Vex')
    expect(coerceMastery('Mastery: Topple')).toBe('Topple')
  })
})

describe('the 2024 weapon table', () => {
  it('knows the eight masteries and no more', () => {
    expect(allRiders()).toHaveLength(8)
    expect(allRiders().map(r => r.property).sort()).toEqual(
      ['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'],
    )
  })

  it('maps the weapons most likely to reach this table', () => {
    expect(masteryForWeaponName('greatsword')).toBe('Graze')
    expect(masteryForWeaponName('Rapier')).toBe('Vex')
    expect(masteryForWeaponName(' dagger ')).toBe('Nick')
    expect(masteryForWeaponName('greataxe')).toBe('Cleave')
    expect(masteryForWeaponName('Warhammer')).toBe('Push')
    expect(masteryForWeaponName('Hearthbrand')).toBeNull()
    expect(masteryForWeaponName(undefined)).toBeNull()
  })

  it('every rider is renderable at the table even when it is not automatic', () => {
    // The engine may fail to automate a rider. It must never fail to say what
    // the rider does — silently dropping the words is the failure mode this
    // whole layer is built to prevent.
    for (const rider of allRiders()) {
      expect(rider.text.length).toBeGreaterThan(10)
      expect(rider.text).not.toContain('undefined')
    }
  })
})
