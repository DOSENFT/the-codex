/* SLICE R7 — the fight cannot be ended by one tap. Proved on his real export.
 *
 * `_diag-endcombat.mjs` measured the fault on 2026-09-05: one tap on «End
 * combat» took `inCombat true -> false` and `round 3 -> 1` and rewrote
 * `codex-combat-<id>` on disk, with nothing asked. `EndCombatD.test.tsx` pins
 * the mechanism in node, but node has no DOM here — the ONLY place the whole
 * path (tap -> strip -> door -> storage) exists at once is a browser, so that
 * is where the claim is settled.
 *
 * Three passes, each reading STORAGE and not just the screen, because the
 * damage is done to `codex-combat-<id>` and a screen can lie about it:
 *
 *   1. one tap  -> the strip appears and the fight is STILL RUNNING
 *   2. Keep going -> the strip is gone and the fight is still running
 *   3. tap, then confirm -> now, and only now, the fight ends
 *
 * Also measured: the strip's fit at 390px (it must not clip the sentence or
 * shrink either door below 48px), because "in place, not below" was the least
 * confident decision in the design and this is the number that settles it.
 *
 *   node docs/plans/your-turn/prove-sliceR7.mjs [url]
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'

const SHEET = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))
const APP = process.argv[2] ?? 'http://localhost:5174/the-codex/'
const ID = SHEET.id ?? 'nix'
const COMBAT = {
  inCombat: true, round: 3, yourTurn: true, spellSlots: {}, concentrating: null,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
}
const seed = ([id, s, c]) => {
  localStorage.setItem('codex-character-' + id, s); localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' }]))
  localStorage.setItem('codex-active-tab', 'combat')
}

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`), 'C:/Users/marcu/Documents/Command/brain/graph/node_modules']
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const browser = await (pw.chromium ?? pw.default.chromium).launch()

/** A fresh page with the fight running. Each pass gets its own, because pass 3
 *  destroys the encounter and a shared page would make passes order-dependent
 *  in exactly the way that hides a bug. */
async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' })
  await ctx.addInitScript(seed, [ID, JSON.stringify(SHEET), JSON.stringify(COMBAT)])
  const page = await ctx.newPage()
  await page.goto(APP, { waitUntil: 'load' })
  await page.waitForTimeout(1700)
  return { ctx, page }
}

/* BY ACCESSIBLE NAME, NEVER BY CLASS. `.rbtn.end` is worn by BOTH «End combat»
   and «Start Combat»; asking for the class is what made a working exclusivity
   look like a regression on 2026-09-05. The name is the claim. */
const read = page => page.evaluate(id => {
  const txt = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  let stored = null
  try { stored = JSON.parse(localStorage.getItem('codex-combat-' + id) ?? 'null') } catch {}
  const strip = document.querySelector('[aria-label="End combat confirmation"]')
  const door = document.querySelector('[aria-label="End combat — confirm"]')
  const keep = document.querySelector('[aria-label="Keep fighting"]')
  const box = el => { const r = el?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null }
  const msg = strip?.querySelector('.endc-msg')
  return {
    stored: stored ? { inCombat: stored.inCombat, round: stored.round } : null,
    armBtn: !!document.querySelector('[aria-label="End combat"]'),
    startBtn: [...document.querySelectorAll('button')].some(b => /start combat/i.test(txt(b))),
    strip: !!strip,
    words: txt(msg),
    doorBox: box(door), keepBox: box(keep), stripBox: box(strip),
    /* Clipping, measured rather than assumed: does the sentence's own content
       exceed the box it was given? */
    msgClipped: msg ? msg.scrollHeight > msg.clientHeight + 1 || msg.scrollWidth > msg.clientWidth + 1 : null,
    /* Do Look up and Reset survive the arming? "In place, not a modal." */
    lookup: [...document.querySelectorAll('button')].some(b => /^look up$/i.test(txt(b))),
    reset: !!document.querySelector('[aria-label="Reset action economy"]'),
  }
}, ID)

const tap = (page, label) => page.evaluate(l => document.querySelector(`[aria-label="${l}"]`)?.click(), label)
const line = (t, r) => console.log(`  ${t.padEnd(14)} inCombat=${String(r.stored?.inCombat).padEnd(5)} round=${String(r.stored?.round).padEnd(4)} arm=${String(r.armBtn).padEnd(5)} strip=${String(r.strip).padEnd(5)} start=${r.startBtn}`)

const fails = []

/* ── PASS 1 — one tap arms, and the fight keeps running ─────────────────── */
{
  const { ctx, page } = await fresh()
  const before = await read(page)
  await tap(page, 'End combat')
  await page.waitForTimeout(600)
  const after = await read(page)
  console.log('\nPASS 1 — one tap')
  line('before', before); line('after tap', after)
  console.log(`  sentence:  "${after.words}"`)
  console.log(`  geometry:  strip ${JSON.stringify(after.stripBox)} · keep ${JSON.stringify(after.keepBox)} · confirm ${JSON.stringify(after.doorBox)} · clipped ${after.msgClipped}`)
  console.log(`  in place:  Look up ${after.lookup} · Reset ${after.reset}`)

  if (after.stored?.inCombat !== true) fails.push('PASS 1: the first tap ENDED the fight — the guard is not there')
  if (!after.strip) fails.push('PASS 1: no confirmation appeared')
  if (after.armBtn) fails.push('PASS 1: the arming button is still mounted beside the confirm — two doors named the same')
  if (after.stored?.round !== 3) fails.push(`PASS 1: the round moved (3 -> ${after.stored?.round})`)
  if (!/damage log/.test(after.words) || !/spent economy/.test(after.words))
    fails.push('PASS 1: the strip does not name what it costs')
  if (after.msgClipped) fails.push('PASS 1: the sentence is CLIPPED at 390px')
  if ((after.keepBox?.h ?? 0) < 48 || (after.doorBox?.h ?? 0) < 48)
    fails.push(`PASS 1: a door is under the 48px floor — keep ${after.keepBox?.h}, confirm ${after.doorBox?.h}`)
  if (!after.lookup || !after.reset)
    fails.push('PASS 1: arming took the verb row with it — this is meant to be in place, not a modal')
  await ctx.close()
}

/* ── PASS 2 — Keep going is a real way out ──────────────────────────────── */
{
  const { ctx, page } = await fresh()
  await tap(page, 'End combat'); await page.waitForTimeout(400)
  await tap(page, 'Keep fighting'); await page.waitForTimeout(600)
  const after = await read(page)
  console.log('\nPASS 2 — tap, then Keep going')
  line('after keep', after)
  if (after.strip) fails.push('PASS 2: the strip did not close')
  if (!after.armBtn) fails.push('PASS 2: the arming button did not come back')
  if (after.stored?.inCombat !== true) fails.push('PASS 2: Keep going ENDED the fight')
  if (after.stored?.round !== 3) fails.push(`PASS 2: the round moved (3 -> ${after.stored?.round})`)
  await ctx.close()
}

/* ── PASS 3 — the second door still works, or the feature is a wall ─────── */
{
  const { ctx, page } = await fresh()
  await tap(page, 'End combat'); await page.waitForTimeout(400)
  await tap(page, 'End combat — confirm'); await page.waitForTimeout(900)
  const after = await read(page)
  console.log('\nPASS 3 — tap, then confirm')
  line('after confirm', after)
  /* `endEncounter` calls `forgetCombat`, which REMOVES the key — so a null
     `stored` is the success case here, not a read failure. */
  if (after.stored && after.stored.inCombat === true)
    fails.push('PASS 3: the confirm did not end the fight — a guard that cannot be passed is a wall')
  if (after.strip) fails.push('PASS 3: the strip is still up after confirming')
  if (!after.startBtn) fails.push('PASS 3: no «Start Combat» offered after the fight ended')
  await page.screenshot({ path: 'docs/plans/your-turn/mockups/R7-after-confirm.png' })
  await ctx.close()
}

/* A shot of the armed strip itself, for the record. */
{
  const { ctx, page } = await fresh()
  await tap(page, 'End combat'); await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/plans/your-turn/mockups/R7-armed.png' })
  await ctx.close()
}

console.log('\n' + '='.repeat(64))
if (fails.length) { console.log('SLICE R7: FAILED'); for (const f of fails) console.log('  ✗ ' + f) }
else console.log('SLICE R7: THE FIGHT TAKES TWO TAPS TO END, AND STILL ENDS.')
await browser.close()
process.exitCode = fails.length ? 1 : 0
