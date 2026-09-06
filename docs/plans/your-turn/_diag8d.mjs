/* Slice 8d-1 on the glass. Two questions the static markup cannot answer:
   1. did the strip MOVE when the four <div>s became <button>s? (Marcus's
      standing constraint is "nor the visuals" — a UA button border and 1px/6px
      of padding would push the 48px budget and smear the 1px hairlines.)
   2. does a press actually write? `aria-pressed` in markup proves the attribute
      exists; only a click proves the handler reaches `updateCombat` and that
      the new value survives a reload of the combat state.
   Throwaway. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const APP = 'http://[::1]:4321/the-codex/'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

const IN = { inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: {}, concentrating: null }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
}, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN)])
const p = await ctx.newPage()
const errors = []
p.on('pageerror', e => errors.push(String(e)))
await p.goto(APP, { waitUntil: 'load' })
await p.waitForTimeout(1800)

const geom = () => p.evaluate(() => {
  const econ = document.querySelector('.dturn .econ')
  const slots = [...document.querySelectorAll('.dturn .eslot')]
  const r = e => { const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
  return {
    strip: econ ? r(econ) : null,
    tag: slots.map(s => s.tagName.toLowerCase()),
    slots: slots.map(r),
    border: slots.map(s => getComputedStyle(s).borderTopWidth + '/' + getComputedStyle(s).paddingLeft),
    labels: slots.map(s => s.getAttribute('aria-label')),
    pressed: slots.map(s => s.getAttribute('aria-pressed')),
    dot: slots.map(s => getComputedStyle(s.querySelector('.dot')).backgroundColor),
  }
})

console.log('BEFORE THE PRESS:', JSON.stringify(await geom(), null, 1))

/* Press "Action". Then read the strip again AND the store behind it. */
await p.evaluate(() => document.querySelector('.dturn [data-econ="action"]')?.click())
await p.waitForTimeout(500)
console.log('AFTER THE PRESS: ', JSON.stringify(await geom(), null, 1))
console.log('STORE:', await p.evaluate(id => {
  const raw = localStorage.getItem('codex-combat-' + id)
  return raw ? JSON.stringify(JSON.parse(raw).turnActions) : 'ABSENT'
}, SHEET.id))

/* And press it again — a tally you cannot correct is a trap, not a tally. */
await p.evaluate(() => document.querySelector('.dturn [data-econ="action"]')?.click())
await p.waitForTimeout(500)
console.log('PRESSED TWICE:', await p.evaluate(() => {
  const b = document.querySelector('.dturn [data-econ="action"]')
  return b?.getAttribute('aria-label') + ' / pressed=' + b?.getAttribute('aria-pressed')
}))

console.log('PAGE ERRORS:', errors.length ? errors : 'none')
await browser.close()
