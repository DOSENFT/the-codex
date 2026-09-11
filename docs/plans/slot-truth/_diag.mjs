import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })()]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 1, max: 3 }, 3: { used: 0, max: 2 } },
  concentrating: null,
})

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(([id, s, c]) => {
  if (!localStorage.getItem('codex-character-' + id)) localStorage.setItem('codex-character-' + id, s)
  if (!localStorage.getItem('codex-combat-' + id)) localStorage.setItem('codex-combat-' + id, c)
  localStorage.setItem('codex-active-id', id)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-28T00:00:00.000Z' }]))
}, [SHEET.id, JSON.stringify(SHEET), IN_COMBAT])
const page = await ctx.newPage()
page.on('pageerror', e => console.log('PAGEERROR', String(e)))
await page.goto(process.argv[2] || 'http://localhost:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('[aria-label]')]
    .map(e => e.getAttribute('aria-label'))
    .filter(l => /slot/i.test(l))
  const bodyH = document.body.scrollHeight
  const scrollers = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 50).slice(0, 5)
    .map(e => `${e.tagName}.${(e.className || '').toString().slice(0, 60)} sh=${e.scrollHeight} ch=${e.clientHeight}`)
  const pip = document.querySelector('button[aria-label*=" slot "]')
  let pipInfo = null
  if (pip) { const r = pip.getBoundingClientRect(); pipInfo = { label: pip.getAttribute('aria-label'), rect: [r.left, r.top, r.width, r.height].map(Math.round) } }
  return { slotLabels: labels.slice(0, 40), count: labels.length, bodyH, scrollers, pipInfo, txt: document.body.innerText.slice(0, 400) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
