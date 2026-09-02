/* ============================================================================
   SLICE 4 — THE RAIL, ON THE GLASS.
   ----------------------------------------------------------------------------
     node docs/plans/your-turn/prove-slice4.mjs

   The component tests prove the markup — which controls exist, and that the
   pools appear on a sheet that carries them and not on one that does not. They
   cannot prove the three things this slice was actually commissioned to answer:

     · Gate 3's least-confident decision 6 — "the rail carries eight things on
       one row at 390px … on a sheet that does, the rail has to hold more than
       any screen has yet been measured holding". That is a question about
       PIXELS, and it is answered here, on the synthetic sheet, or not at all.
     · That the slots are painted ONCE. Two components rendering the same
       number are two strings in the markup either way; only geometry says
       whether they are two places a man can look (Finding Q).
     · That a press REACHES HIS SHEET. A pip that lights and forgets is worse
       than a pip that does nothing.

   And one negative that has to be checked with its other half, per HANDOFF §4:
   there is NO dice button on `?d=1`. That is correct — `App.tsx`'s preview
   branch renders `TurnLive` outside `Layout`, and `Layout` is where the dice
   provider lives, so `useDiceDock()` returns null and the rail declines to
   paint a control that could not open anything. A probe that found no dice
   because it was looking wrongly would report exactly the same thing, so the
   legacy tab is visited with the SAME probe, where the deck docks a real one.

   His export is never edited on disk. Every fixture is an in-memory clone.
   ========================================================================== */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const BASE = 'http://[::1]:4321/the-codex/'
const APP = BASE + '?d=1'
const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))

const clone = () => JSON.parse(JSON.stringify(SHEET))
const HIS = clone()

/* SYNTH — the sheet decision 6 needs and his export cannot provide. Written
   literally as `paladinResourcesFor(7)` computes it, rather than imported,
   because a fixture produced by the code under test cannot show that code
   being wrong. Same block `prove-capabilities.mjs` uses, so the two provers
   are measuring the same character.

   BOTH NUMBERS ARE COPIED OUT OF `src/canon/paladin-progression.json`, level 7
   — `layOnHandsPool: 35` (line 188) and `channelDivinityUses: 2` (line 179) —
   and not out of memory. Written from memory the first time, Channel Divinity
   said 3, which is level ELEVEN's row; `applyPoolMaxima` clamped it to 2 on the
   first write and the prover reported a phantom spend it had itself caused.
   A fixture written from a remembered rule is a fixture that can be wrong, and
   a wrong fixture accuses the code. */
const SYNTH = (() => {
  const c = clone()
  c.paladinResources = {
    layOnHands: { max: 35, current: 35 },
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  }
  return c
})()

/* NEITHER ROUTE. No `paladinResources`, and no feature declaring BOTH halves of
   a counter — `poolsOf`'s own definition of "not a pool". This is test 13's
   second half on the glass: the controls must not paint, and the screen must
   not fall over for want of them. */
const NO_POOLS = (() => {
  const c = clone()
  c.features = (c.features ?? []).map(f => {
    const g = { ...f }
    delete g.usesMax
    delete g.usesCurrent
    return g
  })
  c.resourcePools = []
  return c
})()

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}
/* Everything spent, so that «Reset» has something to undo. A reset measured
   against an economy that was already open is a reset that cannot fail. */
const SPENT = {
  ...IN_COMBAT,
  turnActions: { action: true, bonusAction: true, reaction: true, movement: true },
}

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  window.__id = id
  window.__seeded = s
}

/* ── measured in the page ───────────────────────────────────────────────── */
const MEASURE = () => {
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const flat = el => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const name = el => el.getAttribute('aria-label') || flat(el)
  const rect = el => {
    const r = el.getBoundingClientRect()
    return {
      top: Math.round(r.top), left: Math.round(r.left),
      bottom: Math.round(r.bottom), right: Math.round(r.right),
      w: Math.round(r.width), h: Math.round(r.height),
    }
  }
  const box = sel => {
    const e = document.querySelector(sel)
    return e && painted(e) ? rect(e) : null
  }
  const buttons = [...document.querySelectorAll('button')].filter(painted)

  const railEl = document.querySelector('.dturn .rail')
  const railBtns = railEl
    ? [...railEl.querySelectorAll('button')].filter(painted).map(b => ({ n: name(b), ...rect(b) }))
    : []

  /* THE ROWS. Distinct painted top edges among the rail's own controls — which
     is what "does it fit on one row" means when read off the screen rather than
     off a stylesheet. Tops are bucketed to 4px so that a 48px button and a 20px
     pip sharing a line are not counted as two rows for being centred. */
  const rows = [...new Set(railBtns.map(b => Math.round(b.top / 4)))].length

  /* Does anything stick out of the strip? Both halves: no descendant painted
     past the rail's right edge, AND the rail is not hiding overflow behind its
     own scroller. A horizontal scroller would satisfy the first and fail V-6
     exactly as thoroughly as running off the bottom. */
  const overflow = railEl
    ? {
        past: railBtns.filter(b => b.right > rect(railEl).right + 1).map(b => b.n),
        scrollW: railEl.scrollWidth,
        clientW: railEl.clientWidth,
      }
    : null

  /* SLOT PLACES. A distinct painted top-left corner carrying a spell-slot
     control or a slot tier's label. Counting corners rather than strings is
     Finding Q: two components painting "1st" at the same coordinates are one
     place, and he cannot see a duplicate that is not there. */
  const slotNames = buttons.map(name).filter(n => /level spell slot$/.test(n))
  /* NORMALISED TO THE TIER NUMBER, not left as the label.
     Written first as the label text, this could not see the fault it exists to
     catch: the rail says "1st" and the old strip said "Level 1", so a card
     painting BOTH had two corners carrying two DIFFERENT strings and deduped to
     two distinct labels — green, while his first-level slots were on screen
     twice. The claim is "one place per TIER", so the tier is what is compared. */
  const tierLabels = [...document.querySelectorAll('*')]
    .filter(painted)
    .map(el => {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
      const m = /^(?:Level\s+(\d)|(\d)(?:st|nd|rd|th))$/.exec(own)
      /* BOTH TIER FORMS AND NOTHING ELSE. Written once as an optional suffix,
         this matched a BARE DIGIT — and the first thing it found on his sheet
         was the "3" of his 3/67 hit points, which collided with the 3rd tier
         and reported a duplicate that was not there. A pattern loose enough to
         match anything numeric is not measuring slot tiers, it is measuring
         digits. */
      return m ? { tier: m[1] ?? m[2], text: own, at: rect(el).top + ':' + rect(el).left } : null
    })
    .filter(Boolean)
    .map(t => t.tier + '=' + t.text + '@' + t.at)

  const poolNames = railEl
    ? [...railEl.querySelectorAll('.rpool .k')].filter(painted).map(flat)
    : []
  const poolValues = railEl
    ? [...railEl.querySelectorAll('.rpool .v')].filter(painted).map(flat)
    : []

  let combat = null
  try { combat = JSON.parse(localStorage.getItem('codex-combat-' + window.__id) || 'null') } catch { combat = null }
  let sheet = null
  try { sheet = JSON.parse(localStorage.getItem('codex-character-' + window.__id) || 'null') } catch { sheet = null }

  return {
    rail: box('.dturn .rail'),
    body: box('.dturn .body'),
    edge: box('.dturn .edge'),
    res: box('.dturn .res'),
    colC: box('.dturn .colC'),
    hasRail: !!document.querySelector('.dturn.has-rail'),
    railBtns,
    rows,
    overflow,
    slotNames,
    tierLabels,
    poolNames,
    poolValues,
    dice: buttons.filter(b => /^Open dice roller$/i.test(name(b))).length,
    reset: buttons.filter(b => /^Reset action economy$/i.test(name(b))).length,
    startCombat: buttons.filter(b => /^Start Combat$/i.test(name(b))).length,
    endCombat: buttons.filter(b => /^End combat$/i.test(name(b))).length,
    lookup: buttons.filter(b => /^Look up$/i.test(name(b))).length,
    /* The look-up panel's own search field, by the placeholder QuickLookup
       gives it — not by a class, and not by the button that opened it. */
    lookupOpen: [...document.querySelectorAll('input')].filter(painted)
      .some(i => /search/i.test(i.getAttribute('placeholder') || '') || /search/i.test(i.getAttribute('aria-label') || '')),
    boundary: /something went wrong|surface failed|Turn \(preview\)/i.test(document.body.innerText || '') ,
    slot1: sheet?.spellSlots?.['1']?.current ?? null,
    loh: sheet?.paladinResources?.layOnHands?.current ?? null,
    cd: sheet?.paladinResources?.channelDivinity?.current ?? null,
    turnActions: combat?.turnActions ?? null,
    inCombat: combat?.inCombat ?? null,
  }
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()
const errs = []
const unreachable = []

async function visit(sheet, combat, url, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
  })
  await ctx.addInitScript(seed, [sheet.id, JSON.stringify(sheet), JSON.stringify(combat)])
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  if (shot) await page.screenshot({ path: `docs/plans/your-turn/_shots/${shot}.png` }).catch(() => {})
  return page
}

const press = async (page, re) => {
  try {
    const hit = await page.evaluate(src => {
      const rx = new RegExp(src)
      const b = [...document.querySelectorAll('button')].find(e =>
        rx.test(e.getAttribute('aria-label') || (e.textContent || '').replace(/\s+/g, ' ').trim()))
      if (!b) return false
      b.click()
      return true
    }, re.source)
    if (!hit) unreachable.push('no control matching ' + re)
  } catch (e) {
    unreachable.push(String(e.message).split('\n')[0])
  }
  await page.waitForTimeout(500)
}

/* ── his own export, in combat ─────────────────────────────────────────── */
const page = await visit(HIS, IN_COMBAT, APP, 'slice4-rail')
const his = await page.evaluate(MEASURE)

/* THE RAIL MUST NOT SCROLL AWAY. `.res` lived inside the scroll region; the
   rail is a sibling of it. Scrolling the list to its end is the gesture that
   used to take the resource strip off the screen. */
await page.evaluate(() => {
  const b = document.querySelector('.dturn .body')
  if (b) b.scrollTop = b.scrollHeight
})
await page.waitForTimeout(400)
const scrolled = await page.evaluate(MEASURE)

/* The look-up panel — item 11's "search feature", which the deck never had and
   the legacy tab reached from a different module entirely. */
await press(page, /^Look up$/)
const lookedUp = await page.evaluate(MEASURE)

/* ── the writes ────────────────────────────────────────────────────────── */
const wPage = await visit(HIS, SPENT, APP, null)
const spentBefore = await wPage.evaluate(MEASURE)
await press(wPage, /^Reset action economy$/)
const afterReset = await wPage.evaluate(MEASURE)
await press(wPage, /^Expend 1st level spell slot$/)
const afterSlot = await wPage.evaluate(MEASURE)
await press(wPage, /^End combat$/)
const afterEnd = await wPage.evaluate(MEASURE)

/* ── the synthetic sheet — decision 6's actual question ────────────────── */
const sPage = await visit(SYNTH, IN_COMBAT, APP, 'slice4-rail-synth')
const synth = await sPage.evaluate(MEASURE)

/* The pools are the half of the rail that WRITES somewhere the slots do not —
   `setPoolCurrent` walks three different homes for a pool, and a spend that
   lit the button while writing to none of them would look identical on screen.
   Both instruments, because a points pool and a uses pool take different paths
   through the same one handler. */
await press(sPage, /^Spend 5 Lay on Hands$/)
const afterLoh = await sPage.evaluate(MEASURE)
await press(sPage, /^Expend Channel Divinity use$/)
const afterCd = await sPage.evaluate(MEASURE)

/* ── neither route — test 13's second half, on glass ───────────────────── */
const nPage = await visit(NO_POOLS, IN_COMBAT, APP, null)
const none = await nPage.evaluate(MEASURE)

/* ── the legacy tab, with the same probe ───────────────────────────────── */
const lPage = await visit(HIS, IN_COMBAT, BASE, null)
const legacy = await lPage.evaluate(MEASURE)

await browser.close()

/* ── the report ────────────────────────────────────────────────────────── */
const checks = []
const check = (id, ok, evidence) => checks.push({ id, ok, evidence })

const w = his.rail ? his.rail.w : 0
console.log('\nSLICE 4 — THE RAIL · ?d=1 · Nix level ' + SHEET.level + ' · 390×844 · round 3\n')
console.log('  his export   rail ' + (his.rail ? his.rail.top + '–' + his.rail.bottom + ' (' + his.rail.h + 'px, ' + his.rows + ' row(s), ' + w + 'px wide)' : 'MISSING'))
console.log('               ' + his.railBtns.length + ' controls: ' + his.railBtns.map(b => b.n + ' ' + b.w + '×' + b.h).join(' · '))
console.log('  synthetic    rail ' + (synth.rail ? synth.rail.top + '–' + synth.rail.bottom + ' (' + synth.rail.h + 'px, ' + synth.rows + ' row(s))' : 'MISSING'))
/* Names and readouts listed apart, not zipped. A points pool has an n/max and a
   uses pool has pips instead, so pairing them by index would print "Channel
   Divinity" against nothing and read as a missing number. */
console.log('               pools: ' + (synth.poolNames.join(' · ') || 'none') + '   readouts: ' + (synth.poolValues.join(' · ') || 'none (pips)'))
console.log('')

/* ── it is there, and it is where it was designed to be ──────────────── */
check('the rail is painted', !!his.rail, his.rail ? his.rail.h + 'px tall' : 'MISSING')
check('it sits below the list and above the footer',
  !!(his.rail && his.body && his.edge && his.rail.top >= his.body.bottom - 1 && his.rail.bottom <= his.edge.top + 1),
  his.rail ? 'body ends ' + his.body?.bottom + ' · rail ' + his.rail.top + '–' + his.rail.bottom + ' · footer starts ' + his.edge?.top : 'n/a')
check('scrolling the list to its end does not move it',
  !!(his.rail && scrolled.rail && scrolled.rail.top === his.rail.top),
  'top ' + his.rail?.top + ' → ' + scrolled.rail?.top)
check('it is inside the 844px window', !!(his.rail && his.rail.bottom <= 844), 'bottom ' + his.rail?.bottom)

/* ── decision 6, answered in pixels ──────────────────────────────────── */
check('nothing on the rail is painted past its right edge (his export)',
  !!(his.overflow && his.overflow.past.length === 0), his.overflow?.past.join(', ') || 'none past ' + his.rail?.right)
check('and the rail is not hiding the rest behind a scroller (his export)',
  !!(his.overflow && his.overflow.scrollW <= his.overflow.clientW + 1),
  'scrollWidth ' + his.overflow?.scrollW + ' vs client ' + his.overflow?.clientW)
check('nothing is painted past the right edge on the FULLER sheet',
  !!(synth.overflow && synth.overflow.past.length === 0), synth.overflow?.past.join(', ') || 'none past ' + synth.rail?.right)
check('and no scroller there either',
  !!(synth.overflow && synth.overflow.scrollW <= synth.overflow.clientW + 1),
  'scrollWidth ' + synth.overflow?.scrollW + ' vs client ' + synth.overflow?.clientW)
check('the fuller sheet needs more rows than his — the wrap is doing work',
  synth.rows > his.rows, 'his ' + his.rows + ' row(s) · synthetic ' + synth.rows + ' row(s)')
check('and the card still fits the window with it',
  !!(synth.rail && synth.rail.bottom <= 844 && synth.edge && synth.edge.bottom <= 845),
  'rail bottom ' + synth.rail?.bottom + ' · footer bottom ' + synth.edge?.bottom)

/* ── V-5b ────────────────────────────────────────────────────────────── */
check('every rail control clears the 48px press floor (V-5b)',
  his.railBtns.length > 0 && his.railBtns.every(b => b.h >= 48 && b.w >= 48),
  his.railBtns.filter(b => b.h < 48 || b.w < 48).map(b => b.n + ' ' + b.w + '×' + b.h).join(', ') || 'all ≥48×48')
check('including on the fuller sheet, where the pools add controls',
  synth.railBtns.length > his.railBtns.length && synth.railBtns.every(b => b.h >= 48 && b.w >= 48),
  synth.railBtns.length + ' controls, ' + (synth.railBtns.filter(b => b.h < 48 || b.w < 48).length) + ' under floor')

/* ── one number, one place ───────────────────────────────────────────── */
check('the read-only resource strip is GONE from the card', his.res === null && his.colC === null,
  his.res ? 'res still painted at ' + his.res.top : 'no .res, no colC')
check('and the card says so, so the tablet drops the empty column', his.hasRail === true, 'has-rail=' + his.hasRail)
check('every slot tier is painted in exactly one place',
  his.tierLabels.length > 0
    && his.tierLabels.length === new Set(his.tierLabels.map(t => t.split('=')[0])).size,
  his.tierLabels.join('  ') || 'none')
check('his slots are pressable — one control per slot, spent ones offering restore',
  /* 4 of 4 · 2 of 3 · 2 of 2 = 8 expend + 1 restore on the 2nd tier. Computed
     from the sheet, not typed, so this cannot drift when the sheet does. */
  his.slotNames.length === Object.values(SHEET.spellSlots).reduce((n, s) => n + s.max, 0),
  his.slotNames.length + ' controls for ' + Object.values(SHEET.spellSlots).reduce((n, s) => n + s.max, 0) + ' slots')
check('the 3rd tier his sheet wrongly carries is shown, not silently dropped',
  his.slotNames.some(n => /3rd/.test(n)),
  /* Item 4 is closed as "the app is right and the sheet is wrong" — the errata
     notice says so and offers the correction. A rail that quietly hid the tier
     would be editing his sheet by omission, which vitals.ts forbids. */
  his.slotNames.filter(n => /3rd/.test(n)).length + ' third-tier controls')

/* ── test 13, on the glass, both halves ──────────────────────────────── */
check('the class pools paint when the sheet carries them',
  synth.poolNames.some(n => /Lay on Hands/i.test(n)) && synth.poolNames.some(n => /Channel Divinity/i.test(n)),
  synth.poolNames.join(' · ') || 'none')
check('and they carry the block’s numbers, not a same-named feature’s',
  synth.poolValues.some(v => v === '35/35'), synth.poolValues.join(' · ') || 'none')
check('they paint NOTHING when the sheet carries neither route', none.poolNames.length === 0,
  none.poolNames.join(' · ') || 'no pool controls')
check('and the screen does not fall over for want of them',
  none.boundary === false && !!none.rail, none.rail ? 'rail still ' + none.rail.h + 'px' : 'NO RAIL')

/* ── the presses reach real state ────────────────────────────────────── */
check('«Reset» opens an economy that was fully spent',
  !!(spentBefore.turnActions && Object.values(spentBefore.turnActions).every(Boolean)
     && afterReset.turnActions && Object.values(afterReset.turnActions).every(v => v === false)),
  JSON.stringify(spentBefore.turnActions) + ' → ' + JSON.stringify(afterReset.turnActions))
check('a pip press reaches his stored sheet',
  afterSlot.slot1 === SHEET.spellSlots['1'].current - 1,
  '1st level ' + afterReset.slot1 + ' → ' + afterSlot.slot1)
check('«End combat» ends the encounter — finding BH, finally called',
  afterEnd.inCombat === false && afterEnd.startCombat === 1 && afterEnd.endCombat === 0,
  'inCombat ' + spentBefore.inCombat + ' → ' + afterEnd.inCombat + ' · button now “' + (afterEnd.startCombat ? 'Start Combat' : '?') + '”')
check('and it was «End combat» before, never both at once',
  spentBefore.endCombat === 1 && spentBefore.startCombat === 0,
  spentBefore.endCombat + ' end · ' + spentBefore.startCombat + ' start')

check('a points-pool spend reaches his stored sheet',
  synth.loh === 35 && afterLoh.loh === 30, 'Lay on Hands ' + synth.loh + ' → ' + afterLoh.loh)
check('and a uses-pool press does too, by the same one handler',
  /* 2, because canon gives a level-7 paladin two Channel Divinity uses. Read
     BEFORE the press and asserted, so a fixture the app has quietly clamped
     cannot be mistaken for a spend the rail performed. */
  afterLoh.cd === 2 && afterCd.cd === 1, 'Channel Divinity ' + afterLoh.cd + ' → ' + afterCd.cd)

/* ── look up ─────────────────────────────────────────────────────────── */
check('«Look up» is on the rail and opens the panel',
  his.lookup === 1 && his.lookupOpen === false && lookedUp.lookupOpen === true,
  'closed ' + his.lookupOpen + ' → open ' + lookedUp.lookupOpen)

/* ── the dice, and the half that proves the probe is not blind ───────── */
check('there is no dead dice button on ?d=1', his.dice === 0,
  /* CORRECT, and not a miss. App.tsx's preview branch mounts TurnLive OUTSIDE
     Layout, and Layout owns the dice provider — so `useDiceDock()` returns null
     and the rail declines to paint a control that could open nothing. The dock
     itself is proved by TurnRail.test.tsx with a provider supplied; it arrives
     on the glass at slice 8, when the flag goes off and the card renders inside
     Layout. */
  his.dice + ' dice control(s) — no provider outside Layout')
check('the same probe DOES find one on the legacy tab', legacy.dice === 1,
  legacy.dice + ' on ' + BASE + ' (the deck docks it)')
check('and the same probe finds slot controls there too, so it is not blind',
  legacy.slotNames.length > 0, legacy.slotNames.length + ' slot controls on the legacy tab')

check('every control the run needed was reachable', unreachable.length === 0, unreachable.join(' | ') || 'reached')
check('no page errors', errs.length === 0, errs.join(' | ') || 'none')

for (const c of checks) console.log((c.ok ? '  ok  ' : '  RED ') + '  ' + c.id.padEnd(62) + c.evidence)
const red = checks.filter(c => !c.ok)
console.log('\n' + (checks.length - red.length) + '/' + checks.length + ' green' + (red.length ? '  ·  RED: ' + red.map(c => c.id).join(', ') : '') + '\n')
process.exit(red.length ? 1 : 0)
