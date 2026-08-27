/* Slice 10 measurement probe — VAL-01..VAL-15 against the REAL functions.
 *
 * This answers "does the app obey canon's own validation rules?" by calling
 * the app's exported functions, not by reading them. Every number the slice-10
 * suite asserts is measured here first. Run:
 *
 *     npx vite-node docs/plans/table-truth/_probe-val.mjs
 *
 * Kept in the repo per the slice-7 precedent: the probe that produced a number
 * is part of the evidence for that number.
 */
import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { reduce } from '../../../src/lib/turn/reduce.ts'
import { toggleSpellPrepared, setTempHP } from '../../../src/lib/character.ts'
import { demandOfSpell } from '../../../src/lib/rules-2024/economy.ts'
import { effectOf, expandConditions, blockedSlots } from '../../../src/lib/rules-2024/conditions.ts'
import { critNotation } from '../../../src/lib/turn/rolls.ts'
import CANON_CHAR from '../../../src/canon/character-marcus.json' with { type: 'json' }
import SPELLS from '../../../src/canon/spells.json' with { type: 'json' }

const spellList = Array.isArray(SPELLS) ? SPELLS : SPELLS.spells
const say = (id, ...rest) => console.log(`\n[${id}]`, ...rest)
const J = (o) => JSON.stringify(o)

/** EVERY option the engine produced — `ranked` + `rest` + every mutex FACE.
 *
 *  The first run of this probe read `turn.ranked` alone and reported 4 options
 *  where the engine builds 14. `ranked` deliberately EXCLUDES anything filed
 *  into a mutex group (types.ts:237-241), and Nix's bonus actions are all in
 *  one. The consequence was not a small undercount: it made VAL-13 read
 *  "Divine Smite is not offered" — turning a VIOLATED rule into an obeyed one.
 *  A probe that converts a violation into a pass is worse than no probe.
 *  `openworld.test.ts:46` warns about this exact trap in as many words. */
const all = (turn) => {
  const seen = new Set()
  const out = []
  for (const o of [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]) {
    if (seen.has(o.id)) continue
    seen.add(o.id); out.push(o)
  }
  return out
}

/* A live turn for Nix, with no combat state — the state you are in when you
   open the Play tab. */
const fresh = () => composeTurn({ character: NIX, combat: null })

// ---------------------------------------------------------------------------
say('SETUP')
const turn = fresh()
console.log('options composed — ranked:', turn.ranked.length, '· rest:', turn.rest.length,
            '· mutex groups:', turn.mutex.length, '· TOTAL:', all(turn).length)
console.log('mutex:', turn.mutex.map(g => `${g.label} [${g.reason}] {${g.faces.map(f => f.name).join(', ')}}`).join(' | '))
console.log('every option:', all(turn).map(o => o.name).join(' | '))

// ---------------------------------------------------------------------------
say('VAL-01', 'Warding Bond must never be selectable as a prepared spell')
const wbCanon = spellList.find(s => s.name === 'Warding Bond')
console.log('canon says alwaysPrepared:', wbCanon.alwaysPrepared,
            '· countsAgainstPreparedLimit:', wbCanon.countsAgainstPreparedLimit)
const wbOnSheet = NIX.spells.find(s => s.name === 'Warding Bond')
console.log('on Nix\'s sheet:', wbOnSheet ? J({ prepared: wbOnSheet.prepared, level: wbOnSheet.level }) : 'ABSENT')
if (wbOnSheet) {
  const after = toggleSpellPrepared(NIX, 'Warding Bond')
  const wbAfter = after.spells.find(s => s.name === 'Warding Bond')
  console.log('toggleSpellPrepared flipped it to:', wbAfter.prepared, '<-- guard absent if this changed')
}
const alwaysPreparedNames = new Set(spellList.filter(s => s.alwaysPrepared).map(s => s.name))
const charged = NIX.spells.filter(s => s.prepared && s.level > 0)
console.log('app counts prepared as:', charged.length, '/', NIX.maxPreparedSpells)
console.log('of those, canon says FREE:', charged.filter(s => alwaysPreparedNames.has(s.name)).map(s => s.name).join(', '))

// ---------------------------------------------------------------------------
say('VAL-02', 'only ONE spell slot per turn')
const st0 = { character: NIX, combat: { round: 1, yourTurn: true, turnActions: {}, spellSlots: NIX.spellSlots } }
const slotOpts = all(turn).filter(o => typeof o.cost?.spellSlotLevel === 'number' && o.cost.spellSlotLevel > 0)
console.log('slot-spending options:', slotOpts.map(o => `${o.name}(L${o.cost.spellSlotLevel})`).join(' | ') || 'NONE')
console.log('compose blockedReason when a slot is already spent — see suite')

// ---------------------------------------------------------------------------
say('VAL-03', 'free castings tracked separately from slots')
console.log('any option carrying a free-cast marker:',
  all(turn).filter(o => /free/i.test(J(o))).map(o => o.name).join(', ') || 'NONE')
console.log('canon spell fields mentioning a free cast:',
  Object.keys(spellList[0]).filter(k => /free|granted/i.test(k)).join(', ') || 'NONE')

// ---------------------------------------------------------------------------
say('VAL-04', 'only ONE bonus action per turn')
const bonuses = all(turn).filter(o => o.cost?.slot === 'bonusAction')
console.log('bonus-action options:', bonuses.map(o => o.name).join(' | '))

// ---------------------------------------------------------------------------
say('VAL-05', 'one concentration spell; warn and NAME what is dropped')
const conc = all(turn).filter(o => o.concentration)
console.log('concentration options:', conc.map(o => o.name).join(' | ') || 'NONE')
const withConc = composeTurn({
  character: NIX,
  combat: { round: 1, yourTurn: true, turnActions: {}, concentrating: 'Shield of Faith' },
})
/* `all(...)`, not `.ranked` — the mutex trap, and it caught this file TWICE.
   Shield of Faith is a bonus-action spell, so it lives in a mutex group and
   never appears in `ranked` at all. Reading `ranked` here reported "no row
   warns before the tap" and would have graded VAL-05 as VIOLATED when the
   app in fact obeys it. Same bug as the VAL-13 one above, opposite sign:
   once it invented a violation, once it hid one. */
const clash = all(withConc).filter(o => /Would drop/i.test(o.why ?? ''))
console.log('rows warning before the tap:', clash.map(o => `${o.name} → «${o.why}»`).join(' | ') || 'NONE')

// ---------------------------------------------------------------------------
say('VAL-06', 'temp HP from another source replaces the cloak pool — prompt first')
const cloaked = { ...NIX, tempHP: 11 }
const replaced = setTempHP(cloaked, 5)
console.log('11 temp HP (cloak) + a 5 temp HP source →', replaced.tempHP,
            '<-- silently discarded the larger pool with no signal' )
console.log('any field modelling "the cloak is active":',
  Object.keys(NIX).filter(k => /cloak|hearthfire/i.test(k)).join(', ') || 'NONE')

// ---------------------------------------------------------------------------
say('VAL-07', 'skill proficiency overlap must be prevented')
console.log('skillProficiencies:', J(NIX.skillProficiencies))
console.log('any field recording WHERE a proficiency came from:',
  Object.keys(NIX).filter(k => /skill/i.test(k)).join(', '))

// ---------------------------------------------------------------------------
say('VAL-08', 'costed/consumed components block casting')
const revivify = spellList.find(s => s.name === 'Revivify')
console.log('canon Revivify components:', J(revivify.components))
console.log('app Spell.components is a', typeof (NIX.spells[0]?.components), '—', J(NIX.spells[0]?.components))
console.log('inventory shape: equipment=', J(NIX.equipment ?? null), 'supplies=', J(NIX.supplies ?? null))

// ---------------------------------------------------------------------------
say('VAL-09', 'Warding Bond rings must be owned AND worn')
console.log('canon:', J(wbCanon.components.materialText))
console.log('any field modelling worn items:',
  Object.keys(NIX).filter(k => /worn|equipped|attun/i.test(k)).join(', ') || 'NONE')

// ---------------------------------------------------------------------------
say('VAL-10', 'Smoldering Smite requires a DM ruling before being enabled')
const at15 = { ...NIX, level: 15 }
const t15 = composeTurn({ character: at15, combat: null })
/* `all(...)` — the third instance of the mutex trap in this one file. Grep
   this file for `.ranked` before believing any count in it. */
const smold = all(t15).find(o => /smoldering/i.test(o.name))
console.log('at level 15, options TOTAL:', all(t15).length, '(vs', all(turn).length, 'at level 7)')
console.log('at level 15, Smoldering Smite composes:', smold ? `YES — available=${smold.available}` : 'NO OPTION')
console.log('  level-15 arrivals:', all(t15).map(o => o.name).filter(n => !all(turn).some(o => o.name === n)).join(', ') || 'NONE')
console.log('  (Nix is level 7, so this is a future-facing rule)')

// ---------------------------------------------------------------------------
say('VAL-11', 'the cloak Reaction must have a recorded trigger — SHIPPED IN 8B')
console.log('see reactions.test.ts / ReactionsBand.test.tsx — asserted there')

// ---------------------------------------------------------------------------
say('VAL-12', 'Aura of Protection and Aura of Solace are inactive while Incapacitated')
console.log('effectOf("Incapacitated"):', J(effectOf('Incapacitated')))
console.log('blockedSlots(["Incapacitated"]):', J(blockedSlots(['Incapacitated'])))
const inc = composeTurn({ character: { ...NIX, conditions: ['Incapacitated'] }, combat: null })
/* THE CONTROL CASE, and it is the whole verdict. Before asking "do the auras go
   dark while Incapacitated?", ask whether they were ever LIT — an aura row that
   never composes cannot be observed going out, and a suite that only checked
   the Incapacitated case would go green on an app that models no auras at all.
   `all(...)` on BOTH sides, so the answer is not the mutex trap a fourth time. */
const aurasHealthy = all(turn).filter(o => /aura/i.test(o.name))
const auras = all(inc).filter(o => /aura/i.test(o.name))
console.log('aura rows with NO conditions (the control):',
  aurasHealthy.map(o => o.name).join(' | ') || 'NO AURA ROWS')
console.log('aura rows while Incapacitated:',
  auras.map(o => `${o.name} available=${o.available} blocked=${J(o.blockedReason ?? null)}`).join(' | ') || 'NO AURA ROWS')
console.log('passive features on the sheet at/below level 7:',
  NIX.features.filter(f => f.actionType === 'passive' && f.level <= 7).map(f => f.name).join(', ') || 'NONE')
/* What the app DOES do with Incapacitated, since it clearly does something. */
console.log('options TOTAL while Incapacitated:', all(inc).length, '(vs', all(turn).length, 'healthy)')
console.log('  available=true while Incapacitated:',
  all(inc).filter(o => o.available).map(o => o.name).join(', ') || 'NONE')
console.log('  a blocked row reads:', J(all(inc).find(o => !o.available)?.blockedReason ?? null))

// ---------------------------------------------------------------------------
say('VAL-13', 'Smite only immediately after a MELEE hit; never offered before')
const smite = all(turn).find(o => /divine smite/i.test(o.name))
console.log('  (combat: null = a fresh turn, nothing attacked yet)')
console.log('on a FRESH turn with no attack made, Divine Smite:',
  smite ? `OFFERED, available=${smite.available}, blocked=${J(smite.blockedReason ?? null)}` : 'not offered')
console.log('any field tracking the last attack\'s outcome:',
  Object.keys(st0.combat).filter(k => /attack|hit|last/i.test(k)).join(', ') || 'NONE')

// ---------------------------------------------------------------------------
say('VAL-14', 'a crit doubles every damage DIE and never a flat modifier')
for (const n of ['2d8+4', '1d8+7', '3d6', '1d10', '5d6+5d6']) {
  console.log(`  critNotation(${JSON.stringify(n)}) →`, J(critNotation(n)))
}

// ---------------------------------------------------------------------------
say('VAL-15', 'ritual casting costs no slot')
const rituals = spellList.filter(s => s.ritual).map(s => s.name)
console.log('canon rituals:', rituals.join(', '))
for (const name of rituals) {
  const onSheet = NIX.spells.find(s => s.name === name)
  if (!onSheet) { console.log(`  ${name}: not on Nix's sheet`); continue }
  console.log(`  ${name}: ritual=${onSheet.ritual} → demandOfSpell:`, J(demandOfSpell(onSheet)))
}
/* A synthetic ritual, so the rule is measured even if Nix carries none. */
const syntheticRitual = { name: 'Detect Magic', level: 1, school: 'Divination', castingTime: 'Action',
  range: 'Self', components: 'V, S', duration: '10 min', concentration: true, ritual: true,
  description: '', prepared: true }
console.log('  synthetic ritual → demandOfSpell:', J(demandOfSpell(syntheticRitual)),
            '<-- consumesSpellSlot must be false for a ritual')

// ---------------------------------------------------------------------------
say('COVERAGE', 'ids read from canon, never hand-typed')
console.log('canon validationRules:', CANON_CHAR.validationRules.map(r => r.id).join(', '))
console.log('severities:', J(Object.fromEntries(CANON_CHAR.validationRules.map(r => [r.id, r.severity]))))
