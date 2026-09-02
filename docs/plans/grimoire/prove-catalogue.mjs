/* ===========================================================================
   THE 84, AS PAINTED — proof for the Open Book catalogue.

     npm run build && npx vite preview --port 4321 --host    (in another shell)
     node docs/plans/grimoire/prove-catalogue.mjs [baseUrl] [shotsDir]

   `build.test.ts` proves the LIST: that 84 records come out of canon plus his
   sheet, that 38 of them are locked, that Divine Smite is in there once. It
   cannot see a screen, and the metric this phase is measured by is a claim
   about a screen — "the number of things Nix can do that his Grimoire will
   show him: 11 today → 84". A correct module the app does not paint is a
   half-built feature running as if done.

   THE SEED IS HIS ACTUAL EXPORT, read from disk. If it is not there this probe
   REFUSES to run rather than quietly proving something about a fixture.

   FINDING Q — every claim here is geometric. A card counts only if its own
   element has a box with area, is inside the viewport after being scrolled to,
   and is the topmost thing at its own centre. `textContent` reports clipped and
   off-screen text in full, and this app permanently mounts dialogs below the
   fold that read as visible.

   THE CONTRACT THIS PROBE RELIES ON, so that slice 3 does not silently break it:
     [data-catalogue-entry="<key>"]   one per row, key === normalizeName(name)
     [data-lock-chip="<level>"]       painted only on a row he cannot use yet

     [data-group-mode="<mode>"]       one per grouping chip
     [data-group-heading="<label>"]   one per group, carrying data-group-count

     [data-figure="used|free|granted|level"]   the four numbers about Nix
     [data-prepare-refusal="<code>"]  the card that names the rule that refused
     [data-refusal-rule]              canon's sentence inside it, verbatim
     [data-refusal-way-out]           canon's rule 3, on the one refusal it undoes

   Slice 1 answers A and B. Slice 3 adds C and F. Slice 4 adds D. Slice 5 adds E.

     A   84 rows painted on the Grimoire tab, from his real sheet
     B   38 of them carry a lock chip, and every chip names a level above his
     C   a LOCKED row opens to its bands — being locked withholds nothing
     D   each of the four grouping chips still yields all 84
     E   the cap is reached by pressing Prepare, and the eighth is refused ON
         SCREEN with canon's sentence and the way out both readable
     F   the Gate 1 guardrail: cost in two taps, band 1 with no scroll
     G   clean console

   E IS DRIVEN, NOT POSED. Nothing is written into localStorage to stage a full
   loadout: the probe presses Prepare on real rows until the app refuses. That
   makes the number of successful presses evidence in itself — the app has been
   telling Marcus he had ONE place left (6 of 7) when the rule says he has FIVE,
   and a probe that has to press five times before the wall arrives is the only
   kind of proof of that which cannot be arranged.

   C AND F ARE SWEPT OVER ALL 84, NOT SAMPLED (finding BG). "I opened four rows
   and they looked right" is a claim that failed to observe a fault; "every row
   this app can paint fits the guardrail" is a claim that forbids one. The sweep
   opens each row, measures, and closes it, so the 84th is measured in the same
   conditions as the first.
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

/* Canon's own file, read from disk. Check E compares the sentence ON SCREEN to
   this. A probe carrying its own typed copy of the rule would prove that two
   copies match — which is not the claim, and would survive canon changing. */
let CANON_RULES = []
try {
  CANON_RULES = JSON.parse(
    readFileSync(new URL('../../../src/canon/paladin-progression.json', import.meta.url), 'utf8'),
  ).preparedSpellRules ?? []
} catch (e) {
  console.error(`canon's progression file is not readable — ${e.message}`)
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
const OUT = process.argv[3] || 'docs/plans/grimoire/_shots'
mkdirSync(OUT, { recursive: true })

/* The phone Gate 1 named. Declared ONCE and read back by check F's report:
   hardcoding the number a second time in that string made it read "of 844"
   during the run that shrank this to 420 to prove F can fail — a true FAIL
   printed over a false denominator, which is how a probe starts lying. */
const VIEWPORT = { width: 390, height: 844 }

const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

await ctx.addInitScript(
  ([id, sheetJson]) => {
    localStorage.setItem('codex-character-' + id, sheetJson)
    localStorage.setItem('codex-active-id', id)
    const s = JSON.parse(sheetJson)
    localStorage.setItem('codex-roster', JSON.stringify([
      { id, name: s.name, class: s.class, subclass: s.subclass, level: s.level,
        updatedAt: '2026-08-28T00:00:00.000Z' },
    ]))
  },
  [SHEET.id, JSON.stringify(SHEET)],
)

/* ── THE ONE DEFINITION OF "ON SCREEN" ──────────────────────────────────────
   Installed on the page rather than written out inside each `evaluate`, because
   two copies of a geometric helper are two helpers, and the one that drifts is
   the one that quietly stops being able to fail. Slice 5 needed it in a second
   place, so it moved here instead of being pasted.

   Painted, and his — a box with area, some of it inside the viewport, and
   topmost at a point he could actually look at.

   ── WHY IT SAMPLES FIVE POINTS (rewritten in slice 4) ───────────────────────
   The first version probed ONE point, 6px below the element's top edge, and
   failed the element if that point was outside the viewport or covered.
   Measured by `_snap/band3.mjs`: 30 of the 38 locked rows carry canon's advice,
   and it saw 3. The 27 it missed divide into three causes, none of them the app
   being wrong —

     · `scrollIntoView({block:'center'})` cannot centre a band taller than the
       fold, so the "top + 6px" point sat at y = -63, -95, -109 …
     · the app's own `header.fixed.top-0.h-14` covered it (pre-existing);
     · slice 4's own sticky group heading covered it.

   All three are the probe asking the wrong question. The claim being made is
   "he can read this", and a paragraph whose first six pixels are behind a
   sticky header is one he reads by scrolling four more pixels.

   So: intersect the element with the viewport first, then sample five points
   down whatever strip is left. That is STRICTER evidence, not looser — five
   hit-tests instead of one — and it no longer confuses occlusion-by-chrome with
   absence. Band 1's guardrail is untouched: `band1NoScroll` still demands the
   whole box inside the fold, and it is a separate measurement from this. */
await ctx.addInitScript(() => {
  window.__seen = el => {
    if (!el) return false
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    const vTop = Math.max(r.top, 0)
    const vBottom = Math.min(r.bottom, innerHeight)
    if (vBottom - vTop < 1) return false
    const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const cy = vTop + (vBottom - vTop) * f
      const hit = document.elementFromPoint(cx, cy)
      if (hit && (el === hit || el.contains(hit) || hit.contains(el))) return true
    }
    return false
  }
})

const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

/** Every catalogue row on the tab, counted only if it is really there.
 *
 *  IT SCROLLS BEFORE IT MEASURES, for the reason `prove-slots.mjs` records: a
 *  long list lives inside `main`'s own scroller, and asking an element at
 *  y=+4000 for its box and then calling it absent is a true statement about the
 *  probe's viewport and a false one about the app. Each candidate is brought
 *  into view first and only then asked. An element that cannot be brought into
 *  view — parked in a closed drawer, of which this app mounts several — still
 *  fails, which is correct: he cannot read it either. */
const readRows = page => page.evaluate(async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  const painted = []
  const lockChips = []

  for (const el of document.querySelectorAll('[data-catalogue-entry]')) {
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    await frame()

    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue
    const top = document.elementFromPoint(cx, cy)
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue

    painted.push(el.getAttribute('data-catalogue-entry'))

    /* The chip is measured on its OWN box, not inferred from the row's. A lock
       that is in the DOM and 0px tall is not a lock he can see. */
    const chip = el.querySelector('[data-lock-chip]')
    if (!chip) continue
    const cr = chip.getBoundingClientRect()
    if (cr.width < 1 || cr.height < 1) continue
    const ctop = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2)
    if (!ctop || !(chip === ctop || chip.contains(ctop) || ctop.contains(chip))) continue
    lockChips.push({
      key: el.getAttribute('data-catalogue-entry'),
      level: Number(chip.getAttribute('data-lock-chip')),
      text: (chip.textContent || '').replace(/\s+/g, ' ').trim(),
    })
  }
  return { painted, lockChips }
})

/** The headings the current grouping put on the screen.
 *
 *  THE COUNT IS READ OFF THE HEADING, NOT COMPUTED HERE. That is the point: the
 *  heading is what Marcus reads, so "the headings say 84 between them" is a
 *  claim about the screen, and a heading that said 9 over 8 rows would fail it.
 *  Computing the sum from the rows instead would prove the module twice and the
 *  screen never. */
const readHeadings = page => page.evaluate(async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  const out = []
  for (const h of document.querySelectorAll('[data-group-heading]')) {
    h.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    await frame()
    const r = h.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + Math.min(r.height / 2, 6)
    const top = r.width >= 1 && r.height >= 1 && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight
      ? document.elementFromPoint(cx, cy)
      : null
    out.push({
      label: h.getAttribute('data-group-heading'),
      count: Number(h.getAttribute('data-group-count')),
      seen: !!top && (h === top || h.contains(top) || top.contains(h)),
    })
  }
  return out
})

/** Open every row in turn and measure what opening it produced.
 *
 *  ── WHY THIS IS ONE `evaluate` AND NOT 84 PLAYWRIGHT CLICKS ────────────────
 *  Speed, and nothing else — 84 round trips at a settle apiece is minutes. The
 *  measurement is unaffected: the click is a real click on the real header
 *  button (`aria-expanded` is React's own toggle), and every geometric question
 *  below is asked of `getBoundingClientRect` and `elementFromPoint` exactly as
 *  check A asks them.
 *
 *  ── WHAT F ACTUALLY MEASURES ───────────────────────────────────────────────
 *  Gate 1's guardrail is "what does this cost me, in two taps". Tap 1 is the
 *  Grimoire tab, already spent above; tap 2 is this row. So the row is scrolled
 *  to the top of the list FIRST and opened there — that is the position a tap
 *  leaves it in when he has just scrolled to it — and band 1 must then lie
 *  wholly inside the 844px viewport with no third gesture. Measuring band 1
 *  from wherever the row happened to sit would be measuring the scroll
 *  position, not the layout.
 *
 *  A row is CLOSED again before the next one, so row 84 is measured under the
 *  same conditions as row 1 rather than at the bottom of an 84-panel document. */
const sweepEveryRow = page => page.evaluate(async () => {
  const tick = () =>
    new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))

  // The one definition, installed by `addInitScript` above.
  const seen = window.__seen

  const rowOf = key => document.querySelector(`[data-catalogue-entry="${CSS.escape(key)}"]`)
  const keys = [...document.querySelectorAll('[data-catalogue-entry]')]
    .map(e => e.getAttribute('data-catalogue-entry'))

  const out = []
  for (const key of keys) {
    let row = rowOf(key)
    if (!row) { out.push({ key, opened: false }); continue }

    row.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
    await tick()
    rowOf(key)?.querySelector('button')?.click()
    await tick()

    row = rowOf(key)
    if (!row || row.querySelector('button')?.getAttribute('aria-expanded') !== 'true') {
      out.push({ key, opened: false })
      continue
    }

    // Re-anchored: opening changes the row's height, and F is a claim about
    // the row sitting at the top of the list.
    row.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
    await tick()
    row = rowOf(key)

    const band1 = row.querySelector('[data-band="1"]')
    const b1 = band1 ? band1.getBoundingClientRect() : null
    const cost = row.querySelector('[data-cost]')
    const rec = {
      key,
      opened: true,
      locked: row.hasAttribute('data-locked'),
      band1Height: b1 ? Math.round(b1.height) : null,
      // THE GUARDRAIL: the whole of band 1 inside the fold, unscrolled.
      band1NoScroll: !!b1 && b1.top >= 0 && b1.bottom <= innerHeight,
      hasCost: !!cost,
      costSeen: seen(cost),
      // Bands 2 and 3 are for reading, so they are allowed to be below the
      // fold — scrolled to, then asked whether they are really painted.
      bands: {},
      lockStrip: null,
    }

    for (const n of ['1', '2', '3']) {
      const band = rowOf(key)?.querySelector(`[data-band="${n}"]`)
      if (!band) { rec.bands[n] = false; continue }
      band.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
      await tick()
      rec.bands[n] = seen(rowOf(key)?.querySelector(`[data-band="${n}"]`))
    }

    if (rec.locked) {
      const strip = rowOf(key)?.querySelector('[data-lock-strip]')
      if (strip) {
        strip.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        await tick()
        const s = rowOf(key)?.querySelector('[data-lock-strip]')
        rec.lockStrip = seen(s) ? Number(s.getAttribute('data-lock-strip')) : null
      }
    }

    out.push(rec)
    rowOf(key)?.querySelector('button')?.click()
    await tick()
  }
  return out
})

/** Press Prepare on real rows until the app says no, and measure the no.
 *
 *  ── WHY THE CAP IS REACHED RATHER THAN ARRANGED ────────────────────────────
 *  The tempting shortcut is to seed a sheet with seven prepared spells and take
 *  one screenshot of the refusal. That would prove the refusal renders. It would
 *  not prove the thing slice 5 is actually about — that Nix, as he really is,
 *  has FIVE free places and the app has been showing him one. So this walks the
 *  Grimoire pressing Prepare on whatever offers it, and the count of presses
 *  that succeed before the wall IS the evidence. Five, then refused.
 *
 *  ── WHAT IT DOES NOT PRESS ─────────────────────────────────────────────────
 *  Only buttons whose whole label is "Prepare". A button reading "Prepared" is
 *  a spell already on his list and pressing it would UNprepare — which would
 *  make the arithmetic below meaningless. Locked, cantrip and always-prepared
 *  rows carry no button at all (`build.ts:238`), so every press here lands on a
 *  spell canon agrees he could genuinely add; that is why any refusal other
 *  than the cap is counted as a failure and not as colour.
 *
 *  ── THE FOUR NUMBERS, BEFORE AND AFTER ─────────────────────────────────────
 *  `[data-figure="used"]` is read twice, and its own box is hit-tested each
 *  time. Reading the container's `textContent` would find four numbers and be
 *  unable to say which it had found (finding Q). */
const driveToTheCap = page => page.evaluate(async () => {
  const seen = window.__seen
  const tick = () =>
    new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))
  const flat = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const rowOf = key => document.querySelector(`[data-catalogue-entry="${CSS.escape(key)}"]`)
  const prepareButton = row =>
    [...(row?.querySelectorAll('button') || [])].find(b => flat(b) === 'Prepare')

  /** A named figure, scrolled to, hit-tested on its own box, and its digits
   *  read off the paint rather than off an attribute. */
  const figure = async id => {
    let el = document.querySelector(`[data-figure="${id}"]`)
    if (!el) return { id, present: false }
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    await tick()
    el = document.querySelector(`[data-figure="${id}"]`)
    const text = flat(el)
    const n = text.match(/-?\d+/)
    return { id, present: true, seen: seen(el), value: n ? Number(n[0]) : null, text }
  }

  /* Scrolled to before it is hit-tested. The first version asked `seen()` about
     the card wherever the previous check had left the page — which was halfway
     down an open locked row — and got a false negative that the verdict then
     could not explain. `figure()` had always scrolled; the card had not. */
  const card = document.querySelector('[data-preparation-rules]')
  card?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
  await tick()

  const before = {
    card: seen(document.querySelector('[data-preparation-rules]')),
    used: await figure('used'),
    free: await figure('free'),
    granted: await figure('granted'),
    level: await figure('level'),
  }

  const presses = []
  let capped = null

  const keys = [...document.querySelectorAll('[data-catalogue-entry]')]
    .map(e => e.getAttribute('data-catalogue-entry'))

  for (const key of keys) {
    if (capped) break
    if (!rowOf(key)) continue

    rowOf(key).scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
    await tick()
    rowOf(key)?.querySelector('button')?.click()          // open
    await tick()

    const btn = prepareButton(rowOf(key))
    if (!btn) {
      rowOf(key)?.querySelector('button')?.click()        // close, untouched
      await tick()
      continue
    }

    btn.click()
    await tick()

    const box = rowOf(key)?.querySelector('[data-prepare-refusal]')
    if (!box) {
      // No refusal card: the press was accepted. The row must SAY so — a tick
      // that changed the model and not the label is the bug class this whole
      // slice exists to close.
      presses.push({
        key,
        outcome: 'prepared',
        labelFlipped: !prepareButton(rowOf(key)),
      })
      rowOf(key)?.querySelector('button')?.click()        // close
      await tick()
      continue
    }

    box.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    await tick()
    const b = rowOf(key)?.querySelector('[data-prepare-refusal]')
    const rule = b?.querySelector('[data-refusal-rule]')
    const way = b?.querySelector('[data-refusal-way-out]')
    const rec = {
      key,
      outcome: 'refused',
      code: b?.getAttribute('data-prepare-refusal') ?? null,
      boxSeen: seen(b),
      headline: flat(b?.querySelector('p')),
      ruleSeen: seen(rule),
      ruleText: flat(rule),
      waySeen: seen(way),
      wayText: flat(way).replace(/^You are not stuck:\s*/, ''),
      // The button must NOT have flipped: a refusal that still ticks the box is
      // a refusal in name only.
      stillOffers: !!prepareButton(rowOf(key)),
    }
    presses.push(rec)
    if (rec.code === 'cap') { capped = rec; break }        // left OPEN, for the photograph

    rowOf(key)?.querySelector('button')?.click()
    await tick()
  }

  const after = {
    used: await figure('used'),
    free: await figure('free'),
    granted: await figure('granted'),
  }

  return { before, presses, capped, after }
})

/** The Fighting Style picker as it is on the screen — slice 6.
 *
 *  EVERY OPTION IS SCROLLED TO AND HIT-TESTED, not counted in the DOM. Eleven
 *  `<button>`s exist the moment the row opens; eleven he can read is a
 *  different statement, and it is the one Marcus asked for when he asked for
 *  "a very apparent and masterful orginization visually". A picker that renders
 *  its last four styles below a clipped container passes a DOM count and fails
 *  him at the table (finding Q). */
const readPicker = p => p.evaluate(async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  const seen = window.__seen
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

  const box = document.querySelector('[data-fighting-style-picker]')
  if (!box) {
    return { present: false, pickerSeen: false, attr: null, options: 0, optionsSeen: [], chosen: [], interception: null }
  }

  const opts = [...box.querySelectorAll('[data-style-option]')]
  const optionsSeen = []
  let interception = null
  for (const o of opts) {
    o.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    await frame()
    const name = o.getAttribute('data-style-option')
    const readable = seen(o)
    if (readable) optionsSeen.push(name)
    if (name === 'Interception') {
      interception = { text: txt(o), seen: readable, pressed: o.getAttribute('aria-pressed') }
    }
  }

  box.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
  await frame()

  return {
    present: true,
    pickerSeen: seen(box),
    /* `data-chosen` is the picker's own answer to "whose style is this". Read
       as an ATTRIBUTE rather than inferred from which button looks green,
       because the green is a class and a class is a decoration. */
    attr: box.getAttribute('data-chosen'),
    options: opts.length,
    optionsSeen,
    chosen: opts.filter(o => o.getAttribute('data-style-chosen') === 'yes')
      .map(o => o.getAttribute('data-style-option')),
    interception,
  }
})

/** The combat tab's reactions band, row by row.
 *
 *  Deliberately the same selectors `table-truth/prove-slice10e.mjs` uses —
 *  `section[aria-label="Your reactions"]`, `li`, `button[aria-label$="— details"]`
 *  — because the claim here is that Interception arrives as an ORDINARY row in
 *  the band that already existed, on no new wiring. A bespoke selector would let
 *  a bespoke row pass. */
const readReactions = p => p.evaluate(async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  const seen = window.__seen
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

  const band = document.querySelector('section[aria-label="Your reactions"]')
  if (!band) return { band: false, expanded: null, rows: [] }

  const toggle = band.querySelector('button[aria-expanded]')
  const rows = []
  for (const li of band.querySelectorAll('li')) {
    li.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    await frame()
    const btn = li.querySelector('button[aria-label$="— details"]')
    const host = btn ?? li.firstElementChild ?? li
    rows.push({
      name: (btn?.getAttribute('aria-label') || '').replace(/ — details$/, '') || txt(host.querySelector('span')),
      text: txt(host),
      seen: seen(host),
      openable: Boolean(btn),
    })
  }
  return { band: true, expanded: toggle?.getAttribute('aria-expanded') ?? null, rows }
})

/* Slice 6 gave this a parameter. Check H runs on a SECOND page — see its note —
   and a settle hardcoded to the first one would have returned instantly while
   the second was still painting, which is how a probe measures an empty screen
   and calls the app broken. Defaulted, so every existing `await settle()` above
   still means what it meant. */
const settle = async (p = page) => {
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(900)
}

await page.goto(BASE, { waitUntil: 'load' })
await settle()

/* To the Grimoire. Clicked the way he reaches it — the tab, by its label. */
await page.locator('button', { hasText: 'Grimoire' }).first().click({ timeout: 10000 })
await settle()
await page.screenshot({ path: `${OUT}/catalogue-top.png` })

const { painted, lockChips } = await readRows(page)
await page.screenshot({ path: `${OUT}/catalogue-bottom.png` })

/* ── D · press all four chips and count again each time ──────────────────────
   Gate 1 rule 4 is that a view never costs him a row, and slice 4's whole risk
   is that a "grouping" quietly becomes a filter. `group.test.ts` proves that of
   the FUNCTION; this proves it of the PAGE, which is a different claim — the
   page also has a search box, three filter rows and a `byKey` lookup between
   the module and the screen, and any of those could lose an entry the module
   handed over intact (finding BM: a test aimed at a function is not aimed at
   the wire).

   THE KEY SET IS COMPARED, NOT THE COUNT. Four modes each painting some 84 rows
   is not the claim; each painting THE SAME 84 is. And the chips are pressed in
   a ring back to the default, so the sweep below runs on the layout he opens to
   rather than on whatever the last chip left behind. */
const MODES = ['level', 'source', 'turn', 'ready']
const perMode = []
for (const mode of MODES) {
  const chip = page.locator(`[data-group-mode="${mode}"]`).first()
  if (!(await chip.count())) { perMode.push({ mode, missing: true }); continue }
  await chip.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  await chip.click({ timeout: 5000 })
  await settle()
  const rows = await readRows(page)
  const headings = await readHeadings(page)
  perMode.push({
    mode,
    keys: [...new Set(rows.painted)].sort(),
    painted: rows.painted.length,
    headings,
    headed: headings.reduce((n, h) => n + h.count, 0),
    checked: await chip.getAttribute('aria-checked'),
  })
  await page.screenshot({ path: `${OUT}/group-${mode}.png` })
}
// Back to the default before F is measured.
await page.locator('[data-group-mode="level"]').first().click({ timeout: 5000 }).catch(() => {})
await settle()

const sweep = await sweepEveryRow(page)

/* One row photographed open, so the sweep's numbers have a picture beside them.
   A locked one, because C is the claim a picture is worth having of. */
const shownLocked = sweep.find(r => r.opened && r.locked)
if (shownLocked) {
  const row = page.locator(`[data-catalogue-entry="${shownLocked.key}"]`).first()
  await row.locator('button').first().click({ timeout: 5000 }).catch(() => {})
  await settle()
  await row.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  await page.screenshot({ path: `${OUT}/locked-open.png` })
}

/* ── E · press Prepare until the app refuses ─────────────────────────────────
   LAST, on purpose. It is the only part of this probe that WRITES — it leaves
   his loadout full — so everything that counts rows or opens panels has already
   run against the sheet as he exported it. */
await page.locator('[data-preparation-rules]').first()
  .scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
await settle()
await page.screenshot({ path: `${OUT}/prepare-card-before.png` })

const prep = await driveToTheCap(page)
if (prep.capped) {
  /* Framed on the REFUSAL, not on the row. Scrolling the row into view puts its
     header at the top of the fold and leaves the refusal — which is at the
     bottom of an opened panel taller than the phone — off the bottom of the
     picture. A screenshot of the thing that is not being proved. */
  await page.locator('[data-prepare-refusal]').first()
    .scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  await settle()
  await page.screenshot({ path: `${OUT}/cap-refused.png` })
}
/* And preparing must not have SPAWNED anything. Five of those five presses put
   a spell on his sheet that was not there before, and `build.ts` merges canon
   with the sheet by key — a merge that missed would paint the same spell twice
   and nobody would notice, because the number that changed is 84 and 84 is not
   printed anywhere he looks. */
const afterRows = await readRows(page)

/* ── H · the Fighting Style picker, and Interception on the combat tab ────────
   Slice 6's spec ends "confirmed in the browser on the combat tab", and that is
   a different claim from the 35 unit tests beside it. Those drive `composeTurn`
   directly; this drives the two taps he makes.

   ── WHY IT OPENS A SECOND PAGE ──────────────────────────────────────────────
   Not tidiness. `ctx.addInitScript` writes the sheet UNCONDITIONALLY on every
   navigation, so a new page is a fresh sheet: E's five prepares are gone and H
   starts from his export exactly as A did. Continuing on `page` would start H
   from a loadout sitting at its cap, and "84 rows before the pick" — the number
   the 85 afterwards is only meaningful against — would be a number about E.

   ── THE PICKER IS THE ONLY THING THAT WRITES ────────────────────────────────
   Everything H asserts after the tap is a CONSEQUENCE, and each is read through
   a screen he can look at: the catalogue re-counted on the Grimoire, the
   reaction re-read on the combat tab. The sheet is never read back to prove the
   sheet was written (finding BM). If the pick reached storage and reached no
   screen, every clause after the third fails, which is the right answer. */
const page2 = await ctx.newPage()
page2.on('pageerror', e => errors.push('H pageerror: ' + String(e)))
page2.on('console', m => { if (m.type() === 'error') errors.push('H console: ' + m.text()) })

await page2.goto(BASE, { waitUntil: 'load' })
await settle(page2)
await page2.locator('button', { hasText: 'Grimoire' }).first().click({ timeout: 10000 })
await settle(page2)

const beforePick = await readRows(page2)

/* Opened by its header button, the way `sweepEveryRow` opens all 84 — the
   picker only exists inside an open row, which is the whole point of putting it
   there: the choice sits under the three bands that explain the choice. */
const styleRow = page2.locator('[data-catalogue-entry="fightingstyle"]').first()
const styleRowFound = (await styleRow.count()) > 0
if (styleRowFound) {
  await styleRow.locator('button').first().click({ timeout: 10000 }).catch(e => errors.push('H open row: ' + String(e)))
  await settle(page2)
}

const pickerBefore = await readPicker(page2)
await page2.screenshot({ path: `${OUT}/fighting-style-picker.png` })

const ixnOption = page2.locator('[data-style-option="Interception"]').first()
if (await ixnOption.count()) {
  await ixnOption.click({ timeout: 10000 }).catch(e => errors.push('H pick: ' + String(e)))
  await settle(page2)
}

/* Photographed BETWEEN the two reads, and that ordering is the point.
   `readPicker` leaves the picker centred; `readRows` walks all 85 rows and
   leaves the viewport at the bottom of the list. Taking the shot after both
   produced a picture of the last eight rows of Features & Feats — a photograph
   of the thing not being proved, which is the mistake check E's `cap-refused`
   shot already had to learn once. */
const pickerAfter = await readPicker(page2)
await page2.screenshot({ path: `${OUT}/fighting-style-chosen.png` })
const afterPick = await readRows(page2)

/* And now the half of item 8 this slice closes. To the combat tab by its tab,
   not by a URL — the state that has to survive is React's, and a reload would
   prove localStorage instead.

   ── THE TAB IS ADDRESSED BY ITS ROLE, AND THE FIRST VERSION WAS NOT ─────────
   It said `locator('button', { hasText: 'Combat' }).first()`, copied from the
   Grimoire line above. `hasText` is a case-insensitive SUBSTRING match over the
   whole subtree, and by this point in the run eleven fighting-style buttons are
   open on the screen carrying canon's paragraphs — several of which contain the
   word "combat". Playwright clicked one of those, happily, and the run went on.

   Two things about that failure are worth keeping. It CHANGED HIS FIGHTING
   STYLE — the probe silently un-picked Interception while claiming to navigate.
   And nothing threw: check G reported "clean" over it, because a click that
   lands on the wrong visible element is a successful click. The only reason it
   was caught is that H's later clauses had something to be false about.

   `[role="tab"][aria-label="Combat"]` is the tab as the accessibility tree
   names it — Layout.tsx:548 — and there is exactly one. */
await page2.locator('[role="tab"][aria-label="Combat"]').first()
  .click({ timeout: 10000 }).catch(e => errors.push('H combat tab: ' + String(e)))
await settle(page2)

/* Asked, not assumed — the clause below is the one that would have caught the
   mis-click above on its first run instead of by inference. */
const onCombatTab = await page2.locator('[role="tab"][aria-label="Combat"]').first()
  .getAttribute('aria-selected').catch(() => null)

/* The band remembers its own collapse flag per character, so it may be shut.
   Opening it is a tap he would make; leaving it shut and reporting no rows
   would be the probe's laziness recorded as the app's failure. */
const bandToggle = page2.locator('section[aria-label="Your reactions"] button[aria-expanded]').first()
if (await bandToggle.count() && (await bandToggle.getAttribute('aria-expanded')) !== 'true') {
  await bandToggle.click({ timeout: 5000 }).catch(() => {})
  await settle(page2)
}

const reactions = await readReactions(page2)
const ixnRow = reactions.rows.find(r => r.name === 'Interception') ?? null
if (ixnRow) {
  await page2.locator('section[aria-label="Your reactions"] button[aria-label="Interception — details"]')
    .first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  await settle(page2)
}
await page2.screenshot({ path: `${OUT}/interception-in-combat.png` })

await ctx.close()
await browser.close()

/* ── the verdict ────────────────────────────────────────────────────────── */
const unique = new Set(painted)
const badChips = lockChips.filter(c => !(c.level > SHEET.level) || !/level/i.test(c.text))

const checks = [
  {
    id: 'A',
    what: 'the Grimoire paints 84 rows from his real sheet, where it painted 11',
    got: `${painted.length} painted · ${unique.size} distinct keys`,
    ok: painted.length === 84 && unique.size === 84,
  },
  {
    id: 'B',
    what: 'and 38 of them carry a visible lock chip naming a level above his',
    got: `${lockChips.length} chips${badChips.length ? ` · ${badChips.length} malformed: ` + badChips.slice(0, 3).map(c => `${c.key}=${c.text}`).join(', ') : ''}`,
    ok: lockChips.length === 38 && badChips.length === 0,
  },
  /* C · Marcus, on the locked ones: "locked from being prepared, and visually
     locked, but still provide me the ability to see them and their details."
     So every locked row must open, must carry the strip that says why, and must
     give up bands 1 and 2 — the mechanics and canon's whole paragraph.

     BAND 3 IS COUNTED, NOT REQUIRED. It is canon's advice, and canon does not
     have advice on everything; demanding it here would force the app to invent
     one, which is the opposite of what band 3 is. The count is printed so that
     it dropping to zero is visible rather than tolerated. */
  {
    id: 'C',
    what: 'every locked row opens to its lock strip, band 1 and band 2 — locked withholds nothing',
    got: (() => {
      const locked = sweep.filter(r => r.locked)
      const bad = locked.filter(r => !r.opened || !r.bands['1'] || !r.bands['2'] || r.lockStrip === null)
      const withThree = locked.filter(r => r.bands && r.bands['3']).length
      const wrongLevel = locked.filter(r => r.lockStrip !== null && !(r.lockStrip > SHEET.level))
      return `${locked.length} locked · ${locked.length - bad.length} opened whole · ${withThree} also had canon's advice` +
        (bad.length ? ` · FAILED: ${bad.slice(0, 3).map(r => r.key).join(', ')}` : '') +
        (wrongLevel.length ? ` · strip named a level he already has: ${wrongLevel.slice(0, 3).map(r => r.key).join(', ')}` : '')
    })(),
    ok: (() => {
      const locked = sweep.filter(r => r.locked)
      return locked.length === 38 &&
        locked.every(r => r.opened && r.bands['1'] && r.bands['2'] && r.lockStrip !== null && r.lockStrip > SHEET.level) &&
        locked.some(r => r.bands['3'])
    })(),
  },
  /* D · Marcus at Gate 1, having declined all four organising principles:
     "Multiple organization options, like a filter." The word is filter; the
     requirement is not. Four chips, four layouts, the same 84 under all of them,
     and every heading's own number honest about what is under it. */
  {
    id: 'D',
    what: 'all four grouping chips paint the same 84, and the headings add up to it',
    got: (() => {
      const base = perMode[0]?.keys
      return perMode.map(m => {
        if (m.missing) return `${m.mode}=NO CHIP`
        const drift = base ? m.keys.filter(k => !base.includes(k)).length + base.filter(k => !m.keys.includes(k)).length : 0
        const blind = m.headings.filter(h => !h.seen).length
        return `${m.mode}: ${m.painted} rows · ${m.headings.length} headings summing ${m.headed}` +
          (drift ? ` · ${drift} KEYS DIFFER` : '') +
          (blind ? ` · ${blind} heading(s) not on screen` : '') +
          (m.checked === 'true' ? '' : ' · CHIP DID NOT SELECT')
      }).join('  |  ')
    })(),
    ok: perMode.length === 4 && perMode.every((m, i) =>
      !m.missing &&
      m.painted === 84 &&
      m.keys.length === 84 &&
      m.checked === 'true' &&
      m.headings.length >= 2 &&
      m.headed === 84 &&
      m.headings.every(h => h.seen && h.count > 0) &&
      (i === 0 || String(m.keys) === String(perMode[0].keys))),
  },
  /* E · Gate 1's answer on the cap was "Hard cap with a clear reason". Both
     halves are measured here, and the FIRST half is the one that has been
     wrong: the app computed his prepared count as "anything ticked above a
     cantrip", which for a Paladin of the Hearth counts four Oath grants canon's
     rule 4 excludes. It showed 6 of 7. The rule says 2 of 7.

     So the claim is not "a refusal renders". It is: the screen opens saying 2
     of 7 with 5 free, FIVE presses are accepted, the sixth is refused, the
     refusal quotes canon's rule 1 verbatim and canon's rule 3 as the way out,
     both readable, and the button does not tick anyway. */
  (() => {
    /* ONE list, read by both `got` and `ok`. The first version of this check
       spelled the conditions out twice — a printed narrative and a separate
       boolean chain — and its first run said FAIL under a paragraph in which
       every stated fact was true. The clause that failed was one the narrative
       did not mention, so the verdict was unexplainable, which is the same
       fault this phase keeps finding: a number in a proof that nothing could
       falsify. Named clauses cannot drift from the verdict, because they ARE
       the verdict. */
    const yes = prep.presses.filter(p => p.outcome === 'prepared')
    const no = prep.presses.filter(p => p.outcome === 'refused')
    const c = prep.capped
    const b = prep.before

    const clauses = [
      ['rules card on screen', b.card],
      ['opens at 2 used', b.used.seen && b.used.value === 2],
      ['opens at 5 free', b.free.seen && b.free.value === 5],
      ['opens at 4 granted', b.granted.seen && b.granted.value === 4],
      [`opens at level ${SHEET.level}`, b.level.seen && b.level.value === SHEET.level],
      ['5 presses accepted', yes.length === 5],
      ['every accepted press flipped its label', yes.every(p => p.labelFlipped)],
      ['exactly one refusal', no.length === 1],
      ['and it is the cap', !!c && c.code === 'cap'],
      ['refusal card on screen', !!c && c.boxSeen],
      ["canon's rule 1 on screen", !!c && c.ruleSeen],
      ["and it is canon's rule 1 verbatim", !!c && c.ruleText === CANON_RULES[0]],
      ['the way out on screen', !!c && c.waySeen],
      ["and it is canon's rule 3 verbatim", !!c && c.wayText === CANON_RULES[2]],
      ['the button did not tick anyway', !!c && c.stillOffers],
      ['closes at 7 used', prep.after.used.value === 7],
      ['closes at 0 free', prep.after.free.value === 0],
      ['still 84 rows, none duplicated',
        afterRows.painted.length === 84 && new Set(afterRows.painted).size === 84],
    ]
    const failed = clauses.filter(([, ok]) => !ok).map(([name]) => name)

    return {
      id: 'E',
      what: "five spells go on before the wall, and the sixth is refused on screen in canon's own words",
      got: `${b.used.value} of 7 used · ${b.free.value} free · ${b.granted.value} granted → ` +
        `${yes.length} accepted → ${c ? `REFUSED "${c.code}": ${c.headline}` : 'NEVER REFUSED'} → ` +
        `${prep.after.used.value} used · ${prep.after.free.value} free · ${afterRows.painted.length} rows` +
        (failed.length ? `\n        FAILED CLAUSES: ${failed.join(' · ')}` : ''),
      ok: failed.length === 0,
    }
  })(),
  /* F · the Gate 1 guardrail, swept. Two taps to the cost: the tab, then the
     row. What is measured is the third gesture NOT being needed — band 1 whole
     inside 844px with the row at the top of the list. */
  {
    id: 'F',
    what: 'cost in two taps: band 1 fits the fold unscrolled on all 84, and every priced row shows its price',
    got: (() => {
      const open = sweep.filter(r => r.opened)
      const tall = open.filter(r => !r.band1NoScroll)
      const mute = open.filter(r => r.hasCost && !r.costSeen)
      const heights = open.map(r => r.band1Height ?? 0)
      return `${open.length}/${sweep.length} opened · band 1 tallest ${Math.max(0, ...heights)}px of ${VIEWPORT.height} · ` +
        `${open.filter(r => r.hasCost).length} priced` +
        (tall.length ? ` · NEEDED A SCROLL: ${tall.slice(0, 3).map(r => `${r.key}=${r.band1Height}px`).join(', ')}` : '') +
        (mute.length ? ` · price not on screen: ${mute.slice(0, 3).map(r => r.key).join(', ')}` : '')
    })(),
    ok: sweep.length === 84 &&
      sweep.every(r => r.opened && r.bands['1'] && r.band1NoScroll && (!r.hasCost || r.costSeen)),
  },
  /* H · Marcus, item 8: "in the combat tab, it doesnt seem to have all of my
     available reactions available. I should have the hearthfire manifest,
     sentinal, and interception." And in his second message: "Interception is
     indeed a fighting style. That should be placed somewhere in app so i can
     read details, and also in combat."

     Both halves of that sentence are one check, because they are one act: he
     reads the styles where they are explained, presses the one he took, and it
     is a Reaction on his combat tab. Nothing in this phase built the reaction
     row — `turn/feats.ts` has always been able to make it. What did not exist
     was anyone asking him which style he took, so what H proves is that the
     question got asked and the answer went all the way through.

     ONE `clauses` LIST, read by both `got` and `ok` — slice 5's lesson, kept.
     A FAIL here names the clause that failed. */
  (() => {
    const b = pickerBefore
    const a = pickerAfter
    const r = ixnRow

    const clauses = [
      ['a fresh page opens on 84 rows', beforePick.painted.length === 84],
      ['the Fighting Style row is there and unlocked', styleRowFound &&
        beforePick.painted.includes('fightingstyle') &&
        !beforePick.lockChips.some(c => c.key === 'fightingstyle')],
      ['opening it shows a picker', b.present && b.pickerSeen],
      ['no style chosen before he presses', b.attr === null && b.chosen.length === 0],
      ['eleven styles offered', b.options === 11],
      ['and all eleven are readable on the phone', b.optionsSeen.length === 11],
      ["Interception's canon text is on screen: the trigger",
        !!b.interception && b.interception.seen && /within 5 feet/i.test(b.interception.text)],
      ['and its die', !!b.interception && /1d10/.test(b.interception.text)],
      ['pressing it chooses exactly one style', a.chosen.length === 1 && a.chosen[0] === 'Interception'],
      ['and the picker says which', a.attr === 'Interception'],
      ['and the button reads as pressed', !!a.interception && a.interception.pressed === 'true'],
      ['the catalogue is now 85 rows, none duplicated',
        afterPick.painted.length === 85 && new Set(afterPick.painted).size === 85],
      ['and the row it gained is Interception',
        afterPick.painted.includes('interception') && !beforePick.painted.includes('interception')],
      ['the Combat tab is the tab he is now on', onCombatTab === 'true'],
      ['it still has a reactions band', reactions.band],
      ['open, with Interception a row in it', reactions.expanded === 'true' && !!r],
      ['painted where he can read it', !!r && r.seen],
      ["carrying canon's trigger", !!r && /within 5 feet/i.test(r.text)],
      ['and canon\'s die', !!r && /1d10/.test(r.text)],
      ['and it opens like every other reaction', !!r && r.openable],
    ]
    const failed = clauses.filter(([, ok]) => !ok).map(([name]) => name)

    return {
      id: 'H',
      what: 'he picks Interception where it is explained, and it is a Reaction on his combat tab',
      got: `${beforePick.painted.length} rows → picker: ${b.options} styles, ${b.optionsSeen.length} readable, chosen ${JSON.stringify(b.attr)} → ` +
        `pressed Interception → chosen ${JSON.stringify(a.attr)} · ${afterPick.painted.length} rows → ` +
        `reactions band ${reactions.band ? `${reactions.rows.length} rows (${reactions.rows.map(x => x.name).join(', ') || 'none'})` : 'ABSENT'}` +
        (failed.length ? `\n        FAILED CLAUSES: ${failed.join(' · ')}` : ''),
      ok: failed.length === 0,
    }
  })(),
  /* G is printed LAST although H is lettered after it, and that is deliberate
     rather than an oversight: G is the catch-all, and a catch-all read before
     the claims it backstops is read as just another claim. The letters record
     the order the checks were WRITTEN — G has been here since slice 1. */
  {
    id: 'G',
    what: 'nothing threw on the way',
    got: errors.length ? errors.slice(0, 4).join(' ⏎ ') : 'clean',
    ok: errors.length === 0,
  },
]

console.log('\n=== THE 84, AS PAINTED ===\n')
console.log(`seed  : ${SHEET.name} · ${SHEET.class} ${SHEET.level} · ${SHEET.spells.length} spells + ${SHEET.features.length} features + ${(SHEET.feats || []).length} feats on the sheet`)
console.log(`shots : ${OUT}\n`)
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id} · ${c.what}`)
  console.log(`        ${c.got}\n`)
}
const ok = checks.every(c => c.ok)
console.log(ok
  ? 'His Grimoire holds everything he can do, and says which he cannot do yet.'
  : 'FAILED — a claim above is not true of the running app.')
process.exit(ok ? 0 : 1)
