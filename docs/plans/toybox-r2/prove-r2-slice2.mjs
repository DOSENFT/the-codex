/* ===========================================================================
   THE FOUR NEW COMBOS, AS PAINTED — round two, slice 2.

   `pack-hearth-7-r2.test.ts` resolves five combos into objects and checks every
   rule that can be checked about an object: one Action, one Bonus, one
   Reaction; ids namespaced; `needs` honoured; no brace survives. All of that is
   true of a card nobody can read.

   THIS PROVER ASKS THE ONE QUESTION THOSE TESTS CANNOT, and it is the question
   slice 2 actually risked. `ComboCard.tsx:98` paints a block's label with
   `truncate` — ONE LINE, clipped with an ellipsis, no wrap. Round one's labels
   are short ("Manifest the Hearthfire"). Round two's were written as sentences.

   IT CAUGHT THEM. On its first run all five round-two cards failed, one clipped
   step each, and these were the strings it killed:

     "Get all three inside 30 feet — of YOU, not of each other"   346px in 287
     "A 20 came up — cast Divine Smite, and pay nothing"          325px in 287
     "Attack ×2 — The Dawn Guardian — and take the second swing"  444px in 287
     "Walk the outside wall, do not stand at the door"            298px in 287
     "Opportunity Attack — and its Speed becomes 0"               300px in 287

   Each has been cut back to the action it names, with the clause it lost moved
   into — or already present in — that step's `notes`, which wrap freely. The
   reasoning is recorded at the top of `hearth-7-r2.combos.ts`, next to the
   content, because that is where the next author is standing.

   THE FIX WAS CONTENT, NOT THE RENDERER, AND THAT WAS MEASURED RATHER THAN
   ASSUMED. Counting characters in the pack source suggested round one had two
   labels over the same budget, which would have made this a pre-existing
   renderer defect and `truncate` the thing to change. Opening all nineteen
   combo cards and measuring said otherwise: round one clips NOTHING. The count
   was wrong because `{{weaponReach}}` resolves shorter than it reads and
   because em dashes are wide. Round two had drifted off a convention round one
   kept, so the convention was restored and `ComboCard.tsx` was left alone —
   which also keeps slice 2 inside the file list Gate 3 approved.

   A label that ends in "…" on a 390-pixel phone is a step Marcus cannot read at
   the table, which is the entire product. No unit test can see it: the string
   is perfect in memory and the loss happens in CSS at a width the test never
   has. So the claim here is geometric — for every step of every round-two
   combo, `scrollWidth <= clientWidth`, measured in a real Chrome at 390×844.

   AND IT ONLY SEES A FRESH BUILD. `vite preview` serves `dist/`, so a run made
   straight after editing a pack reports the OLD strings and looks like the fix
   did nothing. Run `npm run build` first.

   AND THE ONE-TURN RULE, PAINTED. Gate 1's whole ruling is that a combo is one
   turn, and the thing that says so on the glass is the colour-coded
   ACTION / BONUS / REACTION / MOVEMENT / FREE pill above each step, plus the
   Deploy button. The unit test asserts the block TYPES; this asserts the pills
   are on screen in the right order, which is the same rule from the side Marcus
   sees it from.

   THE SHEET IS HIS, NOT THE FIXTURE'S. Round two exists because round one was
   authored against `loadNix()` — Hearthbrand, five feet, no feats. This prover
   drives The Dawn Guardian: 1d10 Slashing, Two-Handed, Reach, GRAZE, Strength
   18, Sentinel and Lucky. That is the only sheet in the repo that earns all
   five, and "The Second Swing Is Not Wasted" has never been on a screen before
   because nothing else carries Graze.

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

/* Marcus's actual weapon, read out of `codex-nix-lvl7 (2) (1).json`. The
   `properties` array is the load-bearing part: `needs` reads `Graze` off it
   literally, so this is not an approximation of his sheet, it is the string. */
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
}

/* Every round-two combo, in pack order, with the action-economy pills it must
   paint IN THE ORDER IT PAINTS THEM. The pill order is the turn order: this is
   the list that would go red if somebody re-ordered a combo's steps so the
   Bonus Action came before the Attack that legally has to precede it. */
const EXPECTED = [
  {
    name: 'The Sentinel Gate',
    pills: ['MOVEMENT', 'ACTION', 'REACTION'],
  },
  {
    name: 'Three People Stand Up',
    pills: ['MOVEMENT', 'ACTION', 'FREE'],
  },
  {
    name: 'The Free Crit',
    pills: ['ACTION', 'BONUS', 'FREE'],
  },
  {
    name: 'The Second Swing Is Not Wasted',
    pills: ['ACTION', 'FREE', 'MOVEMENT'],
  },
  {
    name: 'Through the Door',
    pills: ['BONUS', 'MOVEMENT', 'FREE'],
  },
]

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
   apart from a card that was never delivered. */
const stored = await page.evaluate(k => {
  const raw = localStorage.getItem(k)
  return raw ? JSON.parse(raw).combos.map(c => c.id) : []
}, 'codex-toybox-' + id)

const r2Stored = stored.filter(x => x.startsWith('seed:hearth-7-r2:'))

/** Scroll a leaf element with this exact text into view, then report whether
 *  it is painted — visible box, and topmost at its own centre. The scroll is
 *  what a person does; the topmost check still has to pass afterwards, so it
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

const results = []

for (const want of EXPECTED) {
  const paint = await paintedTopmost(want.name)

  /* Open the card. Every card is a collapsed `aria-expanded` button whose
     heading carries the name, so this is the same press Marcus makes. */
  const opened = await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if (!(b.textContent ?? '').includes(t)) continue
      if (b.getAttribute('aria-expanded') === 'false') b.click()
      return true
    }
    return false
  }, want.name)
  await page.waitForTimeout(350)

  /* THE MEASUREMENT. Inside the open card, find the pills and — for each — the
     step label that sits beside it. A label is CLIPPED when its own scroll
     width exceeds the box it was given, which is exactly what `truncate` does
     silently. One pixel of tolerance for sub-pixel layout; nothing more, because
     an ellipsis costs far more than a pixel. */
  const read = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null

    const pills = []
    const clipped = []
    for (const el of card.querySelectorAll('span')) {
      if (el.children.length) continue
      const text = (el.textContent ?? '').trim()
      if (pillWords.includes(text)) {
        pills.push(text)
        /* The label is the next leaf span after the pill, inside the same row. */
        const row = el.parentElement
        const spans = [...(row?.querySelectorAll('span') ?? [])].filter(s => !s.children.length)
        const label = spans[spans.indexOf(el) + 1]
        if (label && label.scrollWidth > label.clientWidth + 1) {
          clipped.push({
            text: (label.textContent ?? '').trim(),
            need: label.scrollWidth,
            got: label.clientWidth,
          })
        }
      }
    }

    /* And the card NAME, which is `line-clamp-3` rather than `truncate` — three
       lines and then an ellipsis. Round two's longest is "The Second Swing Is
       Not Wasted"; slice 9 of round one already moved this from two lines to
       three for a shorter name than that, so it is worth re-measuring. */
    let nameClipped = null
    for (const el of card.querySelectorAll('span.font-display')) {
      if ((el.textContent ?? '').trim() !== t) continue
      if (el.scrollHeight > el.clientHeight + 1) {
        nameClipped = { need: el.scrollHeight, got: el.clientHeight }
      }
    }

    const deploy = !!card.querySelector('button[aria-label="Deploy combo"]')
    const braces = (card.textContent ?? '').includes('{{')

    return { pills, clipped, nameClipped, deploy, braces }
  }, [want.name, ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']])

  const pillsRight = !!read && JSON.stringify(read.pills) === JSON.stringify(want.pills)

  results.push({
    name: want.name,
    painted: paint.ok,
    box: paint.box,
    opened,
    pills: read?.pills ?? [],
    pillsRight,
    clipped: read?.clipped ?? [],
    nameClipped: read?.nameClipped ?? null,
    deploy: read?.deploy ?? false,
    braces: read?.braces ?? false,
    ok:
      paint.ok
      && opened
      && pillsRight
      && (read?.clipped.length ?? 1) === 0
      && !read?.nameClipped
      && !!read?.deploy
      && !read?.braces,
  })

  /* Close it again so the next card's measurement is not taken through an
     already-tall page. */
  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t) && b.getAttribute('aria-expanded') === 'true') b.click()
    }
  }, want.name)
  await page.waitForTimeout(200)
}

await ctx.close()
await browser.close()

/* THE WHOLE ROUND-TWO SET THIS SHEET EARNS, IN PACK ORDER — not just slice 2's
   five. It was slice 2's five when this file was written, because that was
   everything round two had; slice 3 added four more and this literal went red
   the same day, which is the literal doing its job rather than a nuisance.

   It is written out in full rather than derived from `EXPECTED`, and that is
   the point: `EXPECTED` below stays at slice 2's five cards because slice 2's
   prover measures slice 2's cards, and `prove-r2-slice3.mjs` measures slice
   3's. But storage is not per-slice — it is the one place that can see a card
   silently dropped or delivered twice, so it asserts the entire set.

   Marcus's real sheet earns ALL TEN: The Sentinel Gate needs Sentinel and he has
   it, The Second Swing needs Graze and The Dawn Guardian has it, Drop the Glaive
   needs a Two-Handed weapon and The Dawn Guardian is one, and the other seven
   are gated on nothing. If this list ever shrinks without a slice deleting a
   card, a `needs` gate has started refusing his own sheet.

   SLICE 4 TOOK IT FROM NINE TO TEN and closed round two's slate. The tenth,
   "The Caster Killer", sorts last for the plainest possible reason: it was
   written last, and `PACKS` order is authoring order. */
const STORED_EXPECTED = [
  'seed:hearth-7-r2:the-sentinel-gate',
  'seed:hearth-7-r2:three-people-stand-up',
  'seed:hearth-7-r2:the-free-crit',
  'seed:hearth-7-r2:the-second-swing',
  'seed:hearth-7-r2:through-the-door',
  'seed:hearth-7-r2:bearings-and-the-backward-walk',
  'seed:hearth-7-r2:one-silver-piece-of-fire',
  'seed:hearth-7-r2:the-shield-round',
  'seed:hearth-7-r2:drop-the-glaive',
  'seed:hearth-7-r2:the-caster-killer',
]

const storedRight = JSON.stringify(r2Stored) === JSON.stringify(STORED_EXPECTED)

console.log(`\n── storage: all ten round-two combos delivered to his real sheet`)
console.log(`   ${r2Stored.map(x => x.replace('seed:hearth-7-r2:', '')).join(', ')}`)
console.log(`   ${storedRight ? 'PASS' : 'FAIL — wrong set'}`)

for (const r of results) {
  console.log(`\n── ${r.name}`)
  console.log(`   painted: ${r.painted} ${r.box ?? ''}   opened: ${r.opened}   Deploy offered: ${r.deploy}   braces: ${r.braces} (must be false)`)
  console.log(`   pills:   ${r.pills.join(' · ') || '(none)'}   ${r.pillsRight ? '' : '← WRONG'}`)
  if (r.clipped.length) {
    for (const c of r.clipped) console.log(`   CLIPPED STEP: "${c.text}" needs ${c.need}px, given ${c.got}px`)
  } else {
    console.log(`   every step readable in full at 390px`)
  }
  if (r.nameClipped) console.log(`   CLIPPED NAME: needs ${r.nameClipped.need}px tall, given ${r.nameClipped.got}px`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

const failed = results.filter(r => !r.ok)
const allOk = storedRight && failed.length === 0
console.log(`\n${allOk ? 'PASS — all five round-two combos, painted and readable' : `FAIL — ${[...(storedRight ? [] : ['storage']), ...failed.map(r => r.name)].join(', ')}`}`)
process.exit(allOk ? 0 : 1)
