/* ===========================================================================
   THE NUMBERS ARE HIS — slice 2 of the Toybox seed.

   Slice 1 proved a seeded combo reaches the glass. It proved nothing about
   what the combo SAYS, because every word of it was a hardcoded string that
   would have painted identically on any sheet. Slice 2 replaced those strings
   with tokens resolved against the character. This probe is the only thing
   that can tell the difference, and the way it tells is by running the SAME
   pack against two different sheets and requiring the painted text to differ.

     marcus   Paladin 7, Charisma 16, Hearthbrand (5 ft)
              → "10 temp HP (level 7 + Charisma +3)" · "Reach 5 ft"
     chaMax   Paladin 8, Charisma 18, a reach weapon by another name
              → "12 temp HP (level 8 + Charisma +4)" · "Reach 10 ft"

   If templating were still hardcoded, ONE of these two would be wrong and the
   run goes red. `WARFARE-DOCTRINE.md` states the cloak as 11 temporary hit
   points because it was written at Charisma 18 and level 7; neither case here
   is allowed to say 11, and that is asserted directly, because the doctrine's
   number is the specific wrong answer this whole slice exists to not ship.

     noWeapon Paladin 7 of the Hearth carrying nothing he can swing
              → the combo names a weapon it cannot name, so it is DROPPED:
                empty state, and nothing written to storage at all.

   The third case is the one that would catch the worst outcome. Gate 2 chose
   "drop the entry" over "render it vague", and a token that quietly resolved
   to "" would paint `Attack ×2 — ` and look like a rendering bug rather than
   the missing-data bug it is. Proving the drop on the glass is the only way
   that decision is real.

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
const melee = nix.weapons.filter(w => w.attackType === 'melee')
const ranged = nix.weapons.filter(w => w.attackType === 'ranged')

const CASES = [
  {
    id: 'marcus',
    what: 'the sheet as Marcus actually plays it — Paladin 7, Charisma 16',
    character: {
      ...nix,
      level: 7,
      abilityScores: { ...nix.abilityScores, CHA: 16 },
    },
    expect: {
      seeded: true,
      says: [
        'Attack ×2 — Hearthbrand',
        'Reach 5 ft: you threaten the lane without standing in it.',
        '10 temp HP (level 7 + Charisma +3). Anyone hitting you in melee takes 1d10 fire.',
      ],
      neverSays: ['11 temp HP', '12 temp HP', '{{'],
    },
  },
  {
    id: 'chaMax',
    what: 'a different sheet entirely — Paladin 8, Charisma 18, a reach weapon',
    character: {
      ...nix,
      level: 8,
      abilityScores: { ...nix.abilityScores, CHA: 18 },
      /* A weapon the fixture has never carried, so a hardcoded "Hearthbrand"
         cannot pass by luck, and a reach property so `{{weaponReach}}` has to
         come from the sheet rather than from the 5 ft default. */
      weapons: [
        { ...melee[0], name: 'Emberreach Glaive', properties: ['Reach', 'Heavy'], range: '5 ft' },
        ...ranged,
      ],
    },
    expect: {
      seeded: true,
      says: [
        'Attack ×2 — Emberreach Glaive',
        'Reach 10 ft: you threaten the lane without standing in it.',
        '12 temp HP (level 8 + Charisma +4). Anyone hitting you in melee takes 1d10 fire.',
      ],
      neverSays: ['Hearthbrand', '11 temp HP', '10 temp HP', '{{'],
    },
  },
  {
    id: 'noWeapon',
    what: 'the same Paladin with no melee weapon to name',
    character: { ...nix, level: 7, weapons: ranged },
    /* SLICE 10 REWROTE THIS CASE, and the rewrite is a stronger claim than the
       one it replaces. It used to expect `seeded: false` — the "Create First"
       empty state and nothing in storage at all — which was correct when the
       pack held one combo and that combo named a weapon. At fourteen it is
       plainly wrong: an archer paladin still gets the five combos that never
       mention a weapon, and telling him he has NOTHING would be the feature
       failing, not passing.

       So the claim is now the exact surviving set. `>= 1` would pass on the
       wrong five; a name list cannot. The mechanism is unit-tested in
       `template.test.ts` (an unresolvable token kills the whole entry); this
       is the same fact on the glass, at 390px, for a sheet Marcus could
       actually build by putting down his sword. */
    expect: {
      seeded: true,
      says: [],
      neverSays: ['Hearth Wall', 'Hearthbrand', 'Attack ×2', '{{'],
      comboIds: [
        'seed:hearth-7:the-cone-at-the-door',
        'seed:hearth-7:nothing-in-reach',
        'seed:hearth-7:bless-before-the-door',
        'seed:hearth-7:damage-relocation',
        'seed:hearth-7:before-the-door-opens',
      ],
    },
  },
]

/* Every combo in `hearth-7`. See the note in `prove-slice1.mjs`: the literal
   is deliberate, and this prover was red from slice 6 to slice 10 because the
   old literal was `1`. */
const PACK_COMBOS = 14

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

  /* The card is collapsed until it is opened, and the resolved text lives in
     the steps inside it — so the probe has to do what Marcus does: tap it. */
  const header = page.locator('button[aria-expanded]:has-text("Hearth Wall")').first()
  const opened = await header.count()
  if (opened) {
    await header.click({ timeout: 5000 })
    await page.waitForTimeout(400)
  }

  // ── Every string the screen is actually painting, geometrically ──
  const visible = await page.evaluate(() => {
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

  const emptyState = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(
      el => (el.textContent ?? '').trim() === 'Create First' && el.getBoundingClientRect().height > 0,
    ),
  )

  const stored = await page.evaluate(id => localStorage.getItem('codex-toybox-' + id), id)
  const parsed = stored ? JSON.parse(stored) : null

  const said = c.expect.says.map(s => ({ s, ok: visible.some(v => v.includes(s)) }))
  const leaked = c.expect.neverSays.filter(s => visible.some(v => v.includes(s)))

  const ids = parsed?.combos?.map(x => x.id) ?? []
  /* A case either names the exact set it expects (the dropped-content case) or
     expects the whole pack (the two token-resolution cases). Both are exact —
     neither accepts "some combos arrived". */
  const wanted = c.expect.comboIds ?? null
  const countOk = wanted
    ? ids.length === wanted.length && wanted.every(id => ids.includes(id))
    : ids.length === PACK_COMBOS && new Set(ids).size === ids.length

  const ok = c.expect.seeded
    ? said.every(x => x.ok) && leaked.length === 0 && !emptyState && countOk
    : !!emptyState && parsed === null && !visible.some(v => v.includes('Hearth Wall'))

  results.push({ id: c.id, what: c.what, ok, said, leaked, emptyState, parsed, visible })

  await ctx.close()
}

await browser.close()

for (const r of results) {
  console.log(`\n── ${r.id} — ${r.what}`)
  for (const { s, ok } of r.said) console.log(`   ${ok ? 'painted ' : 'MISSING '} "${s}"`)
  if (r.leaked.length) console.log(`   LEAKED: ${r.leaked.join(' | ')}`)
  console.log(`   empty state showing:   ${r.emptyState}`)
  console.log(`   codex-toybox-*:        ${r.parsed ? JSON.stringify(r.parsed.combos.map(x => x.id)) : 'absent — nothing written'}`)
  if (!r.ok) console.log(`   screen: ${r.visible.join(' ¦ ').slice(0, 600)}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length ? `FAIL — ${failed.map(r => r.id).join(', ')}` : `PASS — all ${results.length} cases`}`)
process.exit(failed.length ? 1 : 0)
