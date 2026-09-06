/* Slice 6 shots for Marcus: the ask, the picker, and the band that gained a row.
   Scratch — same class as _diag5.mjs, deletable once the slice is signed off. */
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

const dir = 'docs/plans/your-turn/_shots'
/** Put the Reaction band's LABEL just under the top of the viewport, so the
 *  shot reads top-down the way he would scroll to it. */
const toBand = async () => {
  await page.evaluate(() => {
    const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
    const band = [...document.querySelectorAll('.dturn .band')].find(b =>
      flat(b.querySelector('.blbl')).toLowerCase().startsWith('reaction'),
    )
    band?.scrollIntoView({ block: 'start' })
  })
  await page.waitForTimeout(400)
}

const centre = async sel => {
  await page.evaluate(s => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel)
  await page.waitForTimeout(400)
}

await toBand()
await centre('[data-fighting-style-gap]')
await page.screenshot({ path: `${dir}/slice6-ask.png` })
await page.click('[data-fighting-style-gap]')
await page.waitForTimeout(700)
await page.screenshot({ path: `${dir}/slice6-picker.png` })
await page.click('[data-style-option="Interception"]')
await page.waitForTimeout(900)
await toBand()
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.dturn .act')].find(a =>
    /reduce that damage by 1d10/i.test(a.textContent || ''),
  )
  row?.scrollIntoView({ block: 'center' })
})
await page.waitForTimeout(400)
await page.screenshot({ path: `${dir}/slice6-after.png` })

await browser.close()
console.log('shot: slice6-ask.png · slice6-picker.png · slice6-after.png')
