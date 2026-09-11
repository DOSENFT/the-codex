/* Scratch. Builds the combat "Action" row for Marcus's REAL sheet and prints
   exactly what the app puts on the glass for the Dawn Guardian, so the gap
   report is measured rather than derived from reading the code. */
import { readFileSync } from 'node:fs'
import { categorizeTurnOptions } from '../../../src/lib/turn/options'

const sheet = JSON.parse(
  readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'),
)

const cat = categorizeTurnOptions(sheet)
const weapon = cat.actions.find(o => o.type === 'weapon')

console.log('=== WHAT THE SHEET HOLDS ===')
console.log(JSON.stringify(sheet.weapons[0], null, 2))

console.log('\n=== WHAT THE APP BUILDS ===')
if (!weapon) {
  console.log('NO WEAPON OPTION AT ALL')
} else {
  for (const [k, v] of Object.entries(weapon)) {
    console.log(`\n${k}:`)
    console.log(`  ${typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v)}`)
  }
}

console.log('\n=== SHEET FIELDS THAT NEVER REACH THE GLASS ===')
const shown = JSON.stringify(weapon ?? {})
const w = sheet.weapons[0]
const check: Array<[string, string | undefined]> = [
  ['description', w.description],
  ['specialAbilities[0].damageDice', w.specialAbilities?.[0]?.damageDice],
  ['specialAbilities[0].damageType', w.specialAbilities?.[0]?.damageType],
]
for (const [label, value] of check) {
  if (!value) { console.log(`  ${label}: (not on the sheet)`); continue }
  console.log(`  ${label} = ${JSON.stringify(value)} -> ${shown.includes(value.split('\n')[0]) ? 'SHOWN' : 'NEVER SHOWN'}`)
}
