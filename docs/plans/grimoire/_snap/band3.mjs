/* GROUND TRUTH FOR CHECK C's BAND-3 COUNT — and the thing that caught the
 * proof lying.
 *
 * Written in slice 4 to answer "why did C's 'also had canon's advice' go from 9
 * to 3 when nothing touched band 3?" It separates two questions the main sweep
 * had collapsed into one: is band 3 IN THE DOM, and is it SEEN. The answer was
 * 30 in DOM, 3 seen, with every miss attributable to the probe's own
 * single-point hit test — `scrollIntoView` unable to centre a band taller than
 * the fold, the app's fixed header, and slice 4's sticky group heading.
 *
 * KEPT, not deleted, and this is why: after `prove-catalogue.mjs` was fixed it
 * reported 30, and a corrected probe agreeing with itself is not evidence. This
 * file arrives at 30 by a different route — it never asks "is it visible", only
 * "is it there" — so the two numbers are independent. C is counted, not
 * required, which means nothing can make C go red over this number; an
 * independent second measurement is the only thing that can keep it honest.
 *
 * Run it whenever C's advice count moves without a reason.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const mod = await import(pathToFileURL(req.resolve('playwright', {
  paths: [process.cwd(), ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })()],
})).href)
const chromium = mod.chromium ?? mod.default?.chromium

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(([id, j]) => {
  localStorage.setItem('codex-character-' + id, j)
  localStorage.setItem('codex-active-id', id)
  const s = JSON.parse(j)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: s.name, class: s.class, subclass: s.subclass, level: s.level, updatedAt: '2026-08-28T00:00:00.000Z' }]))
}, [SHEET.id, JSON.stringify(SHEET)])

const page = await ctx.newPage()
await page.goto(process.argv[2] || 'http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1200)
await page.locator('button', { hasText: 'Grimoire' }).first().click()
await page.waitForTimeout(1200)

const out = await page.evaluate(async () => {
  const tick = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))
  const rowOf = k => document.querySelector(`[data-catalogue-entry="${CSS.escape(k)}"]`)
  const keys = [...document.querySelectorAll('[data-catalogue-entry]')].map(e => e.getAttribute('data-catalogue-entry'))
  const res = []
  for (const key of keys) {
    let row = rowOf(key)
    if (!row.hasAttribute('data-locked')) continue
    row.scrollIntoView({ block: 'start', behavior: 'instant' }); await tick()
    rowOf(key)?.querySelector('button')?.click(); await tick()
    const band = rowOf(key)?.querySelector('[data-band="3"]')
    let inDom = !!band, seen = false, blockedBy = null
    if (band) {
      band.scrollIntoView({ block: 'center', behavior: 'instant' }); await tick()
      const b = rowOf(key).querySelector('[data-band="3"]')
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, 6)
      const top = document.elementFromPoint(cx, cy)
      seen = !!top && (b === top || b.contains(top) || top.contains(b))
      if (!seen) blockedBy = top ? (top.tagName + '.' + String(top.className).slice(0, 60)) : `no element at ${Math.round(cx)},${Math.round(cy)}`
    }
    res.push({ key, inDom, seen, blockedBy })
    rowOf(key)?.querySelector('button')?.click(); await tick()
  }
  return res
})

await browser.close()
const dom = out.filter(r => r.inDom)
const seen = out.filter(r => r.seen)
console.log(`locked rows: ${out.length}`)
console.log(`band 3 IN DOM: ${dom.length}`)
console.log(`band 3 SEEN : ${seen.length}`)
console.log('\nin DOM but not seen:')
for (const r of dom.filter(x => !x.seen)) console.log(`  ${r.key}  blocked by → ${r.blockedBy}`)
