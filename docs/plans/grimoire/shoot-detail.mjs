/* ===========================================================================
   THE COMBAT DETAIL SHEET, PHOTOGRAPHED — slice 2's "before" and "after".

     node docs/plans/grimoire/shoot-detail.mjs before [baseUrl]
     node docs/plans/grimoire/shoot-detail.mjs after  [baseUrl]

   Slice 2 moves the canon core of `turn/detail.ts` into `canon/bands.ts` and
   claims NOTHING CHANGES ON SCREEN. That claim is only worth making if it can
   fail, so it is made twice against pixels rather than once against memory:
   this opens the same detail sheets on both builds and the two runs' PNGs are
   hashed and compared. A screenshot judged by eye would pass a one-word
   difference; a hash will not.

   The MODEL half of the same claim is `src/lib/turn/__snapshot-detail.test.ts`,
   which dumps `optionDetail` for every option at three economy states. Neither
   covers the other: the dump cannot see the render, and the render cannot see
   an option that never gets opened here.

   BAND 4 IS UNFOLDED BEFORE THE SHOT. `tactics` is one of the three things
   moving, and it is folded by default — photographing it closed would leave the
   moved code out of the picture entirely.
   ========================================================================= */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'

/* Any label, not just before|after — and that widening is the point.
 *
 * Slice 3 also has to prove it did not disturb the combat sheet, and the only
 * thing it can prove that against is slice 2's nine PNGs. Re-running `after`
 * would have written the comparison over its own baseline: pass, and you have
 * learned nothing you could not have assumed; fail, and the evidence of what it
 * used to look like is gone. So a run names its own folder and no run can
 * destroy an earlier one's record. `[a-z0-9-]` because this becomes a path. */
const WHEN = process.argv[2]
if (!WHEN || !/^[a-z0-9-]+$/.test(WHEN)) {
  console.error('usage: node shoot-detail.mjs <label> [baseUrl]   (e.g. before, after, slice3)')
  process.exit(1)
}

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
let SHEET
try {
  SHEET = JSON.parse(readFileSync(NIX_EXPORT, 'utf8'))
} catch (e) {
  console.error(`Marcus's export is not readable at ${NIX_EXPORT} — ${e.message}`)
  process.exit(1)
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })(),
]
let chromium
try {
  const mod = await import(pathToFileURL(req.resolve('playwright', { paths: searchPaths })).href)
  chromium = mod.chromium ?? mod.default?.chromium
  if (!chromium) throw new Error('resolved playwright but found no chromium export')
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium')
  process.exit(1)
}

const BASE = (process.argv[3] || 'http://localhost:4321/the-codex/').replace(/\/?$/, '/')
const OUT = `docs/plans/grimoire/_shots/detail-${WHEN}`
mkdirSync(OUT, { recursive: true })

/* Named rather than discovered, so that "the row vanished" is a FAILURE here
   and not a silently shorter list of screenshots.

   These nine are every row his real sheet produces, and between them they cover
   each branch of the code slice 2 moves: The Dawn Guardian has no canon record
   at all (the fallback), Hearthfire Manifest resolves as a canon FEATURE (the
   mechanics bag), Divine Smite is the spell-filed-as-a-feature that forces the
   both-ways-round resolution, and Burning Hands / Faerie Fire carry a save row
   that `withSaveDC` has to prefix with his DC 14.

   ROW BUTTONS ONLY — `li > button`. Matching plain `button` by name picked up
   the CONCENTRATION button for "Shield of Faith" on the first run of this file
   and photographed a different sheet while reporting success. The row's text
   runs on ("Divine SmiteBonus action2d8 Radiant…"), so the name is matched as a
   PREFIX and never with a `\b`, which is what let that first run miss. */
const WANTED = [
  'The Dawn Guardian',
  'Hearthfire Manifest',
  'Divine Smite',
  'Shield of Faith',
  'Bless',
  'Burning Hands',
  'Faerie Fire',
  'Scorching Ray',
  'Warding Bond',
]

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

await ctx.addInitScript(
  ([id, sheetJson]) => {
    localStorage.setItem('codex-character-' + id, sheetJson)
    localStorage.setItem('codex-active-id', id)
    const s = JSON.parse(sheetJson)
    localStorage.setItem('codex-roster', JSON.stringify([
      { id, name: s.name, class: s.class, subclass: s.subclass, level: s.level,
        updatedAt: '2026-08-28T00:00:00.000Z' },
    ]))
  },
  [SHEET.id, JSON.stringify(SHEET)],
)

const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const settle = async () => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
}

await page.goto(BASE, { waitUntil: 'load' })
await settle()
await page.locator('button', { hasText: 'Combat' }).first().click({ timeout: 10000 })
await settle()

/* Both collapsed sections opened first — six of the nine live behind them, and
   a row that is not in the DOM cannot be compared before against after. */
for (const label of [/your reactions/i, /everything else/i]) {
  const b = page.locator('button', { hasText: label }).first()
  if (await b.count()) { await b.click({ timeout: 5000 }).catch(() => {}); await settle() }
}

const shot = []
for (const name of WANTED) {
  const row = page.locator('li > button', { hasText: new RegExp(`^\\s*${escape(name)}`, 'i') }).first()
  if (!(await row.count())) { shot.push({ name, ok: false, why: 'no row' }); continue }
  try {
    await row.scrollIntoViewIfNeeded({ timeout: 5000 })
    await row.click({ timeout: 5000 })
  } catch (e) { shot.push({ name, ok: false, why: 'click: ' + e.message.split('\n')[0] }); continue }
  await settle()

  const dialog = page.locator('[role="dialog"]').last()
  if (!(await dialog.count())) { shot.push({ name, ok: false, why: 'no dialog' }); continue }

  // Unfold band 4 — see the header.
  const fold = dialog.locator('button', { hasText: /how to use it/i }).first()
  if (await fold.count()) { await fold.click({ timeout: 5000 }).catch(() => {}); await settle() }

  const file = `${OUT}/${name.replace(/\s+/g, '-').toLowerCase()}.png`
  await dialog.screenshot({ path: file })
  shot.push({ name, ok: true, file })

  await page.keyboard.press('Escape')
  await settle()
}

await ctx.close()
await browser.close()

console.log(`\n=== DETAIL SHEETS · ${WHEN.toUpperCase()} ===\n`)
for (const s of shot) console.log(`${s.ok ? 'shot' : 'MISS'}  ${s.name}${s.ok ? '' : '  — ' + s.why}`)
console.log(`\nconsole: ${errors.length ? errors.slice(0, 4).join(' | ') : 'clean'}`)
const missed = shot.filter(s => !s.ok)
console.log(missed.length ? `\n${missed.length} of ${WANTED.length} not photographed` : `\nall ${WANTED.length} photographed → ${OUT}`)
process.exit(missed.length || errors.length ? 1 : 0)
