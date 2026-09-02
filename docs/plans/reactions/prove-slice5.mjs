/* Held Reaction — SLICE 5 PROVER. The DM's number, and the door back out.
 *
 *   node docs/plans/reactions/prove-slice5.mjs
 *
 * Canon's HEARTH-05: "display the total retaliation damage dealt per encounter
 * so the DM can see the real numbers." `04-slices.md` predicted this slice would
 * need no code — the reducer accumulates, `revert` restores a whole snapshot,
 * and `retaliation.test.ts` proves that undoing the FIRST of three leaves the
 * other two intact.
 *
 * `measure-slice5.mjs` measured that prediction instead of trusting it, and
 * found half of it false: the standing +1d10 control painted, the tally painted,
 * and NO UNDO BUTTON ANYWHERE IN THE DOCUMENT. `undoLast` was reachable only
 * from `TurnScreenD`, behind the `D_PREVIEW` flag, on a screen Marcus has never
 * opened. The engine could take back a mistyped 17; the table could not.
 *
 * That matters here more than it would anywhere else on the tab. Every other
 * number in this app is derived from his sheet and can be recomputed. This one
 * is EVIDENCE — a d10 came up 7 and somebody wrote it down — and he types it by
 * hand, because item 9 says "i most often use my physical dice to roll at the
 * table and prefer physical dice". A number that is typed can be mistyped, and a
 * tally whose whole purpose is to be shown to the DM has to be correctable in
 * front of the DM.
 *
 * So this drives the whole road at his phone's size:
 *
 *   T1 · nothing recorded → the row says "none yet" and offers no Undo
 *   T2 · record 7, 4, 10  → TOTAL 21 Fire over 3 hits
 *   T3 · the Undo names the LAST one, with its amount in it
 *   T4 · press it         → TOTAL 11 Fire over 2 hits, and the Undo now names
 *                           the 4 — so the other two survived the reversal
 *   T5 · record 5         → TOTAL 16 Fire over 3 hits · it moves BOTH ways
 *   N  · spend something that is not a retaliation → the Undo beside the fire
 *        total DISAPPEARS, while the total itself stands
 *   E  · clean console
 *
 * N IS THE CHECK THIS SLICE TURNS ON. `undoLast` reverses the last entry of any
 * kind. An Undo sitting beside a running fire total that silently takes back a
 * spell slot is this phase's own fault in a new place — the app showing him one
 * thing while it means another, in a way he cannot tell apart from the real
 * thing. The band is handed the control only when the entry at the top of the
 * log IS a retaliation, decided by `event.type` and never by looking for the
 * word "retaliation" inside a label built out of a feature name.
 *
 * Every number below is read off PAINTED pixels — finding Q: an element the
 * model built and CSS then collapsed still has textContent.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'

/* THE THREE, THEN THE FOURTH. Chosen so that no total this run can produce is
   reachable by any other arithmetic on the same numbers — see the guard below.
   An em dash, not a hyphen: `reduce.ts` builds the label with U+2014, and a
   prover that compared against a hyphen would fail on punctuation while
   reporting a broken feature. */
const RECORD = [7, 4, 10]
const AGAIN = 5
const DASH = '—'

let SHEET
try {
  SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))
} catch {
  console.error(`REFUSING: his export is not at ${SHEET_PATH}. This prover only
means anything against the sheet he actually plays.`)
  process.exit(2)
}

const hearth = (SHEET.features ?? []).find(f => /hearthfire/i.test(f.name ?? ''))
if (!hearth) {
  console.error('REFUSING: no Hearthfire Manifest on his sheet — no die to tally.')
  process.exit(2)
}
if (hearth.actionType || hearth.usesMax !== undefined) {
  console.error(`REFUSING: his sheet has started to DECLARE the cloak
(actionType=${hearth.actionType} usesMax=${hearth.usesMax}), so the row under
test is no longer the undeclared one this phase is about.`)
  process.exit(2)
}

/* NO TOTAL MAY BE REACHABLE TWICE. The run passes through 21 → 11 → 16, and if
   any of those could also be arrived at by dropping a different entry, or by not
   undoing at all, a pass would not distinguish a working undo from a broken one.
   Checked rather than asserted in a comment, because the day someone edits
   RECORD is exactly the day nobody re-derives this. */
const SUM = RECORD.reduce((a, b) => a + b, 0)
const AFTER_UNDO = SUM - RECORD[RECORD.length - 1]
const FINAL = AFTER_UNDO + AGAIN
const reachable = [
  SUM,
  ...RECORD.map(n => SUM - n), // dropping any ONE of the three
  ...RECORD, // having recorded only one
  SUM + AGAIN, // having failed to undo at all
]
if (reachable.filter(n => n === AFTER_UNDO).length !== 1 || reachable.includes(FINAL)) {
  console.error(`REFUSING: the totals collide — ${JSON.stringify(RECORD)} +${AGAIN}
gives ${SUM} → ${AFTER_UNDO} → ${FINAL}, and ${AFTER_UNDO} or ${FINAL} is reachable
another way. A pass could not tell a working undo from a broken one.`)
  process.exit(2)
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (id, ok, note) => {
  results.push({ id, ok, note })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${note}`)
}

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

/* SEEDED WITH NO RETALIATION AT ALL, which is what makes T1's "none yet" a real
   starting line rather than a value that happened to be zero. */
const COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}
if ('retaliation' in COMBAT) {
  console.error('REFUSING: the seeded encounter already carries a tally.')
  process.exit(2)
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
  [SHEET.id, JSON.stringify(SHEET), JSON.stringify(COMBAT)],
)

const page = await ctx.newPage()

const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

/** The tally as it is PAINTED on the cloak's row: "TOTAL 21 Fire over 3 hits",
 *  or "none yet", or null when the line is not on the screen at all.
 *
 *  Found by walking out from the standing button rather than by searching the
 *  document for the word TOTAL — `measure-slice5.mjs` showed that search also
 *  catches "your total character level" and "Total cover" from the rules
 *  reference elsewhere on the tab. */
const tally = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const button = [...document.querySelectorAll('button[aria-label*="retaliation" i]')].find(
      b => /^Record /.test(b.getAttribute('aria-label') || '') && paintedFn(b),
    )
    const strip = button?.parentElement
    if (!strip) return null
    const line = [...strip.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .find(t => /^TOTAL |^none yet$/.test(t))
    return line ?? null
  }, painted.toString())

/** The Undo control beside the tally, exactly as painted, or null. */
const undoControl = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const b = [...document.querySelectorAll('button')].find(
      x => /^Undo\b/.test((x.textContent || '').replace(/\s+/g, ' ').trim()) && paintedFn(x),
    )
    return b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null
  }, painted.toString())

/** Every painted temp-HP badge: "+10 temp". Used only by N, as proof that the
 *  spend it fires actually landed — an N that passed because the spend was
 *  refused would be testing nothing. */
const badges = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    return [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(t => /^\+\d+\s*temp$/i.test(t))
  }, painted.toString())

const clickPainted = async (page, selector, textTest) =>
  page.evaluate(
    ([sel, fn, re]) => {
      const paintedFn = new Function('return ' + fn)()
      const test = re ? new RegExp(re) : null
      const el = [...document.querySelectorAll(sel)].find(
        x => paintedFn(x) && (!test || test.test((x.textContent || '').replace(/\s+/g, ' ').trim())),
      )
      if (!el) return false
      el.click()
      return true
    },
    [selector, painted.toString(), textTest ?? null],
  )

/** The whole two-step: tap the standing control, type over the app's roll, Add.
 *  Returns what went wrong, or null.
 *
 *  TYPING OVER THE ROLL IS NOT OPTIONAL. The app rolls a real d10 when the
 *  button is tapped, so a prover that pressed Add on whatever came up could not
 *  predict any total and would have nothing to assert. It is also the path
 *  Marcus is on — his decision, recorded in `RetaliationCapture`'s header. */
async function record(page, amount) {
  if (!(await clickPainted(page, 'button[aria-label="Record 1d10 Fire retaliation"]')))
    return 'no painted standing control'
  await page.waitForTimeout(300)
  const field = 'input[aria-label="1d10 Fire retaliation damage"]'
  if ((await page.locator(field).count()) === 0) return 'the confirm strip never opened'
  await page.locator(field).first().fill(String(amount))
  await page.waitForTimeout(150)
  if (!(await clickPainted(page, 'button', '^Add$'))) return 'no painted Add button'
  await page.waitForTimeout(500)
  const still = await page.locator(field).count()
  if (still > 0) return `Add was refused — the strip is still open on ${amount}`
  return null
}

await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const BAND = 'section[aria-label="Your reactions"]'
const toggle = `${BAND} button[aria-expanded]`
if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
  await page.click(toggle)
  await page.waitForTimeout(400)
}

// ── T1 · the starting line ───────────────────────────────────────────────────
const t1Tally = await tally(page)
const t1Undo = await undoControl(page)
check(
  'T1',
  t1Tally === 'none yet' && t1Undo === null,
  `row reads ${JSON.stringify(t1Tally)} and offers ${
    t1Undo ? `${JSON.stringify(t1Undo)} — an undo with nothing behind it` : 'no undo'
  }`,
)

// ── T2 · accumulate three ────────────────────────────────────────────────────
let recordError = null
for (const amount of RECORD) {
  recordError = await record(page, amount)
  if (recordError) break
}
const t2Tally = recordError ? null : await tally(page)
const EXPECTED_SUM = `TOTAL ${SUM} Fire over ${RECORD.length} hits`
check(
  'T2',
  !recordError && t2Tally === EXPECTED_SUM,
  recordError ?? `recorded ${JSON.stringify(RECORD)} → ${JSON.stringify(t2Tally)}`,
)

// ── T3 · the undo names the last one, amount and all ─────────────────────────
const t3Undo = await undoControl(page)
const EXPECTED_LAST = `Undo Hearthfire Manifest ${DASH} ${RECORD[RECORD.length - 1]} retaliation`
await page.screenshot({ path: `${SHOTS}/slice5-tally-and-undo.png` })
check(
  'T3',
  t3Undo === EXPECTED_LAST,
  t3Undo
    ? `offers ${JSON.stringify(t3Undo)}`
    : 'no undo on the row — the tally cannot be corrected at the table',
)

// ── T4 · press it, and the other two survive ─────────────────────────────────
const undone = await clickPainted(page, 'button', '^Undo\\b')
await page.waitForTimeout(600)
const t4Tally = undone ? await tally(page) : null
const t4Undo = undone ? await undoControl(page) : null
const EXPECTED_AFTER = `TOTAL ${AFTER_UNDO} Fire over ${RECORD.length - 1} hits`
const EXPECTED_NOW = `Undo Hearthfire Manifest ${DASH} ${RECORD[RECORD.length - 2]} retaliation`
check(
  'T4',
  undone && t4Tally === EXPECTED_AFTER && t4Undo === EXPECTED_NOW,
  !undone
    ? 'nothing to press'
    : `after the undo: ${JSON.stringify(t4Tally)} · now offering ${JSON.stringify(t4Undo)}`,
)

// ── T5 · and it moves forward again ──────────────────────────────────────────
const t5Error = await record(page, AGAIN)
const t5Tally = t5Error ? null : await tally(page)
const EXPECTED_FINAL = `TOTAL ${FINAL} Fire over ${RECORD.length} hits`
check(
  'T5',
  !t5Error && t5Tally === EXPECTED_FINAL,
  t5Error ?? `recorded ${AGAIN} after the undo → ${JSON.stringify(t5Tally)}`,
)

// ── N · the gate: a spell slot is not a retaliation ──────────────────────────
/* Spends the cloak from its own reaction row, which is the one non-retaliation
   event this tab can dispatch (`take`, via the detail sheet). A temp-HP badge
   afterwards is the proof the spend LANDED — without it this check would pass
   just as happily against a Spend button that did nothing. */
const beforeN = await tally(page)
/* SCOPED TO THE BAND, which is how slice 3 drove the same spend. Four buttons on
   this tab carry `aria-label="Hearthfire Manifest — details"` — his one feature
   composes as three faces in the lists above plus the reaction row — and the
   first painted match document-wide is the Action face, whose sheet is not the
   one this check needs. Measured with a probe rather than assumed after N failed
   on exactly that. */
const DETAIL = `${BAND} button[aria-label="Hearthfire Manifest — details"]`
const nRows = await page.locator(DETAIL).count()
if (nRows === 1) {
  await page.click(DETAIL)
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x =>
      /^Spend/.test((x.textContent || '').trim()),
    )
    b?.click()
  })
  await page.waitForTimeout(900)
}
const nBadges = nRows === 1 ? await badges(page) : []
if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
  await page.click(toggle)
  await page.waitForTimeout(400)
}
const nTally = await tally(page)
const nUndo = await undoControl(page)
await page.screenshot({ path: `${SHOTS}/slice5-gate-not-a-retaliation.png` })
check(
  'N',
  nRows === 1 && nBadges.length > 0 && nTally === beforeN && nUndo === null,
  nRows !== 1
    ? `${nRows} Hearthfire rows in the band — cannot aim the spend`
    : nBadges.length === 0
    ? 'the spend never landed, so this check proves nothing — no temp HP appeared'
    : `spent the cloak (${JSON.stringify(nBadges)}); tally still ${JSON.stringify(nTally)}; ${
        nUndo
          ? `STILL OFFERING ${JSON.stringify(nUndo)} — it would take back the spend, not the hit`
          : 'and the undo correctly withdrew'
      }`,
)

// ── E · clean console ────────────────────────────────────────────────────────
check('E', noise.length === 0, noise.length ? noise.slice(0, 5).join(' | ') : 'no errors or warnings')

await ctx.close()
await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} · shots in ${SHOTS}/`)
process.exit(failed.length === 0 ? 0 : 1)
