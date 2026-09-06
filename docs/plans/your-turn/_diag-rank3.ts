/* WHICH WORD MADE A RETALIATION LOOK LIKE A HEAL?
 *
 * `_diag-rank2.ts` found "Hearthfire Manifest" — a reaction that deals fire
 * damage back to whoever hit him — carrying the phrase "You are bloodied" and
 * collecting the heal bonus on his real sheet. Rather than reason about which
 * alternative in the regex fired, ask each alternative separately and print the
 * matched substring with its surroundings.
 *
 *   npx vite-node docs/plans/your-turn/_diag-rank3.ts
 */
import { readFileSync } from 'node:fs'
import { composeTurn } from '../../../src/lib/turn/compose'
import type { Character } from '../../../src/lib/character'
import type { CombatState } from '../../../src/lib/combat-state'

const SHEET: Character = JSON.parse(
  readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'),
)

const ALTERNATIVES: Array<[string, RegExp]> = [
  ['heal / heals / healing', /\bheal(s|ing)?\b/i],
  ['hit point / hit points', /\bhit points?\b/i],
  ['restore / restores', /\brestores?\b/i],
  ['temp hp / temporary hp', /\btemp(orary)? hp\b/i],
]

const FIGHTING: CombatState = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

const c: Character = { ...SHEET, hitPoints: { ...(SHEET.hitPoints ?? { max: 67, current: 3 }), current: 7 } }
const turn = composeTurn({ character: c, combat: FIGHTING })
const every = [...turn.ranked, ...turn.rest]

for (const o of every) {
  const hay = `${o.name} ${o.detail ?? ''}`
  const hits = ALTERNATIVES.filter(([, re]) => re.test(hay))
  if (!hits.length) continue
  console.log(`\n${'='.repeat(72)}\n${o.name}  —  score ${o.score}, ${o.cost?.slot}, why="${o.why ?? ''}"\n${'='.repeat(72)}`)
  for (const [label, re] of hits) {
    const m = hay.match(re)
    const i = m?.index ?? 0
    console.log(`  FIRED: ${label}`)
    console.log(`    matched "${m?.[0]}" at ${i}`)
    console.log(`    ...${hay.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' ')}...`)
  }
  console.log(`\n  FULL detail: ${o.detail}`)
  console.log(`  factors: ${JSON.stringify(o.factors ?? 'not carried on TurnOption')}`)
}

/* And the fixture's Lay on Hands, which scored as a heal WITHOUT matching on
   name+detail — proof that the prose hint is doing the work there, which is
   exactly what `RankHints` was built for. */
console.log(`\n${'='.repeat(72)}\nHis 14 options, and which are heals by the rule\n${'='.repeat(72)}`)
for (const o of every)
  console.log(`  ${String(o.score).padStart(6)}  ${o.name.padEnd(30)} ${(o.cost?.slot ?? '—').padEnd(12)} ` +
    `heal=${ALTERNATIVES.some(([, re]) => re.test(`${o.name} ${o.detail ?? ''}`))}  why="${o.why ?? ''}"`)
