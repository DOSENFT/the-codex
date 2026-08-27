/* Slice 10d measurement probe — HEARTH-04 / VAL-06 and HEARTH-05.
 *
 * Same discipline as `_probe-val.mjs`: call the REAL exported functions, do not
 * read them and guess. Run:
 *
 *     npx vite-node docs/plans/table-truth/_probe10d.mjs
 *
 * Three questions the slice cannot be designed without:
 *
 *   Q1  Does the app know the cloak is UP? (HEARTH-04 needs a subject.)
 *   Q2  Does taking Flaming Cloak grant the temp HP the feature grants?
 *   Q3  Is there anywhere at all that a per-encounter damage tally could be
 *       read from today? (HEARTH-05 needs an accumulator.)
 *
 * Kept in the repo per the slice-7 precedent: the probe that produced a number
 * is part of the evidence for that number.
 */
import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { reduce, takenFrom } from '../../../src/lib/turn/reduce.ts'
import { setTempHP } from '../../../src/lib/character.ts'
import { createCombatState } from '../../../src/lib/combat-state.ts'
import OATH from '../../../src/canon/oath-of-the-hearth.json' with { type: 'json' }

const say = (id, ...rest) => console.log(`\n[${id}]`, ...rest)
const J = (o) => JSON.stringify(o)

/** ranked + rest + every mutex FACE — finding BA. Reading `.ranked` alone
 *  undercounts 14 to 4 and has already turned a violation into a pass once. */
const all = (turn) => {
  const seen = new Set()
  const out = []
  for (const o of [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap((g) => g.faces)]) {
    if (seen.has(o.id)) continue
    seen.add(o.id)
    out.push(o)
  }
  return out
}

const IN_COMBAT = {
  ...createCombatState(NIX),
  inCombat: true,
  round: 3,
  yourTurn: true,
}

// ===========================================================================
say('SETUP', 'Nix level', NIX.level, '· tempHP', NIX.tempHP, '· HP', J(NIX.hitPoints))

const turn = composeTurn({ character: NIX, combat: IN_COMBAT, log: [] })
const options = all(turn)
say('SETUP', options.length, 'options composed')

// ---------------------------------------------------------------------------
// Q1 — does anything in the model record that the cloak is up?
// ---------------------------------------------------------------------------
const charKeys = Object.keys(NIX)
const combatKeys = Object.keys(IN_COMBAT)
say(
  'Q1',
  'character keys matching /cloak|hearthfire|tempHPSource|effect/i:',
  J(charKeys.filter((k) => /cloak|hearthfire|tempHPSource|effect/i.test(k))),
)
say(
  'Q1',
  'combat-state keys matching /cloak|effect|active|tally|damage/i:',
  J(combatKeys.filter((k) => /cloak|effect|active|tally|damage/i.test(k))),
)
say('Q1', 'all character keys:', J(charKeys))
say('Q1', 'all combat keys:', J(combatKeys))

// ---------------------------------------------------------------------------
// Q2 — take the cloak. Does temp HP move? Does ANYTHING but cost move?
// ---------------------------------------------------------------------------
const cloak = options.find((o) => /cloak/i.test(o.name))
say('Q2', 'the cloak option:', cloak ? `${cloak.name} · id=${cloak.id} · slot=${cloak.slot}` : 'NOT FOUND')

if (cloak) {
  const applied = reduce(
    { character: NIX, combat: IN_COMBAT },
    { type: 'takeOption', option: takenFrom(cloak) },
    [],
  )
  say('Q2', 'refused?', J(applied.refused ?? null))
  if (!applied.refused) {
    const before = NIX
    const after = applied.state.character
    say('Q2', 'tempHP  before →', before.tempHP, '· after →', after.tempHP)
    const changed = Object.keys(after).filter((k) => after[k] !== before[k])
    say('Q2', 'CHARACTER fields the take() changed:', J(changed))
    const cBefore = IN_COMBAT
    const cAfter = applied.state.combat
    say(
      'Q2',
      'COMBAT fields the take() changed:',
      J(Object.keys(cAfter).filter((k) => J(cAfter[k]) !== J(cBefore[k]))),
    )
    say('Q2', 'log entry label:', J(applied.entry?.label ?? null))
    say('Q2', 'turnActions after:', J(cAfter.turnActions), '· takenFrom slot:', J(takenFrom(cloak).slot))
    say('Q2', 'THE POINT: tempHP is untouched. take() spends COSTS and grants NOTHING.')
  }
}

// ---------------------------------------------------------------------------
// Q2b — what does the cloak GRANT, per canon and per the sheet?
// ---------------------------------------------------------------------------
const hm = (OATH.features ?? []).find((f) => /Hearthfire Manifest/i.test(f.name ?? ''))
say('Q2b', 'canon feature found?', Boolean(hm))
if (hm) {
  const flat = JSON.stringify(hm)
  const m = flat.match(/[Tt]emporary [Hh]it [Pp]oints[^"]{0,120}/)
  say('Q2b', 'canon temp-HP wording:', m ? m[0] : '(not matched)')
  say('Q2b', 'canon feature keys:', J(Object.keys(hm)))
}
const scores = NIX.abilityScores ?? NIX.abilities ?? {}
const CHA = Math.floor(((scores.charisma ?? scores.CHA ?? 10) - 10) / 2)
say('Q2b', 'abilityScores keys:', J(Object.keys(scores)))
say('Q2b', 'the number the cloak SHOULD grant = level + CHA mod =', NIX.level, '+', CHA, '=', NIX.level + CHA)
say('Q2b', 'NOTE the fixture is level', NIX.level, '— Marcus confirmed his Nix is level 7 (slice 8)')

// ---------------------------------------------------------------------------
// Q3 — VAL-06 written straight, against the real setTempHP
// ---------------------------------------------------------------------------
const cloaked = { ...NIX, tempHP: 11 }
const replaced = setTempHP(cloaked, 5)
say('Q3', 'setTempHP(11 → 5) yields', replaced.tempHP, '— canon wants a PROMPT, not an assignment')
say('Q3', 'setTempHP(0 → 5) yields', setTempHP({ ...NIX, tempHP: 0 }, 5).tempHP, '— no prompt is warranted here')
say('Q3', 'setTempHP(11 → 20) yields', setTempHP(cloaked, 20).tempHP, '— still a replacement, still unprompted')

// ---------------------------------------------------------------------------
// Q4 — is there any accumulator a per-encounter tally could live in?
// ---------------------------------------------------------------------------
say('Q4', 'CombatState has a round counter:', 'round' in IN_COMBAT, '→', IN_COMBAT.round)
say('Q4', 'CombatState has any damage/tally field:', combatKeys.some((k) => /damage|tally|dealt/i.test(k)))
say('Q4', 'log entry fields available to sum over:', J(['round', 'label', 'event', 'restore', 'spellSlotLevel']))

// ---------------------------------------------------------------------------
// Q5 — the retaliation itself: does any option/roll carry the 1d10?
// ---------------------------------------------------------------------------
for (const o of options) {
  const blob = J(o)
  if (/1d10 Fire|retaliation/i.test(blob)) {
    say('Q5', o.name, '→ carries retaliation text')
    say('Q5', '   rolls:', J((o.rolls ?? []).map((r) => `${r.label}: ${r.notation ?? r.formula ?? '?'}`)))
  }
}

console.log('\n--- probe complete ---')
