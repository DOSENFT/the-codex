/* "The rolls" — band 3 of the option detail sheet.
 *
 * ── WHY THIS DOES NOT READ `option.dice` ────────────────────────────────────
 * The obvious implementation is one line: put `option.dice` on a button. It is
 * also wrong, and measurably so. Asked what these three options roll, the field
 * answers:
 *
 *     Shield of Faith   1d20+8
 *     Misty Step        1d20+8
 *     Warding Bond      1d20+8
 *
 * None of them makes an attack roll. Canon agrees — all three carry
 * `attackRoll: null, damage: null, healing: null, save: null`. `option.dice`
 * is carrying two different meanings in one field (sometimes the roll you make,
 * sometimes a to-hit bonus stamped on regardless) and one of them is a fiction.
 * A button offering to roll a d20 for Misty Step is worse than no button: it
 * teaches a rule that does not exist, at a table, mid-fight.
 *
 * So the offers are computed from canon's STRUCTURED fields — `attackRoll`,
 * `damage`, `healing` — and, when canon does not know the option, from the
 * segments the sheet itself declared. Never from `option.dice`. `rolls.test.ts`
 * pins Shield of Faith at zero attack offers so this cannot regress quietly.
 *
 * ── WHY A CRIT BUTTON IS NOT ALWAYS OFFERED ─────────────────────────────────
 * Critical hits happen on attack rolls. A save-based spell — Sacred Flame,
 * Fireball — has no crit, so a crit button beside it invents a rule. The crit
 * offer therefore appears only where an attack roll also appears. Under 2024 a
 * crit doubles the DICE and leaves the modifier alone; `critNotation` refuses
 * any expression it cannot double honestly rather than guessing.
 *
 * Table Truth slice 7. */

import type { CanonSpell } from '../canon/types'
import { scaleDice, type CasterContext } from '../canon/format'

export interface RollOffer {
  /** Stable within one option — a React key and a test handle. */
  key: string
  /** The small line under the notation: "to hit", "roll damage", "on a crit". */
  label: string
  /** What gets rolled, e.g. "1d20+8", "2d8", "4d8". Always a clean expression;
   *  anything canon could not express as dice is left to the other bands. */
  notation: string
  kind: 'attack' | 'damage' | 'heal' | 'crit'
}

/** A clean expression: dice, optionally a flat modifier. Nothing else. */
const CLEAN = /^(\d+)d(\d+)([+-]\d+)?$/

/** 2024: a critical hit doubles the number of DICE and does not touch the
 *  modifier. Returns null for anything that is not a clean NdX(+M) — a
 *  compound or prose expression is handed back as "cannot say" rather than
 *  doubled by a rule this function had to invent. */
export function critNotation(notation: string): string | null {
  const m = CLEAN.exec(notation.trim())
  if (!m) return null
  const [, count, faces, mod] = m
  return `${Number(count) * 2}d${faces}${mod ?? ''}`
}

/** A damage type worth printing in a button label. Canon puts prose in this
 *  field for two records ("chosen: Acid, Cold, Fire, Lightning, or Thunder"),
 *  and a button reading "roll chosen: Acid, Cold…" is a worse button. */
function cleanType(type: string | undefined): string | null {
  const clean = (type ?? '').trim()
  if (clean.length === 0 || clean.length > 18) return null
  return /^[A-Za-z +/]+$/.test(clean) ? clean : null
}

export interface RollSource {
  /** The sheet's own one-line detail — the open-world fallback. */
  detail: string
  /** Canon's record, when canon knows this option. */
  spell?: CanonSpell | null
  /** Extra already-declared strings to read by the same shape rules.
   *
   *  This exists because canon's FEATURE records have no structured roll fields
   *  at all — a feature is `rawText` plus a free-form `mechanics` bag, and the
   *  dice live in there as strings like "1d10 Fire damage in retaliation".
   *  Without this, Hearthfire Manifest — a feature canon knows perfectly well —
   *  offered zero roll buttons while its retaliation die sat one band above,
   *  printed and unrollable. Being KNOWN to canon was making the option worse,
   *  which is the open-world rule failing in the other direction. */
  segments?: readonly string[]
  ctx: CasterContext
}

/* ── The open-world fallback ────────────────────────────────────────────────
 * When canon has nothing, the sheet's own detail is the source of truth. It is
 * ' · '-separated and its segments have recognisable shapes:
 *
 *     "+7 to hit (STR +3 + prof +1 magic)"   → an attack roll
 *     "1d8+4 Slashing"                       → damage
 *     "5 ft" / "Magical"                     → neither, and left alone
 *
 * SHAPE, never a name. A homebrew option written the same way works with no
 * edit here. A segment that matches nothing contributes no button, which is the
 * correct answer rather than a failure. */
const TO_HIT = /^\+(\d+)\s+to\s+hit\b/i
const LEADING_DICE = /^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(.*)$/

function fromDetail(detail: string, extra: readonly string[], offers: RollOffer[]): void {
  const segments = [
    ...detail.split('·').map(s => s.trim()),
    ...extra.map(s => s.trim()),
  ].filter(Boolean)

  for (const segment of segments) {
    const hit = TO_HIT.exec(segment)
    if (hit) {
      offers.push({
        key: 'attack',
        label: 'to hit',
        notation: `1d20+${hit[1]}`,
        kind: 'attack',
      })
      continue
    }

    const dice = LEADING_DICE.exec(segment)
    if (dice) {
      // "1d8 + 4" and "1d8+4" are the same roll; the dice roller wants one form.
      const notation = dice[1].replace(/\s+/g, '')
      const trailing = dice[2].trim()
      // "1d10 Fire retaliation" → "roll Fire"; "1d8+4" alone → "roll damage".
      const named = cleanType(trailing.split(/\s+/)[0])
      offers.push({
        key: `damage-${offers.length}`,
        label: named ? `roll ${named}` : 'roll damage',
        notation,
        kind: 'damage',
      })
    }
  }
}

/* ── Canon's structured fields ────────────────────────────────────────────── */

function fromCanon(spell: CanonSpell, ctx: CasterContext, offers: RollOffer[]): void {
  if (spell.attackRoll) {
    offers.push({
      key: 'attack',
      label: 'to hit',
      notation: `1d20+${ctx.spellAttackBonus}`,
      kind: 'attack',
    })
  }

  if (spell.damage) {
    const scaled = scaleDice(spell.damage.dice, spell.level === 0, ctx.characterLevel)
    const named = cleanType(spell.damage.type)
    const label = named ? `roll ${named}` : 'roll damage'

    if (scaled.joiner === '+' && scaled.expressions.length > 1) {
      // Canon said "plus": both are rolled, so it is one button.
      offers.push({
        key: 'damage',
        label,
        notation: scaled.expressions.join('+'),
        kind: 'damage',
      })
    } else {
      // Alternatives: one button each, because the caster picks one.
      scaled.expressions.forEach((notation, i) => {
        offers.push({
          key: scaled.expressions.length > 1 ? `damage-${i}` : 'damage',
          label,
          notation,
          kind: 'damage',
        })
      })
    }
  }

  if (spell.healing?.dice) {
    const mod = spell.healing.mod ? ctx.abilityMod : 0
    const notation = mod > 0 ? `${spell.healing.dice}+${mod}` : spell.healing.dice
    offers.push({ key: 'heal', label: 'roll healing', notation, kind: 'heal' })
  }
}

/** Every roll this option actually offers, in one fixed order: to hit, damage,
 *  the crit that doubles that damage, then healing. The crit sits next to the
 *  expression it doubles so the pair reads as one thought. */
export function rollOffers(source: RollSource): RollOffer[] {
  const offers: RollOffer[] = []

  if (source.spell) fromCanon(source.spell, source.ctx, offers)
  else fromDetail(source.detail ?? '', source.segments ?? [], offers)

  // The crit rides on the FIRST damage expression, and only where an attack
  // roll exists to crit on. See the header.
  const attacks = offers.some(o => o.kind === 'attack')
  const firstDamage = offers.find(o => o.kind === 'damage')
  if (attacks && firstDamage) {
    const crit = critNotation(firstDamage.notation)
    if (crit) offers.push({ key: 'crit', label: 'on a crit', notation: crit, kind: 'crit' })
  }

  // The sheet's detail and canon's mechanics bag often name the SAME die —
  // "1d10 Fire retaliation" appears in both for the cloak. Two identical
  // buttons is not a second roll, it is a UI that looks broken.
  const seen = new Set<string>()
  const unique = offers.filter(o => {
    const key = `${o.kind}:${o.notation}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const RANK = { attack: 0, damage: 1, crit: 2, heal: 3 } as const
  return unique.sort((a, b) => RANK[a.kind] - RANK[b.kind])
}
