import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import { SPELLS } from '../../../src/canon'

const turn = composeTurn({ character: NIX, combat: null })
const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
console.log('=== full detail strings ===')
for (const o of all) console.log(`${o.name}\n    «${o.detail}»`)

console.log('\n=== NIX.weapons ===')
console.log(JSON.stringify(NIX.weapons, null, 1))
console.log('\n=== NIX.spells[0..1] ===')
console.log(JSON.stringify((NIX.spells ?? []).slice(0, 2), null, 1))

// the ALL-CAPS lead-in shape
const LEAD = /(?:^|[.!?]\s+|\s)([A-Z][A-Z0-9'’+\-—,()\/ ]{6,}?):\s/g
let withShape = 0
const counts: number[] = []
for (const s of SPELLS) {
  const m = [...(s.tactics ?? '').matchAll(LEAD)]
  counts.push(m.length)
  if (m.length > 0) withShape++
}
console.log(`\n=== ALL-CAPS lead-ins: ${withShape}/${SPELLS.length} spells have >=1; counts min ${Math.min(...counts)} max ${Math.max(...counts)}`)
const zero = SPELLS.filter(s => [...(s.tactics ?? '').matchAll(LEAD)].length === 0)
console.log('spells with ZERO lead-ins:', zero.map(s => s.name).join(', ') || '(none)')
console.log('\n=== sample lead-ins, Divine Smite ===')
console.log([...(SPELLS.find(s=>s.id==='divine-smite')!.tactics).matchAll(LEAD)].map(m=>m[1]).join(' | '))
console.log('\n=== sample lead-ins, Sacred Flame ===')
console.log([...(SPELLS.find(s=>s.id==='sacred-flame')!.tactics).matchAll(LEAD)].map(m=>m[1]).join(' | '))
