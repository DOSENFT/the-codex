import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { createCombatState } from '../../../src/lib/combat-state.ts'
const IN = { ...createCombatState(NIX), inCombat: true, round: 3, yourTurn: true }
const t = composeTurn({ character: NIX, combat: IN, log: [] })
const all=[...t.ranked,...t.rest,...t.mutex.flatMap(g=>g.faces)]
for (const o of all) {
  if (!/cloak|hearthfire|manifest/i.test(o.name)) continue
  console.log(JSON.stringify({name:o.name,id:o.id,kind:o.kind,cost:o.cost,canonId:o.canonId,provenance:o.provenance,detail:o.detail,source:o.source},null,1))
}
