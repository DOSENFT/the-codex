/* Held Reaction — SLICE 3 PROVER. The retaliation arms, on his real export.
 *
 *   node docs/plans/reactions/prove-slice3.mjs
 *
 * Item 7, in his words: "i dont think the hearthfire manifest reaction
 * (retalition with fire damage) is working?"
 *
 * It was not. `tempHPGrantOf` was gated on `cost.resourcePoolId`, his sheet
 * carries Hearthfire Manifest as one undeclared feature with no uses on it and
 * `resourcePools: []`, so no row of his ever derived a pool, so no row ever
 * granted, so `tempHPSource` was never set, so `activeRetaliation` returned null
 * every time and the prompt component had never once received data.
 *
 * This drives the whole road in a real browser, at his phone's size:
 *
 *   A · the cloak's Reaction row is on the band and offers a Spend
 *   B · spending it puts TEMP HP on the tracker — 10, computed from HIS numbers
 *   C · logging damage taken then OFFERS THE RETALIATION, by canon's die
 *   D · slice 1 and slice 2 still hold — four rows, Sentinel twice
 *   E · clean console
 *
 * It REFUSES to run rather than pass vacuously if his export is missing, if his
 * sheet has started to declare the cloak itself, or if he is already standing in
 * temp HP — in which case B would pass without this slice having done anything.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'

let SHEET
try {
  SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))
} catch {
  console.error(`REFUSING: his export is not at ${SHEET_PATH}. This prover only
means anything against the sheet he actually plays.`)
  process.exit(2)
}

const hearth = (SHEET.features ?? []).find(f => /hearthfire/i.test(f.name ?? ''))
if (!hearth) {
  console.error('REFUSING: no Hearthfire Manifest on his sheet — nothing to arm.')
  process.exit(2)
}
if (hearth.actionType || hearth.usesMax !== undefined) {
  console.error(`REFUSING: his sheet has started to DECLARE the cloak
(actionType=${hearth.actionType} usesMax=${hearth.usesMax}). The fault this slice
fixes is a sheet that declares nothing; against a declared one the old gate would
have worked and a pass here would prove nothing.`)
  process.exit(2)
}
if ((SHEET.tempHP ?? 0) > 0) {
  console.error(`REFUSING: he is already standing in ${SHEET.tempHP} temp HP, so
check B cannot tell the grant from the sheet.`)
  process.exit(2)
}

/* Canon's own formula, resolved here independently of the app, so the number the
   screen prints is checked against arithmetic rather than against itself. */
const CHA = SHEET.abilityScores?.CHA ?? SHEET.abilities?.CHA
const EXPECTED_TEMP = SHEET.level + Math.floor((CHA - 10) / 2)

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (id, ok, note) => {
  results.push({ id, ok, note })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${note}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

const noise = []
ctx.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') noise.push(`${m.type()}: ${m.text()}`)
})
ctx.on('pageerror', e => noise.push(`pageerror: ${e.message}`))

await ctx.addInitScript(
  ([id, s, c]) => {
    localStorage.setItem('codex-character-' + id, s)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-combat-' + id, c)
    const p = JSON.parse(s)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([
        {
          id,
          name: p.name,
          class: p.class,
          subclass: p.subclass,
          level: p.level,
          updatedAt: '2026-08-30T00:00:00.000Z',
        },
      ]),
    )
  },
  [
    SHEET.id,
    JSON.stringify(SHEET),
    JSON.stringify({
      inCombat: true,
      round: 3,
      yourTurn: true,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: {},
      concentrating: null,
    }),
  ],
)

const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1500)

const BAND = 'section[aria-label="Your reactions"]'
const expand = async () => {
  const toggle = `${BAND} button[aria-expanded]`
  if ((await page.getAttribute(toggle, 'aria-expanded')) === 'false') {
    await page.click(toggle)
    await page.waitForTimeout(400)
  }
}
await expand()

/* GEOMETRY, NOT textContent. Finding Q: `textContent` proves the model, not the
   screen — an element the model built and CSS then collapsed still has text. A
   row counts as on screen when it has been painted. */
const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

// ── D · slice 1 and slice 2 still hold ──────────────────────────────────────
const band = await page.evaluate(
  ([sel, fn]) => {
    const paintedFn = new Function('return ' + fn)()
    const section = document.querySelector(sel)
    if (!section) return null
    const rows = [...section.querySelectorAll('button[aria-label$="— details"]')].filter(paintedFn)
    return rows.map(b => b.getAttribute('aria-label').replace(/ — details$/, ''))
  },
  [BAND, painted.toString()],
)
check(
  'D',
  Array.isArray(band) &&
    band.length === 4 &&
    band.filter(n => /^Sentinel\b/i.test(n)).length === 2 &&
    band.some(n => /^Hearthfire/i.test(n)),
  `band rows: ${JSON.stringify(band)}`,
)

// ── A · the cloak's Reaction row offers a Spend ──────────────────────────────
const hearthLabel = (band ?? []).find(n => /^Hearthfire/i.test(n))
if (!hearthLabel) {
  check('A', false, 'no Hearthfire row on the band — cannot continue')
} else {
  await page.click(`${BAND} button[aria-label="${hearthLabel} — details"]`)
  await page.waitForTimeout(700)
  const spend = await page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const b = [...document.querySelectorAll('button')].find(
      x => /^Spend/.test((x.textContent || '').trim()) && paintedFn(x),
    )
    return b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null
  }, painted.toString())
  check('A', spend !== null, `"${hearthLabel}" detail sheet offers: ${JSON.stringify(spend)}`)

  if (spend) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x =>
        /^Spend/.test((x.textContent || '').trim()),
      )
      b?.click()
    })
    await page.waitForTimeout(800)
  }
}

// ── B · the tracker is now carrying temp HP, computed from HIS numbers ───────
/* The badge is `+10 temp`. Read off the SCREEN — every painted leaf on the page
   whose words are a temp-HP badge — rather than out of the tracker's subtree, so
   this cannot be satisfied by a node the layout has thrown away. */
const badges = await page.evaluate(fn => {
  const paintedFn = new Function('return ' + fn)()
  return [...document.querySelectorAll('*')]
    .filter(el => el.children.length === 0 && paintedFn(el))
    .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(t => /^\+\d+\s*temp$/i.test(t))
}, painted.toString())
check(
  'B',
  badges.includes(`+${EXPECTED_TEMP} temp`),
  `expected "+${EXPECTED_TEMP} temp" (level ${SHEET.level} + CHA mod ${Math.floor((CHA - 10) / 2)}, and canon's own worked example is 11 at CHA 18 — so this number is HIS); screen shows ${JSON.stringify(badges)}`,
)

// ── C · logging damage taken offers the retaliation ──────────────────────────
await page.click('button[aria-label="Apply damage"]')
await page.waitForTimeout(300)
await page.fill('input[aria-label="damage amount"]', '5')
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x =>
    /Apply|Replace/.test((x.textContent || '').trim()),
  )
  b?.click()
})
await page.waitForTimeout(800)

const prompt = await page.evaluate(fn => {
  const paintedFn = new Function('return ' + fn)()
  const yes = [...document.querySelectorAll('button')].find(
    b => (b.textContent || '').trim() === 'Yes' && paintedFn(b),
  )
  if (!yes) return null
  const strip = yes.closest('div')
  return {
    text: (strip?.textContent || '').replace(/\s+/g, ' ').trim(),
    buttons: [...(strip?.querySelectorAll('button') ?? [])].map(b => (b.textContent || '').trim()),
  }
}, painted.toString())
check(
  'C',
  prompt !== null && /retaliation\?/.test(prompt.text) && /1d10/.test(prompt.text),
  prompt ? `prompt on screen: ${JSON.stringify(prompt.text)} ${JSON.stringify(prompt.buttons)}` : 'NO PROMPT — the retaliation did not arm',
)

await page.screenshot({ path: `${SHOTS}/slice3-retaliation-prompt.png` })

// ── E · clean console ────────────────────────────────────────────────────────
check('E', noise.length === 0, noise.length ? noise.slice(0, 5).join(' | ') : 'no errors or warnings')

await ctx.close()
await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} · shot: ${SHOTS}/slice3-retaliation-prompt.png`)
process.exit(failed.length === 0 ? 0 : 1)
