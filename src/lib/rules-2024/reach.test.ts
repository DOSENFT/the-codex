/* Reach — Combat Open Book slice 6.
 *
 * Four sections:
 *
 *   1  the two moved functions, still answering exactly what they answered in
 *      `toybox-seed/profile.ts` — the move's whole claim
 *   2  `reachFor`: when it speaks, and the three ways it stays silent
 *   3  the list is real — every name resolves to something the app can show
 *   4  the disagreement between band 1 and band 2, asserted on purpose
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REACH_EXTENDED, primaryWeapon, reachFor, weaponReach } from './reach'
import { primaryWeapon as reExported, weaponReach as reExportedReach } from '../toybox-seed/profile'
import { resolveCharacter } from './derive'
import { canonBands } from '../canon/bands'
import { featByName, spellByName, featureByName } from '../canon/lookup'
import { NIX } from '../turn/fixtures/nix'
import { BASIC_ACTIONS, BONUS_ACTIONS, REACTIONS } from '../dnd-data'
import type { Character, Weapon } from '../character'

/** THE DAWN GUARDIAN, transcribed from his own export
 *  `codex-nix-lvl7 (2) (1).json` — the same transcription
 *  `pack-hearth-7-r2.test.ts:58-68` carries, rebuilt here rather than imported,
 *  because importing a fixture out of another suite's test file couples two
 *  regression nets that are supposed to be able to fail independently.
 *
 *  `properties` is the load-bearing part: `Reach` is a real string on his real
 *  sheet, not something this test invented to make its own assertions pass. */
const DAWN_GUARDIAN: Weapon = {
  ...NIX.weapons[0]!,
  name: 'The Dawn Guardian',
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach', 'Graze'],
  range: '10 ft',
  magical: true,
}

/** A plain magical melee weapon. No Reach, no long range — the control. */
const LONGSWORD: Weapon = {
  ...NIX.weapons[0]!,
  name: 'Longsword',
  properties: ['Versatile (1d10)'],
  range: '5 ft',
  magical: true,
}

function wielding(...weapons: Weapon[]): Character {
  return resolveCharacter({ ...NIX, weapons } as never) as Character
}

const GLAIVE = wielding(DAWN_GUARDIAN)
const SWORD = wielding(LONGSWORD)
const ARCHER = wielding(...NIX.weapons.filter(w => w.attackType === 'ranged'))

// ── 1 · the move changed nothing ────────────────────────────────────────────
describe('the two functions that moved', () => {
  it('is literally the same function the Toybox has been calling', () => {
    // Not "behaves the same" — the same object. A re-export that had quietly
    // become a copy would pass every behavioural test below and still be two
    // answers to "which weapon does he mean".
    expect(reExported).toBe(primaryWeapon)
    expect(reExportedReach).toBe(weaponReach)
  })

  it('reads reach from the property first, then the stated range, then five', () => {
    // `profile.test.ts:112-114`, re-asserted from the new module's own door.
    expect(
      weaponReach({ ...NIX.weapons[0]!, properties: ['Reach'], range: '5 ft' }),
      'a data slip in `range` must not shorten a glaive',
    ).toBe(10)
    expect(weaponReach({ ...NIX.weapons[0]!, properties: [], range: '15 ft' })).toBe(15)
    expect(weaponReach({ ...NIX.weapons[0]!, properties: [], range: undefined })).toBe(5)
  })

  it('prefers a magical melee weapon, and never reaches for a bow', () => {
    expect(primaryWeapon(GLAIVE)?.name).toBe('The Dawn Guardian')
    expect(primaryWeapon(ARCHER)).toBeNull()
  })
})

// ── 2 · reachFor ────────────────────────────────────────────────────────────
describe('reachFor', () => {
  it('gives Sentinel his ten feet, and names the item that granted them', () => {
    expect(reachFor('Sentinel', GLAIVE)).toEqual({ feet: 10, source: 'The Dawn Guardian' })
  })

  it('gives Interception the same, which is the ruling his DM confirmed', () => {
    // "Interception is 10ft with the Glaive doing the blocking where the shield
    // would have." — Marcus, 2026-09-08.
    expect(reachFor('Interception', GLAIVE)).toEqual({ feet: 10, source: 'The Dawn Guardian' })
  })

  it('says nothing at all for the same feats on a longsword — NOT "5 ft"', () => {
    // The distinction the whole null contract exists for. `{feet: 5}` would put
    // a row on the card that he reads to learn nothing.
    expect(reachFor('Sentinel', SWORD)).toBeNull()
    expect(reachFor('Interception', SWORD)).toBeNull()
  })

  it('says nothing for an ability whose distance does not follow the weapon', () => {
    // Cure Wounds is Touch and stays Touch. A glaive does not extend a spell.
    expect(reachFor('Cure Wounds', GLAIVE)).toBeNull()
    expect(reachFor('Sacred Flame', GLAIVE)).toBeNull()
    expect(reachFor('Lay on Hands', GLAIVE)).toBeNull()
  })

  it('says nothing for a character carrying no melee weapon at all', () => {
    expect(reachFor('Sentinel', ARCHER)).toBeNull()
  })

  it('matches the name case-insensitively but not fuzzily', () => {
    expect(reachFor('sentinel', GLAIVE)).not.toBeNull()
    expect(reachFor('  Sentinel  ', GLAIVE)).not.toBeNull()
    // A near miss is a miss. Silently extending "Sentinel Shield" would be the
    // regex-widening this list exists to prevent.
    expect(reachFor('Sentinel Shield', GLAIVE)).toBeNull()
  })
})

// ── 3 · the list points at real things ──────────────────────────────────────
describe('REACH_EXTENDED names things that exist', () => {
  it('resolves every entry to a canon record or a synthetic option', () => {
    const synthetic = new Set(
      [...BASIC_ACTIONS, ...BONUS_ACTIONS, ...REACTIONS].map(o => o.name),
    )
    const missing = REACH_EXTENDED.filter(
      name =>
        !featByName(name) && !spellByName(name) && !featureByName(name) && !synthetic.has(name),
    )
    // A typo here ships as an entry that silently never fires — the failure
    // mode that looks exactly like "the feature works, this one just doesn't
    // apply".
    expect(missing).toEqual([])
  })

  it('is short, and every entry is accounted for in the file that holds it', () => {
    /* Three, and the header says which one is RAW and which two are Marcus's
       table ruling. If someone adds a fourth without a line saying which it is,
       this goes red — because the reason the list is trustworthy is that it is
       small enough to read, and the DM can only argue with a ruling he can
       find. */
    expect(REACH_EXTENDED).toEqual(['Opportunity Attack', 'Sentinel', 'Interception'])
    const source = readFileSync('src/lib/rules-2024/reach.ts', 'utf8')
    expect(source.length, 'read the real file, not an empty one').toBeGreaterThan(1000)
    for (const name of REACH_EXTENDED) {
      expect(source, `${name} has no comment saying whether it is RAW or a ruling`).toContain(name)
    }
    expect(source).toContain('RAW')
    expect(source).toContain('table ruling')
  })
})

// ── 4 · the disagreement, on purpose ────────────────────────────────────────
describe('band 1 and band 2 disagree about Sentinel, deliberately', () => {
  function bandsOf(name: string, character: Character) {
    return canonBands(
      {
        name,
        spell: spellByName(name) ?? null,
        feature: featureByName(name) ?? null,
        feat: featByName(name) ?? null,
        fallbackText: 'the sheet said this',
        fallbackFacts: [{ label: 'Cost', value: 'Reaction' }],
      },
      character,
    )
  }

  it("band 1 says HIS ten feet and names the item; band 2 keeps the book's five", () => {
    const bands = bandsOf('Sentinel', GLAIVE)

    const reach = bands.facts.find(f => f.label === 'Your reach')
    expect(reach, 'Sentinel on a Reach weapon must gain a reach row').toBeDefined()
    expect(reach!.value).toBe('10 ft — The Dawn Guardian')

    /* AND CANON IS NOT EDITED. This is the assertion that makes the ruling
       honest rather than sneaky: the paragraph still says what the book says,
       three lines under a row saying it is ten for him and why. His DM can read
       both and disagree with the second. He cannot do that if the app quietly
       rewrites the first. */
    expect(bands.whatItDoes).toContain('5 feet')
    expect(bands.whatItDoes).not.toContain('10 feet')
  })

  it('and the same card on a longsword has no reach row at all — no empty gap', () => {
    const labels = bandsOf('Sentinel', SWORD).facts.map(f => f.label)
    expect(labels).not.toContain('Your reach')
  })

  it('leaves every other card completely untouched', () => {
    // The regression this slice could most easily cause: a row appearing on 80
    // cards that should have appeared on three.
    for (const name of ['Cure Wounds', 'Sacred Flame', 'Divine Smite']) {
      expect(bandsOf(name, GLAIVE).facts.map(f => f.label)).not.toContain('Your reach')
    }
  })
})
