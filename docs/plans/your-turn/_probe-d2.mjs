/* SCRATCH — Gate 2, second pass on `?d=1`.
 *
 * The first pass reported furniturePx 0 because it only counted `position:
 * fixed|sticky`. The screenshot plainly shows a header and an Undo / End turn
 * footer that never move. They are FLEX SIBLINGS of the scroller, not fixed —
 * which is a probe gap, not an absence, and exactly the failure mode
 * HANDOFF §4 names: a probe that can see the broken case but not the working
 * one reports every working case as broken.
 *
 * So: measure the chrome as "painted, and NOT inside the scroller", which is
 * what furniture actually means, and count the bottom tab bar this preview
 * does not have but the real combat tab does.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = mod.chromium ?? mod.default?.chromium
const browser = await chromium.launch()

const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
}

const STATES = {
  'YOUR TURN, nothing spent': { inCombat: true, round: 3, yourTurn: true,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    spellSlots: {}, concentrating: null },
  'MID-TURN, action + bonus spent': { inCombat: true, round: 3, yourTurn: true,
    turnActions: { action: true, bonusAction: true, reaction: false, movement: false },
    spellSlots: {}, concentrating: null },
  'NOT YOUR TURN': { inCombat: true, round: 4, yourTurn: false,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    spellSlots: {}, concentrating: null },
  'NOT IN COMBAT': { inCombat: false, round: 0, yourTurn: false,
    turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    spellSlots: {}, concentrating: null },
}

const READ = () => {
  const painted = el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const allText = el => (el.textContent || '').replace(/\s+/g, ' ').trim()

  let scroller = null
  for (const el of document.querySelectorAll('*')) {
    if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue
    if (el.scrollHeight <= el.clientHeight + 20) continue
    if (!scroller || el.scrollHeight > scroller.scrollHeight) scroller = el
  }

  /* Chrome = a painted element that is a SIBLING of the scroller inside the
     same layout parent. That catches the flex header and footer the first
     pass missed, without inventing a rule about position. */
  const chrome = []
  if (scroller) {
    for (const sib of scroller.parentElement.children) {
      if (sib === scroller || !painted(sib)) continue
      const r = sib.getBoundingClientRect()
      chrome.push({ what: allText(sib).slice(0, 46) || sib.tagName.toLowerCase(), h: Math.round(r.height), top: Math.round(r.top) })
    }
  }

  const heads = [...document.querySelectorAll('*')]
    .filter(el => painted(el) && /^(your turn|the moment|not in combat|round)/i.test(allText(el)) && allText(el).length < 30)
    .map(el => allText(el))

  return {
    screen: innerHeight,
    window: scroller ? Math.round(scroller.clientHeight) : innerHeight,
    content: scroller ? Math.round(scroller.scrollHeight) : Math.round(document.body.scrollHeight),
    screens: scroller ? +(scroller.scrollHeight / scroller.clientHeight).toFixed(2) : null,
    chrome,
    chromePx: chrome.reduce((n, c) => n + c.h, 0),
    headings: [...new Set(heads)],
    buttons: [...document.querySelectorAll('button')].filter(painted)
      .map(b => (b.getAttribute('aria-label') || allText(b)).trim().slice(0, 40)).length,
  }
}

for (const [name, state] of Object.entries(STATES)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
  await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(state)])
  const page = await ctx.newPage()
  await page.goto('http://[::1]:4321/the-codex/?d=1', { waitUntil: 'load' })
  await page.waitForTimeout(1900)
  const r = await page.evaluate(READ)
  console.log('\n████ ' + name)
  console.log('   screen ' + r.screen + ' · window ' + r.window + ' · content ' + r.content + ' · ' + r.screens + ' screens · ' + r.buttons + ' buttons')
  console.log('   CHROME ' + r.chromePx + 'px: ' + r.chrome.map(c => c.what + ' (h' + c.h + ')').join(' | '))
  console.log('   HEADINGS: ' + r.headings.join(' · '))
  await page.screenshot({ path: 'docs/plans/your-turn/_shots/d-state-' + name.replace(/[^a-z]+/gi, '-').toLowerCase() + '.png' })
  await ctx.close()
}

await browser.close()
