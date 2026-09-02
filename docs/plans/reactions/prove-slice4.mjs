/* Held Reaction — SLICE 4 PROVER. The road he actually walks.
 *
 *   node docs/plans/reactions/prove-slice4.mjs
 *
 * Slice 3 proved the ENGINE road: take the cloak from its reaction row and the
 * composer sizes the pool, the reducer writes the source, the retaliation arms.
 * That road is real and it is not the one Marcus is on. Item 9, his words:
 * "i most often use my physical dice to roll at the table and prefer physical
 * dice" — and a player who rolls his own dice types his own numbers.
 *
 * Down that road the app has an amount and no source, and `activeRetaliation`
 * has nothing to work from. Marcus's ruling at Gate 2 was ASK, NEVER INFER,
 * given for the case where there is exactly ONE candidate.
 *
 * So this drives BOTH halves in a real browser at his phone's size, and the
 * second half is the one that matters:
 *
 *   F · Temp HP → the question appears with "Don't know" already chosen and his
 *       canon-backed source offered → pick the cloak, type 7, Apply → 7 temp on
 *       the tracker → log damage → THE RETALIATION IS OFFERED, 1d10 Fire
 *   G · same again, leaving "Don't know" alone → 7 temp on the tracker →
 *       log damage → NOTHING IS OFFERED
 *   E · clean console across both
 *
 * 7 AND NOT 10 ON PURPOSE. Canon computes 10 for him (level 7 + CHA mod 3). A
 * prover that typed 10 could be satisfied by slice 3's engine road having run
 * behind its back; 7 is a number nothing in the app can produce on its own.
 *
 * G is what stops this slice from being "one candidate, so fill it in". Without
 * it, an app that quietly assumed the cloak would pass F every time.
 *
 * It REFUSES to run rather than pass vacuously if his export is missing, if his
 * sheet has started to declare the cloak, or if he is already standing in temp
 * HP.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/reactions/_shots'
const TYPED = 7

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
  console.error('REFUSING: no Hearthfire Manifest on his sheet — nothing to offer.')
  process.exit(2)
}
if (hearth.actionType || hearth.usesMax !== undefined) {
  console.error(`REFUSING: his sheet has started to DECLARE the cloak
(actionType=${hearth.actionType} usesMax=${hearth.usesMax}).`)
  process.exit(2)
}
if ((SHEET.tempHP ?? 0) > 0) {
  console.error(`REFUSING: he is already standing in ${SHEET.tempHP} temp HP, so
neither F nor G can tell the typed pool from the stored one.`)
  process.exit(2)
}
/* Canon computes 10 for him. If TYPED ever equalled that, F would stop being
   able to tell a hand-typed pool from one the engine road granted. */
const CHA = SHEET.abilityScores?.CHA ?? SHEET.abilities?.CHA
const CANON_TEMP = SHEET.level + Math.floor((CHA - 10) / 2)
if (TYPED === CANON_TEMP) {
  console.error(`REFUSING: the typed number ${TYPED} is also the number canon
computes for him, so a pass could not tell the two roads apart.`)
  process.exit(2)
}

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

/* Re-seeded on EVERY navigation, which is what makes the reload between F and G
   a real reset: the stored sheet goes back to 0 temp HP and no source, so G
   cannot inherit anything F left behind. */
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

/* GEOMETRY, NOT textContent. Finding Q: an element the model built and CSS then
   collapsed still has text. Everything below is read off painted pixels. */
const painted = el => {
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
}

/* The combat tab paints HP in more than one place — measured in slice 3, and
   filed as item 10's "hit points in like 3 different locations". So every
   interaction below takes the FIRST PAINTED match rather than assuming there is
   exactly one, and a selector that matches nothing painted is a failure with a
   name rather than a strict-mode stack trace. */
const clickPainted = async (page, selector) =>
  page.evaluate(
    ([sel, fn]) => {
      const paintedFn = new Function('return ' + fn)()
      const el = [...document.querySelectorAll(sel)].find(paintedFn)
      if (!el) return false
      el.click()
      return true
    },
    [selector, painted.toString()],
  )

const typeInto = async (page, selector, value) =>
  page.locator(selector).first().fill(String(value))

/** Every painted temp-HP badge on the page: "+7 temp". */
const badges = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    return [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && paintedFn(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(t => /^\+\d+\s*temp$/i.test(t))
  }, painted.toString())

/** The retaliation offer, or null. */
const offer = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const yes = [...document.querySelectorAll('button')].find(
      b => (b.textContent || '').trim() === 'Yes' && paintedFn(b),
    )
    if (!yes) return null
    const strip = yes.closest('div')
    return (strip?.textContent || '').replace(/\s+/g, ' ').trim()
  }, painted.toString())

/** The source question as painted: its chips and which one is pressed. */
const question = async page =>
  page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const group = [...document.querySelectorAll('[role="group"]')].find(
      g => /granted these temporary hit points/i.test(g.getAttribute('aria-label') || '') && paintedFn(g),
    )
    if (!group) return null
    const chips = [...group.querySelectorAll('button')].filter(paintedFn)
    return {
      label: (group.textContent || '').replace(/\s+/g, ' ').trim(),
      chips: chips.map(b => (b.textContent || '').trim()),
      pressed: chips
        .filter(b => b.getAttribute('aria-pressed') === 'true')
        .map(b => (b.textContent || '').trim()),
    }
  }, painted.toString())

/** Temp HP → type → (optionally pick a source) → Apply. Returns what went wrong,
 *  or null. */
async function typeTempHP(page, source) {
  if (!(await clickPainted(page, 'button[aria-label="Set temporary hit points"]')))
    return 'no painted Temp HP button'
  await page.waitForTimeout(400)

  const q = await question(page)
  if (!q) return 'the source question did not appear'
  if (source) {
    const picked = await page.evaluate(
      ([name, fn]) => {
        const paintedFn = new Function('return ' + fn)()
        const b = [...document.querySelectorAll('[role="group"] button')].find(
          x => (x.textContent || '').trim() === name && paintedFn(x),
        )
        if (!b) return false
        b.click()
        return true
      },
      [source, painted.toString()],
    )
    if (!picked) return `no painted chip for ${JSON.stringify(source)}`
    await page.waitForTimeout(250)
  }

  await typeInto(page, 'input[aria-label$="amount" i]', TYPED)
  await page.waitForTimeout(200)
  const applied = await page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const b = [...document.querySelectorAll('button')].find(
      x => /^(Apply|Replace)/.test((x.textContent || '').trim()) && paintedFn(x),
    )
    if (!b) return false
    b.click()
    return true
  }, painted.toString())
  if (!applied) return 'no painted Apply button'
  await page.waitForTimeout(600)
  return null
}

/** Log damage taken. */
async function logDamage(page, amount) {
  if (!(await clickPainted(page, 'button[aria-label="Apply damage"]')))
    return 'no painted Damage button'
  await page.waitForTimeout(300)
  await typeInto(page, 'input[aria-label$="amount" i]', amount)
  await page.evaluate(fn => {
    const paintedFn = new Function('return ' + fn)()
    const b = [...document.querySelectorAll('button')].find(
      x => /^(Apply|Replace)/.test((x.textContent || '').trim()) && paintedFn(x),
    )
    b?.click()
  }, painted.toString())
  await page.waitForTimeout(700)
  return null
}

// ── F · he names the cloak, and the retaliation arms ─────────────────────────
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1500)

let firstQuestion = null
{
  if (!(await clickPainted(page, 'button[aria-label="Set temporary hit points"]'))) {
    check('F', false, 'no painted Temp HP button — cannot continue')
  } else {
    await page.waitForTimeout(400)
    firstQuestion = await question(page)
    await page.screenshot({ path: `${SHOTS}/slice4-source-question.png` })
    // Close it again so `typeTempHP` starts from the same place either way.
    await page.evaluate(fn => {
      const paintedFn = new Function('return ' + fn)()
      const b = [...document.querySelectorAll('button[aria-label="Cancel"]')].find(paintedFn)
      b?.click()
    }, painted.toString())
    await page.waitForTimeout(300)
  }
}

check(
  'F1',
  firstQuestion !== null &&
    /granted by/i.test(firstQuestion.label) &&
    firstQuestion.chips.some(c => /^Hearthfire/i.test(c)) &&
    firstQuestion.pressed.length === 1 &&
    /don.?t know/i.test(firstQuestion.pressed[0]),
  firstQuestion
    ? `question on screen: chips ${JSON.stringify(firstQuestion.chips)} · pressed ${JSON.stringify(firstQuestion.pressed)}`
    : 'the question never appeared',
)

const fError = await typeTempHP(page, 'Hearthfire Manifest')
const fBadges = fError ? [] : await badges(page)
if (!fError) await logDamage(page, 5)
const fOffer = fError ? null : await offer(page)
await page.screenshot({ path: `${SHOTS}/slice4-typed-then-armed.png` })

check(
  'F',
  !fError &&
    fBadges.includes(`+${TYPED} temp`) &&
    fOffer !== null &&
    /retaliation\?/.test(fOffer) &&
    /1d10/.test(fOffer),
  fError ??
    `typed ${TYPED} naming the cloak; tracker shows ${JSON.stringify(fBadges)}; after damage: ${
      fOffer ? JSON.stringify(fOffer) : 'NO OFFER — the hand-typed pool did not arm'
    }`,
)

// ── G · he leaves "Don't know" alone, and NOTHING is offered ─────────────────
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1500)

const gError = await typeTempHP(page, null)
const gBadges = gError ? [] : await badges(page)
if (!gError) await logDamage(page, 5)
const gOffer = gError ? null : await offer(page)
await page.screenshot({ path: `${SHOTS}/slice4-dont-know-nothing-offered.png` })

check(
  'G',
  !gError && gBadges.includes(`+${TYPED} temp`) && gOffer === null,
  gError ??
    `typed ${TYPED} with "Don't know" left alone; tracker shows ${JSON.stringify(gBadges)}; after damage: ${
      gOffer
        ? `OFFERED ANYWAY — ${JSON.stringify(gOffer)} — the app guessed`
        : 'nothing offered, which is the honest answer'
    }`,
)

// ── E · clean console ────────────────────────────────────────────────────────
check('E', noise.length === 0, noise.length ? noise.slice(0, 5).join(' | ') : 'no errors or warnings')

await ctx.close()
await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} · shots in ${SHOTS}/`)
process.exit(failed.length === 0 ? 0 : 1)
