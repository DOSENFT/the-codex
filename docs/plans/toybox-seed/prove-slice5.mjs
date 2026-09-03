/* ===========================================================================
   THE CHECKPOINT, ON THE GLASS — slice 5 of the Toybox seed.

   Slices 1–4 proved the machinery with one combo. This proves the CONTENT:
   seven authored entries across three tabs, resolved against Marcus's own
   sheet, painted where he will actually read them.

   `pack-hearth-7.test.ts` already asserts every one of these entries survives
   `resolveCombo`/`resolveTactic`/`resolvePersonaPlay`. That is a claim about
   an object in memory. It says nothing about whether the Tactics tab renders
   what the seeder put in it, whether a 40-character badge squeezes a card's
   name off the row, or whether a key phrase gets quoted twice. Those are the
   four cases below.

     combos     Combos tab, Marcus's sheet
                → all three combo names painted; the burst combo expands and
                  shows its spell constant, its second block label and its REQ

     tactics    Tactics tab
                → all three tactic names painted; "Stand Where the Aura Pays"
                  expands and states HIS numbers — "10-foot radius" and "+3 to
                  every saving throw" — with +4 nowhere on the screen.
                  Also RECORDS, rather than asserts, the two priority badges:
                  see the note on case `tactics` below.

     persona    Persona tab
                → the play paints, its skill badge paints beside a name that is
                  NOT squeezed to nothing, and the key phrase is quoted exactly
                  once. That last one is a defect this slice fixed: the card
                  wraps every phrase in curly quotes itself, so a phrase that
                  carried its own would have painted as ““like this””.

     orphan     the same sheet with `backstory.relationships` emptied
                → all seven entries still paint on all three tabs, and no party
                  member is named anywhere. The load-bearing/decorative split,
                  now across the whole pack rather than one combo.

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

/* Marcus's four, transcribed from `codex-nix-lvl7 (2) (1).json`. Scar is here
   ON PURPOSE — his relation contains the word "party" and he is not a party
   member, so a run without him never exercises the rule that keeps him out of
   the line of battle. */
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

const COMBOS = ['Hearth Wall', 'One Slot, Spent Right', 'Faerie Fire Opening']
const TACTICS = [
  'The Reaction Is Only One',
  'Stand Where the Aura Pays',
  'Preparing for Tomorrow',
]
const PLAY = 'The Paladin Who Asks First'

const browser = await chromium.launch()

// ── helpers ──

/** Is this string painted? Leaf element, real box, topmost at its own centre.
 *  Scrolls first — see the long note on the same helper in `prove-slice4.mjs`;
 *  `document.elementFromPoint` answers null for anything below the fold, which
 *  on a 390×844 phone is most of an expanded card. */
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

/** The painted box and text of the first leaf containing a string. Used where
 *  the claim is about SIZE — a name squeezed to nothing still "contains" its
 *  text, and would pass `painted` while being unreadable. */
const boxOf = (page, needle) => page.evaluate(needle => {
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    if (!(el.textContent ?? '').trim().includes(needle)) continue
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    return {
      text: (el.textContent ?? '').trim(),
      width: Math.round(r.width),
      height: Math.round(r.height),
      colour: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
    }
  }
  return null
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

const expand = async (page, name) => {
  await page.locator(`button[aria-expanded]:has-text("${name}")`).first()
    .click({ timeout: 10000 })
  await page.waitForTimeout(400)
}

const results = []
const record = (id, what, ok, lines) => results.push({ id, what, ok, lines })

// ── CASE 1: the Combos tab carries all three, and one of them opens ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)

  const names = {}
  for (const n of COMBOS) names[n] = await painted(page, n)

  await expand(page, 'One Slot, Spent Right')
  const constant = await painted(page, '3d8 radiant')
  const block = await painted(page, 'Divine Smite — 2nd-level slot')
  const req = await painted(page, 'A spell slot you have not already spent this turn')
  const label = await painted(page, 'REQ')

  const ok = Object.values(names).every(Boolean) && constant && block && req && label
  record('combos', 'three combos on the Combos tab, and one opens fully', ok, [
    ...COMBOS.map(n => `${n.padEnd(24)} ${names[n]}`),
    `spell constant "3d8 radiant":  ${constant}`,
    `second block label:            ${block}`,
    `requirement line:              ${req}`,
    `"REQ" marker:                  ${label}`,
  ])
  await ctx.close()
}

// ── CASE 2: the Tactics tab, and the numbers on it are HIS ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Tactics')

  const names = {}
  for (const n of TACTICS) names[n] = await painted(page, n)

  /* RECORDED, NOT ASSERTED — and this is the finding of the case. Slice 5
     demoted "Preparing for Tomorrow" from critical to high so the badge would
     mean something. The LABELS do differ. The COLOURS do not: `TacticCard.tsx`
     maps both `critical` and `high` to the `ember` Badge variant, so the
     distinction Marcus sees is three letters of text and nothing else. That
     is real, it is not what the demotion was for, and it is written into
     `00-status.md` rather than quietly fixed inside a content slice. */
  const criticalBadge = await boxOf(page, 'CRITICAL')
  const highBadge = await boxOf(page, 'HIGH')
  const bothBadges = criticalBadge !== null && highBadge !== null
  const sameColour = bothBadges && criticalBadge.background === highBadge.background

  await expand(page, 'Stand Where the Aura Pays')
  const radius = await painted(page, '10-foot radius')
  const bonus = await painted(page, '+3 to every saving throw')
  const theirs = await painted(page, '+4 to every saving throw')

  const ok = Object.values(names).every(Boolean) && bothBadges && radius && bonus && !theirs
  record('tactics', 'three tactics, stating his numbers and nobody else’s', ok, [
    ...TACTICS.map(n => `${n.padEnd(26)} ${names[n]}`),
    `CRITICAL badge:  ${JSON.stringify(criticalBadge)}`,
    `HIGH badge:      ${JSON.stringify(highBadge)}`,
    `→ same colour:   ${sameColour}   (known; recorded in 00-status.md)`,
    `"10-foot radius":            ${radius}`,
    `"+3 to every saving throw":  ${bonus}`,
    `"+4 to every saving throw":  ${theirs}  (must be false)`,
  ])
  await ctx.close()
}

// ── CASE 3: the Persona tab — badge fits, phrase is quoted once ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Persona')

  const play = await boxOf(page, PLAY)
  const badge = await boxOf(page, 'Persuasion')

  await expand(page, PLAY)
  const phrase = await boxOf(page, 'Tell me what you need kept out')

  /* The name must still be READABLE beside the badge, not merely present.
     `truncate` keeps the full text in `textContent` however narrow the box
     gets, so `painted` alone cannot see this squeeze — the width can. */
  const nameHasRoom = play !== null && play.width >= 120
  /* Quoted once. `PersonaPlayCard` adds &ldquo;…&rdquo; itself; a phrase that
     carried its own quotes would open with two of them. */
  const quotedOnce = phrase !== null && /^[“"][^“"]/.test(phrase.text)

  const ok = play !== null && badge !== null && nameHasRoom && phrase !== null && quotedOnce
  record('persona', 'the play paints, the badge leaves room, the phrase is quoted once', ok, [
    `play name box:   ${JSON.stringify(play)}`,
    `skill badge box: ${JSON.stringify(badge)}`,
    `name has room (≥120px):  ${nameHasRoom}`,
    `phrase:          ${JSON.stringify(phrase)}`,
    `quoted exactly once:     ${quotedOnce}`,
  ])
  await ctx.close()
}

// ── CASE 4: no party → the whole pack survives, the call-outs do not ──
{
  const { ctx, page } = await newPage(orphan)
  await openToybox(page)

  const present = {}
  for (const n of COMBOS) present[n] = await painted(page, n)
  await tab(page, 'Tactics')
  for (const n of TACTICS) present[n] = await painted(page, n)
  await tab(page, 'Persona')
  present[PLAY] = await painted(page, PLAY)

  /* The lines that sit beside the dropped ones, one per tab, so "survives"
     means the expanded body survived and not just the header row. */
  await expand(page, PLAY)
  const personaWarning = await painted(page, 'Nothing here spends the changeling')
  await tab(page, 'Tactics')
  await expand(page, 'Preparing for Tomorrow')
  const tacticWarning = await painted(page, 'One swap per long rest')
  const partyLine = await painted(page, 'On a long day the healing comes from you')
  /* Each name is looked for WITH THE CARD THAT WOULD HAVE NAMED HIM OPEN.
     Only one card expands at a time, so checking all four against whatever
     happened to be on screen would pass against a card that never rendered —
     the weakest possible version of this claim. */
  const named = {}
  await tab(page, 'Combos')
  await expand(page, 'Faerie Fire Opening')     // its party note names rogue + ranger
  const comboWarning = await painted(page, 'Faerie Fire is Concentration')
  named['Ponzi'] = await painted(page, 'Ponzi')
  named['Ketza'] = await painted(page, 'Ketza')

  await expand(page, 'Hearth Wall')             // its positioning note names wizard + bard
  const hearthWarning = await painted(page, 'Temporary hit points never stack')
  named['Rune Willow'] = await painted(page, 'Rune Willow')
  named['Talon'] = await painted(page, 'Talon')

  const ok = Object.values(present).every(Boolean)
    && personaWarning && tacticWarning && comboWarning && hearthWarning
    && !partyLine
    && !Object.values(named).some(Boolean)
  record('orphan', 'seven entries keep, four names go, nothing else moves', ok, [
    `all seven entries painted: ${Object.values(present).every(Boolean)}`,
    ...Object.entries(present).filter(([, v]) => !v).map(([k]) => `   MISSING: ${k}`),
    `persona warning:  ${personaWarning}`,
    `tactic warning:   ${tacticWarning}`,
    `combo warning:    ${comboWarning}`,
    `hearth warning:   ${hearthWarning}`,
    `party note:       ${partyLine}  (must be false)`,
    ...Object.entries(named).map(([k, v]) => `${k.padEnd(17)} ${v}  (must be false)`),
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
