import { loadNix } from '../codex-v1/reference/nix-seed.mjs'
const nix = await loadNix()
for (const f of nix.features) {
  console.log(`${f.name.padEnd(32)} level:${f.level ?? '—'}  source:${f.source ?? '—'}  uses:${f.uses ?? '—'}`)
}
