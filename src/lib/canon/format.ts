/* Canon fields → the row's mechanics line, and the detail sheet's stat block.
 *
 * Gate 1 decision 4: "Numbers only in the row, prose in the detail." This file
 * is where that promise is kept or broken, so it is worth stating exactly what
 * it does and — more importantly — what it refuses to do.
 *
 * ── THE THING THAT IS NOT TRUE ─────────────────────────────────────────────
 * Gate 1 assumed canon's fields are structured. They are ~92% structured. Six
 * of the 71 spell records put PROSE in `damage.dice`:
 *
 *   Sacred Flame     "1d8 (2d8 at character level 5, 3d8 at 11, 4d8 at 17)"
 *   Toll the Dead    "1d8, or 1d12 if the target is missing any Hit Points
 *                     (scales at character levels 5, 11, 17)"
 *   Word of Radiance "1d6 (scales at character levels 5, 11, 17)"
 *   Scorching Ray    "2d6 per ray, 3 rays"
 *   Destructive Wave "5d6 Thunder plus 5d6 Radiant or Necrotic (your choice)"
 *   Flame Strike     "5d6 Fire plus 5d6 Radiant"
 *
 * The dangerous one is cantrip scaling. Naively taking the leading die would
 * print "1d8" for Toll the Dead — and Nix is level 7, so the true damage is
 * 2d8. An app that shows a level-1 die to a level-7 player at a table is worse
 * than an app that shows nothing.
 *
 * ── THE THREE RULES THIS FILE USES INSTEAD ─────────────────────────────────
 * 1. SCALING IS COMPUTED, NEVER READ. Superseded scaling parentheticals are
 *    stripped first, then the 2024 cantrip tier (×1 / ×2 at 5 / ×3 at 11 /
 *    ×4 at 17, by CHARACTER level) multiplies the die count. The prose that
 *    described the scaling is thrown away because the app now does the job.
 * 2. THE ROW MAY BE INCOMPLETE; IT MAY NEVER BE WRONG. Where a dice string
 *    carries a qualifier the row cannot render structurally, the row shows the
 *    die expressions and drops the qualifier, and sets `qualified: true`. The
 *    detail sheet shows canon's string verbatim. "▸" is what incompleteness
 *    is for; an ellipsis is what it is not.
 * 3. NOTHING IS EVER TRUNCATED. If the assembled line exceeds the row budget,
 *    whole low-priority SEGMENTS are dropped — never characters, never a word
 *    cut in half. What was dropped is returned in `dropped[]` so the match
 *    report can count it rather than hide it.
 *
 * No spell is recognised by name anywhere in this file. (The open-world rule.)
 *
 * Table Truth slice 1. See docs/plans/table-truth/03-program-design.md. */

import type { CanonSpell } from './types'

/** The character's numbers. Canon cannot supply these: character-marcus.json
 *  has `abilityScores.needsInput === true` and its spellSaveDC is the STRING
 *  "8 + 3 + Charisma modifier". The DC on screen always comes from the sheet. */
export interface CasterContext {
  spellSaveDC: number
  spellAttackBonus: number
  /** CHARACTER level, which is what 2024 cantrip scaling keys off — not class
   *  level and not spell level. */
  characterLevel: number
  /** The spellcasting ability modifier, for healing's `mod` field. */
  abilityMod: number
}

export interface MechanicsLine {
  /** The rendered line. ' · '-joined. Never empty, never ellipsised. */
  text: string
  /** True when canon carried a qualifier the row could not render. The detail
   *  sheet has the full string; the row is short by design, not by accident. */
  qualified: boolean
  /** Segment kinds dropped to fit the budget. Empty for 65 of the 71 spells. */
  dropped: string[]
}

/* The row is 12px monospace in a ~358px content column, less the ▸ affordance.
 * Measured from the Gate 1 mockup at a 390px viewport: 46 characters is the
 * last width that cannot wrap onto a third line. Two lines is a promise. */
export const ROW_BUDGET_CHARS = 46

const SEP = ' · '

/* ── Small structural helpers ───────────────────────────────────────────── */

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

/** "Dexterity" → "DEX". First three letters, uppercased — correct for all six
 *  abilities, and canon uses only the five it needs. No lookup table. */
function abilityAbbrev(ability: string): string {
  return ability.slice(0, 3).toUpperCase()
}

/** 2024: cantrip damage steps up at CHARACTER levels 5, 11 and 17. */
export function cantripTier(characterLevel: number): number {
  if (characterLevel >= 17) return 4
  if (characterLevel >= 11) return 3
  if (characterLevel >= 5) return 2
  return 1
}

const DIE = /\b(\d+)d(\d+)\b/g

/** Remove parentheticals that describe scaling. They are superseded the moment
 *  cantripTier() does the arithmetic, and leaving them in would double-apply. */
function stripScalingParentheticals(dice: string): string {
  return dice.replace(/\s*\([^)]*(?:scales|character level)[^)]*\)/gi, '').trim()
}

/** "60 feet" → "60 ft". Whole-word only, so "feet" inside a parenthetical that
 *  we are about to reuse as an area label is handled by the same rule. */
function compactFeet(s: string): string {
  return s.replace(/\bfoot\b/g, 'ft').replace(/\bfeet\b/g, 'ft').replace(/-foot\b/g, '-ft')
}

/** "Concentration, up to 1 minute" → "Conc 1 min". Unit words only; no other
 *  editing, so an unrecognised duration passes through as canon wrote it. */
function compactDuration(duration: string, concentration: boolean): string {
  let d = duration
    .replace(/^Concentration,\s*up to\s*/i, '')
    .replace(/^Up to\s*/i, '')
    .replace(/\bminutes?\b/gi, 'min')
    .replace(/\bhours?\b/gi, 'hr')
    .replace(/\brounds?\b/gi, 'rd')
    .replace(/\bdays?\b/gi, 'd')
    .replace(/^Instantaneous$/i, 'Instant')
    .trim()
  if (concentration) d = `Conc ${d}`
  return d
}

/* ── Range → an area segment or a range segment, never both ─────────────── */

interface RangeParts {
  area?: string
  range?: string
}

/** Canon writes areas inside the range field: "Self (30-foot Emanation)".
 *  A bare "Self" is dropped — it costs three characters and tells a player
 *  nothing they did not already know from tapping their own spell. */
function splitRange(range: string): RangeParts {
  const emanation = /^Self\s*\((.+)\)$/i.exec(range.trim())
  if (emanation) return { area: compactFeet(emanation[1].trim()) }
  if (/^Self$/i.test(range.trim())) return {}
  return { range: compactFeet(range.trim()) }
}

/* ── Dice ───────────────────────────────────────────────────────────────── */

interface DiceParts {
  text: string
  qualified: boolean
}

/** Turn canon's `damage.dice` into die expressions and nothing else.
 *
 *  The joiner is taken from canon's own connective: "plus" means the caster
 *  rolls both ("5d6+5d6"), anything else linking two expressions means a
 *  choice between them ("2d8/2d12"). That is read off the string, not decided
 *  here — which is the difference between structure and authoring. */
export interface ScaledDice {
  /** Each die expression with cantrip scaling already applied. Empty when canon
   *  put prose here instead of dice. */
  expressions: string[]
  /** '+' means canon said "plus" and the caster rolls BOTH. '/' means the
   *  expressions are alternatives and the caster rolls ONE. Read off canon's own
   *  connective, never decided here. */
  joiner: '+' | '/'
  /** Canon carried a qualifier this cannot represent as dice. */
  qualified: boolean
}

/** The scaling arithmetic, extracted at slice 7 so the list row and the detail
 *  sheet's roll buttons cannot drift apart about what a cantrip does at level 7.
 *  One computation with two readers beats two computations that must agree. */
export function scaleDice(
  damageDice: string,
  isCantrip: boolean,
  characterLevel: number
): ScaledDice {
  const stripped = stripScalingParentheticals(damageDice)
  const tier = isCantrip ? cantripTier(characterLevel) : 1

  const expressions: string[] = []
  for (const m of stripped.matchAll(DIE)) {
    expressions.push(`${Number(m[1]) * tier}d${m[2]}`)
  }
  const residue = stripped.replace(DIE, '').trim()

  // No die expression at all — canon put something else entirely here. Hand the
  // whole thing to the detail sheet rather than inventing a number.
  if (expressions.length === 0) return { expressions, joiner: '/', qualified: true }

  // Anything left over besides the connective words is a qualifier the row is
  // deliberately not rendering: "per ray, 3 rays", "if the target is missing
  // any Hit Points", "or Necrotic (your choice)".
  const leftover = residue.replace(/\b(plus|or|and|,)\b/gi, '').replace(/[,\s]+/g, '')
  return {
    expressions,
    joiner: /\bplus\b/i.test(residue) ? '+' : '/',
    qualified: leftover.length > 0,
  }
}

function renderDice(damageDice: string, isCantrip: boolean, characterLevel: number): DiceParts {
  const scaled = scaleDice(damageDice, isCantrip, characterLevel)
  if (scaled.expressions.length === 0) return { text: '', qualified: true }
  return { text: scaled.expressions.join(scaled.joiner), qualified: scaled.qualified }
}

/** Canon's one `damage.bonus`: "+1d8 if the target is a Fiend or Undead".
 *
 *  Rendered as the leading die plus the Capitalised game terms that follow it —
 *  2024 style Capitalises defined terms (Fiend, Undead, Prone, Frightened), so
 *  case is a real structural signal here, not a guess about meaning. If that
 *  yields nothing, or more than three terms, the row shows the bare die and the
 *  condition stays in the detail sheet. Exactly one record of 71 uses this. */
function renderBonus(bonus: string): string | undefined {
  const die = /^\+?\s*(\d+d\d+)/.exec(bonus.trim())
  if (!die) return undefined
  const tail = bonus.slice(die[0].length)
  const terms = tail.match(/\b[A-Z][a-z]+\b/g) ?? []
  if (terms.length === 0 || terms.length > 3) return `+${die[1]}`
  return `+${die[1]} ${terms.join('/')}`
}

/** `damage.type` is prose in two records too — found by test 8, not by reading:
 *
 *    Elemental Weapon  "chosen: Acid, Cold, Fire, Lightning, or Thunder"
 *    Fire Shield       "Fire or Cold (matching the shield you chose)"
 *
 *  A clean type passes through verbatim, which preserves canon's own operators
 *  ("Thunder + Radiant/Necrotic" means both, and the + says so). A dirty one
 *  falls back to its Capitalised game terms, and if there are more than three
 *  of those the row shows the dice with no type at all. Bare dice is thin;
 *  bare dice is not wrong. */
function renderDamageType(type: string): DiceParts {
  const clean = type.trim()
  if (clean.length <= 26 && /^[A-Za-z +/]+$/.test(clean)) return { text: clean, qualified: false }

  const terms = clean.match(/\b[A-Z][a-z]+\b/g) ?? []
  if (terms.length === 0 || terms.length > 3) return { text: '', qualified: true }
  return { text: terms.join('/'), qualified: true }
}

function renderHealing(spell: CanonSpell, ctx: CasterContext): string | undefined {
  const h = spell.healing
  if (!h?.dice) return undefined
  const mod = h.mod ? signed(ctx.abilityMod) : ''
  return `heal ${h.dice}${mod}`
}

/* ── The line ───────────────────────────────────────────────────────────── */

interface Segment {
  kind: string
  text: string
}

/* Fixed display order, so the eye learns one shape and stops reading:
 * to-hit → dice → heal → save → area → range → concentration → rider. */
const ORDER = ['attack', 'dice', 'heal', 'save', 'area', 'range', 'conc', 'rider'] as const

/* Drop order when the line will not fit, lowest value first. `attack`, `dice`
 * and `heal` are never dropped: they are the numbers you cannot play without.
 * `save` sits just above them because a DC you cannot see is a turn you cannot
 * resolve. */
const DROP_ORDER = ['rider', 'range', 'area', 'conc', 'save'] as const

/** The row's line 2. Structured facts only, never a sentence, never truncated. */
export function mechanicsLine(spell: CanonSpell, ctx: CasterContext): MechanicsLine {
  const segments: Segment[] = []
  let qualified = false

  if (spell.attackRoll) segments.push({ kind: 'attack', text: signed(ctx.spellAttackBonus) })

  if (spell.damage) {
    const d = renderDice(spell.damage.dice, spell.level === 0, ctx.characterLevel)
    const t = renderDamageType(spell.damage.type)
    if (d.qualified || t.qualified) qualified = true
    if (d.text) segments.push({ kind: 'dice', text: `${d.text} ${t.text}`.trim() })
    if (spell.damage.note) qualified = true
  }

  const heal = renderHealing(spell, ctx)
  if (heal) segments.push({ kind: 'heal', text: heal })
  if (spell.healing && (!heal || spell.healing.note || spell.healing.targets)) qualified = true

  if (spell.save) {
    segments.push({ kind: 'save', text: `DC ${ctx.spellSaveDC} ${abilityAbbrev(spell.save.ability)}` })
    // The effect ("half damage", "negates the push and Prone only") is prose
    // and stays in the detail sheet. The DC is the number you need mid-turn.
    qualified = true
  }

  const { area, range } = splitRange(spell.range)
  if (area) segments.push({ kind: 'area', text: area })
  if (range) segments.push({ kind: 'range', text: range })

  // Duration, whenever there is one worth knowing. "Instantaneous" is not — it
  // is the default and it costs a segment to say nothing. Everything else is a
  // clock the table has to track, and concentration is the one that also says
  // "you can only hold one of these".
  if (spell.concentration || !/^Instantaneous$/i.test(spell.duration)) {
    segments.push({ kind: 'conc', text: compactDuration(spell.duration, spell.concentration) })
  }

  if (spell.damage?.bonus) {
    const rider = renderBonus(spell.damage.bonus)
    if (rider) segments.push({ kind: 'rider', text: rider })
    else qualified = true
  }

  // Guaranteed non-empty (test 9). Nothing in canon reaches this today; it is
  // here so that a future canon package with a stranger record still renders a
  // row rather than a blank line.
  if (segments.length === 0) {
    segments.push({ kind: 'conc', text: compactDuration(spell.duration, false) })
  }

  segments.sort((a, b) => ORDER.indexOf(a.kind as never) - ORDER.indexOf(b.kind as never))

  // Drop whole segments — never characters — until it fits.
  const dropped: string[] = []
  let kept = segments
  for (const kind of DROP_ORDER) {
    if (join(kept).length <= ROW_BUDGET_CHARS) break
    const before = kept.length
    kept = kept.filter(s => s.kind !== kind)
    if (kept.length !== before) dropped.push(kind)
  }

  if (dropped.length > 0) qualified = true
  return { text: join(kept), qualified, dropped }
}

function join(segments: Segment[]): string {
  return segments.map(s => s.text).join(SEP)
}

/* ── The detail sheet's stat block ──────────────────────────────────────── */

/** "V, S, M (a pinch of soot)" — canon's component bag as one line.
 *
 *  Exported in Open Book slice 5 because `prepare/toggle.ts` needs the same
 *  string for the other direction: the sheet's `Spell.components` is a display
 *  string, so a canon record being converted onto the sheet has to produce one.
 *  Shared rather than copied on purpose — two formatters for one field drift,
 *  and the drift reads as a spell whose components change depending on which
 *  screen he opened it from. */
export function renderComponents(spell: CanonSpell): string {
  const c = spell.components
  const letters = [c.v && 'V', c.s && 'S', c.m && 'M'].filter(Boolean).join(', ')
  if (c.m && c.materialText) {
    const consumed = c.materialConsumed ? ', consumed' : ''
    return `${letters} (${c.materialText}${consumed})`
  }
  return letters || '—'
}

/** Band 1 of the detail sheet: canon's fields as printed, nothing compacted.
 *  The row is where space is scarce; here it is not, so nothing is abbreviated
 *  and nothing is dropped. */
export function statBlock(spell: CanonSpell): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    {
      label: 'Level',
      value: spell.level === 0 ? `${spell.school} cantrip` : `Level ${spell.level} ${spell.school}`,
    },
    { label: 'Casting Time', value: spell.castingTime },
    { label: 'Range', value: spell.range },
    { label: 'Components', value: renderComponents(spell) },
    { label: 'Duration', value: spell.duration },
  ]

  if (spell.trigger) rows.push({ label: 'Trigger', value: spell.trigger })
  if (spell.attackRoll) rows.push({ label: 'Attack', value: spell.attackRoll })

  if (spell.damage) {
    const parts = [spell.damage.dice, spell.damage.type].filter(Boolean).join(' ')
    const extra = [spell.damage.bonus, spell.damage.note].filter(Boolean).join('; ')
    rows.push({ label: 'Damage', value: extra ? `${parts} (${extra})` : parts })
  }

  if (spell.healing) {
    const h = spell.healing
    const value = [h.dice && `${h.dice}${h.mod ? ` + ${h.mod}` : ''}`, h.targets, h.note]
      .filter(Boolean)
      .join(' — ')
    rows.push({ label: 'Healing', value })
  }

  if (spell.save) {
    const when = spell.save.when ? ` (${spell.save.when})` : ''
    rows.push({ label: 'Save', value: `${spell.save.ability} — ${spell.save.effect}${when}` })
  }

  if (spell.concentration) rows.push({ label: 'Concentration', value: 'Yes — one at a time' })
  if (spell.ritual) rows.push({ label: 'Ritual', value: 'Yes' })
  if (spell.higherLevel) rows.push({ label: 'Higher Level', value: spell.higherLevel })
  if (spell.grantedBy) rows.push({ label: 'Granted by', value: spell.grantedBy })
  rows.push({ label: 'Source', value: spell.source })

  return rows
}
