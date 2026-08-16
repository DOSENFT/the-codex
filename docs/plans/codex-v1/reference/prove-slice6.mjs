// Slice 6 proof — drive the real built app in a real browser and press things.
// The unit tests prove the reducer; this proves the WIRE: tap → reducer →
// localStorage → reload → still true. Nothing here reaches into app internals;
// it only clicks what a thumb can click and reads what an eye can read.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice6.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
// The id must be the SEED'S OWN id, not one invented here: loadCharacter()
// returns `parsed.id ?? id`, so the sheet the app writes back is keyed by the
// id inside the JSON. Seeding under a different key gave a run where every
// on-screen check passed and every storage check failed — the app was right
// and the harness was reading a key nothing wrote to.
const ID = NIX.id;
const URL_ = 'http://localhost:4173/the-codex/?d=1';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

const READ = () => {
  const q = s => [...document.querySelectorAll(s)];
  const rows = q('.act, .face').map(e => ({
    name: (e.querySelector('.anm') || e.querySelector('.fnm'))?.textContent,
    tag: e.tagName,
    disabled: e.disabled === true,
    blocked: e.classList.contains('blocked'),
    why: e.querySelector('.why')?.textContent ?? null,
  }));
  const slots = {};
  q('.res .rgrp').forEach(g => { slots[g.querySelector('.k').textContent] = g.querySelector('.v').textContent; });
  const econ = {};
  q('.econ .eslot').forEach(e => { econ[e.textContent.trim()] = e.classList.contains('open'); });
  const [undoBtn, endBtn] = q('.edge .btn');
  return {
    round: document.querySelector('.round')?.textContent,
    rows, slots, econ,
    undo: { text: undoBtn?.textContent, disabled: undoBtn?.disabled },
    end: { text: endBtn?.textContent, disabled: endBtn?.disabled },
    refusal: document.querySelector('.refusal')?.textContent ?? null,
    faceCost: Object.fromEntries(q('.face').map(f => [f.querySelector('.fnm').textContent, f.querySelector('.fc').textContent])),
  };
};

const STORE = id => {
  const sheet = JSON.parse(localStorage.getItem('codex-character-' + id));
  return {
    slot1: sheet.spellSlots['1'],
    lay: sheet.features.find(f => f.name === 'Lay on Hands').usesCurrent,
    combat: JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null'),
    log: JSON.parse(localStorage.getItem('codex-combat-log-' + id) || '[]'),
  };
};

const clickNamed = async (page, name) => {
  const el = page.locator('.act, .face').filter({ hasText: name }).first();
  await el.click();
  await page.waitForTimeout(120);
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1 });
await ctx.addInitScript(([id, seed]) => {
  // SEED ONCE. addInitScript runs before every navigation, including the
  // reload in phase 3 — re-writing the sheet there would hand the spent slot
  // back and then blame the app for it. The guard is what makes phase 3 an
  // actual cold boot rather than a re-seed wearing one's costume.
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
  }
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 8, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [ID, JSON.stringify(NIX)]);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(URL_, { waitUntil: 'networkidle' });

console.log('\n-- 1. cold open ------------------------------------------------');
let s = await p.evaluate(READ);
check('round', s.round, 'Round 1');
check('every row is a button', s.rows.every(r => r.tag === 'BUTTON'), true);
check('blocked rows are disabled', s.rows.filter(r => r.blocked).every(r => r.disabled), true);
check('undo is offered but inert', s.undo, { text: 'Undo', disabled: true });
check('end turn is live', s.end, { text: 'End turn', disabled: false });
check('level 1 slots', s.slots['Level 1'], '3/4');
check('no refusal', s.refusal, null);
console.log('   rows:', s.rows.map(r => `${r.name}${r.disabled ? '*' : ''}`).join(', '));
console.log('   faces:', JSON.stringify(s.faceCost));
console.log('   econ:', JSON.stringify(s.econ));

console.log('\n-- 2. take Divine Smite ----------------------------------------');
await clickNamed(p, 'Divine Smite');
s = await p.evaluate(READ);
let store = await p.evaluate(STORE, ID);
check('level 1 slot spent on screen', s.slots['Level 1'], '2/4');
check('level 1 slot spent on the SHEET', store.slot1, { max: 4, current: 2 });
check('combat mirror agrees', store.combat.spellSlots['1'], { used: 2, max: 4 });
check('bonus action closed', s.econ['Bonus'], false);
check('action still open', s.econ['Action'], true);
check('undo names it', s.undo, { text: 'Undo Divine Smite', disabled: false });
check('one log entry', store.log.length, 1);
check('entry carries the tier', store.log[0].spellSlotLevel, 1);
const spenders = s.rows.filter(r => /slot/.test(r.name ?? '') === false && r.why);
console.log('   blocked reasons now:', JSON.stringify([...new Set(s.rows.filter(r => r.why).map(r => r.why))]));
check('every remaining spender is disabled', s.rows.filter(r => r.why === 'You may expend only one spell slot on a turn').every(r => r.disabled), true);
check('the one-slot rule is being SAID somewhere', s.rows.some(r => r.why === 'You may expend only one spell slot on a turn'), true);

console.log('\n-- 3. the iPad suspend: reload -------------------------------');
await p.reload({ waitUntil: 'networkidle' });
s = await p.evaluate(READ);
check('slot still spent after a cold boot', s.slots['Level 1'], '2/4');
check('bonus action still closed', s.econ['Bonus'], false);
check('undo survived the reload', s.undo, { text: 'Undo Divine Smite', disabled: false });

console.log('\n-- 4. a blocked row does nothing -------------------------------');
const before = JSON.stringify(await p.evaluate(STORE, ID));
const blockedName = (await p.evaluate(READ)).rows.find(r => r.disabled)?.name;
if (blockedName) {
  await p.locator('.act, .face').filter({ hasText: blockedName }).first().click({ force: true });
  await p.waitForTimeout(120);
}
check(`clicking blocked "${blockedName}" changed nothing`, JSON.stringify(await p.evaluate(STORE, ID)), before);

console.log('\n-- 5. undo -----------------------------------------------------');
await p.locator('.edge .btn').first().click();
await p.waitForTimeout(150);
s = await p.evaluate(READ);
store = await p.evaluate(STORE, ID);
check('slot restored on screen', s.slots['Level 1'], '3/4');
check('slot restored on the SHEET', store.slot1, { max: 4, current: 3 });
check('bonus action reopened', s.econ['Bonus'], true);
check('undo is inert again', s.undo, { text: 'Undo', disabled: true });
check('log is empty', store.log.length, 0);

console.log('\n-- 6. a pool spend, and end turn -------------------------------');
await clickNamed(p, 'Lay on Hands');
s = await p.evaluate(READ);
store = await p.evaluate(STORE, ID);
check('lay on hands spent on the sheet', store.lay, 14);
check('undo names it', s.undo.text, 'Undo Lay on Hands');
await p.locator('.edge .btn').nth(1).click();
await p.waitForTimeout(150);
s = await p.evaluate(READ);
store = await p.evaluate(STORE, ID);
check('round advanced', s.round, 'Round 2');
check('bonus action reopened', s.econ['Bonus'], true);
check('the heal was NOT handed back', store.lay, 14);
check('undo now offers the turn itself', s.undo.text, 'Undo End of round 1');

console.log('\n-- 7. the slot rule lifts with the turn ------------------------');
await clickNamed(p, 'Divine Smite');
s = await p.evaluate(READ);
check('a new turn allows a new slot', s.slots['Level 1'], '2/4');

console.log('\n-- console --------------------------------------------------');
console.log(errors.length ? errors.slice(0, 6).join('\n') : '  clean');
if (errors.length) failures++;

await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(200);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice6-phone.png' });
await p.setViewportSize({ width: 1366, height: 1024 });
await p.waitForTimeout(200);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice6-ipad.png' });

await b.close();
console.log(`\n==== ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURES'} ====`);
process.exit(failures ? 1 : 0);
