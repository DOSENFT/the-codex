/* SLICE 8 MEASUREMENT — before anything is deleted.
 *
 * THE STANDING LAW again. Slice 8's line is "delete D_PREVIEW and the branch —
 * one path, not two", which reads as a deletion. It is not: the `?d=1` branch
 * returns `TurnLive` as the WHOLE APP, with no Layout, no header and no tab
 * bar. Deleting the flag without moving the mount deletes either the new screen
 * or the rest of the app. So the real question slice 8 turns on is what the D
 * screen costs once it is inside `Layout`, and that is a measurement, not a
 * reading.
 *
 * Reports two URLs at 390x844 on his own export, in combat:
 *   /the-codex/        the shipping combat tab today   (CombatHelper in Layout)
 *   /the-codex/?d=1    the D screen as slice 7 left it (no Layout at all)
 *
 * It asserts nothing and fixes nothing. Scratch, same class as _probe7.mjs.
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

const READ = () => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const cut = (s, n = 60) => (s.length > n ? s.slice(0, n) + '…' : s)
  const vh = innerHeight
  const vw = innerWidth
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
    (typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '')

  /* Every scroller on the page, so a nested one cannot hide. */
  const scrollers = []
  const doc = document.scrollingElement
  if (doc.scrollHeight > doc.clientHeight + 2)
    scrollers.push({ what: 'document', h: doc.scrollHeight, c: doc.clientHeight, ...box(doc) })
  for (const el of document.querySelectorAll('*')) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2)
      scrollers.push({ what: label(el), h: el.scrollHeight, c: el.clientHeight, ...box(el) })
  }

  /* Fixed / sticky furniture — outermost of a nested run only. */
  const pinned = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
    if (!onScreen(el)) continue
    if (pinned.some(p => p.el.contains(el))) continue
    pinned.push({ el, pos: cs.position, ...box(el), text: cut(flat(el), 60) })
  }

  /* THE READING WINDOW. Not "viewport minus fixed boxes": a fixed box that
     the page scrolls UNDER is furniture, but `<main>` is itself fixed and is
     the window. So take the biggest scroller's visible box as the window and
     call everything else furniture. Where nothing scrolls, the window is
     whatever is not pinned. */
  const rows = new Uint8Array(Math.max(0, Math.ceil(vh)))
  for (const p of pinned) {
    if (p.h >= vh - 2) continue // a full-height fixed shell is not a bar
    for (let y = Math.max(0, p.t); y < Math.min(vh, p.b); y++) rows[y] = 1
  }
  let pinnedRows = 0
  for (const r of rows) pinnedRows += r

  const window_ = scrollers
    .map(s => ({ ...s, vis: Math.min(vh, s.b) - Math.max(0, s.t) }))
    .sort((a, b) => b.vis - a.vis)[0] || null

  return {
    vh,
    pinnedRows,
    window: window_,
    scrollers: scrollers.map(s => ({ what: s.what, t: s.t, b: s.b, h: s.h, c: s.c })),
    pinned: pinned.map(p => ({ what: label(p.el), pos: p.pos, t: p.t, b: p.b, h: p.h, text: p.text })),
    dturn: (() => {
      const d = document.querySelector('.dturn')
      if (!d) return null
      return { ...box(d), kids: [...d.children].map(k => ({ what: label(k), ...box(k) })) }
    })(),
  }
}

const show = (title, url, d) => {
  console.log('\n' + '='.repeat(66))
  console.log(title)
  console.log(url)
  console.log('='.repeat(66))
  console.log(`viewport ${d.vh}px`)
  console.log(`  fixed/sticky bars covering ${d.pinnedRows}px of the viewport`)
  for (const p of d.pinned)
    console.log(`      ${String(p.h).padStart(4)}px  ${p.t}..${p.b}  ${p.pos}  ${p.what}  "${p.text}"`)
  console.log('  scrollers:')
  if (!d.scrollers.length) console.log('      — none —')
  for (const s of d.scrollers)
    console.log(`      ${s.what}  box ${s.t}..${s.b}  content ${s.h} in ${s.c}`)
  if (d.window)
    console.log(
      `\n  READING WINDOW ${d.window.c}px  [${d.window.t}..${d.window.b}]  ` +
        `→ furniture ${d.vh - d.window.c}px`,
    )
  else console.log('\n  READING WINDOW — nothing scrolls —')
  if (d.dturn) {
    console.log(`  .dturn ${d.dturn.t}..${d.dturn.b} (${d.dturn.h}px)`)
    for (const k of d.dturn.kids) console.log(`      ${k.t}..${k.b} (${k.h}px)  ${k.what}`)
  }
}

for (const [title, url] of [
  ['TODAY — the shipping combat tab (CombatHelper inside Layout)', 'http://[::1]:4321/the-codex/'],
  ['SLICE 7 — the D screen, standalone, no Layout', 'http://[::1]:4321/the-codex/?d=1'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT)])
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  show(title, url, await page.evaluate(READ))
  await page.screenshot({
    path: `docs/plans/your-turn/_shots/slice8-${url.includes('d=1') ? 'dscreen' : 'today'}.png`,
  })
  await ctx.close()
}

await browser.close()
