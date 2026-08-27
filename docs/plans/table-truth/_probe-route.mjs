// Where can each live erratum actually surface? Routing BEFORE building (finding AB).
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'
const nix = await loadNix()
console.log(`Nix level ${nix.level}\n`)
console.log('FEATURES on the sheet:')
for (const f of nix.features) console.log(`   ${f.name}`)
console.log('\nSPELLS on the sheet:')
for (const s of nix.spells) console.log(`   L${s.level} ${s.name}  (source: ${s.source ?? '—'})`)
