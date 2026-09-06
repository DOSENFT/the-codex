/* Scratch diagnostic for slice 5 — what rows does HIS export actually paint,
   and what does each one cost? Delete with the other scratch probes. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  window.__id = id
}
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
})])
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/?d=1', { waitUntil: 'load' })
await page.waitForTimeout(1700)
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('button.act, button.acthit')]
  const b = rows.find(e => (e.querySelector('.anm')?.textContent||'').trim() === 'The Dawn Guardian')
  b && b.click()
})
await page.waitForTimeout(600)
console.log(JSON.stringify(await page.evaluate(() => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  return {
    bands: [...document.querySelectorAll('.dturn .band')].map(b => ({
      head: flat(b.querySelector('.blbl')),
      rows: [...b.querySelectorAll('.act')].map(a => ({
        name: flat(a.querySelector('.anm')),
        cost: flat(a.querySelector('.cost')),
        det: flat(a.querySelector('.det')),
        why: flat(a.querySelector('.why')),
        hasx: a.classList.contains('hasx'),
      })),
    })),
    blockedRows: [...document.querySelectorAll('.dturn .act.blocked')].map(a => flat(a.querySelector('.anm')) + ' :: ' + flat(a.querySelector('.why'))),
    dialogText: flat(document.querySelector('[role="dialog"][aria-modal="true"]')).slice(0, 900),
    dialogButtons: [...(document.querySelector('[role="dialog"][aria-modal="true"]')?.querySelectorAll('button')||[])].map(flat),
  }
}), null, 1))
await browser.close()
