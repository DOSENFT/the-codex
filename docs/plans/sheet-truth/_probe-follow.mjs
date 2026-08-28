// SLICE 2 PROOF — does the number FOLLOW the edit?
//
//   npx vite preview --port 4216 --host
//   node docs/plans/sheet-truth/_probe-follow.mjs [url]
//
// _probe-baseline.mjs seeds an ALREADY-INCONSISTENT sheet and asks whether the
// screen shows the right number. Slice 1 answered that. It cannot prove slice 2,
// because after slice 1 `loadCharacter` resolves on boot — seed a stale pair and
// it is silently repaired before the first paint, so the probe would pass with
// slice 2 entirely absent.
//
// So this one starts CONSISTENT — Charisma 18, save DC 15, attack +7, which is
// exactly right for Charisma 18 — and then does what Marcus does: opens Prep,
// taps CHA, types 16, confirms. Nothing is seeded stale. The staleness has to be
// MANUFACTURED BY THE APP, through its own edit path, which is the fault he
// reported:
//
//   "The prep tab, which was connected it seemed, seems to not be at all
//    connected with the combat module directly."
//
// Read three times, and the middle one is the point:
//   A. before the edit   — DC 15 / +7, correct for CHA 18.
//   B. after the edit, NO RELOAD — the React-state path. This is the one that
//      was broken: `useCharacter.update` re-seated the component's own stale
//      spread. Slice 1 could not have caught it; nothing had reloaded.
//   C. after a reload    — the storage path, guarded by slice 1.
//
// Vitals are read as label -> value pairs off the DOM (finding Q: an innerText
// regex proves the model, not the screen).
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4216/the-codex/').replace(/\/?$/, '/');
/* A tag, so the run against the reverted build and the run against the real one
 * do not overwrite each other's screenshots. Two shots of the same filename is
 * how a before/after pair silently becomes an after/after pair. */
const TAG = process.argv[3] || 'after';
const OUT = `${dirname(fileURLToPath(import.meta.url))}/shots`;
const NIX = await loadNix();

/* Nix as he was BEFORE the edit, and self-consistent: CHA 18 -> +4, prof +3,
 * so DC = 8+3+4 = 15 and attack = 3+4 = +7. There is nothing wrong with this
 * sheet. The app has no repair to make on boot. */
const BEFORE = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3,
  spellSaveDC: 15, spellAttackBonus: 7,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 18 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

/* What the 2024 rules give once Charisma is 16: +3 mod, prof +3. */
const AFTER_TRUTH = { 'Save DC': '14', 'Sp Atk': '+6', 'Prof': '+3', 'AC': '18', 'Init': '+1' };
const BEFORE_TRUTH = { 'Save DC': '15', 'Sp Atk': '+7', 'Prof': '+3', 'AC': '18', 'Init': '+1' };

const readVitals = () => document.querySelectorAll('*').length && (() => {
  const out = {};
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    const label = (el.textContent || '').trim();
    if (!/^(Save DC|AC|Init|Prof|Sp Atk)$/i.test(label)) continue;
    out[label] = (el.parentElement?.textContent ?? '').trim().replace(label, '').trim();
  }
  return out;
})();

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  hasTouch: true, reducedMotion: 'reduce',
});
/* SEED ONCE, not on every navigation. `addInitScript` runs before EVERY
 * document, and the first draft of this probe let it run again on the reload
 * in stage C — which put the untouched CHA-18 seed back and reported stage C
 * as failing on a build where it had not. The probe was measuring its own
 * setup. The guard key makes the seed a one-off, so the reload sees only what
 * the app itself wrote. */
await ctx.addInitScript(([id, seed, combat]) => {
  if (localStorage.getItem('probe-seeded')) return;
  localStorage.setItem('probe-seeded', '1');
  localStorage.setItem('codex-character', seed);
  localStorage.setItem(`codex-combat-${id}`, combat);
}, [BEFORE.id, JSON.stringify(BEFORE), IN_COMBAT]);
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

/* ── A. before the edit ─────────────────────────────────────────────── */
const before = await page.evaluate(readVitals);
await page.screenshot({ path: `${OUT}/slice2-a-before-edit-${TAG}.png` });

/* ── the edit, through the real UI ──────────────────────────────────── */
/* FINDING BH — why these are attribute selectors and not getByRole.
 *
 * `getByRole('button', { name: 'Character' })` resolves to ZERO elements on
 * this screen, while `button[aria-label="Character"]` resolves to exactly one
 * that is visible, enabled, 97×64 at (0,780) and clicks fine. The cause: the
 * Dice Roller and the Mechanics Reference are BOTH mounted at all times, both
 * carry `aria-modal="true"`, and both sit at y=844 — parked one viewport below
 * the fold rather than unmounted. Two simultaneous open modals corrupt the
 * accessibility tree, and the bottom navigation falls out of it.
 *
 * That is finding BC, which was logged as a layout curiosity, promoted to an
 * accessibility fault: a screen-reader user cannot reach the tab bar. It is
 * NOT in slice 2's scope and nothing here fixes it — it is recorded in
 * 00-status.md so it cannot be quietly forgotten, and the probe routes around
 * it structurally so that a11y damage can never be mistaken for a slice-2
 * failure. */
const tap = sel => page.locator(sel).first().click();
await tap('button[aria-label="Switch to prep mode"]');
await page.waitForTimeout(400);
await tap('button[aria-label="Character"]');
await page.waitForTimeout(500);

/* Locate the CHA tile by SHAPE, never by a class name or an nth-child: the
 * button whose own first leaf reads exactly "CHA". The saving-throw buttons
 * beside it also say CHA, but they carry an explicit aria-label, so they are
 * excluded by the leaf-text test rather than by a guess about ordering. */
const tagged = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if (b.getAttribute('aria-label')) continue;
    const first = b.firstElementChild;
    if (first && first.children.length === 0 && (first.textContent || '').trim() === 'CHA') {
      b.setAttribute('data-probe', 'cha-tile');
      return (b.textContent || '').replace(/\s+/g, ' ').trim();
    }
  }
  return null;
});
if (!tagged) { console.error('FAILED: no CHA tile found in Prep'); await browser.close(); process.exit(1); }
console.log(`CHA tile before the edit : "${tagged}"`);

await page.click('[data-probe="cha-tile"]');
await page.waitForTimeout(300);
const input = page.locator('[data-probe="cha-tile"] input[type="number"]');
await input.waitFor({ state: 'visible', timeout: 3000 });
await input.fill('16');
await input.press('Enter');
await page.waitForTimeout(500);
const tileAfter = await page.evaluate(() =>
  (document.querySelector('[data-probe="cha-tile"]')?.textContent || '').replace(/\s+/g, ' ').trim());
console.log(`CHA tile after the edit  : "${tileAfter}"`);
await page.screenshot({ path: `${OUT}/slice2-b-prep-after-edit-${TAG}.png` });

/* ── B. back to combat, WITHOUT a reload ────────────────────────────── */
await tap('button[aria-label="Switch to session mode"]');
await page.waitForTimeout(400);
await tap('button[aria-label="Combat"]');
await page.waitForTimeout(700);
const noReload = await page.evaluate(readVitals);
await page.screenshot({ path: `${OUT}/slice2-c-combat-no-reload-${TAG}.png` });

/* ── C. and after a reload ──────────────────────────────────────────── */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const reloaded = await page.evaluate(readVitals);

/* ── verdict ────────────────────────────────────────────────────────── */
const cmp = (got, want) => Object.entries(want)
  .filter(([k, v]) => got[k] !== v)
  .map(([k, v]) => `${k}: shows ${JSON.stringify(got[k])}, truth ${JSON.stringify(v)}`);

const stages = [
  ['A  before the edit          (CHA 18)', before, BEFORE_TRUTH],
  ['B  after the edit, NO RELOAD (CHA 16)', noReload, AFTER_TRUTH],
  ['C  after a reload            (CHA 16)', reloaded, AFTER_TRUTH],
];
let failures = 0;
for (const [name, got, want] of stages) {
  const bad = cmp(got, want);
  failures += bad.length;
  console.log(`\n=== ${name} ===`);
  console.log(`  painted: ${JSON.stringify(got)}`);
  bad.length ? bad.forEach(b => console.log(`  WRONG  ${b}`)) : console.log('  ok — every vital matches the 2024 rules');
}
console.log(`\nTOTAL DISAGREEMENTS: ${failures}   (target: 0)`);
console.log(`B is the slice-2 claim: the edit reached combat with nothing reloaded.`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
