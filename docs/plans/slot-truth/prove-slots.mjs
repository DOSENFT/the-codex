/* ===========================================================================
   THE SLOTS HE DOES NOT HAVE, AS PAINTED — proof for the level-3 slot repair.

     npm run build && npx vite preview --port 4321 --host    (in another shell)
     node docs/plans/slot-truth/prove-slots.mjs [baseUrl] [shotsDir]

   `adopt.test.ts` proves the RULE: what the half-caster table makes of a sheet,
   and that it stays quiet when it has nothing to say. `VitalsBand.test.tsx`
   proves the MARKUP and scans the wire. Neither of them can see a screen.
   Finding BM is explicit that a correct module the app does not paint is a
   half-built feature running as if done, and his complaint was never about a
   function — it was that a row of slots he cannot cast is "confusing and taking
   up screen space".

   So this drives the real app in a real Chrome and answers the only question
   that was ever asked: is the 3rd-level row on the screen, does one press take
   it off, and does it stay off.

   THE SEED IS HIS ACTUAL EXPORT, read from disk. `nix-seed.mjs` — the seed every
   other probe in these folders uses — is a level 8 with no 3rd-level slots at
   all, so it cannot reproduce this at any level of care. If the export is not
   on disk this probe REFUSES to run rather than quietly proving something else.

   FINDING Q — every claim about the screen is geometric. A pip is only "there"
   if its own element has a box with area and is the topmost thing at its own
   centre. `textContent` reports clipped and off-screen text in full, and this
   app permanently mounts dialogs below the fold that read as visible.

   THE CONTROL THAT KEEPS THIS HONEST is check C2. "The 3rd row left the screen"
   is also satisfied by the whole band unmounting, by the tab erroring out, by a
   white page. So the 1st and 2nd rows are counted after the press too, and the
   exact pips he still owns — including the 2nd-level slot he has already spent —
   have to still be sitting there.

     A   before: the 3rd-level pips are painted, and so is the door
     B   the door says what it will do, in the words the flag already used
     C1  after the press: no 3rd-level pip anywhere on the tab
     C2  ...and 1st ×4 and 2nd ×3 are still painted, 2nd still spent to 2
     D   after a reload: still gone — it reached storage, not just the DOM
     E   clean console, no page errors
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
  console.error('This probe will not substitute a fixture: the fixture cannot hold the fault.')
  process.exit(1)
}
if (!SHEET.spellSlots?.[3]?.max) {
  console.error('The export no longer carries 3rd-level slots. There is nothing here to prove.')
  process.exit(1)
}

/* Playwright is not a dependency of this repo; it lives wherever npx last put
   it. Resolved the way every other probe in these plan folders does it. */
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

const BASE = (process.argv[2] || 'http://localhost:4321/the-codex/').replace(/\/?$/, '/')
const OUT = process.argv[3] || 'docs/plans/slot-truth/_shots'
mkdirSync(OUT, { recursive: true })

/* The pips live in the turn card, which only draws during an encounter — this
   is the tab he opens mid-combat, so that is the state to measure. The combat
   record carries its own slot bookkeeping; it is seeded to agree with the sheet
   so that nothing here can be mistaken for the repair working. */
const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 1, max: 3 }, 3: { used: 0, max: 2 } },
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

/* SEEDED ONLY IF ABSENT. `addInitScript` runs on every navigation, and check D
   reloads on purpose — an unconditional write would put the 3rd-level slots
   back and D would fail for a reason that has nothing to do with the repair.
   Worse, if it were written the other way round it would PASS for the wrong
   reason. Conditional is the only version of this that can be believed. */
await ctx.addInitScript(
  ([id, sheetJson, combat]) => {
    if (!localStorage.getItem('codex-character-' + id)) {
      localStorage.setItem('codex-character-' + id, sheetJson)
    }
    if (!localStorage.getItem('codex-combat-' + id)) {
      localStorage.setItem('codex-combat-' + id, combat)
    }
    localStorage.setItem('codex-active-id', id)
    if (!localStorage.getItem('codex-roster')) {
      const s = JSON.parse(sheetJson)
      localStorage.setItem('codex-roster', JSON.stringify([
        { id, name: s.name, class: s.class, subclass: s.subclass, level: s.level,
          updatedAt: '2026-08-28T00:00:00.000Z' },
      ]))
    }
  },
  [SHEET.id, JSON.stringify(SHEET), IN_COMBAT],
)

const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

/** Every slot pip he can reach, by level, counted only if it is really there.
 *
 *  TWO SURFACES DRAW THIS ROW, not one. `combat/TurnSummary.tsx` names its pips
 *  "<Nth> slot <i>: expend|restore"; the sticky bar in `TurnDeck.tsx` names its
 *  own "Expend <Nth> level spell slot". Counting only the first would let the
 *  repair pass while the phantom row was still sitting at the bottom of his
 *  screen — which is the surface he sees without scrolling at all. Both shapes
 *  are matched on their FORM, never on the number 3, so a sheet with 9th-level
 *  slots reads exactly as well.
 *
 *  IT SCROLLS BEFORE IT MEASURES. The turn card's pips sit ~1700px down inside
 *  `main`'s own scroller, and the first run of this probe reported "(none)" for
 *  every level including the ones he really owns — the probe's viewport, not the
 *  app's silence. So each candidate is brought into view first and only then
 *  asked for its box. An element that CANNOT be brought into view — a control
 *  parked in a closed drawer, of which this app mounts several — still fails,
 *  because after the scroll its rect is outside the viewport and
 *  `elementFromPoint` has nothing to return.
 *
 *  Filled vs empty is read off the verb the app itself chose: you can only
 *  expend a slot you still have. */
const readPips = page => page.evaluate(async () => {
  const SHAPES = [
    { re: /^(\d+(?:st|nd|rd|th)) slot \d+: (expend|restore)$/, lvl: 1, verb: 2, where: 'turn card' },
    { re: /^(?:(expend|restore)) (\d+(?:st|nd|rd|th)) level spell slot$/i, lvl: 2, verb: 1, where: 'sticky bar' },
  ]
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  const out = {}

  for (const el of document.querySelectorAll('button[aria-label]')) {
    const name = el.getAttribute('aria-label')
    const shape = SHAPES.find(s => s.re.test(name))
    if (!shape) continue
    const m = shape.re.exec(name)

    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    await frame()

    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue
    const top = document.elementFromPoint(cx, cy)
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue

    const key = `${shape.where}|${m[shape.lvl].toLowerCase()}`
    const row = (out[key] ??= { where: shape.where, level: m[shape.lvl].toLowerCase(), total: 0, filled: 0 })
    row.total++
    if (m[shape.verb].toLowerCase() === 'expend') row.filled++
  }
  /* One entry per surface per level. Kept apart rather than summed, because
     "eight 1st-level pips" is a number nobody can check and "four in the turn
     card and four in the sticky bar" is the actual claim. */
  return Object.values(out)
})

/** The door, if it is painted: its label, the sentence on it, its box.
 *
 *  IT SCROLLS TOO, and for the same reason `readPips` does — reading it after
 *  the pip sweep found it sitting at y=-1150 and called it not-topmost, which
 *  was a true statement about where the probe had left the page and a false one
 *  about the app. Bringing it into view first is what a person does. */
const readDoor = page => page.evaluate(async () => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => (b.textContent || '').includes('Use the 2024 slots'))
  if (!btn) return null
  btn.scrollIntoView({ block: 'center', behavior: 'instant' })
  await new Promise(r => requestAnimationFrame(() => r()))
  const r = btn.getBoundingClientRect()
  if (r.width < 1 || r.height < 1) return null
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return {
    text: (btn.textContent || '').replace(/\s+/g, ' ').trim(),
    box: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
    topmost: !!top && (btn === top || btn.contains(top) || top.contains(btn)),
  }
})

/** What actually reached the disk. Corroboration, never the assertion — the
 *  screen is the claim; this only says whether it will survive the night. */
const readStored = (page, id) =>
  page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').spellSlots ?? null, 'codex-character-' + id)

const settle = async () => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
}

await page.goto(BASE, { waitUntil: 'load' })
await settle()

/* ── A · before ─────────────────────────────────────────────────────────── */
const pipsBefore = await readPips(page)
const doorBefore = await readDoor(page)
const storedBefore = await readStored(page, SHEET.id)
await page.screenshot({ path: `${OUT}/slots-before.png` })

/* ── B · the press ──────────────────────────────────────────────────────── */
let pressed = false
if (doorBefore) {
  await page.locator('button', { hasText: 'Use the 2024 slots' }).first().click({ timeout: 10000 })
  pressed = true
  await settle()
}

const pipsAfter = await readPips(page)
const doorAfter = await readDoor(page)
const storedAfter = await readStored(page, SHEET.id)
await page.screenshot({ path: `${OUT}/slots-after.png` })

/* ── D · and again tomorrow ─────────────────────────────────────────────── */
await page.reload({ waitUntil: 'load' })
await settle()
const pipsReload = await readPips(page)
const doorReload = await readDoor(page)
await page.screenshot({ path: `${OUT}/slots-reload.png` })

await ctx.close()
await browser.close()

/* ── the verdict ────────────────────────────────────────────────────────── */
const fmt = rows => rows.length
  ? rows.map(r => `${r.where} ${r.level} ${r.filled}/${r.total}`).sort().join(' · ')
  : '(none)'
const at = (rows, level) => rows.filter(r => r.level === level)
/** Every surface that draws this level agrees on filled/total — said this way
 *  so a surface that quietly stops drawing cannot pass by absence. */
const everywhere = (rows, level, filled, total, surfaces) => {
  const found = at(rows, level)
  return found.length === surfaces && found.every(r => r.filled === filled && r.total === total)
}

const checks = [
  {
    id: 'A',
    what: 'before the press, the 3rd-level pips are on his screen — in BOTH surfaces that draw them',
    got: `pips: ${fmt(pipsBefore)} | door: ${doorBefore ? doorBefore.box + ' topmost=' + doorBefore.topmost : 'ABSENT'}`,
    ok: at(pipsBefore, '3rd').length === 2
      && at(pipsBefore, '3rd').every(r => r.total === 2)
      && !!doorBefore && doorBefore.topmost,
  },
  {
    id: 'B',
    what: 'the door says what it will do, so it can be refused before it is pressed',
    got: doorBefore ? doorBefore.text : 'ABSENT',
    ok: !!doorBefore
      && doorBefore.text.includes('1st ×4 · 2nd ×3 · 3rd ×2')
      && doorBefore.text.includes('→ 1st ×4 · 2nd ×3'),
  },
  {
    id: 'C1',
    what: 'one press and no 3rd-level pip is left in either surface',
    got: `pressed=${pressed} pips: ${fmt(pipsAfter)} | door: ${doorAfter ? 'STILL THERE' : 'gone, it has nothing left to offer'}`,
    ok: pressed && at(pipsAfter, '3rd').length === 0 && !doorAfter,
  },
  {
    id: 'C2',
    what: 'and the slots he DOES have are untouched — 2nd still spent to 2, not handed back',
    got: `pips: ${fmt(pipsAfter)}`,
    ok: everywhere(pipsAfter, '1st', 4, 4, 2) && everywhere(pipsAfter, '2nd', 2, 3, 2),
  },
  {
    id: 'D',
    what: 'it reached storage, so the row is still gone after a reload',
    got: `pips: ${fmt(pipsReload)} | door: ${doorReload ? 'REOPENED' : 'quiet'} | stored: ${JSON.stringify(storedAfter)}`,
    ok: at(pipsReload, '3rd').length === 0
      && at(pipsReload, '1st').length === 2
      && !doorReload
      && !!storedAfter && Object.keys(storedAfter).sort().join(',') === '1,2',
  },
  {
    id: 'E',
    what: 'nothing threw on the way',
    got: errors.length ? errors.slice(0, 4).join(' ⏎ ') : 'clean',
    ok: errors.length === 0,
  },
]

console.log('\n=== THE LEVEL-3 SLOTS, AS PAINTED ===\n')
console.log(`seed  : ${SHEET.name} · ${SHEET.class} ${SHEET.level} · stored on load ${JSON.stringify(storedBefore)}`)
console.log(`shots : ${OUT}\n`)
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id} · ${c.what}`)
  console.log(`        ${c.got}\n`)
}
const ok = checks.every(c => c.ok)
console.log(ok
  ? 'The row he cannot cast is off his screen, and it stays off.'
  : 'FAILED — a claim above is not true of the running app.')
process.exit(ok ? 0 : 1)
