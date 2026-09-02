/* The ONLY module in the app that imports a .json path.
 *
 * Everything else reaches canon through src/lib/canon/. Keeping the import
 * surface to one file is what lets the JSON stay verbatim: there is exactly one
 * place to look when the canon package is next replaced.
 *
 * Table Truth slice 1. */

import spellsRaw from './spells.json'
import conditionsRaw from './conditions.json'
import oathRaw from './oath-of-the-hearth.json'
import actionsRaw from './actions.json'
import glossaryRaw from './glossary.json'
import spellcastingRulesRaw from './spellcasting-rules.json'
import smiteRulesRaw from './smite-rules.json'
import weaponMasteryRaw from './weapon-mastery.json'
import paladinProgressionRaw from './paladin-progression.json'
import characterMarcusRaw from './character-marcus.json'
import speciesRaw from './species.json'
import featsRaw from './feats.json'
import backgroundsRaw from './backgrounds.json'

import type {
  CanonSpell,
  CanonCondition,
  CanonOath,
  CanonFeature,
  CanonClassFeatureDetail,
  CanonChannelDivinityOption,
  CanonValidationRule,
  CanonFeat,
  CanonProgressionLevel,
} from '../lib/canon/types'

/* The casts are the seam between "untyped JSON on disk" and "typed corpus in
 * the app". They are asserted rather than validated at runtime on purpose: the
 * files are checked in, they cannot change between builds, and a schema
 * validator would be a second source of truth about a shape the JSON already
 * declares. canon/lookup.test.ts does the checking instead, at build time,
 * where a mismatch is a red test rather than a broken table session. */

export const SPELLS = spellsRaw as unknown as readonly CanonSpell[]
export const CONDITIONS = conditionsRaw as unknown as readonly CanonCondition[]
export const OATH = oathRaw as unknown as CanonOath

/* Reference corpora — free-form by nature, consumed by the detail sheet and the
 * rule boxes in later slices. Typed loosely because their shapes are nested
 * prose, not records. */
export const ACTIONS = actionsRaw as Record<string, unknown>
export const GLOSSARY = glossaryRaw as Record<string, unknown>
export const SPELLCASTING_RULES = spellcastingRulesRaw as Record<string, unknown>
export const SMITE_RULES = smiteRulesRaw as Record<string, unknown>
export const WEAPON_MASTERY = weaponMasteryRaw as Record<string, unknown>
export const PALADIN_PROGRESSION = paladinProgressionRaw as Record<string, unknown>

/* Canon's five rules about preparing spells, verbatim, in canon's order.
 *
 * OPEN BOOK slice 5. They have been in `paladin-progression.json` since the
 * canon package landed and nothing has ever read them — `PALADIN_PROGRESSION`
 * above technically exposed them, as `unknown`, which is to say not at all.
 * Marcus: "The app should teach me on preparing spells and when i can (i think
 * on long rests i can swap out a spell or something. The documents should have
 * information on this.)" They do. Rule 3 is the sentence he was reaching for.
 *
 * QUOTED, NEVER PARSED. `prepare/toggle.ts` enforces these with its own code and
 * quotes these strings in the refusal; it never reads behaviour out of them. A
 * rule the app both quotes and executes from one string is a rule that silently
 * changes meaning the day canon rewords it. */
export const PREPARED_SPELL_RULES: readonly string[] =
  (paladinProgressionRaw as unknown as { preparedSpellRules?: string[] })
    .preparedSpellRules ?? []

/* Canon's per-level table, keyed by class name so the open-world rule has
 * somewhere to fail: a class canon has no table for is `undefined` here, and
 * `derive.ts` then adds nothing rather than inventing a row.
 *
 * SHEET TRUTH slice 1. `PALADIN_PROGRESSION` above already exposed this file,
 * but as `Record<string, unknown>` — which is to say, not usably. Normalised
 * HERE for the same reason `CLASS_FEATURES` is: this is the one module allowed
 * to touch a .json path, so it is the one place a future canon package has to
 * be re-read. */
export const PROGRESSION_BY_CLASS: Readonly<
  Record<string, readonly CanonProgressionLevel[]>
> = {
  Paladin:
    (paladinProgressionRaw as unknown as { levels?: CanonProgressionLevel[] })
      .levels ?? [],
}

/* The 16 BASE Paladin features — Lay On Hands, Divine Sense, Aura of Protection
 * and the rest. They live in paladin-progression.json as an object keyed by
 * name, while the four subclass features live in oath-of-the-hearth.json as an
 * array of records with a different field name for the same text.
 *
 * Found the hard way: slice 1's match report ran against the real app and
 * cheerfully listed "Lay on Hands" and "Aura of Protection" as things canon had
 * no entry for. It had entries for both — in the file nothing was reading.
 *
 * Normalised HERE, at the JSON seam, so lookup.ts sees one shape. Oath features
 * are indexed first and win a name collision: a subclass that redefines a base
 * feature means the subclass. */
export const CLASS_FEATURES: readonly CanonFeature[] = Object.entries(
  (paladinProgressionRaw as unknown as {
    classFeatureDetails?: Record<string, CanonClassFeatureDetail>
  }).classFeatureDetails ?? {}
).map(([name, detail]) => ({
  ...detail,
  name,
  level: detail.level,
  // `text` for 15 of the 16; "Channel Divinity" is a menu, so its body is its
  // options list. Falling back rather than defaulting to '' — an empty body
  // would look like coverage and read like nothing.
  rawText: detail.text ?? (detail.options ?? []).join('; '),
}))
/* ── Channel Divinity's menu, parsed ────────────────────────────────────────
 *
 * Slice 1's Finding D, closed. Canon files the cloak's full text — and four of
 * the twelve errata — under "Hearthfire Manifest"; Nix's sheet calls it "Flaming
 * Cloak". The bridge between the two names is sitting in plain sight inside
 * Channel Divinity's `options[]`, and until now nothing read it, so the app
 * showed Marcus his own thin wording for the exact feature he asked about.
 *
 * The grammar, read off the two records rather than assumed:
 *
 *     "Divine Sense (class)"
 *     "Hearthfire Manifest - flaming cloak (Oath of the Hearth)"
 *      └── parent ───────┘   └── alias ──┘  └──── source ─────┘
 *
 * Parsed by SHAPE — a trailing parenthetical, then an optional dash — and never
 * by recognising either name. An option that does not fit the shape keeps its
 * whole string as the parent and contributes no alias: it degrades to what the
 * app already did, which is the only safe direction for a parser to fail in. */
const CD_TRAILING_SOURCE = /^(.*?)\s*\(([^()]*)\)\s*$/
const CD_ALIAS_DASH = /\s+[-–—]\s+/

function parseChannelDivinityOption(raw: string): CanonChannelDivinityOption {
  const sourced = CD_TRAILING_SOURCE.exec(raw)
  const head = (sourced ? sourced[1] : raw).trim()
  const source = (sourced ? sourced[2] : '').trim()

  const dash = CD_ALIAS_DASH.exec(head)
  if (!dash) return { parent: head, alias: null, source, raw }

  const parent = head.slice(0, dash.index).trim()
  const alias = head.slice(dash.index + dash[0].length).trim()
  // A dash with nothing usable on one side of it is not an alias; better to
  // file the whole head as the parent than to mint an empty match key.
  if (!parent || !alias) return { parent: head, alias: null, source, raw }
  return { parent, alias, source, raw }
}

export const CHANNEL_DIVINITY_OPTIONS: readonly CanonChannelDivinityOption[] = (
  (paladinProgressionRaw as unknown as {
    classFeatureDetails?: Record<string, CanonClassFeatureDetail>
  }).classFeatureDetails?.['Channel Divinity']?.options ?? []
).map(parseChannelDivinityOption)

export const SPECIES = speciesRaw as Record<string, unknown>
export const FEATS = featsRaw as unknown

/* Canon files the four feat categories separately — `origin`, `general`,
 * `fightingStyle`, `epicBoon` — because the RULES for acquiring them differ.
 * Nothing downstream of a character sheet cares: by the time a feat is on the
 * sheet, how it was acquired is history. So this is the same 76 records flat,
 * and the categories stay readable on each record's own `category` field.
 *
 * Kept BESIDE `FEATS` rather than replacing it: `FEATS` is the whole document,
 * `rules` and `changesFrom2014` included, and CharacterPage reads it that way.
 * Table Truth slice 10e. */
export const FEAT_LIST: readonly CanonFeat[] = (() => {
  const doc = featsRaw as unknown as Record<string, unknown>
  const out: CanonFeat[] = []
  for (const category of ['origin', 'general', 'fightingStyle', 'epicBoon']) {
    const bucket = doc[category]
    if (!Array.isArray(bucket)) continue
    for (const record of bucket) {
      // A record with no name cannot be looked up and cannot be rendered. Skip
      // it rather than indexing an empty key, which would answer every unknown
      // feat with whichever malformed record happened to load first.
      if (record && typeof record === 'object' && typeof (record as CanonFeat).name === 'string') {
        out.push(record as CanonFeat)
      }
    }
  }
  return out
})()
export const BACKGROUNDS = backgroundsRaw as unknown

/* character-marcus.json is canon's own reading of the sheet. It is NOT the
 * character — Nix lives in localStorage and that is the only sheet the app
 * trusts. This is here for one job: its `validationRules` (VAL-01..VAL-15)
 * become assertions in slice 10. Note `abilityScores.needsInput === true` —
 * canon does not know Marcus's real scores, and its spellSaveDC is the STRING
 * "8 + 3 + Charisma modifier", so save DC always comes from the character. */
export const CHARACTER_MARCUS = characterMarcusRaw as Record<string, unknown>

/** Canon's fifteen validation rules — the job the record above was kept for.
 *
 *  Exported as its own typed constant in slice 10a so the suite reads the LIST
 *  rather than a hand-typed array of ids. That is the `OATH_ERRATA_IDS` lesson
 *  from 8b in one line: a ledger typed by hand covers what the author
 *  remembered, and a ledger read from canon covers what canon actually ships.
 *  If canon grows a VAL-16, the coverage meta-test goes red the same day. */
export const VALIDATION_RULES = (CHARACTER_MARCUS.validationRules ??
  []) as readonly CanonValidationRule[]

/** Build provenance, surfaced in the slice-1 match report. */
export const CANON_BUILD = '2026-08-26'
