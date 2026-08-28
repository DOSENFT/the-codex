// THE BASELINE the success metric is measured against.
//
//   npx vite preview --port 4210 --host
//   node docs/plans/sheet-truth/_probe-baseline.mjs [url]
//
// Supersedes the `dcMentions` half of _probe-paint.mjs, which was wrong. That
// probe ran /DC\s*\d+/ over document.innerText, and \s matches a newline, so
// "SAVE DC" (label) followed by "18" (the AC stat beside it) scored as "DC 18".
// A false positive, found in my own probe, by exactly the mechanism finding Q
// exists to forbid. Counting disagreements with a regex that can manufacture
// one would have let the success metric be gamed by accident.
//
// This counts three separate things and never mixes them:
//   1. VITALS  — label -> value pairs read structurally off the DOM.
//   2. PROSE   — sentences naming a Charisma score, inside the option/detail
//                region only, with the vitals card excluded from the subtree.
//   3. ROWS    — "DC n" / "+n to hit" appearing in a SINGLE text node, so a
//                label and its neighbour's number can never be glued together.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4210/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();

/* CHA 16 beside the CHA-18 stored pair. This is what an edit in Prep leaves. */
const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3,
  spellSaveDC: 15, spellAttackBonus: 7,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const TRUTH = { saveDC: 14, spellAttack: 6, cha: 16, chaMod: 3 };
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

/* 1 — VITALS, structurally. */
const vitals = await page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    const label = (el.textContent || '').trim();
    if (!/^(Save DC|AC|Init|Prof|Sp Atk)$/i.test(label)) continue;
    out[label] = (el.parentElement?.textContent ?? '').trim().replace(label, '').trim();
  }
  return out;
});

/* 2 + 3 — one text node at a time, with the vitals card cut out of the tree. */
const nodes = await page.evaluate(() => {
  const card = [...document.querySelectorAll('*')].find(
    e => e.children.length === 0 && /^Save DC$/i.test((e.textContent || '').trim()));
  const excluded = card?.closest('div')?.parentElement ?? null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const out = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (excluded && excluded.contains(n.parentElement)) continue;
    const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) out.push(t);
  }
  return out;
});

const chaProse = nodes.filter(t => /Charisma\s+\d+/i.test(t));
const dcRows   = [...new Set(nodes.flatMap(t => t.match(/\bDC\s*\d+/gi) ?? []))];
const hitRows  = [...new Set(nodes.flatMap(t => t.match(/[+-]\d+\s+to hit/gi) ?? []))];

const wrongVitals = [
  vitals['Save DC'] !== String(TRUTH.saveDC) ? `Save DC shows ${vitals['Save DC']}, truth ${TRUTH.saveDC}` : null,
  vitals['Sp Atk'] !== `+${TRUTH.spellAttack}` ? `Sp Atk shows ${vitals['Sp Atk']}, truth +${TRUTH.spellAttack}` : null,
].filter(Boolean);
const wrongProse = chaProse.filter(t => !new RegExp(`Charisma\s+${TRUTH.cha}\b`, 'i').test(t));
const wrongDC    = dcRows.filter(s => Number(s.replace(/\D/g, '')) === 15);

console.log('=== VITALS (structural) ===');
console.log(JSON.stringify(vitals, null, 1));
console.log(`\n=== PROSE NAMING A CHARISMA SCORE (${chaProse.length}) ===`);
chaProse.forEach(t => console.log(`  ${/Charisma\s+16\b/i.test(t) ? 'ok  ' : 'WRONG'} ${t.slice(0, 110)}`));
console.log(`\n=== SINGLE-TEXT-NODE "DC n" ===\n  ${JSON.stringify(dcRows)}`);
console.log(`=== SINGLE-TEXT-NODE "+n to hit" ===\n  ${JSON.stringify(hitRows)}`);

const total = wrongVitals.length + wrongProse.length + wrongDC.length;
console.log('\n=== DISAGREEMENTS ===');
wrongVitals.forEach(s => console.log(`  vitals : ${s}`));
wrongProse.forEach(s => console.log(`  prose  : ${s.slice(0, 90)}`));
wrongDC.forEach(s => console.log(`  row    : "${s}" — stored 15, truth 14`));
console.log(`\nTOTAL: ${total}   (target after this phase: 0)`);
await browser.close();
