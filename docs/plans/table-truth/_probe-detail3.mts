import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import { optionDetail } from '../../../src/lib/turn/detail'

const t = composeTurn({ character: NIX, combat: null })
const all = [...t.ranked, ...t.rest, ...t.mutex.flatMap(g => g.faces)]
console.log('options:', all.length)
console.log('names:', all.map(o => o.name).join(' | '))

const cloak = all.find(o => o.name === 'Hearthfire Manifest')
console.log('\ncloak present:', !!cloak)
if (cloak) {
  const d = optionDetail(cloak, NIX, {action:true,bonusAction:true,reaction:true,movement:true,spellSlotUsedThisTurn:false})
  console.log('provenance:', d.provenance)
  console.log('facts:', JSON.stringify(d.facts, null, 1))
  console.log('whatItDoes len:', d.whatItDoes.length)
  console.log('rolls:', JSON.stringify(d.rolls))
  console.log('errata:', d.errata.length)
}
