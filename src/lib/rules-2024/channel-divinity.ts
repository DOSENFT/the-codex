// ---------------------------------------------------------------------------
// Channel Divinity — "what can I spend this charge on?"
// ---------------------------------------------------------------------------
//
// Marcus, 2026-11-12: "can we have it to where, if I press the channel divinity
// buttons, it can come up with a quick list of things I can use the channel
// divinity for?"
//
// A charge is worth nothing at the table if you cannot remember what it buys.
// This is the one function that answers that question; the screen only paints
// what it returns.
//
// THREE SOURCES, deduplicated by normalised name, canon first:
//
//   a. canon's own option list for the class (`CHANNEL_DIVINITY_OPTIONS`):
//      Divine Sense, and the subclass option when the sheet is that subclass
//      or carries that feature (Hearthfire Manifest's flaming cloak);
//   b. any sheet feature BOUND to the pool (`resourcePoolId`), e.g. the Turn
//      Undead his DM granted at the consecrated brazier;
//   c. any sheet feature whose own words say it expends Channel Divinity —
//      homebrew written as prose rather than as a binding.
//
// Silent rather than wrong: no pool → no list. Canon text is never invented
// for a feature canon does not have; a sheet feature is described in the
// sheet's own words.

import { CHANNEL_DIVINITY_OPTIONS } from '../../canon'
import { featureByName, normalizeName } from '../canon/lookup'
import type { Character, ClassFeature } from '../character'
import { abilityModifier } from '../character'
import { findPool, poolIdForFeature } from './resources'

export const CHANNEL_DIVINITY_POOL = 'channel-divinity'

export interface ChannelDivinityOption {
  /** Normalised name — stable key for React and for dedupe. */
  id: string
  /** What he reads first. */
  name: string
  /** "Bonus Action", "Reaction", "Magic action", "Action". */
  actionLabel: string
  /** One plain line: what it does for him right now. */
  summary: string
  /** Range · save · duration, when the sheet states them. Short, mono. */
  facts?: string
  /** Fuller rules text, when there is more than the summary says. */
  detail?: string
  /** Where it comes from, in words: "Paladin", "Oath of the Hearth", "DM gift…". */
  sourceLabel: string
}

const MENU_PREFIX = /^\s*channel\s+divinity\s*[:\-–—]\s*/i
/** Prose that says a feature SPENDS a charge, not merely mentions the word. */
const SPENDS_CD =
  /\b(?:expend|expends|spend|spends|use|uses)\s+(?:one|a|1)\s+(?:use\s+of\s+)?(?:your\s+)?channel\s+divinity\b/i

const ACTION_LABEL: Record<NonNullable<ClassFeature['actionType']>, string> = {
  action: 'Action',
  bonusAction: 'Bonus Action',
  reaction: 'Reaction',
  passive: 'No action',
  none: 'No action',
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function chaMod(character: Character): number {
  const raw = character.abilityScores?.CHA
  return typeof raw === 'number' && Number.isFinite(raw) ? abilityModifier(raw) : 0
}

/** The option's display name: "Channel Divinity: Sacred Weapon" → "Sacred Weapon". */
function displayName(raw: string): string {
  const stripped = raw.replace(MENU_PREFIX, '').trim()
  return stripped || raw.trim()
}

/** The sentence a reader needs, from prose that may open with bookkeeping. */
function firstUsefulSentence(description: string): string {
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
  const useful = sentences.find(s => !/^channel divinity option\b/i.test(s) && !/^granted by\b/i.test(s))
  return useful ?? sentences[0] ?? ''
}

function isPaladin(character: Character): boolean {
  return normalizeName(text(character.class)) === 'paladin'
}

/** Canon option a: Divine Sense and the subclass's own option. */
function canonOptions(character: Character): ChannelDivinityOption[] {
  if (!isPaladin(character)) return []
  const out: ChannelDivinityOption[] = []
  const subclass = normalizeName(text(character.subclass))
  const sheetNames = new Set((character.features ?? []).map(f => normalizeName(text(f.name))))

  for (const option of CHANNEL_DIVINITY_OPTIONS) {
    const canon = featureByName(option.parent)
    if (!canon) continue
    if (typeof canon.level === 'number' && canon.level > character.level) continue

    const isClass = normalizeName(option.source) === 'class'
    if (!isClass) {
      const fromSubclass = subclass.length > 0 && subclass.includes(normalizeName(option.source))
      const onSheet = sheetNames.has(normalizeName(option.parent))
      if (!fromSubclass && !onSheet) continue
    }

    const mechanics = (canon.mechanics ?? {}) as Record<string, unknown>
    const cloakAction = text(mechanics.cloakAction)
    const name = option.alias ? `${option.parent} — ${option.alias}` : option.parent
    const sourceLabel = isClass ? 'Paladin' : option.source

    if (cloakAction) {
      // A feature whose charge buys a transformation, with its own costed face.
      // The temp HP is worked out, not quoted, so it is right at every level.
      const tempHP = character.level + chaMod(character)
      const retaliation = text(mechanics.retaliation)
      const duration = text(mechanics.duration)
      const parts = [
        `Gain ${tempHP} temporary HP`,
        retaliation ? retaliation.replace(/^1d10/i, 'melee attackers take 1d10').replace(/ to a creature that hits you with a melee attack$/i, '') : '',
        duration ? duration.replace(/^Until/i, 'until') : '',
      ].filter(Boolean)
      const raw = text(canon.rawText)
      const at = raw.search(/As a Reaction, you can expend/i)
      out.push({
        id: normalizeName(option.parent),
        name,
        actionLabel: cloakAction,
        summary: parts.join(' · '),
        detail: at >= 0 ? raw.slice(at) : raw || undefined,
        sourceLabel,
      })
      continue
    }

    const action = text(canon.action) || text(mechanics.action) || 'Action'
    const body = text(canon.text) || text(canon.rawText)
    out.push({
      id: normalizeName(option.parent),
      name,
      actionLabel: action,
      summary: firstUsefulSentence(body),
      detail: body && body !== firstUsefulSentence(body) ? body : undefined,
      sourceLabel,
    })
  }
  return out
}

/** Sheet options b and c. */
function sheetOptions(character: Character): ChannelDivinityOption[] {
  const out: ChannelDivinityOption[] = []
  const dc = character.spellSaveDC
  for (const feature of character.features ?? []) {
    if (!feature || typeof feature !== 'object') continue
    const rawName = text(feature.name)
    if (!rawName) continue
    if (typeof feature.level === 'number' && feature.level > character.level) continue
    const key = normalizeName(rawName)
    // The pool itself is not an option on its own menu.
    if (key === 'channeldivinity') continue

    const description = text(feature.description)
    const bound = poolIdForFeature(feature) === CHANNEL_DIVINITY_POOL
    const prose = SPENDS_CD.test(description)
    if (!bound && !prose) continue

    const name = displayName(rawName)
    const magic = /\bmagic action\b/i.test(description)
    const actionLabel = magic
      ? 'Magic action'
      : feature.actionType
        ? ACTION_LABEL[feature.actionType] ?? 'Action'
        : 'Action'

    const facts = [
      text(feature.range),
      feature.saveType ? `${text(feature.saveType)} save${typeof dc === 'number' && dc > 0 ? ` DC ${dc}` : ''}` : '',
      text(feature.duration),
    ].filter(Boolean)
    // The sentence that says what HAPPENS to the target, when there is one;
    // otherwise the first sentence that is not bookkeeping.
    const sentences = description.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
    const outcome = sentences.find(s => /^on a fail|\bfails?\b.*\bsave\b/i.test(s))
    const summary = outcome ?? firstUsefulSentence(description)

    out.push({
      id: normalizeName(name),
      name,
      actionLabel,
      summary: summary || 'Spends one Channel Divinity charge.',
      ...(facts.length > 0 ? { facts: facts.join(' · ') } : {}),
      detail: description && description !== summary ? description : undefined,
      sourceLabel: text(feature.source) || 'Your sheet',
    })
  }
  return out
}

/** Everything one Channel Divinity charge can buy this character, or [] when
 *  the sheet has no Channel Divinity pool. Never throws on a thin sheet. */
export function channelDivinityOptions(input: Character): ChannelDivinityOption[] {
  if (!input || typeof input !== 'object') return []
  // Import already drops non-object features; a sheet assembled any other way
  // might not have, and the pool reader below indexes every entry.
  const features = Array.isArray(input.features)
    ? input.features.filter((f): f is ClassFeature => !!f && typeof f === 'object')
    : []
  const character: Character = { ...input, features }
  if (!findPool(character, CHANNEL_DIVINITY_POOL)) return []
  const seen = new Set<string>()
  const out: ChannelDivinityOption[] = []
  for (const option of [...canonOptions(character), ...sheetOptions(character)]) {
    // Canon's Hearthfire and the sheet's Hearthfire are one option, not two.
    // Dedupe on the canon parent name as well as the displayed one.
    const keys = [option.id, normalizeName(option.name.split(' — ')[0] ?? option.name)]
    if (keys.some(k => seen.has(k))) continue
    keys.forEach(k => seen.add(k))
    out.push(option)
  }
  return out
}
