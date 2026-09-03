/* ===========================================================================
   THE TRACER, AS PAINTED — slice 1 of the Toybox seed.

   The unit tests prove `seedToybox` returns a combo. They cannot prove the
   combo reaches the glass, and a seeded entry the app does not paint is a
   half-built feature running as if done. This drives the real app in a real
   Chrome and reads what a person would actually see.

   TWO CASES, and the second is the one that would catch the worst outcome:

     nix      a Paladin 7 of the Hearth, empty Toybox   → "Hearth Wall" painted
     wizard   same empty Toybox, wrong class           → still empty, no seed

   The negative case matters more than the positive one. A seeder that fired
   for everybody would look like a success on Marcus's screen and like garbage
   on anyone else's — and Gate 1 named generic content as the failure mode by
   name. So the wizard is required to see the untouched empty state AND to have
   nothing written to storage at all.

   Finding Q: claims about the screen are geometric. A string counts as painted
   only when its own element has a box with area and is the topmost thing at
   its own centre. `textContent` proves the model, not the screen.

   NOTHING IS SPENT. No AI config is seeded, so no request to any model host is
   made; this feature does not touch that path.
   ========================================================================= */
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'

const BASE = process.argv[2] ?? 'http://localhost:4321'

/* Playwright is not a dependency of this repo; it lives wherever npx last put
   it. Resolved the same way every other probe in these plan folders does it. */
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

/* SLICE 10 FOUND THIS PROVER RED AND THE FEATURE FINE. It asserted
   `combos.length === 1`, which was the truth in slice 1 and stopped being the
   truth in slice 6 when the pack grew to fourteen. Nobody re-ran it: slices 5
   through 9 each ran their own prover and the unit suite, and `seed.test.ts`
   had ALREADY been rewritten at slice 5 for exactly this reason — its comment
   says so — while the three browser provers kept the literal.

   The literal is kept, not softened to `>= 1`. A count that only asserts
   "something arrived" would not have caught the duplicate-append bug slice 3
   was written for. It is named here so the next person who changes the pack
   gets a red prover with an obvious cause instead of a mystery. */
const PACK_COMBOS = 14

const CASES = [
  {
    id: 'nix',
    what: 'a Paladin 7 of the Hearth opening an empty Toybox',
    /* Level 7 rather than the fixture's 8. The fixture's own header forbids
       changing it there; the level that matters at Marcus's table is set here. */
    character: { ...nix, level: 7 },
    expectSeeded: true,
  },
  {
    id: 'wizard',
    what: 'the same empty Toybox on a character no pack is written for',
    character: { ...nix, class: 'Wizard', subclass: 'Evocation' },
    expectSeeded: false,
  },
]

const browser = await chromium.launch()
const results = []

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  const id = c.character.id
  await page.addInitScript(
    ([json, id]) => {
      localStorage.setItem('codex-character-' + id, json)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
      // Deliberately NOT setting codex-toybox-<id>. An absent key is the state
      // every one of Marcus's tabs is in today, and the state the seed is for.
    },
    [JSON.stringify(c.character), id],
  )

  await page.goto(BASE, { waitUntil: 'networkidle' })

  const opener = page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  await opener.click({ timeout: 15000 })
  await page.waitForTimeout(600)

  // ── What the screen says ──
  const painted = await page.evaluate(() => {
    const hits = []
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      const text = (el.textContent ?? '').trim()
      if (text !== 'Hearth Wall') continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const top = document.elementFromPoint(cx, cy)
      hits.push({
        box: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
        topmost: !!top && (el === top || el.contains(top) || top.contains(el)),
      })
    }
    return hits
  })

  /* "Create First" lives in a button next to an <svg>, so the element holding
     it is not a leaf and the leaf-scan above will never find it. That is a
     probe bug and it cost one run: the wizard case reported "no empty state"
     while the empty state was on screen. Read the button by its own text
     instead, and keep the geometric leaf-scan for the positive claim, which is
     the one that has to be airtight. */
  const emptyState = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(
      el => (el.textContent ?? '').trim() === 'Create First' && el.getBoundingClientRect().height > 0,
    ),
  )

  // Kept for diagnosis: if a case fails, the next reader needs to know whether
  // the panel was even open rather than guessing.
  const panelText = await page.evaluate(() =>
    (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 200),
  )

  // ── What reached storage ──
  const stored = await page.evaluate(id => localStorage.getItem('codex-toybox-' + id), id)
  const parsed = stored ? JSON.parse(stored) : null

  const seenPainted = painted.some(p => p.topmost)
  /* Nothing dropped AND nothing duplicated — the second half is the reason the
     count is not simply `> 0`. Slice 3's whole subject was a reseed that could
     append a second copy of everything, and a length check that accepts any
     positive number cannot see it. */
  const ids = parsed?.combos?.map(x => x.id) ?? []
  const ok = c.expectSeeded
    ? seenPainted && ids.length === PACK_COMBOS && new Set(ids).size === ids.length && !emptyState
    : !seenPainted && parsed === null && emptyState

  results.push({ id: c.id, what: c.what, ok, seenPainted, emptyState, painted, panelText, stored: parsed && {
    combos: parsed.combos.map(x => x.id),
    tactics: parsed.tactics.length,
  } })

  await ctx.close()
}

await browser.close()

for (const r of results) {
  console.log(`\n── ${r.id} — ${r.what}`)
  console.log(`   painted "Hearth Wall": ${r.seenPainted}  ${r.painted.map(p => p.box + (p.topmost ? ' topmost' : ' OCCLUDED')).join(' | ')}`)
  console.log(`   empty state showing:   ${r.emptyState}`)
  console.log(`   codex-toybox-*:        ${r.stored ? JSON.stringify(r.stored) : 'absent — nothing written'}`)
  if (!r.ok) console.log(`   screen: ${r.panelText}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length ? `FAIL — ${failed.map(r => r.id).join(', ')}` : 'PASS — both cases'}`)
process.exit(failed.length ? 1 : 0)
