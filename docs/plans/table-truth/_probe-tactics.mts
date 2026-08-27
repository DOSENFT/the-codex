import { SPELLS } from '../../../src/canon'
import { splitTactics } from '../../../src/lib/canon/tactics'

const multi = SPELLS.filter(s => splitTactics(s.tactics).length > 1)
console.log('multi-bullet records:', multi.length, 'of', SPELLS.length)
const singles = SPELLS.filter(s => splitTactics(s.tactics).length <= 1)
console.log('single-bullet:', singles.map(s => s.name).join(', '))

const bless = SPELLS.find(s => s.name === 'Bless')!
console.log('\nBless leads:', JSON.stringify(splitTactics(bless.tactics).map(b => b.lead)))
const cmd = SPELLS.find(s => s.name === 'Command')!
console.log('Command leads:', JSON.stringify(splitTactics(cmd.tactics).map(b => b.lead)))

// Every lead in the corpus, checked against a strict shape.
const bad: string[] = []
for (const s of SPELLS)
  for (const b of splitTactics(s.tactics))
    if (b.lead && !/^[A-Z][A-Z0-9'’+\-/(),& ]*[A-Z0-9)]$/.test(b.lead)) bad.push(`${s.name}: ${b.lead}`)
console.log('\nleads failing the strict shape:', bad.length, bad.slice(0, 5))

let total = 0
for (const s of SPELLS) total += splitTactics(s.tactics).filter(b => b.lead).length
console.log('total headings across corpus:', total)
