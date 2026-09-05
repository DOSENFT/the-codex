/* Throwaway. How long are the step labels in each pack? The slice-2 prover
   found every round-two card carries a clipped step; this answers whether
   round one was already clipping (a pre-existing renderer defect) or whether
   round two is the first content to exceed the one-line budget. */
import { readFileSync } from 'node:fs'

const RE = /^\s*label: '((?:[^'\\]|\\.)*)',/gm

for (const f of ['hearth-7.combos.ts', 'hearth-7-r2.combos.ts']) {
  const src = readFileSync(`src/lib/toybox-seed/packs/${f}`, 'utf8')
  const labels = [...src.matchAll(RE)].map(m => m[1])
  const long = labels.filter(l => l.length > 41).sort((a, b) => b.length - a.length)
  console.log(`\n== ${f} — ${labels.length} labels, longest ${Math.max(...labels.map(l => l.length))}`)
  console.log(`   over 41 chars: ${long.length}`)
  for (const l of long) console.log(`   ${String(l.length).padStart(3)}  ${l}`)
}
