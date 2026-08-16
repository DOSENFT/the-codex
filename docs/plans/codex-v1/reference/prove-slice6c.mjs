// Slice 6c proof — a character made of nothing the app has ever seen.
//
// The unit suite (`src/lib/turn/openworld.test.ts`) proves the ENGINE handles
// invented content. This proves the claim the slice was actually taken for,
// which no unit test can make: that the shipped build renders a whole turn for
// a class, subclass, species, weapon, mastery, spell, feature, condition and
// resource that exist only in Marcus's head — and that he can spend and undo
// on it with his thumbs, with a clean console.
//
// Slice 6b learned this the hard way: both bugs that slice found were invisible
// to unit tests and invisible on a screenshot. A resource that cannot be seen
// on the screen that spends it, and a row that looks live and is refused on
// tap, both pass `vitest` all day.
//
// The character is loaded from the SAME fixture the tests drive, via
// nix-seed.mjs, so it cannot drift into a second version of itself.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice6c.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadTidewright } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const VESS = await loadTidewright();
const ID = VESS.id;
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
  const pool = (s.resourcePools ?? []).find(p => p.id === 'saltwater-tally') ?? null;
  return {
    tally: pool ? pool.current : null,
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
    rider: e.querySelector('.rider')?.textContent ?? null,
    // The one line under the name. Both halves are built independently and
    // both carried the range, so this printed "Self · Self" on screen while
    // every unit test passed. Captured here so the proof can see the line the
    // way the eye does.
    // A mutex face nests its rank note inside `.fd`, so read only the element's
    // own text — otherwise the note would be scanned as part of the line.
    det: (() => {
      const d = e.querySelector('.det') || e.querySelector('.fd');
      if (!d) return '';
      return [...d.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
    })(),
    text: e.textContent ?? '',
  }));
  const [undoBtn] = q('.edge .btn');
  return {
    strip, rows,
    upon: q('.upon .tag').map(t => ({
      k: t.querySelector('.k')?.textContent,
      t: t.querySelector('.t')?.textContent,
    })),
    undo: { text: undoBtn?.textContent, disabled: undoBtn?.disabled },
    refusal: document.querySelector('.refusal')?.textContent ?? null,
  };
};

const row = (v, name) => v.rows.find(r => r.name === name) ?? null;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1 });
await ctx.addInitScript(([id, seed]) => {
  // SEED ONCE — this script navigates several times and a re-seed on any of
  // them would hand back the tally it is trying to prove was spent.
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
  }
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-roster', JSON.stringify([{
    id, name: 'Vess Corrow', class: 'Tidewright', subclass: 'Vow of the Undertow',
    level: 7, updatedAt: '2026-08-16T00:00:00.000Z',
  }]));
}, [ID, JSON.stringify(VESS)]);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// ---------------------------------------------------------------------------
console.log('\n-- 1. the turn screen renders for a class that does not exist --');
await p.goto(TURN, { waitUntil: 'networkidle' });
await p.waitForSelector('.act, .face', { timeout: 10000 });
let v = await p.evaluate(TURNVIEW);

check('it composed a turn at all, for a Tidewright', v.rows.length > 0, true);

// THE BUG THIS SLICE FOUND. Declared an Action by its author, and hidden
// anyway because the word 'aura' was in the name.
const aura = row(v, 'Undertow Aura');
check('the feature he declared an Action is ON THE SCREEN', aura !== null, true);
check('  ...priced from the pool, in the pool\'s own unit', aura?.cost, 'Action · 2 of 6 dice');
check('  ...and it is live', aura?.disabled, false);

// A homebrew mastery keeps its word — ONCE. `compose.ts` echoes the declared
// name into `text` when it has no rule to offer, which rendered as
// "Undertow — Undertow" until this slice. Found by looking at the screenshot,
// not by any assertion: it passes every unit test in the repo.
check('the homebrew mastery reaches the screen, in his word',
  /Mastery: Undertow/.test(row(v, 'Brinehook')?.text ?? ''), true);
check('  ...and the row says that word ONCE, not twice',
  (row(v, 'Brinehook')?.text.match(/Undertow/g) ?? []).length, 1);
check('  ...so no empty rider line is rendered for it',
  row(v, 'Brinehook')?.rider, null);
check('a weapon that declares no mastery gets no rider at all',
  row(v, "Tidewright's Lash")?.rider, null);

// THE SECOND THING THE SCREENSHOT FOUND. `detail` joins two lines that were
// each built correctly and that both ended with the feature's range, so every
// feature that declares one printed it twice: "Self · Self", "10 feet · 10
// feet", and on Nix "Touch · Touch · 15/40 uses". Correct on both sides of the
// join, therefore invisible to every assertion in the repo until one looked at
// the joined string.
const repeats = v.rows
  .map(r => {
    const segs = r.det.split(' · ').map(s => s.trim().toLowerCase()).filter(Boolean);
    const dupe = segs.find((s, i) => segs.indexOf(s) !== i) ?? null;
    return dupe ? `${r.name}: ${r.det}` : null;
  })
  .filter(Boolean);
check('no row says the same thing twice on its one line', repeats, []);
check('  ...and the aura still states its range, once',
  row(v, 'Undertow Aura')?.det.includes('10 feet'), true);

// ---------------------------------------------------------------------------
console.log('\n-- 2. his condition, in his words ------------------------------');
const upon = v.upon.find(u => u.k === 'Undertowed');
check('a condition the rulebook has never heard of still displays', upon !== undefined, true);
check('  ...carrying HIS sentence, not a summary of the flags',
  upon?.t, VESS.customConditions[0].note);

const ward = row(v, 'Salt Ward');
check('and it closes the Reaction it says it closes', ward?.disabled, true);
check('  ...with a reason, rather than by vanishing', typeof ward?.why === 'string' && ward.why.length > 0, true);

// ---------------------------------------------------------------------------
console.log('\n-- 3. the authored pool, in the unit he chose ------------------');
// Slice 6b's lesson: a mutex face suppresses its own pool from the strip, on
// the grounds that the face already prices it. So the tally's reading lives on
// the FACE above, and the strip must not repeat it. Whichever side shows it,
// exactly one side must.
const stripHasTally = Object.keys(v.strip).some(k => /Saltwater Tally/.test(k));
check('the strip does not repeat a pool a face already prices', stripHasTally, false);
check('the OTHER pool-spender is priced too',
  row(v, 'Set Your Feet')?.cost, 'Bonus action · 6/6 dice');

// ---------------------------------------------------------------------------
console.log('\n-- 4. he spends it ---------------------------------------------');
await p.locator('.act, .face').filter({ hasText: 'Undertow Aura' }).first().click();
await p.waitForTimeout(250);
v = await p.evaluate(TURNVIEW);
check('no refusal — the row and the reducer agreed', v.refusal, null);
check('the tally is down two dice, on the sheet', (await p.evaluate(SHEET, ID)).tally, 4);
check('and the undo names what it will undo', v.undo.text, 'Undo Undertow Aura');
const log = (await p.evaluate(SHEET, ID)).log;
check('one log entry, restoring by POOL ID',
  log.length === 1 && Object.keys(log[0].restore.pools ?? {}), ['saltwater-tally']);

// ---------------------------------------------------------------------------
console.log('\n-- 5. the iPad goes to sleep and comes back --------------------');
await p.goto(TURN, { waitUntil: 'networkidle' });
await p.waitForSelector('.act, .face', { timeout: 10000 });
v = await p.evaluate(TURNVIEW);
check('still four dice after a reload', (await p.evaluate(SHEET, ID)).tally, 4);
check('and the undo is still offered', v.undo.text, 'Undo Undertow Aura');

// ---------------------------------------------------------------------------
console.log('\n-- 6. he takes it back -----------------------------------------');
await p.locator('.edge .btn').first().click();
await p.waitForTimeout(250);
check('six dice again, exactly', (await p.evaluate(SHEET, ID)).tally, 6);
check('and the log is empty', (await p.evaluate(SHEET, ID)).log.length, 0);

// ---------------------------------------------------------------------------
console.log('\n-- 7. the console ----------------------------------------------');
check('nothing threw, for content nothing was written for', errors, []);

// ---------------------------------------------------------------------------
for (const [label, width, height] of [['phone', 390, 844], ['ipad', 1024, 1366]]) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(TURN, { waitUntil: 'networkidle' });
  await page.waitForSelector('.act, .face', { timeout: 10000 });
  await page.screenshot({ path: `_shots-app/slice6c-openworld-${label}.png`, fullPage: false });
  await page.close();
}
console.log(`\n  shots: _shots-app/slice6c-openworld-{phone,ipad}.png`);

await b.close();
console.log(failures === 0 ? '\nALL CHECKS PASS\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
