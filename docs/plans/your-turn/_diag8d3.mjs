/* Slice 8d-3 on the glass. Throwaway. Two questions no markup test can answer
   and the prover cannot either, because pins can click but cannot TYPE:

   A. Does the new band read a note written by the surface that is gone? The
      blob below is hand-written in V0.9's format and planted BEFORE the app
      boots — a round trip through the new writer would prove nothing.
   B. Does what he types survive the sheet closing and reopening, and land on
      disk under the key the old surface used?  */
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
const OLD_NOTE = 'Kev rules the d8s are rolled before the save.'

const seed = ([id, s, c, note]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  // V0.9's own shape, planted by hand.
  localStorage.setItem('codex-action-notes-' + id, JSON.stringify({
    'Divine Smite': { customTip: note, notes: [{ label: 'Table', text: 'keep me' }] },
  }))
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
})
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(IN_COMBAT), OLD_NOTE])
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)))
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1700)

const openSmite = async () => {
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('.dturn .body button')]
      .find(b => /Divine Smite/.test(b.textContent || ''))
    b.click()
  })()`)
  await page.waitForTimeout(500)
}

await openSmite()
console.log('A. HIS OLD NOTE, PAINTED:', await page.evaluate(`(() => {
  /* THE SHEET IS NOT THE FIRST DIALOG. Three role=dialog nodes are in the tree
     — Dice Roller, Mechanics Reference, and this one — so querySelector returns
     the roller and every read comes back "NO BAND". Take the last, not the first. */
  const d = [...document.querySelectorAll('[role="dialog"]')].pop()
  const t = (d.textContent || '').replace(/\\s+/g, ' ')
  const i = t.indexOf('Your note')
  return i < 0 ? 'NO BAND' : JSON.stringify(t.slice(i, i + 90))
})()`))

// B. Type a new one and save.
await page.evaluate(`[...document.querySelectorAll('[role="dialog"] button')]
  .find(b => /^Edit strategic tip$/i.test(b.textContent || '')).click()`)
await page.waitForTimeout(300)
await page.fill('[role="dialog"] textarea', 'Only after a crit.')
await page.evaluate(`[...document.querySelectorAll('[role="dialog"] button')]
  .find(b => /^Save$/i.test(b.textContent || '')).click()`)
await page.waitForTimeout(400)

console.log('B1. ON DISK:', await page.evaluate(
  `localStorage.getItem('codex-action-notes-' + localStorage.getItem('codex-active-id'))`))

// Close, reopen — the note must come back.
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await openSmite()
console.log('B2. AFTER REOPEN:', await page.evaluate(`(() => {
  const d = [...document.querySelectorAll('[role="dialog"]')].pop()
  const t = (d.textContent || '').replace(/\\s+/g, ' ')
  const i = t.indexOf('Your note')
  return i < 0 ? 'NO BAND' : JSON.stringify(t.slice(i, i + 60))
})()`))

// C. A different option must not show it.
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
/* "Roll" and the other verbs are buttons in the same subtree, so a plain
   "not Divine Smite" filter clicks furniture and opens no sheet at all. An
   option row is the one that carries a `.det` line. */
console.log('C. ANOTHER OPTION:', await page.evaluate(`(() => {
  const b = [...document.querySelectorAll('.dturn .body button')]
    .find(b => b.querySelector('.det') && !/Divine Smite/.test(b.textContent || ''))
  if (!b) return 'no other option row found'
  b.click()
  return b.textContent.replace(/\\s+/g, ' ').slice(0, 34)
})()`))
await page.waitForTimeout(500)
console.log('   its band reads:', await page.evaluate(`(() => {
  const d = [...document.querySelectorAll('[role="dialog"]')].pop()
  const t = (d.textContent || '').replace(/\\s+/g, ' ')
  const i = t.indexOf('Your note')
  return i < 0 ? 'NO BAND' : JSON.stringify(t.slice(i, i + 60))
})()`))

console.log('PAGE ERRORS:', errs.length ? errs : 'none')
await browser.close()
