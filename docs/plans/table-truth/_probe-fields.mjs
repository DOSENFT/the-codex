import { readFileSync } from 'node:fs'
const raw = JSON.parse(readFileSync('src/canon/oath-of-the-hearth.json', 'utf8'))
const find = (o) => Array.isArray(o) ? (o.some(x=>x&&x.id&&/HEARTH-\d/.test(x.id))?o:o.map(find).find(Boolean))
  : (o&&typeof o==='object' ? Object.values(o).map(find).find(Boolean) : null)
const arr = find(raw)
const F = ['problem','cause','recommendedFix','narrowerAlternative','appAction','comparison','assessment','mitigatingFactor','note']
console.log('id'.padEnd(11) + F.map(f=>f.slice(0,6).padEnd(7)).join(''))
for (const e of arr) console.log(e.id.padEnd(11) + F.map(f => (typeof e[f]==='string'&&e[f].trim()?'  ✓    ':'  ·    ')).join(''))
console.log('\ncounts:')
for (const f of F) console.log(`  ${f.padEnd(22)} ${arr.filter(e=>typeof e[f]==='string'&&e[f].trim()).length}/12`)
console.log('\n--- HEARTH-11 in full ---')
console.log(JSON.stringify(arr.find(e=>e.id==='HEARTH-11'), null, 2))
