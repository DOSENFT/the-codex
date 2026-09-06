/* WHAT DOES THE APP ACTUALLY REACH?  Instrument for slice 8c.
 *
 * 8c is a deletion slice, and its list was written on 2026-09-01 by reading the
 * code. `combat/index.ts` carries a comment explaining precisely why that is not
 * good enough — "a re-export makes a file look used to a grep AND TO THE
 * COMPILER alike" — and the barrel turns out to be imported by nothing at all,
 * so every name it re-exports looks live to grep while being unreachable.
 *
 * So this walks the real module graph from the app's entry instead: follow every
 * static import, every `export ... from`, and every dynamic `import()`, and
 * report which source files are never reached. It is a map, not a verdict —
 * unreachable means "nothing renders it", and a human still decides.
 *
 *   node docs/plans/your-turn/_reach.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, relative, extname } from 'node:path'

const ROOT = process.cwd().replace(/\\/g, '/')
const ENTRY = ['src/main.tsx', 'src/App.tsx'].filter(f => existsSync(f))
const EXT = ['.tsx', '.ts', '.jsx', '.js']

/* Resolve a specifier the way Vite would: relative or `@/`-aliased only.
 * Anything else is a package and is not our problem. */
function resolveSpec(spec, fromFile) {
  let base
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else if (spec.startsWith('@/')) base = resolve(ROOT, 'src', spec.slice(2))
  else return null
  base = base.replace(/\\/g, '/')
  if (extname(base) && existsSync(base) && statSync(base).isFile()) return base
  for (const e of EXT) if (existsSync(base + e)) return base + e
  for (const e of EXT) if (existsSync(`${base}/index${e}`)) return `${base}/index${e}`
  return null
}

const SPEC = /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g

const reached = new Set()
const missing = []
const queue = ENTRY.map(f => resolve(ROOT, f).replace(/\\/g, '/'))
while (queue.length) {
  const file = queue.pop()
  if (reached.has(file)) continue
  reached.add(file)
  let src
  try { src = readFileSync(file, 'utf8') } catch { continue }
  for (const m of src.matchAll(SPEC)) {
    const spec = m[1] ?? m[2] ?? m[3]
    if (!spec) continue
    const next = resolveSpec(spec, file)
    if (next) queue.push(next)
    else if (spec.startsWith('.') || spec.startsWith('@/')) missing.push(`${relative(ROOT, file)} -> ${spec}`)
  }
}

/* Every source file on disk, minus tests and type-only decl files. */
const all = []
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`
    if (e.isDirectory()) walk(p)
    else if (EXT.includes(extname(e.name)) && !/\.(test|spec)\.[jt]sx?$/.test(e.name) && !e.name.endsWith('.d.ts')) all.push(p)
  }
}
walk(`${ROOT}/src`)

const dead = all.filter(f => !reached.has(f)).map(f => relative(ROOT, f).replace(/\\/g, '/')).sort()

/* For each dead file: is it imported by any TEST file? A file only tests reach
 * is a different kind of dead — the test is the sole reason it still compiles. */
const tests = []
const walkT = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`
    if (e.isDirectory()) walkT(p)
    else if (/\.(test|spec)\.[jt]sx?$/.test(e.name)) tests.push(p)
  }
}
walkT(`${ROOT}/src`)
const byTest = new Map()
for (const t of tests) {
  const src = readFileSync(t, 'utf8')
  for (const m of src.matchAll(SPEC)) {
    const spec = m[1] ?? m[2] ?? m[3]
    if (!spec) continue
    const r = resolveSpec(spec, t)
    if (!r) continue
    const rel = relative(ROOT, r).replace(/\\/g, '/')
    if (!byTest.has(rel)) byTest.set(rel, [])
    byTest.get(rel).push(relative(ROOT, t).replace(/\\/g, '/'))
  }
}

console.log(`ENTRY: ${ENTRY.join(', ')}`)
console.log(`reached ${reached.size} files · on disk (non-test) ${all.length} · UNREACHED ${dead.length}\n`)
console.log('UNREACHABLE FROM THE APP')
for (const f of dead) {
  const t = byTest.get(f)
  const loc = readFileSync(resolve(ROOT, f), 'utf8').split('\n').length
  console.log(`  ${f}  (${loc} lines)`)
  if (t) console.log(`      kept alive ONLY by: ${[...new Set(t)].join(', ')}`)
}
if (missing.length) {
  console.log('\nUNRESOLVED SPECIFIERS (walker blind spots — check these before trusting the list)')
  for (const m of [...new Set(missing)]) console.log('  ' + m)
}
