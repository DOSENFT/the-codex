/* Preparing a spell, the way canon's five rules actually work.
 *
 * Open Book slice 5. Pure — a character in, a new character out, no storage
 * touched. `GrimoirePage` owns the write; this owns the decision.
 *
 * ── THE NUMBER THE APP HAS BEEN GETTING WRONG ───────────────────────────────
 *
 * Every prepared-count in this app is `spells.filter(s => s.prepared && s.level
 * > 0).length` — six call sites, all the same shape, all wrong for a Paladin of
 * the Hearth. For Nix it says **6 of 7**. Canon's rule 4 says four of those six
 * do not count:
 *
 *     Bless            L1  counts
 *     Shield of Faith  L1  counts
 *     Burning Hands    L1  Oath grant — rule 4 says it does NOT count
 *     Faerie Fire      L1  Oath grant — does not count
 *     Scorching Ray    L2  Oath grant — does not count
 *     Warding Bond     L2  Oath grant — does not count
 *
 * The true figure is **2 of 7**. He has five free slots and the app has been
 * telling him he has one. That is not a rounding error in a status line; it is
 * the app talking him out of preparing spells he is entitled to.
 *
 * ── WHY THIS READS CANON'S OWN FIELD ────────────────────────────────────────
 *
 * `countsAgainstPreparedLimit` is on all 71 spell records and partitions them
 * exactly: 50 true, 12 always-prepared false, 9 Blessed Warrior cantrips false.
 * Canon shipped the answer to rules 4 and 5 as DATA. Re-deriving it here from
 * `alwaysPrepared || level === 0` would give the same answer today and would be
 * a second source of truth about it tomorrow. `toggle.test.ts` pins that the
 * two agree across all 71, so a canon package that disagrees goes red rather
 * than quiet.
 *
 * ── WHERE THIS DEPARTS FROM GATE 3, AND WHY ─────────────────────────────────
 *
 * Gate 3 (`03-program-design.md`) enumerates three refusal codes and puts
 * "already prepared? → unprepare, always ok" at the TOP of the call stack.
 * Both are amended here, and the amendment is not cosmetic:
 *
 *  1. **`'granted'`, a fourth code.** Warding Bond is on Nix's sheet with
 *     `prepared: true` because the Oath grants it permanently. Under Gate 3's
 *     order, a tap on it hits the unprepare branch first and takes away a spell
 *     canon says he always has. Checked BEFORE unprepare, so it cannot.
 *  2. **`'not-a-spell'`, a fifth.** `togglePrepared` is keyed by name. Handed
 *     "Aura of Protection" it would otherwise fall through every guard and
 *     return `ok: true` having changed nothing — a silent no-op, which is the
 *     exact fault class this phase keeps finding. It refuses instead.
 *
 * Both are deferred to ASSERTIONS, not to this paragraph: `toggle.test.ts` has
 * a case per code that goes red if the branch is removed. (The lesson of slice
 * 4 — a number in a proof that nothing could falsify is not a proof.)
 *
 * ── THE OPEN-WORLD RULE STILL HOLDS ─────────────────────────────────────────
 *
 * A spell canon has never heard of is preparable. It counts against the cap if
 * it is not a cantrip, because a prepared homebrew level-1 spell occupies a
 * prepared-spell place whatever its provenance. Canon widens the answer here;
 * it never gates it. */

import { PREPARED_SPELL_RULES } from '../../canon'
import type { CanonSpell } from '../canon/types'
import { normalizeName, spellByName, isUnlocked } from '../canon/lookup'
import { renderComponents } from '../canon/format'
import type { Character, Spell } from '../character'

/* ── Canon's rules, by index ────────────────────────────────────────────────
 *
 * Positional, because canon's array is ordered and `PREPARED_SPELL_RULES` is
 * quoted verbatim rather than parsed. A canon package that drops or reorders
 * them makes `the five rules are canon's five rules` go red; until someone
 * looks at that, a refusal quotes nothing rather than quoting the wrong rule.
 * An empty string here is rendered as no quote at all — see PrepareRefusal. */
const RULE_CAP = 0
const RULE_SLOT_LEVEL = 1
const RULE_LONG_REST_SWAP = 2
const RULE_GRANTED = 3
const RULE_CANTRIP = 4

function ruleAt(index: number): string {
  return PREPARED_SPELL_RULES[index] ?? ''
}

/** Canon's rule 3, the sentence Marcus was reaching for: "i think on long rests
 *  i can swap out a spell or something." Exported because the refusal card and
 *  the rules panel both say it, and a cap refusal that does not tell you the way
 *  out is a wall rather than an answer. */
export const LONG_REST_SWAP_RULE = ruleAt(RULE_LONG_REST_SWAP)

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type PrepareRefusal =
  /** Rule 1. `rule` is canon's sentence, verbatim. */
  | { code: 'cap'; max: number; rule: string; swapRule: string }
  /** Rule 2. */
  | { code: 'no-slots'; spellLevel: number; rule: string }
  /** Rules 4 and 5 — canon gives it to him outright, so there is nothing to
   *  prepare and, more to the point, nothing to UNprepare. */
  | { code: 'granted'; why: 'always-prepared' | 'cantrip'; rule: string }
  /** Not a rule about preparing — he does not have it yet. */
  | { code: 'locked'; unlocksAt: number }
  /** Not a spell at all. Features and feats are not prepared; they are had. */
  | { code: 'not-a-spell'; name: string }

export type PrepareResult =
  | { ok: true; next: Character }
  | { ok: false; refusal: PrepareRefusal }

/* ── The count ─────────────────────────────────────────────────────────────── */

/** Does this prepared spell occupy one of his prepared-spell places?
 *
 *  Canon decides when canon knows the spell. Otherwise the shape decides, and
 *  the shape's answer is the conservative one: a non-cantrip he has ticked is
 *  taking up room. */
export function countsAgainstCap(spell: Spell): boolean {
  if (!spell.prepared) return false
  const canon = spellByName(spell.name)
  if (canon) return canon.countsAgainstPreparedLimit
  return spell.level > 0
}

/** Rule 4: always-prepared spells do not count. Rule 5: cantrips do not count.
 *
 *  This is the number the cap enforces, and after this slice it is also the
 *  number the app shows. They were different, and the difference was five. */
export function preparedCount(character: Character): number {
  const spells = Array.isArray(character.spells) ? character.spells : []
  return spells.filter(countsAgainstCap).length
}

/** The cap itself, off the sheet — `derive.ts:161` already fills it from canon's
 *  levels table, so a level-up moves it without this module knowing. */
export function maxPrepared(character: Character): number {
  return character.maxPreparedSpells ?? 0
}

/* ── Canon → the sheet ──────────────────────────────────────────────────────── */

/** Canon record → the sheet's own `Spell` shape.
 *
 *  LOSSY ON PURPOSE. The sheet shape is what the turn engine reads, and canon's
 *  `tactics` is a 900-character paragraph with no field to land in that is not a
 *  list row. It stays in canon and reaches him through the Grimoire's third
 *  band, which is where Gate 1 decision 4 put long text. Dropping it here is
 *  the difference between a detail sheet and a wall.
 *
 *  `prepared` is left FALSE. Whether a converted spell arrives prepared is the
 *  caller's decision, and `togglePrepared` is the only caller that has made it. */
export function canonSpellToSheet(spell: CanonSpell): Spell {
  const sheet: Spell = {
    name: spell.name,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: renderComponents(spell),
    duration: spell.duration,
    concentration: spell.concentration,
    ritual: spell.ritual,
    description: spell.summary,
    prepared: false,
    source: spell.source,
  }
  if (spell.higherLevel) sheet.higherLevels = spell.higherLevel
  if (spell.damage) {
    sheet.damageDice = spell.damage.dice
    sheet.damageType = spell.damage.type
  }
  if (spell.save) sheet.saveType = spell.save.ability
  return sheet
}

/* ── The toggle ────────────────────────────────────────────────────────────── */

/** Unpreparing is never refused. Preparing is refused for exactly the five
 *  reasons above and no others — and every refusal names the rule that refused. */
export function togglePrepared(character: Character, name: string): PrepareResult {
  const key = normalizeName(name)
  const spells = Array.isArray(character.spells) ? character.spells : []
  const index = spells.findIndex(s => normalizeName(s.name) === key)
  const onSheet = index >= 0 ? spells[index] : null
  const canon = spellByName(name) ?? null

  // 1. Nothing to prepare. A feature is not prepared, it is had; a name canon
  //    and the sheet both miss is not anything at all. Refusing beats returning
  //    ok on a character that did not change.
  if (!canon && !onSheet) return refuse({ code: 'not-a-spell', name })

  const level = canon?.level ?? onSheet?.level ?? 0

  // 2. Canon gives it to him outright. BEFORE the unprepare branch, on purpose:
  //    every one of these is already sitting on the sheet with prepared true,
  //    so checking later would let a tap take away an Oath grant.
  if (level === 0) {
    return refuse({ code: 'granted', why: 'cantrip', rule: ruleAt(RULE_CANTRIP) })
  }
  if (canon && !canon.countsAgainstPreparedLimit) {
    return refuse({ code: 'granted', why: 'always-prepared', rule: ruleAt(RULE_GRANTED) })
  }

  // 3. Unpreparing. Never refused, and it does NOT remove the record — Gate 3
  //    decision 5. The sheet keeps the spell and forgets the tick.
  if (onSheet?.prepared) return ok(character, replaceAt(spells, index, { ...onSheet, prepared: false }))

  // 4. He does not have it yet. Not a rule about preparing, so it quotes none.
  if (canon && !isUnlocked(canon, character.level)) {
    return refuse({ code: 'locked', unlocksAt: canon.unlocksAtPaladinLevel })
  }

  // 5. Rule 2 — a prepared spell must be of a level he has slots for. Read off
  //    HIS sheet, not off canon's table: canon's levels row is what he SHOULD
  //    have, and Gate 3 decision 4 says the sheet wins the state. A tier with a
  //    max of zero is a tier he does not have.
  const slot = character.spellSlots?.[level]
  if (!slot || slot.max <= 0) {
    return refuse({ code: 'no-slots', spellLevel: level, rule: ruleAt(RULE_SLOT_LEVEL) })
  }

  // 6. Rule 1 — the cap. `>=`, not `===`: a sheet that arrived over the cap
  //    (a level-down, a hand edit) must still refuse, and `===` would wave it
  //    through and let it climb.
  const max = maxPrepared(character)
  if (preparedCount(character) >= max) {
    return refuse({
      code: 'cap',
      max,
      rule: ruleAt(RULE_CAP),
      swapRule: LONG_REST_SWAP_RULE,
    })
  }

  // 7. Prepare it. On the sheet already — flip the tick. Not on the sheet — this
  //    is the moment a canon record becomes something the turn engine can see,
  //    because `turn/options.ts:240` reads `character.spells` and nothing else.
  if (onSheet) return ok(character, replaceAt(spells, index, { ...onSheet, prepared: true }))
  return ok(character, [...spells, { ...canonSpellToSheet(canon!), prepared: true }])
}

function refuse(refusal: PrepareRefusal): PrepareResult {
  return { ok: false, refusal }
}

function ok(character: Character, spells: Spell[]): PrepareResult {
  return { ok: true, next: { ...character, spells } }
}

function replaceAt(spells: readonly Spell[], index: number, spell: Spell): Spell[] {
  const next = [...spells]
  next[index] = spell
  return next
}
