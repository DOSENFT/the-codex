import type { PlayNote, ToyboxCombo, ToyboxTactic, ToyboxPersonaPlay } from '../toybox'
import type { SeedCombo, SeedTactic, SeedPersonaPlay } from './types'
import type { SeedProfile } from './profile'
import { PARTY_ROLES } from './party'

/* ==========================================================================
   TOKENS — the only vocabulary seeded content has for a number or a name

   A pack may write `{{auraBonus}}`. It may not write "+3". The table below is
   the complete list of what it is allowed to say, and a token that is not in
   it is a typo — which is why an unknown token does not fall through to the
   screen as literal braces but kills the string it is in.

   NULL IS A REAL ANSWER, AND IT PROPAGATES. A character with no melee weapon
   has no `{{weapon}}`; a party with no wizard has no `{{wizard}}`. In both
   cases `resolveText` returns null and the caller drops whatever the text
   belonged to. The alternative — "call it out to your wizard", "swing your
   weapon" — is exactly the content that could belong to somebody else's
   character, which Gate 1 names as the failure mode.
   ========================================================================== */

/** How the game writes a modifier: +3, and -1, never 3. */
const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`)

export const TOKENS: Record<string, (p: SeedProfile) => string | null> = {
  level: p => `${p.level}`,
  prof: p => signed(p.proficiency),
  strMod: p => signed(p.strMod),
  chaMod: p => signed(p.chaMod),
  auraBonus: p => signed(p.auraBonus),
  auraRadius: p => `${p.auraRadius}`,
  cloakTempHp: p => `${p.cloakTempHp}`,
  saveDC: p => `${p.saveDC}`,
  spellAttack: p => signed(p.spellAttack),
  weapon: p => p.weaponName,
  weaponDice: p => p.weaponDice,
  weaponReach: p => (p.weaponReach === null ? null : `${p.weaponReach}`),
  fightingStyle: p => p.fightingStyle,
  // One token per party role — {{wizard}}, {{rogue}}, {{ranger}}, {{bard}}, …
  ...Object.fromEntries(
    PARTY_ROLES.map(role => [role, (p: SeedProfile) => p.party[role] ?? null]),
  ),
}

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g

/** Every `{{token}}` replaced, or null if any of them cannot be.
 *
 *  Never returns a string containing braces: a typo in a pack is a dropped
 *  entry at worst, and never `{{auraBonis}}` painted on the glass. */
export function resolveText(text: string, profile: SeedProfile): string | null {
  let failed = false
  const out = text.replace(TOKEN_PATTERN, (_whole, name: string) => {
    const token = TOKENS[name]
    const value = token ? token(profile) : null
    if (value === null || value === undefined) {
      failed = true
      return ''
    }
    return value
  })
  if (failed) return null
  // A token whose value itself contains braces would smuggle them through the
  // single pass above. Nothing in the table can today; this makes sure nothing
  // ever does.
  return out.includes('{{') ? null : out
}

/** Resolve a list, or fail the whole list. Used where every item is
 *  load-bearing — a requirement that cannot be stated cannot be checked. */
function resolveAll(texts: string[], profile: SeedProfile): string[] | null {
  const out: string[] = []
  for (const text of texts) {
    const resolved = resolveText(text, profile)
    if (resolved === null) return null
    out.push(resolved)
  }
  return out
}

/** Resolve annotations, dropping only the ones that cannot be written.
 *
 *  THE ONE PLACE IN THIS FILE THAT SURVIVES A FAILED TOKEN, and it is the
 *  point of annotations existing as their own field. `resolveAll` above fails
 *  the whole list because a requirement nobody can state cannot be checked;
 *  here, "call it out to {{wizard}}" for a party with no wizard is one line of
 *  advice that does not apply, not a reason to withhold the combo.
 *
 *  Empty comes back as `undefined` rather than `[]` so the cards can render on
 *  presence alone and never paint an empty container with a border on it. */
export function resolveNotes(
  notes: PlayNote[] | undefined,
  profile: SeedProfile,
): PlayNote[] | undefined {
  if (notes === undefined) return undefined
  const out: PlayNote[] = []
  for (const note of notes) {
    const text = resolveText(note.text, profile)
    if (text === null) continue
    out.push({ ...note, text })
  }
  return out.length > 0 ? out : undefined
}

/** Resolve an optional string: absent stays absent, unresolvable fails. */
function resolveMaybe(
  text: string | undefined,
  profile: SeedProfile,
): { ok: true; value: string | undefined } | { ok: false } {
  if (text === undefined) return { ok: true, value: undefined }
  const resolved = resolveText(text, profile)
  return resolved === null ? { ok: false } : { ok: true, value: resolved }
}

export function resolveCombo(
  combo: SeedCombo,
  profile: SeedProfile,
  createdAt: number,
): ToyboxCombo | null {
  const name = resolveText(combo.name, profile)
  if (name === null) return null

  const description = resolveMaybe(combo.description, profile)
  if (!description.ok) return null

  const blocks: ToyboxCombo['blocks'] = []
  for (const block of combo.blocks) {
    const label = resolveText(block.label, profile)
    if (label === null) return null
    const sourceName = resolveMaybe(block.sourceName, profile)
    const notes = resolveMaybe(block.notes, profile)
    if (!sourceName.ok || !notes.ok) return null
    blocks.push({ ...block, label, sourceName: sourceName.value, notes: notes.value })
  }

  const tags = resolveAll(combo.tags, profile)
  if (tags === null) return null

  let requirements: string[] | undefined
  if (combo.requirements) {
    const resolved = resolveAll(combo.requirements, profile)
    if (resolved === null) return null
    requirements = resolved
  }

  return {
    ...combo,
    name,
    description: description.value,
    blocks,
    tags,
    requirements,
    annotations: resolveNotes(combo.annotations, profile),
    favorite: false,
    createdAt,
  }
}

export function resolveTactic(
  tactic: SeedTactic,
  profile: SeedProfile,
  createdAt: number,
): ToyboxTactic | null {
  const name = resolveText(tactic.name, profile)
  const trigger = resolveText(tactic.trigger, profile)
  if (name === null || trigger === null) return null

  const actions = resolveAll(tactic.actions, profile)
  const tags = resolveAll(tactic.tags, profile)
  if (actions === null || tags === null) return null

  let requirements: string[] | undefined
  if (tactic.requirements) {
    const resolved = resolveAll(tactic.requirements, profile)
    if (resolved === null) return null
    requirements = resolved
  }

  return {
    ...tactic,
    name,
    trigger,
    actions,
    tags,
    requirements,
    annotations: resolveNotes(tactic.annotations, profile),
    favorite: false,
    createdAt,
  }
}

export function resolvePersonaPlay(
  play: SeedPersonaPlay,
  profile: SeedProfile,
  createdAt: number,
): ToyboxPersonaPlay | null {
  const name = resolveText(play.name, profile)
  const situation = resolveText(play.situation, profile)
  const approach = resolveText(play.approach, profile)
  if (name === null || situation === null || approach === null) return null

  const keyPhrases = resolveAll(play.keyPhrases, profile)
  const tags = resolveAll(play.tags, profile)
  if (keyPhrases === null || tags === null) return null

  const skillCheck = resolveMaybe(play.skillCheck, profile)
  if (!skillCheck.ok) return null

  return {
    ...play,
    name,
    situation,
    approach,
    keyPhrases,
    tags,
    skillCheck: skillCheck.value,
    annotations: resolveNotes(play.annotations, profile),
    favorite: false,
    createdAt,
  }
}
