/* ===========================================================================
   THE CONTENT AT FULL SIZE, ON THE GLASS — slice 6 of the Toybox seed.

   Slice 5 proved three combos paint. Slice 6 wrote eleven more, and every
   claim that grew with them is a claim the unit tests structurally cannot
   make. `pack-hearth-7.test.ts` resolves fourteen objects in memory and
   asserts what is in them. It cannot see whether the Combos tab RENDERS
   fourteen — a list that capped at ten, virtualised, or silently dropped the
   tail would leave every unit test green and four cards unreachable. Nor can
   it see whether the five category chips actually partition them; at three
   combos the filter was decoration, and at fourteen it is the only way he
   finds a card at the table.

     all-fourteen  Combos tab, Marcus's sheet
                   → every one of the fourteen names painted, by name. Not a
                     count: a count would pass if one card rendered twice.

     filters       the five category chips, one at a time
                   → for each chip, a card that belongs to it paints AND a
                     card that does not is gone. Half of that claim is the
                     important half — a filter that shows everything passes
                     "the member is visible" and fails "the stranger is not".
                     Then "All" restores the full fourteen.

     new-card      "The Cone at the Door" — a slice-6 card, opened
                   → its spell constants paint (15-foot cone, 3d6 fire), the
                     save DC is resolved to HIS 14 rather than a token or the
                     doctrine's Charisma-18 figure, the fire-resistance warning
                     paints, and the REQ line is there to read backwards into
                     tomorrow's prepared seven.

     orphan-new    the same sheet with `backstory.relationships` emptied
                   → "Damage Relocation" — a slice-6 card whose party note
                     names the wizard — still paints, its other three notes
                     still paint, and no party member is named. Slice 5 proved
                     this rule on slice-5 content; this proves the eleven new
                     cards obey it too, which is the single easiest thing to
                     get wrong when writing eleven cards in a row.

   Finding Q still governs: a string counts as painted only when its own leaf
   element has a box with area and is topmost at its own centre, and the leaf
   is scrolled into view first because `elementFromPoint` returns null below
   the fold. See the helper's comment in `prove-slice4.mjs`.

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

/* All fourteen, in the order `hearth-7.combos.ts` declares them. The three
   from slice 5 are first; the eleven slice 6 added follow. Typed out rather
   than imported, deliberately — importing the pack would let a rename pass
   unnoticed on both sides at once. */
const COMBOS = [
  'Hearth Wall',
  'One Slot, Spent Right',
  'Faerie Fire Opening',
  'The Cone at the Door',
  'Nothing In Reach',
  'Make It About You',
  'Bless Before the Door',
  'The Slot That Lasts a Minute',
  'Wearing the Attention',
  'Damage Relocation',
  'The Smites That Aren’t Damage',
  'Pick Them Up',
  'The Bonus-Action Rescue',
  'Before the Door Opens',
]

/* One member and one stranger per chip. The stranger is what makes the case
   worth running: "the member is visible" is also true of a filter that does
   nothing at all. */
const FILTERS = [
  { chip: 'Burst', member: 'Nothing In Reach', stranger: 'Hearth Wall' },
  { chip: 'Sustained', member: 'Bless Before the Door', stranger: 'Hearth Wall' },
  { chip: 'Defensive', member: 'Hearth Wall', stranger: 'Bless Before the Door' },
  { chip: 'AoE', member: 'The Cone at the Door', stranger: 'Pick Them Up' },
  { chip: 'Utility', member: 'Pick Them Up', stranger: 'Hearth Wall' },
]

const browser = await chromium.launch()

// ── helpers (identical to prove-slice5.mjs; see its comments) ──

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

/** The filter chips, matched EXACTLY and SCOPED TO THEIR OWN ROW.
 *
 *  Both halves were learned the hard way on the first run. `has-text("Burst")`
 *  is a substring match and would click a card whose body mentions burst
 *  damage. And an exact match on its own is not enough either: "All" is a
 *  label the app uses in more than one place, and the first one in the DOM is
 *  a chip on a scroll row underneath the open Toybox sheet — Playwright found
 *  it, could not scroll it into view behind the sheet, and timed out. So the
 *  row itself is identified first, by the one chip label nothing else in the
 *  app uses. */
const chipRow = page =>
  page.locator('div.flex.flex-wrap')
    .filter({ has: page.getByRole('button', { name: 'AoE', exact: true }) })
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

// ── CASE 1: all fourteen reach the tab ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)

  const names = {}
  for (const n of COMBOS) names[n] = await painted(page, n)

  const missing = Object.entries(names).filter(([, v]) => !v).map(([k]) => k)
  record('all-fourteen', 'every combo slice 6 wrote is on the Combos tab', missing.length === 0, [
    ...COMBOS.map(n => `${n.padEnd(30)} ${names[n]}`),
    `missing: ${missing.length ? missing.join(', ') : 'none'}`,
  ])
  await ctx.close()
}

// ── CASE 2: the five chips actually partition them ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)

  const lines = []
  let ok = true
  for (const f of FILTERS) {
    await chip(page, f.chip)
    const member = await painted(page, f.member)
    const stranger = await painted(page, f.stranger)
    if (!member || stranger) ok = false
    lines.push(`${f.chip.padEnd(10)} keeps ${f.member.padEnd(24)} ${member}`)
    lines.push(`${''.padEnd(10)} drops ${f.stranger.padEnd(24)} ${!stranger}`)
  }

  await chip(page, 'All')
  const restored = {}
  for (const n of COMBOS) restored[n] = await painted(page, n)
  const allBack = Object.values(restored).every(Boolean)
  if (!allBack) ok = false
  lines.push(`"All" restores all fourteen: ${allBack}`)

  record('filters', 'each category chip keeps its own and hides the rest', ok, lines)
  await ctx.close()
}

// ── CASE 3: a slice-6 card opens, and its numbers are HIS ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await expand(page, 'The Cone at the Door')

  const cone = await painted(page, '15-foot cone from your own hands')
  const dice = await painted(page, '3d6 fire')
  /* Charisma 16 at level 7: 8 + proficiency 3 + Charisma 3 = 14. The token is
     the point — `WARFARE-DOCTRINE.md` is written against Charisma 18 and says
     15 everywhere, so a card that quoted the doctrine literally would paint a
     number that is wrong for him by one and unfalsifiable at the table. */
  const dc = await painted(page, 'DC 14')
  const wrongDc = await painted(page, 'DC 15')
  const warning = await painted(page, 'Fire is the most commonly resisted damage type')
  const req = await painted(page, 'Three or more of them within 15 feet of you, in one arc')
  const marker = await painted(page, 'REQ')

  const ok = cone && dice && dc && !wrongDc && warning && req && marker
  record('new-card', 'a slice-6 card opens fully and states his own save DC', ok, [
    `"15-foot cone from your own hands":  ${cone}`,
    `"3d6 fire":                          ${dice}`,
    `"DC 14" (his):                       ${dc}`,
    `"DC 15" (the doctrine's):            ${wrongDc}  (must be false)`,
    `fire-resistance warning:             ${warning}`,
    `requirement line:                    ${req}`,
    `"REQ" marker:                        ${marker}`,
  ])
  await ctx.close()
}

// ── CASE 4: no party → the eleven new cards obey the same rule ──
{
  const { ctx, page } = await newPage(orphan)
  await openToybox(page)

  const present = {}
  for (const n of COMBOS) present[n] = await painted(page, n)
  const allPresent = Object.values(present).every(Boolean)

  /* "Damage Relocation" is the sharpest card for this: four annotations, of
     which exactly one names the wizard. Three must survive it. */
  await expand(page, 'Damage Relocation')
  const ruling = await painted(page, 'The stack worth confirming with your DM')
  const concentration = await painted(page, 'You now take damage on other people’s turns')
  const unconscious = await painted(page, 'The bond does not care that you are unconscious')
  const partyLine = await painted(page, 'Lowest hit points, highest value')
  const named = await painted(page, 'Rune Willow')

  const ok = allPresent && ruling && concentration && unconscious && !partyLine && !named
  record('orphan-new', 'fourteen keep, and only the party note goes', ok, [
    `all fourteen painted: ${allPresent}`,
    ...Object.entries(present).filter(([, v]) => !v).map(([k]) => `   MISSING: ${k}`),
    `DM-ruling note:       ${ruling}`,
    `Concentration note:   ${concentration}`,
    `unconscious note:     ${unconscious}`,
    `party note:           ${partyLine}  (must be false)`,
    `"Rune Willow":        ${named}  (must be false)`,
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
