/* ===========================================================================
   THE EQUIPMENT ROUND, AS PAINTED — round two, slice 3.

   Slice 3 shipped five things: four combos built on gear rather than on spell
   slots — "Bearings and the Backward Walk", "One Silver Piece of Fire", "The
   Shield Round", "Drop the Glaive" — and round two's FIRST TACTIC, "The
   Shopping List That Is Not Spell Components".

   `pack-hearth-7-r2.test.ts` checks everything checkable about those five as
   objects. Two claims survive that no unit test can reach, and both are the
   product:

   1. THE LABEL MEASUREMENT, INHERITED AND MANDATORY. `ComboCard.tsx:98` paints
      a step label with `truncate` — one line, clipped with an ellipsis, no
      wrap, about 287 pixels at a 390-pixel viewport. Slice 2's prover caught
      five clipped labels this way and the pack header records the ruling: the
      label names the ACTION, the notes carry the ARGUMENT, and the rule is
      NEVER enforced with a character count, because a 46-character label
      measured as fitting while a 44-character one did not. `—` and `×` are
      wide and `{{weapon}}` resolves to a name whose length the player chooses.
      The header says in as many words that slices 3 and 4 must carry the same
      measurement. This is that measurement.

   2. THE DISTINCTION MARCUS ASKED FOR, ON THE GLASS. His words were "we really
      need to make more of a distinction between combos and tactics". Gate 1
      ruled it: a combo is ONE TURN — colour-coded ACTION / BONUS / REACTION /
      MOVEMENT / FREE pills and a Deploy button — and a tactic is everything
      that is not one turn: a priority badge, a "When:" trigger, and an
      un-typed list of decisions with NO Deploy button. A unit test can see the
      data shapes differ. Only this can see that the two kinds of card LOOK
      different at the table, which is where the complaint came from.

   AND IT ONLY SEES A FRESH BUILD. `vite preview` serves `dist/`, so a run made
   straight after editing a pack reports the OLD strings and looks like the fix
   did nothing. Run `npm run build` first.

   THE SHEET IS HIS, NOT THE FIXTURE'S — the same Dawn Guardian sheet slice 2's
   prover drives, duplicated here rather than imported because these provers are
   standalone scripts a future session may run one of in isolation. Two of
   slice 3's four combos need equipment he does not own yet, and that is
   deliberately NOT a gate: `needs` deletes a card forever, gear can be bought,
   so the gear is asked for in `requirements` and the tactic tells him what to
   buy. All four must therefore arrive on a sheet carrying none of it.

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
   `properties` array is load-bearing twice over here: `Graze` is what earns
   "The Second Swing", and `Two-Handed` is what earns slice 3's "Drop the
   Glaive" — a card whose entire subject is that a two-handed weapon leaves you
   no free hand. */
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
  /* NOTE WHAT IS NOT HERE: no ball bearings, no oil, no shield, no longsword.
     That is the point of the run, not an oversight. If a future author moves
     gear from `requirements` into `needs`, three of these four cards vanish
     from this sheet and this prover says which. */
}

const PILL_WORDS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']

/* Slice 3's four combos, in pack order, with the pills they must paint IN THE
   ORDER THEY PAINT THEM. The order is the turn order, and it is the assertion
   that would go red if somebody re-arranged a combo's steps into a sequence a
   turn cannot legally contain — "Drop the Glaive" in particular only makes
   sense free-then-action-then-movement, because dropping the weapon is what
   buys the hand the Action needs. */
const EXPECTED_COMBOS = [
  {
    name: 'Bearings and the Backward Walk',
    pills: ['ACTION', 'BONUS', 'MOVEMENT'],
  },
  {
    name: 'One Silver Piece of Fire',
    pills: ['ACTION', 'BONUS', 'FREE'],
  },
  {
    name: 'The Shield Round',
    pills: ['ACTION', 'BONUS', 'MOVEMENT'],
  },
  {
    name: 'Drop the Glaive',
    pills: ['FREE', 'ACTION', 'MOVEMENT'],
  },
]

/* Round two's one tactic, and every way it must differ on screen from the four
   cards above. `steps: 6` is a literal for the same reason the combo counts are
   literals elsewhere in these provers: a list that renders "some" of its items
   is the failure that looks fine. */
const EXPECTED_TACTIC = {
  name: 'The Shopping List That Is Not Spell Components',
  priority: 'HIGH',
  steps: 6,
  triggerStartsWith: 'When: You are in a town',
}

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
  if (!raw) return { combos: [], tactics: [] }
  const box = JSON.parse(raw)
  return {
    combos: box.combos.map(c => c.id),
    tactics: box.tactics.map(t => t.id),
  }
}, 'codex-toybox-' + id)

const slice3Combos = EXPECTED_COMBOS.map(c => 'seed:hearth-7-r2:' + {
  'Bearings and the Backward Walk': 'bearings-and-the-backward-walk',
  'One Silver Piece of Fire': 'one-silver-piece-of-fire',
  'The Shield Round': 'the-shield-round',
  'Drop the Glaive': 'drop-the-glaive',
}[c.name])

const combosDelivered = slice3Combos.filter(x => !stored.combos.includes(x))
const tacticDelivered = stored.tactics.includes('seed:hearth-7-r2:the-shopping-list')

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
 *  Marcus makes. Both card kinds are a `button[aria-expanded]`, which is why
 *  one helper serves combos and tactics alike. */
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
// THE FOUR COMBOS
// ─────────────────────────────────────────────────────────────────────────────

const comboResults = []

for (const want of EXPECTED_COMBOS) {
  const paint = await paintedTopmost(want.name)
  const opened = await openCard(want.name)

  /* THE MEASUREMENT. Inside the open card, find the pills and — for each — the
     step label that sits beside it. A label is CLIPPED when its own scroll
     width exceeds the box it was given, which is exactly what `truncate` does
     silently. One pixel of tolerance for sub-pixel layout; nothing more,
     because an ellipsis costs far more than a pixel. */
  const read = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null

    const pills = []
    const clipped = []
    /* COUNTED, AND REPORTED. Slice 3's labels were authored against the rule
       and passed this measurement on the first run — which is the one case
       where a measurement that found NOTHING TO MEASURE is indistinguishable
       from a measurement that found nothing wrong. If the label lookup below
       ever stops resolving (a wrapper span added inside the row would do it),
       `measured` drops to 0 and the run fails loudly instead of passing
       silently. Three steps per combo, four combos: twelve. */
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
    }
  }, [want.name, PILL_WORDS])

  const pillsRight = !!read && JSON.stringify(read.pills) === JSON.stringify(want.pills)

  comboResults.push({
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
    ok:
      paint.ok
      && opened
      && pillsRight
      && (read?.measured ?? 0) === want.pills.length
      && (read?.clipped.length ?? 1) === 0
      && !read?.nameClipped
      && !!read?.deploy
      && !read?.braces,
  })

  await closeCard(want.name)
}

// ─────────────────────────────────────────────────────────────────────────────
// THE TACTIC — and the distinction
// ─────────────────────────────────────────────────────────────────────────────

const onTactics = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if ((b.textContent ?? '').trim() === 'Tactics') { b.click(); return true }
  }
  return false
})
await page.waitForTimeout(500)

const tacticPaint = await paintedTopmost(EXPECTED_TACTIC.name)
const tacticOpened = await openCard(EXPECTED_TACTIC.name)

const tacticRead = await page.evaluate(([t, pillWords, priority]) => {
  let card = null
  for (const b of document.querySelectorAll('button[aria-expanded]')) {
    if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
  }
  if (!card) return null

  const leaves = [...card.querySelectorAll('*')]
    .filter(el => !el.children.length)
    .map(el => (el.textContent ?? '').trim())

  /* THE TRIGGER. `TacticCard.tsx` renders it as "When: <trigger>" in one
     italic paragraph — the answer to WHEN, which is the half of a play a
     combo's numbered steps cannot carry. */
  const trigger = [...card.querySelectorAll('p')]
    .map(p => (p.textContent ?? '').trim())
    .find(s => s.startsWith('When:')) ?? null

  /* THE STEPS. An `<ol>` of un-typed decisions — no action-economy pill above
     any of them, because a tactic is not one turn. */
  const list = card.querySelector('ol')
  const steps = list ? [...list.querySelectorAll('li')].length : 0

  /* AND THE STEPS MUST BE READABLE. The tactic's action text has no `truncate`
     and is free to wrap, so the honest check is height, not width: a step is
     unreadable if its own content is taller than the box it was given. */
  const clippedSteps = []
  if (list) {
    for (const li of list.querySelectorAll('li')) {
      for (const span of li.querySelectorAll('span')) {
        if (span.children.length) continue
        const text = (span.textContent ?? '').trim()
        if (!text || /^\d+$/.test(text)) continue
        if (span.scrollHeight > span.clientHeight + 1 || span.scrollWidth > span.clientWidth + 1) {
          clippedSteps.push({ text: text.slice(0, 60), need: span.scrollHeight, got: span.clientHeight })
        }
      }
    }
  }

  let nameClipped = null
  for (const el of card.querySelectorAll('span.font-display')) {
    if ((el.textContent ?? '').trim() !== t) continue
    if (el.scrollHeight > el.clientHeight + 1) {
      nameClipped = { need: el.scrollHeight, got: el.clientHeight }
    }
  }

  return {
    priorityBadge: leaves.includes(priority),
    trigger,
    steps,
    clippedSteps,
    nameClipped,
    /* THE DISTINCTION, BOTH HALVES. No Deploy button and no action-economy
       pills — the two things that say "this is one turn" on a combo card. */
    deploy: !!card.querySelector('button[aria-label="Deploy combo"]'),
    pills: leaves.filter(s => pillWords.includes(s)),
    braces: (card.textContent ?? '').includes('{{'),
  }
}, [EXPECTED_TACTIC.name, PILL_WORDS, EXPECTED_TACTIC.priority])

const tacticOk =
  onTactics
  && tacticPaint.ok
  && tacticOpened
  && !!tacticRead
  && tacticRead.priorityBadge
  && !!tacticRead.trigger
  && tacticRead.trigger.startsWith(EXPECTED_TACTIC.triggerStartsWith)
  && tacticRead.steps === EXPECTED_TACTIC.steps
  && tacticRead.clippedSteps.length === 0
  && !tacticRead.nameClipped
  && !tacticRead.deploy
  && tacticRead.pills.length === 0
  && !tacticRead.braces

await ctx.close()
await browser.close()

// ─── Report ───

console.log(`\n── storage: slice 3's four combos and its one tactic, on a sheet owning no gear`)
console.log(`   combos missing: ${combosDelivered.length ? combosDelivered.join(', ') : 'none — all four delivered'}`)
console.log(`   tactic delivered: ${tacticDelivered}`)
console.log(`   ${combosDelivered.length === 0 && tacticDelivered ? 'PASS' : 'FAIL'}`)

for (const r of comboResults) {
  console.log(`\n── ${r.name}`)
  console.log(`   painted: ${r.painted} ${r.box ?? ''}   opened: ${r.opened}   Deploy offered: ${r.deploy}   braces: ${r.braces} (must be false)`)
  console.log(`   pills:   ${r.pills.join(' · ') || '(none)'}   ${r.pillsRight ? '' : '← WRONG'}`)
  if (r.clipped.length) {
    for (const c of r.clipped) console.log(`   CLIPPED STEP: "${c.text}" needs ${c.need}px, given ${c.got}px`)
  } else {
    console.log(`   ${r.measured} of ${r.pills.length} step labels measured, every one readable in full at 390px`)
  }
  if (r.nameClipped) console.log(`   CLIPPED NAME: needs ${r.nameClipped.need}px tall, given ${r.nameClipped.got}px`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

console.log(`\n── ${EXPECTED_TACTIC.name}`)
console.log(`   Tactics tab reached: ${onTactics}   painted: ${tacticPaint.ok} ${tacticPaint.box ?? ''}   opened: ${tacticOpened}`)
if (tacticRead) {
  console.log(`   priority badge "${EXPECTED_TACTIC.priority}": ${tacticRead.priorityBadge}`)
  console.log(`   trigger: ${tacticRead.trigger ? `"${tacticRead.trigger.slice(0, 70)}…"` : 'MISSING'}`)
  console.log(`   decision steps: ${tacticRead.steps} (want ${EXPECTED_TACTIC.steps})`)
  if (tacticRead.clippedSteps.length) {
    for (const c of tacticRead.clippedSteps) console.log(`   CLIPPED STEP: "${c.text}…" needs ${c.need}px tall, given ${c.got}px`)
  } else {
    console.log(`   every decision readable in full at 390px`)
  }
  if (tacticRead.nameClipped) console.log(`   CLIPPED NAME: needs ${tacticRead.nameClipped.need}px tall, given ${tacticRead.nameClipped.got}px`)
  console.log(`   NOT a combo: no Deploy button (${!tacticRead.deploy}), no action-economy pills (${tacticRead.pills.length === 0}${tacticRead.pills.length ? ` — found ${tacticRead.pills.join(', ')}` : ''})`)
  console.log(`   braces: ${tacticRead.braces} (must be false)`)
}
console.log(`   ${tacticOk ? 'PASS' : 'FAIL'}`)

const failed = comboResults.filter(r => !r.ok)
const allOk = combosDelivered.length === 0 && tacticDelivered && failed.length === 0 && tacticOk
console.log(
  `\n${allOk
    ? 'PASS — slice 3 painted: four gear combos readable, and a tactic that looks nothing like them'
    : `FAIL — ${[
      ...(combosDelivered.length || !tacticDelivered ? ['storage'] : []),
      ...failed.map(r => r.name),
      ...(tacticOk ? [] : ['the tactic']),
    ].join(', ')}`}`,
)
process.exit(allOk ? 0 : 1)
