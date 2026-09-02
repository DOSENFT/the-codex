/* Held Reaction — THE PHASE PROOF. Slice 6.
 *
 *   node docs/plans/reactions/prove-reactions.mjs
 *
 * The five slices before this one were each proved on their own tree, on their
 * own day. This says they are true AT THE SAME TIME: one tree, one build, one
 * 390×844 viewport, his real exported sheet, start to finish.
 *
 *   S · his stored sheet is byte-identical after a load — the app reports and
 *       never corrects, which is the rule this whole phase gave itself
 *   A · the band paints 4 rows: Hearthfire Manifest, Sentinel ×2,
 *       Opportunity Attack — The Dawn Guardian
 *   B · every row's trigger is on screen in canon's words, with real area, and
 *       topmost at its own point
 *   C · Sentinel's two rows carry two DIFFERENT triggers and two different
 *       detail buttons — the slice-2 headline
 *   D · no row whose words came from canon is tagged "your own"
 *   E · take the cloak → temp HP appears → log damage → the prompt is visible
 *   F · roll it → the tally reads a number → undo → the tally goes back
 *   G · hand-typed temp HP with "Don't know" → logging damage offers NOTHING
 *   H · clean console
 *
 * ── A AND D ARE NOT THE CHECKS GATE 3 APPROVED, AND THAT IS ON THE RECORD ────
 *
 * `03-program-design.md` had A naming Interception as the fourth row and D
 * looking for a provenance marker ON the canon rows. Slice 6's first act was to
 * measure instead of trusting them, and both were wrong about the app:
 * Interception is nowhere on the combat tab (nothing has ever asked him which
 * Fighting Style he took), and the marker is NEGATIVE — "your own" is painted
 * on sheet-worded rows, so D as written could never have failed.
 *
 * Restated, D caught a live one: both Sentinel sheets were tagged "your own"
 * over text slice 2 had imported out of the book. That is fixed here in slice
 * 5b and D now guards it. Gate 3 was reopened and re-approved before this file
 * was written — because a phase proof edited until it goes green proves the
 * editor, not the app.
 *
 * ── HOW EVERY NUMBER BELOW IS READ ──────────────────────────────────────────
 *
 * Geometry, never `textContent` (finding Q: an element the model built and CSS
 * then collapsed still has text). Addressed by role and aria, never by
 * `hasText`. `CLAUSES` is declared once and is read by both the printed
 * narrative and the verdict, so the story this prints and the thing it checks
 * cannot come apart.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'
const APP = 'http://[::1]:4321/the-codex/'

/* THE FOUR ROWS, AND WHAT THE BOOK SAYS EACH ONE ANSWERS TO.
 *
 * Transcribed from `measure-slice6.mjs`'s run on 2026-08-31 — an independent
 * record of what reached the screen, not a re-derivation from the same canon
 * package the app reads. If the prover recomputed these from `canon/` it would
 * go green on the day a canon import silently blanks a trigger, because both
 * sides would blank together.
 *
 * `words` is whose they are, and it is the whole of check D. Opportunity Attack
 * is built out of HIS weapon, The Dawn Guardian, and canon holds no record of
 * that name — so 'sheet' there is correct and D must keep insisting on it. A
 * "fix" that stopped painting the tag everywhere would pass three of these and
 * fail the fourth, which is the point of listing it. */
const CLAUSES = [
  {
    row: 'Hearthfire Manifest',
    when: 'you are hit by a melee attack, the creature takes 1d10 Fire damage in retaliation.',
    words: 'canon',
  },
  {
    row: 'Sentinel · takes the Disengage action',
    when: 'a creature within 5 feet of you takes the Disengage action',
    words: 'canon',
  },
  {
    row: 'Sentinel · attacks a target other than you',
    when: 'a creature within 5 feet of you attacks a target other than you',
    words: 'canon',
  },
  {
    row: 'Opportunity Attack — The Dawn Guardian',
    when: 'a creature you can see leaves your reach',
    words: 'sheet',
  },
]

const TYPED = 7 // hand-typed temp HP for E and G — not canon's 10, so no pass
const ROLLED = 6 //   here can be inherited from the cloak's own grant
const DASH = '—'

const RAW = readFileSync(SHEET_PATH, 'utf8')
const SHEET = JSON.parse(RAW)
const SEEDED = JSON.stringify(SHEET)

/* ── REFUSALS. Each one is a way this prover could pass while proving nothing.
      Better a loud exit 2 than a green run against the wrong sheet. */
const hearth = (SHEET.features ?? []).find(f => /hearthfire/i.test(f.name ?? ''))
if (!hearth) {
  console.error('REFUSING: no Hearthfire Manifest on his sheet.')
  process.exit(2)
}
if (hearth.actionType || hearth.usesMax !== undefined) {
  console.error(`REFUSING: his sheet now DECLARES the cloak (actionType=${hearth.actionType}
usesMax=${hearth.usesMax}), so the undeclared row this phase is about is gone.`)
  process.exit(2)
}
if (!(SHEET.feats ?? []).some(f => /sentinel/i.test(f.name ?? ''))) {
  console.error('REFUSING: no Sentinel feat on his sheet — C would be vacuous.')
  process.exit(2)
}
if (CLAUSES.filter(c => c.words === 'canon').length < 2 || !CLAUSES.some(c => c.words === 'sheet')) {
  console.error('REFUSING: D needs both kinds of row to be discriminating.')
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

/* Re-seeded on EVERY navigation, so the reloads between E, F and G are real
   resets rather than one long session with leftovers. */
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
          id, name: p.name, class: p.class, subclass: p.subclass, level: p.level,
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
      ]),
    )
  },
  [
    SHEET.id,
    SEEDED,
    JSON.stringify({
      inCombat: true, round: 3, yourTurn: true,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: {}, concentrating: null,
    }),
  ],
)

const page = await ctx.newPage()

const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

const BAND = 'section[aria-label="Your reactions"]'
const toggle = `${BAND} button[aria-expanded]`

const openBand = async page => {
  if ((await page.locator(toggle).count()) === 0) return false
  if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
    await page.click(toggle)
    await page.waitForTimeout(400)
  }
  return true
}

/** Every reaction row: its name, its trigger line as painted, that line's area,
 *  and whether the line is the TOPMOST element at its own midpoint.
 *
 *  The last one is the part `textContent` cannot answer. A trigger rendered
 *  under a sticky bar has text, has area, and is unreadable — and item 6 says
 *  this app has a sticky bar at the bottom of the screen. `elementFromPoint`
 *  is the only honest way to ask whether Marcus can actually see the words.
 *
 *  The trigger is NOT a leaf and the first version of this measurement missed
 *  it: `ReactionRow` renders `<p><span>WHEN</span> {rest}</p>` where `rest` is
 *  a bare text node, so the paragraph has one element child. A leaf-walker
 *  therefore sees the UNSTATED case (a `<span>`) and not the stated one — it
 *  would have reported every working trigger as missing. Taken off the
 *  paragraph that holds the lead span. */
/* ── ONE ROW AT A TIME, SCROLLED TO ─────────────────────────────────────────
 *
 * The first run of this check reported `topmost=false` on all four rows while
 * every one of them had the right words and 10,065px² of area, which is not a
 * shape any real fault has. The cause was in the prover: his band sits at
 * y≈880–1470 and the viewport is 844 tall, so every row was BELOW THE FOLD and
 * `elementFromPoint` returns null for a point outside the viewport.
 *
 * Scrolling is not a workaround for that — it is the check. "Can he see it"
 * means "when he scrolls to it, is it the thing under his thumb", and the
 * sticky bottom bar of item 6 is exactly the thing that could take that away
 * from a row that is otherwise perfectly rendered. So each card is scrolled to
 * and then asked, one at a time, because four of them cannot be on screen at
 * once at his phone's size. */
const readRows = async page => {
  const labels = await page.evaluate(
    sel => {
      const band = document.querySelector(sel)
      if (!band) return null
      return [...band.querySelectorAll('button[aria-label$="— details"]')].map(b =>
        b.getAttribute('aria-label'),
      )
    },
    BAND,
  )
  if (labels === null) return null

  const out = []
  for (const label of labels) {
    const selector = `${BAND} button[aria-label="${label.replace(/"/g, '\\"')}"]`
    await page.locator(selector).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    const row = await page.evaluate(
      ([sel, fn, lab]) => {
        const paintedFn = new Function('return ' + fn)()
        const detail = document.querySelector(sel)
        if (!detail) return null
        const card = detail.parentElement
        const lead = [...card.querySelectorAll('span')].find(
          s => paintedFn(s) && /^when$/i.test((s.textContent || '').trim()),
        )
        const line = lead?.parentElement ?? null
        if (!line) return { name: lab.replace(/ — details$/, ''), detailLabel: lab, trigger: null, area: 0, topmost: false }
        const r = line.getBoundingClientRect()
        const hit = document.elementFromPoint(
          Math.round(r.x + r.width / 2),
          Math.round(r.y + r.height / 2),
        )
        return {
          name: lab.replace(/ — details$/, ''),
          detailLabel: lab,
          trigger: (line.textContent || '').replace(/\s+/g, ' ').trim(),
          area: Math.round(r.width * r.height),
          /* `line.contains(hit)` and not equality: the point can land on the
             lead span or on a text node's parent inside the paragraph, and
             both mean the paragraph is what he is looking at. `hit.contains(
             line)` would be an ancestor — also fine, it means nothing is on
             top. Anything else is something covering the words. */
          topmost: !!hit && (hit === line || line.contains(hit) || hit.contains(line)),
          covered: hit ? hit.tagName + (hit.className ? '.' + String(hit.className).split(' ')[0] : '') : 'NOTHING (off-screen)',
        }
      },
      [selector, painted.toString(), label],
    )
    out.push(row)
  }
  return out
}

const badges = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    return [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(t => /^\+\d+\s*temp$/i.test(t))
  }, painted.toString())

/** The retaliation offer under the HP tracker, or null. */
const offer = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const yes = [...document.querySelectorAll('button')].find(
      b => (b.textContent || '').trim() === 'Yes' && paintedFn(b),
    )
    if (!yes) return null
    return ((yes.closest('div')?.textContent) || '').replace(/\s+/g, ' ').trim()
  }, painted.toString())

/** The tally on the cloak's row — walked out from the standing button, never
 *  searched for document-wide: `/TOTAL/i` also catches "your total character
 *  level" and "Total cover" in the rules reference on the same tab. */
const tally = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const button = [...document.querySelectorAll('button[aria-label*="retaliation" i]')].find(
      b => /^Record /.test(b.getAttribute('aria-label') || '') && paintedFn(b),
    )
    const strip = button?.parentElement
    if (!strip) return null
    return (
      [...strip.querySelectorAll('*')]
        .filter(el => el.children.length === 0 && paintedFn(el))
        .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .find(t => /^TOTAL |^none yet$/.test(t)) ?? null
    )
  }, painted.toString())

const undoControl = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const b = [...document.querySelectorAll('button')].find(
      x => /^Undo\b/.test((x.textContent || '').replace(/\s+/g, ' ').trim()) && paintedFn(x),
    )
    return b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null
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

const closeSheet = async page => {
  await clickPainted(page, 'button', 'close')
  await page.waitForTimeout(400)
}

/** Is "your own" painted anywhere right now? A count, not a boolean, so a
 *  second copy appearing is a failure rather than a shrug. */
const yourOwnCount = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    return [...document.querySelectorAll('*')].filter(
      el =>
        el.children.length === 0 &&
        paintedFn(el) &&
        /^your own$/i.test((el.textContent || '').replace(/\s+/g, ' ').trim()),
    ).length
  }, painted.toString())

/** Temp HP → optionally name a source → type → Apply. */
async function typeTempHP(page, source, amount) {
  if (!(await clickPainted(page, 'button[aria-label="Set temporary hit points"]')))
    return 'no painted Temp HP button'
  await page.waitForTimeout(400)
  if (source) {
    const picked = await page.evaluate(
      ([name, fn]) => {
        const paintedFn = new Function('return ' + fn)()
        const b = [...document.querySelectorAll('[role="group"] button')].find(
          x => (x.textContent || '').trim() === name && paintedFn(x),
        )
        if (!b) return false
        b.click()
        return true
      },
      [source, painted.toString()],
    )
    if (!picked) return `no painted chip for ${JSON.stringify(source)}`
    await page.waitForTimeout(250)
  }
  await page.locator('input[aria-label$="amount" i]').first().fill(String(amount))
  await page.waitForTimeout(200)
  if (!(await clickPainted(page, 'button', '^(Apply|Replace)'))) return 'no painted Apply button'
  await page.waitForTimeout(600)
  return null
}

async function logDamage(page, amount) {
  if (!(await clickPainted(page, 'button[aria-label="Apply damage"]')))
    return 'no painted Damage button'
  await page.waitForTimeout(300)
  await page.locator('input[aria-label$="amount" i]').first().fill(String(amount))
  await clickPainted(page, 'button', '^(Apply|Replace)')
  await page.waitForTimeout(700)
  return null
}

// ════════════════════════════════════════════════════════════════════════════
// S · the sheet survives being looked at
// ════════════════════════════════════════════════════════════════════════════
/* Read after a full load and BEFORE anything is clicked. That is the exact
   claim: opening the app does not rewrite his character. Temp HP typed later
   in E and G does change the stored sheet, and should — that is him playing,
   not the app correcting him. */
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(1800)
const afterLoad = await page.evaluate(id => localStorage.getItem('codex-character-' + id), SHEET.id)
check(
  'S',
  afterLoad === SEEDED,
  afterLoad === SEEDED
    ? 'his stored sheet is byte-identical after a full load — reported, never corrected'
    : afterLoad === null
      ? 'the stored sheet is GONE after a load'
      : `the app rewrote his sheet on load (${SEEDED.length} → ${afterLoad.length} bytes)`,
)

// ════════════════════════════════════════════════════════════════════════════
// A · the band, and what is in it
// ════════════════════════════════════════════════════════════════════════════
const bandOpen = await openBand(page)
const rows = bandOpen ? await readRows(page) : null
const names = rows ? rows.map(r => r.name) : []
await page.screenshot({ path: `${SHOTS}/reactions-band.png` })
check(
  'A',
  rows !== null &&
    rows.length === CLAUSES.length &&
    CLAUSES.every(c => names.includes(c.row)),
  rows === null
    ? 'no reactions band on the combat tab at all'
    : `${rows.length} rows: ${JSON.stringify(names)}`,
)

// ════════════════════════════════════════════════════════════════════════════
// B · every trigger, in canon's words, visible where he is looking
// ════════════════════════════════════════════════════════════════════════════
const triggers = CLAUSES.map(c => {
  const row = (rows ?? []).find(r => r.name === c.row)
  return {
    row: c.row,
    ok: !!row && row.trigger === `WHEN ${c.when}` && row.area > 0 && row.topmost,
    got: row
      ? `${JSON.stringify(row.trigger)} · ${row.area}px² · topmost=${row.topmost}${
          row.topmost ? '' : ` · covered by ${row.covered}`
        }`
      : 'ROW ABSENT',
  }
})
check(
  'B',
  triggers.every(t => t.ok),
  triggers.every(t => t.ok)
    ? `all ${triggers.length} triggers painted in canon's words, with area, topmost at their own point`
    : triggers.filter(t => !t.ok).map(t => `${t.row} → ${t.got}`).join(' | '),
)

// ════════════════════════════════════════════════════════════════════════════
// C · Sentinel is two rows, not one — the slice 2 headline
// ════════════════════════════════════════════════════════════════════════════
const sentinel = (rows ?? []).filter(r => /^Sentinel\b/.test(r.name))
const sentinelTriggers = new Set(sentinel.map(r => r.trigger))
const sentinelButtons = new Set(sentinel.map(r => r.detailLabel))
check(
  'C',
  sentinel.length === 2 && sentinelTriggers.size === 2 && sentinelButtons.size === 2,
  sentinel.length !== 2
    ? `${sentinel.length} Sentinel rows, expected 2`
    : `2 rows, ${sentinelTriggers.size} distinct triggers, ${sentinelButtons.size} distinct detail buttons`,
)

// ════════════════════════════════════════════════════════════════════════════
// D · nobody is told he wrote the book
// ════════════════════════════════════════════════════════════════════════════
const tags = []
for (const clause of CLAUSES) {
  const row = (rows ?? []).find(r => r.name === clause.row)
  if (!row) {
    tags.push({ row: clause.row, ok: false, got: 'ROW ABSENT' })
    continue
  }
  await page.click(`${BAND} button[aria-label="${row.detailLabel.replace(/"/g, '\\"')}"]`)
  await page.waitForTimeout(700)
  const count = await yourOwnCount(page)
  if (clause.row === CLAUSES[1].row) {
    await page.screenshot({ path: `${SHOTS}/reactions-sentinel-sheet.png` })
  }
  await closeSheet(page)
  await openBand(page)
  const want = clause.words === 'canon' ? 0 : 1
  tags.push({
    row: clause.row,
    ok: count === want,
    got: `${clause.words}-worded, tagged "your own" ×${count} (wanted ×${want})`,
  })
}
check(
  'D',
  tags.every(t => t.ok),
  tags.every(t => t.ok)
    ? `canon's words carry no "your own"; his own weapon still does — ${tags.length} sheets read`
    : tags.filter(t => !t.ok).map(t => `${t.row} → ${t.got}`).join(' | '),
)

// ════════════════════════════════════════════════════════════════════════════
// E · the cloak arms the retaliation, by the road he walks
// ════════════════════════════════════════════════════════════════════════════
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(1600)
const eTypeError = await typeTempHP(page, 'Hearthfire Manifest', TYPED)
const eBadges = eTypeError ? [] : await badges(page)
if (!eTypeError) await logDamage(page, 5)
const eOffer = eTypeError ? null : await offer(page)
await page.screenshot({ path: `${SHOTS}/reactions-armed.png` })
check(
  'E',
  !eTypeError && eBadges.includes(`+${TYPED} temp`) && eOffer !== null && /1d10/.test(eOffer),
  eTypeError ??
    `named the cloak for ${TYPED} temp (tracker: ${JSON.stringify(eBadges)}); after damage: ${
      eOffer ? JSON.stringify(eOffer) : 'NO OFFER — the hand-typed pool did not arm'
    }`,
)

// ════════════════════════════════════════════════════════════════════════════
// F · the tally moves, and it moves back
// ════════════════════════════════════════════════════════════════════════════
await openBand(page)
const fBefore = await tally(page)
let fError = null
if (!(await clickPainted(page, 'button[aria-label="Record 1d10 Fire retaliation"]'))) {
  fError = 'no painted standing control'
} else {
  await page.waitForTimeout(300)
  const field = 'input[aria-label="1d10 Fire retaliation damage"]'
  if ((await page.locator(field).count()) === 0) fError = 'the confirm strip never opened'
  else {
    await page.locator(field).first().fill(String(ROLLED))
    await page.waitForTimeout(150)
    if (!(await clickPainted(page, 'button', '^Add$'))) fError = 'no painted Add button'
    await page.waitForTimeout(600)
  }
}
const fAfter = fError ? null : await tally(page)
const fUndo = fError ? null : await undoControl(page)
await page.screenshot({ path: `${SHOTS}/reactions-tally.png` })
const undone = !fError && (await clickPainted(page, 'button', '^Undo\\b'))
await page.waitForTimeout(600)
const fBack = undone ? await tally(page) : null
check(
  'F',
  !fError &&
    fAfter === `TOTAL ${ROLLED} Fire over 1 hit` &&
    fUndo === `Undo Hearthfire Manifest ${DASH} ${ROLLED} retaliation` &&
    undone &&
    fBack === fBefore,
  fError ??
    `${JSON.stringify(fBefore)} → recorded ${ROLLED} → ${JSON.stringify(fAfter)} · offered ${JSON.stringify(
      fUndo,
    )} · after undo ${JSON.stringify(fBack)}`,
)

// ════════════════════════════════════════════════════════════════════════════
// G · "Don't know" stays a silence — the app does not guess
// ════════════════════════════════════════════════════════════════════════════
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(1600)
const gError = await typeTempHP(page, null, TYPED)
const gBadges = gError ? [] : await badges(page)
if (!gError) await logDamage(page, 5)
const gOffer = gError ? null : await offer(page)
await page.screenshot({ path: `${SHOTS}/reactions-dont-know.png` })
check(
  'G',
  !gError && gBadges.includes(`+${TYPED} temp`) && gOffer === null,
  gError ??
    `left "Don't know" alone for ${TYPED} temp (tracker: ${JSON.stringify(gBadges)}); after damage: ${
      gOffer ? `OFFERED ${JSON.stringify(gOffer)} — the app guessed` : 'nothing offered, correctly'
    }`,
)

// ════════════════════════════════════════════════════════════════════════════
// H · clean console
// ════════════════════════════════════════════════════════════════════════════
check('H', noise.length === 0, noise.length ? noise.slice(0, 5).join(' | ') : 'no errors or warnings')

await ctx.close()
await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} · shots in ${SHOTS}/`)
process.exit(failed.length === 0 ? 0 : 1)
