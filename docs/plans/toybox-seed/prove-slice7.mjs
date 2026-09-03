/* ===========================================================================
   THE TACTICS TAB AT FULL SIZE, ON THE GLASS — slice 7 of the Toybox seed.

   Slice 6 did this for the Combos tab and found two things the unit tests
   structurally could not: whether a list of fourteen actually RENDERS
   fourteen, and whether the category chips partition them or merely decorate
   the top of the tab. The tactics tab now has twelve entries and five chips of
   its own, and neither claim has ever been checked on the other tab.

     all-twelve   Tactics tab, Marcus's sheet
                  → every one of the twelve names painted, by name. Not a
                    count: a count would pass if one card rendered twice.

     filters      the five tactic chips, one at a time
                  → for each chip, a card that belongs to it paints AND a card
                    that does not is gone. The second half is the half that
                    matters — a filter that shows everything passes "the member
                    is visible". Then "All" restores the full twelve.

     new-cards    two slice-7 cards, opened
                  → "Concentration Is the Career Choice" states HIS aura, "+3
                    on every Constitution save", with "+4" nowhere on screen —
                    the same token claim slice 6 made about the save DC, now
                    made on tactic content, which resolves through a different
                    function (`resolveTactic`, not `resolveCombo`).
                  → "The Death Protocol" pays off slice 6's disclosure on the
                    glass: Gentle Repose is one of ten spells the combo cards
                    deferred to this tab, and here it is, in a step, with a REQ
                    line under it.

     orphan-new   the same sheet with `backstory.relationships` emptied
                  → all twelve still paint, the Death Protocol's two warnings
                    still paint, and its party note — the one that names all
                    four of them — is gone with no party member named. Slice 5
                    proved this rule on three tactics; nine more were written
                    in one sitting, and party notes are the easiest thing to
                    get wrong nine times in a row.

   WHAT IS DELIBERATELY NOT HERE: the three tactics that name the weapon and
   are therefore dropped for a character carrying only a bow. That is asserted
   by name in `seed.test.ts`, where it is cheap and exact; a browser case would
   only be able to say "nine things painted".

   Finding Q still governs: a string counts as painted only when its own leaf
   element has a box with area and is topmost at its own centre, and the leaf is
   scrolled into view first because `elementFromPoint` returns null below the
   fold. See the helper's comment in `prove-slice4.mjs`.

   NOTHING IS SPENT. No AI config is seeded, so no request to any model host is
   made; this feature does not touch that path.
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

const RELATIONSHIPS = [
  { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet, inquisitive.', status: 'alive' },
  { name: 'Ponzi', relation: 'Party member (Rogue) — observant, reserved.', status: 'alive' },
  { name: 'Ketza', relation: 'Party member (Ranger) — young wood elf.', status: 'alive' },
  { name: 'Talon', relation: 'Party member (Bard) — rock gnome tinker.', status: 'alive' },
  { name: 'Scar', relation: 'Goliath. Partner, moral compass. Only person besides the party who knows Nix is a changeling.', status: 'alive' },
]

const sheet = (relationships) => ({
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, CHA: 16 },
  backstory: {
    origin: '', keyMemories: [], unresolvedThreads: [], personalitySeeds: [],
    relationships,
  },
})

const marcus = sheet(RELATIONSHIPS)
const orphan = sheet([])
const ID = marcus.id

/* All twelve, in the order `hearth-7.tactics.ts` declares them. The three from
   slice 5 are first; the nine slice 7 added follow. Typed out rather than
   imported, deliberately — importing the pack would let a rename pass
   unnoticed on both sides at once. */
const TACTICS = [
  'The Reaction Is Only One',
  'Stand Where the Aura Pays',
  'Preparing for Tomorrow',
  'The Ten Feet You Threaten',
  'Concentration Is the Career Choice',
  'The Death Protocol',
  'Spend the Luck, You Are Hoarding It',
  'When Fire Does Nothing',
  'The Mastery You Have Is Not the One You Were Told',
  'Ride the Aura',
  'The Spells That Are Not Turns',
  'Buy These Before the Next Fight',
]

/* One member and one stranger per chip, chosen so that no member's name is a
   substring of any stranger's — `painted` matches on `includes`. */
const FILTERS = [
  { chip: 'Core', member: 'Preparing for Tomorrow', stranger: 'The Death Protocol' },
  { chip: 'Survival', member: 'The Death Protocol', stranger: 'Preparing for Tomorrow' },
  { chip: 'Burst', member: 'When Fire Does Nothing', stranger: 'Ride the Aura' },
  { chip: 'Control', member: 'The Ten Feet You Threaten', stranger: 'Ride the Aura' },
  { chip: 'Support', member: 'Ride the Aura', stranger: 'The Death Protocol' },
]

const browser = await chromium.launch()

// ── helpers (identical to prove-slice6.mjs; see its comments) ──

const painted = (page, needle) => page.evaluate(needle => {
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    if (!(el.textContent ?? '').trim().includes(needle)) continue
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue
    return true
  }
  return false
}, needle)

async function newPage(character) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.addInitScript(
    ([json, id]) => {
      localStorage.setItem('codex-character-' + id, json)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
    },
    [JSON.stringify(character), ID],
  )
  return { ctx, page }
}

async function openToybox(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
    .click({ timeout: 15000 })
  await page.waitForTimeout(600)
}

const tab = async (page, label) => {
  await page.locator(`button:has-text("${label}")`).first().click({ timeout: 10000 })
  await page.waitForTimeout(400)
}

/** The tactic filter chips, matched EXACTLY and SCOPED TO THEIR OWN ROW — the
 *  trap slice 6 hit and wrote down. An exact accessible-name match is not a
 *  unique one: "All" is a label this app uses in more than one place, and the
 *  first in the DOM was a chip on a scroll row underneath the open sheet,
 *  which Playwright could find and could not scroll into view. So the row is
 *  identified first, here by "Survival" — a chip label the combos row does not
 *  have, which also guarantees this is the TACTICS row and not the other one. */
const chipRow = page =>
  page.locator('div.flex.flex-wrap')
    .filter({ has: page.getByRole('button', { name: 'Survival', exact: true }) })
    .first()

const chip = async (page, label) => {
  await chipRow(page).getByRole('button', { name: label, exact: true })
    .click({ timeout: 10000 })
  await page.waitForTimeout(350)
}

const expand = async (page, name) => {
  await page.locator(`button[aria-expanded]:has-text("${name}")`).first()
    .click({ timeout: 10000 })
  await page.waitForTimeout(400)
}

const results = []
const record = (id, what, ok, lines) => results.push({ id, what, ok, lines })

// ── CASE 1: all twelve reach the tab ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Tactics')

  const names = {}
  for (const n of TACTICS) names[n] = await painted(page, n)

  const missing = Object.entries(names).filter(([, v]) => !v).map(([k]) => k)
  record('all-twelve', 'every tactic slice 7 wrote is on the Tactics tab', missing.length === 0, [
    ...TACTICS.map(n => `${n.padEnd(50)} ${names[n]}`),
    `missing: ${missing.length ? missing.join(', ') : 'none'}`,
  ])
  await ctx.close()
}

// ── CASE 2: the five chips actually partition them ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Tactics')

  const lines = []
  let ok = true
  for (const f of FILTERS) {
    await chip(page, f.chip)
    const member = await painted(page, f.member)
    const stranger = await painted(page, f.stranger)
    if (!member || stranger) ok = false
    lines.push(`${f.chip.padEnd(10)} keeps ${f.member.padEnd(34)} ${member}`)
    lines.push(`${''.padEnd(10)} drops ${f.stranger.padEnd(34)} ${!stranger}`)
  }

  await chip(page, 'All')
  const restored = {}
  for (const n of TACTICS) restored[n] = await painted(page, n)
  const allBack = Object.values(restored).every(Boolean)
  if (!allBack) ok = false
  lines.push(`"All" restores all twelve: ${allBack}`)

  record('filters', 'each tactic chip keeps its own and hides the rest', ok, lines)
  await ctx.close()
}

// ── CASE 3: two slice-7 cards open, and the numbers on them are HIS ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Tactics')

  await expand(page, 'Concentration Is the Career Choice')
  /* Charisma 16 → Aura of Protection is +3, and it applies to the Constitution
     save that holds a Concentration spell. `WARFARE-DOCTRINE.md` is written
     against Charisma 18 and says +4 everywhere, so a card that quoted the
     doctrine literally would paint a number wrong for him by one — and wrong
     in a way he would never catch, because it is the kind of number nobody
     re-derives at the table. */
  const aura = await painted(page, '+3 on every Constitution save')
  const wrongAura = await painted(page, '+4 on every Constitution save')
  const conRule = await painted(page, 'DC 10, or half the damage taken')

  await expand(page, 'The Death Protocol')
  /* THE SLICE-6 DISCLOSURE, PAID OFF WHERE HE CAN SEE IT. Gentle Repose is one
     of the ten spells that make no turn, so no combo card covers it; the unit
     test asserts the string exists in a resolved object, and this asserts it
     reaches the glass with its REQ line under it. */
  const repose = await painted(page, 'put Gentle Repose on the body, cast as a')
  const clock = await painted(page, 'does not count against the clock on raising')
  const reqLine = await painted(page, 'Lay on Hands with points left in the pool')
  const marker = await painted(page, 'REQ')

  const ok = aura && !wrongAura && conRule && repose && clock && reqLine && marker
  record('new-cards', 'a slice-7 tactic states his own aura, and covers a deferred spell', ok, [
    `"+3 on every Constitution save" (his):        ${aura}`,
    `"+4 on every Constitution save" (doctrine's): ${wrongAura}  (must be false)`,
    `the DC-10-or-half rule:                       ${conRule}`,
    `Gentle Repose, in a step:                     ${repose}`,
    `the clock it pauses:                          ${clock}`,
    `requirement line:                             ${reqLine}`,
    `"REQ" marker:                                 ${marker}`,
  ])
  await ctx.close()
}

// ── CASE 4: no party → the nine new cards obey the same rule ──
{
  const { ctx, page } = await newPage(orphan)
  await openToybox(page)
  await tab(page, 'Tactics')

  const present = {}
  for (const n of TACTICS) present[n] = await painted(page, n)
  const allPresent = Object.values(present).every(Boolean)

  /* "The Death Protocol" is the sharpest card for this: three annotations, of
     which exactly one names all four party members. Two must survive it. */
  await expand(page, 'The Death Protocol')
  const aidWarning = await painted(page, 'Aid takes its 5 points of maximum back')
  const ritualWarning = await painted(page, 'Gentle Repose has to be PREPARED')
  const partyLine = await painted(page, 'relying on your Bonus Action for this')
  const named = {}
  for (const n of ['Rune Willow', 'Ponzi', 'Ketza', 'Talon']) {
    named[n] = await painted(page, n)
  }
  const anyNamed = Object.values(named).some(Boolean)

  const ok = allPresent && aidWarning && ritualWarning && !partyLine && !anyNamed
  record('orphan-new', 'twelve keep, and only the party note goes', ok, [
    `all twelve painted:   ${allPresent}`,
    ...Object.entries(present).filter(([, v]) => !v).map(([k]) => `   MISSING: ${k}`),
    `Aid warning:          ${aidWarning}`,
    `Ritual warning:       ${ritualWarning}`,
    `party note:           ${partyLine}  (must be false)`,
    ...Object.entries(named).map(([k, v]) => `${k.padEnd(21)} ${v}  (must be false)`),
  ])
  await ctx.close()
}

await browser.close()

for (const r of results) {
  console.log(`\n── ${r.id} — ${r.what}`)
  for (const line of r.lines) console.log(`   ${line}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length ? `FAIL — ${failed.map(r => r.id).join(', ')}` : `PASS — all ${results.length} cases`}`)
process.exit(failed.length ? 1 : 0)
