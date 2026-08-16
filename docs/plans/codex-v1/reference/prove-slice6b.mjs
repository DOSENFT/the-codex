// Slice 6b proof — a resource NOBODY WROTE CODE FOR, spent at the table.
//
// The unit tests prove `resources.ts`. This proves the claim the slice was
// actually taken for, which no unit test can make: that Marcus, with only his
// thumbs and the shipped build, can invent a resource his class does not have,
// bind a feature to it, spend it from the turn screen, and undo the spend —
// and that nothing anywhere in the app knew "Hearth Embers" existed.
//
// Every step below is a real tap on a real control. The only thing this script
// reaches into is localStorage, and only to READ it: the whole point is that
// what the screen says and what survives a reload are the same fact.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice6b.mjs
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
// The seed's OWN id — loadCharacter() returns `parsed.id ?? id`, so the key the
// app writes back to is the one inside the JSON. (Slice 6 lost a run to this.)
const ID = NIX.id;
const BASE = 'http://localhost:4173/the-codex/';
const TURN = BASE + '?d=1';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

/** The sheet as it is actually persisted. Nothing here is app state. */
const SHEET = id => {
  const s = JSON.parse(localStorage.getItem('codex-character-' + id));
  const pool = (s.resourcePools ?? []).find(p => p.id === 'hearth-embers') ?? null;
  const ward = s.features.find(f => f.name === 'Ember Ward') ?? null;
  return {
    pool: pool && { id: pool.id, name: pool.name, current: pool.current, max: pool.max, unit: pool.unit, recharge: pool.recharge },
    ward: ward && { poolId: ward.resourcePoolId ?? null, amount: ward.resourceAmount ?? null, ownCounter: ward.usesMax ?? null },
    log: JSON.parse(localStorage.getItem('codex-combat-log-' + id) || '[]'),
  };
};

/** What the turn screen is saying, read the way an eye reads it. */
const TURNVIEW = () => {
  const q = s => [...document.querySelectorAll(s)];
  const strip = {};
  q('.res .rgrp').forEach(g => { strip[g.querySelector('.k').textContent] = g.querySelector('.v').textContent; });
  const rows = q('.act, .face').map(e => ({
    name: (e.querySelector('.anm') || e.querySelector('.fnm'))?.textContent,
    disabled: e.disabled === true,
    why: e.querySelector('.why')?.textContent ?? null,
    cost: e.querySelector('.ac')?.textContent ?? e.querySelector('.fc')?.textContent ?? null,
  }));
  const [undoBtn] = q('.edge .btn');
  return {
    strip, rows,
    undo: { text: undoBtn?.textContent, disabled: undoBtn?.disabled },
    refusal: document.querySelector('.refusal')?.textContent ?? null,
  };
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1 });
await ctx.addInitScript(([id, seed]) => {
  // SEED ONCE — this script navigates five times and a re-seed on any of them
  // would hand back the pool it is trying to prove was spent.
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
  }
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-app-mode', 'prep');
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 8, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [ID, JSON.stringify(NIX)]);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// ---------------------------------------------------------------------------
console.log('\n-- 1. the sheet, before Hearth Embers exists -------------------');
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForSelector('.dres', { timeout: 10000 });
check('no such pool on the sheet yet', (await p.evaluate(SHEET, ID)).pool, null);
check('Lay on Hands is already listed, and as POINTS',
  await p.locator('.dres-pool', { hasText: 'Lay on Hands' }).locator('.dres-sub').first().textContent()
    .then(t => /points/.test(t)), true);

// ---------------------------------------------------------------------------
console.log('\n-- 2. Marcus invents a resource -------------------------------');
await p.locator('.dres-new', { hasText: 'New pool' }).click();
await p.fill('#dres-name', 'Hearth Embers');
await p.fill('#dres-cur', '5');
await p.fill('#dres-max', '5');
await p.locator('.dres-segs button', { hasText: 'points' }).click();
await p.locator('.dres-segs button', { hasText: 'long rest' }).click();
await p.fill('#dres-note', 'Banked warmth. Spend to shelter an ally.');
await p.locator('.dres-editing .dres-save').click();
await p.waitForTimeout(200);

check('the pool is on the sheet, in storage', (await p.evaluate(SHEET, ID)).pool, {
  id: 'hearth-embers', name: 'Hearth Embers', current: 5, max: 5, unit: 'points', recharge: 'longRest',
});
check('and on screen, with his own sentence under it',
  await p.locator('.dres-pool', { hasText: 'Hearth Embers' }).locator('.dres-note').textContent(),
  'Banked warmth. Spend to shelter an ally.');
check('five pips, not a gauge — five is countable',
  await p.locator('.dres-pool', { hasText: 'Hearth Embers' }).locator('.dres-pipbtn').count(), 5);
check('every pip is a 48px target',
  await p.locator('.dres-pool', { hasText: 'Hearth Embers' }).locator('.dres-pipbtn').first()
    .boundingBox().then(bb => [Math.round(bb.width), Math.round(bb.height)]), [48, 48]);

// ---------------------------------------------------------------------------
console.log('\n-- 3. a feature that draws on it ------------------------------');
await p.locator('nav[aria-label="Main navigation"] button[aria-label="Grimoire"]').click();
await p.locator('button', { hasText: /^Feature$/ }).first().click();
await p.waitForSelector('[role="dialog"]', { timeout: 5000 });
await p.getByLabel('Feature Name').or(p.getByLabel('Name')).first().fill('Ember Ward');
await p.getByLabel('Spends From').selectOption('hearth-embers');
await p.getByLabel('Amount Per Use').fill('2');
await p.locator('[role="dialog"] button', { hasText: /Add Feature|Save Changes/ }).click();
await p.waitForTimeout(250);

check('the binding persisted, and no private counter was invented',
  (await p.evaluate(SHEET, ID)).ward, { poolId: 'hearth-embers', amount: 2, ownCounter: null });

// ---------------------------------------------------------------------------
console.log('\n-- 4. the table: spend it from the turn screen -----------------');
await p.goto(TURN, { waitUntil: 'networkidle' });
let v = await p.evaluate(TURNVIEW);
const ward = v.rows.find(r => r.name === 'Ember Ward');
check('Ember Ward is on the turn screen and takeable', ward && { disabled: ward.disabled }, { disabled: false });
// The first run of this script FAILED here, and the failure was the app's, not
// the harness's. Ember Ward lands on a mutex face; the strip deliberately drops
// any pool a face already prices (TurnScreenD:148) — but the face's own label
// came from `option.usesRemaining`, which a pool-bound feature does not have.
// So the face said "Action", the strip said nothing, and a resource Marcus had
// just invented was invisible on the one screen that spends it. Now the face
// carries the price AND the reading, and this asserts the whole sentence.
check('the face states the price and what is left, in the pool own unit',
  ward?.cost, 'Action · 2 of 5 points');
check('the strip does not then say it twice', v.strip['Hearth Embers'], undefined);

await p.locator('.act, .face').filter({ hasText: 'Ember Ward' }).first().click();
await p.waitForTimeout(200);
v = await p.evaluate(TURNVIEW);
let sheet = await p.evaluate(SHEET, ID);
check('two embers gone on screen', v.strip['Hearth Embers'], '3/5');
check('two embers gone on the SHEET', sheet.pool.current, 3);
check('the undo names his own feature', v.undo, { text: 'Undo Ember Ward', disabled: false });
check('exactly one log entry', sheet.log.length, 1);
check('the entry records the pool by id, not by shape',
  Object.keys(sheet.log[0].restore?.pools ?? {}), ['hearth-embers']);

// ---------------------------------------------------------------------------
console.log('\n-- 5. the iPad suspend ----------------------------------------');
await p.reload({ waitUntil: 'networkidle' });
v = await p.evaluate(TURNVIEW);
check('still spent after a cold boot', v.strip['Hearth Embers'], '3/5');
check('the undo survived it too', v.undo.text, 'Undo Ember Ward');

// ---------------------------------------------------------------------------
console.log('\n-- 6. undo -----------------------------------------------------');
await p.locator('.edge .btn').first().click();
await p.waitForTimeout(200);
v = await p.evaluate(TURNVIEW);
sheet = await p.evaluate(SHEET, ID);
// The action reopens, so the mutex face comes back and takes the reading with
// it — which is why this reads the face and step 4's post-tap check read the
// strip. Same fact, stated wherever the screen is currently carrying it.
check('restored on screen',
  v.rows.find(r => r.name === 'Ember Ward')?.cost, 'Action · 2 of 5 points');
check('restored on the SHEET', sheet.pool.current, 5);
check('undo is inert again', v.undo, { text: 'Undo', disabled: true });
check('the log is empty', sheet.log.length, 0);

// ---------------------------------------------------------------------------
console.log('\n-- 7. the refusal: spend it dry, then ask again ----------------');
for (let i = 0; i < 3; i++) {
  await p.locator('.act, .face').filter({ hasText: 'Ember Ward' }).first().click({ force: true });
  await p.waitForTimeout(120);
  await p.locator('.edge .btn').nth(1).click(); // End turn — a fresh action each round
  await p.waitForTimeout(160);
}
v = await p.evaluate(TURNVIEW);
sheet = await p.evaluate(SHEET, ID);
check('spent down to one, not below zero', sheet.pool.current, 1);
const dry = v.rows.find(r => r.name === 'Ember Ward');
// The second failure the first run found: the row stayed LIVE at 1 ember and
// the reducer refused the tap. `options.ts` read affordability off the
// feature's own `usesCurrent`, which a pool-bound feature does not have. At a
// table the tap that gets refused is the one that costs you the round.
check('and the row now says WHY, in his own words', dry?.why, 'Not enough Hearth Embers left');
check('and it is disabled, not merely sad-looking', dry?.disabled, true);

// ---------------------------------------------------------------------------
console.log('\n-- console --------------------------------------------------');
console.log(errors.length ? errors.slice(0, 6).join('\n') : '  clean');
if (errors.length) failures++;

await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(200);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice6b-turn-phone.png' });
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForSelector('.dres');
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice6b-ledger-phone.png', fullPage: true });
await p.setViewportSize({ width: 1024, height: 1366 });
await p.waitForTimeout(250);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/slice6b-ledger-ipad.png', fullPage: true });

await b.close();
console.log(`\n==== ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURES'} ====`);
process.exit(failures ? 1 : 0);
