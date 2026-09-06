/* SCRATCH — Gate 2. What is already behind `?d=1`?
 *
 *   node docs/plans/your-turn/_probe-d.mjs
 *
 * `App.tsx:145` mounts an entirely different screen — `TurnLive` → `TurnScreenD`
 * — when the URL carries `?d=1`. The comment above the flag calls it "V1.0's new
 * turn screen (direction D)". That is the same object Gate 1 just designed in
 * mockups, and it has never been measured on his sheet. Reading the 350 lines
 * would tell me what its author intended; only the glass tells me what it is.
 *
 * Same seeding, same viewport, same instrument as measure-today.mjs.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/your-turn/_shots'
const APP = 'http://[::1]:4321/the-codex/?d=1'

const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))
const SEEDED = JSON.stringify(SHEET)
const HP = { cur: SHEET.hitPoints?.current, max: SHEET.hitPoints?.max, ac: SHEET.armorClass }
if (HP.cur === undefined) { console.error('REFUSING: no HP on the sheet'); process.exit(2) }

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch()

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
}

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
})
await ctx.addInitScript(seed, [SHEET.id, SEEDED, JSON.stringify(IN_COMBAT)])
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(2200)

const READ = hp => {
  const painted = el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
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
  const allText = el => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const ownText = el =>
    [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()

  /* Direction D may not use an inner scroller at all. Ask the document FIRST,
     then look for a taller inner one — the opposite order to measure-today,
     because assuming this screen is shaped like the old one is exactly the
     mistake that probe's own header warns about. */
  let main = document.scrollingElement
  let host = 'document'
  for (const el of document.querySelectorAll('*')) {
    if (unreachable(el)) continue
    if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 40) continue
    if (el.scrollHeight > main.scrollHeight) { main = el; host = el.tagName.toLowerCase() + '.' + el.className }
  }
  const mainRect = main === document.scrollingElement
    ? { top: 0 } : main.getBoundingClientRect()
  const pageY = el => Math.round(el.getBoundingClientRect().top - mainRect.top + main.scrollTop)

  const furniture = []
  for (const el of document.querySelectorAll('*')) {
    if (!painted(el) || unreachable(el)) continue
    const pos = getComputedStyle(el).position
    if (pos !== 'fixed' && pos !== 'sticky') continue
    if (el === main || el.contains(main)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 20) continue
    if (!(allText(el).length > 0 || el.querySelector('button, input'))) continue
    if (furniture.some(f => f.el.contains(el))) continue
    furniture.push({ el, r, pos })
  }

  const stack = []
  const seen = new Set()
  const root = main === document.scrollingElement ? document.body : main
  for (const el of root.querySelectorAll('section, header, [aria-label], h1, h2, h3, h4')) {
    if (!painted(el) || unreachable(el)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 14) continue
    const label = el.getAttribute('aria-label') || ownText(el) || allText(el).slice(0, 56)
    if (!label) continue
    const key = label + '@' + pageY(el)
    if (seen.has(key)) continue
    seen.add(key)
    stack.push({ tag: el.tagName.toLowerCase(), label, top: pageY(el), h: Math.round(r.height) })
  }
  stack.sort((a, b) => a.top - b.top || b.h - a.h)

  const hpRe = new RegExp('\\b' + hp.cur + '\\s*(?:/|of)\\s*' + hp.max + '\\b')
  const hpPlaces = []
  for (const el of document.querySelectorAll('*')) {
    if (!painted(el) || unreachable(el)) continue
    const t = allText(el)
    if (!hpRe.test(t)) continue
    if (t.replace(/\s/g, '').length > String(hp.cur + '/' + hp.max).length + 12) continue
    if (hpPlaces.some(p => p.top === pageY(el))) continue
    hpPlaces.push({ text: t.slice(0, 28), top: pageY(el) })
  }

  const buttons = [...document.querySelectorAll('button')]
    .filter(b => painted(b) && !unreachable(b))
    .map(b => (b.getAttribute('aria-label') || allText(b)).trim().slice(0, 46))

  return {
    host,
    geometry: {
      screen: innerHeight,
      readingWindow: Math.round(main === document.scrollingElement ? innerHeight : main.clientHeight),
      contentHeight: Math.round(main.scrollHeight),
      furniturePx: Math.round(furniture.reduce((n, f) => n + f.r.height, 0)),
      screensOfScrolling: +(main.scrollHeight / (main === document.scrollingElement ? innerHeight : main.clientHeight)).toFixed(2),
    },
    furniture: furniture.map(f => ({
      pos: f.pos,
      label: f.el.getAttribute('aria-label') || allText(f.el).slice(0, 40),
      top: Math.round(f.r.top), h: Math.round(f.r.height),
    })),
    stack, hpPlaces, buttons,
    bodyText: allText(document.body).slice(0, 300),
  }
}

const d = await page.evaluate(READ, HP)
const show = (t, v) => { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); console.log(v) }

console.log('?d=1 — Nix ' + HP.cur + '/' + HP.max + ' · 390×844 · round 3, nothing spent')
show('PAGE ERRORS', errors.length ? errors : 'none')
show('SCROLL HOST', d.host)
show('GEOMETRY', d.geometry)
show('FURNITURE (fixed or sticky)', d.furniture)
show('THE STACK', d.stack.map(s =>
  String(s.top).padStart(5) + '  h' + String(s.h).padStart(4) + '  ' + s.tag.padEnd(8) + ' ' + s.label).join('\n'))
show('HIS HP, everywhere painted', d.hpPlaces)
show('EVERY REACHABLE BUTTON (' + d.buttons.length + ')', d.buttons.join('\n'))
show('FIRST 300 CHARS OF BODY', d.bodyText)

await page.screenshot({ path: SHOTS + '/d-01-top.png' })
const wins = Math.ceil(d.geometry.contentHeight / d.geometry.readingWindow)
for (let i = 1; i < Math.min(wins, 6); i++) {
  await page.evaluate(n => {
    const cands = [...document.querySelectorAll('*')].filter(
      e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 40)
    const m = cands.sort((x, y) => y.scrollHeight - x.scrollHeight)[0]
    if (m) m.scrollTop = n * m.clientHeight
    else window.scrollTo(0, n * innerHeight)
  }, i)
  await page.waitForTimeout(320)
  await page.screenshot({ path: SHOTS + '/d-' + String(i + 1).padStart(2, '0') + '-scroll.png' })
}

await ctx.close()
await browser.close()
console.log('\nshots in ' + SHOTS + '/d-*.png')
