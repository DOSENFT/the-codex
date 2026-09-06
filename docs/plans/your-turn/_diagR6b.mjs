/* What does the option sheet offer once a weapon row is pressed?
 * `TurnLive.tsx:309` — "THE PRESS OPENS; THE SHEET SPENDS." This finds the
 * control that spends, so the R6 prover can press the one Marcus presses.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const COMBAT = { inCombat: true, round: 3, yourTurn: true, spellSlots: {}, concentrating: null,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false } }
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s); localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  localStorage.setItem('codex-active-tab', 'combat')
}
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`), 'C:/Users/marcu/Documents/Command/brain/graph/node_modules']
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const browser = await (pw.chromium ?? pw.default.chromium).launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(seed, [SHEET.id ?? 'nix', JSON.stringify(SHEET), JSON.stringify(COMBAT)])
const page = await ctx.newPage()
await page.goto(APP, { waitUntil: 'load' }); await page.waitForTimeout(1700)

const isRowButton = await page.evaluate(() => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const row = [...document.querySelectorAll('.band .brows > *')].find(r => txt(r.querySelector('.anm')) === 'The Dawn Guardian')
  return { tag: row?.tagName, cls: row?.className, isButton: row?.tagName === 'BUTTON' }
})
console.log('THE WEAPON ROW:', JSON.stringify(isRowButton))

await page.evaluate(() => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const row = [...document.querySelectorAll('.band .brows > *')].find(r => txt(r.querySelector('.anm')) === 'The Dawn Guardian')
  ;(row.querySelector('.acthit') ?? row).click()
})
await page.waitForTimeout(1000)

const sheet = await page.evaluate(() => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  /* anything that looks like an overlay/sheet, plus every button now on screen */
  const panels = [...document.querySelectorAll('[role="dialog"], .sheet, .overlay, .osheet, .optsheet')]
    .map(p => ({ cls: p.className, text: txt(p).slice(0, 200) }))
  return {
    panels,
    buttons: [...document.querySelectorAll('button')].map(b => ({
      t: txt(b).slice(0, 46), cls: b.className.slice(0, 60),
      vis: b.getBoundingClientRect().height > 0,
    })).filter(b => b.vis),
  }
})
console.log('\nPANELS AFTER THE PRESS')
for (const p of sheet.panels) console.log(`  .${p.cls}\n     ${p.text}`)
console.log('\nVISIBLE BUTTONS AFTER THE PRESS')
for (const b of sheet.buttons) console.log(`  "${b.t}"   .${b.cls}`)
await page.screenshot({ path: 'docs/plans/your-turn/mockups/R6-diag-sheet.png' })
await browser.close()
