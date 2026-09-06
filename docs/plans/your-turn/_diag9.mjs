/* SLICE 9, THE MEASUREMENT BEFORE THE BUILD. Throwaway.
 *
 * Two questions, and the second one only exists because of the first.
 *
 * ── 1. WHAT IS THE SPAN OF ONE TURN, MECHANISED ─────────────────────────────
 * `01-product.md` defines the success metric as "the four things one turn needs,
 * in pixels, from the top of the first to the bottom of the last, divided by the
 * height of the window he reads through" — and the headline number, 2,214px /
 * 5.3 screens, was derived BY HAND off the stack `measure-today.mjs` printed. A
 * hand-derived number cannot be re-run, so it cannot be an after-measurement,
 * and the ARRIVE pin that was supposed to enforce it (`one-screen`) quietly
 * measures something else entirely: `scrollHeight / clientHeight`, the length of
 * the WHOLE TAB. Those are different questions. A tab that is long because it
 * carries a damage log, a rest tracker and a persona editor fails the pin while
 * passing the metric.
 *
 * So the rule gets written down as code, ONCE, and applied to both builds:
 *
 *     an ANCHOR is a control he touches to take a turn —
 *       · a row that opens an option        (`… — details`)
 *       · an economy slot                   (`Action: used`, …)
 *       · damage / heal / temp hit points
 *       · his hit points, painted
 *       · the button that ends the turn
 *       · the round counter
 *     an anchor is FREE if it is outside the scroller or under a fixed/sticky
 *       ancestor — it is on the glass at every scroll position, so it costs him
 *       no travel
 *     SPAN = bottom-most non-free anchor − top-most non-free anchor
 *
 * The BEFORE rows are not re-measured: they are the ones already recorded in
 * `_baseline-before.txt`, pasted in below as data, so the same function reads
 * both and Marcus can check either against a file in the repo.
 *
 * ── 2. WHERE DOES THE 3,498px ACTUALLY GO ───────────────────────────────────
 * Slice 9's written job is to move the "your sheet and the 2024 rules disagree"
 * notice, on the grounds that it "costs most of screen one". 8b moved the whole
 * extras block below the card, so that sentence may already be false. Measure
 * before writing the fix for a fault that has moved. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

/* ── THE BEFORE, AS RECORDED ────────────────────────────────────────────────
   Copied out of `_baseline-before.txt` — the run that produced 415/429/3100.
   `free` is filled in from that file's own FURNITURE block: the Turn deck is
   `position: fixed`, 308px of it, so everything it holds is on the glass at
   every scroll position. Its page coordinate (416) is an artefact of measuring
   a fixed element against a scroller and happens to overlap the option rows;
   membership is taken from the deck's control list, not from the number. */
const BEFORE = [
  { kind: 'pick',       label: 'The Dawn Guardian — details',   top: 419,  h: 56,  free: false },
  { kind: 'pick',       label: 'Hearthfire Manifest — details', top: 480,  h: 56,  free: false },
  { kind: 'econ',       label: 'Action: available (deck)',      top: 494,  h: 48,  free: true  },
  { kind: 'econ',       label: 'Bonus: available (deck)',       top: 494,  h: 48,  free: true  },
  { kind: 'econ',       label: 'Reaction: available (deck)',    top: 494,  h: 48,  free: true  },
  { kind: 'econ',       label: 'Move: available (deck)',        top: 494,  h: 48,  free: true  },
  { kind: 'pick',       label: 'Divine Smite — details',        top: 542,  h: 56,  free: false },
  { kind: 'pick',       label: 'Hearthfire Manifest — details', top: 604,  h: 56,  free: false },
  { kind: 'pick',       label: 'Shield of Faith — details',     top: 666,  h: 56,  free: false },
  { kind: 'pick',       label: 'Hearthfire Manifest — details', top: 835,  h: 114, free: false },
  { kind: 'pick',       label: 'Sentinel · Disengage',          top: 1032, h: 95,  free: false },
  { kind: 'pick',       label: 'Sentinel · attacks',            top: 1153, h: 131, free: false },
  { kind: 'pick',       label: 'Opportunity Attack',            top: 1309, h: 98,  free: false },
  { kind: 'econ',       label: 'Action: available (helper)',    top: 1589, h: 44,  free: false },
  { kind: 'econ',       label: 'Bonus: available (helper)',     top: 1589, h: 44,  free: false },
  { kind: 'econ',       label: 'React: available (helper)',     top: 1589, h: 44,  free: false },
  { kind: 'econ',       label: 'Move: available (helper)',      top: 1589, h: 44,  free: false },
  { kind: 'hp-number',  label: '3 of 67 hit points',            top: 2355, h: 41,  free: false },
  { kind: 'hp-control', label: 'Apply damage',                  top: 2453, h: 48,  free: false },
  { kind: 'hp-control', label: 'Apply healing',                 top: 2453, h: 48,  free: false },
  { kind: 'hp-control', label: 'Set temporary hit points',      top: 2453, h: 48,  free: false },
  /* `round` and `end` are ABSENT from this list, and honestly so. The baseline
     walk only captured buttons that carried an `aria-label`, and the middle
     module's "Next turn" and round counter carried none — so they are not in
     `_baseline-before.txt` to copy. Both lived inside a scroller, so including
     them could only have made the before number LARGER. Leaving them out keeps
     the before flattered rather than the after. */
]

/* ONE ANCHOR PER THING, AND IT IS THE ONE HE REACHES FIRST.
 *
 * The metric names FOUR THINGS, not every instance of them. A thing that is
 * painted twice does not cost twice; he uses whichever copy arrives first, so
 * the representative of a kind is: a free instance if the kind has one,
 * otherwise its topmost instance. Two consequences, both deliberate:
 *
 *   · the before build's SECOND economy strip (`Combat Helper`'s, at 1589) does
 *     not lengthen the span, because the pinned deck already gave him one for
 *     free. Charging him for a duplicate would have flattered the after-build.
 *   · the list is represented by where it becomes PICKABLE, not by where it
 *     ends. His ruling of 2026-09-02 is that a long list is value; the metric
 *     is how far apart the four things are, and a fifth reaction row appearing
 *     below the fourth is not a thing moving away from another thing. */
const span = (rows, window) => {
  const kinds = new Map()
  for (const r of rows) {
    const cur = kinds.get(r.kind)
    if (!cur) { kinds.set(r.kind, r); continue }
    if (cur.free) continue
    if (r.free || r.top < cur.top) kinds.set(r.kind, r)
  }
  const paid = [...kinds.values()].filter(r => !r.free)
  if (!paid.length) return { px: 0, screens: 0, note: 'every thing is free — nothing to travel to' }
  const top = Math.min(...paid.map(r => r.top))
  const bottom = Math.max(...paid.map(r => r.top + r.h))
  return {
    px: bottom - top,
    screens: +((bottom - top) / window).toFixed(2),
    from: `${paid.find(r => r.top === top).label} @${top}`,
    to: `${paid.find(r => r.top + r.h === bottom).label} @${bottom}`,
    representatives: [...kinds.values()].map(r => `${r.kind}=${r.free ? 'free' : r.top}`).join('  '),
  }
}

const READ = ([cur, max]) => {
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const unreachable = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.hasAttribute && p.hasAttribute('inert')) return true
      if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return true
      if (getComputedStyle(p).pointerEvents === 'none') return true
    }
    return false
  }
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()

  let main = null
  for (const el of document.querySelectorAll('*')) {
    if (unreachable(el)) continue
    const s = getComputedStyle(el)
    if (!/auto|scroll/.test(s.overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 40) continue
    if (!main || el.scrollHeight > main.scrollHeight) main = el
  }
  if (!main) return { error: 'no scroller' }
  const mainRect = main.getBoundingClientRect()
  const pageY = el => Math.round(el.getBoundingClientRect().top - mainRect.top + main.scrollTop)

  /* FREE = he never has to travel to it. Two ways to be free, and this build
     uses the second one: `.pinned` is not `position: fixed`, it simply lives
     outside the one scroller in a fixed-height column (slice 7's structural
     guarantee). A definition that only knew about `fixed` would charge him for
     End turn.

     ⚠ THE FIXED-ANCESTOR WALK MUST STOP AT THE SCROLLER. `Layout` renders
     `<main class="fixed left-0 right-0 top-14 …">`, so EVERY element inside the
     scroller has a fixed ancestor and the first run of this file reported all
     twelve anchors free and the span as `null`. A `position: fixed` above the
     scroller is the app shell; only one below it pins anything. */
  const free = el => {
    if (!main.contains(el)) return true
    for (let p = el; p && p !== main; p = p.parentElement) {
      if (/fixed|sticky/.test(getComputedStyle(p).position)) return true
    }
    return false
  }

  const hpRe = new RegExp('\\b' + cur + '\\s*(?:/|of)\\s*' + max + '\\b')
  const ANCHOR = [
    [/— details$/, 'pick'],
    /* "See everything he can do and pick one" begins where the bands begin.
       The before build named its rows `X — details`; this one does not name
       them at all — the row's accessible name IS the option. Rather than reach
       for `.det`, which is furniture, the anchor is the four band headings:
       they are this phase's own promise, they are plain words, and they are the
       point at which the list becomes pickable. Rows echo their band in a cost
       label ("Action", "Reaction"), so this matches more than four elements —
       harmless, because `span` keeps only the topmost of a kind. */
    [/^(action|bonus|reaction|movement)$/i, 'pick'],
    [/^(action|bonus|reaction|react|move|movement): (used|available)$/i, 'econ'],
    [/^(apply damage|apply healing|set temporary hit points)$/i, 'hp-control'],
    /* NOT `end combat`. That ends the FIGHT; the metric's fifth verb is "end
       the turn". Including it charged this build 8px for a button that answers
       a different question, and it is the kind of near-miss that makes a number
       look measured when it is not. */
    [/^(end turn|next turn)$/i, 'end'],
    [/^round \d+\b/i, 'round'],
  ]
  const anchors = []
  for (const el of document.querySelectorAll('button, h1, h2, h3, h4, span, p, div')) {
    if (!painted(el) || unreachable(el)) continue
    const t = label(el)
    if (!t || t.length > 60) continue
    let kind = ANCHOR.find(([re]) => re.test(t))?.[1]
    if (!kind && hpRe.test(t) && t.replace(/\s/g, '').length <= String(cur + '/' + max).length + 14) {
      kind = 'hp-number'
    }
    if (!kind) continue
    const r = el.getBoundingClientRect()
    if (r.height < 12) continue
    // Keep the outermost of a nest — a button and its inner span are one anchor.
    if (anchors.some(a => a.el.contains(el))) continue
    anchors.push({ el, kind, label: t.slice(0, 40), top: pageY(el), h: Math.round(r.height), free: free(el) })
  }

  // The stack, so "where does the length go" is a list and not an opinion.
  const seen = new Set()
  const stack = []
  for (const el of main.querySelectorAll('section, [aria-label], h1, h2, h3, h4')) {
    if (!painted(el) || unreachable(el)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 24) continue
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    const l = el.getAttribute('aria-label') || own || label(el).slice(0, 46)
    if (!l) continue
    const top = pageY(el)
    if (seen.has(l + '@' + top)) continue
    seen.add(l + '@' + top)
    stack.push({ tag: el.tagName.toLowerCase(), label: l, top, h: Math.round(r.height) })
  }
  stack.sort((a, b) => a.top - b.top || b.h - a.h)

  /* ── SLICE 9's OWN TARGET, located rather than assumed ───────────────────
     Gate 1 said the notice "costs most of screen one" and should end up beside
     the slot pips it is about. 8b moved the whole extras block, so both halves
     of that sentence need re-reading off the glass. */
  const box = el => { const r = el.getBoundingClientRect(); return { top: pageY(el), h: Math.round(r.height) } }
  const noticeBtn = [...document.querySelectorAll('button')]
    .find(b => painted(b) && !unreachable(b) && /2024 rules disagree/i.test(label(b)))
  const card = noticeBtn && noticeBtn.closest('.glass-card, section, [class*="card"]')
  const pips = [...document.querySelectorAll('button')]
    .filter(b => painted(b) && !unreachable(b) && /level spell slot$/i.test(label(b)))

  return {
    geometry: {
      window: Math.round(main.clientHeight),
      content: Math.round(main.scrollHeight),
      wholeTabScreens: +(main.scrollHeight / main.clientHeight).toFixed(2),
    },
    errata: {
      notice: noticeBtn ? { ...box(noticeBtn), text: label(noticeBtn).slice(0, 52) } : 'NOT PAINTED',
      wholeCard: card ? box(card) : null,
      openByDefault: noticeBtn ? noticeBtn.getAttribute('aria-expanded') : null,
      firstSlotPip: pips.length ? box(pips[0]) : 'NO PIPS',
      pipCount: pips.length,
      apart: noticeBtn && pips.length ? Math.abs(pageY(noticeBtn) - pageY(pips[0])) : null,
    },
    anchors: anchors.map(({ el, ...rest }) => rest),
    stack,
  }
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

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
})
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT)])
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)))
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const now = await page.evaluate(READ, [SHEET.hitPoints.current, SHEET.hitPoints.max])
if (now.error) { console.error(now.error); process.exit(2) }

console.log('\n██ THE SPAN OF ONE TURN — the same rule, both builds ██')
console.log('BEFORE (rows from _baseline-before.txt, window 415):')
console.log('  ', span(BEFORE, 415))
console.log('  hand-derived headline in 01-product.md: 2214px / 5.3 screens')
console.log('AFTER  (live, window ' + now.geometry.window + '):')
console.log('  ', span(now.anchors, now.geometry.window))

console.log('\n██ WHOLE TAB (what `one-screen` measures today) ██')
console.log(now.geometry)

console.log('\n██ SLICE 9\'s TARGET — the 2024-slots notice, located ██')
console.log(now.errata)

console.log('\n██ ANCHORS, live ██')
for (const a of now.anchors.sort((x, y) => x.top - y.top)) {
  console.log(
    (a.free ? '  free ' : String(a.top).padStart(6)) + '  h' + String(a.h).padStart(4) +
    '  ' + a.kind.padEnd(11) + a.label,
  )
}

console.log('\n██ THE STACK — where the ' + now.geometry.content + 'px goes ██')
for (const s of now.stack) {
  console.log(String(s.top).padStart(6) + '  h' + String(s.h).padStart(4) + '  ' + s.tag.padEnd(8) + s.label)
}

console.log('\nPAGE ERRORS:', errs.length ? errs : 'none')
await browser.close()
