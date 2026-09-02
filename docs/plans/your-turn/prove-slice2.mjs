/* ============================================================================
   SLICE 2 — THE FOUR BANDS, ON THE GLASS.
   ----------------------------------------------------------------------------
     node docs/plans/your-turn/prove-slice2.mjs

   The unit tests prove the shelving rule and the component tests prove the
   markup. Neither of them can see a band that is painted 0px high, painted off
   the bottom of a 390px phone, or painted under something else — so this file
   measures GEOMETRY, per Finding Q: a probe that reads textContent proves the
   model, not the screen.

   It runs against `?d=1`, which is where the bands live until slice 8, on HIS
   export, at 390x844, in combat at round 3 with nothing spent — the same
   conditions every other measurement in this phase was taken under.

   His sheet is never edited on disk. It is cloned into localStorage, and the
   clone is what the browser reads.
   ========================================================================== */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const APP = 'http://[::1]:4321/the-codex/?d=1'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

/* THE SECOND STATE, AND IT IS NOT OPTIONAL.
   The first run of this file went 19/19 green while "every blocked row carries
   its reason" reported `0 blocked, 0 with a reason` — with nothing spent there
   is nothing blocked, so the one thing slice 2 promised (a greyed row that says
   WHY, instead of a row hidden under a fold) was never once on the glass. A
   check with an empty left-hand side is not a green, it is a blank.

   `turnActions` is CombatState's spend ledger, and it is the inverse of the
   band's `open`: true here means SPENT. Action and bonus spent, reaction and
   movement still his — which also forces the two dot inks apart, so "live and
   spent do not look the same" becomes a claim a screen can fail. */
const HALF_SPENT = {
  ...IN_COMBAT,
  turnActions: { action: true, bonusAction: true, reaction: false, movement: false },
}

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
}

/* ── measured in the page ─────────────────────────────────────────────────
 *
 * Everything here is read off `getBoundingClientRect` and `getComputedStyle`.
 * The one string comparison is the band's own label, and it is taken from the
 * element's OWN text — a parent's textContent would match every band at once. */
const MEASURE = () => {
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const heads = [...document.querySelectorAll('.dturn .band .bhead')].filter(painted)
  const scroller = document.querySelector('.dturn .body')

  /* THE AMBER, RESOLVED FROM THE TOKEN, NOT FROM ANOTHER DOT.
     The first version of the dot check compared the live dot in one run against
     the live dot in another, which is the same selector twice — a mutation that
     painted every live dot grey moved both sides and the check stayed green.
     Resolving `--d-amber` through a throwaway element gives an independent
     value, so "the live pip is the amber" becomes a claim the screen can fail. */
  const probe = document.createElement('span')
  probe.style.cssText = 'background:var(--d-amber);position:absolute;width:1px;height:1px'
  document.body.appendChild(probe)
  const amber = getComputedStyle(probe).backgroundColor
  probe.remove()

  return {
    amber,
    bands: heads.map(h => {
      const r = h.getBoundingClientRect()
      const label = [...h.querySelectorAll('.blbl')].map(e => own(e))[0] ?? ''
      const count = [...h.querySelectorAll('.bn')].map(e => own(e))[0] ?? ''
      const state = [...h.querySelectorAll('.bstate')].map(e => own(e))[0] ?? ''
      const dot = h.querySelector('.dot')
      const rows = [...(h.parentElement?.querySelectorAll('.act') ?? [])].filter(painted)
      return {
        label, count, state,
        top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width),
        labelPx: parseFloat(getComputedStyle(h.querySelector('.blbl')).fontSize),
        labelFont: getComputedStyle(h.querySelector('.blbl')).fontFamily.split(',')[0],
        countInk: getComputedStyle(h.querySelector('.bn')).color,
        dotInk: dot ? getComputedStyle(dot).backgroundColor : null,
        expanded: h.getAttribute('aria-expanded'),
        rows: rows.length,
        blocked: rows.filter(e => e.classList.contains('blocked')).length,
        // A blocked row must carry its reason ON the row, painted, not merely
        // present in the DOM.
        reasons: rows.filter(e => e.classList.contains('blocked'))
          .filter(e => [...e.querySelectorAll('.why')].some(w => painted(w) && own(w).length > 0)).length,
      }
    }),
    rowsTotal: [...document.querySelectorAll('.dturn .act')].filter(painted).length,
    /* Mutex faces are options too, painted in their own bracket below the
       bands. They have to be counted or "nothing left the screen" is a claim
       about only half the screen. */
    faces: [...document.querySelectorAll('.dturn .mutex .face')].filter(painted).length,
    brackets: [...document.querySelectorAll('.dturn .mutex')].filter(painted).length,
    fold: [...document.querySelectorAll('.dturn *')].some(e => /^everything else$/i.test(own(e))),
    yourTurnBoxes: [...document.querySelectorAll('.dturn *')].filter(e => /^your turn$/i.test(own(e))).length,
    cap: [...document.querySelectorAll('.dturn .list > .cap .n')].map(e => own(e))[0] ?? '',
    scroll: scroller
      ? { h: scroller.scrollHeight, c: scroller.clientHeight, screens: +(scroller.scrollHeight / scroller.clientHeight).toFixed(2) }
      : null,
  }
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()
const errs = []

/** One combat state → one fresh browser, painted, measured. Each state gets its
 *  own context because the seed is written before the app boots and the app
 *  keeps combat in localStorage. */
async function visit(combat, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
  })
  await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(combat)])
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)))
  await page.goto(APP, { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  if (shot) await page.screenshot({ path: `docs/plans/your-turn/_shots/${shot}.png` }).catch(() => {})
  return page
}

const page = await visit(IN_COMBAT, 'slice2-bands')
const open = await page.evaluate(MEASURE)

/* Collapse every band — the same taps he would make — and measure again. The
   claim "each collapsible" is a claim about what happens to the SCREEN, and a
   test that only checked aria-expanded would pass on a fold that folds nothing. */
for (const label of ['Action', 'Bonus', 'Reaction', 'Movement']) {
  await page.evaluate(l => {
    const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    const head = [...document.querySelectorAll('.dturn .bhead')]
      .find(h => [...h.querySelectorAll('.blbl')].some(e => own(e) === l))
    head?.click()
  }, label)
  await page.waitForTimeout(200)
}
const closed = await page.evaluate(MEASURE)

/* And back open, because a fold that cannot be re-opened has eaten his sheet. */
await page.evaluate(() => {
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  for (const h of document.querySelectorAll('.dturn .bhead')) if (own(h.querySelector('.blbl') ?? h) === 'Action') h.click()
})
await page.waitForTimeout(250)
const reopened = await page.evaluate(MEASURE)

/* HALF SPENT — the state the checks below actually need. */
const spentPage = await visit(HALF_SPENT, 'slice2-bands-spent')
const spent = await spentPage.evaluate(MEASURE)

await browser.close()

/* ── the report ────────────────────────────────────────────────────────── */
const WANT = ['Action', 'Bonus', 'Reaction', 'Movement']
const checks = []
const check = (id, ok, evidence) => checks.push({ id, ok, evidence })

console.log('\nSLICE 2 — THE FOUR BANDS · ?d=1 · Nix ' + SHEET.hitPoints.current + '/' + SHEET.hitPoints.max + ' · 390×844 · round 3\n')
const row = b =>
  '  ' + b.label.padEnd(10) + String(b.top).padStart(5) + String(b.height).padStart(4) + '   ' +
  (b.labelFont + ' ' + b.labelPx + 'px').padEnd(17) + b.count.padEnd(11) + b.state.padEnd(8) +
  String(b.rows).padStart(4) + '    ' + b.blocked + '/' + b.reasons

console.log('  band        top   h   label            count      state   rows  blocked/with-reason')
console.log('  — nothing spent —')
for (const b of open.bands) console.log(row(b))
console.log('  — action and bonus spent —')
for (const b of spent.bands) console.log(row(b))

check('four bands painted, in spend order', open.bands.map(b => b.label).join(' ') === WANT.join(' '), open.bands.map(b => b.label).join(' '))
check('every header ≥ 48px (V-5b)', open.bands.every(b => b.height >= 48), Math.min(...open.bands.map(b => b.height)) + 'px min')
check('every header is full width', open.bands.every(b => b.width >= 340), Math.min(...open.bands.map(b => b.width)) + 'px min')
check('label is Cinzel ≥ 20px (V-4)', open.bands.every(b => b.labelPx >= 20 && /Cinzel/i.test(b.labelFont)), open.bands[0]?.labelFont + ' ' + open.bands[0]?.labelPx + 'px')
check('every band prints a count', open.bands.every(b => /^\d+ ready$/.test(b.count)), open.bands.map(b => b.count).join(' · '))
check('a zero count is printed, not dropped', open.bands.some(b => b.count === '0 ready'), open.bands.filter(b => b.count === '0 ready').map(b => b.label).join(' ') || 'none')
check('open/spent is in words, not only colour', open.bands.every(b => b.state === 'open' || b.state === 'spent'), open.bands.map(b => b.state).join(' '))
/* Nothing is spent in this fixture, so all four must read `open` — and the dot
   must be the amber the live state uses. Both halves: a screen that painted
   every dot amber would pass the first check and fail nothing. */
check('nothing spent → all four read open', open.bands.every(b => b.state === 'open'), open.bands.map(b => b.state).join(' '))
check('rows are shelved, none loose', open.rowsTotal === open.bands.reduce((n, b) => n + b.rows, 0), open.rowsTotal + ' painted rows')
check('the "everything else" fold is gone', open.fold === false, open.fold ? 'still there' : 'gone')
check('the caption counts the whole shelf', open.cap === open.bands.reduce((n, b) => n + Number(b.count.split(' ')[0]), 0) + ' ready', open.cap)

check('collapsing all four shortens the screen', closed.scroll.h < open.scroll.h, open.scroll.h + 'px → ' + closed.scroll.h + 'px')
check('collapsed → no rows painted', closed.rowsTotal === 0, closed.rowsTotal + ' rows')
check('collapsed → the four headers remain', closed.bands.length === 4, closed.bands.length + ' headers')
check('collapsed → aria-expanded says so', closed.bands.every(b => b.expanded === 'false'), closed.bands.map(b => b.expanded).join(' '))
check('re-opening ACTION brings its rows back', reopened.rowsTotal > 0, reopened.rowsTotal + ' rows back')

/* ── the half-spent screen ──────────────────────────────────────────────────
 *
 * Everything below needs a slot to be GONE. With nothing spent there is nothing
 * blocked and nothing dim, so the first four of these would report an empty set
 * and call it a pass. */
const spentBands = Object.fromEntries(spent.bands.map(b => [b.label, b]))
const blockedTotal = spent.bands.reduce((n, b) => n + b.blocked, 0)
const reasonTotal = spent.bands.reduce((n, b) => n + b.reasons, 0)

check('spending a slot actually blocks rows', blockedTotal > 0, blockedTotal + ' blocked rows painted')
check('every blocked row carries its reason', blockedTotal > 0 && blockedTotal === reasonTotal, blockedTotal + ' blocked, ' + reasonTotal + ' with a painted reason')
/* D GREYS, IT NEVER HIDES — but the accounting is not per-band, and finding
   that out cost this file a red.

   Written first as "the ACTION band has the same number of rows before and
   after", it went red at 2 → 7. The app was right and the check was wrong:
   `findContention` skips unavailable options (contention.ts:52), so spending
   the action dissolves the ACTION mutex bracket and returns its five faces to
   `ranked`/`rest`, where the bands shelve them as blocked rows. 2 + 5 = 7.
   Nothing was lost; it moved from the bracket into the band.

   So the real invariant is about the WHOLE screen: an option may change which
   element paints it, but no option may stop being painted. */
const optionsOpen = open.rowsTotal + open.faces
const optionsSpent = spent.rowsTotal + spent.faces
check('spending a slot hides no option', optionsSpent >= optionsOpen,
  open.rowsTotal + ' rows + ' + open.faces + ' faces = ' + optionsOpen + '  →  ' +
  spent.rowsTotal + ' + ' + spent.faces + ' = ' + optionsSpent)
check('the dissolved bracket landed in the band', spent.brackets < open.brackets && spentBands.Action?.rows > open.bands[0]?.rows,
  open.brackets + ' brackets → ' + spent.brackets + ', action band ' + open.bands[0]?.rows + ' → ' + spentBands.Action?.rows + ' rows')
check('spent bands say "spent", unspent still say "open"',
  spentBands.Action?.state === 'spent' && spentBands.Bonus?.state === 'spent' &&
  spentBands.Reaction?.state === 'open' && spentBands.Movement?.state === 'open',
  spent.bands.map(b => b.label + '=' + b.state).join(' '))
check('a spent band counts 0 ready', spentBands.Action?.count === '0 ready' && spentBands.Bonus?.count === '0 ready',
  spentBands.Action?.count + ' · ' + spentBands.Bonus?.count)
/* The pip is the fastest read on the screen, so live and spent may not share
   an ink. Both halves: two distinct inks AND the live one is the amber the
   lit-row edge uses, so a screen that greyed everything would fail. */
const liveInk = spentBands.Reaction?.dotInk
const deadInk = spentBands.Action?.dotInk
check('live and spent dots are different ink', !!liveInk && !!deadInk && liveInk !== deadInk, 'live ' + liveInk + '  ·  spent ' + deadInk)
check('the live dot is the amber token', liveInk === spent.amber, liveInk + ' vs --d-amber ' + spent.amber)
check('all four dots are amber when nothing is spent', open.bands.every(b => b.dotInk === open.amber), [...new Set(open.bands.map(b => b.dotInk))].join(' | '))
check('the caption follows the spend', spent.cap === spent.bands.reduce((n, b) => n + Number(b.count.split(' ')[0]), 0) + ' ready' && spent.cap !== open.cap,
  open.cap + ' → ' + spent.cap)

check('no page errors', errs.length === 0, errs.join(' | ') || 'none')

console.log('\n  scroll   open   ' + open.scroll.h + ' / ' + open.scroll.c + ' = ' + open.scroll.screens + ' screens')
console.log('           closed ' + closed.scroll.h + ' / ' + closed.scroll.c + ' = ' + closed.scroll.screens + ' screens')
console.log('  options painted   open ' + open.rowsTotal + ' rows + ' + open.faces + ' mutex faces in ' + open.brackets + ' bracket(s)')
console.log('                    half-spent ' + spent.rowsTotal + ' rows + ' + spent.faces + ' faces in ' + spent.brackets + ' bracket(s)')
console.log('  "Your turn" boxes on this screen: ' + open.yourTurnBoxes + '\n')

for (const c of checks) console.log((c.ok ? '  ok  ' : '  RED ') + '  ' + c.id.padEnd(42) + c.evidence)
const red = checks.filter(c => !c.ok)
console.log('\n' + (checks.length - red.length) + '/' + checks.length + ' green' + (red.length ? '  ·  RED: ' + red.map(c => c.id).join(', ') : '') + '\n')
process.exit(red.length ? 1 : 0)
