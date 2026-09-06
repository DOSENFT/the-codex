/* Does the LIVE screen still guard "End combat"?
 *
 * `EndCombat.test.tsx` pins, against the now-dead `TurnDeck`: "does NOT end the
 * fight on the first tap — nothing irreversible is mounted", and a second tap
 * that names what it costs. The live rail wires `onEndCombat` straight to
 * `combat.endEncounter` (`TurnLive.tsx:412`), which suggests the guard was lost
 * somewhere in slices 7-8. Suggests is not knows. This taps it once, on his real
 * export, and reads whether the fight is still running.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const ID = SHEET.id ?? 'nix'
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
await ctx.addInitScript(seed, [ID, JSON.stringify(SHEET), JSON.stringify(COMBAT)])
const page = await ctx.newPage()
await page.goto(APP, { waitUntil: 'load' }); await page.waitForTimeout(1700)

const read = () => page.evaluate(id => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  let stored = null
  try { stored = JSON.parse(localStorage.getItem('codex-combat-' + id) ?? 'null') } catch {}
  return {
    inCombatStored: stored?.inCombat ?? null,
    round: stored?.round ?? null,
    /* BY ACCESSIBLE NAME, NOT BY CLASS. An earlier draft asked for
       `.rbtn.end` — which is the class BOTH verbs carry, so it reported "End
       combat is still mounted" when what it had found was the Start Combat
       button wearing the same class. It made `TurnVerbs`'s working exclusivity
       look like a regression. The name is the thing being claimed; ask for it. */
    endBtn: !!document.querySelector('[aria-label="End combat"]'),
    startBtn: [...document.querySelectorAll('button')].some(b => /start combat/i.test(txt(b))),
    bands: document.querySelectorAll('.band').length,
    /* anything that reads like a confirmation, by its words not its class */
    confirmish: [...document.querySelectorAll('button')].map(b => txt(b))
      .filter(t => /cancel|keep|really|are you sure|end the fight|confirm|yes, end/i.test(t)),
  }
}, id)

const id = ID
const before = await read()
console.log('BEFORE THE TAP:', JSON.stringify(before, null, 2))

await page.evaluate(() => document.querySelector('[aria-label="End combat"]')?.click())
await page.waitForTimeout(1200)
const after = await read()
console.log('\nAFTER ONE TAP:', JSON.stringify(after, null, 2))
await page.screenshot({ path: 'docs/plans/your-turn/mockups/R7-endcombat-one-tap.png' })

console.log('\n' + '='.repeat(64))
if (before.inCombatStored && after.inCombatStored === false)
  console.log('VERDICT: ONE TAP ENDED THE FIGHT. The confirm is gone.')
else if (after.confirmish.length)
  console.log('VERDICT: guarded — a confirmation appeared: ' + after.confirmish.join(' | '))
else
  console.log('VERDICT: inconclusive — nothing ended and nothing asked. Read the shot.')
await browser.close()
