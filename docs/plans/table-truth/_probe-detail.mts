import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import { spellByName, featureByName } from '../../../src/lib/canon/lookup'
import { SPELLS } from '../../../src/canon'

const turn = composeTurn({ character: NIX, combat: null })
const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
console.log('=== options: name | slot | spellSlotLevel | dice | canonId | provenance ===')
for (const o of all) {
  console.log(`${o.name} | ${o.cost.slot} | ${o.cost.spellSlotLevel ?? '-'} | ${o.dice ?? '-'} | ${o.canonId ?? '-'} | ${o.provenance ?? '-'}`)
}
console.log('\n=== economy ===', JSON.stringify(turn.economy))
console.log('\n=== tactics sample (Divine Smite) ===')
const ds = spellByName('Divine Smite')
console.log(JSON.stringify(ds?.tactics))
console.log('\n=== tactics sample (Sacred Flame) ===')
console.log(JSON.stringify(spellByName('Sacred Flame')?.tactics))
console.log('\n=== summary sample (Sacred Flame) ===')
console.log(JSON.stringify(spellByName('Sacred Flame')?.summary))
console.log('\n=== tactics lengths: min/max/how many contain newline or bullet ===')
const lens = SPELLS.map(s => s.tactics?.length ?? 0)
console.log('min', Math.min(...lens), 'max', Math.max(...lens), 'empty', lens.filter(l => l === 0).length)
console.log('with \n:', SPELLS.filter(s => /\n/.test(s.tactics ?? '')).length)
console.log('with " • ":', SPELLS.filter(s => /•/.test(s.tactics ?? '')).length)
console.log('with ". " count>3:', SPELLS.filter(s => (s.tactics ?? '').split(/\. /).length > 3).length)
console.log('\n=== hearthfire mechanics ===')
console.log(JSON.stringify(featureByName('Flaming Cloak')?.mechanics, null, 1))
