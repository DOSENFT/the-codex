/* ─────────────────────────────────────────────────────────────────────────────
   ERRATA — canon's twelve rules problems, made readable and made answerable.
   ────────────────────────────────────────────────────────────────────────────
   Canon ships an errata pass on the Oath of the Hearth: twelve `HEARTH-##`
   records, each naming a place where the subclass text does not work as
   written. Slice 6 could only COUNT them ("⚑ Canon lists 4 errata on Hearthfire
   Manifest"). This module is what turns a count into something Marcus can read
   at the table and answer with his DM.

   TWO JOBS, both pure, both here so the components stay dumb:

     · `erratumBlocks`  — one erratum → the ordered blocks to paint.
     · `scopeErrata`    — twelve errata + a character → which bite NOW.

   WHY `erratumBlocks` EXISTS AT ALL, rather than the component reading fields.
   Gate 1 decision 3 promised the player THREE READINGS of every erratum: as
   written, narrower, recommended. Slice 6 measured the corpus and found that
   promise unkeepable — **one** of the twelve carries `narrowerAlternative`
   (finding AA). A component that reaches for `e.narrowerAlternative` directly
   paints `undefined` into a band that claims to offer a choice, eleven times
   out of twelve.

   The shape Marcus approved on 2026-08-27 replaces it: **fault → canon's
   recommended fix → what the app is doing about it.** Two of those three are
   universal — `problem` and `appAction` are on all twelve — and `recommendedFix`
   is on eleven. The exception is worth knowing rather than patching over:
   HEARTH-11 has no recommended fix because canon judged Swift Flame "strong but
   defensible" and wants nothing changed. It supplies `mitigatingFactor` and
   `assessment` in its place, which is canon SAYING SO rather than falling
   silent. So nothing here may assume a fix block exists.

   Every field renders WHEN CANON HAS IT and is absent otherwise — the same
   open-world rule the rest of this phase runs on: the app states what the
   corpus says and never manufactures the difference.

   (The "all three, always" claim was in the first draft of this file and of the
   slice text. `errata.test.ts` went red on it immediately. The scope was
   corrected to the corpus rather than the corpus assumed to match the scope,
   which is the only reason that assertion was worth writing down.)
   ────────────────────────────────────────────────────────────────────────── */
import type { CanonErratum } from './types'
import { OATH } from '../../canon'

/** Which field a block came from. The component switches on this for tone —
 *  `problem` is the bad news, `appAction` is what Marcus's app is doing about
 *  it — so it must survive the trip out of here as data, not as a CSS class. */
export type ErratumBlockKind =
  | 'problem'
  | 'cause'
  | 'recommendedFix'
  | 'narrowerAlternative'
  | 'appAction'
  | 'comparison'
  | 'assessment'
  | 'mitigatingFactor'
  | 'note'

export interface ErratumBlock {
  kind: ErratumBlockKind
  /** The heading Marcus reads. Plain English, never the field name — nobody at
   *  a table knows what a `mitigatingFactor` is. */
  label: string
  text: string
}

/* The order is the reading order, and it is deliberate:

     1. What's wrong          — the fault, always first, always present
     2. Why it's wrong        — canon's own diagnosis, 1 record has it
     3. Canon's fix           — the recommendation, always present
     4. A narrower fix        — HEARTH-01 only; the promised third reading,
                                painted exactly where canon supplies one
     5. What this app does    — always present, and the reason the flag is
                                actionable rather than merely alarming

   Then canon's supporting reasoning, which is genuinely useful and genuinely
   secondary — it is why the author graded the severity the way they did.

   Kept as an ARRAY rather than a switch in the component so the order lives in
   one place and the tests can assert it. */
const BLOCK_ORDER: { kind: ErratumBlockKind; label: string }[] = [
  { kind: 'problem', label: "What's wrong" },
  { kind: 'cause', label: 'Why it went wrong' },
  { kind: 'recommendedFix', label: "Canon's recommended fix" },
  { kind: 'narrowerAlternative', label: 'A narrower fix canon also offers' },
  { kind: 'appAction', label: 'What this app does about it' },
  { kind: 'comparison', label: 'How it compares to official rules' },
  { kind: 'assessment', label: "Canon's assessment" },
  { kind: 'mitigatingFactor', label: 'What makes it less bad' },
  { kind: 'note', label: 'Also worth knowing' },
]

/** One erratum, as the ordered blocks to paint.
 *
 *  Absent fields are DROPPED, never rendered empty. Whitespace-only strings
 *  count as absent — a record that carries `"cause": " "` should not open a
 *  headed block onto nothing, and canon is hand-authored JSON. */
export function erratumBlocks(erratum: CanonErratum): ErratumBlock[] {
  const blocks: ErratumBlock[] = []
  for (const { kind, label } of BLOCK_ORDER) {
    const raw = erratum[kind]
    if (typeof raw !== 'string') continue
    const text = raw.trim()
    if (!text) continue
    blocks.push({ kind, label, text })
  }
  return blocks
}

/** The bare feature name canon files an erratum under.
 *
 *  Canon writes `feature` three ways, and all three appear in the twelve:
 *    "Smoldering Smite (level 15)"
 *    "Oath Spells (level 5)"
 *    "Hearth Warden (level 20) - Punishing Flame"
 *  The name is everything before the first parenthesis; the trailing " - X" on
 *  the level-20 records is a sub-part of the same feature, so cutting at the
 *  paren gets all three right in one rule. */
export function erratumFeatureName(erratum: CanonErratum): string {
  return erratum.feature.replace(/\s*\(.*$/, '').trim()
}

/** The level canon says the feature is gained at, parsed from `(level N)`.
 *  Null when canon did not write one — which is a real possibility this code
 *  does not get to assume away. */
export function erratumCanonLevel(erratum: CanonErratum): number | null {
  const m = /\(level\s+(\d+)\)/i.exec(erratum.feature)
  return m ? Number(m[1]) : null
}

export interface ErratumScope {
  erratum: CanonErratum
  /** Where the level came from, because the two sources disagree in principle
   *  and a reader deserves to know which one answered. */
  levelSource: 'sheet' | 'canon' | 'unknown'
  featureLevel: number | null
  /** True when this erratum describes something the character can do TODAY. */
  live: boolean
}

interface LevelledFeature {
  name: string
  level: number
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Split the twelve into what bites now and what bites later.
 *
 *  THE SHEET IS ASKED FIRST, canon second. Nix's sheet carries all nine
 *  subclass features — including Smoldering Smite (15) and Hearth Warden (20)
 *  at character level 8 — each tagged with the level it is gained at. That
 *  field is the character's own truth and it is what the rest of the app reads,
 *  so an erratum's liveness must agree with it or the app contradicts itself.
 *  Canon's parenthetical is the fallback for features the sheet has no row for
 *  at all: "Oath Spells" is not a feature name, it is a category, and HEARTH-08
 *  would otherwise be homeless.
 *
 *  WHEN NEITHER SOURCE KNOWS, THE ERRATUM IS LIVE. That asymmetry is on
 *  purpose. Hiding a rules problem because the data was thin is the failure
 *  mode this whole phase exists to kill — showing one early costs a line of
 *  screen, hiding one costs Marcus an argument at the table. Same reasoning as
 *  the open-world rule in `lookup.ts`: never let a lookup gate a capability. */
export function scopeErrata(
  features: readonly LevelledFeature[],
  characterLevel: number,
  errata: readonly CanonErratum[] = OATH.errata,
): ErratumScope[] {
  const sheet = new Map<string, number>()
  for (const f of features) {
    /* First wins. A sheet with the same feature twice is a sheet problem, and
       the earlier row is the one every other reader of `features` sees. */
    const key = norm(f.name)
    if (!sheet.has(key)) sheet.set(key, f.level)
  }

  return errata.map((erratum) => {
    const sheetLevel = sheet.get(norm(erratumFeatureName(erratum)))
    if (typeof sheetLevel === 'number') {
      return {
        erratum,
        levelSource: 'sheet' as const,
        featureLevel: sheetLevel,
        live: sheetLevel <= characterLevel,
      }
    }
    const canonLevel = erratumCanonLevel(erratum)
    if (canonLevel != null) {
      return {
        erratum,
        levelSource: 'canon' as const,
        featureLevel: canonLevel,
        live: canonLevel <= characterLevel,
      }
    }
    return { erratum, levelSource: 'unknown' as const, featureLevel: null, live: true }
  })
}

/** Severity, ordered worst-first, for sorting. Exported because the band and
 *  its tests must agree on what "worst" means. */
export const SEVERITY_RANK = { BREAKING: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const

/** The live errata, worst first, then by id so the order is stable between
 *  renders and between runs of the prover. */
export function liveErrata(
  features: readonly LevelledFeature[],
  characterLevel: number,
  errata: readonly CanonErratum[] = OATH.errata,
): ErratumScope[] {
  return scopeErrata(features, characterLevel, errata)
    .filter((s) => s.live)
    .sort((a, b) =>
      SEVERITY_RANK[a.erratum.severity] - SEVERITY_RANK[b.erratum.severity] ||
      a.erratum.id.localeCompare(b.erratum.id))
}

/** The ones that arrive later, in the order they will arrive — soonest first,
 *  because "what do I get next" is the question this list actually answers. */
export function laterErrata(
  features: readonly LevelledFeature[],
  characterLevel: number,
  errata: readonly CanonErratum[] = OATH.errata,
): ErratumScope[] {
  return scopeErrata(features, characterLevel, errata)
    .filter((s) => !s.live)
    .sort((a, b) =>
      (a.featureLevel ?? 99) - (b.featureLevel ?? 99) ||
      a.erratum.id.localeCompare(b.erratum.id))
}
