/* DOES HIS LIVE SHEET HAVE LAY ON HANDS AND CHANNEL DIVINITY?
 *
 * He said "I thought that was originally working correctly", and he is a level
 * 7 Paladin — both are class features every paladin has. The export file at
 * Downloads has neither: `resourcePools: []`, four features, none with uses.
 *
 * But `rules-2024/pools.ts`'s own header records a DIFFERENT measurement of the
 * same character: "Nix's sheet has `paladinResources: undefined` and carries
 * Lay on Hands as a FEATURE with `usesMax: 40`." Those two cannot both describe
 * the app he is running today. The export is a file; localStorage is the app.
 * Ask the app.
 *
 * Reads only. Opens the page, dumps every codex key it can find, and reports
 * what the stored character actually carries.
 *
 *   node docs/plans/your-turn/_diag-pools.mjs [url]
 */
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:5174'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(URL, { waitUntil: 'networkidle' })

const dump = await page.evaluate(() => {
  const out = { keys: [], characters: [] }
  for (let i = 0; i < localStorage.length; i++) out.keys.push(localStorage.key(i))

  /* A character is anything that has a class and a level. Found by shape, not
     by key name, so a renamed storage key does not make this print "absent". */
  for (const k of out.keys) {
    let v
    try { v = JSON.parse(localStorage.getItem(k)) } catch { continue }
    const cands = Array.isArray(v) ? v : [v]
    for (const c of cands) {
      if (!c || typeof c !== 'object') continue
      if (!('class' in c) || !('level' in c)) continue
      out.characters.push({
        storageKey: k,
        name: c.name, cls: c.class, subclass: c.subclass, level: c.level,
        hitPoints: c.hitPoints, tempHP: c.tempHP,
        paladinResources: c.paladinResources ?? null,
        resourcePools: c.resourcePools ?? null,
        features: (c.features ?? []).map(f => ({
          name: f.name, usesMax: f.usesMax, usesCurrent: f.usesCurrent, level: f.level,
        })),
        spells: (c.spells ?? []).map(s => ({ name: s.name, level: s.level, prepared: s.prepared })),
      })
    }
  }
  return out
})

console.log('STORAGE KEYS:', dump.keys.join(', ') || '(none)')
console.log(`\nCHARACTERS FOUND: ${dump.characters.length}`)

for (const c of dump.characters) {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`${c.name}  —  ${c.cls} ${c.subclass ?? ''} lvl ${c.level}   [key: ${c.storageKey}]`)
  console.log(`${'='.repeat(72)}`)
  console.log(`  hitPoints: ${JSON.stringify(c.hitPoints)}   tempHP: ${c.tempHP}`)
  console.log(`  paladinResources: ${JSON.stringify(c.paladinResources)}`)
  console.log(`  resourcePools:    ${JSON.stringify(c.resourcePools)}`)
  console.log(`\n  FEATURES (${c.features.length}):`)
  for (const f of c.features)
    console.log(`    ${String(f.name).padEnd(28)} uses ${f.usesCurrent ?? '—'}/${f.usesMax ?? '—'}  (lvl ${f.level ?? '—'})`)
  const named = n => c.features.some(f => String(f.name).toLowerCase().includes(n))
  console.log(`\n  LAY ON HANDS present as a feature:      ${named('lay on hands')}`)
  console.log(`  CHANNEL DIVINITY present as a feature: ${named('channel divinity')}`)
  console.log(`\n  SPELLS (${c.spells.length}):`)
  for (const s of c.spells)
    console.log(`    ${String(s.name).padEnd(24)} lvl ${s.level}  prepared=${s.prepared}`)
}

await browser.close()
