// FINDING BF, part 2: what the deck's minimise control is actually worth.
//
//   node docs/plans/table-truth/_probe-bf2.mjs
//
// Part 1 found the number that reframes the whole finding: on a 390x844 phone
// `--turn-deck-h` is **302px** and `<main>` is **421px** — less than half the
// screen is readable content. Before choosing where the dice button goes, this
// measures the one control that already exists to reclaim that space (slice 4's
// minimised spine) and asks three questions of both states:
//
//   1. how tall is the deck, and how tall is main?
//   2. how many of the five reaction rows fit inside main at once?
//   3. does the dice button still cover page text?
//
// Question 3 is the important one. The button's position is expressed in terms
// of `--turn-deck-h`, so it MOVES with the deck — which means minimising cannot
// fix it, only relocate it. If the overlap survives both states, the button is
// the defect and the deck is a separate conversation.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const entry = req.resolve('playwright', { paths: searchPaths });
const pw = await import(pathToFileURL(entry).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4193/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-bf';
mkdirSync(OUT, { recursive: true });
const NIX = await loadNix();

const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 }, tempHP: 0,
  proficiencyBonus: 3, spellSaveDC: 14, spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: [
    { name: 'Sentinel', description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.', source: 'General Feat', isHomebrew: false, effects: [] },
    { name: 'Interception', description: 'You protect your allies from harm.', source: 'Fighting Style', isHomebrew: false, effects: [] },
    { name: 'Lucky', description: 'You have inexplicable luck that seems to kick in at just the right moment.', source: 'Changeling', isHomebrew: false, effects: [] },
  ],
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true, damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, seedJson, combatJson]) => {
  if (!localStorage.getItem('codex-character-' + id)) localStorage.setItem('codex-character-' + id, seedJson);
  if (!localStorage.getItem('codex-combat-' + id)) localStorage.setItem('codex-combat-' + id, combatJson);
  localStorage.setItem('codex-active-id', id);
  if (!localStorage.getItem('codex-roster')) {
    const s = JSON.parse(seedJson);
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: s.name, class: s.class, subclass: s.subclass, level: s.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
  }
}, [NIX.id, JSON.stringify(MARCUS), IN_COMBAT]);

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

/** One reading of the whole layout, plus what the dice button is sitting on. */
const measure = () => page.evaluate(() => {
  const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
  const main = document.querySelector('main');
  const mainBox = main.getBoundingClientRect();
  const fab = document.querySelector('button[aria-label="Open dice roller"]');
  const f = fab.getBoundingClientRect();
  const band = document.querySelector('section[aria-label="Your reactions"]');

  /* Text runs whose own box intersects the dice button's box. Text, not
     containers — a container overlapping is not a complaint, a WORD is. */
  const covered = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = (n.textContent || '').trim();
    if (!s || !n.parentElement || fab.contains(n.parentElement)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= f.left || r.left >= f.right || r.bottom <= f.top || r.top >= f.bottom) continue;
      covered.push(s.slice(0, 45));
      break;
    }
  }

  let rowsFit = null, rowsTotal = null;
  if (band) {
    band.scrollIntoView({ block: 'start', behavior: 'instant' });
    const lis = [...band.querySelectorAll('li')];
    rowsTotal = lis.length;
    const mb = main.getBoundingClientRect();
    rowsFit = lis.filter((li) => {
      const r = li.getBoundingClientRect();
      return r.top >= mb.top && r.bottom <= mb.bottom;
    }).length;
  }

  return {
    deckH: getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h').trim(),
    mainH: Math.round(mainBox.height),
    mainTop: Math.round(mainBox.top),
    mainBottom: Math.round(mainBox.bottom),
    fab: { top: Math.round(f.top), bottom: Math.round(f.bottom), left: Math.round(f.left) },
    fabInsideMain: f.top < mainBox.bottom && f.bottom > mainBox.top,
    fabOverhangIntoContent: Math.round(Math.max(0, mainBox.bottom - f.top)),
    rowsFit, rowsTotal,
    coveredText: covered,
  };
});

const results = {};
results.expanded = await measure();
await page.screenshot({ path: `${OUT}/deck-expanded.png` });

/* The deck's own minimise control — slice 4's spine. Found by role, not by a
   class name, so a restyle does not silently turn this measurement into a
   no-op that reports success. */
const toggled = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const t = btns.find((b) => /minimi|collapse|expand/i.test(b.getAttribute('aria-label') || '') && b.closest('section'));
  if (!t) return null;
  t.click();
  return t.getAttribute('aria-label');
});
await page.waitForTimeout(600);
results.minimisedVia = toggled;
results.minimised = toggled ? await measure() : null;
if (toggled) await page.screenshot({ path: `${OUT}/deck-minimised.png` });

writeFileSync(`${OUT}/_probe2.json`, JSON.stringify(results, null, 2));

const show = (label, m) => {
  if (!m) { console.log(`  ${label}: (control not found)`); return; }
  console.log(`  ${label.padEnd(12)} deck=${m.deckH.padEnd(6)} main=${m.mainH}px (${m.mainTop}..${m.mainBottom})  ` +
    `band rows fitting on one screen: ${m.rowsFit}/${m.rowsTotal}`);
  console.log(`  ${''.padEnd(12)} dice button ${m.fabInsideMain ? 'INSIDE main' : 'clear of main'}, ` +
    `overhang into content = ${m.fabOverhangIntoContent}px, covering ${m.coveredText.length} text run(s)`);
  for (const c of m.coveredText) console.log(`  ${''.padEnd(14)}"${c}"`);
};
console.log('── deck expanded vs minimised, 390x844 ──');
show('expanded', results.expanded);
console.log(`  (minimise control: ${toggled ?? 'NOT FOUND'})`);
show('minimised', results.minimised);

await browser.close();
