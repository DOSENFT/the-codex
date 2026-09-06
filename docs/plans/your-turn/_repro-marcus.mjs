/* Reproduction for Marcus's three combat-tab complaints (2026-09-04).
 *
 * Reads the SAME screen twice — once with nothing spent, once with the Action
 * and Bonus Action spent — and prints what each band actually contains.
 *
 * If the complaint is real, the Action band gets LONGER when the action is
 * SPENT. That is the whole claim, and this file is the thing that can falsify
 * it.  Run:  node docs/plans/your-turn/_repro-marcus.mjs [url]
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const base = {
  inCombat: true, round: 3, yourTurn: true,
  spellSlots: {}, concentrating: null,
}
const NOTHING_SPENT = {
  ...base,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
}
const ACTION_SPENT = {
  ...base,
  turnActions: { action: true, bonusAction: true, reaction: false, movement: false },
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

/* Read the bands and the mutex brackets off the glass. */
const READ = () => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const bands = [...document.querySelectorAll('.band')].map(b => ({
    label: txt(b.querySelector('.blbl')),
    ready: txt(b.querySelector('.bn')),
    state: txt(b.querySelector('.bstate')),
    rows: [...b.querySelectorAll('.brows > *')]
      .map(r => txt(r).slice(0, 54))
      .filter(Boolean),
    empty: txt(b.querySelector('.bempty')) || null,
  }))
  const mutex = [...document.querySelectorAll('.mutex')].map(m => ({
    label: txt(m.querySelector('.lbl')),
    n: txt(m.querySelector('.n')),
    faces: [...m.querySelectorAll('.faces > *')].map(f => txt(f).slice(0, 54)),
  }))

  /* THE CAPTIONS HE NAMED, COUNTED OVER THE WHOLE PAGE — added for Slice R3.
   *
   * `.mutex` is D's own bracket and it is not the only thing painting this
   * sentence: `ContentionBand`, inside the "Everything else" card at the very
   * bottom, paints its own captioned fences with Tailwind classes and no
   * `.mutex` anywhere. Counting only `.mutex` would let R3 report the boxes
   * gone while the ones Marcus described as "underneath it all" were still
   * there. Read off body text so it cannot matter which component drew them. */
  const page = txt(document.body)
  const captions = (page.match(/One of these —/g) ?? []).length
  const pickOne = (page.match(/pick one/gi) ?? []).length

  // What replaces them: a marker on the row, a sentence at the foot of a band.
  const marks = document.querySelectorAll('.act .cmark').length
  const notes = [...document.querySelectorAll('.bcon')].map(n => txt(n).slice(0, 100))

  return { bands, mutex, captions, pickOne, marks, notes, tab: txt(document.querySelector('.list .lbl')) }
}

/* Same resolution the other provers in this folder use: playwright lives in the
 * npx cache, not in the project. */
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

async function look(combat, title) {
  /* Fresh context per state: the seed must be written BEFORE the app boots,
   * because the app reads combat out of localStorage on mount. */
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, reducedMotion: 'reduce',
  })
  await ctx.addInitScript(seed, [SHEET.id ?? 'nix', JSON.stringify(SHEET), JSON.stringify(combat)])
  const page = await ctx.newPage()
  await page.goto(APP, { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  const r = await page.evaluate(READ)
  console.log('\n' + '='.repeat(70) + '\n' + title + '\n' + '='.repeat(70))
  for (const b of r.bands) {
    console.log(`\n  [${b.label}]  ${b.ready} · ${b.state}`)
    if (b.empty) console.log(`      (empty) ${b.empty}`)
    for (const row of b.rows) console.log(`      · ${row}`)
  }
  if (r.mutex.length) {
    for (const m of r.mutex) {
      console.log(`\n  <<MUTEX BOX>> "${m.label}" — ${m.n}`)
      for (const f of m.faces) console.log(`      · ${f}`)
    }
  } else console.log('\n  (no mutex boxes)')
  console.log(
    `\n  captions "One of these —" anywhere on the page: ${r.captions}` +
    `  ·  "pick one": ${r.pickOne}` +
    `\n  contended row markers: ${r.marks}  ·  band notes: ${r.notes.length}`
  )
  for (const n of r.notes) console.log(`      note: ${n}`)
  return r
}

const a = await look(NOTHING_SPENT, 'A · NOTHING SPENT (action + bonus available)')
const b = await look(ACTION_SPENT, 'B · ACTION + BONUS SPENT')

console.log('\n' + '='.repeat(70) + '\nTHE CLAIM\n' + '='.repeat(70))
for (const label of ['Action', 'Bonus']) {
  const ra = a.bands.find(x => x.label === label)?.rows.length ?? 0
  const rb = b.bands.find(x => x.label === label)?.rows.length ?? 0
  const verdict = rb > ra ? '<<< BACKWARDS — longer once SPENT' : rb === ra ? 'same' : 'ok'
  console.log(`  ${label}: ${ra} rows available -> ${rb} rows when spent   ${verdict}`)
}
console.log(`  mutex boxes: ${a.mutex.length} when available -> ${b.mutex.length} when spent`)
console.log(`  "One of these —" captions on the page: ${a.captions} available -> ${b.captions} spent`)
console.log(`  contended markers on rows: ${a.marks} -> ${b.marks}   band notes: ${a.notes.length} -> ${b.notes.length}`)

await browser.close()
