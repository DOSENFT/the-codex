/* ============================================================================
   SLICE 5 — A ROW OPENS AND SPENDS, AND ONE ROW CARRIES ITS OWN CONTROL.
   ----------------------------------------------------------------------------
     node docs/plans/your-turn/prove-slice5.mjs

   `TurnRow.test.tsx` proves the MARKUP: the two shapes of `Act`, that an extra
   never nests a button inside a button, that the predicate picks one option out
   of fourteen. It cannot prove any of the three things this slice was actually
   commissioned to answer, because `renderToStaticMarkup` renders once and
   cannot press anything:

     · THAT A PRESS NO LONGER SPENDS. Until this slice a tap on a row called
       `combat.take` directly — one touch burned the resource with nothing on
       screen first saying what it cost. The claim is that the same tap now
       opens a sheet and leaves the economy alone, and "leaves the economy
       alone" is a fact about stored state, not about markup.
     · THAT THE SHEET THEN SPENDS. A sheet that opens and cannot spend is the
       🔴 half-built-feature rule with better typography.
     · THAT THE CAPTURE IS UNDER THE RIGHT ROW. Two components can print the
       same button anywhere; only geometry says which card it is inside of
       (Finding Q — measure painted rectangles, never `textContent`).

   AND THE NEGATIVE HALF, per HANDOFF §4 — a negative marker cannot be checked
   by looking for it. "No capture on the Hearthfire Manifest bonus-action row"
   would also be reported by a probe that could not see captures at all, so the
   same probe is run against the legacy tab, where `ReactionsBand` has painted
   one since Table Truth.

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

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

/* THE REACTION ALREADY SPENT. This is the state item 7 is actually about: the
   cloak has just burned somebody, which is why there is a number to record —
   and it is the state in which the row is BLOCKED. If `disabled` rode the card
   rather than the hit target, the capture would be dead at the one moment it
   is needed, and it would look identical to a capture that worked. */
const REACTION_SPENT = {
  ...IN_COMBAT,
  turnActions: { action: false, bonusAction: false, reaction: true, movement: false },
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
  const buttons = [...document.querySelectorAll('button')].filter(painted)

  /* THE CAPTURE, BY THE ACCESSIBLE NAME IT GIVES ITSELF — never by a class and
     never by the "+1d10 retaliation" prose, either of which a restyle is free
     to change. `RetaliationCapture` labels its standing button
     `Record 1d10 Fire retaliation`. */
  const captures = buttons
    .filter(b => /^Record .* retaliation$/i.test(name(b)))
    .map(b => ({ n: name(b), ...rect(b) }))

  /* WHICH CARD EACH ONE IS INSIDE OF, measured by containment rather than by
     walking the DOM: geometry is what Marcus's eye uses, and a control that is
     a descendant of the right node but painted somewhere else entirely would
     satisfy a DOM check and fail him. The card's name is its `.anm` span. */
  const cards = [...document.querySelectorAll('.dturn .act')].filter(painted).map(el => {
    const r = rect(el)
    const anm = el.querySelector('.anm')
    const cost = el.querySelector('.cost')
    /* THE COST, NOT JUST THE NAME. On his own export "Hearthfire Manifest" is
       painted THREE times — once in Action, once in Bonus, once in Reaction —
       so a claim written in names cannot say which one carries the capture, and
       the first draft of this prover could not tell the fault from the fix. */
    return {
      name: anm ? flat(anm) : '',
      cost: cost ? flat(cost) : '',
      hasx: el.classList.contains('hasx'),
      ...r,
    }
  })
  const inside = (a, b) =>
    a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1
  const captureHosts = captures.map(cap => {
    const host = cards.find(c => inside(cap, c))
    return host ? host.name + ' [' + host.cost + ']' : '(no card)'
  })

  /* THE HIT TARGET AND THE CARD ARE DIFFERENT ELEMENTS ON AN EXTRA-BEARING
     ROW, and only one of them may be disabled. Read off the DOM because
     `disabled` is a property, not a pixel. */
  const hasxRows = [...document.querySelectorAll('.dturn .act.hasx')].map(el => {
    const hit = el.querySelector('button.acthit')
    return {
      name: flat(el.querySelector('.anm') || { textContent: '' }),
      blocked: el.classList.contains('blocked'),
      hitDisabled: hit ? hit.disabled : null,
      cardIsButton: el.tagName === 'BUTTON',
      /* Nested buttons would be silently un-nested by the parser, so the count
         seen here is the count that SURVIVED — which is the only count that
         matters. */
      buttons: el.querySelectorAll('button').length,
      opacity: getComputedStyle(el).opacity,
      hitOpacity: hit ? getComputedStyle(hit).opacity : null,
    }
  })

  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
  const confirmInput = [...document.querySelectorAll('input')].filter(painted)
    .find(i => / retaliation damage$/i.test(i.getAttribute('aria-label') || ''))

  let combat = null
  try { combat = JSON.parse(localStorage.getItem('codex-combat-' + window.__id) || 'null') } catch { combat = null }
  let sheet = null
  try { sheet = JSON.parse(localStorage.getItem('codex-character-' + window.__id) || 'null') } catch { sheet = null }

  return {
    captures,
    captureHosts,
    hasxRows,
    cards: cards.map(c => ({ name: c.name, cost: c.cost, hasx: c.hasx })),
    cardNames: cards.map(c => c.name),
    /* Every painted press target on the card, for V-5b. The capture's chips
       come from the legacy tab's stylesheet, which has its own floor. */
    captureChips: [...document.querySelectorAll('.dturn .actx button')].filter(painted)
      .map(b => ({ n: name(b), ...rect(b) })),
    dialogOpen: !!(dialog && painted(dialog)),
    dialogLabel: dialog ? dialog.getAttribute('aria-label') : null,
    /* SCOPED TO THE DIALOG, AND A BARE PREFIX — no `$`, and no `\b` either.
       The button carries two spans, "Spend" over the cost it will spend. It
       READS "Spend / Action"; it SERIALISES as `SpendAction`, because
       `textContent` concatenates adjacent elements with nothing between them.
       So `^Spend$` found nothing, and `^Spend\b` found nothing either — there
       is no word boundary between "Spend" and "Action" in the string, only on
       the screen. Both readings reported a missing control on a sheet that had
       it, and three further reds downstream of the one bad reading. Same family
       as Finding Q: what the markup serialises to is not what the eye sees.

       Scoped to the dialog because the rail labels its own controls "Spend 5
       Lay on Hands", and a bare prefix would reach those on a sheet with
       pools. */
    spendVisible: !!(dialog && [...dialog.querySelectorAll('button')].filter(painted)
      .some(b => /^Spend/i.test(flat(b)))),
    confirmOpen: !!confirmInput,
    confirmValue: confirmInput ? confirmInput.value : null,
    boundary: /something went wrong|surface failed/i.test(document.body.innerText || ''),
    turnActions: combat?.turnActions ?? null,
    retaliation: combat?.retaliation ?? null,
    slots: sheet?.spellSlots ?? null,
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
  const hit = await page.evaluate(src => {
    const rx = new RegExp(src)
    const b = [...document.querySelectorAll('button')].find(e =>
      rx.test(e.getAttribute('aria-label') || (e.textContent || '').replace(/\s+/g, ' ').trim()))
    if (!b) return false
    b.click()
    return true
  }, re.source).catch(e => { unreachable.push(String(e.message).split('\n')[0]); return true })
  if (!hit) unreachable.push('no control matching ' + re)
  await page.waitForTimeout(450)
}

/** Press an option row by the name printed on it. The row is `button.act` on an
 *  ordinary option and `button.acthit` inside the card on one that carries an
 *  extra, so both are looked at — a probe that knew only the old shape would
 *  report the new one as missing. */
const pressRow = async (page, label) => {
  const hit = await page.evaluate(text => {
    const rows = [...document.querySelectorAll('button.act, button.acthit, button.face')]
    const b = rows.find(e => {
      const anm = e.querySelector('.anm, .fnm')
      return anm && (anm.textContent || '').replace(/\s+/g, ' ').trim() === text
    })
    if (!b) return false
    b.click()
    return true
  }, label)
  if (!hit) unreachable.push('no row named ' + label)
  await page.waitForTimeout(450)
}

/* ── 1 · his export, in combat: the row opens and does NOT spend ────────── */
const page = await visit(HIS, IN_COMBAT, APP, 'slice5-rows')
const before = await page.evaluate(MEASURE)

/* HIS WEAPON, NOT THE FIXTURE'S. Written first as "Hearthbrand" — which is
   what `NIX` carries — and there is no such row on his export: his blade is
   "The Dawn Guardian". The prover reported four reds that were all one thing,
   a row it had never found. Measure against his real export, never against the
   fixture (HANDOFF §4). */
await pressRow(page, 'The Dawn Guardian')
const opened = await page.evaluate(MEASURE)

/* ── 2 · and the sheet is what spends ──────────────────────────────────── */
/* Pressed INSIDE the dialog, for the reason `spendVisible` gives: the rail
   labels its own controls "Spend N <pool>", and a prover that reached one of
   those would report a spend the sheet never performed. */
const pressedSpend = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"][aria-modal="true"]')
  const b = d && [...d.querySelectorAll('button')]
    .find(e => /^Spend/i.test((e.textContent || '').replace(/\s+/g, ' ').trim()))
  if (!b) return false
  b.click()
  return true
})
if (!pressedSpend) unreachable.push('no Spend button inside the open sheet')
await page.waitForTimeout(450)
const spent = await page.evaluate(MEASURE)

/* ── 3 · the capture, in the card it belongs to ────────────────────────── */
const rPage = await visit(HIS, IN_COMBAT, APP, 'slice5-retaliation')
const rBefore = await rPage.evaluate(MEASURE)
await press(rPage, /^Record .* retaliation$/)
const rolled = await rPage.evaluate(MEASURE)
await press(rPage, /^Add$/)
const recorded = await rPage.evaluate(MEASURE)

/* ── 4 · the reaction already spent — the state item 7 is actually about ── */
const bPage = await visit(HIS, REACTION_SPENT, APP, 'slice5-blocked')
const blocked = await bPage.evaluate(MEASURE)
await press(bPage, /^Record .* retaliation$/)
const blockedRolled = await bPage.evaluate(MEASURE)

/* ── 5 · the same probe, on the legacy tab ─────────────────────────────── */
const lPage = await visit(HIS, IN_COMBAT, BASE, null)
const legacy = await lPage.evaluate(MEASURE)

await browser.close()

/* ── the report ────────────────────────────────────────────────────────── */
const checks = []
const check = (id, ok, evidence) => checks.push({ id, ok, evidence })

console.log('\nSLICE 5 — THE ROW OPENS · ?d=1 · Nix level ' + SHEET.level + ' · 390×844 · round 3\n')
console.log('  rows on screen   ' + before.cardNames.filter(Boolean).join(' · '))
console.log('  captures         ' + (before.captures.map(c => c.n + ' ' + c.w + '×' + c.h).join(' · ') || 'NONE'))
console.log('  hosted by        ' + (before.captureHosts.join(' · ') || 'n/a'))
console.log('  extra-bearing    ' + (before.hasxRows.map(r => r.name + ' [' + r.buttons + ' buttons, hit ' + (r.hitDisabled ? 'disabled' : 'live') + ']').join(' · ') || 'none'))
console.log('')

/* ── the press opens, and only opens ─────────────────────────────────── */
check('no sheet is open before anything is pressed', before.dialogOpen === false, 'dialog ' + before.dialogOpen)
check('pressing a row OPENS the detail sheet', opened.dialogOpen === true, 'label “' + opened.dialogLabel + '”')
check('and the sheet is about the row that was pressed',
  /Dawn Guardian/i.test(opened.dialogLabel || ''), opened.dialogLabel || 'no label')
check('pressing a row does NOT spend — the fault this slice removes',
  before.turnActions?.action === false && opened.turnActions?.action === false,
  'action ' + before.turnActions?.action + ' → ' + opened.turnActions?.action)
check('the sheet offers the spend', opened.spendVisible === true, 'Spend button ' + opened.spendVisible)
check('and «Spend» IS what spends',
  spent.turnActions?.action === true,
  'action ' + opened.turnActions?.action + ' → ' + spent.turnActions?.action)
check('and it closes on a successful spend', spent.dialogOpen === false, 'dialog ' + spent.dialogOpen)

/* ── one capture, under one card ─────────────────────────────────────── */
check('exactly one retaliation capture is on the card', before.captures.length === 1,
  before.captures.length + ' — ' + (before.captures.map(c => c.n).join(', ') || 'none'))
check('it is painted INSIDE a REACTION row, measured by geometry',
  before.captureHosts.length === 1 && /\[Reaction\]$/i.test(before.captureHosts[0] || ''),
  'host: ' + (before.captureHosts[0] || 'none'))

/* ── THE DUPLICATE THAT WOULD HAVE SHIPPED ───────────────────────────────
   His export paints "Hearthfire Manifest" THREE times: once priced as an
   Action, once as a Bonus action, once as a Reaction. The feature carries one
   free 1d10, so the ungated question — "does this option's canon feature have
   a free die?" — says yes to all three, and the capture would have printed
   three times on one card. That is item 6's own fault, one thing in several
   places, rebuilt inside the fix for item 7.

   This is the check that names it, and it is written to be UNSATISFIABLE BY
   ACCIDENT: it requires the duplicates to still be on screen, so it cannot go
   green by the rows having quietly disappeared. */
const sameName = before.cards.filter(c => /Hearthfire Manifest/i.test(c.name))
check('his sheet really does paint that feature on three different rows',
  sameName.length === 3 && new Set(sameName.map(c => c.cost)).size === 3,
  sameName.map(c => c.cost).join(' · ') || 'none')
check('and only the Reaction one carries the capture',
  sameName.filter(c => c.hasx).length === 1
    && /^Reaction$/i.test(sameName.find(c => c.hasx)?.cost || ''),
  sameName.map(c => c.cost + '=' + (c.hasx ? 'capture' : '—')).join(' · '))
check('exactly one card carries an extra at all', before.hasxRows.length === 1,
  before.hasxRows.map(r => r.name).join(', ') || 'none')

/* ── the shape that keeps it pressable ───────────────────────────────── */
check('the extra-bearing card is a DIV, not a button',
  before.hasxRows.every(r => r.cardIsButton === false),
  /* A button inside a button is dropped by the browser — the control would
     paint and do nothing. ReactionRow.tsx:192 found exactly this on the legacy
     tab. Read off the parsed DOM, which is where the dropping happens. */
  before.hasxRows.map(r => r.name + '=' + (r.cardIsButton ? 'BUTTON' : 'div')).join(', ') || 'none')
check('and both of its buttons survived the parser',
  before.hasxRows.every(r => r.buttons >= 2),
  before.hasxRows.map(r => r.name + ' ' + r.buttons).join(', ') || 'none')

/* ── the roll reaches the encounter ──────────────────────────────────── */
check('pressing it rolls and offers the number for correction',
  rolled.confirmOpen === true && Number(rolled.confirmValue) >= 1 && Number(rolled.confirmValue) <= 10,
  'rolled ' + rolled.confirmValue + ' on 1d10')
check('nothing was tallied before Add', (rBefore.retaliation?.total ?? 0) === 0,
  JSON.stringify(rBefore.retaliation ?? null))
check('«Add» records it against the stored encounter',
  recorded.retaliation?.hits === 1 && recorded.retaliation?.total === Number(rolled.confirmValue),
  JSON.stringify(recorded.retaliation ?? null) + ' for a rolled ' + rolled.confirmValue)

/* ── the blocked row, which is the state item 7 is about ─────────────── */
check('with the reaction spent the row IS blocked',
  blocked.hasxRows.length === 1 && blocked.hasxRows[0].blocked === true
    && blocked.hasxRows[0].hitDisabled === true,
  'blocked=' + blocked.hasxRows[0]?.blocked + ' hitDisabled=' + blocked.hasxRows[0]?.hitDisabled)
check('but the capture is not dimmed with it',
  blocked.hasxRows[0]?.opacity === '1' && blocked.hasxRows[0]?.hitOpacity !== '1',
  'card opacity ' + blocked.hasxRows[0]?.opacity + ' · hit target ' + blocked.hasxRows[0]?.hitOpacity)
check('and it still rolls — the one control that must work when the row cannot',
  blockedRolled.confirmOpen === true, 'confirm strip ' + blockedRolled.confirmOpen)

/* ── V-5b, on a component shared with the legacy tab ─────────────────── */
check('every control inside the extra clears the 48px press floor (V-5b)',
  before.captureChips.length > 0 && before.captureChips.every(b => b.h >= 48 && b.w >= 48),
  before.captureChips.map(b => b.n + ' ' + b.w + '×' + b.h).join(' · ') || 'no chips found')

/* ── the negative half ───────────────────────────────────────────────── */
check('the same probe finds a capture on the legacy tab, so it is not blind',
  legacy.captures.length >= 1, legacy.captures.length + ' on ' + BASE)
check('and the same probe finds rows there — .act is D-only, so this is the floor',
  legacy.captures.length >= 1 && legacy.captureHosts.every(h => h === '(no card)'),
  'legacy hosts: ' + (legacy.captureHosts.join(', ') || 'none'))

check('no error boundary anywhere in the run',
  [before, opened, spent, rBefore, rolled, recorded, blocked, blockedRolled].every(m => m.boundary === false),
  'clean')
check('every control the run needed was reachable', unreachable.length === 0, unreachable.join(' | ') || 'reached')
check('no page errors', errs.length === 0, errs.join(' | ') || 'none')

for (const c of checks) console.log((c.ok ? '  ok  ' : '  RED ') + '  ' + c.id.padEnd(62) + c.evidence)
const red = checks.filter(c => !c.ok)
console.log('\n' + (checks.length - red.length) + '/' + checks.length + ' green' + (red.length ? '  ·  RED: ' + red.map(c => c.id).join(', ') : '') + '\n')
process.exit(red.length ? 1 : 0)
