import { readFileSync } from 'node:fs'
const oath = JSON.parse(readFileSync('src/canon/oath-of-the-hearth.json','utf8'))
const errata = oath.errata ?? oath
const FIELDS=['problem','cause','recommendedFix','narrowerAlternative','appAction','comparison','assessment','mitigatingFactor','note']
let total=0
for (const e of errata) {
  const parts = FIELDS.filter(f=>typeof e[f]==='string'&&e[f].trim())
  const n = parts.reduce((s,f)=>s+e[f].length,0)
  console.log(`${e.id} ${String(e.severity).padEnd(8)} ${String(e.feature).padEnd(38)} blocks=${parts.length} chars=${n}`)
  if (['HEARTH-03','HEARTH-04','HEARTH-05','HEARTH-06','HEARTH-07','HEARTH-08'].includes(e.id)) total+=n
}
console.log('live six total chars:', total)
