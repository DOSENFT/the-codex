/* Can check 4a2 fail?
 *
 * 4a2 claims: rows that share a heading are told apart by text Marcus can
 * actually SEE — painted, and not cutting itself off. A check that cannot go
 * red proves nothing, and this one is newly written, so it gets asked directly.
 *
 * The injection clamps every leaf line inside the reactions band to a single
 * line with text-overflow:ellipsis. That is precisely the fault the check
 * exists to catch: the headings stay distinct-looking, the rows stay present,
 * and the DISTINCTION — which lives in the trigger, further down the row —
 * disappears behind an ellipsis. If 4a2 still passes under that, it is blind.
 *
 * Throwaway. Run against the same preview build as prove-phase1.mjs.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })(),
];
const entry = req.resolve('playwright', { paths: searchPaths });
const mod = await import(pathToFileURL(entry).href);
const chromium = mod.chromium ?? mod.default?.chromium;

const BASE = 'http://localhost:4193/the-codex/';
const NIX = await loadNix();
const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3, spellSaveDC: 14, spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  /* The feats are the whole point: without them the band has no shared heading
     at all and the falsifier measures nothing. Copied byte-for-byte from
     prove-phase1.mjs so the two runs see the same character. */
  feats: [
    { name: 'Sentinel', description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.', source: 'General Feat', isHomebrew: false, effects: [] },
    { name: 'Interception', description: 'You protect your allies from harm.', source: 'Fighting Style', isHomebrew: false, effects: [] },
    { name: 'Lucky', description: 'You have inexplicable luck that seems to kick in at just the right moment.', source: 'Changeling', isHomebrew: false, effects: [] },
  ],
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true,
    damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, seedJson, combat]) => {
  localStorage.setItem('codex-character-' + id, seedJson);
  localStorage.setItem('codex-combat-' + id, combat);
  localStorage.setItem('codex-active-id', id);
  const seed = JSON.parse(seedJson);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [NIX.id, JSON.stringify(MARCUS), IN_COMBAT]);

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);

/* The same grouping logic 4a2 runs, lifted verbatim so the falsifier cannot
   accidentally test a different rule than the prover enforces. */
const read = () => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const painted = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01;
  };
  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return null;
  const rows = [...band.querySelectorAll('li')].map((li) => {
    const cells = [...li.querySelectorAll('p,span,div')]
      .filter((e) => e.children.length === 0 && txt(e))
      .map((e) => {
        const cs = getComputedStyle(e);
        const overflows = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1;
        return { text: txt(e), painted: painted(e), clips: overflows && (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') };
      });
    return { lines: cells.map((c) => c.text), cells };
  });
  const headings = rows.map((r) => r.lines[0]);
  const repeated = [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
  const groups = repeated.map((h) => {
    const group = rows.filter((r) => r.lines[0] === h);
    const seen = group.map((r) => r.cells.filter((c) => c.painted && !c.clips).map((c) => c.text).join(' ⏐ '));
    return { h, seen, distinct: new Set(seen).size === seen.length };
  });
  return { rowCount: rows.length, repeated, groups, verdict: groups.every((g) => g.distinct), all: rows.map(r=>r.lines.join(" | ").slice(0,120)), bandText: txt(band).slice(0,300) };
};

const before = await page.evaluate(read);
console.log('UNTOUCHED   4a2 =', before.verdict ? 'PASS' : 'FAIL',
  `· ${before.rowCount} rows · shared headings: ${before.repeated.join(', ') || 'none'}`);
for (const g of before.groups) console.log(`   «${g.h}» ->`, g.seen.map((s) => `[${s.slice(0, 58)}]`).join(' vs '));
before.all.forEach((r, i) => console.log(`   row${i}: ${r}`));
console.log('   BAND:', before.bandText);

await page.addStyleTag({ content: `
  section[aria-label="Your reactions"] li p,
  section[aria-label="Your reactions"] li span,
  section[aria-label="Your reactions"] li div {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 120px !important;
  }
` });
await page.waitForTimeout(400);

const after = await page.evaluate(read);
console.log('\nCLAMPED     4a2 =', after.verdict ? 'PASS' : 'FAIL',
  `· ${after.rowCount} rows · shared headings: ${after.repeated.join(', ') || 'none'}`);
for (const g of after.groups) console.log(`   «${g.h}» ->`, g.seen.map((s) => `[${s.slice(0, 58)}]`).join(' vs '));

console.log('\nFALSIFIABLE:', before.verdict === true && after.verdict === false
  ? 'YES — green on the real build, red the moment the distinguishing text is clipped'
  : `NO — before=${before.verdict} after=${after.verdict}; the check is not measuring what it claims`);

await browser.close();
process.exit(before.verdict === true && after.verdict === false ? 0 : 1);
