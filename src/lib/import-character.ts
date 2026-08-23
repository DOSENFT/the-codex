import { normalizeCharacter, type Character } from './character'

/**
 * Read a character out of an exported `.json` file.
 *
 * Written 2026-08-17, after Marcus could not get Nix onto his phone. There were
 * two copies of this logic — `CharacterSetup.handleImportCharacter` and
 * `Settings.handleImport` — byte-identical, each ending in `parsed as
 * Character`. That cast was the bug: both files he tried passed validation, got
 * saved, and then white-screened the app on fields the validation never looked
 * at. See `normalizeCharacter` for the full account.
 *
 * Three things this does that the copies did not:
 *
 *   1. Normalises. A cast is not a check.
 *   2. Says which field is missing. "Invalid character file — missing name,
 *      class, race, or level" tells you nothing about which of the four, and
 *      when the file is `{}` — which is what a failed export writes — it reads
 *      as though the app is being fussy rather than the file being empty.
 *   3. Refuses only what it must. `race` was required, and 2024 D&D calls it
 *      species; a file that has one and not the other is not a broken file.
 *      Only a name is genuinely required, because a character with no name
 *      cannot be told apart in the roster.
 */
export type ImportResult =
  | { ok: true; character: Character; warnings: string[]; repairs: string[] }
  | { ok: false; error: string }

export function parseCharacterFile(text: string): ImportResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'That file is empty.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      ok: false,
      error: 'That is not a JSON file. Export from Settings → Export to get one.',
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'That file does not contain a character.' }
  }
  const raw = parsed as Partial<Character> & { species?: string }

  // An empty object is what a failed export writes, and Marcus has two of them
  // in his Downloads folder. Naming that exactly is the difference between "the
  // app is broken" and "that download didn't work — try exporting again".
  if (Object.keys(raw).length === 0) {
    return {
      ok: false,
      error: 'That file is empty — the export did not work. Try Settings → Export again.',
    }
  }

  if (!raw.name || typeof raw.name !== 'string') {
    return {
      ok: false,
      error: 'No character in that file — it has no name. Is it the right download?',
    }
  }

  // 2024 calls it species. Accept either spelling rather than reject the file.
  if (!raw.race && raw.species) raw.race = raw.species

  // Everything else is defaulted rather than refused, but Marcus should be told
  // when a thin old export is about to arrive missing its kit — silently
  // handing him a Nix with 10s across the board would be worse than saying so.
  const warnings: string[] = []
  if (!raw.abilityScores) warnings.push('ability scores')
  if (!raw.weapons?.length) warnings.push('weapons')
  if (!raw.equipment?.length) warnings.push('equipment')
  if (!raw.spells?.length) warnings.push('spells')

  /* `warnings` is about what the file NEVER HAD — a thin old export missing its
     kit. `repairs` is about what the file HAD WRONG and this app changed on the
     way in: a spell that was `null`, a weapon whose `properties` was the string
     "finesse", a homebrew condition with no name. Those used to be a blank
     screen or a polite boundary notice; they are now a coercion, and a coercion
     Marcus is not told about is just a quieter way of losing his data. Two
     lists, because "your file is old" and "your file is damaged and I altered
     it" are different sentences and he should not have to guess which he got. */
  const repairs: string[] = []
  const character = normalizeCharacter(raw, undefined, repairs)
  return { ok: true, character, warnings, repairs }
}

/** "weapons, equipment and spells" — for reading a warning list out loud. */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
