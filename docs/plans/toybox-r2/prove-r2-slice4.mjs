/* ===========================================================================
   THE SLATE CLOSED, AS PAINTED — round two, slice 4.

   Slice 4 shipped one combo, "The Caster Killer", and with it round two's tenth
   and last. So this prover is deliberately NOT a slice-4 prover in the way its
   three predecessors were slice-1, slice-2 and slice-3 provers. Those each
   measured their own slice's cards. This one measures ALL TEN, because the
   claim slice 4 makes is not "the tenth card works" — it is "the slate is
   closed, and every card on it is still readable on a phone".

   THREE THINGS ARE ASSERTED HERE THAT NO UNIT TEST CAN REACH:

   1. ALL THIRTY STEP LABELS, MEASURED. `ComboCard.tsx:98` paints a step label
      with `truncate` — one line, clipped with an ellipsis, no wrap, about 287
      pixels at a 390-pixel viewport. Slice 2's prover caught five clipped
      labels this way, and the ruling in the pack header is that the label names
      the ACTION while the notes carry the ARGUMENT — never enforced with a
      character count, because a 46-character label measured as fitting while a
      44-character one did not. Ten combos, three steps each, thirty labels. The
      pack header states as a fact that this file measures all thirty; that
      sentence is only true while this file runs green.

   2. THE COUNT OF WHAT WAS MEASURED. Slice 3 found the one failure mode a
      geometric check has: a run that finds NOTHING TO MEASURE is
      indistinguishable, in its output, from a run that finds nothing wrong. So
      every label measured is counted, per card and in total, and a short count
      fails the run. Wrap a step row in one more element and this goes red
      rather than quiet.

   3. THE ORDER, WHICH IS THE ORDER HE READS THEM IN. Storage is compared as an
      exact ordered list of ten ids, not a length. A length of ten cannot tell a
      re-ordering from a replacement, and `PACKS` order is authoring order is
      card order on his screen.

   AND ONE THING SPECIFIC TO THE NEW CARD. "The Caster Killer" is worth having
   because of a single counter-intuitive number: the enemy's Concentration save
   is a FLAT DC 10, which is why many small hits beat one big one and why the
   card tells him to spend the Bonus Action on Searing Smite instead of Divine
   Smite. A reader who assumes the enemy rolls against HIS save DC draws the
   opposite conclusion from the same card. The unit test checks that sentence in
   the data; this checks it survived resolution and actually reached the glass,
   with his own resolved DC (14) absent from the card.

   AND IT ONLY SEES A FRESH BUILD. `vite preview` serves `dist/`, so a run made
   straight after editing a pack reports the OLD strings and looks like the edit
   did nothing. Run `npm run build` first.

   THE SHEET IS HIS. The same Dawn Guardian sheet slices 2 and 3 drive —
   duplicated rather than imported, because these provers are standalone scripts
   a future session may run one of in isolation. It carries NO gear: no ball
   bearings, no oil, no shield. All ten cards must arrive anyway, which is the
   gear-is-`requirements`-and-never-`needs` ruling, held on the glass.

   Finding Q, inherited: a string counts as painted only when its own element
   has a box with area and is the topmost thing at its own centre.

   NOTHING IS SPENT. No AI config is seeded; this feature does not touch that
   path.
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

/* Marcus's actual weapon, read out of `codex-nix-lvl7 (2) (1).json`. All three
   properties are load-bearing on this run: `Reach` and `Sentinel` earn "The
   Sentinel Gate", `Graze` earns "The Second Swing Is Not Wasted", and
   `Two-Handed` earns "Drop the Glaive". This is the only sheet in the repo that
   earns all ten at once, which is why the whole-slate check lives here. */
const DAWN_GUARDIAN = {
  ...nix.weapons.find(w => w.attackType === 'melee'),
  name: 'The Dawn Guardian',
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach', 'Graze'],
  range: '10 ft',
  magical: true,
}

const FEAT = name => ({ name, description: '', isHomebrew: false, effects: [] })

const MARCUS = {
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, STR: 18, CHA: 16 },
  feats: [FEAT('Sentinel'), FEAT('Lucky')],
  weapons: [DAWN_GUARDIAN, ...nix.weapons.filter(w => w.attackType !== 'melee')],
  /* Still no ball bearings, no oil, no shield. Three of the ten ask for gear in
     `requirements`; if a future author moves any of it into `needs`, those cards
     vanish from this sheet and this prover names which. */
}

const PILL_WORDS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']

/* ALL TEN, IN PACK ORDER, WITH THE PILLS EACH ONE PAINTS IN THE ORDER IT PAINTS
   THEM. The pill order is the turn order, so this list is also the assertion
   that nobody has re-arranged a combo's steps into a sequence a real turn
   cannot contain — "Drop the Glaive" only makes sense free-then-action, because
   dropping the weapon is what buys the hand the Action needs, and "The Caster
   Killer" only makes sense movement-then-action, because you cannot swing at
   something you have not walked to. */
const EXPECTED_COMBOS = [
  { slug: 'the-sentinel-gate', name: 'The Sentinel Gate', pills: ['MOVEMENT', 'ACTION', 'REACTION'] },
  { slug: 'three-people-stand-up', name: 'Three People Stand Up', pills: ['MOVEMENT', 'ACTION', 'FREE'] },
  { slug: 'the-free-crit', name: 'The Free Crit', pills: ['ACTION', 'BONUS', 'FREE'] },
  { slug: 'the-second-swing', name: 'The Second Swing Is Not Wasted', pills: ['ACTION', 'FREE', 'MOVEMENT'] },
  { slug: 'through-the-door', name: 'Through the Door', pills: ['BONUS', 'MOVEMENT', 'FREE'] },
  { slug: 'bearings-and-the-backward-walk', name: 'Bearings and the Backward Walk', pills: ['ACTION', 'BONUS', 'MOVEMENT'] },
  { slug: 'one-silver-piece-of-fire', name: 'One Silver Piece of Fire', pills: ['ACTION', 'BONUS', 'FREE'] },
  { slug: 'the-shield-round', name: 'The Shield Round', pills: ['ACTION', 'BONUS', 'MOVEMENT'] },
  { slug: 'drop-the-glaive', name: 'Drop the Glaive', pills: ['FREE', 'ACTION', 'MOVEMENT'] },
  { slug: 'the-caster-killer', name: 'The Caster Killer', pills: ['MOVEMENT', 'ACTION', 'BONUS'] },
]

/** Thirty. Written as the sum rather than as `30` so that a card losing a step
 *  while another gains one still fails. */
const WANT_LABELS = EXPECTED_COMBOS.reduce((n, c) => n + c.pills.length, 0)

/* The sentences slice 4's card is FOR, and the number that would mean it is
   giving the opposite advice. "DC 14" is his own resolved spell save DC — the
   token is long gone by the time it is painted, so a check looking for `{{` or
   for the token name would miss exactly the error it exists to catch.

   MATCHED CASE-INSENSITIVELY, which the first run of this file forced and which
   is the honest comparison. The card shouts the important half of that warning
   in capitals — "A FLAT DC 10" — so a case-sensitive `includes` reported the
   sentence missing when it was there in front of it. Case is a typographic
   decision the card is free to change; the claim being guarded is that the
   number is stated at all. */
const KILLER = {
  name: 'The Caster Killer',
  mustSay: ['flat DC 10', 'Ask your DM', 'Divine Smite', 'Searing Smite'],
  mustNotSay: ['DC 14'],
}
const says = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase())

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

const id = MARCUS.id
await page.addInitScript(
  ([json, id]) => {
    localStorage.setItem('codex-character-' + id, json)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
  },
  [JSON.stringify(MARCUS), id],
)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  .click({ timeout: 15000 })
await page.waitForTimeout(600)

/* What actually reached storage, so a card missing from the screen can be told
   apart from a card that was never delivered. Round one's fourteen are filtered
   out here on purpose: `prove-slice1.mjs` owns the claim that round one is
   intact and appended-to, and duplicating it here would mean two files to move
   the day round one changes. */
const stored = await page.evaluate(k => {
  const raw = localStorage.getItem(k)
  if (!raw) return { combos: [], all: 0 }
  const box = JSON.parse(raw)
  return {
    combos: box.combos.map(c => c.id).filter(x => x.startsWith('seed:hearth-7-r2:')),
    all: box.combos.length,
  }
}, 'codex-toybox-' + id)

const STORED_EXPECTED = EXPECTED_COMBOS.map(c => 'seed:hearth-7-r2:' + c.slug)
const storedRight = JSON.stringify(stored.combos) === JSON.stringify(STORED_EXPECTED)

/** Scroll a leaf element with this exact text into view, then report whether it
 *  is painted — visible box, and topmost at its own centre. The scroll is what
 *  a person does; the topmost check still has to pass afterwards, so it
 *  weakens nothing. */
const paintedTopmost = async text => {
  await page.evaluate(t => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== t) continue
      el.scrollIntoView({ block: 'center' })
      return
    }
  }, text)
  await page.waitForTimeout(250)
  return page.evaluate(t => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== t) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (top && (el === top || el.contains(top) || top.contains(el))) {
        return { box: `${Math.round(r.width)}x${Math.round(r.height)}`, ok: true }
      }
    }
    return { box: null, ok: false }
  }, text)
}

/** Press the collapsed card whose heading carries this name — the same press
 *  Marcus makes. */
const openCard = async name => {
  const opened = await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if (!(b.textContent ?? '').includes(t)) continue
      if (b.getAttribute('aria-expanded') === 'false') b.click()
      return true
    }
    return false
  }, name)
  await page.waitForTimeout(350)
  return opened
}

const closeCard = async name => {
  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t) && b.getAttribute('aria-expanded') === 'true') b.click()
    }
  }, name)
  await page.waitForTimeout(200)
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL TEN
// ─────────────────────────────────────────────────────────────────────────────

const results = []

for (const want of EXPECTED_COMBOS) {
  const paint = await paintedTopmost(want.name)
  const opened = await openCard(want.name)

  /* THE MEASUREMENT. Inside the open card, find the pills and — for each — the
     step label beside it. A label is CLIPPED when its own scroll width exceeds
     the box it was given, which is exactly what `truncate` does silently. One
     pixel of tolerance for sub-pixel layout; nothing more, because an ellipsis
     costs far more than a pixel. */
  const read = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null

    const pills = []
    const clipped = []
    let measured = 0
    for (const el of card.querySelectorAll('span')) {
      if (el.children.length) continue
      const text = (el.textContent ?? '').trim()
      if (!pillWords.includes(text)) continue
      pills.push(text)
      const row = el.parentElement
      const spans = [...(row?.querySelectorAll('span') ?? [])].filter(s => !s.children.length)
      const label = spans[spans.indexOf(el) + 1]
      if (!label) continue
      measured++
      if (label.scrollWidth > label.clientWidth + 1) {
        clipped.push({
          text: (label.textContent ?? '').trim(),
          need: label.scrollWidth,
          got: label.clientWidth,
        })
      }
    }

    /* And the card NAME, which is `line-clamp-3` rather than `truncate` —
       three lines and then an ellipsis. */
    let nameClipped = null
    for (const el of card.querySelectorAll('span.font-display')) {
      if ((el.textContent ?? '').trim() !== t) continue
      if (el.scrollHeight > el.clientHeight + 1) {
        nameClipped = { need: el.scrollHeight, got: el.clientHeight }
      }
    }

    return {
      pills,
      clipped,
      measured,
      nameClipped,
      deploy: !!card.querySelector('button[aria-label="Deploy combo"]'),
      braces: (card.textContent ?? '').includes('{{'),
      text: card.textContent ?? '',
    }
  }, [want.name, PILL_WORDS])

  const pillsRight = !!read && JSON.stringify(read.pills) === JSON.stringify(want.pills)

  /* Slice 4's card carries one extra claim, checked only on the card it belongs
     to. Every other card here is being re-measured, not re-argued. */
  const said = want.name === KILLER.name && read
    ? {
      missing: KILLER.mustSay.filter(s => !says(read.text, s)),
      forbidden: KILLER.mustNotSay.filter(s => says(read.text, s)),
    }
    : { missing: [], forbidden: [] }

  results.push({
    name: want.name,
    painted: paint.ok,
    box: paint.box,
    opened,
    pills: read?.pills ?? [],
    pillsRight,
    clipped: read?.clipped ?? [],
    measured: read?.measured ?? 0,
    nameClipped: read?.nameClipped ?? null,
    deploy: read?.deploy ?? false,
    braces: read?.braces ?? false,
    said,
    ok:
      paint.ok
      && opened
      && pillsRight
      && (read?.measured ?? 0) === want.pills.length
      && (read?.clipped.length ?? 1) === 0
      && !read?.nameClipped
      && !!read?.deploy
      && !read?.braces
      && said.missing.length === 0
      && said.forbidden.length === 0,
  })

  await closeCard(want.name)
}

await ctx.close()
await browser.close()

// ─── Report ───

const totalMeasured = results.reduce((n, r) => n + r.measured, 0)

console.log(`\n── storage: round two's ten, in pack order, on a sheet owning no gear`)
console.log(`   ${stored.combos.map(x => x.replace('seed:hearth-7-r2:', '')).join(', ') || '(none)'}`)
console.log(`   round one still present alongside them: ${stored.all - stored.combos.length} combos`)
console.log(`   ${storedRight ? 'PASS' : 'FAIL — wrong set or wrong order'}`)

for (const r of results) {
  console.log(`\n── ${r.name}`)
  console.log(`   painted: ${r.painted} ${r.box ?? ''}   opened: ${r.opened}   Deploy offered: ${r.deploy}   braces: ${r.braces} (must be false)`)
  console.log(`   pills:   ${r.pills.join(' · ') || '(none)'}   ${r.pillsRight ? '' : '← WRONG'}`)
  if (r.clipped.length) {
    for (const c of r.clipped) console.log(`   CLIPPED STEP: "${c.text}" needs ${c.need}px, given ${c.got}px`)
  } else {
    console.log(`   ${r.measured} of ${r.pills.length} step labels measured, every one readable in full at 390px`)
  }
  if (r.nameClipped) console.log(`   CLIPPED NAME: needs ${r.nameClipped.need}px tall, given ${r.nameClipped.got}px`)
  if (r.said.missing.length) console.log(`   MISSING FROM THE CARD: ${r.said.missing.map(s => `"${s}"`).join(', ')}`)
  if (r.said.forbidden.length) console.log(`   SAYS WHAT IT MUST NOT: ${r.said.forbidden.map(s => `"${s}"`).join(', ')}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

console.log(`\n── the whole slate: ${totalMeasured} of ${WANT_LABELS} step labels measured across ${results.length} combos`)
console.log(`   ${totalMeasured === WANT_LABELS ? 'PASS — nothing went unmeasured' : 'FAIL — labels went unmeasured, which is not the same as unclipped'}`)

const failed = results.filter(r => !r.ok)
const allOk = storedRight && failed.length === 0 && totalMeasured === WANT_LABELS
console.log(
  `\n${allOk
    ? 'PASS — round two closed at ten: every card painted, every step readable at 390px'
    : `FAIL — ${[
      ...(storedRight ? [] : ['storage']),
      ...failed.map(r => r.name),
      ...(totalMeasured === WANT_LABELS ? [] : ['label count']),
    ].join(', ')}`}`,
)
process.exit(allOk ? 0 : 1)
