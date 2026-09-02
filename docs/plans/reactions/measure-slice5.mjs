/* Held Reaction — SLICE 5 GROUND TRUTH. Where the DM's number actually is.
 *
 *   node docs/plans/reactions/measure-slice5.mjs
 *
 * `04-slices.md` predicts slice 5 needs NO new code — `reduce.ts:507` and
 * `CombatHelper.tsx:808` are already wired, and `retaliation.test.ts` proves the
 * accumulation and the undo at the unit level. That prediction is worth exactly
 * as much as a measurement of the screen, so this measures the screen first:
 *
 *   · is the standing +1d10 control PAINTED on his reaction row?
 *   · does a tally line paint beside it, and what does it say before anything?
 *   · is there an Undo affordance on the same screen, and what does it name?
 *
 * Reads only. Nothing here asserts; the assertions live in prove-slice5.mjs.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

await ctx.addInitScript(
  ([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([
        { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
      ]),
    )
  },
  [
    SHEET.id,
    JSON.stringify(SHEET),
    JSON.stringify({
      inCombat: true,
      round: 3,
      yourTurn: true,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: {},
      concentrating: null,
    }),
  ],
)

const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

const BAND = 'section[aria-label="Your reactions"]'
const toggle = `${BAND} button[aria-expanded]`
if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
  await page.click(toggle)
  await page.waitForTimeout(400)
}

const found = await page.evaluate(fn => {
  const paintedFn = new Function('return ' + fn)()
  const text = el => (el.textContent || '').replace(/\s+/g, ' ').trim()

  return {
    standing: [...document.querySelectorAll('button[aria-label*="retaliation" i]')]
      .filter(paintedFn)
      .map(b => ({ label: b.getAttribute('aria-label'), text: text(b) })),
    tallyLines: [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(text)
      .filter(t => /none yet|over \d+ hits?|TOTAL/i.test(t)),
    undo: [...document.querySelectorAll('button')]
      .filter(b => /^Undo\b/.test(text(b)))
      .map(b => ({ text: text(b), disabled: b.disabled, painted: paintedFn(b) })),
    tabs: [...document.querySelectorAll('[role="tab"], nav button')]
      .filter(paintedFn)
      .map(text)
      .filter(Boolean),
  }
}, painted.toString())

console.log(JSON.stringify(found, null, 2))

await ctx.close()
await browser.close()
