/* ===========================================================================
   EIGHT TACTICS, AND NOT ONE OF THEM IS A TURN — round two, slice 5.

   Slice 5 filled the tactics tab: eight cards, six of which arrive for any
   level-7 Hearth paladin and two of which are deliberately withheld from a
   paladin who does not swing a two-handed weapon or does not own Sentinel.

   THE CLAIM THIS FILE EXISTS TO HOLD is the one Marcus actually made — "we
   really need to make more of a distinction between combos and tactics". The
   unit tests hold the DATA half of that distinction: no numbered sequences, no
   step that opens by spending the action economy. This file holds the VISUAL
   half, which no unit test can reach, because it is a fact about the rendered
   card rather than about the object behind it:

   1. NO DEPLOY BUTTON. `ComboCard` offers one; `TacticCard` must not. That is
      the difference he sees before he reads a word. Checked twice — by the
      combo card's own `aria-label`, and by any button anywhere in the card
      whose text says "Deploy" — because the day somebody adds a deploy affordance
      with a different label, the first check alone would stay green.

   2. NO ACTION-ECONOMY PILLS. A combo paints ACTION / BONUS / REACTION /
      MOVEMENT / FREE beside each step. A tactic paints a plain numbered list.
      An exact-text match on leaf elements, so "It became a BONUS ACTION in
      2024" inside a step's prose is correctly ignored — the guard is against a
      PILL, not against the words.

   3. THE STEP COUNT, MEASURED PER CARD. Slice 3's lesson: a run that finds
      nothing to measure prints the same as a run that finds nothing wrong. So
      every card states how many steps it must paint (8, then 6 seven times, 50
      in total) and a short count fails the run. Every step must also carry its
      numbered circle, because the numbering is the list, and a list that lost
      its numbers is a paragraph.

   4. THE ORDER, WHICH IS THE ORDER HE SCROLLS. Storage is compared as an exact
      ordered list of eight ids, not a length. A length of eight cannot tell a
      re-ordering from a replacement.

   5. THE TRIGGER REACHED THE GLASS AS "When: …". A tactic's trigger is the
      field that tells him WHEN to read the card at all; a card whose trigger
      silently failed to resolve is a card he will read at the wrong moment.

   AND THE PRIORITY AND CATEGORY LABELS, both of which are how the tab sorts and
   filters. Two cards say CRITICAL, five say HIGH, one says NORMAL. If a future
   author makes everything critical, nothing is.

   AND IT ONLY SEES A FRESH BUILD. `vite preview` serves `dist/`, so a run made
   straight after editing a pack reports the OLD strings and looks like the edit
   did nothing. Run `npm run build` first.

   THE SHEET IS HIS. The same Dawn Guardian sheet slices 2, 3 and 4 drive —
   duplicated rather than imported, because these provers are standalone scripts
   a future session may run one of in isolation. Two-Handed and Sentinel are
   both load-bearing here: they are what earns the two gated cards, so this run
   is the only one that sees all eight.

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

/* The five words a COMBO paints beside each of its steps. None of them may
   appear as an element's whole text anywhere inside a tactic card. */
const PILL_WORDS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']

/* ALL EIGHT, IN PACK ORDER, WHICH IS CARD ORDER.

   `steps` is written out per card rather than summed at the end, because the
   first card is the only eight-step card on the tab and a future edit that
   moves two steps off it and onto another would leave a total of 50 either way.

   `triggerHas` is a fragment chosen to avoid curly apostrophes, so that a
   comparison never fails over a typographic character. */
const EXPECTED = [
  {
    slug: 'four-prepared-spells',
    name: 'Five Prepared Spells You Are Not Using',
    priority: 'CRITICAL',
    category: 'Core',
    steps: 8,
    triggerHas: 'Any long rest',
  },
  {
    slug: 'the-doctrine-trick',
    name: 'Your Doctrine’s Best Trick Does Not Work',
    priority: 'HIGH',
    category: 'Core',
    steps: 6,
    triggerHas: 'planning to Smite in the same turn',
  },
  {
    slug: 'glaive-not-sword-and-board',
    name: 'You Are a Glaive, Not a Sword and Board',
    priority: 'HIGH',
    category: 'Core',
    steps: 6,
    triggerHas: 'it assumes you are holding a shield',
  },
  {
    slug: 'the-shopping-list',
    name: 'The Shopping List That Is Not Spell Components',
    priority: 'HIGH',
    category: 'Support',
    steps: 6,
    triggerHas: 'supplies list on this app is completely empty',
  },
  {
    slug: 'sentinel-is-a-prison',
    name: 'Sentinel Is a Prison, Not a Damage Feat',
    priority: 'HIGH',
    category: 'Control',
    steps: 6,
    triggerHas: 'you have a Reaction and everyone knows it',
  },
  {
    slug: 'no-save-proficiencies',
    name: 'Your Sheet Has No Saving Throw Proficiencies',
    priority: 'CRITICAL',
    category: 'Survival',
    steps: 6,
    triggerHas: 'look at the saving throw line',
  },
  {
    slug: 'ask-your-dm',
    name: 'Ask Your DM These Five Questions',
    priority: 'HIGH',
    category: 'Support',
    steps: 6,
    triggerHas: 'not in the middle of a turn with five people waiting',
  },
  {
    slug: 'plate-and-the-face',
    name: 'Your Plate Cannot Sneak, but Your Face Can',
    priority: 'NORMAL',
    category: 'Support',
    steps: 6,
    triggerHas: 'looks at the changeling',
  },
]

/** Fifty. Written as the sum so that a card losing a step while another gains
 *  one still fails the per-card check above AND this one. */
const WANT_STEPS = EXPECTED.reduce((n, c) => n + c.steps, 0)

/* THE TWO CARDS THAT MUST SAY THE THING THEY EXIST FOR, held on the glass and
   not merely in the data. Both overrule a document Marcus supplied, so both
   have to name the document — a card that says "you are wrong" without saying
   which page it read is a card he cannot check. */
const MUST_SAY = {
  'Your Doctrine’s Best Trick Does Not Work': [
    'WARFARE-DOCTRINE.md', 'CORRECTIONS.md', 'casting time',
  ],
  'Your Sheet Has No Saving Throw Proficiencies': [
    'paladin_1.txt', 'Wisdom and Charisma',
  ],
  'Ask Your DM These Five Questions': [
    'Skip 1 attack', 'Miss = half damage',
  ],
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

/* THE TAB PRESS. The Toybox opens on Combos; every card this file measures is
   one tab to the right. If this press fails, every card below reports "not
   painted" — which is true, but for the wrong reason — so it is reported on its
   own line. */
const switched = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if ((b.textContent ?? '').trim() === 'Tactics') { b.click(); return true }
  }
  return false
})
await page.waitForTimeout(500)

const stored = await page.evaluate(k => {
  const raw = localStorage.getItem(k)
  if (!raw) return { tactics: [], all: 0 }
  const box = JSON.parse(raw)
  return {
    tactics: box.tactics.map(t => t.id).filter(x => x.startsWith('seed:hearth-7-r2:')),
    all: box.tactics.length,
  }
}, 'codex-toybox-' + id)

const STORED_EXPECTED = EXPECTED.map(c => 'seed:hearth-7-r2:' + c.slug)
const storedRight = JSON.stringify(stored.tactics) === JSON.stringify(STORED_EXPECTED)

/** Finding Q. Scroll a leaf element with this exact text into view, then report
 *  whether it is painted — visible box, and topmost at its own centre. */
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
// ALL EIGHT
// ─────────────────────────────────────────────────────────────────────────────

const results = []

for (const want of EXPECTED) {
  const paint = await paintedTopmost(want.name)
  const opened = await openCard(want.name)

  const read = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null
    const header = card.querySelector('button[aria-expanded]')

    /* The priority badge, read off the header rather than off the whole card,
       because the words CRITICAL and HIGH are ordinary English and a step could
       one day shout one of them. */
    const PRI = ['CRITICAL', 'HIGH', 'NORMAL']
    let priority = null
    for (const el of header.querySelectorAll('*')) {
      if (el.children.length) continue
      const s = (el.textContent ?? '').trim()
      if (PRI.includes(s)) priority = s
    }

    /* The name is `line-clamp-3` — three lines, then an ellipsis and the rest of
       the sentence is gone. */
    let nameClipped = null
    for (const el of header.querySelectorAll('span.font-display')) {
      if ((el.textContent ?? '').trim() !== t) continue
      if (el.scrollHeight > el.clientHeight + 1) {
        nameClipped = { need: el.scrollHeight, got: el.clientHeight }
      }
    }

    let trigger = null
    for (const p of card.querySelectorAll('p')) {
      const s = (p.textContent ?? '').trim()
      if (s.startsWith('When:')) { trigger = s; break }
    }

    /* The numbered list, and the numbers themselves. `steps` counts the rows;
       `numbered` counts the rows that still carry their circle. */
    const ol = card.querySelector('ol')
    const rows = ol ? [...ol.children].filter(el => el.tagName === 'LI') : []
    const numbered = rows.filter(li => {
      const first = li.querySelector('span')
      return !!first && /^\d+$/.test((first.textContent ?? '').trim())
    }).length

    /* The category badge sits in the element immediately after the list. */
    const category = ol?.nextElementSibling
      ? (ol.nextElementSibling.textContent ?? '').trim()
      : null

    /* THE DISTINCTION, TWICE. */
    const deployLabelled = !!card.querySelector('button[aria-label="Deploy combo"]')
    const deployWorded = [...card.querySelectorAll('button')]
      .some(b => /deploy/i.test(b.textContent ?? ''))

    const pills = []
    for (const el of card.querySelectorAll('*')) {
      if (el.children.length) continue
      const s = (el.textContent ?? '').trim()
      if (pillWords.includes(s)) pills.push(s)
    }

    return {
      priority,
      nameClipped,
      trigger,
      steps: rows.length,
      numbered,
      category,
      deployLabelled,
      deployWorded,
      pills,
      edit: !!card.querySelector('button[aria-label="Edit tactic"]'),
      del: !!card.querySelector('button[aria-label="Delete tactic"]'),
      braces: (card.textContent ?? '').includes('{{'),
      text: card.textContent ?? '',
    }
  }, [want.name, PILL_WORDS])

  const mustSay = MUST_SAY[want.name] ?? []
  const missing = read ? mustSay.filter(s => !says(read.text, s)) : mustSay

  results.push({
    name: want.name,
    painted: paint.ok,
    box: paint.box,
    opened,
    priority: read?.priority ?? null,
    priorityRight: read?.priority === want.priority,
    category: read?.category ?? null,
    categoryRight: read?.category === want.category,
    trigger: read?.trigger ?? null,
    triggerRight: !!read?.trigger && says(read.trigger, want.triggerHas),
    steps: read?.steps ?? 0,
    numbered: read?.numbered ?? 0,
    stepsRight: read?.steps === want.steps && read?.numbered === want.steps,
    deploy: !!(read?.deployLabelled || read?.deployWorded),
    pills: read?.pills ?? [],
    edit: read?.edit ?? false,
    del: read?.del ?? false,
    braces: read?.braces ?? false,
    missing,
    ok:
      paint.ok
      && opened
      && read?.priority === want.priority
      && read?.category === want.category
      && !!read?.trigger && says(read.trigger, want.triggerHas)
      && read?.steps === want.steps
      && read?.numbered === want.steps
      && !read?.deployLabelled
      && !read?.deployWorded
      && (read?.pills.length ?? 1) === 0
      && !read?.nameClipped
      && !!read?.edit
      && !!read?.del
      && !read?.braces
      && missing.length === 0,
    nameClipped: read?.nameClipped ?? null,
  })

  await closeCard(want.name)
}

await ctx.close()
await browser.close()

// ─── Report ───

const totalSteps = results.reduce((n, r) => n + r.steps, 0)

console.log(`\n── tab: ${switched ? 'switched to Tactics' : 'FAIL — never found the Tactics tab'}`)

console.log(`\n── storage: round two's eight, in pack order, on a two-handed Sentinel sheet`)
console.log(`   ${stored.tactics.map(x => x.replace('seed:hearth-7-r2:', '')).join(', ') || '(none)'}`)
console.log(`   round one still present alongside them: ${stored.all - stored.tactics.length} tactics`)
console.log(`   ${storedRight ? 'PASS' : 'FAIL — wrong set or wrong order'}`)

for (const r of results) {
  console.log(`\n── ${r.name}`)
  console.log(`   painted: ${r.painted} ${r.box ?? ''}   opened: ${r.opened}   braces: ${r.braces} (must be false)`)
  console.log(`   priority: ${r.priority ?? '(none)'} ${r.priorityRight ? '' : '← WRONG'}   category: ${r.category ?? '(none)'} ${r.categoryRight ? '' : '← WRONG'}`)
  console.log(`   ${r.steps} steps, ${r.numbered} still numbered ${r.stepsRight ? '' : '← WRONG'}`)
  console.log(`   trigger: ${r.triggerRight ? 'painted as "When: …"' : `WRONG → ${r.trigger ?? '(none)'}`}`)
  console.log(`   Deploy offered: ${r.deploy} (must be false)   action-economy pills: ${r.pills.join(' · ') || 'none'} (must be none)`)
  console.log(`   Edit: ${r.edit}   Delete: ${r.del}`)
  if (r.nameClipped) console.log(`   CLIPPED NAME: needs ${r.nameClipped.need}px tall, given ${r.nameClipped.got}px`)
  if (r.missing.length) console.log(`   MISSING FROM THE CARD: ${r.missing.map(s => `"${s}"`).join(', ')}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

console.log(`\n── the whole tab: ${totalSteps} of ${WANT_STEPS} steps painted across ${results.length} tactics`)
console.log(`   ${totalSteps === WANT_STEPS ? 'PASS — nothing went unmeasured' : 'FAIL — steps went unpainted, which is not the same as unclipped'}`)

const failed = results.filter(r => !r.ok)
const allOk = switched && storedRight && failed.length === 0 && totalSteps === WANT_STEPS
console.log(
  `\n${allOk
    ? 'PASS — eight tactics painted, none of them offering a turn to deploy'
    : `FAIL — ${[
      ...(switched ? [] : ['tab']),
      ...(storedRight ? [] : ['storage']),
      ...failed.map(r => r.name),
      ...(totalSteps === WANT_STEPS ? [] : ['step count']),
    ].join(', ')}`}`,
)
process.exit(allOk ? 0 : 1)
