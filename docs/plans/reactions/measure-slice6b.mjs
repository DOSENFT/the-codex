/* Held Reaction — SLICE 6 GROUND TRUTH, part two. Read-only apart from opening
 * detail sheets, which record nothing.
 *
 *   node docs/plans/reactions/measure-slice6b.mjs
 *
 * Gate 3's check D reads: "the canon-worded rows show the provenance marker;
 * Interception (sheet-worded) does not." Two things need measuring before that
 * sentence can be turned into a check.
 *
 * 1. THE MARKER IS NEGATIVE. `OptionDetailSheet.tsx:143` paints "your own" when
 *    `provenance === 'sheet'` and paints NOTHING when it is canon's. So a check
 *    written to look for a marker ON the canon rows would be looking for
 *    something that has never existed, and would fail against a correct app.
 *
 * 2. THE ROW AND THE SHEET COMPUTE IT SEPARATELY. Slice 2 fixed the ROW —
 *    `overlay.ts:447`, `wordsFrom === 'canon'` → `provenance: 'canon'`. The
 *    detail sheet does not read that. It calls `canonBands` in `detail.ts:198`
 *    with `feat: null`, on the stated grounds that "a feat reaches the deck as
 *    an option in its own right, never as a canon record here."
 *
 *    If that means a feat's sheet lands on `provenance: 'sheet'`, then the tag
 *    "your own" is painted over canon's own Sentinel text — which is, word for
 *    word, the fault `overlay.ts:427` says slice 2 was written to kill: "the
 *    book's words, over a mark that says they are his… the reason Marcus could
 *    quote a rule at his DM believing he had written it." One layer down, on the
 *    screen he would actually read before quoting it.
 *
 * So: open each of the four rows' sheets and report the tag. Assert nothing.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium
mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})
const noise = []
ctx.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') noise.push(`${m.type()}: ${m.text()}`)
})
ctx.on('pageerror', e => noise.push(`pageerror: ${e.message}`))

await ctx.addInitScript(
  ([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]),
    )
  },
  [
    SHEET.id,
    JSON.stringify(SHEET),
    JSON.stringify({
      inCombat: true, round: 1, yourTurn: true,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: {}, concentrating: null,
    }),
  ],
)

const page = await ctx.newPage()
const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const BAND = 'section[aria-label="Your reactions"]'
const toggle = `${BAND} button[aria-expanded]`
if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
  await page.click(toggle)
  await page.waitForTimeout(400)
}

const names = await page.evaluate(
  sel => [...document.querySelectorAll(`${sel} button[aria-label$="— details"]`)].map(b => b.getAttribute('aria-label')),
  BAND,
)

const out = []
for (const label of names) {
  await page.click(`${BAND} button[aria-label="${label.replace(/"/g, '\\"')}"]`)
  await page.waitForTimeout(700)
  const seen = await page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const leaves = [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
    return {
      yourOwn: leaves.filter(t => /^your own$/i.test(t)).length,
      heading: leaves.find(t => t.length > 0 && t.length < 60) ?? null,
    }
  }, painted.toString())
  out.push({ row: label.replace(/ — details$/, ''), ...seen })
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /close/i.test((x.textContent || '').trim()))
    b?.click()
  })
  await page.waitForTimeout(500)
  if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
    await page.click(toggle)
    await page.waitForTimeout(300)
  }
}

console.log(JSON.stringify({ sheets: out, noise }, null, 2))
await ctx.close()
await browser.close()
