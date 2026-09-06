/* BEFORE DELETING ANYTHING: ask a SECOND question, a different way.
 *
 * `_reach.mjs` walks the module graph from the app entry. That is one method,
 * and 8c exists because a single method already lied once — `combat/index.ts`
 * made every name it re-exported look alive to grep. So this does not trust it.
 *
 * V2, after V1 was wrong in an instructive way. V1 asked "does anything import
 * this?" and flagged all 48, because a dead cluster is precisely a set of files
 * that import EACH OTHER: `SpellSlotSigils` imports `assets/sigils/index.ts`
 * imports the nine `SpellSigil*.tsx`, and all eleven are unreachable together.
 * "Imported by another corpse" is not a pulse.
 *
 * So the real question is: **is every importer of this file also on the list?**
 * If yes, the whole cluster falls together and nothing outside notices. If any
 * importer is NOT on the list, that is a live edge and the file stays.
 *
 * Scanned: every CODE file under src/, tests included. A test that imports a
 * candidate is an EXTERNAL importer — deleting the file would break or silently
 * remove that test, which the standing rule forbids.
 *
 * NOT scanned: .md and docs. V1 flagged three files for being named in
 * `THE-CODEX-COMPLETE-HANDOFF.md`; prose does not link a module into the build.
 * The two references V1 found from LIVE source files were both read by hand and
 * were both comments (`ui/Sheet.tsx` naming the Spellbook editor in a note,
 * `motion-utils.ts` naming CharacterCard in a docstring). Neither is an edge.
 *
 * `src/pwa/sw.js` is the standing proof that "no import" != "not used" — it is
 * registered by string path and is absolutely live. It is not a candidate here
 * and must never become one.
 *
 *   node docs/plans/your-turn/_verify-dead.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { basename, extname, dirname, resolve } from 'node:path'

const ROOT = process.cwd().replace(/\\/g, '/')

const CANDIDATES = [
  'src/assets/sigils/InitialA.tsx', 'src/assets/sigils/InitialB.tsx',
  'src/assets/sigils/InitialM.tsx', 'src/assets/sigils/InitialR.tsx',
  'src/assets/sigils/SpellSigil1.tsx', 'src/assets/sigils/SpellSigil2.tsx',
  'src/assets/sigils/SpellSigil3.tsx', 'src/assets/sigils/SpellSigil4.tsx',
  'src/assets/sigils/SpellSigil5.tsx', 'src/assets/sigils/SpellSigil6.tsx',
  'src/assets/sigils/SpellSigil7.tsx', 'src/assets/sigils/SpellSigil8.tsx',
  'src/assets/sigils/SpellSigil9.tsx', 'src/assets/sigils/index.ts',
  'src/components/InlineExplainer.tsx',
  'src/components/Spellbook.tsx',
  'src/components/TrainingHub.tsx',
  'src/components/brass/BrassBadge.tsx', 'src/components/brass/BrassButton.tsx',
  'src/components/brass/BrassPanel.tsx', 'src/components/brass/BrassPip.tsx',
  'src/components/brass/BrassText.tsx', 'src/components/brass/index.ts',
  'src/components/combat/ActionEconomyStrip.tsx',
  'src/components/combat/Block1Empty.tsx',
  'src/components/combat/Block1Skeleton.tsx',
  'src/components/combat/CharacterCard.tsx',
  'src/components/combat/CharacterHero.tsx',
  'src/components/combat/CodexHeader.tsx',
  'src/components/combat/CombatActionRow.tsx',
  'src/components/combat/ConditionsGrid.tsx',
  'src/components/combat/InitiativeTracker.tsx',
  'src/components/combat/InlineDiceSection.tsx',
  'src/components/combat/ReactionRow.tsx',
  'src/components/combat/RestManagement.tsx',
  'src/components/combat/SpellSlotPips.tsx',
  'src/components/combat/SpellSlotSigils.tsx',
  'src/components/combat/StatsBar.tsx',
  'src/components/combat/StatusRow.tsx',
  'src/components/combat/VitalsRow.tsx',
  'src/components/combat/index.ts',
  'src/components/safety/Veil.tsx',
  'src/components/ui/HairlineDivider.tsx',
  'src/components/ui/OrnateDivider.tsx',
  'src/components/ui/SectionHeader.tsx',
  'src/components/ui/index.ts',
  'src/hooks/useHaptic.ts',
  'src/lib/canon/report.ts',
]
const CAND = new Set(CANDIDATES)

const EXT = ['.tsx', '.ts', '.jsx', '.js']
const CODE = new Set(EXT)
const files = []
const walk = dir => {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`.replace(/\\/g, '/')
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (CODE.has(extname(p))) files.push(p)
  }
}
walk('src')

/** Resolve a specifier the way Vite would — relative or `@/` only. */
function resolveSpec(spec, fromFile) {
  let base
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else if (spec.startsWith('@/')) base = resolve(ROOT, 'src', spec.slice(2))
  else return null
  base = base.replace(/\\/g, '/')
  const rel = p => p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p
  if (extname(base) && existsSync(base)) return rel(base)
  for (const e of EXT) if (existsSync(base + e)) return rel(base + e)
  for (const e of EXT) if (existsSync(`${base}/index${e}`)) return rel(`${base}/index${e}`)
  return null
}

const SPEC = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g

/** who imports whom */
const importers = new Map(CANDIDATES.map(c => [c, []]))
for (const f of files) {
  const t = readFileSync(f, 'utf8')
  for (const m of t.matchAll(SPEC)) {
    const target = resolveSpec(m[1], f)
    if (target && importers.has(target) && target !== f) importers.get(target).push(f)
  }
}

const safe = [], live = []
for (const c of CANDIDATES) {
  const ext = [...new Set(importers.get(c))].filter(f => !CAND.has(f))
  if (ext.length === 0) safe.push([c, [...new Set(importers.get(c))].length])
  else live.push([c, ext])
}

console.log(`scanned ${files.length} code files under src/ (tests included)\n`)
console.log(`${'='.repeat(72)}`)
console.log(`SAFE — every importer is itself on the list: ${safe.length}`)
console.log(`${'='.repeat(72)}`)
let lines = 0
for (const [c, n] of safe) {
  const l = readFileSync(c, 'utf8').split('\n').length
  lines += l
  console.log(`  ${c.padEnd(52)} ${String(l).padStart(5)} lines  (${n} internal importer${n === 1 ? '' : 's'})`)
}
console.log(`\n  TOTAL: ${safe.length} files, ${lines} lines`)

console.log(`\n${'='.repeat(72)}`)
console.log(`HAS A LIVE EDGE — do NOT delete: ${live.length}`)
console.log(`${'='.repeat(72)}`)
for (const [c, ext] of live) {
  console.log(`\n  ${c}`)
  for (const e of ext) console.log(`      <- ${e}`)
}
