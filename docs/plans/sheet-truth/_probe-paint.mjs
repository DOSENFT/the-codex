// What the Play tab ACTUALLY paints for the vitals, and what a spell detail
// says, with CHA seeded at 16 and the stored DC seeded WRONG on purpose.
//
//   node docs/plans/sheet-truth/_probe-paint.mjs [url]
//
// The seed below is the fault Marcus is living with, reproduced exactly: ability
// scores that say CHA 16 (+3 → DC 14) sitting beside a STORED spellSaveDC of 15
// and spellAttackBonus of +7, which are the CHA-18 values. That is what an
// edit in Prep leaves behind today, because `handleScoreConfirm` writes
// `abilityScores` and never touches the two derived fields beside it.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const entry = req.resolve('playwright', { paths: searchPaths });
const pw = await import(pathToFileURL(entry).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4210/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();

const MARCUS = {
  ...NIX,
  level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 }, tempHP: 0, tempHPSource: null,
  proficiencyBonus: 3,
  spellSaveDC: 15,        // <-- STALE, the CHA-18 value
  spellAttackBonus: 7,    // <-- STALE, the CHA-18 value
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },  // truth: +3
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, seed, combat]) => {
  localStorage.setItem('codex-character', seed);
  localStorage.setItem(`codex-combat-${id}`, combat);
}, [MARCUS.id, JSON.stringify(MARCUS), IN_COMBAT]);
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

/* The vitals band, read as LABEL→VALUE pairs off the DOM rather than scraped
   out of innerText — an earlier pass matched "SAVE DC" against a number that
   belonged to the next stat over, which is exactly the kind of false reading
   this app's finding Q exists to forbid. */
const vitals = await page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    const label = (el.textContent || '').trim();
    if (!/^(Save DC|AC|Init|Prof|Sp Atk)$/i.test(label)) continue;
    const sib = el.parentElement?.querySelector(':scope > *:not(:first-child)');
    const box = el.parentElement?.textContent?.trim() ?? '';
    out[label] = box.replace(label, '').trim();
  }
  return out;
});
console.log('=== VITALS BAND, as painted ===');
console.log(JSON.stringify(vitals, null, 1));
console.log('\ntruth for CHA 16 / prof +3 :  Save DC 14   Sp Atk +6');

/* And what the option rows say, since that is where "my spell definitions" live. */
const rows = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    dcMentions: [...new Set(t.match(/DC\s*\d+/gi) ?? [])],
    hitMentions: [...new Set(t.match(/[+-]\d+\s*to hit/gi) ?? [])],
  };
});
console.log('\n=== WHAT THE OPTION ROWS SAY ===');
console.log(JSON.stringify(rows, null, 1));

/* Does the app already NOTICE? vitals.ts ships a discrepancy reporter. */
const flagged = await page.evaluate(() => {
  const t = document.body.innerText;
  return /discrepan|doesn.t match|sheet says|disagree/i.test(t);
});
console.log(`\ndiscrepancy surfaced to the user on this screen: ${flagged}`);

await browser.close();
