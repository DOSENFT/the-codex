/* SLICE 7 MEASUREMENT — before any spine code exists.
 *
 * THE STANDING LAW: measure the app, do not trust the document about it.
 * 04-slices.md promises a 40px spine because it assumed the D screen has
 * 121px of furniture at rest and nothing that keeps the spend controls on
 * screen once the round bar scrolls away. The slice-6 screenshots suggest
 * otherwise — there appears to be a persistent bottom region carrying
 * slot pips and END TURN at every scroll position. If that is real, V-6
 * is ALREADY satisfied and a spine would put one thing in two places,
 * which is item 6's fault rebuilt by the slice meant to remove it.
 *
 * This probe reports. It asserts nothing and fixes nothing.
 * Scratch — same class as _diag5.mjs / _shot6.mjs.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const IN_COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}
const seed = ([id, s, c]) => {
  if (localStorage.getItem('codex-character-' + id)) return
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT)])
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/?d=1', { waitUntil: 'load' })
await page.waitForTimeout(1800)

/* ---------------------------------------------------------------- the read
 * Everything below runs in the page and returns plain data. Geometry only —
 * Finding Q: measure what is painted, never textContent alone. A node that
 * is in the DOM, has text, and occupies zero painted pixels is not on screen. */
const read = () => page.evaluate(() => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const cut = (s, n = 70) => (s.length > n ? s.slice(0, n) + '…' : s)
  const vh = innerHeight
  const vw = innerWidth

  /** Painted AND on screen: non-zero box, inside the viewport, and the point
   *  at its centre actually hits it or something inside it. */
  const onScreen = el => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return false
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false
    const x = Math.min(vw - 1, Math.max(1, r.left + r.width / 2))
    const y = Math.min(vh - 1, Math.max(1, r.top + r.height / 2))
    const hit = document.elementFromPoint(x, y)
    return hit ? el.contains(hit) || hit.contains(el) : false
  }

  const box = el => {
    const r = el.getBoundingClientRect()
    return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width) }
  }
  const label = el =>
    el.tagName.toLowerCase() +
    (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '')

  /* (a) THE SCROLLER. Which element is actually consuming the scroll? */
  const doc = document.scrollingElement
  const scrollers = []
  if (doc.scrollHeight > doc.clientHeight + 2)
    scrollers.push({ what: 'document', y: Math.round(doc.scrollTop), h: doc.scrollHeight, c: doc.clientHeight })
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    const oy = cs.overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2)
      scrollers.push({ what: label(el), y: Math.round(el.scrollTop), h: el.scrollHeight, c: el.clientHeight })
  }

  /* (b) FIXED / STICKY FURNITURE. Only the outermost of a nested run — a
   *     fixed bar's children inherit its position in the layout sense but
   *     counting them would multiply one bar into ten. */
  const pinned = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
    if (!onScreen(el)) continue
    if (pinned.some(p => p.el.contains(el))) continue
    pinned.push({ el, pos: cs.position, ...box(el), text: cut(flat(el), 90) })
  }

  /* (c) FURNITURE HEIGHT: rows of the viewport covered by any pinned box.
   *     Union, not sum — two bars that overlap do not cost twice. */
  const rows = new Uint8Array(Math.max(0, Math.ceil(vh)))
  for (const p of pinned)
    for (let y = Math.max(0, p.t); y < Math.min(vh, p.b); y++) rows[y] = 1
  let furniture = 0
  for (const r of rows) furniture += r

  /* (d) THE ROUND BAR — the thing slice 7 wants to watch. */
  const roundEl =
    document.querySelector('.dturn .chrome .round') || document.querySelector('.dturn .round')

  /* (e) THE TURN-CRITICAL CONTROLS (V-6). Recognise by SHAPE and by the words
   *     a control must carry to be that control — not by a class name that a
   *     refactor renames. Report where each one is and whether it is painted. */
  const findAll = re =>
    [...document.querySelectorAll('button, [role="button"], a')].filter(e => re.test(flat(e)))
  const one = (name, re) => {
    const hits = findAll(re)
    const vis = hits.filter(onScreen)
    const pick = vis[0] || hits[0]
    return {
      name,
      inDom: hits.length,
      painted: vis.length,
      where: pick ? label(pick.closest('[class]') || pick) : null,
      box: pick ? box(pick) : null,
      pinnedUnder: pick ? (pinned.find(p => p.el.contains(pick))?.text ?? null) : null,
    }
  }

  const pips = [...document.querySelectorAll('[class*="pip"], [data-slot-pip], [class*="sigil"]')]
    .filter(onScreen)
  const pipHost = pips.length ? label(pips[0].parentElement) : null

  const econ = [...document.querySelectorAll('.dturn .econ *, .econ *')].filter(
    e => e.children.length === 0 && /^(action|bonus|react(ion)?|move(ment)?)$/i.test(flat(e)),
  )

  /* (f) THE SHAPE OF .dturn. The plan assumed the page scrolls and bars are
   *     pinned with `position`. If instead .dturn is a fixed-height column
   *     with ONE inner scroller, then everything outside that scroller is
   *     permanently on screen and `position: fixed` will find nothing. */
  const dturn = document.querySelector('.dturn')
  const shape = dturn
    ? [...dturn.children].map(c => ({ what: label(c), ...box(c), scrolls: c.scrollHeight > c.clientHeight + 2 }))
    : []
  /** The real furniture: viewport rows NOT owned by the scrolling element. */
  const scrollEl = [...document.querySelectorAll('.dturn *')].find(
    e => { const o = getComputedStyle(e).overflowY; return (o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 2 },
  )
  const sBox = scrollEl ? box(scrollEl) : null

  /* (g) WHERE THE 310px GOES. A slice that reclaims screen has to name the
   *     pixels it is taking, so dump the always-visible regions one level in,
   *     plus the econ block that is moving into them. Padding is reported as
   *     the gap between a parent's edge and its children's union — the part
   *     no control is using. */
  const inner = sel => {
    const el = document.querySelector(sel)
    if (!el) return null
    const kids = [...el.children].map(c => ({ what: label(c), ...box(c), text: cut(flat(c), 34) }))
    const b = box(el)
    const top = kids.length ? Math.min(...kids.map(k => k.t)) - b.t : 0
    const bot = kids.length ? b.b - Math.max(...kids.map(k => k.b)) : 0
    const cs = getComputedStyle(el)
    return { ...b, pad: `${top}/${bot}`, gap: cs.rowGap || cs.gap, kids }
  }

  return {
    vh,
    scrollY: Math.round(scrollEl ? scrollEl.scrollTop : doc.scrollTop),
    inner: {
      header: inner('.dturn header.chrome'),
      rail: inner('.dturn .rail'),
      edge: inner('.dturn .edge'),
      econ: inner('.dturn .econ'),
      rverbs: inner('.dturn .rverbs'),
      rslots: inner('.dturn .rslots'),
    },
    shape,
    scrollBox: sBox,
    scrollers,
    pinned: pinned.map(({ el, ...rest }) => rest),
    furniture,
    window: vh - furniture,
    round: roundEl
      ? { ...box(roundEl), onScreen: onScreen(roundEl), text: cut(flat(roundEl), 60) }
      : null,
    controls: [
      one('End turn', /^(end turn|next turn)$/i),
      one('End combat', /end combat/i),
      one('Undo', /^undo$/i),
      one('Look up', /look ?up/i),
      one('Reset', /^reset$/i),
      one('Dice', /^(dice|roll)$/i),
    ],
    pips: { painted: pips.length, host: pipHost, boxes: pips.slice(0, 8).map(box) },
    econLabels: econ.map(e => ({ txt: flat(e), ...box(e), onScreen: onScreen(e) })),
  }
})

const show = (title, d) => {
  console.log('\n' + '='.repeat(64))
  console.log(title + `   (scrollY ${d.scrollY})`)
  console.log('='.repeat(64))
  console.log(`viewport ${d.vh}px · position:fixed/sticky furniture ${d.furniture}px`)
  if (d.scrollBox)
    console.log(
      `REAL furniture (viewport minus the scroller) ${d.vh - d.scrollBox.h}px · ` +
      `reading window ${d.scrollBox.h}px  [scroller ${d.scrollBox.t}..${d.scrollBox.b}]`,
    )
  console.log('\n  composition of the always-visible regions:')
  for (const [k, v] of Object.entries(d.inner)) {
    if (!v) { console.log(`    ${k.padEnd(8)} — not found —`); continue }
    console.log(`    ${k.padEnd(8)} ${v.t}..${v.b} (${v.h}px)  pad ${v.pad}  gap ${v.gap}`)
    for (const c of v.kids)
      console.log(`         ${String(c.h).padStart(3)}px  ${c.t}..${c.b}  w${c.w}  ${c.what}  "${c.text}"`)
  }
  console.log('\n  .dturn children:')
  for (const c of d.shape)
    console.log(`    ${c.t}..${c.b} (${c.h}px) scrolls=${c.scrolls}  ${c.what}`)
  console.log('\n  scrollers:')
  for (const s of d.scrollers) console.log(`    ${s.what}  y=${s.y}  ${s.h}/${s.c}`)
  console.log('\n  pinned (fixed/sticky, painted):')
  if (!d.pinned.length) console.log('    — none —')
  for (const p of d.pinned)
    console.log(`    [${p.pos}] ${p.t}..${p.b} (${p.h}px)  "${p.text}"`)
  console.log('\n  round bar: ' + (d.round
    ? `${d.round.t}..${d.round.b} onScreen=${d.round.onScreen}  "${d.round.text}"`
    : 'NOT FOUND'))
  console.log('\n  turn-critical controls:')
  for (const c of d.controls)
    console.log(
      `    ${c.name.padEnd(11)} dom=${c.inDom} painted=${c.painted}` +
      (c.box ? `  ${c.box.t}..${c.box.b} ${c.box.w}x${c.box.h}` : '') +
      (c.pinnedUnder ? `  [PINNED]` : '') +
      (c.where ? `  ${c.where}` : ''),
    )
  console.log(`\n  slot pips painted: ${d.pips.painted}  host=${d.pips.host}`)
  for (const b of d.pips.boxes) console.log(`      ${b.t}..${b.b} ${b.w}x${b.h}`)
  console.log('  economy labels:')
  for (const e of d.econLabels) console.log(`      "${e.txt}" ${e.t}..${e.b} onScreen=${e.onScreen}`)
}

const atRest = await read()
show('AT REST — the top of the combat tab', atRest)
await page.screenshot({ path: 'docs/plans/your-turn/_shots/slice7-at-rest.png' })

/* Scroll until the round bar has left the viewport — the exact condition
 * slice 7's IntersectionObserver would fire on. Not a fixed scrollTop:
 * the number would be wrong the moment the vitals strip changes height. */
const scrolled = await page.evaluate(async () => {
  /* THE SCROLLER IS NOT THE DOCUMENT. Measured, not assumed: .dturn is a
   * fixed-height column and only one element inside it takes the scroll.
   * Scrolling document.scrollingElement moves nothing and would have
   * reported "the bar never leaves" for the wrong reason. */
  const doc =
    [...document.querySelectorAll('.dturn *')].find(e => {
      const o = getComputedStyle(e).overflowY
      return (o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 2
    }) || document.scrollingElement
  const el =
    document.querySelector('.dturn .chrome .round') || document.querySelector('.dturn .round')
  const gone = () => {
    if (!el) return true
    const r = el.getBoundingClientRect()
    return r.bottom <= 0 || r.top >= innerHeight
  }
  let guard = 0
  while (!gone() && guard++ < 60) {
    doc.scrollTop += 120
    await new Promise(r => requestAnimationFrame(r))
  }
  /* a little past, so we are unambiguously in the "bar is away" state */
  doc.scrollTop += 240
  await new Promise(r => setTimeout(r, 300))
  return { steps: guard, y: Math.round(doc.scrollTop), max: doc.scrollHeight - doc.clientHeight }
})
console.log(`\n\nscrolled ${scrolled.steps} steps to y=${scrolled.y} (max ${scrolled.max})`)
await page.waitForTimeout(400)

const after = await read()
show('SCROLLED — round bar out of view', after)
await page.screenshot({ path: 'docs/plans/your-turn/_shots/slice7-scrolled.png' })

console.log('\n' + '='.repeat(64))
console.log('THE QUESTION SLICE 7 TURNS ON')
console.log('='.repeat(64))
const v6 = c => {
  const a = atRest.controls.find(x => x.name === c)
  const b = after.controls.find(x => x.name === c)
  return `  ${c.padEnd(11)} at rest painted=${a.painted}   scrolled painted=${b.painted}`
}
for (const n of ['End turn', 'End combat', 'Undo', 'Look up', 'Reset', 'Dice']) console.log(v6(n))
console.log(`  slot pips   at rest painted=${atRest.pips.painted}   scrolled painted=${after.pips.painted}`)

/* THE FOUR DOTS — the one control measurement found scrolling away, and the
   whole reason slice 7 exists. Counted at BOTH scroll positions, because a
   check that can only see the case that never fails is not evidence. */
const dots = d => d.econLabels.filter(e => e.onScreen).length
console.log(`  econ dots   at rest onScreen=${dots(atRest)}/4   scrolled onScreen=${dots(after)}/4`)

/* REAL furniture, not the fixed/sticky count. `d.furniture` above sums
   position:fixed and sticky rows and is 0 on this screen — there are none.
   The frame here is structural: `.dturn` is 100dvh with `.body` the only
   scrolling child, so the furniture is everything the scroller does not own.
   The line this replaced printed "0 -> 0" against a plan figure of 121 and
   would have been read as a win. */
const real = d => d.vh - d.scrollBox.h
console.log(
  `\n  furniture   ${real(atRest)}px -> ${real(after)}px   ` +
    `(before slice 7: 310 · construction says 277)`,
)
console.log(
  `  window      ${atRest.scrollBox.h}px -> ${after.scrollBox.h}px   ` +
    `(before slice 7: 534 · construction says 567)`,
)

await browser.close()
