/* ===========================================================================
   HOW MANY STEPS ARE CUT OFF, ACROSS THE WHOLE DECK — a measurement, not a
   prover. It asserts nothing and it is not part of any slice's proof.

   `prove-r2-slice2.mjs` found a clipped step on all five round-two cards. That
   result on its own has two possible readings, and they lead to opposite fixes:

     round two wrote labels that are too long      → shorten round two's content
     the renderer has always clipped long labels   → fix the renderer

   Counting characters in the pack source says round one has two labels over the
   same budget, but a character count is not a measurement — token resolution
   changes the string and font metrics are not monospace. So this opens EVERY
   card on Marcus's real sheet and measures the same way the prover does:
   a step is clipped when its own `scrollWidth` exceeds the box it was given.

   Delete this file once the answer is recorded in `00-status.md`.
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
const DAWN_GUARDIAN = {
  ...nix.weapons.find(w => w.attackType === 'melee'),
  name: 'The Dawn Guardian',
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach', 'Graze'],
  range: '10 ft',
  magical: true,
}
const FEAT = name => ({ name, description: '', isHomebrew: false, effects: [] })
const MARCUS = {
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, STR: 18, CHA: 16 },
  feats: [FEAT('Sentinel'), FEAT('Lucky')],
  weapons: [DAWN_GUARDIAN, ...nix.weapons.filter(w => w.attackType !== 'melee')],
}

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

/* Which cards are on screen, and which pack each came from. The stored ids
   carry the pack, the headings carry the name; zipping them by order is safe
   because `PACKS` order decides card order (Gate 3, note 6). */
const names = await page.evaluate(() => {
  const out = []
  for (const b of document.querySelectorAll('button[aria-expanded]')) {
    const el = b.querySelector('span.font-display')
    if (el) out.push((el.textContent ?? '').trim())
  }
  return out
})

const PILLS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']
const rows = []

for (const name of names) {
  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if (!(b.textContent ?? '').includes(t)) continue
      b.scrollIntoView({ block: 'center' })
      if (b.getAttribute('aria-expanded') === 'false') b.click()
      return
    }
  }, name)
  await page.waitForTimeout(200)

  const found = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return []
    const clipped = []
    for (const el of card.querySelectorAll('span')) {
      if (el.children.length) continue
      if (!pillWords.includes((el.textContent ?? '').trim())) continue
      const row = el.parentElement
      const spans = [...(row?.querySelectorAll('span') ?? [])].filter(s => !s.children.length)
      const label = spans[spans.indexOf(el) + 1]
      if (label && label.scrollWidth > label.clientWidth + 1) {
        clipped.push({
          text: (label.textContent ?? '').trim(),
          need: label.scrollWidth,
          got: label.clientWidth,
        })
      }
    }
    return clipped
  }, [name, PILLS])

  rows.push({ name, clipped: found })

  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t) && b.getAttribute('aria-expanded') === 'true') b.click()
    }
  }, name)
  await page.waitForTimeout(120)
}

await ctx.close()
await browser.close()

const bad = rows.filter(r => r.clipped.length)
console.log(`\n${names.length} cards opened and measured at 390x844.\n`)
for (const r of bad) {
  console.log(`── ${r.name}`)
  for (const c of r.clipped) console.log(`     "${c.text}"  needs ${c.need}px, given ${c.got}px`)
}
console.log(`\n${bad.length} of ${rows.length} cards carry at least one cut-off step.`)
console.log(`${bad.reduce((n, r) => n + r.clipped.length, 0)} cut-off steps in total.`)
