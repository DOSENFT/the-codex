/* Throwaway. Opens the Sentinel row's detail sheet on his real export and reads
   the provenance tag beside the title. Slice 2 makes canon's words reach that
   sheet for the first time; this asks whether the sheet says so. Delete after
   the finding is recorded in 00-status.md. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

mkdirSync('docs/plans/reactions/_shots', { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-30T00:00:00.000Z' }]))
}, [SHEET.id, JSON.stringify(SHEET), JSON.stringify({ inCombat: true, round: 3, yourTurn: false, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: {}, concentrating: null })])

const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1500)

const band = 'section[aria-label="Your reactions"]'
if ((await page.getAttribute(`${band} button[aria-expanded]`, 'aria-expanded')) === 'false') {
  await page.click(`${band} button[aria-expanded]`)
  await page.waitForTimeout(400)
}
await page.click(`${band} button[aria-label^="Sentinel · attacks"]`)
await page.waitForTimeout(700)

const seen = await page.evaluate(() => {
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const h2 = [...document.querySelectorAll('h2')].find(h => /^Sentinel/.test(txt(h)))
  if (!h2) return { found: false }
  const header = h2.parentElement
  return {
    found: true,
    title: txt(h2),
    header: txt(header),
    tag: [...header.querySelectorAll('span')].map(txt).join(' | '),
  }
})
console.log(JSON.stringify(seen, null, 2))
await page.screenshot({ path: 'docs/plans/reactions/_shots/_probe-sentinel-detail.png' })
await ctx.close()
await browser.close()
