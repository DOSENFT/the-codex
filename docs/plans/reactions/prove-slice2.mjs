/* ===========================================================================
   HELD REACTION · SLICE 2 — Sentinel, on the glass.

     npm run build && npx vite preview --port 4321 --host   (in another shell)
     node docs/plans/reactions/prove-slice2.mjs [baseUrl] [shotsDir]

   `feats.test.ts` proves the MODEL: three marketing bullets state no reaction,
   so canon fills the silence and says the words are its own. Slice 2's claim is
   a claim about a SCREEN — "the reactions band goes from 2 rows to 4, and one
   of the new rows fires on a trigger that is nowhere on his sheet".

   THE SEED IS HIS ACTUAL EXPORT, read from disk, and this probe REFUSES rather
   than falling back to `nix.ts` — which carries `feats: []` and therefore cannot
   show this fault at all. That refusal is slice 1's own finding, restated: a
   fixture that models the sheet after the repair cannot show the fault.

   FINDING Q — the claims are geometric. A row counts when its own element has a
   box with area and that box sits inside the band's box. `textContent` reports
   clipped and off-screen text in full, and this app permanently mounts two
   dialogs below the fold that read as visible.

     A   the band paints 4 rows, and its printed count agrees with the list
     B   TWO Sentinel rows, both priced Reaction, on two DIFFERENT triggers
     C   the one that is nowhere on his sheet is on screen in canon's own words,
         whole, with no ellipsis — and his own stored bullets are not
     D   slice 1's two rows are both still there
     E   clean console

   The full A–H prover for this phase is slice 6. This one answers slice 2.
   ========================================================================= */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

let SHEET
try {
  SHEET = JSON.parse(readFileSync(NIX_EXPORT, 'utf8'))
} catch (e) {
  console.error(`Marcus's export is not readable at ${NIX_EXPORT} — ${e.message}`)
  console.error('This probe will not substitute a fixture: the fixture has no feats at all.')
  process.exit(1)
}

/* His OWN stored Sentinel, off his own file. Check C's second half compares the
   screen against THIS rather than against a copy typed in here, so the claim
   "these words are not his" is made about his actual sheet. */
const HIS_SENTINEL = (SHEET.feats ?? []).find(f => /^sentinel$/i.test((f.name ?? '').trim()))
if (!HIS_SENTINEL) {
  console.error('His export no longer carries a feat named Sentinel. Slice 2 is void.')
  process.exit(1)
}
const HIS_BULLETS = (HIS_SENTINEL.effects ?? []).map(s => String(s))

/* Canon's own file. A probe carrying its own typed copy of the sentence would
   prove that two copies of a string match, which is not the claim. */
let CANON_SENTENCE = null
try {
  const feats = JSON.parse(
    readFileSync(new URL('../../../src/canon/feats.json', import.meta.url), 'utf8'),
  )
  const flat = []
  const walk = v => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v.name === 'string' && Array.isArray(v.effects)) flat.push(v)
      Object.values(v).forEach(walk)
    }
  }
  walk(feats)
  const sentinel = flat.find(f => f.name === 'Sentinel')
  CANON_SENTENCE =
    (sentinel?.effects ?? []).find(s => /attacks a target other than you/i.test(s)) ?? null
} catch (e) {
  console.error(`canon's feats file is not readable — ${e.message}`)
  process.exit(1)
}
if (!CANON_SENTENCE) {
  console.error("canon no longer states Sentinel's attack rider. Check C is void.")
  process.exit(1)
}

/* THE PREMISE, ASSERTED BEFORE THE BROWSER OPENS. If his sheet ever starts
   carrying this rule itself, slice 2 is proving something that no longer needs
   proving, and this probe should say so rather than pass. */
if (HIS_BULLETS.join(' ').toLowerCase().includes('other than you')) {
  console.error('His sheet now states the attack rider itself. Slice 2 has nothing to fill.')
  process.exit(1)
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try {
      return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)
    } catch {
      return []
    }
  })(),
]
let chromium
try {
  const mod = await import(pathToFileURL(req.resolve('playwright', { paths: searchPaths })).href)
  chromium = mod.chromium ?? mod.default?.chromium
  if (!chromium) throw new Error('resolved playwright but found no chromium export')
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium')
  process.exit(1)
}

const BASE = (process.argv[2] || 'http://[::1]:4321/the-codex/').replace(/\/?$/, '/')
const OUT = process.argv[3] || 'docs/plans/reactions/_shots'
mkdirSync(OUT, { recursive: true })

/* Round 3, and NOT his turn — the window in which a reaction is the only thing
   he owns, which is the window a reactions band is read in. */
const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
})

const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  reducedMotion: 'reduce',
})

await ctx.addInitScript(
  ([id, sheetJson, combatJson]) => {
    localStorage.setItem('codex-character-' + id, sheetJson)
    localStorage.setItem('codex-active-id', id)
    if (!localStorage.getItem('codex-combat-' + id)) {
      localStorage.setItem('codex-combat-' + id, combatJson)
    }
    const s = JSON.parse(sheetJson)
    localStorage.setItem(
      'codex-roster',
      JSON.stringify([
        {
          id,
          name: s.name,
          class: s.class,
          subclass: s.subclass,
          level: s.level,
          updatedAt: '2026-08-30T00:00:00.000Z',
        },
      ]),
    )
  },
  [SHEET.id, JSON.stringify(SHEET), IN_COMBAT],
)

const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + String(e)))
page.on('console', m => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})
await page.goto(BASE, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1500)

const readBand = () =>
  page.evaluate(() => {
    const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
    const band = document.querySelector('section[aria-label="Your reactions"]')
    if (!band) return { band: null }
    const bandBox = band.getBoundingClientRect()
    const toggle = band.querySelector('button[aria-expanded]')
    const rows = [...band.querySelectorAll('li')].map(li => {
      const btn = li.querySelector('button[aria-label$="— details"]')
      const host = btn ?? li.firstElementChild ?? li
      const r = host.getBoundingClientRect()
      return {
        name:
          (btn?.getAttribute('aria-label') || '').replace(/ — details$/, '') ||
          txt(host.querySelector('span')),
        cost: txt(host.querySelector('.font-mono')),
        /* Collected per-<p> and joined with a real space downstream. Reading the
           host's whole textContent would run the last word of one paragraph into
           the first word of the next, and then a containment check would fail —
           or pass — for a reason that is about the DOM rather than about the
           words. */
        paras: [...host.querySelectorAll('p')].map(txt),
        painted: r.width > 0 && r.height > 0,
        insideBand: r.top >= bandBox.top - 1 && r.bottom <= bandBox.bottom + 1,
      }
    })
    return {
      band: txt(band),
      expanded: toggle?.getAttribute('aria-expanded') ?? null,
      countLabel: txt(toggle).replace(/^Your reactions\s*/, ''),
      rows,
    }
  })

let band = await readBand()
if (band.band && band.expanded === 'false') {
  await page.click('section[aria-label="Your reactions"] button[aria-expanded]')
  await page.waitForTimeout(400)
  band = await readBand()
}

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`)
}

if (!band.band) {
  console.error('The reactions band did not render. Nothing below can be measured.')
  await ctx.close()
  await browser.close()
  process.exit(1)
}

await page.evaluate(() => {
  document.querySelector('section[aria-label="Your reactions"]')?.scrollIntoView({ block: 'start' })
})
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/slice2-band.png`, fullPage: false })

console.log('\n=== the band, as painted ===\n')
for (const r of band.rows) {
  console.log(`  · ${r.name}  [${r.cost}]  painted=${r.painted} inside=${r.insideBand}`)
  for (const p of r.paras) console.log(`      ${p}`)
}
console.log('')

const painted = band.rows.filter(r => r.painted && r.insideBand)

check(
  'A · the band paints 4 rows, and its count agrees with its list',
  painted.length === band.rows.length &&
    band.rows.length === 4 &&
    band.countLabel.startsWith('4'),
  `${painted.length} painted of ${band.rows.length} rows; the heading prints "${band.countLabel}"`,
)

/* Selected by the heading PREFIX, because slice 10e's disambiguator renames two
   rows that would otherwise both read «Sentinel» — using each row's own trigger
   words. Matching the exact string «Sentinel» would find neither and this check
   would pass by finding nothing. */
const sentinels = painted.filter(r => /^Sentinel\b/i.test(r.name))
check(
  'B · TWO Sentinel rows, both Reactions, on two different triggers',
  sentinels.length === 2 &&
    sentinels.every(r => /reaction/i.test(r.cost)) &&
    new Set(sentinels.map(r => r.paras[0])).size === 2,
  sentinels.map(r => `"${r.name}" [${r.cost}] → ${r.paras[0] ?? '(no when line)'}`).join('\n      ') ||
    'no Sentinel row in the band',
)

/* Commas are stripped from BOTH sides and nothing else is. The one edit this
   pipeline is allowed to make to canon's sentence is cutting it at its own
   comma — `splitTrigger` hands the trigger to the WHEN line and the remainder
   to the body — so normalising that single comma away is what lets the check
   assert every other word survives, in order, unabridged. Case is folded for
   the reason slice 1 recorded: `ReactionRow` lifts the clause's lead word into a
   small-caps label, a typographic choice this slice does not get to re-litigate. */
const flatten = s => s.replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const rider = sentinels.find(r => /other than you/i.test(r.paras.join(' ')))
const riderText = rider ? flatten(rider.paras.join(' ')) : ''
check(
  "C · the rule that is nowhere on his sheet is on screen, in canon's words, whole",
  Boolean(rider) &&
    riderText.includes(flatten(CANON_SENTENCE)) &&
    !/…|\.\.\./.test(rider.paras.join(' ')) &&
    !HIS_BULLETS.some(b => riderText.includes(flatten(b))),
  rider
    ? `on screen: "${rider.paras.join(' ')}"\n      ←→ canon:  "${CANON_SENTENCE}"\n      his own stored bullets, none of which is on this row: ${HIS_BULLETS.length}`
    : "canon's attack rider is not on any Sentinel row",
)

check(
  'D · slice 1 still holds — the cloak and the Opportunity Attack are both there',
  painted.some(r => /Hearthfire Manifest/i.test(r.name)) &&
    painted.some(r => /Opportunity Attack/i.test(r.name)),
  painted.map(r => r.name).join(' | '),
)

check('E · clean console', errors.length === 0, errors.join(' ; ') || 'no page errors')

console.log(`\nshot: ${OUT}/slice2-band.png`)
const failed = results.filter(r => !r.pass)
console.log(
  `\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED: ${failed.map(f => f.name).join(', ')}`}\n`,
)

await ctx.close()
await browser.close()
process.exit(failed.length === 0 ? 0 : 1)
