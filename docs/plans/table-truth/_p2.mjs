import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { optionDetail } from '../../../src/lib/turn/detail.ts'
import { createCombatState } from '../../../src/lib/combat-state.ts'
const IN = { ...createCombatState(NIX), inCombat: true, round: 3, yourTurn: true }
const t = composeTurn({ character: NIX, combat: IN, log: [] })
const all=[...t.ranked,...t.rest,...t.mutex.flatMap(g=>g.faces)]
for (const o of all) {
  const d = optionDetail(o, NIX, t.economy)
  const rolls = d.rolls ?? []
  if (rolls.length) console.log(o.name, '→', JSON.stringify(rolls.map(r=>`${r.label}|${r.notation}|${r.kind}`)))
}
console.log('--- cloak detail keys ---')
const cloak = all.find(o=>/cloak/i.test(o.name))
const cd = optionDetail(cloak, NIX, t.economy)
console.log(JSON.stringify(Object.keys(cd)))
console.log('cloak rolls:', JSON.stringify(cd.rolls))
