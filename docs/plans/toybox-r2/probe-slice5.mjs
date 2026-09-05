/* ===========================================================================
   THROWAWAY. Delete after slice 5 (🟡 ASK-FIRST — listed in 00-status.md).

   `prove-r2-slice5.mjs` claims eight tactic cards offer no Deploy button and
   paint no action-economy pills. It has only ever seen that claim GREEN, and a
   detector that has only ever agreed with you is not a detector — a
   `querySelector` for a button that never existed returns null whether the
   button is absent or the selector is misspelt.

   So this runs the SAME two detectors against a card that genuinely has both:
   a combo. If they report deploy=true and pills on the combos tab and
   deploy=false and no pills on the tactics tab, they can tell the difference,
   and the slice-5 prover's PASS means what it says.

   Nothing is mutated and nothing is written. Run against the same preview.
   ========================================================================= */
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'

const BASE = process.argv[2] ?? 'http://localhost:4321'

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })(),
]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium

const nix = await loadNix()
const FEAT = name => ({ name, description: '', isHomebrew: false, effects: [] })
const MARCUS = {
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, STR: 18, CHA: 16 },
  feats: [FEAT('Sentinel'), FEAT('Lucky')],
  weapons: [
    {
      ...nix.weapons.find(w => w.attackType === 'melee'),
      name: 'The Dawn Guardian',
      damageDice: '1d10',
      damageType: 'Slashing',
      properties: ['Two-Handed', 'Reach', 'Graze'],
      range: '10 ft',
      magical: true,
    },
    ...nix.weapons.filter(w => w.attackType !== 'melee'),
  ],
}

const PILL_WORDS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const id = MARCUS.id
await page.addInitScript(
  ([json, id]) => {
    localStorage.setItem('codex-character-' + id, json)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
  },
  [JSON.stringify(MARCUS), id],
)
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  .click({ timeout: 15000 })
await page.waitForTimeout(600)

/* THE DETECTORS, COPIED VERBATIM out of prove-r2-slice5.mjs. Copied rather than
   imported on purpose: an imported copy proves the import works, a verbatim
   copy proves the code in the prover does. */
const inspect = async name => {
  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if (!(b.textContent ?? '').includes(t)) continue
      if (b.getAttribute('aria-expanded') === 'false') b.click()
      return
    }
  }, name)
  await page.waitForTimeout(400)
  return page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null
    const deployLabelled = !!card.querySelector('button[aria-label="Deploy combo"]')
    const deployWorded = [...card.querySelectorAll('button')]
      .some(b => /deploy/i.test(b.textContent ?? ''))
    const pills = []
    for (const el of card.querySelectorAll('*')) {
      if (el.children.length) continue
      const s = (el.textContent ?? '').trim()
      if (pillWords.includes(s)) pills.push(s)
    }
    return { deployLabelled, deployWorded, pills }
  }, [name, PILL_WORDS])
}

const combo = await inspect('The Sentinel Gate')

const switched = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if ((b.textContent ?? '').trim() === 'Tactics') { b.click(); return true }
  }
  return false
})
await page.waitForTimeout(500)
const tactic = await inspect('Sentinel Is a Prison, Not a Damage Feat')

await ctx.close()
await browser.close()

console.log(`\nswitched to Tactics: ${switched}`)
console.log(`\n── combo  "The Sentinel Gate"`)
console.log(`   ${JSON.stringify(combo)}`)
console.log(`\n── tactic "Sentinel Is a Prison, Not a Damage Feat"`)
console.log(`   ${JSON.stringify(tactic)}`)

const detectsDeploy = !!combo?.deployLabelled && !!combo?.deployWorded && !tactic?.deployLabelled && !tactic?.deployWorded
const detectsPills = (combo?.pills.length ?? 0) > 0 && (tactic?.pills.length ?? 1) === 0
console.log(`\nDeploy detector can tell them apart: ${detectsDeploy ? 'YES' : 'NO — the prover is blind'}`)
console.log(`Pill detector can tell them apart:   ${detectsPills ? 'YES' : 'NO — the prover is blind'}`)
process.exit(detectsDeploy && detectsPills ? 0 : 1)
