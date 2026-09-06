/* Scratch. Where does the combat tab actually scroll?
   `document.documentElement.scrollHeight` came back 844 on a 844px viewport —
   the document does not scroll at all, so every position measured against it,
   and every "is this pinned" test, was answering the wrong question. Find the
   real scroll container. Delete after Gate 1. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const SEEDED = JSON.stringify(SHEET)
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
await ctx.addInitScript(
  ([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  },
  [SHEET.id, SEEDED, JSON.stringify({ inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: {}, concentrating: null })],
)
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const lines = await page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el)
    if (!/auto|scroll/.test(s.overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 40) continue
    const r = el.getBoundingClientRect()
    out.push(
      [
        '  ' + el.tagName.toLowerCase(),
        'aria=' + el.getAttribute('aria-label'),
        'scrollH=' + el.scrollHeight,
        'clientH=' + el.clientHeight,
        'top=' + Math.round(r.top),
        'h=' + Math.round(r.height),
        'inert=' + !!el.closest('[inert]'),
        'cls=' + (el.className || '').toString().slice(0, 60),
      ].join(' '),
    )
  }
  /* And the fixed things that are NOT ancestors of any scroller — the real
     furniture, as opposed to the shell that holds the page. */
  const fixed = []
  for (const el of document.querySelectorAll('*')) {
    if (getComputedStyle(el).position !== 'fixed') continue
    if (el.closest('[inert]')) continue
    const r = el.getBoundingClientRect()
    if (r.height < 24) continue
    fixed.push(
      '  ' + el.tagName.toLowerCase() +
      ' aria=' + el.getAttribute('aria-label') +
      ' top=' + Math.round(r.top) + ' h=' + Math.round(r.height) +
      ' z=' + getComputedStyle(el).zIndex +
      ' cls=' + (el.className || '').toString().slice(0, 50),
    )
  }
  return { scrollers: out, fixed }
})

console.log('SCROLL CONTAINERS:')
console.log(lines.scrollers.join('\n') || '  (none)')
console.log('\nFIXED, NOT INERT:')
console.log(lines.fixed.join('\n') || '  (none)')

await browser.close()
