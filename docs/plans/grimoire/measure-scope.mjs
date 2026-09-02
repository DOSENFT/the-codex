/* Does the catalogue contain anything Nix can never use?
 *
 * Marcus, 2026-08-29: "we do NOT need to include spells and abilities my
 * character will never be able to use, I.e spells and abilities from other
 * oaths and such"
 *
 * That constraint could change the 84, which is Gate 1's success metric and is
 * pinned in browser checks A, B and D and in `build.test.ts`. So this measures
 * before anything is cut. It prints every row the catalogue actually builds,
 * with its provenance, so the question "is any of this from another oath?" is
 * answered by looking rather than by believing.
 *
 * Run: npx vite-node docs/plans/grimoire/measure-scope.mjs
 */

import { readFileSync } from 'node:fs'
import { buildCatalogue, catalogueSpells } from '../../../src/lib/catalogue/build.ts'

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const nix = JSON.parse(readFileSync(NIX_EXPORT, 'utf8'))

const rows = buildCatalogue(nix)
console.log('TOTAL ROWS', rows.length)

const byKind = new Map()
for (const r of rows) {
  if (!byKind.has(r.kind)) byKind.set(r.kind, [])
  byKind.get(r.kind).push(r)
}
for (const [kind, list] of byKind) {
  console.log(`\n=== ${kind} — ${list.length} ===`)
  for (const r of list) {
    const bits = [
      r.level === undefined ? '' : `L${r.level}`,
      r.lockedUntil === null ? 'HAS IT' : `locked until L${r.lockedUntil}`,
      r.source ?? '',
    ].filter(Boolean)
    console.log(' ', r.name.padEnd(34), '|', bits.join(' | '))
  }
}

console.log('\n=== catalogueSpells provenance ===')
const spells = catalogueSpells(nix)
const groups = new Map()
for (const s of spells) {
  const k = s.onPaladinList ? 'on the Paladin list' : `OFF-list :: ${s.grantedBy ?? 'no grant'}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(s.name)
}
for (const [k, names] of groups) console.log(names.length, '|', k, '::', names.join(', '))
