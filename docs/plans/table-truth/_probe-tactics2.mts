import { SPELLS } from '../../../src/canon'

// Same shape rule, NO word-count guard, to see everything it would admit.
const HEADING = /(?:^|(?<=[.!?] ))([A-Z][A-Z0-9'’+\-/(),& ]*[A-Z0-9)])(?=\s*[:—])/g

const counts = new Map<string, number>()
let multi = 0
for (const s of SPELLS) {
  const leads = [...s.tactics.matchAll(HEADING)].map(m => m[1])
  if (leads.length > 0) multi++
  for (const l of leads) counts.set(l, (counts.get(l) ?? 0) + 1)
}
console.log('records with >=1 heading:', multi, 'of', SPELLS.length)
const single = [...counts.entries()].filter(([l]) => (l.match(/[A-Z]{2,}/g) ?? []).length < 2)
console.log('\nDISTINCT SINGLE-WORD leads admitted by relaxing the guard:', single.length)
for (const [l, n] of single.sort((a,b)=>b[1]-a[1])) console.log(`  ${n}x  «${l}»`)
