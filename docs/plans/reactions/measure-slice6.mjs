/* Held Reaction — SLICE 6 GROUND TRUTH. Read-only. Clicks nothing, records
 * nothing, writes nothing.
 *
 *   node docs/plans/reactions/measure-slice6.mjs
 *
 * WHY THIS RUNS BEFORE `prove-reactions.mjs` EXISTS.
 *
 * Gate 3's approved check A reads: "the reactions band paints 4 rows: Hearthfire
 * Manifest, Sentinel ×2, Interception", and check D references "Interception
 * (sheet-worded)". `00-status.md:378` already records, from a phase-3
 * measurement, that Interception is NOT in his band. Two approved documents
 * disagree with each other about the thing the phase proof is supposed to check.
 *
 * A prover written now would have to pick one of them, and whichever it picked
 * it would be a proof authored to pass. So: measure the screen, print what is
 * actually there, and let the correction to Gate 3 be made against a
 * measurement rather than against my reading of the source.
 *
 * Slice 1's law, for the fourth time this phase: a thing that models the app
 * after the repair cannot show the fault. In slice 1 the model was `nix.ts`; in
 * slice 5 it was `04-slices.md`; here it is `03-program-design.md`.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'

const RAW = readFileSync(SHEET_PATH, 'utf8')
const SHEET = JSON.parse(RAW)
const SEEDED = JSON.stringify(SHEET)

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

const COMBAT = {
  inCombat: true,
  round: 1,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}

await ctx.addInitScript(
  ([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([
        {
          id,
          name: p.name,
          class: p.class,
          subclass: p.subclass,
          level: p.level,
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
      ]),
    )
  },
  [SHEET.id, SEEDED, JSON.stringify(COMBAT)],
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
const found = await page.locator(BAND).count()
if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
  await page.click(toggle)
  await page.waitForTimeout(400)
}

/** Every reaction row, read off the painted card: its name, its cost, its
 *  trigger line, whether it carries the provenance marker, and its own
 *  bounding box so a caller can tell two rows apart by geometry rather than by
 *  their position in a list. */
const rows = await page.evaluate(
  ([sel, fn]) => {
    const paintedFn = new Function('return ' + fn)()
    const band = document.querySelector(sel)
    if (!band) return null
    const cards = [...band.querySelectorAll('div')].filter(
      d => paintedFn(d) && d.querySelector(':scope > button[aria-label$="— details"]'),
    )
    return cards.map(card => {
      const detail = card.querySelector(':scope > button[aria-label$="— details"]')
      const label = detail.getAttribute('aria-label')
      const leaves = [...card.querySelectorAll('*')]
        .filter(el => el.children.length === 0 && paintedFn(el))
        .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
      /* THE TRIGGER IS NOT A LEAF, and the first run of this file did not see
         it. `ReactionRow` renders it as `<p><span>WHEN</span> {rest}</p>` —
         `rest` is a bare TEXT node, so the `<p>` has one element child and the
         leaf-walker above skips it, while the *unstated* case renders `rest` as
         a `<span>` and would have been seen. A measurement that can see the
         broken case and not the working one would have reported every stated
         trigger as missing. Taken off the paragraph that holds the lead span. */
      const lead = [...card.querySelectorAll('span')].find(
        s => paintedFn(s) && /^when$/i.test((s.textContent || '').trim()),
      )
      const line = lead?.parentElement
      const r = card.getBoundingClientRect()
      const lr = line ? line.getBoundingClientRect() : null
      return {
        name: label.replace(/ — details$/, ''),
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        trigger: line ? (line.textContent || '').replace(/\s+/g, ' ').trim() : null,
        triggerBox: lr ? [Math.round(lr.width), Math.round(lr.height)] : null,
        leaves,
      }
    })
  },
  [BAND, painted.toString()],
)

/** Anything on the WHOLE tab that says the word Interception, painted. Tells
 *  "absent from the band" apart from "absent from the app". */
const interception = await page.evaluate(fn => {
  const paintedFn = new Function('return ' + fn)()
  return [...document.querySelectorAll('*')]
    .filter(el => el.children.length === 0 && paintedFn(el))
    .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(t => /interception/i.test(t))
}, painted.toString())

await page.screenshot({ path: `${SHOTS}/slice6-band-as-measured.png`, fullPage: false })

/* THE SHEET, AFTER. Nothing above clicks anything, so this had better be
   identical — and if it is not, the phase proof needs to know that BEFORE it
   starts driving the app. */
const after = await page.evaluate(id => localStorage.getItem('codex-character-' + id), SHEET.id)
const h = s => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16)

const out = {
  bandFound: found,
  rowCount: rows ? rows.length : null,
  rows,
  interceptionOnTab: interception,
  sheet: { seeded: h(SEEDED), after: after === null ? null : h(after), identical: after === SEEDED },
  noise,
}

writeFileSync('docs/plans/reactions/_shots/slice6-measured.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))

await ctx.close()
await browser.close()
