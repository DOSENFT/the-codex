/* ===========================================================================
   A REQUIREMENT STOPS LOOKING LIKE A TAG — slice 4 of the Toybox seed.

   Two claims here that the unit tests cannot make. The first is geometric:
   `TacticCard.test.tsx` counts Badge class strings in a markup string, which
   proves the component emits different ELEMENTS — it does not prove those
   elements land on the screen as different-looking rows, because a string in
   the markup can still be zero-height, clipped, or painted under something
   else. The second is about the seeder and the renderer meeting: the pack now
   authors annotations with `{{party}}` tokens in them, and whether the right
   ones survive the trip through `resolveNotes` into a real card is a claim
   about the whole chain.

     painted    Marcus's sheet, with his real party in `backstory.relationships`
                → the card paints the REQ line, the positioning line and the
                  warning line, all three with area and topmost at their centre

     dropped    the SAME sheet with the relationships removed
                → the positioning line, which names {{wizard}} and {{bard}}, is
                  GONE — and the warning line, the REQ line, the steps and the
                  combo itself are all still there.
                  This is the load-bearing/decorative split on the glass. It
                  comes back red against any version that treats an annotation
                  the way it treats a block label, because the whole combo would
                  vanish and `present` would be false.

     untouched  a combo Marcus wrote himself — no requirements, no annotations
                → nothing new appears on it. No REQ, no marker, no empty row.

   Finding Q: claims about the screen are geometric. A string counts as painted
   only when its own element has a box with area and is the topmost thing at
   its own centre. And a BUTTON is not a leaf — it holds an `<svg>` — so
   buttons are read separately. Slice 1 and slice 3 each lost a run to that.

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

/* The shared fixture carries no relationships at all — it is a turn-economy
   fixture and never needed a party. These four are Marcus's, transcribed from
   `codex-nix-lvl7 (2) (1).json` and recorded in `00-status.md`. Scar is here
   ON PURPOSE: he is the reason `party.ts` parses strictly, and a run that
   never includes him never exercises the rule that keeps him out of the line
   of battle. */
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

const POSITIONING = 'Stand so the 10-ft aura covers Rune Willow and Talon'
const WARNING = 'Temporary hit points never stack'
const REQUIREMENTS = 'Hearthfire Manifest · Channel Divinity'

const browser = await chromium.launch()

// ── helpers ──

async function openCombo(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
    .click({ timeout: 15000 })
  await page.waitForTimeout(600)
  // The lines live inside the expanded card, which is how Marcus reaches them.
  const header = page.locator('button[aria-expanded]:has-text("Hearth Wall")').first()
  if (await header.count()) {
    await header.click({ timeout: 5000 })
    await page.waitForTimeout(400)
  }
}

/** Is this string painted? Leaf element, real box, topmost at its own centre.
 *
 *  IT SCROLLS FIRST, AND THAT IS A CORRECTION TO SLICES 1–3. Those provers
 *  swept every leaf once and kept the ones that passed `elementFromPoint`.
 *  That call returns `null` for any point outside the viewport, so the sweep
 *  silently answers "not painted" for everything below the fold — on a 390×844
 *  phone viewport, most of an expanded card. This slice caught it because the
 *  positioning line made the card one row taller and pushed the REQ line off
 *  the bottom, and the run went red on content that was demonstrably on the
 *  screen. The earlier runs were not wrong, they were lucky.
 *
 *  Scrolling does not weaken the claim. Every other condition still holds —
 *  own box, own area, topmost at its own centre — and the negative claims are
 *  unaffected, because text that is in no element at all is found by neither
 *  version. */
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

/** The geometric half of "a requirement no longer looks like a tag": find the
 *  element whose own text is the requirement line, find the one whose text is
 *  a tag, and compare the shapes they are painted in. A pill is fully rounded;
 *  the requirement line is not, and it does not carry a border. */
const shapeOf = (page, text) => page.evaluate(text => {
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    if ((el.textContent ?? '').trim() !== text) continue
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const s = getComputedStyle(el)
    return {
      radius: s.borderTopLeftRadius,
      border: s.borderTopWidth,
      background: s.backgroundColor,
      width: Math.round(r.width),
    }
  }
  return null
}, text)

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

const results = []
const record = (id, what, ok, lines) => results.push({ id, what, ok, lines })

// ── CASE 1: all three rows land, and the requirement is not a pill ──
{
  const { ctx, page } = await newPage(marcus)
  await openCombo(page)

  const has = s => painted(page, s)
  const reqShape = await shapeOf(page, REQUIREMENTS)
  const tagShape = await shapeOf(page, 'hearthfire')

  /* A pill's radius is half its height or more; the requirement line's is 0.
     Comparing the two computed styles is the claim "these do not look alike",
     made against the rendered pixel rather than against a class name. */
  const looksDifferent =
    reqShape !== null && tagShape !== null
    && reqShape.radius !== tagShape.radius
    && parseFloat(reqShape.border) === 0 && parseFloat(tagShape.border) > 0

  const label = await has('REQ')
  const requirement = await has(REQUIREMENTS)
  const positioning = await has(POSITIONING)
  const warning = await has(WARNING)

  const ok = label && requirement && positioning && warning && looksDifferent
  record('painted', 'REQ, positioning and warning all reach the glass', ok, [
    `"REQ" label:        ${label}`,
    `requirement line:   ${requirement}`,
    `positioning line:   ${positioning}`,
    `warning line:       ${warning}`,
    `requirement shape:  ${JSON.stringify(reqShape)}`,
    `tag shape:          ${JSON.stringify(tagShape)}`,
    `they do not look alike: ${looksDifferent}`,
  ])
  await ctx.close()
}

// ── CASE 2: the party line goes, and takes nothing with it ──
{
  const { ctx, page } = await newPage(orphan)
  await openCombo(page)

  const combo = await painted(page, 'Hearth Wall')          // the combo survived
  const steps = await painted(page, 'Manifest the Hearthfire') // its steps survived
  const requirement = await painted(page, REQUIREMENTS)     // its requirements survived
  const warning = await painted(page, WARNING)              // the note with no party token
  const positioning = await painted(page, 'Stand so the')   // the one naming a wizard

  const ok = combo && steps && requirement && warning && !positioning
  record('dropped', 'no party → one line gone, everything else intact', ok, [
    `combo present:      ${combo}`,
    `steps present:      ${steps}`,
    `requirement line:   ${requirement}`,
    `warning line:       ${warning}`,
    `positioning line:   ${positioning}  (must be false)`,
  ])
  await ctx.close()
}

// ── CASE 3: a combo he wrote himself grows nothing ──
{
  const { ctx, page } = await newPage(marcus)
  await page.addInitScript(
    ([id]) => {
      localStorage.setItem('codex-toybox-' + id, JSON.stringify({
        combos: [{
          id: 'mine', name: 'Something I Wrote', blocks: [
            { id: 'mine:1', type: 'action', label: 'Swing twice', source: 'weapon' },
          ],
          tags: ['mine'], favorite: false, createdAt: 1,
        }],
        /* BOTH MARKERS, since round two slice 2 — and marking them is the
           point rather than a workaround. This case asks one question: does a
           combo Marcus wrote himself, with no requirements, grow an empty
           "REQ" row? Seeded content on the same screen is noise in that
           question, and `['hearth-7']` alone stopped keeping it out the moment
           round two shipped an entry this sheet earns. */
        tactics: [], personaPlays: [], seededPacks: ['hearth-7', 'hearth-7-r2'],
      }))
    },
    [ID],
  )
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
    .click({ timeout: 15000 })
  await page.waitForTimeout(600)
  await page.locator('button[aria-expanded]:has-text("Something I Wrote")').first()
    .click({ timeout: 5000 })
  await page.waitForTimeout(400)

  const combo = await painted(page, 'Something I Wrote')
  const step = await painted(page, 'Swing twice')
  const req = await painted(page, 'REQ')

  const ok = combo && step && !req
  record('untouched', 'his own combo grows no empty rows', ok, [
    `his combo present:  ${combo}`,
    `his step present:   ${step}`,
    `"REQ" anywhere:     ${req}  (must be false)`,
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
