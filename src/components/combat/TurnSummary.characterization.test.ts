// ---------------------------------------------------------------------------
// Phase-0 characterization — what the prototype does TODAY
// ---------------------------------------------------------------------------
//
// Slice 2.  These seven tests do not say what the turn composer SHOULD do.
// They say what Marcus's working app already does, for the seeded Nix state,
// bugs included — and they pass against code that was not changed to make them
// pass.  categorizeTurnOptions() is the body of TurnSummary's useMemo, lifted
// out of the component without altering a single line of it.
//
// This is the slice that makes the working prototype count.  From here it is a
// specification with teeth: Slice 4 replaces this logic with
// src/lib/turn/compose.ts, and any behaviour that quietly changes on the way
// out will break one of these before it ever reaches the table.
//
// Two of these tests pin behaviour that is arguably WRONG (marked BUG).  They
// are pinned anyway.  A characterization test that only records the parts you
// like is not a safety net — it is an opinion.  When Slice 4 fixes one of
// them, the fix is a deliberate edit to the assertion with a reason attached,
// which is exactly the conversation that should happen.

// SLICE 8c, 2026-09-05 — this import was re-pointed, and nothing else changed.
// It used to read `from './TurnSummary'`, which re-exports the function it does
// not own: `TurnSummary.tsx:54` imports `categorizeTurnOptions` out of
// `lib/turn/options.ts` and passes it straight back out again at line 90. So
// the old path routed a pure-function test through a 951-line component that
// the app does not mount, and made a dead file look alive to the compiler.
// Same function, same bytes, one hop fewer — the assertions below are untouched.

import { describe, it, expect } from 'vitest'
import { categorizeTurnOptions, type ActionOption } from '../../lib/turn/options'
import { NIX } from '../../lib/turn/fixtures/nix'

const names = (opts: ActionOption[]) => opts.map(o => o.name)
const byName = (opts: ActionOption[], name: string) => {
  const hit = opts.find(o => o.name === name)
  if (!hit) throw new Error(`expected an option named "${name}", got: ${names(opts).join(', ')}`)
  return hit
}

describe('Phase-0: categorizeTurnOptions(Nix)', () => {
  // 1 ────────────────────────────────────────────────────────────────────────
  it('turns every weapon into an Action, and composes the mechanics line', () => {
    const { actions } = categorizeTurnOptions(NIX)

    // STR 16 (+3) + proficiency 3 + magic 1 = +7 to hit; damage 1d8 +3 +1.
    const hearthbrand = byName(actions, 'Hearthbrand')
    expect(hearthbrand.type).toBe('weapon')
    expect(hearthbrand.actionEconomy).toBe('action')
    expect(hearthbrand.mechanicsLine).toBe(
      '+7 to hit (STR +3 + prof +1 magic) · 1d8+4 Slashing · 5 ft',
    )
    expect(hearthbrand.effectsLine).toBe('Magical · Mastery: Sap · Versatile (1d10)')
    expect(hearthbrand.rollNotation).toBe('1d20+7')
    expect(hearthbrand.rollLabel).toBe('Hearthbrand Attack')
    expect(hearthbrand.strategicTip).toBe('Banked Coals (On hit): Deal 1d4 fire damage')

    // The plain weapon reaches every fallback: no range segment, and the
    // 'Standard attack' effects line when nothing decorates it.
    const javelin = byName(actions, 'Javelin')
    expect(javelin.mechanicsLine).toBe('+6 to hit (STR +3 + prof) · 1d6+3 Piercing')
    expect(javelin.effectsLine).toBe('Standard attack')
    expect(javelin.summary).toBe('Ranged weapon attack with no special properties.')
    expect(javelin.strategicTip).toBeUndefined()
  })

  // 2 ────────────────────────────────────────────────────────────────────────
  it('drops unprepared spells, and levelled spells with no slot available', () => {
    const all = categorizeTurnOptions(NIX)
    const everything = [...all.actions, ...all.bonusActions, ...all.reactions, ...all.passives]

    // Known but not prepared.
    expect(names(everything)).not.toContain('Bless')

    // Prepared, but a Paladin 8 has no 3rd-level slot tier at all, so
    // character.spellSlots[3] is undefined and the option is skipped.
    expect(names(everything)).not.toContain('Fireball')

    // A cantrip skips the slot check entirely and is always offered.
    expect(names(all.actions)).toContain('Sacred Flame')
    expect(byName(all.actions, 'Sacred Flame').spellLevel).toBe(0)

    // Levelled spells with slots remaining survive (1st: 3 left, 2nd: 2 left).
    expect(names(all.bonusActions)).toContain('Divine Smite')
    expect(names(all.bonusActions)).toContain('Misty Step')

    // BOUNDARY: a tier that exists but is spent. This is the ordinary
    // late-in-the-day state — the tier is still in spellSlots, current is 0 —
    // and it must behave like the missing tier, not like an available one.
    // Nix's own fixture never reaches 0 in a tier, so it is exercised here.
    const outOfFirsts = { ...NIX, spellSlots: { 1: { max: 4, current: 0 }, 2: { max: 3, current: 2 } } }
    const spent = categorizeTurnOptions(outOfFirsts)
    const spentAll = names([...spent.actions, ...spent.bonusActions, ...spent.reactions])
    expect(spentAll).not.toContain('Divine Smite')     // 1st, no slots left
    expect(spentAll).not.toContain('Cure Wounds')      // 1st, no slots left
    expect(spentAll).not.toContain('Shield of Faith')  // 1st, no slots left
    expect(spentAll).toContain('Misty Step')           // 2nd, 2 left
    expect(spentAll).toContain('Sacred Flame')         // cantrip, never checked
  })

  // 3 ────────────────────────────────────────────────────────────────────────
  it('buckets spells by casting time, not by level or class', () => {
    const { actions, bonusActions, reactions } = categorizeTurnOptions(NIX)

    // D&D 2024: both Divine Smite and Misty Step want the bonus action. This
    // is the raw material for the mutex that Slice 5 builds — today they are
    // simply two entries in the same list with no relationship expressed.
    expect(names(bonusActions)).toEqual(
      expect.arrayContaining(['Divine Smite', 'Shield of Faith', 'Misty Step']),
    )
    expect(names(actions)).toEqual(
      expect.arrayContaining(['Sacred Flame', 'Cure Wounds', 'Warding Bond']),
    )
    expect(names(reactions)).not.toContain('Cure Wounds')

    // Concentration and ritual ride along on the option.
    expect(byName(bonusActions, 'Shield of Faith').isConcentration).toBe(true)
    expect(byName(bonusActions, 'Divine Smite').isConcentration).toBe(false)

    // A spell's own tactical note becomes the strategic tip verbatim.
    expect(byName(bonusActions, 'Divine Smite').strategicTip).toBe(
      'Wait for a hit before spending the slot.',
    )
  })

  // 4 ────────────────────────────────────────────────────────────────────────
  it('drops features above the character level, and features with no uses left', () => {
    const all = categorizeTurnOptions(NIX)
    const everything = [...all.actions, ...all.bonusActions, ...all.reactions, ...all.passives]

    // Nix is level 8.
    expect(names(everything)).not.toContain('Smoldering Smite')  // level 15
    expect(names(everything)).not.toContain('Hearth Warden')     // level 20

    // 0 of 4 uses left.
    expect(names(everything)).not.toContain('Divine Sense')

    // Homebrew is not treated differently from anything else — the subclass
    // Marcus wrote appears on the same footing as the PHB class features.
    expect(names(all.bonusActions)).toContain('Hearthfire Manifest')
    expect(names(all.reactions)).toContain('Flaming Cloak')

    // BOUNDARY: the filter is `feature.level > character.level`, so a feature
    // gained at exactly this level is KEPT. Nix has no level-8 feature, so the
    // boundary would otherwise go unpinned — and an off-by-one here means the
    // ability you levelled up for is the one that does not show up.
    const justGained = {
      ...NIX,
      features: [
        { name: 'Hearthlight', level: 8, description: 'Newly gained.', actionType: 'action' as const },
        { name: 'Not Yet', level: 9, description: 'Next level.', actionType: 'action' as const },
      ],
    }
    const gained = categorizeTurnOptions(justGained)
    expect(names(gained.actions)).toContain('Hearthlight')
    expect(names(gained.actions)).not.toContain('Not Yet')
  })

  // 5 ────────────────────────────────────────────────────────────────────────
  it('routes passives out of the action lists, and now believes a declaration', () => {
    const { passives, bonusActions } = categorizeTurnOptions(NIX)

    expect(names(passives)).toEqual(
      expect.arrayContaining(['Aura of Protection', 'Aura of Solace']),
    )
    expect(names(bonusActions)).not.toContain('Aura of Protection')

    // FIXED IN SLICE 6C — this assertion is INVERTED from what it pinned, and
    // the inversion is the point of the change.
    //
    // What it used to pin, as a bug it recorded rather than endorsed: the
    // passive test ended in `|| feature.name.toLowerCase().includes('aura')`,
    // unconditionally, so ANY feature with "aura" in its name was filed as a
    // passive EVEN WHEN it explicitly declared itself a Bonus Action — and it
    // then vanished from the turn with no message and nothing to tap. The
    // pinned note ended "Slice 6c is where this gets fixed."
    //
    // It is fixed: a declared actionType now wins over the name. The sniff
    // survives only as a fallback for features that declare NOTHING, which is
    // how Nix's own auras used to be saved, so his four lines above are
    // unchanged. Found by `turn/openworld.test.ts` driving a character with an
    // "Undertow Aura" its author declared an Action.
    const withAuraNamedAction = {
      ...NIX,
      features: [
        {
          name: 'Aura of Embers',
          level: 3,
          description: 'Ignite your aura.',
          actionType: 'bonusAction' as const,
        },
      ],
    }
    const trap = categorizeTurnOptions(withAuraNamedAction)
    expect(names(trap.bonusActions)).toContain('Aura of Embers')
    expect(names(trap.passives)).not.toContain('Aura of Embers')

    // The fallback still holds, and this is the half that protects Marcus's
    // existing sheet: no actionType at all, so the name is all there is.
    const undeclared = {
      ...NIX,
      features: [{ name: 'Aura of Embers', level: 3, description: 'Ignite your aura.' }],
    }
    const guessed = categorizeTurnOptions(undeclared)
    expect(names(guessed.passives)).toContain('Aura of Embers')
    expect(names(guessed.actions)).not.toContain('Aura of Embers')
  })

  // 6 ────────────────────────────────────────────────────────────────────────
  it('formats limited-use features with their remaining uses and recharge', () => {
    const { bonusActions } = categorizeTurnOptions(NIX)

    const layOnHands = byName(bonusActions, 'Lay on Hands')
    expect(layOnHands.type).toBe('feature')
    expect(layOnHands.usesRemaining).toBe('15/40')
    expect(layOnHands.effectsLine).toBe('Touch · 15/40 uses · recharges on long rest')

    // BUG (pinned, not endorsed): a 40-point healing POOL is described with
    // the same "uses" vocabulary as a 2-use Channel Divinity. At the table
    // "15/40 uses" reads as forty separate castings. Slice 6 gives pools
    // their own noun.
    const sacredWeapon = byName(bonusActions, 'Channel Divinity: Sacred Weapon')
    expect(sacredWeapon.effectsLine).toBe('1 minute · 1/2 uses · recharges on short rest')

    // A feature with no uses cap falls through to 'At will'.
    expect(byName(bonusActions, 'Hearthfire Manifest').effectsLine).toBe('30 feet')
    expect(byName(bonusActions, 'Hearthfire Manifest').usesRemaining).toBeUndefined()
  })

  // 7 ────────────────────────────────────────────────────────────────────────
  it('is a complete, non-overlapping census of the seeded state', () => {
    const { actions, bonusActions, reactions, passives } = categorizeTurnOptions(NIX)
    const everything = [...actions, ...bonusActions, ...reactions, ...passives]

    // Nothing is offered in two places at once.
    expect(new Set(names(everything)).size).toBe(everything.length)

    // The exact census of today. If a later slice adds or loses an option for
    // this state, this number moves and someone has to say why.
    //   actions      2 weapons + Sacred Flame + Cure Wounds + Warding Bond   = 5
    //   bonusActions Divine Smite, Shield of Faith, Misty Step,
    //                Lay on Hands, Channel Divinity, Hearthfire Manifest     = 6
    //   reactions    Flaming Cloak                                           = 1
    //   passives     Aura of Protection, Aura of Solace                      = 2
    expect(names(actions).sort()).toEqual(
      ['Cure Wounds', 'Hearthbrand', 'Javelin', 'Sacred Flame', 'Warding Bond'],
    )
    expect(names(bonusActions).sort()).toEqual([
      'Channel Divinity: Sacred Weapon',
      'Divine Smite',
      'Hearthfire Manifest',
      'Lay on Hands',
      'Misty Step',
      'Shield of Faith',
    ])
    expect(names(reactions)).toEqual(['Flaming Cloak'])
    expect(names(passives).sort()).toEqual(['Aura of Protection', 'Aura of Solace'])
    expect(everything).toHaveLength(14)

    // Pure: same input, same answer, no hidden state.
    expect(categorizeTurnOptions(NIX)).toEqual(categorizeTurnOptions(NIX))
  })
})
