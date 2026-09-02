/* ===========================================================================
   HELD REACTION · SLICE 1 — the cloak, on the glass.

     npm run build && npx vite preview --port 4321 --host   (in another shell)
     node docs/plans/reactions/prove-slice1.mjs [baseUrl] [shotsDir]

   `faces.test.ts` and `compose.faces.test.ts` prove the MODEL: canon prices
   Hearthfire Manifest twice, the composer mints a row for each, and his sheet's
   shape is the one that shows it. Neither can see a screen, and slice 1's claim
   is a claim about a screen — "the reactions band goes from 1 row to 2".

   THE SEED IS HIS ACTUAL EXPORT, read from disk. If it is not there this probe
   REFUSES rather than quietly proving something about `nix.ts` — which is the
   one sheet in this repo that cannot show the fault, because it has the split
   already done by hand. That is slice 1's own finding and it is why this file
   does not fall back.

   FINDING Q — the claims are geometric. A row counts when its own element has a
   box with area and that box sits inside the band's box. `textContent` reports
   clipped and off-screen text in full, and this app permanently mounts two
   dialogs below the fold that read as visible.

     A   the band paints, and its printed count agrees with the list under it
     B   a row for Hearthfire Manifest is in it, priced as a Reaction
     C   its WHEN line is canon's own sentence, verbatim, with no ellipsis
     D   the Opportunity Attack row he already had is still there
     E   clean console

   The full A–H prover for this phase is slice 6. This one answers slice 1.
   ========================================================================= */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

let SHEET
try {
  SHEET = JSON.parse(readFileSync(NIX_EXPORT, 'utf8'))
} catch (e) {
  console.error(`Marcus's export is not readable at ${NIX_EXPORT} — ${e.message}`)
  console.error('This probe will not substitute a fixture: the fixture is not his sheet.')
  process.exit(1)
}

/* Canon's own file. Check C compares the sentence ON SCREEN against the sentence
   in the shipped JSON — a probe carrying its own typed copy would prove that two
   copies of a string match, which is not the claim being made. */
let CLOAK_SENTENCE = null
try {
  const oath = JSON.parse(
    readFileSync(new URL('../../../src/canon/oath-of-the-hearth.json', import.meta.url), 'utf8'),
  )
  const raw = (oath.features ?? []).find(f => f.name === 'Hearthfire Manifest')?.rawText ?? ''
  CLOAK_SENTENCE =
    raw
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=["'(]?[A-Z])/)
      .map(s => s.trim())
      .find(s => /^When you are hit by a melee attack/.test(s)) ?? null
} catch (e) {
  console.error(`canon's oath file is not readable — ${e.message}`)
  process.exit(1)
}
if (!CLOAK_SENTENCE) {
  console.error('canon no longer states the retaliation as its own sentence. Check C is void.')
  process.exit(1)
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try {
      return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)
    } catch {
      return []
    }
  })(),
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

const BASE = (process.argv[2] || 'http://[::1]:4321/the-codex/').replace(/\/?$/, '/')
const OUT = process.argv[3] || 'docs/plans/reactions/_shots'
mkdirSync(OUT, { recursive: true })

/* Round 3, and NOT his turn — the window in which a reaction is the only thing
   he owns, which is the window a reactions band is read in. */
const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
})

const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

await ctx.addInitScript(
  ([id, sheetJson, combatJson]) => {
    localStorage.setItem('codex-character-' + id, sheetJson)
    localStorage.setItem('codex-active-id', id)
    if (!localStorage.getItem('codex-combat-' + id)) {
      localStorage.setItem('codex-combat-' + id, combatJson)
    }
    const s = JSON.parse(sheetJson)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([
        {
          id,
          name: s.name,
          class: s.class,
          subclass: s.subclass,
          level: s.level,
          updatedAt: '2026-08-30T00:00:00.000Z',
        },
      ]),
    )
  },
  [SHEET.id, JSON.stringify(SHEET), IN_COMBAT],
)

const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + String(e)))
page.on('console', m => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})
await page.goto(BASE, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1500)

const readBand = () =>
  page.evaluate(() => {
    const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
    const band = document.querySelector('section[aria-label="Your reactions"]')
    if (!band) return { band: null }
    const bandBox = band.getBoundingClientRect()
    const toggle = band.querySelector('button[aria-expanded]')
    const rows = [...band.querySelectorAll('li')].map(li => {
      const btn = li.querySelector('button[aria-label$="— details"]')
      const host = btn ?? li.firstElementChild ?? li
      const r = host.getBoundingClientRect()
      return {
        name:
          (btn?.getAttribute('aria-label') || '').replace(/ — details$/, '') ||
          txt(host.querySelector('span')),
        cost: txt(host.querySelector('.font-mono')),
        paras: [...host.querySelectorAll('p')].map(txt),
        text: txt(host),
        painted: r.width > 0 && r.height > 0,
        insideBand: r.top >= bandBox.top - 1 && r.bottom <= bandBox.bottom + 1,
      }
    })
    return {
      band: txt(band),
      expanded: toggle?.getAttribute('aria-expanded') ?? null,
      countLabel: txt(toggle).replace(/^Your reactions\s*/, ''),
      rows,
    }
  })

let band = await readBand()
if (band.band && band.expanded === 'false') {
  await page.click('section[aria-label="Your reactions"] button[aria-expanded]')
  await page.waitForTimeout(400)
  band = await readBand()
}

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`)
}

if (!band.band) {
  console.error('The reactions band did not render. Nothing below can be measured.')
  await ctx.close()
  await browser.close()
  process.exit(1)
}

await page.evaluate(() => {
  document.querySelector('section[aria-label="Your reactions"]')?.scrollIntoView({ block: 'start' })
})
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/slice1-band.png`, fullPage: false })

console.log('\n=== the band, as painted ===\n')
for (const r of band.rows) {
  console.log(`  · ${r.name}  [${r.cost}]  painted=${r.painted} inside=${r.insideBand}`)
  for (const p of r.paras) console.log(`      ${p}`)
}
console.log('')

const painted = band.rows.filter(r => r.painted && r.insideBand)
check(
  'A · the band paints, and its count agrees with its list',
  painted.length === band.rows.length && band.countLabel.startsWith(String(band.rows.length)),
  `${painted.length} painted of ${band.rows.length} rows; the heading prints "${band.countLabel}"`,
)

const cloak = painted.find(r => /Hearthfire Manifest/i.test(r.name))
check(
  'B · Hearthfire Manifest has a row, priced as a Reaction',
  Boolean(cloak) && /reaction/i.test(cloak.cost),
  cloak ? `"${cloak.name}" priced "${cloak.cost}"` : 'no Hearthfire row in the band',
)

/* CASE-INSENSITIVE, and deliberately so. `ReactionRow` lifts the clause's own
   lead word into a small-caps label — «WHEN you are hit by …» — which is a
   typographic choice this slice did not make and does not get to re-litigate.
   The claim under test is that CANON'S WORDS reach the row unabridged, so the
   comparison is on the words. Everything else is exact: same sentence, same
   order, no ellipsis, nothing appended. */
const whenLine = cloak?.paras.find(p => /when you are hit by a melee attack/i.test(p)) ?? null
check(
  "C · its WHEN line is canon's own sentence, whole",
  Boolean(whenLine) &&
    whenLine.toLowerCase().includes(CLOAK_SENTENCE.toLowerCase()) &&
    !/…|\.\.\./.test(whenLine),
  whenLine ? `"${whenLine}"  ←→ canon: "${CLOAK_SENTENCE}"` : "canon's sentence is not on the row",
)

check(
  'D · the row he already had is still there',
  painted.some(r => /Opportunity Attack/i.test(r.name)),
  painted.map(r => r.name).join(' | '),
)

check('E · clean console', errors.length === 0, errors.join(' ; ') || 'no page errors')

console.log(`\nshot: ${OUT}/slice1-band.png`)
const failed = results.filter(r => !r.pass)
console.log(
  `\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED: ${failed.map(f => f.name).join(', ')}`}\n`,
)

await ctx.close()
await browser.close()
process.exit(failed.length === 0 ? 0 : 1)
