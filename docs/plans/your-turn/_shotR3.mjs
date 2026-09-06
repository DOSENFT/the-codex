/* Slice R3 shot for Marcus: the bracket, replaced.
 *
 * One frame of the ACTION band on his own export at 390x844 — the five rows
 * that used to be taken out of this list to fill a box, each carrying its own
 * "competes", and the sentence that box has shrunk to sitting under the last
 * of them.
 *
 * Scratch, same class as _shot6.mjs — deletable once the slice is signed off.
 * Run:  node docs/plans/your-turn/_shotR3.mjs [url]
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const IN_COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  localStorage.setItem('codex-active-tab', 'combat')
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT)])
const page = await ctx.newPage()
await page.goto(APP + '?d=1', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const dir = 'docs/plans/your-turn/_shots'

/* THE BAND, NOT THE PAGE. A full-page shot at this width puts the sentence
   about 1400px down and proves nothing you can read. This clips the Action
   <section> itself, which is exactly the claim: these rows AND that sentence,
   inside one band. */
const clip = await page.evaluate(() => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const band = [...document.querySelectorAll('.dturn .band')].find(b =>
    flat(b.querySelector('.blbl')).toLowerCase().startsWith('action'),
  )
  if (!band) return null
  band.scrollIntoView({ block: 'start' })
  return null
})
void clip
await page.waitForTimeout(400)

const box = await page.evaluate(() => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const band = [...document.querySelectorAll('.dturn .band')].find(b =>
    flat(b.querySelector('.blbl')).toLowerCase().startsWith('action'),
  )
  const r = band?.getBoundingClientRect()
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
})

await page.screenshot({
  path: `${dir}/sliceR3-action-band.png`,
  clip: box ?? undefined,
})

/* THE FOOT OF THE BAND, which is the frame the slice is actually about — and
   it needs its own shot because his Action band is 1100px tall on a 844px
   phone, so the clip above cannot contain both the head and the sentence. */
await page.evaluate(() => {
  document.querySelector('.dturn .bcon')?.scrollIntoView({ block: 'center' })
})
await page.waitForTimeout(400)
await page.screenshot({ path: `${dir}/sliceR3-band-foot.png` })

/* And the same band with the Action spent, which is the OTHER half of what R2
   and R3 fixed together: seven rows still there, and no markers and no
   sentence, because there is no longer a decision to warn about. */
await page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id')
  const c = JSON.parse(localStorage.getItem('codex-combat-' + id))
  c.turnActions = { ...c.turnActions, action: true }
  localStorage.setItem('codex-combat-' + id, JSON.stringify(c))
})
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(1800)
const box2 = await page.evaluate(() => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const band = [...document.querySelectorAll('.dturn .band')].find(b =>
    flat(b.querySelector('.blbl')).toLowerCase().startsWith('action'),
  )
  band?.scrollIntoView({ block: 'start' })
  const r = band?.getBoundingClientRect()
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
})
await page.screenshot({
  path: `${dir}/sliceR3-action-band-spent.png`,
  clip: box2 ?? undefined,
})

console.log('shots written to', dir)
await browser.close()
