/* SCRATCH — why six KEEP pins came up red.
 *
 * HANDOFF s4: a probe that can see the broken case but not the working one
 * reports every working case as broken. Six reds on capabilities the app
 * visibly has is far more likely to be six probe bugs than six absences, so
 * this dumps what is ACTUALLY on the glass near each one instead of guessing
 * a better regex.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
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
const COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
await ctx.addInitScript(seed, [SHEET.id, JSON.stringify(SHEET), JSON.stringify(COMBAT)])
const page = await ctx.newPage()
await page.goto('http://[::1]:4321/the-codex/', { waitUntil: 'load' })
await page.waitForTimeout(1800)

const out = await page.evaluate(() => {
  const painted = el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const reach = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.hasAttribute && p.hasAttribute('inert')) return false
      if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return false
      if (getComputedStyle(p).pointerEvents === 'none') return false
    }
    return true
  }
  const all = (sel = '*') => [...document.querySelectorAll(sel)].filter(e => painted(e) && reach(e))
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()

  // 1. dice / to-hit strings actually painted
  const diceish = [...new Set(all('*').map(own).filter(t => t && t.length < 34 && /\d+d\d+|to hit|\+\d+\b/i.test(t)))]

  // 2. everything with "condition" in it, and every collapsed disclosure
  const conditionish = [...new Set(all('*').map(e => (e.getAttribute('aria-label') || own(e)) || '')
    .filter(t => t && t.length < 60 && /condition/i.test(t)))]
  const collapsed = all('button').filter(b => b.getAttribute('aria-expanded') === 'false')
    .map(b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50))

  // 3. anything bloodied-ish
  const bloodish = [...new Set(all('*').map(e => (e.getAttribute('aria-label') || own(e)) || '')
    .filter(t => t && t.length < 60 && /blood/i.test(t)))]

  // 4. the HP bar and what is actually coloured inside it
  const bars = all('*').filter(e => /hit point/i.test(e.getAttribute('aria-label') || ''))
    .map(e => {
      const kids = [...e.querySelectorAll('*')].map(k => {
        const s = getComputedStyle(k)
        return { tag: k.tagName.toLowerCase(), cls: (k.className.baseVal ?? k.className ?? '').toString().slice(0, 60),
                 bg: s.backgroundColor, bgImg: s.backgroundImage.slice(0, 60), w: Math.round(k.getBoundingClientRect().width) }
      })
      return { label: e.getAttribute('aria-label'), tag: e.tagName.toLowerCase(), kids: kids.slice(0, 8) }
    })

  // 5. what a "— details" row opens into: the notes control
  return { diceish, conditionish, collapsed, bloodish, bars }
})

console.log('── DICE / TO-HIT STRINGS PAINTED ──'); console.log(out.diceish.join('\n'))
console.log('\n── ANYTHING "CONDITION" ──'); console.log(out.conditionish.join('\n') || '(none)')
console.log('\n── COLLAPSED DISCLOSURES (aria-expanded=false) ──'); console.log(out.collapsed.join('\n') || '(none)')
console.log('\n── ANYTHING "BLOOD" ──'); console.log(out.bloodish.join('\n') || '(none)')
console.log('\n── HP BARS ──'); console.log(JSON.stringify(out.bars, null, 1))

// 6. open the first "— details" row and look for the notes control
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /—\s*details$/i.test((x.getAttribute('aria-label') || x.textContent || '').replace(/\s+/g, ' ').trim()))
  if (!b) return null
  b.click()
  return (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()
})
await page.waitForTimeout(600)
const afterOpen = await page.evaluate(() => {
  const painted = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  return [...document.querySelectorAll('button, textarea, input')].filter(painted)
    .map(e => e.tagName.toLowerCase() + ' · ' + ((e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 52)))
})
console.log('\n── CLICKED: ' + opened + ' ──')
console.log(afterOpen.join('\n'))

await page.screenshot({ path: 'docs/plans/your-turn/_shots/diag-row-open.png' })
await ctx.close()
await browser.close()
