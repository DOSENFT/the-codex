import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const IN_COMBAT = { inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: {}, concentrating: null }
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s); localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  localStorage.setItem('codex-action-notes-' + id, JSON.stringify({ 'Divine Smite': { customTip: 'PLANTED OLD NOTE', notes: [] } }))
}
const b = await (pw.chromium ?? pw.default.chromium).launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT)])
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1700)
await page.evaluate(`[...document.querySelectorAll('.dturn .body button')].find(x => /Divine Smite/.test(x.textContent||'')).click()`)
await page.waitForTimeout(600)
console.log(await page.evaluate(`(() => {
  const ds = [...document.querySelectorAll('[role=\"dialog\"]')]
  return ds.length + ' dialogs :: ' + ds.map(d => (d.getAttribute('aria-label')||'?') + ' len=' + (d.textContent||'').length + ' TAIL=' + (d.textContent||'').replace(/\s+/g,' ').slice(-160)).join(' || ')
})()`))
await b.close()
