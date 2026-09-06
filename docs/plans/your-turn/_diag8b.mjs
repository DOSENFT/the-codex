/* Slice 8b adjudication, round 2 — the four reds that need a click or a second
   fixture. Throwaway; deleted at the slice's close-out. */
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
const OUT = { ...IN, inCombat: false, round: 0 }

const browser = await chromium.launch()
const open = async (combat, sheet = SHEET) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
  await ctx.addInitScript(([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  }, [sheet.id, JSON.stringify(sheet), JSON.stringify(combat)])
  const page = await ctx.newPage()
  await page.goto(APP, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  return page
}
const vis = `(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width>0 && r.height>0 && s.visibility!=='hidden' })`

// ── A. does a row open the detail sheet, and does the sheet carry the notes? ──
const p = await open(IN)
await p.evaluate(() => {
  const b = [...document.querySelectorAll('.dturn .body button')]
    .find(x => /Divine Smite/.test(x.textContent || ''))
  b?.click()
})
await p.waitForTimeout(800)
const sheetOpen = await p.evaluate(v => {
  const vis = eval(v)
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)
    .filter(d => !d.hasAttribute('inert') && getComputedStyle(d).pointerEvents !== 'none')
  const names = [...document.querySelectorAll('button')].filter(vis)
    .map(b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim())
  return {
    dialogs: dlg.length,
    heading: dlg[0] ? (dlg[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null,
    notesBtn: names.find(n => /tip|note/i.test(n)) ?? null,
  }
}, vis)
console.log('A. ROW → DETAIL SHEET:', JSON.stringify(sheetOpen, null, 1))

// ── B. the HP fill colour at full HP, beside the 3/67 reading ─────────────────
const fillOf = async page => page.evaluate(v => {
  const vis = eval(v)
  const f = [...document.querySelectorAll('.dturn .fill')].filter(vis)[0]
  return f ? { cls: f.className, bg: getComputedStyle(f).backgroundColor, w: Math.round(f.getBoundingClientRect().width) } : null
}, vis)
const FULL = { ...SHEET, hitPoints: { ...SHEET.hitPoints, current: SHEET.hitPoints.max } }
const pFull = await open(IN, FULL)
console.log('B. HP FILL  3/67 :', JSON.stringify(await fillOf(p)))
console.log('   HP FILL 67/67 :', JSON.stringify(await fillOf(pFull)))

// ── C. the exact no-round-zero expression, out of combat ─────────────────────
const pOut = await open(OUT)
console.log('C. ROUND-ZERO:', JSON.stringify(await pOut.evaluate(v => {
  const vis = eval(v)
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  const anyDom = [...document.querySelectorAll('*')].filter(e => /^round 0$/i.test(own(e)))
  const painted = anyDom.filter(vis)
  const chrome = document.querySelector('.dturn .round')
  return {
    inDomAnywhere: anyDom.length,
    painted: painted.length,
    chromeRoundEl: chrome ? { text: chrome.textContent, painted: vis(chrome) } : 'absent',
    startCombat: !![...document.querySelectorAll('button')].filter(vis).find(b => /start combat/i.test(b.textContent || '')),
  }
}, vis), null, 1))

// ── D. is there ANY way to mark an economy slot used by hand? ─────────────────
console.log('D. ECONOMY TOGGLES:', JSON.stringify(await p.evaluate(v => {
  const vis = eval(v)
  return [...document.querySelectorAll('.dturn button, .dturn [role="checkbox"], .dturn [role="switch"]')]
    .filter(vis)
    .map(b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(n => /action|bonus|reaction|move/i.test(n) && n.length < 40)
}, vis)))

await browser.close()
