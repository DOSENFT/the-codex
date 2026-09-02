/* ============================================================================
   SLICE 6 — INTERCEPTION, AND THE QUESTION NOBODY EVER ASKED (item 8)
   ----------------------------------------------------------------------------
   Marcus, item 8: "in the combat tab, it doesnt seem to have all of my available
   reactions available. I should have the hearthfire manifest, sentinal, and
   interception."

   MEASURED FIRST, BUILT SECOND. This file opened as the measurement that decided
   what slice 6 had to build. Seeding his real export twice — once as he exports
   it, once with Interception written exactly as `fightingStyleFeat()` writes it
   — took the Reaction band from FOUR painted rows to FIVE, with Interception's
   own trigger text and nothing else on the screen changed. So the engine, the
   picker and the write path were all already whole, and the only missing piece
   was the ASKING. That measurement is kept below as PART ONE.

   PART TWO is the prover for what was then built: the ask itself, driven for
   real through the glass — press the note, press Interception in the picker,
   and watch the row arrive on his own sheet.

   ── THE COUNT IS NOT THE PROOF ──────────────────────────────────────────────
   His Reaction band already holds FOUR rows, and two of them are called
   "Sentinel" — one feat, two triggers, correct and deliberate (compose.ts:483,
   ids made unique by slice 10e so the second stops vanishing into the first).
   So "five rows" would also be satisfied by a bug that duplicated something, and
   "distinct names" would be satisfied by DELETING a Sentinel. Rows are therefore
   matched by TRIGGER TEXT, and every trigger that existed before the press is
   asserted to still be on the glass after it, each still its own.

   ── AND THE PROMPT IS NOT PROVED BY ITS PRESENCE EITHER ─────────────────────
   A note that always paints is not a prompt, it is furniture. Three gates decide
   it — the class grants a style, he has reached it, he has not answered it — and
   each is shown able to close it: the ANSWERED gate by the press itself, the
   REACHED gate by a level-1 clone of his own sheet, which must paint a Reaction
   band and no note at all.

   Finding Q: painted geometry, not `textContent`.
   ========================================================================== */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))

/* Canon's Interception, feats.json:723, written onto the sheet in exactly the
   shape `fightingStyleFeat()` produces — `effects` verbatim (the load-bearing
   line), `description` the same sentences joined, `prerequisites` from canon's
   `prerequisite`, `tacticalNote` from `paladinNote`. Copied rather than imported
   because this file runs in plain node against the built bundle; the unit test
   asserts the real function produces this same record, so a drift between the
   two goes red there rather than quietly here. */
const INTERCEPTION_TEXT =
  'When a creature you can see hits another creature within 5 feet of you with an attack, you can take a Reaction to reduce that damage by 1d10 plus your Proficiency Bonus (to a minimum of 0). You must be wielding a Shield or a Simple or Martial weapon.'
const INTERCEPTION_FEAT = {
  name: 'Interception',
  description: INTERCEPTION_TEXT,
  isHomebrew: false,
  effects: [INTERCEPTION_TEXT],
  prerequisites: 'the Fighting Style feature',
  tacticalNote:
    "THE HEARTH FIGHTING STYLE. This is 'guard the hearth' as a mechanic - you physically intercept damage aimed at someone standing next to you, every round, for free, with no Concentration and no resource cost. At Proficiency Bonus +3 that averages about 8.5 damage prevented per round. Over a long fight it outperforms any damage style.",
}

/** Interception's trigger, by its shape on the glass and not by its name. */
const IS_INTERCEPTION = /reduce that damage by 1d10/i

const IN_COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}

/* IDEMPOTENT ON PURPOSE. `addInitScript` runs before EVERY navigation in the
   context, so a seed that wrote unconditionally would erase his pick the moment
   the page reloaded — and the reload is the only thing that can tell a write to
   `codex-character-<id>` apart from a value living in React state. */
const seed = ([id, s, c]) => {
  if (localStorage.getItem('codex-character-' + id)) return
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
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    ]),
  )
}

/** The whole Reaction band as painted: its rows by trigger, and its note. */
const readReactionBand = () => {
  const flat = e => (e?.textContent || '').replace(/\s+/g, ' ').trim()
  const box = e => {
    const r = e.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), painted: r.width > 0 && r.height > 0 }
  }
  const band = [...document.querySelectorAll('.dturn .band')].find(
    b => flat(b.querySelector('.blbl')).toLowerCase().startsWith('reaction'),
  )
  const gapAll = [...document.querySelectorAll('[data-fighting-style-gap]')]
  const gap = gapAll[0]
  return {
    found: !!band,
    rows: band
      ? [...band.querySelectorAll('.act')].map(a => ({
          name: flat(a.querySelector('.anm')),
          det: flat(a.querySelector('.det')),
          ...box(a),
        }))
      : [],
    // The note, wherever on the page it is — so a note that painted under the
    // WRONG band is a failure and not an invisible pass.
    gapCount: gapAll.length,
    gap: gap ? { ...box(gap), text: flat(gap), band: flat(gap.closest('.band')?.querySelector('.blbl')) } : null,
  }
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium

const browser = await chromium.launch()
const errors = []

const openOn = async sheet => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(seed, [sheet.id, JSON.stringify(sheet), JSON.stringify(IN_COMBAT)])
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('http://[::1]:4321/the-codex/?d=1', { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  return { ctx, page }
}

let pass = 0
let fail = 0
const check = (ok, label, detail = '') => {
  if (ok) pass++
  else fail++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`)
}
const trigs = b => b.rows.map(r => r.det).filter(Boolean)

/* ════════════════════════════════════════════════════════════════════════════
   PART ONE — THE MEASUREMENT THAT DECIDED THE SLICE
   Kept, because it is the reason nothing was built in the engine: it shows the
   band answers correctly to a recorded style with no new wiring anywhere.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\nSLICE 6 — the Reaction band on HIS export · 390×844 · round 3\n')
console.log('PART ONE — measurement: does a recorded Interception reach the band at all?')

const m1 = await openOn(SHEET)
const mBefore = await m1.page.evaluate(readReactionBand)
await m1.ctx.close()

const m2 = await openOn({ ...SHEET, feats: [...(SHEET.feats ?? []), INTERCEPTION_FEAT] })
const mAfter = await m2.page.evaluate(readReactionBand)
await m2.ctx.close()

check(mBefore.rows.length === 4, 'his export paints FOUR reaction rows', `${mBefore.rows.length}`)
check(
  !trigs(mBefore).some(d => IS_INTERCEPTION.test(d)),
  'and none of them is Interception',
)
check(
  trigs(mAfter).some(d => IS_INTERCEPTION.test(d)),
  'recording Interception puts its trigger on the glass',
)
check(mAfter.rows.length === 5, 'and the band is FIVE rows, not four and not six', `${mAfter.rows.length}`)
for (const d of trigs(mBefore)) {
  check(trigs(mAfter).includes(d), `the row that triggered on "${d.slice(0, 46)}…" survived`)
}

/* ════════════════════════════════════════════════════════════════════════════
   PART TWO — THE ASK, DRIVEN THROUGH THE GLASS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\nPART TWO — the ask: press the note, pick Interception, watch the row arrive')

const { ctx, page } = await openOn(SHEET)
const before = await page.evaluate(readReactionBand)

check(before.found, 'the Reaction band is on the glass')
check(before.gapCount === 1, 'exactly ONE note, not zero and not one per band', `${before.gapCount}`)
check(before.gap?.painted === true, 'the note is painted')
check(
  (before.gap?.band || '').toLowerCase().startsWith('reaction'),
  'and it hangs in the REACTION band',
  before.gap?.band ?? '(none)',
)
check(
  (before.gap?.h ?? 0) >= 48 && (before.gap?.w ?? 0) >= 48,
  'V-5b: the note clears the 48px floor in BOTH dimensions',
  `${before.gap?.w}×${before.gap?.h}`,
)
check(
  /Interception/.test(before.gap?.text ?? ''),
  'the note names the reaction he said was missing',
)
check(before.rows.length === 4, 'four rows before the press', `${before.rows.length}`)

/* The press. Nothing here reaches into storage — every state change below is
   the same one his thumb makes. */
await page.click('[data-fighting-style-gap]')
await page.waitForTimeout(400)
const pickerUp = await page.evaluate(() => {
  const p = document.querySelector('[data-fighting-style-picker]')
  if (!p) return { open: false, options: 0, hasInterception: false }
  const r = p.getBoundingClientRect()
  return {
    open: r.width > 0 && r.height > 0,
    options: p.querySelectorAll('[data-style-option]').length,
    hasInterception: !!p.querySelector('[data-style-option="Interception"]'),
  }
})
check(pickerUp.open, 'pressing the note opens the picker')
check(pickerUp.options === 11, 'all eleven canon styles are offered', `${pickerUp.options}`)
check(pickerUp.hasInterception, 'Interception among them')

await page.click('[data-style-option="Interception"]')
await page.waitForTimeout(600)
const after = await page.evaluate(readReactionBand)
const sheetGone = await page.evaluate(
  () => !document.querySelector('[data-fighting-style-picker]'),
)

check(sheetGone, 'the picker closes on the press')
check(after.gapCount === 0, 'the note is GONE — it deletes itself once answered', `${after.gapCount}`)
check(after.rows.length === 5, 'the band is now FIVE rows', `${after.rows.length}`)
check(
  after.rows.some(r => IS_INTERCEPTION.test(r.det) && r.painted),
  'a painted row now triggers on Interception\'s own text',
)
for (const d of trigs(before)) {
  check(trigs(after).includes(d), `"${d.slice(0, 46)}…" is still on the glass`)
}
check(
  new Set(trigs(after)).size === trigs(after).length,
  'and every one of the five triggers is still its own — nothing was duplicated',
)
check(
  after.rows.filter(r => r.name === 'Sentinel').length === 2,
  'both Sentinels survived (one feat, two triggers — compose.ts:483)',
  `${after.rows.filter(r => r.name === 'Sentinel').length}`,
)

/* IT WAS WRITTEN, NOT REMEMBERED. A reload re-reads `codex-character-<id>`
   from scratch; the seed above refuses to overwrite it. If the pick had lived
   in React state this is where it would vanish. */
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(1700)
const reloaded = await page.evaluate(readReactionBand)
check(
  reloaded.rows.some(r => IS_INTERCEPTION.test(r.det) && r.painted),
  'and it SURVIVES a reload — the pick reached his sheet, not a useState',
)
check(reloaded.gapCount === 0, 'the note stays gone after the reload')
await ctx.close()

/* ── THE GATE THAT IS NOT ABOUT HIM ──────────────────────────────────────────
   A prompt that paints for every character is not gated on anything. At level 1
   the Fighting Style row is locked — `build.ts` says so and this reads its
   answer — so the app must paint the band and ask nothing. */
console.log('\nCONTROL — a level-1 clone of his sheet: reached-it gate closed')
const lvl1 = await openOn({ ...SHEET, id: SHEET.id + '-lvl1', level: 1 })
const low = await lvl1.page.evaluate(readReactionBand)
await lvl1.ctx.close()
check(low.found, 'the Reaction band still paints at level 1')
check(low.gapCount === 0, 'and there is no note — the lock closes the question', `${low.gapCount}`)

await browser.close()

check(errors.length === 0, 'no page errors anywhere in the run', errors.join(' | '))
console.log(`\n  ${pass} passed · ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
