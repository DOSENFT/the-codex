/* Scratch. Two ambiguities in `measure-today.mjs`'s stack:
   1. 365px between the top of the scroller and "Your turn options" is unlabelled
      — something is there and the stack cannot name it.
   2. The Turn deck is `position: fixed` but a DOM DESCENDANT of the scroller, so
      its children get a page position computed the same way as real scroll
      content and land in the same range. Two different surfaces, one ruler.
   Walk the scroller's own child chain instead, and dump the deck separately.
   Delete after Gate 1. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
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
  [SHEET.id, JSON.stringify(SHEET), JSON.stringify({ inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: {}, concentrating: null })],
)
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const out = await page.evaluate(() => {
  const unreachable = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.hasAttribute && p.hasAttribute('inert')) return true
      if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return true
      if (getComputedStyle(p).pointerEvents === 'none') return true
    }
    return false
  }
  let main = null
  for (const el of document.querySelectorAll('*')) {
    if (unreachable(el)) continue
    const s = getComputedStyle(el)
    if (!/auto|scroll/.test(s.overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 40) continue
    if (!main || el.scrollHeight > main.scrollHeight) main = el
  }
  const mainRect = main.getBoundingClientRect()
  const pageY = el => Math.round(el.getBoundingClientRect().top - mainRect.top + main.scrollTop)
  const txt = el => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const deck = [...main.querySelectorAll('*')].find(e => e.getAttribute('aria-label') === 'Turn deck')

  /* Descend the scroller looking for the row of siblings that ARE the page —
     the deepest element whose children each occupy their own vertical band. */
  let host = main
  for (;;) {
    const kids = [...host.children].filter(k => k.getBoundingClientRect().height > 0)
    if (kids.length === 1 && kids[0] !== deck) { host = kids[0]; continue }
    break
  }
  const modules = [...host.children]
    .filter(k => k.getBoundingClientRect().height > 0)
    .map(k => ({
      tag: k.tagName.toLowerCase(),
      label: k.getAttribute('aria-label') || '',
      heading: txt(k.querySelector('h1,h2,h3,h4') || document.createComment('')) || '',
      top: pageY(k),
      h: Math.round(k.getBoundingClientRect().height),
      fixed: getComputedStyle(k).position === 'fixed',
      first: txt(k).slice(0, 70),
    }))

  // Everything the deck contains that he can read or press.
  const deckItems = deck
    ? [...deck.querySelectorAll('button, input, select, h1,h2,h3,h4')]
        .filter(e => e.getBoundingClientRect().height > 0 && !unreachable(e))
        .map(e => ({
          tag: e.tagName.toLowerCase(),
          name: (e.getAttribute('aria-label') || txt(e) || '').slice(0, 52),
          y: Math.round(e.getBoundingClientRect().top),
          h: Math.round(e.getBoundingClientRect().height),
        }))
    : []

  return { hostTag: host.tagName.toLowerCase(), hostCls: (host.className || '').toString().slice(0, 70), modules, deckItems, deckText: deck ? txt(deck).slice(0, 400) : null }
})

console.log('SCROLL HOST:', out.hostTag, out.hostCls)
console.log('\nMODULES IN ORDER (top-level children of the scroll host):')
for (const m of out.modules) {
  console.log(
    String(m.top).padStart(5) + '  h' + String(m.h).padStart(4) + (m.fixed ? '  FIXED ' : '        ') +
    m.tag.padEnd(8) + ' [' + (m.label || m.heading || '—') + ']  ' + m.first,
  )
}
console.log('\nTURN DECK CONTENTS (' + out.deckItems.length + ' controls):')
for (const d of out.deckItems) console.log('  y' + String(d.y).padStart(4) + ' h' + String(d.h).padStart(3) + '  ' + d.tag.padEnd(7) + ' ' + d.name)
console.log('\nTURN DECK TEXT:\n  ' + out.deckText)

await browser.close()
