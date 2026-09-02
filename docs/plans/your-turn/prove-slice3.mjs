/* ============================================================================
   SLICE 3 — HIS BODY, INSIDE THE CARD, ON THE GLASS.
   ----------------------------------------------------------------------------
     node docs/plans/your-turn/prove-slice3.mjs

   The component tests prove the markup: `variant='bare'` drops the readout and
   keeps every control. They cannot prove the thing item 10 is actually about —

     "Right now, the app displays my hit points in like 3 different locations."

   — because that is a claim about the SCREEN. Two readouts rendered by two
   components are two strings in the markup either way; only geometry says
   whether they are two places a man can look. Finding Q: a probe that reads
   textContent proves the model, not the screen.

   So this file counts PLACES — distinct painted top-left corners carrying his
   `n / max` — using the same definition `prove-capabilities.mjs` uses for its
   `hp-painted-once` pin, and it counts them on BOTH screens: `?d=1`, where the
   answer must be 1, and the legacy screen, where the answer must be more than
   1. HANDOFF §4: a negative marker cannot be checked by looking for it. "One
   place" is a negative, and the legacy screen is the half that shows this probe
   can still see a second one when there is a second one to see.

   Everything else here is the rest of slice 3's declared proof: the controls he
   named survive the move at a size he can hit, the conditions fold opens, death
   saves appear only at 0 HP, a damage entry LANDS and turns the bar — and test
   17, that merely loading the screen writes nothing to his sheet.

   His export is never edited on disk. Every fixture is an in-memory clone
   seeded into localStorage, and the clone is what the browser reads.
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
const AT_ZERO = (() => { const c = clone(); c.hitPoints.current = 0; return c })()
/* HE IS ALREADY BLOODIED ON HIS OWN EXPORT — 3 of 67, and the mark is at 33.
   The colour-change half of item 10 ("the color changing aspect of the hit
   point tracker") cannot be measured on a bar that is already red, so the
   damage entry is run on a clone at full health, where crossing the mark is
   something the screen has to do rather than something it was born as. Every
   other measurement below is taken on his export as exported. */
const AT_FULL = (() => { const c = clone(); c.hitPoints.current = c.hitPoints.max; return c })()

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

/* Seed, then INSTRUMENT. The wrapper is installed inside the same init script,
   after the seed writes, so the seed does not count itself — and before any of
   the app's own modules load, so nothing can have captured the original first.

   `__seeded` keeps the exact string that was written, which is what makes test
   17's "byte-identical" a comparison rather than a hope. */
const seed = ([id, s, c, maxHp]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  window.__maxHp = maxHp
  window.__id = id
  window.__seeded = s
  window.__writes = []
  const raw = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (k, v) => { window.__writes.push(k); return raw(k, v) }
}

/* ── measured in the page ───────────────────────────────────────────────── */
const MEASURE = () => {
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  const flat = el => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const name = el => el.getAttribute('aria-label') || flat(el)
  const at = el => { const r = el.getBoundingClientRect(); return Math.round(r.top) + ':' + Math.round(r.left) }
  const buttons = [...document.querySelectorAll('button')].filter(painted)
  const byName = re => buttons.find(b => re.test(name(b)))

  /* $hpPlaces, copied from prove-capabilities.mjs so that "painted once" means
     exactly one thing in this phase. A place is a distinct painted top-left
     corner carrying `n / max` for HIS max — two components rendering the same
     number at the same coordinates would be one place, and that is right: he
     cannot see a duplicate that is not there. */
  const places = []
  {
    const re = /\b(\d+)\s*(?:\/|of)\s*(\d+)\b/
    const seen = new Set()
    for (const el of [...document.querySelectorAll('*')].filter(painted)) {
      const o = own(el)
      const all = flat(el)
      const m = re.exec(o) || (all.length < 14 ? re.exec(all) : null)
      if (!m) continue
      if (m[2] !== String(window.__maxHp)) continue
      const key = at(el)
      if (seen.has(key)) continue
      seen.add(key)
      places.push({ at: key, text: (o || all).slice(0, 30) })
    }
  }

  const ctl = re => {
    const b = byName(re)
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { name: name(b), h: Math.round(r.height), at: at(b) }
  }
  const box = sel => {
    const e = document.querySelector(sel)
    if (!e || !painted(e)) return null
    const r = e.getBoundingClientRect()
    return { top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right), h: Math.round(r.height) }
  }

  const foldBtn = buttons.find(b => /Active Conditions/i.test(flat(b)))
  const grid = foldBtn?.parentElement
    ? [...foldBtn.parentElement.querySelectorAll('button')].filter(b => b !== foldBtn && painted(b))
    : []

  /* THE TWO INKS, RESOLVED FROM THEIR TOKENS, NOT FROM EACH OTHER.
     Written first as "the ink after ≠ the ink before", this check survived a
     mutation that painted the bloodied bar `--d-amber` — the LIVE colour, the
     one the lit row and the ready pip wear. The ink had changed, so the check
     was green, and the bar was telling him he was healthy in the colour of
     "ready". "It changed" is not the claim; "it is the wound colour now, and
     was the gold before" is. */
  const swatch = v => {
    const p = document.createElement('span')
    p.style.cssText = 'background:var(' + v + ');position:absolute;width:1px;height:1px'
    document.body.appendChild(p)
    const ink = getComputedStyle(p).backgroundColor
    p.remove()
    return ink
  }
  const hp = document.querySelector('.dturn .vitals .hp')
  const fill = document.querySelector('.dturn .hprow .fill')
  const blabel = document.querySelector('.dturn .hprow .blabel')

  return {
    places,
    gold: swatch('--d-gold'),
    ember: swatch('--d-ember'),
    dReadout: hp && painted(hp) ? { text: own(hp), at: at(hp) } : null,
    fill: fill ? { cls: fill.className, ink: getComputedStyle(fill).backgroundColor } : null,
    blabel: blabel ? flat(blabel) : null,
    damage: ctl(/^Apply damage$/i),
    heal: ctl(/^Apply healing$/i),
    temp: ctl(/^Set temporary hit points$/i),
    conditions: foldBtn
      ? { text: flat(foldBtn), expanded: foldBtn.getAttribute('aria-expanded'), h: Math.round(foldBtn.getBoundingClientRect().height) }
      : null,
    conditionCells: grid.length,
    conditionFloor: grid.length ? Math.min(...grid.map(b => Math.round(b.getBoundingClientRect().height))) : null,
    /* Death saves, by the component's OWN accessible names — three of them, and
       the heading. Absent at 41 HP, present at 0; both halves are checked, so a
       selector that matched nothing anywhere could not read as a pass. */
    deathSaves: buttons.filter(b => /^Add death save/i.test(name(b))).length,
    vitals: box('.dturn .vitals'),
    vctl: box('.dturn .vctl'),
    writes: (window.__writes || []).filter(k => k === 'codex-character-' + window.__id).length,
    allWrites: (window.__writes || []).length,
    stored: localStorage.getItem('codex-character-' + window.__id),
    identical: localStorage.getItem('codex-character-' + window.__id) === window.__seeded,
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

async function visit(sheet, url, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
  })
  await ctx.addInitScript(seed, [sheet.id, JSON.stringify(sheet), JSON.stringify(IN_COMBAT), sheet.hitPoints.max])
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  if (shot) await page.screenshot({ path: `docs/plans/your-turn/_shots/${shot}.png` }).catch(() => {})
  return page
}

/* ── the card ──────────────────────────────────────────────────────────── */
const page = await visit(HIS, APP, 'slice3-vitals')
const card = await page.evaluate(MEASURE)

/* Open the conditions fold — the tap he makes. A fold that reports
   aria-expanded="true" and paints no cells has hidden the feature, not folded
   it, so the cells are counted and measured. */
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(e => /Active Conditions/i.test(e.textContent || ''))
  b?.click()
})
await page.waitForTimeout(350)
const opened = await page.evaluate(MEASURE)

/* ── the damage entry, on a clone at full health ───────────────────────── */
const fullPage = await visit(AT_FULL, APP, null)
const full = await fullPage.evaluate(MEASURE)

/* The amount is COMPUTED from the bar's own bloodied threshold rather than
   picked, so this crosses the mark on any sheet: one point past "Bloodied at
   n" is the smallest hit that must change the colour. */
const mark = Number(/Bloodied at (\d+)/.exec(full.blabel ?? '')?.[1] ?? NaN)
const before = Number(full.dReadout?.text ?? NaN)
const DMG = Number.isFinite(mark) && Number.isFinite(before) ? before - mark + 1 : 5

/* Wrapped, and not for tidiness. Mutation M1 — the declared revert, the one
   line in `TurnLive` deleted — takes the damage button off the screen, and an
   un-guarded `page.fill` then THROWS, killing the run before a single result is
   printed. A prover that dies instead of going red has told me only that
   something is wrong. The reds below say which four things. */
try {
  await fullPage.evaluate(() => {
    [...document.querySelectorAll('button')].find(b => /^Apply damage$/i.test(b.getAttribute('aria-label') || ''))?.click()
  })
  await fullPage.waitForTimeout(250)
  await fullPage.fill('input[aria-label="damage amount"]', String(DMG), { timeout: 3000 })
  await fullPage.evaluate(() => {
    [...document.querySelectorAll('button')].find(b => /^Apply$/i.test((b.textContent || '').trim()))?.click()
  })
} catch (e) {
  unreachable.push(String(e.message).split('\n')[0])
}
await fullPage.waitForTimeout(1200)
const hit = await fullPage.evaluate(MEASURE)

/* ── 0 HP, for the other half of the death-save check ──────────────────── */
const zeroPage = await visit(AT_ZERO, APP, 'slice3-zero')
const zero = await zeroPage.evaluate(MEASURE)

/* ── the legacy screen, with the same probe ────────────────────────────── */
const legacyPage = await visit(HIS, BASE, null)
const legacy = await legacyPage.evaluate(MEASURE)

/* ── test 17: a cold load, untouched ───────────────────────────────────── */
const coldPage = await visit(HIS, APP, null)
const cold = await coldPage.evaluate(MEASURE)

await browser.close()

/* ── the report ────────────────────────────────────────────────────────── */
const checks = []
const check = (id, ok, evidence) => checks.push({ id, ok, evidence })

console.log('\nSLICE 3 — HIS BODY IN THE CARD · ?d=1 · Nix ' + SHEET.hitPoints.current + '/' + SHEET.hitPoints.max + ' · 390×844 · round 3\n')
console.log('  places carrying "n / ' + SHEET.hitPoints.max + '":')
console.log('    ?d=1    ' + (card.places.map(p => p.text + ' @' + p.at).join('   ') || 'none'))
console.log('    legacy  ' + (legacy.places.map(p => p.text + ' @' + p.at).join('   ') || 'none'))
console.log('')

check('his hit points are painted in exactly ONE place', card.places.length === 1, card.places.length + ' place(s)')
check('and the one place is D’s own readout', card.places.length === 1 && card.places[0].at === card.dReadout?.at,
  'readout ' + card.dReadout?.text + ' @' + card.dReadout?.at)
/* THE HALF THAT MAKES THE ABOVE EVIDENCE. The same function, the same sheet,
   the same viewport — on the screen slice 8 has not switched off yet, where he
   counted three. If this ever goes green-by-being-1, the probe has gone blind
   and the check above is passing for the wrong reason. */
check('the same probe still finds more than one on the legacy screen', legacy.places.length > 1,
  legacy.places.length + ' place(s) on ' + BASE)

check('damage · heal · temp HP are all on the card', !!(card.damage && card.heal && card.temp),
  [card.damage, card.heal, card.temp].map(c => c?.name ?? 'MISSING').join(' · '))
check('every control clears the 48px floor (V-5b)',
  [card.damage, card.heal, card.temp].every(c => c && c.h >= 48),
  [card.damage, card.heal, card.temp].map(c => (c?.h ?? 0) + 'px').join(' · '))
check('the controls sit INSIDE the vitals section',
  !!(card.vctl && card.vitals && card.vctl.top >= card.vitals.top && card.vctl.bottom <= card.vitals.bottom),
  card.vctl ? 'vctl ' + card.vctl.top + '–' + card.vctl.bottom + ' inside vitals ' + card.vitals?.top + '–' + card.vitals?.bottom : 'no .vctl painted')

check('the conditions fold is on the card, closed, and says so',
  card.conditions?.expanded === 'false' && /None|,/.test(card.conditions.text),
  card.conditions ? '“' + card.conditions.text + '” expanded=' + card.conditions.expanded + ' ' + card.conditions.h + 'px' : 'MISSING')
check('the fold header clears 48px', (card.conditions?.h ?? 0) >= 48, (card.conditions?.h ?? 0) + 'px')
check('one tap opens it and paints the cells',
  opened.conditions?.expanded === 'true' && opened.conditionCells > 0,
  opened.conditionCells + ' cells, expanded=' + opened.conditions?.expanded)
check('every condition cell clears 48px', (opened.conditionFloor ?? 0) >= 48, (opened.conditionFloor ?? 0) + 'px min')

check('death saves are NOT on the card at ' + SHEET.hitPoints.current + ' HP', card.deathSaves === 0, card.deathSaves + ' death-save buttons')
check('death saves ARE on the card at 0 HP', zero.deathSaves === 6, zero.deathSaves + ' death-save buttons (3 success · 3 failure)')

check('a damage entry lands', hit.dReadout?.text === String(before - DMG),
  before + ' − ' + DMG + ' → ' + hit.dReadout?.text)
check('and the bar was the gold before the hit', full.fill?.ink === full.gold, full.fill?.ink + ' vs --d-gold ' + full.gold)
check('and the bar is the wound colour after it',
  hit.fill?.ink === hit.ember && /\blow\b/.test(hit.fill?.cls ?? ''),
  hit.fill?.ink + ' vs --d-ember ' + hit.ember)
check('and the mark says so in words too', hit.blabel === 'Bloodied' && full.blabel !== 'Bloodied',
  '“' + full.blabel + '” → “' + hit.blabel + '”')
check('and it reached his sheet', (() => {
  try { return JSON.parse(hit.stored ?? '{}').hitPoints?.current === before - DMG } catch { return false }
})(), 'stored current = ' + (() => { try { return JSON.parse(hit.stored ?? '{}').hitPoints?.current } catch { return '?' } })())

/* TEST 17. The instrument is proved by the damage run above: it counted the
   write that actually happened, so a zero here is a measured zero and not a
   broken counter. */
check('the write counter can count — it saw the damage save', hit.writes > 0, hit.writes + ' write(s) after applying damage')
check('a cold load writes to his sheet 0 times', cold.writes === 0, cold.writes + ' write(s) · ' + cold.allWrites + ' to all keys')
check('and his stored sheet is byte-identical after the load', cold.identical === true, cold.identical ? 'identical' : 'CHANGED')

check('the damage entry was reachable at all', unreachable.length === 0, unreachable.join(' | ') || 'reached')
check('no page errors', errs.length === 0, errs.join(' | ') || 'none')

console.log('  vitals ' + card.vitals?.top + '–' + card.vitals?.bottom + '   vctl ' + card.vctl?.top + '–' + card.vctl?.bottom)
console.log('  damage entry: ' + before + ' HP, mark at ' + mark + ', applied ' + DMG + ' → ' + hit.dReadout?.text)
console.log('  cold load wrote ' + cold.allWrites + ' key(s) in total, ' + cold.writes + ' of them his sheet\n')

for (const c of checks) console.log((c.ok ? '  ok  ' : '  RED ') + '  ' + c.id.padEnd(52) + c.evidence)
const red = checks.filter(c => !c.ok)
console.log('\n' + (checks.length - red.length) + '/' + checks.length + ' green' + (red.length ? '  ·  RED: ' + red.map(c => c.id).join(', ') : '') + '\n')
process.exit(red.length ? 1 : 0)
