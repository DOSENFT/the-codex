/* THE COMBAT TAB, AS HE ACTUALLY SEES IT.  Verification pass 2026-09-05.
 *
 * The provers answer in numbers. He plays at a table and reads a screen, so
 * this takes the same screen the numbers came from and photographs it: the top
 * of the tab, then the four bands, then the whole thing in one tall frame.
 *
 * Nothing is asserted here — `_repro-marcus.mjs`, `prove-sliceR6.mjs` and
 * `prove-sliceR7.mjs` do the asserting. This is the exhibit.
 *
 *   node docs/plans/your-turn/_shot-final.mjs [url]
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const ID = SHEET.id ?? 'nix'
const OUT = 'docs/plans/your-turn/mockups'
mkdirSync(OUT, { recursive: true })

const COMBAT = {
  inCombat: true, round: 3, yourTurn: true, spellSlots: {}, concentrating: null,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
}

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{
    id, name: p.name, class: p.class, subclass: p.subclass, level: p.level,
    updatedAt: '2026-08-31T00:00:00.000Z',
  }]))
  localStorage.setItem('codex-active-tab', 'combat')
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`),
  'C:/Users/marcu/Documents/Command/brain/graph/node_modules']
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const browser = await (pw.chromium ?? pw.default.chromium).launch()

async function shot(name, { full = false, scrollTo = 0 } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await page.goto(APP)
  await page.evaluate(seed, [ID, JSON.stringify(SHEET), JSON.stringify(COMBAT)])
  await page.goto(APP)
  await page.waitForTimeout(900)
  if (scrollTo) {
    await page.evaluate(y => {
      const el = document.querySelector('.dturn .body') ?? document.scrollingElement
      el.scrollTop = y
    }, scrollTo)
    await page.waitForTimeout(350)
  }
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage: full })
  const info = await page.evaluate(() => {
    const el = document.querySelector('.dturn .body')
    return el ? { window: el.clientHeight, content: el.scrollHeight } : null
  })
  console.log(`  wrote ${path}${info ? `   (scroller ${info.window}px window / ${info.content}px content)` : ''}`)
  await page.close()
}

console.log('Combat tab, his export, 390x844 @2x:')
await shot('FINAL-1-top')
await shot('FINAL-2-bands', { scrollTo: 620 })
await shot('FINAL-3-lower', { scrollTo: 1400 })

await browser.close()
