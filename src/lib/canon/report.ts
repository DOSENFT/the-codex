/* What canon knows about THIS character's sheet, and — more usefully — what it
 * doesn't.
 *
 * Slice 1's whole visible output is this report. It exists because "we added a
 * rules database" is a claim, and a claim about data is worth nothing until you
 * can see the misses. A miss is not a bug: under the open-world rule homebrew
 * keeps its own words and renders exactly as it does today. But a miss the app
 * never mentions is how you find out at a table that your subclass feature was
 * silently the odd one out.
 *
 * Pure. Reads the character, reads canon, writes nothing.
 *
 * Table Truth slice 1. */

import type { Character } from '../character'
import { CANON_BUILD } from '../../canon'
import { CANON_COUNTS, spellByName, featureByName, conditionByName, isUnlocked } from './lookup'

export interface MatchReport {
  canonBuild: string
  counts: typeof CANON_COUNTS

  /** Everything on the sheet that canon could be asked about. */
  checked: number
  /** How many of those canon had a record for. */
  matched: number

  /** The names canon has nothing for, grouped by where they came from. Shown in
   *  full — no "and 12 more", because the point is to be able to read them. */
  unmatchedSpells: string[]
  unmatchedFeatures: string[]
  unmatchedConditions: string[]

  /** Sheet spells canon says this character has not unlocked yet. NOT hidden
   *  and NOT removed — surfaced, because the sheet might be right and canon
   *  might be stale, and only Marcus can say which. */
  aboveLevel: Array<{ name: string; unlocksAt: number }>
}

export function buildMatchReport(character: Character): MatchReport {
  const unmatchedSpells: string[] = []
  const unmatchedFeatures: string[] = []
  const unmatchedConditions: string[] = []
  const aboveLevel: Array<{ name: string; unlocksAt: number }> = []

  let checked = 0
  let matched = 0

  for (const spell of character.spells ?? []) {
    checked++
    const canon = spellByName(spell.name)
    if (!canon) {
      unmatchedSpells.push(spell.name)
      continue
    }
    matched++
    if (!isUnlocked(canon, character.level)) {
      aboveLevel.push({ name: spell.name, unlocksAt: canon.unlocksAtPaladinLevel })
    }
  }

  for (const feature of character.features ?? []) {
    checked++
    if (featureByName(feature.name)) matched++
    else unmatchedFeatures.push(feature.name)
  }

  for (const condition of character.conditions ?? []) {
    checked++
    if (conditionByName(condition)) matched++
    else unmatchedConditions.push(condition)
  }

  return {
    canonBuild: CANON_BUILD,
    counts: CANON_COUNTS,
    checked,
    matched,
    unmatchedSpells,
    unmatchedFeatures,
    unmatchedConditions,
    aboveLevel,
  }
}
