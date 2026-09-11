import { composeTurn } from './src/lib/turn/compose'
import { NIX } from './src/lib/turn/fixtures/nix'
import { featureContextOf } from './src/lib/turn/overlay'
import { featureByName } from './src/lib/canon/lookup'
import { retaliationOf } from './src/lib/turn/retaliation'
const turn = composeTurn({ character: NIX, combat: null })
const ctx = featureContextOf(NIX)
const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
for (const o of all) {
  const d = retaliationOf(featureByName(o.name), ctx)
  if (d) console.log('RETAL', o.id, '|', o.name, '|', o.cost.slot, '|', JSON.stringify(d))
}
console.log('total options', all.length, 'ranked', turn.ranked.length, 'rest', turn.rest.length, 'mutex', turn.mutex.flatMap(g=>g.faces).length)
console.log('names', all.map(o=>o.name).join(' · '))
