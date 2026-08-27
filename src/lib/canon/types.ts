/* The canon record shapes.
 *
 * These mirror src/canon/*.json EXACTLY. Nothing here is invented, renamed or
 * "improved" — if a field is oddly named in the JSON it is oddly named here
 * too, because the two must stay diffable. New convenience shapes belong in
 * lookup.ts or format.ts, not in this file.
 *
 * Table Truth slice 1. See docs/plans/table-truth/03-program-design.md. */

export interface CanonComponents {
  v: boolean
  s: boolean
  m: boolean
  materialText: string | null
  materialCostGp: number
  materialConsumed: boolean
  focusAllowed: boolean
}

export interface CanonDamage {
  /** NOT always a die expression. 6 of the 71 records put prose here — cantrip
   *  scaling ("1d6 (scales at character levels 5, 11, 17)") and multi-type
   *  damage ("5d6 Fire plus 5d6 Radiant"). format.ts reads it structurally and
   *  refuses to guess; see the header comment there. */
  dice: string
  type: string
  /** Free text, e.g. "+1d8 if the target is a Fiend or Undead". One record of 71. */
  bonus?: string
  /** Free text qualifier. Detail sheet only. */
  note?: string
}

/** NOT the same shape as CanonDamage — it has no `type` and it carries `mod`
 *  and `targets`. Four records use it and no two use the same subset, so every
 *  field is optional. Verified against spells.json, not assumed. */
export interface CanonHealing {
  dice?: string
  /** e.g. "spellcasting ability modifier" — resolved from CasterContext. */
  mod?: string
  targets?: string
  note?: string
}

export interface CanonSave {
  ability: string
  effect: string
  /** e.g. when the save is repeated. Detail sheet only. */
  when?: string
}

export interface CanonSpell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  castingTimeType: string
  trigger: string | null
  range: string
  components: CanonComponents
  duration: string
  concentration: boolean
  ritual: boolean
  source: string
  coreList: boolean
  damage: CanonDamage | null
  healing: CanonHealing | null
  save: CanonSave | null
  attackRoll: string | null
  higherLevel: string | null
  onPaladinList: boolean
  grantedBy: string | null

  /** The plain-language paragraph. Mean length 230 chars across the 71 entries,
   *  61 of them over 140 — which is precisely why it belongs to the detail
   *  sheet and never to a list row. (Gate 1 decision 4.) */
  summary: string

  /** Long-form advice. The folded "How to use it" band, nothing else. */
  tactics: string

  /** THE RULE. Compare against the character's actual level. */
  unlocksAtPaladinLevel: number

  /** SNAPSHOTS OF THAT RULE, frozen at level 7. Never read them — Nix is level
   *  7 today and will not be forever, and the app's fixtures already disagree.
   *  lookup.test.ts asserts these two identifiers appear nowhere else in src/. */
  castableAtLevel7: boolean
  lockedForMarcus: boolean

  alwaysPrepared: boolean
  countsAgainstPreparedLimit: boolean
  availability: string
}

export interface CanonCondition {
  name: string
  implies: string[]
  effects: string[]
}

export interface CanonFeature {
  level: number
  name: string
  /** The subclass text as printed, errata and all. */
  rawText: string
  /** Field names vary per feature — it is a free-form bag by design. */
  mechanics?: Record<string, unknown>
  [key: string]: unknown
}

/** How `paladin-progression.json` stores the 16 base class features: an OBJECT
 *  keyed by feature name, not an array, and with `text` where the oath file uses
 *  `rawText`. Two shapes for the same idea, so index.ts normalises one into the
 *  other rather than teaching every caller about both. */
export interface CanonClassFeatureDetail {
  level: number
  /** OPTIONAL, and TypeScript is the reason we know. 15 of the 16 records carry
   *  `text`; "Channel Divinity" carries `options[]` instead, because it is a
   *  menu rather than a paragraph. index.ts falls back to the options list so no
   *  feature ends up with an empty body. */
  text?: string
  options?: string[]
  action?: string
  resource?: string
  notes?: string[]
  [key: string]: unknown
}

export type ErratumSeverity = 'BREAKING' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface CanonErratum {
  /** 'HEARTH-01' … 'HEARTH-12'. The only ids canon cross-references by. */
  id: string
  severity: ErratumSeverity
  /** e.g. "Smoldering Smite (level 15)" — carries the level in the string. */
  feature: string
  problem: string
  recommendedFix: string
  appAction: string

  /** OPTIONAL, and the count is the point: **1 of the 12 errata carries these**
   *  — HEARTH-01 alone. They were declared required here in slice 1 and never
   *  checked, because `index.ts` asserts the corpus rather than validating it,
   *  so TypeScript had nothing to disagree with.
   *
   *  This matters beyond tidiness. Gate 1 decision 3 promises the player THREE
   *  readings of every erratum — as written, narrower, recommended — and eleven
   *  of the twelve have no narrower reading to show. Slice 8 must render the
   *  readings canon actually supplies and say so, not paint `undefined` into a
   *  band that claims to offer a choice. Measured 2026-08-26, slice 6. */
  cause?: string
  narrowerAlternative?: string

  /** Free-form fields a minority of records carry: `note` (1), `comparison` (1),
   *  `assessment` (4), `mitigatingFactor` (1). Enumerated rather than dropped,
   *  because they are canon's own reasoning and the detail sheet shows it. */
  note?: string
  comparison?: string
  assessment?: string
  mitigatingFactor?: string
}

/** One entry from `Channel Divinity`'s `options[]` list, parsed.
 *
 *  Channel Divinity is a MENU, not a paragraph: canon stores it as
 *  `["Divine Sense (class)", "Hearthfire Manifest - flaming cloak (Oath of the
 *  Hearth)"]`. A sheet names what the player picked ("Flaming Cloak"); canon
 *  names the feature that grants it ("Hearthfire Manifest"). Slice 1's Finding D
 *  is exactly that mismatch, and this shape is how it is closed. */
export interface CanonChannelDivinityOption {
  /** The name canon files the full text under — always resolvable in the
   *  feature index, asserted by `lookup.test.ts`. */
  parent: string
  /** The name a SHEET is likely to use, when canon gave one. Null when the
   *  option is filed under its own name and needs no alias. */
  alias: string | null
  /** Canon's own parenthetical, verbatim: "class", "Oath of the Hearth". */
  source: string
  /** The option string exactly as canon wrote it, kept so a parse that goes
   *  wrong is diagnosable against the original rather than against a guess. */
  raw: string
}

export interface CanonCombo {
  name: string
  pieces: string[]
  effect: string
  why: string
}

export interface CanonOath {
  name: string
  class: string
  ruleset: string
  status: string
  patron: string
  tenets: string[]
  structuralAudit: Record<string, unknown>
  oathSpells: unknown[]
  oathSpellRules: string
  features: CanonFeature[]
  errata: CanonErratum[]
  combos: CanonCombo[]
}

/** Which reading of an erratum the app is running. Absent means 'recommended'
 *  — Gate 1 decision 3: default to the fix, but flag it, and never silently. */
export type ErratumReading = 'recommended' | 'narrower' | 'asWritten'

/** Where a rendered option's text came from. The open-world rule in one field:
 *  'sheet' is not a failure, it is homebrew keeping its own words. */
export type Provenance = 'canon' | 'sheet'

/** One of canon's fifteen validation rules, VAL-01..VAL-15. Slice 10a.
 *
 *  `severity` is canon's own grading, and the suite ASSERTS it rather than
 *  restating it — so a rule canon later promotes from `info` to `error` turns
 *  a test red instead of silently changing what the app owes. Three values,
 *  spelled as a union, so a typo in a future canon package fails `tsc` rather
 *  than matching nothing at runtime. */
export interface CanonValidationRule {
  id: string
  rule: string
  severity: 'error' | 'warning' | 'info'
}
