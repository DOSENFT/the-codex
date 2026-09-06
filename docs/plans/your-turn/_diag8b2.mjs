/* Slice 8b adjudication, round 3 — the exact accessible names D gives to four
   capabilities the prover still cannot find, so the pins can be re-pointed at
   what the app says rather than at what its predecessor said. Throwaway. */
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
await p.goto(APP, { waitUntil: 'load' })
await p.waitForTimeout(1800)

/* ── the always-active band: what is it headed, and what is in it? ──────── */
console.log('AURA BAND:', JSON.stringify(await p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' }
  const sec = [...document.querySelectorAll('section')].filter(vis)
    .find(s => /Aura of Protection/.test(s.textContent || ''))
  if (!sec) return 'no section mentions Aura of Protection'
  return {
    cls: sec.className,
    parentCls: sec.parentElement?.className,
    html: sec.outerHTML.replace(/\s+/g, ' ').slice(0, 700),
  }
}, null), null, 1))

/* ── does clicking a row open a detail dialog, and what is in its heading? ─ */
await p.evaluate(() => {
  const b = [...document.querySelectorAll('.dturn .body button')].find(x => /Divine Smite/.test(x.textContent || ''))
  b?.click()
})
await p.waitForTimeout(700)
console.log('ROW → DIALOG:', JSON.stringify(await p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' }
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)
    .filter(d => !d.hasAttribute('inert') && getComputedStyle(d).pointerEvents !== 'none')
  return dlg.map(d => ({
    label: d.getAttribute('aria-label'),
    labelledby: d.getAttribute('aria-labelledby'),
    text: (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
  }))
}), null, 1))

await browser.close()
