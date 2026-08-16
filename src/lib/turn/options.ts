// ---------------------------------------------------------------------------
// Turn options — the composition logic, out of the component at last
// ---------------------------------------------------------------------------
//
// Slice 4.  Every line below arrived here by script from
// TurnSummary.tsx:94-376 and is byte-identical to what shipped there — the
// move is proven by a diff of the extracted range, not by a promise.
//
// Why it moved: composeTurn() and the V0.9 TurnSummary must not each own a
// copy of this logic.  Two copies drift, and the drift would be invisible
// precisely because both would be "working".  There is now one implementation,
// and TurnSummary.characterization.test.ts — seven tests written in Slice 2
// against the UNMODIFIED prototype — guards it.  TurnSummary re-exports
// `categorizeTurnOptions` so that suite, and its import path, are untouched.
//
// It is still a record of what the app does TODAY, bugs included.  The two
// bugs Slice 2 pinned (any feature named "Aura…" is filed as a passive; a
// 40-point pool is described as "40 uses") are still here, still pinned, and
// still waiting for the slice that owns each fix.  Do not improve anything in
// this file without changing a pinned assertion and saying why.

import {
  type Character,
  type Spell,
  type ClassFeature,
  abilityModifier,
  attackBonus,
} from '../character'
import {
  type ActionEconomyType,
  spellActionType,
  featureActionType,
} from '../combat-state'
import { getFeatTips } from '../skill-guide'

export interface ActionOption {
  name: string
  type: 'spell' | 'feature' | 'weapon'
  actionEconomy: ActionEconomyType
  // Rich detail fields
  summary: string           // 1-line what it does
  mechanicsLine: string     // dice, mods, DC, range — compact
  effectsLine: string       // what happens on hit/cast
  strategicTip?: string     // quick tactical suggestion
  // Roll data
  rollNotation?: string
  rollLabel?: string
  // Spell-specific
  spellLevel?: number
  isConcentration?: boolean
  isRitual?: boolean
  // Feature-specific
  usesRemaining?: string    // "3/5 uses"

  /** ADDED IN SLICE 4, and never set unless you ask for it.  Populated only
   *  when `includeUnaffordable` is passed: the option is genuinely yours but
   *  you cannot pay for it this instant.  The default path leaves it
   *  undefined, so the objects this builder returns are unchanged. */
  unaffordableReason?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function levelLabel(level: number): string {
  const s: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }
  return s[level] ?? `${level}th`
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** Build a human-readable 1-line summary from a spell's description */
function spellSummary(spell: Spell): string {
  // Use first sentence of description, capped at 80 chars
  const firstSentence = spell.description.split(/\.\s/)[0]
  if (firstSentence.length <= 80) return firstSentence + (firstSentence.endsWith('.') ? '' : '.')
  return firstSentence.slice(0, 77) + '...'
}

/** Build a human-readable 1-line summary from a feature's description */
function featureSummary(feature: ClassFeature): string {
  const firstSentence = feature.description.split(/\.\s/)[0]
  if (firstSentence.length <= 80) return firstSentence + (firstSentence.endsWith('.') ? '' : '.')
  return firstSentence.slice(0, 77) + '...'
}

/** Build the mechanics line: dice, mods, DC, range */
function spellMechanics(spell: Spell, character: Character): string {
  const parts: string[] = []

  if (spell.level > 0) {
    parts.push(levelLabel(spell.level) + '-level')
  } else {
    parts.push('Cantrip')
  }

  if (spell.saveType) {
    parts.push(`DC ${character.spellSaveDC} ${spell.saveType} save`)
  } else if (spell.damageDice) {
    parts.push(`${formatMod(character.spellAttackBonus)} to hit`)
  }

  if (spell.damageDice) {
    parts.push(`${spell.damageDice}${spell.damageType ? ' ' + spell.damageType : ''}`)
  }

  if (spell.range && spell.range !== 'Self') {
    parts.push(spell.range)
  }

  return parts.join(' · ')
}

/** Build the effects line: concentration, duration, components */
function spellEffects(spell: Spell): string {
  const parts: string[] = []

  if (spell.concentration) parts.push('Concentration')
  if (spell.duration && spell.duration !== 'Instantaneous') {
    parts.push(spell.duration)
  } else if (!spell.concentration) {
    parts.push('Instant')
  }
  if (spell.ritual) parts.push('Ritual')
  if (spell.components) parts.push(spell.components)

  return parts.join(' · ')
}

/** Build the effects line for a feature */
function featureEffects(feature: ClassFeature): string {
  const parts: string[] = []
  if (feature.duration) parts.push(feature.duration)
  if (feature.range) parts.push(feature.range)
  if (feature.usesMax !== undefined) {
    parts.push(`${feature.usesCurrent ?? 0}/${feature.usesMax} uses`)
    if (feature.usesPerRest) parts.push(`recharges on ${feature.usesPerRest} rest`)
  }
  return parts.join(' · ') || 'At will'
}

// ---------------------------------------------------------------------------
// Turn composition — Phase 0
// ---------------------------------------------------------------------------
//
// This is the body of TurnSummary's useMemo, lifted out of the component so it
// can be characterized by tests.  The lift was mechanical: every line below is
// byte-identical to what shipped inside the memo apart from two spaces of
// indentation, and the memo now calls this function instead.
//
// It is a record of what the app does TODAY, bugs included.  Slice 4 replaces
// it with src/lib/turn/compose.ts; TurnSummary.characterization.test.ts is the
// net that proves the replacement behaves the same.  Do not improve anything
// here — its whole value is being an exact record.

export interface CategorizedOptions {
  actions: ActionOption[]
  bonusActions: ActionOption[]
  reactions: ActionOption[]
  passives: ActionOption[]
}

/** ADDED IN SLICE 4.  Defaults preserve V0.9 behaviour exactly.
 *
 *  `includeUnaffordable` is the one behaviour switch in this file.  The
 *  prototype DROPS a spell you have no slot for and a feature you have no uses
 *  of — they simply are not on the screen.  D greys them with a reason
 *  instead, because "why can't I smite?" is a question the app should answer
 *  and a vanished option answers nothing.  TurnSummary does not pass this, so
 *  the V0.9 screen is untouched; composeTurn() does. */
export interface BuildOptions {
  includeUnaffordable?: boolean
}

export function categorizeTurnOptions(
  character: Character,
  build: BuildOptions = {},
): CategorizedOptions {
  const actions: ActionOption[] = []
  const bonusActions: ActionOption[] = []
  const reactions: ActionOption[] = []
  const passives: ActionOption[] = []

  // Weapons → action
  for (const weapon of character.weapons) {
    const bonus = attackBonus(character, weapon)
    const abilityName = weapon.abilityMod
    const dmgMod = abilityModifier(character.abilityScores[weapon.abilityMod]) + (weapon.bonusDamage ?? 0)

    // Build mechanics line, including range if present
    const mechanicsParts = [
      `${formatMod(bonus)} to hit (${abilityName} ${formatMod(abilityModifier(character.abilityScores[weapon.abilityMod]))}${weapon.proficient ? ' + prof' : ''}${weapon.bonusToHit ? ` ${formatMod(weapon.bonusToHit)} magic` : ''})`,
      `${weapon.damageDice}${formatMod(dmgMod)} ${weapon.damageType}`,
    ]
    if (weapon.range) {
      mechanicsParts.push(weapon.range)
    }

    // Build effects line, including mastery property
    const effectsParts = [
      weapon.magical ? 'Magical' : null,
      weapon.masteryProperty ? `Mastery: ${weapon.masteryProperty}` : null,
      ...weapon.properties,
    ].filter(Boolean)

    // Build strategic tip from special abilities + feat tips
    const tipParts: string[] = []
    if (weapon.specialAbilities && weapon.specialAbilities.length > 0) {
      tipParts.push(
        weapon.specialAbilities
          .map(a => `${a.name} (${a.trigger}): ${a.effect}`)
          .join(' | ')
      )
    }

    // Merge feat tips for this weapon
    const weaponFeatTips = getFeatTips(character, weapon.name, 'weapon')
    tipParts.push(...weaponFeatTips)

    const strategicTip = tipParts.length > 0 ? tipParts.join(' | ') : undefined

    actions.push({
      name: weapon.name,
      type: 'weapon',
      actionEconomy: 'action',
      summary: `${weapon.attackType === 'melee' ? 'Melee' : 'Ranged'} weapon attack with ${weapon.properties.join(', ') || 'no special properties'}.`,
      mechanicsLine: mechanicsParts.join(' · '),
      effectsLine: effectsParts.join(' · ') || 'Standard attack',
      strategicTip,
      rollNotation: `1d20${bonus >= 0 ? `+${bonus}` : bonus}`,
      rollLabel: `${weapon.name} Attack`,
    })
  }

  // Prepared spells
  const preparedSpells = character.spells.filter(s => s.prepared)
  for (const spell of preparedSpells) {
    // Skip if no slots for leveled spells.
    //
    // The original was `if (!slot || slot.current <= 0) continue`. The two
    // halves are split apart here because they are different facts and Slice 2
    // pinned both: a tier that DOES NOT EXIST (a Paladin 8 has no 3rd) is not
    // yours to cast at any point today and stays dropped; a tier that exists
    // and is SPENT is yours and is merely empty, so it can be shown blocked.
    // With no build options passed, both still `continue` — identical.
    let unaffordableReason: string | undefined
    if (spell.level > 0) {
      const slot = character.spellSlots[spell.level]
      if (!slot) continue
      if (slot.current <= 0) {
        if (!build.includeUnaffordable) continue
        unaffordableReason = `No ${levelLabel(spell.level)}-level slots left`
      }
    }

    const actionType = spellActionType(spell.castingTime)

    // Determine roll info
    let rollNotation: string | undefined
    let rollLabel: string | undefined
    if (spell.damageDice) {
      rollNotation = spell.damageDice
      rollLabel = `${spell.name} Damage`
    } else if (spell.saveType) {
      // Save-based spell with no damage (buff/debuff) — no auto-roll
    } else if (spell.level > 0 || spell.castingTime.toLowerCase().includes('attack')) {
      // Spell attack
      rollNotation = `1d20+${character.spellAttackBonus}`
      rollLabel = `${spell.name} Attack`
    }

    // Merge feat tips for this spell
    const spellFeatTips = getFeatTips(character, spell.name, 'spell')
    const spellTipParts: string[] = []
    if (spell.tacticalNote) spellTipParts.push(spell.tacticalNote)
    spellTipParts.push(...spellFeatTips)
    const spellStrategicTip = spellTipParts.length > 0 ? spellTipParts.join(' | ') : undefined

    const option: ActionOption = {
      name: spell.name,
      type: 'spell',
      actionEconomy: actionType,
      summary: spellSummary(spell),
      mechanicsLine: spellMechanics(spell, character),
      effectsLine: spellEffects(spell),
      strategicTip: spellStrategicTip,
      rollNotation,
      rollLabel,
      spellLevel: spell.level,
      isConcentration: spell.concentration,
      isRitual: spell.ritual,
      unaffordableReason,
    }

    if (actionType === 'bonusAction') bonusActions.push(option)
    else if (actionType === 'reaction') reactions.push(option)
    else actions.push(option)
  }

  // Class features (available at level)
  for (const feature of character.features) {
    if (feature.level > character.level) continue
    // Skip if uses exhausted. A feature above your level is not yours at all;
    // a feature at 0 uses IS yours and is merely spent, so it can be shown
    // blocked rather than hidden. Without build options, both still `continue`.
    let unaffordableReason: string | undefined
    if (feature.usesMax !== undefined && (feature.usesCurrent ?? 0) <= 0) {
      if (!build.includeUnaffordable) continue
      unaffordableReason = feature.usesPerRest
        ? `No uses left until a ${feature.usesPerRest} rest`
        : 'No uses left'
    }

    const actionType = featureActionType(feature)
    const isPassive = feature.actionType === 'passive' || feature.actionType === 'none'
      || feature.name.toLowerCase().includes('aura')

    // Determine roll info
    let rollNotation: string | undefined
    let rollLabel: string | undefined
    if (feature.damageDice) {
      rollNotation = feature.damageDice
      rollLabel = `${feature.name}`
    }

    // Merge feat tips for this feature
    const featureFeatTips = getFeatTips(character, feature.name, 'feature')
    const featureTipParts: string[] = []
    if (feature.tacticalNote) featureTipParts.push(feature.tacticalNote)
    featureTipParts.push(...featureFeatTips)
    const featureStrategicTip = featureTipParts.length > 0 ? featureTipParts.join(' | ') : undefined

    const option: ActionOption = {
      name: feature.name,
      type: 'feature',
      actionEconomy: actionType,
      summary: featureSummary(feature),
      mechanicsLine: [
        feature.damageDice ? `${feature.damageDice}${feature.damageType ? ' ' + feature.damageType : ''}` : null,
        feature.saveType ? `DC ${character.spellSaveDC} ${feature.saveType}` : null,
        feature.range || null,
      ].filter(Boolean).join(' · ') || 'See description',
      effectsLine: featureEffects(feature),
      strategicTip: featureStrategicTip,
      rollNotation,
      rollLabel,
      usesRemaining: feature.usesMax !== undefined ? `${feature.usesCurrent ?? 0}/${feature.usesMax}` : undefined,
      unaffordableReason,
    }

    if (isPassive) passives.push(option)
    else if (actionType === 'bonusAction') bonusActions.push(option)
    else if (actionType === 'reaction') reactions.push(option)
    else actions.push(option)
  }

  return { actions, bonusActions, reactions, passives }
}
