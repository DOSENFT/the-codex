/* Where do Nix's weapon attacks live on the combat tab, and what commits one?
 * Diagnostic for the R6 prover, which found seven Action rows and no weapon.
 *   node docs/plans/your-turn/_diagR6.mjs
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const COMBAT = {
  inCombat: true, round: 3, yourTurn: true, spellSlots: {}, concentrating: null,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
}
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
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
await page.goto(APP, { waitUntil: 'load' })
await page.waitForTimeout(1700)

const dump = await page.evaluate(() => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  return {
    /* every `.act` on the page, with the band it sits in */
    acts: [...document.querySelectorAll('.act')].map(a => ({
      band: txt(a.closest('.band')?.querySelector('.blbl')) || '(no band)',
      name: txt(a.querySelector('.anm')),
      cost: txt(a.querySelector('.cost')),
      cls: a.className,
    })),
    /* is there a "more" / overflow control hiding rows? */
    buttons: [...document.querySelectorAll('button')].map(b => txt(b).slice(0, 40)).filter(Boolean),
    /* does Hearthbrand appear anywhere at all? */
    hearth: document.body.textContent.includes('Hearthbrand'),
    bands: [...document.querySelectorAll('.band')].map(b => ({
      label: txt(b.querySelector('.blbl')),
      ready: txt(b.querySelector('.bn')),
      rows: b.querySelectorAll('.brows > *').length,
      more: txt(b.querySelector('.bmore')) || null,
    })),
  }
})
console.log('BANDS'); for (const b of dump.bands) console.log(' ', JSON.stringify(b))
console.log('\nEVERY .act ON THE PAGE')
for (const a of dump.acts) console.log(`  [${a.band}] ${a.name}  <${a.cost}>  .${a.cls}`)
console.log('\n"Hearthbrand" anywhere on the page:', dump.hearth)
console.log('\nBUTTONS'); console.log('  ' + dump.buttons.join('\n  '))
await browser.close()
