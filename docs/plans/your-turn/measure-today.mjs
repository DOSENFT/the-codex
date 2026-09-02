/* The "Your Turn" consolidation — WHAT THE COMBAT TAB IS TODAY.
 *
 *   node docs/plans/your-turn/measure-today.mjs
 *
 * Gate 1 research, and deliberately a MEASUREMENT and not a proof: there is
 * nothing here to pass or fail. Marcus's items 6 and 11 say the same thing
 * twice — consolidate "without losing any features. Nor the visuals" — and a
 * "do not lose this" list assembled by reading the code would be exactly the
 * failure this project has now paid for three times:
 *
 *     a thing that models the app after the repair cannot show the fault
 *
 * (slice 1 the fixture, slice 5 the slice plan, slice 6 the program design).
 * So the list is taken off the glass, on his real exported sheet, at the size
 * of his phone, and it is allowed to surprise us. It did, three times, and each
 * correction is recorded in place below rather than quietly fixed.
 *
 * ── WHERE THIS PAGE ACTUALLY SCROLLS, WHICH IS THE WHOLE MEASUREMENT ────────
 *
 * The document does not scroll. `document.documentElement.scrollHeight` is 844
 * on an 844px viewport, so every position measured against the document, and
 * every "is this pinned to the glass" test, was answering a question the app
 * does not ask. The combat tab is a fixed shell with ONE internal scroller:
 *
 *     <main class="fixed left-0 right-0 top-14 overflow-y-auto bottom-[…]">
 *
 * Everything is therefore measured against THAT element: page positions are
 * `rect.top - mainRect.top + main.scrollTop`, and "furniture" means fixed,
 * reachable, and NOT the scroller or one of its ancestors. Get this wrong and
 * the probe reports the Turn deck as a module sitting in the scroll — which is
 * exactly what the first run of this file did.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'

const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const SHOTS = 'docs/plans/your-turn/_shots'
const APP = 'http://[::1]:4321/the-codex/'

const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))
const SEEDED = JSON.stringify(SHEET)

/* His numbers, read off his sheet rather than typed here, so the HP hunt is
   looking for HIS hit points and not for a number this file invented. The
   first run guessed `currentHP`/`maxHP` and got `undefined/undefined` — the
   sheet nests them under `hitPoints`. It still found the HP places, through
   aria, which is the only reason the mistake showed up at all. */
const HP = { cur: SHEET.hitPoints?.current, max: SHEET.hitPoints?.max, ac: SHEET.armorClass }
if (HP.cur === undefined || HP.max === undefined) {
  console.error('REFUSING: cannot read his hit points off the sheet — the HP hunt')
  console.error('would find nothing and report that as "not duplicated".')
  process.exit(2)
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium

mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch()

const seed = combat => ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem(
    'codex-roster',
    JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]),
  )
}

const open = async combat => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  await ctx.addInitScript(seed(combat), [SHEET.id, SEEDED, JSON.stringify(combat)])
  const page = await ctx.newPage()
  await page.goto(APP, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  return { ctx, page }
}

const READ = hp => {
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  /* Own text = direct child text nodes only. The leaf-walker used in phase 4
     could not see `<p><span>WHEN</span> bare text</p>` and reported every
     working trigger as missing. That lesson, applied. */
  const ownText = el =>
    [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  const allText = el => (el.textContent || '').replace(/\s+/g, ' ').trim()

  /* Closed overlays are `role="dialog"`, still in the DOM, translated out of
     view, `pointer-events: none`, under an `inert` ancestor. They are painted
     by every honest definition and interleaved 60 phantom rows through the
     first run's stack. `inert` is the app's own word for "cannot be reached". */
  const unreachable = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.hasAttribute && p.hasAttribute('inert')) return true
      if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return true
      if (getComputedStyle(p).pointerEvents === 'none') return true
    }
    return false
  }

  // ── the one scroller, and the furniture around it ──────────────────────────
  let main = null
  for (const el of document.querySelectorAll('*')) {
    if (unreachable(el)) continue
    const s = getComputedStyle(el)
    if (!/auto|scroll/.test(s.overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 40) continue
    if (!main || el.scrollHeight > main.scrollHeight) main = el
  }
  if (!main) return { error: 'no scroll container found' }
  const mainRect = main.getBoundingClientRect()
  const pageY = el =>
    Math.round(el.getBoundingClientRect().top - mainRect.top + main.scrollTop)

  const furniture = []
  for (const el of document.querySelectorAll('*')) {
    if (!painted(el) || unreachable(el)) continue
    if (getComputedStyle(el).position !== 'fixed') continue
    if (el === main || el.contains(main)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 24) continue
    /* A full-screen `bg-black/60` scrim belongs to a closed dialog and is not
       furniture. Furniture is something he can read or press. */
    const useful = allText(el).length > 0 || el.querySelector('button, input, select')
    if (!useful) continue
    if (furniture.some(f => f.el.contains(el))) continue
    furniture.push({ el, r })
  }
  const furnitureRows = furniture.map(f => ({
    label: f.el.getAttribute('aria-label') || allText(f.el).slice(0, 44) || f.el.tagName.toLowerCase(),
    top: Math.round(f.r.top),
    h: Math.round(f.r.height),
    pctOfScreen: +((f.r.height / innerHeight) * 100).toFixed(1),
  }))
  const furniturePx = furniture.reduce((n, f) => n + f.r.height, 0)

  const geometry = {
    screen: innerHeight,
    readingWindow: Math.round(main.clientHeight),
    contentHeight: Math.round(main.scrollHeight),
    furniturePx: Math.round(furniturePx),
    furniturePctOfScreen: +((furniturePx / innerHeight) * 100).toFixed(1),
    screensOfScrolling: +(main.scrollHeight / main.clientHeight).toFixed(2),
  }

  // ── 1. the stack, in the scroller, top to bottom ───────────────────────────
  const seen = new Set()
  const stack = []
  for (const el of main.querySelectorAll('section, [aria-label], h1, h2, h3, h4')) {
    if (!painted(el) || unreachable(el)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 14) continue
    const label = el.getAttribute('aria-label') || ownText(el) || allText(el).slice(0, 54)
    if (!label) continue
    const top = pageY(el)
    const key = label + '@' + top
    if (seen.has(key)) continue
    seen.add(key)
    stack.push({ tag: el.tagName.toLowerCase(), label, top, h: Math.round(r.height) })
  }
  stack.sort((a, b) => a.top - b.top || b.h - a.h)

  // ── 2. the duplications he named ───────────────────────────────────────────
  const moduleOf = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const l = p.getAttribute && p.getAttribute('aria-label')
      if (l) return l
    }
    return '(no landmark)'
  }
  const where = el => (main.contains(el) ? 'scroll@' + pageY(el) : 'PINNED@' + Math.round(el.getBoundingClientRect().top))

  const hpRe = new RegExp('\\b' + hp.cur + '\\s*(?:/|of)\\s*' + hp.max + '\\b')
  const hpPlaces = []
  const tempBadges = []
  const chipSets = {}
  const pipRows = []
  const yourTurn = []
  for (const el of document.querySelectorAll('*')) {
    if (!painted(el) || unreachable(el)) continue
    const own = ownText(el)
    if (own && hpRe.test(own)) {
      hpPlaces.push({ text: own.slice(0, 26), module: moduleOf(el), at: where(el) })
    }
    if (own && /^\+\d+\s*temp$/i.test(own)) {
      tempBadges.push({ text: own, module: moduleOf(el), at: where(el) })
    }
    if (own && /^(1st|2nd|3rd|4th|5th):?$/i.test(own)) {
      pipRows.push({ level: own, module: moduleOf(el), at: where(el) })
    }
    if (own && own.length <= 40 && /your\s*turn|the moment|turn deck/i.test(own)) {
      yourTurn.push({ text: own, tag: el.tagName.toLowerCase(), module: moduleOf(el), at: where(el) })
    }
  }
  /* HP is also painted as two leaves either side of a slash, which own-text
     cannot see. Catch those as containers whose WHOLE text is the fraction. */
  for (const el of document.querySelectorAll('*')) {
    if (!painted(el) || unreachable(el)) continue
    const t = allText(el)
    if (!hpRe.test(t)) continue
    if (t.replace(/\s/g, '').length > String(hp.cur + '/' + hp.max).length + 10) continue
    const at = where(el)
    if (hpPlaces.some(p => p.at === at)) continue
    hpPlaces.push({ text: t.slice(0, 26), module: moduleOf(el), at, split: true })
  }
  for (const el of document.querySelectorAll('button')) {
    if (!painted(el) || unreachable(el)) continue
    const name = (el.getAttribute('aria-label') || allText(el)).trim()
    if (!/^(action|bonus(\s*action)?|reaction|react|move|movement)(\s*:.*)?$/i.test(name)) continue
    const m = moduleOf(el)
    ;(chipSets[m] ||= []).push(name)
  }

  // ── 3. spell-slot pips, counted where they are ─────────────────────────────
  const slotButtons = {}
  for (const el of document.querySelectorAll('button')) {
    if (!painted(el) || unreachable(el)) continue
    const n = el.getAttribute('aria-label') || ''
    const m = /^(\d)(?:st|nd|rd|th) slot \d+: (expend|restore)$/.exec(n)
    if (!m) continue
    const mod = moduleOf(el)
    ;(slotButtons[mod] ||= { levels: new Set(), n: 0 })
    slotButtons[mod].levels.add(m[1])
    slotButtons[mod].n++
  }
  const slots = Object.fromEntries(
    Object.entries(slotButtons).map(([k, v]) => [k, { pips: v.n, levels: [...v.levels].sort().join(',') }]),
  )

  return { geometry, furnitureRows, stack, hpPlaces, tempBadges, chipSets, pipRows, slots, yourTurn }
}

const show = (t, v) => {
  console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length)))
  console.log(typeof v === 'string' ? v : v)
}

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}
const OUT_OF_COMBAT = { ...IN_COMBAT, inCombat: false, round: 0 }

console.log('Nix — HP ' + HP.cur + '/' + HP.max + ', AC ' + HP.ac + ' · 390×844 · his real export')

const A = await open(IN_COMBAT)
const a = await A.page.evaluate(READ, HP)
console.log('\n\n████ IN COMBAT (round 3, nothing spent) ████')
show('GEOMETRY — the letterbox he reads through', a.geometry)
show('FURNITURE — pinned to the glass, always', a.furnitureRows)
show('THE STACK, top to bottom inside the scroller',
  a.stack.map(s => String(s.top).padStart(5) + '  h' + String(s.h).padStart(4) + '  ' + s.tag.padEnd(7) + ' ' + s.label).join('\n'))
show('HIS HP, everywhere it is painted', a.hpPlaces)
show('TEMP HP BADGES', a.tempBadges)
show('ECONOMY CHIP SETS, by module', a.chipSets)
show('SPELL-SLOT PIPS, by module', a.slots)
show('"1st/2nd/3rd" LEVEL LABELS, by module', a.pipRows)
show('"YOUR TURN" HEADINGS', a.yourTurn)

await A.page.screenshot({ path: SHOTS + '/today-01-top.png' })
/* Walk the scroller a window at a time. `fullPage` is useless here — the
   document is 844px tall and the page lives inside a fixed element. */
const windows = Math.ceil(a.geometry.contentHeight / a.geometry.readingWindow)
for (let i = 1; i < Math.min(windows, 8); i++) {
  await A.page.evaluate(n => {
    const m = [...document.querySelectorAll('*')].filter(
      e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 40 && !e.closest('[inert]'),
    ).sort((x, y) => y.scrollHeight - x.scrollHeight)[0]
    m.scrollTop = n * m.clientHeight
  }, i)
  await A.page.waitForTimeout(350)
  await A.page.screenshot({ path: SHOTS + '/today-' + String(i + 1).padStart(2, '0') + '-scroll.png' })
}
await A.ctx.close()

const B = await open(OUT_OF_COMBAT)
const b = await B.page.evaluate(READ, HP)
console.log('\n\n████ OUT OF COMBAT ████')
show('GEOMETRY', b.geometry)
show('THE STACK', b.stack.map(s => String(s.top).padStart(5) + '  h' + String(s.h).padStart(4) + '  ' + s.tag.padEnd(7) + ' ' + s.label).join('\n'))
show('"YOUR TURN" HEADINGS', b.yourTurn)
const la = new Set(a.stack.map(s => s.label)), lb = new Set(b.stack.map(s => s.label))
show('ONLY WHEN IN COMBAT', [...la].filter(l => !lb.has(l)))
show('ONLY WHEN NOT IN COMBAT', [...lb].filter(l => !la.has(l)))
await B.page.screenshot({ path: SHOTS + '/today-out-of-combat.png' })
await B.ctx.close()

await browser.close()
console.log('\nshots in ' + SHOTS + '/')
