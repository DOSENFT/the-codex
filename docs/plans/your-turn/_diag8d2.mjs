/* Slice 8d-2 on the glass: does a closed disclosure cost any room? Throwaway.
   Measures the `.upon` strip and the scroller closed, then opens one aura and
   measures again — the delta IS the "only when asked for". Seeds the store the
   same way prove-capabilities.mjs does, since the app boots to a roster
   otherwise and there is no combat tab to measure. */
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
const seed = ([id, s, c, maxHp]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  window.__maxHp = maxHp
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
})
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT), SHEET.hitPoints.max])
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1700)

const READ = `(() => {
  const r = e => { const b = e.getBoundingClientRect(); return Math.round(b.width) + '×' + Math.round(b.height) }
  const up = document.querySelector('.upon')
  let sc = null
  for (const e of document.querySelectorAll('*')) {
    if (e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)) {
      if (!sc || e.scrollHeight > sc.scrollHeight) sc = e
    }
  }
  return {
    upon: up ? r(up) : null,
    tags: [...document.querySelectorAll('.upon .tag')].map(t => t.tagName + ' ' + r(t)),
    open: [...document.querySelectorAll('.upon details')].map(d => d.open),
    scroller: sc ? sc.className.slice(0, 20) + ' ' + sc.scrollHeight + '/' + sc.clientHeight : null,
  }
})()`

console.log('CLOSED  ', JSON.stringify(await page.evaluate(READ)))
await page.evaluate(`document.querySelector('.upon summary').click()`)
await page.waitForTimeout(400)
console.log('ONE OPEN', JSON.stringify(await page.evaluate(READ)))
await page.evaluate(`document.querySelector('.upon summary').click()`)
await page.waitForTimeout(400)
console.log('RECLOSED', JSON.stringify(await page.evaluate(READ)))

/* THE "BEFORE" NUMBER, WITHOUT A SECOND BUILD. Rebuild the pre-8d-2 element in
   place — a `<span class="tag good">` holding the same `.k` and `.t` — and
   measure it under the same stylesheet. This is not a simulation of the old
   pill; it IS the old pill's markup, which is what `.tag` was before the
   disclosure went in. */
console.log('OLD PILL', await page.evaluate(`(() => {
  const d = document.querySelector('.upon details.tag')
  const span = document.createElement('span')
  span.className = d.className
  span.innerHTML = d.querySelector('summary').innerHTML
  d.replaceWith(span)
  const b = span.getBoundingClientRect()
  return Math.round(b.width) + '×' + Math.round(b.height) +
         '  strip ' + Math.round(document.querySelector('.upon').getBoundingClientRect().height)
})()`))

await browser.close()
