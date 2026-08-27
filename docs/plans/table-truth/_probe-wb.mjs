// Throwaway: is Warding Bond double-granted, as HEARTH-08 predicts?
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'
const nix = await loadNix()
console.log(`Nix level ${nix.level}. Spells on the sheet: ${nix.spells.length}`)
const wb = nix.spells.filter(s => /warding bond/i.test(s.name))
console.log(`Warding Bond entries: ${wb.length}`)
for (const s of wb) console.log('  ', JSON.stringify(s).slice(0, 400))
const prepared = nix.spells.filter(s => s.prepared !== false && (s.level ?? 0) > 0)
console.log(`\nLevelled spells not marked unprepared (${prepared.length}):`)
for (const s of prepared) console.log(`   L${s.level}  ${s.name}`)
