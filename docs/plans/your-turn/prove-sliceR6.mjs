/* SLICE R6 — "he can see it."  Prover, 2026-09-04.
 *
 * R4 made the rule true. R5 made the engine HOLD the Action across both swings.
 * Neither put a word on the glass, and Marcus's complaint was never that a
 * second swing was refused — it was that the app never told him it knew he had
 * two. So this file does not seed `attacksUsed`. It boots his REAL export with
 * nothing spent, TAPS THE WEAPON ROW the way his thumb would, and then reads
 * what changed on the screen:
 *
 *   · the band header chip   "1 of 2 used"
 *   · the row line           "1 attack left · Swing again"
 *
 * A prover that hand-set the number would prove the components render a prop.
 * Tapping proves the reducer, the composer, the screen and the CSS agree — the
 * whole path, at the width he holds the phone at.
 *
 * IT ALSO MEASURES. Gate 3 recorded a fallback wording (`1/2 used`) in case
 * the chip cannot fit beside "7 ready" and "open" at 390px. That is a question
 * only pixels can answer, so this file answers it: every child of `.bhead` gets
 * its box printed, and the header is checked for overflow.
 *
 *   node docs/plans/your-turn/prove-sliceR6.mjs [url]
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const SHOTS = 'docs/plans/your-turn/mockups'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const NOTHING_SPENT = {
  inCombat: true, round: 3, yourTurn: true,
  spellSlots: {}, concentrating: null,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
}

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level,
      updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  localStorage.setItem('codex-active-tab', 'combat')
}

/* Read the Action band: its header parts WITH BOXES, and its rows. */
const READ = () => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const box = el => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), w: Math.round(r.width) }
  }
  const bands = [...document.querySelectorAll('.band')]
  const action = bands.find(b => txt(b.querySelector('.blbl')) === 'Action')
  const head = action?.querySelector('.bhead')

  /* The chip's ORDER inside the header is part of the claim: it belongs between
   * the ready count and the state, not appended after everything. Read the
   * classes in DOM order rather than asserting on three separate queries. */
  const headOrder = head
    ? [...head.children].map(c => c.className.split(' ')[0] || c.tagName.toLowerCase())
    : []

  const rows = action ? [...action.querySelectorAll('.brows > *')].map(r => ({
    name: txt(r.querySelector('.anm')),
    hasx: r.className.includes('hasx'),
    blocked: r.className.includes('blocked'),
    swing: txt(r.querySelector('.swing')) || null,
    swn: txt(r.querySelector('.swn')) || null,
    swv: txt(r.querySelector('.swv')) || null,
    text: txt(r).slice(0, 60),
  })) : []

  /* Every band's chip, so "ACTION ONLY" is measured and not assumed. */
  const chipsByBand = bands.map(b => ({
    label: txt(b.querySelector('.blbl')),
    chip: txt(b.querySelector('.bhead .batk')) || null,
  }))

  return {
    ready: txt(head?.querySelector('.bn')),
    chip: txt(head?.querySelector('.batk')) || null,
    state: txt(head?.querySelector('.bstate')),
    headOrder,
    headBox: box(head),
    parts: {
      bn: box(head?.querySelector('.bn')),
      batk: box(head?.querySelector('.batk')),
      bstate: box(head?.querySelector('.bstate')),
      blbl: box(head?.querySelector('.blbl')),
    },
    /* Does the header overflow, or did the chip get ellipsised away? */
    overflow: head ? head.scrollWidth - head.clientWidth : null,
    clipped: (() => {
      const c = head?.querySelector('.batk')
      return c ? c.scrollWidth > c.clientWidth + 1 : null
    })(),
    rows,
    chipsByBand,
    swings: document.querySelectorAll('.swing').length,
    viewport: window.innerWidth,
  }
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [
  process.cwd(),
  ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`),
  'C:/Users/marcu/Documents/Command/brain/graph/node_modules',
]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  hasTouch: true, reducedMotion: 'reduce',
})
await ctx.addInitScript(seed, [SHEET.id ?? 'nix', JSON.stringify(SHEET), JSON.stringify(NOTHING_SPENT)])
const page = await ctx.newPage()
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(1700)

/* The bands are below the fold on a 390x844 screen — an unscrolled shot proves
 * only that the app booted. Put the Action band's header at the top of the
 * frame, which is where his thumb puts it. */
const scrollToBands = async () => {
  await page.evaluate(() => {
    const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const band = [...document.querySelectorAll('.band')]
      .find(b => txt(b.querySelector('.blbl')) === 'Action')
    band?.scrollIntoView({ block: 'start', behavior: 'instant' })
  })
  await page.waitForTimeout(400)
}

const show = (r, title) => {
  console.log('\n' + '='.repeat(70) + '\n' + title + '  (viewport ' + r.viewport + ')\n' + '='.repeat(70))
  console.log(`  header: "${r.ready}"  chip: ${r.chip === null ? '(none)' : `"${r.chip}"`}  state: "${r.state}"`)
  console.log(`  header DOM order: ${r.headOrder.join(' | ')}`)
  console.log(`  boxes: blbl ${JSON.stringify(r.parts.blbl)}  bn ${JSON.stringify(r.parts.bn)}` +
              `  batk ${JSON.stringify(r.parts.batk)}  bstate ${JSON.stringify(r.parts.bstate)}`)
  console.log(`  header w ${r.headBox?.w}  overflow ${r.overflow}px  chip clipped: ${r.clipped}`)
  console.log('  Action rows:')
  for (const row of r.rows) {
    console.log(`      ${row.blocked ? '[x]' : '[ ]'} ${row.hasx ? 'hasx' : '    '} ${row.name || row.text}`)
    if (row.swing) console.log(`            -> "${row.swn}" | "${row.swv}"`)
  }
  console.log(`  .swing on the whole page: ${r.swings}`)
  console.log(`  chip per band: ${r.chipsByBand.map(b => `${b.label}=${b.chip ?? '-'}`).join('  ')}`)
}

const before = await page.evaluate(READ)
show(before, 'A · NOTHING SPENT — before the first swing')
await scrollToBands()
await page.screenshot({ path: `${SHOTS}/R6-a-before.png`, fullPage: false })

/* THE TAP. Find the weapon row by the name on it and click the real control —
 * `.acthit` when the row carries an extra, the `.act` button itself when it
 * does not. Before the first swing there is no extra, which is itself part of
 * the claim, so this must handle both. */
const WEAPON = before.rows.find(r => r.name && !r.blocked)?.name
if (!WEAPON) { console.log('\nNO CLICKABLE WEAPON ROW FOUND — stopping.'); await browser.close(); process.exit(1) }
console.log(`\n  >>> tapping "${WEAPON}"`)

await page.evaluate(name => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const row = [...document.querySelectorAll('.band .brows > *')]
    .find(r => txt(r.querySelector('.anm')) === name)
  const hit = row.querySelector('.acthit') ?? row
  hit.click()
}, WEAPON)
await page.waitForTimeout(900)

/* THE PRESS OPENS; THE SHEET SPENDS (`TurnLive.tsx:309`). The commit is a
 * button reading "Spend / Action" inside the sheet the row just opened — found
 * by `_diagR6b.mjs`, not guessed. An earlier draft of this file matched /attack/
 * and hit the DICE ROLLER's "Attack" filter tab, which silently did nothing and
 * made a working feature look broken; hence the narrow anchor and the assert. */
const committed = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find(x => /^spend/i.test((x.textContent ?? '').replace(/\s+/g, ' ').trim()))
  if (b) { b.click(); return (b.textContent ?? '').replace(/\s+/g, ' ').trim() }
  return null
})
if (!committed) { console.log('\nNO "SPEND" CONTROL IN THE SHEET — stopping.'); await browser.close(); process.exit(1) }
console.log(`  >>> commit control: "${committed}"`)
await page.waitForTimeout(900)
/* Close the sheet so the bands underneath are what gets read and photographed. */
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /close/i.test(x.textContent ?? ''))
  b?.click()
})
await page.waitForTimeout(700)

const after = await page.evaluate(READ)
show(after, 'B · ONE SWING TAKEN — mid-Attack')
await scrollToBands()
await page.screenshot({ path: `${SHOTS}/R6-b-mid-attack.png`, fullPage: false })

/* C · THE SECOND SWING — the complaint itself.
 *
 * "It also doesnt allow me to take my two mele attacks." Everything above is
 * decoration if the second press is refused, so press it the same way and read
 * the same screen. Mid-Attack the row carries an extra, which means `Act` has
 * split it into `.acthit` + `.actx` — the press target is no longer the row. */
console.log(`\n  >>> tapping "${WEAPON}" a SECOND time`)
const second = await page.evaluate(name => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const row = [...document.querySelectorAll('.band .brows > *')]
    .find(r => txt(r.querySelector('.anm')) === name)
  if (!row) return 'row gone'
  const hit = row.querySelector('.acthit') ?? row
  if (row.className.includes('blocked')) return 'row is BLOCKED — the second swing was refused'
  hit.click()
  return 'pressed'
}, WEAPON)
console.log(`  >>> ${second}`)
await page.waitForTimeout(900)
const committed2 = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /^spend/i.test((x.textContent ?? '').replace(/\s+/g, ' ').trim()))
  if (b) { b.click(); return (b.textContent ?? '').replace(/\s+/g, ' ').trim() }
  return null
})
console.log(`  >>> commit control: ${committed2 ? `"${committed2}"` : '(none offered — the sheet would not spend)'}`)
await page.waitForTimeout(900)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /close/i.test(x.textContent ?? ''))
  b?.click()
})
await page.waitForTimeout(700)
const done = await page.evaluate(READ)
show(done, 'C · BOTH SWINGS TAKEN — the action is finally spent')
await scrollToBands()
await page.screenshot({ path: `${SHOTS}/R6-c-spent.png`, fullPage: false })

console.log('\n' + '='.repeat(70) + '\nTHE CLAIM\n' + '='.repeat(70))
const q = c => (c === null ? '(none)' : `"${c}"`)
console.log(`  chip:   ${q(before.chip)}  ->  ${q(after.chip)}  ->  ${q(done.chip)}`)
console.log(`  state:  "${before.state}"  ->  "${after.state}"  ->  "${done.state}"`)
console.log(`  swing lines: ${before.swings}  ->  ${after.swings}  ->  ${done.swings}`)
console.log(`  TWO MELEE ATTACKS: ${done.chip === '2 of 2 used' ? 'BOTH LANDED' : `NOT PROVEN — chip reads ${q(done.chip)}`}`)
console.log(`  fits at 390: header overflow ${after.overflow}px, chip clipped ${after.clipped}` +
            `  =>  ${after.overflow === 0 && after.clipped === false ? 'FITS — keep the long wording' : 'DOES NOT FIT — use the `1/2 used` fallback'}`)

await browser.close()
