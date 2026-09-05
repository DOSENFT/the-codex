/* ===========================================================================
   DELETED MEANS DELETED — slice 3 of the Toybox seed.

   Slice 1 shipped a known bug and named it in a test called `resurrects`:
   "already seeded?" was answered by asking whether the Toybox was EMPTY, which
   is true again the moment you delete the last seeded entry. The unit tests can
   assert the marker is written. They cannot assert that a person who taps the
   bin and comes back tomorrow does not find the thing he threw away sitting
   there again — that claim is about a real delete button, a real reload, and
   real localStorage, so it is made here.

     deleted    seed · open the card · press Delete · RELOAD THE WHOLE APP
                → still gone. Under slice 2 this run comes back red, because
                  slice 2 would have re-seeded on the reload.

     reseed     from that same emptied state, the empty state now offers
                "Load the Hearth starter plays" — press it
                → the combo is back, exactly ONE of it, and it survives a
                  second reload

     legacy     a Toybox saved before `seededPacks` existed — the literal JSON
                shape sitting in Marcus's browser right now
                → seeded, because absent must read as "not yet" and not as
                  "already done"

   The third case is the quiet one. If `loadToybox` read a missing marker as
   "seeded", every character in the app would be locked out of this feature
   permanently and nothing on screen would say why.

   Finding Q: claims about the screen are geometric. A string counts as painted
   only when its own element has a box with area and is the topmost thing at
   its own centre.

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
const marcus = { ...nix, level: 7, abilityScores: { ...nix.abilityScores, CHA: 16 } }
const ID = marcus.id
/* ROUND TWO, SLICE 2 CHANGED THE WORDS ON THE BUTTON, and finding out that way
   is the prover doing its job. `ToyboxPanel.tsx` names the pack when exactly one
   is missing and says "Reload the seeded plays" when more than one is — and
   case 2 below deletes EVERYTHING, so after round two both packs are gone and
   the plural label is what Marcus's thumb actually meets. Round two, slice 1
   did not move it because round two delivered nothing to this fixture and there
   was never a second pack present to delete; slice 2 changed that.

   Both strings are named. The prover asserts the plural one is offered AND that
   the singular one is not, which is a stronger claim than the old single check:
   a label that silently stopped naming the pack in the one-pack case would now
   be caught rather than passed over. */
const SEED_LABEL = 'Reload the seeded plays'
const SEED_LABEL_ONE_PACK = 'Load the Hearth starter plays'

const browser = await chromium.launch()

// ── helpers, shared by every case ──

async function openToybox(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
    .click({ timeout: 15000 })
  await page.waitForTimeout(600)
}

/** Every string the screen is actually painting — leaf elements with a box,
 *  topmost at their own centre. */
const visibleText = page => page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    const text = (el.textContent ?? '').trim()
    if (!text) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue
    out.push(text)
  }
  return out
})

/** A BUTTON is not a leaf — it holds an icon `<svg>` beside its label — so the
 *  scan above will never see one, and asking it whether a button is on screen
 *  gets a confident "no". Slice 1's prover lost a run to exactly this and left
 *  a comment about it; this run lost another one before reading the comment.
 *  Buttons get read by their own text and their own box. */
const buttonShowing = (page, label) => page.evaluate(label =>
  [...document.querySelectorAll('button')].some(
    el => (el.textContent ?? '').trim().includes(label) && el.getBoundingClientRect().height > 0,
  ), label)

const storedCombos = page => page.evaluate(id => {
  const raw = localStorage.getItem('codex-toybox-' + id)
  if (!raw) return null
  const parsed = JSON.parse(raw)
  return { combos: parsed.combos.map(c => c.id), seededPacks: parsed.seededPacks ?? null }
}, ID)

async function newPage(toybox) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.addInitScript(
    ([json, id, toybox]) => {
      localStorage.setItem('codex-character-' + id, json)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
      if (toybox) localStorage.setItem('codex-toybox-' + id, toybox)
    },
    [JSON.stringify(marcus), ID, toybox ?? null],
  )
  return { ctx, page }
}

/** Open the Hearth Wall card and press its bin. The delete button only exists
 *  inside the expanded card, which is exactly how Marcus would reach it. */
async function deleteHearthWall(page) {
  await page.locator('button[aria-expanded]:has-text("Hearth Wall")').first().click({ timeout: 5000 })
  await page.waitForTimeout(300)
  await page.locator('button[aria-label="Delete combo"]').first().click({ timeout: 5000 })
  await page.waitForTimeout(400)
}

/* Every combo this fixture earns. Slice 1's prover carries the note on why this
   is a literal rather than `> 0`; this prover was red from slice 6 to slice 10
   because its literal was `1` and nothing re-ran it.

   ROUND TWO, SLICE 2 ADDED THE `+ 3`: round two's three ungated combos reach
   `loadNix()` too. The sum keeps the two packs legible — round one losing a
   card while round two gains one is still wrong and still goes red.

   ROUND TWO, SLICE 3 TOOK IT TO `+ 6` — three more ungated cards, all of them
   needing equipment the fixture does not carry, which is `requirements` and
   never `needs`. The reasoning in full is in `prove-slice1.mjs`.

   ROUND TWO, SLICE 4 TOOK IT TO `+ 7` and closed round two at ten. The last card
   is "The Caster Killer"; it is ungated and this fixture carries a melee weapon,
   so it arrives. Nothing else in this file moves — the delete-one and
   press-reseed arithmetic below is written against `PACK_COMBOS` and not against
   any card in particular, which is why a growing pack does not grow the prover
   that guards deletion. */
const PACK_COMBOS = 14 + 7

/** SLICE 10 ADDED THIS, and it is a change in what the app requires rather than
 *  a change in the prover's taste. The offer is gated on `!packPresent(...)` —
 *  nothing from the pack left ANYWHERE, not just on the tab in front of you
 *  (`ToyboxPanel.tsx`, and the comment above `canReseed` says why: otherwise
 *  pressing it appends a second copy of entries that are on screen). In slice 3
 *  the pack was one combo and no tactics or plays, so deleting Hearth Wall
 *  cleared the whole thing by accident and the button appeared.
 *
 *  The first attempt at this fix deleted only the fourteen combos, saw no
 *  button, and would have been reported as a missing affordance. It is not:
 *  twelve tactics and five plays were still there and the gate was doing its
 *  job. All thirty-one go. */
const TABS = [
  ['Combos', 'Delete combo'],
  ['Tactics', 'Delete tactic'],
  ['Persona', 'Delete persona play'],
]

async function deleteEverything(page) {
  for (const [tabName, binLabel] of TABS) {
    await page.locator(`button:has-text("${tabName}")`).first().click({ timeout: 5000 })
    await page.waitForTimeout(300)
    for (let i = 0; i < 40; i++) {
      const card = page.locator('button[aria-expanded]:has(span.font-display)').first()
      if (await card.count() === 0) break
      await card.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(120)
      const bin = page.locator(`button[aria-label="${binLabel}"]`).first()
      if (await bin.count() === 0) break
      await bin.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(200)
    }
  }
  await page.locator('button:has-text("Combos")').first().click({ timeout: 5000 })
  await page.waitForTimeout(300)
}

const results = []
const record = (id, what, ok, lines) => results.push({ id, what, ok, lines })

// ── CASE 1: deleted stays deleted across a full reload ──
{
  const { ctx, page } = await newPage()
  await openToybox(page)
  const seeded = await storedCombos(page)

  await deleteHearthWall(page)
  const afterDelete = await storedCombos(page)

  // The whole point: a fresh load of the app, not a re-render.
  await openToybox(page)
  const afterReload = await storedCombos(page)
  const painted = (await visibleText(page)).some(t => t.includes('Hearth Wall'))

  /* One deleted, thirteen kept — and the "kept" half is new at slice 10. When
     the pack was one combo this could only say "0 left", which is equally
     consistent with a delete button that wipes the tab. Now the claim is that
     it removed exactly the card he pressed and left the others where they
     were, across a full reload. */
  const ok =
    seeded?.combos.length === PACK_COMBOS
    && seeded.seededPacks?.includes('hearth-7')
    && afterDelete?.combos.length === PACK_COMBOS - 1
    && !afterDelete.combos.includes('seed:hearth-7:hearth-wall')
    && afterReload?.combos.length === PACK_COMBOS - 1
    && !afterReload.combos.includes('seed:hearth-7:hearth-wall')
    && afterReload.seededPacks?.includes('hearth-7')
    && !painted
  record('deleted', 'seed · delete · reload the whole app', ok, [
    `on first open:   ${JSON.stringify(seeded)}`,
    `after Delete:    ${JSON.stringify(afterDelete)}`,
    `after a reload:  ${JSON.stringify(afterReload)}`,
    `"Hearth Wall" painted after the reload: ${painted}  (must be false)`,
  ])
  await ctx.close()
}

// ── CASE 2: and there is a way back ──
{
  const { ctx, page } = await newPage()
  await openToybox(page)

  /* Before anything is deleted the button must not be there. Written at slice 3
     against the Tactics tab because that tab WAS empty then; at slice 10 it
     holds twelve, so the check has quietly become the stronger one it always
     meant: with content on screen, offering to load it again is how you end up
     with two of everything. */
  await page.locator('button:has-text("Tactics")').first().click({ timeout: 5000 })
  await page.waitForTimeout(300)
  const offeredTooEarly = await buttonShowing(page, SEED_LABEL)
  await page.locator('button:has-text("Combos")').first().click({ timeout: 5000 })
  await page.waitForTimeout(300)

  await deleteEverything(page)
  await page.waitForTimeout(300)
  const emptied = await page.evaluate(id => {
    const raw = localStorage.getItem('codex-toybox-' + id)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d.combos.length + d.tactics.length + d.personaPlays.length
  }, ID)

  const offered = await buttonShowing(page, SEED_LABEL)
  /* And the singular label is NOT offered, because two packs are missing, not
     one. This is the half that would catch the button quietly reverting to
     naming only round one while restoring both. */
  const offeredSingular = await buttonShowing(page, SEED_LABEL_ONE_PACK)

  let backAfterPress = null
  let backAfterReload = null
  let paintedAgain = false
  if (offered) {
    await page.locator(`button:has-text("${SEED_LABEL}")`).first().click({ timeout: 5000 })
    await page.waitForTimeout(500)
    backAfterPress = await storedCombos(page)
    paintedAgain = (await visibleText(page)).some(t => t.includes('Hearth Wall'))
    await openToybox(page)
    backAfterReload = await storedCombos(page)
  }

  const ok =
    !offeredTooEarly
    && emptied === 0
    && offered
    && !offeredSingular
    && backAfterPress?.combos.length === PACK_COMBOS
    && paintedAgain
    && backAfterReload?.combos.length === PACK_COMBOS
    /* TWO, since round two, slice 2 — and still an exact count. Both markers
       were already in storage before the delete and neither may be written a
       second time by the force path; a `>= 1` here would not see a marker
       doubling, which is precisely what "once means once" is about. */
    && backAfterReload.seededPacks?.length === 2
  record('reseed', 'the empty state offers it back, and once means once', ok, [
    `offered while the combos were still there: ${offeredTooEarly}  (must be false)`,
    `entries left across all three tabs: ${emptied}  (must be 0)`,
    `offered "${SEED_LABEL}": ${offered}`,
    `offered "${SEED_LABEL_ONE_PACK}": ${offeredSingular}  (must be false — two packs are gone)`,
    `after pressing:  ${JSON.stringify(backAfterPress)}`,
    `painted again:   ${paintedAgain}`,
    `after a reload:  ${JSON.stringify(backAfterReload)}  (exactly two, neither marker doubled)`,
  ])
  await ctx.close()
}

// ── CASE 3: the migration — a Toybox written before the marker existed ──
{
  const legacy = JSON.stringify({ combos: [], tactics: [], personaPlays: [] })
  const { ctx, page } = await newPage(legacy)
  await openToybox(page)
  const after = await storedCombos(page)
  const painted = (await visibleText(page)).some(t => t.includes('Hearth Wall'))

  const ok = after?.combos.length === PACK_COMBOS && after.seededPacks?.includes('hearth-7') && painted
  record('legacy', 'a Toybox saved before `seededPacks` existed', ok, [
    `stored before:   ${legacy}`,
    `stored after:    ${JSON.stringify(after)}`,
    `"Hearth Wall" painted: ${painted}`,
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
