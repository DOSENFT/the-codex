// Prove Table Truth slice 1 against the REAL running app.
//
//   npm run build && npm run preview      (in another shell)
//   node docs/plans/table-truth/prove-slice1.mjs [baseUrl]
//
// Shoots the Play/Combat tab with the canon match report collapsed and expanded,
// and — the part that actually matters — asserts that mounting the new code
// leaves every one of Marcus's localStorage keys byte-identical. Slice 1 is a
// tracer bullet; a tracer bullet that writes to his real sheet is not a tracer
// bullet, it is a bug with a nice comment.
//
// Playwright stays a reference tool resolved from the npx cache, never a trunk
// dependency — the app must build on a machine that has never heard of it.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); }
    catch { return []; }
  })(),
];
let chromium;
try {
  const entry = req.resolve('playwright', { paths: searchPaths });
  const mod = await import(pathToFileURL(entry).href);
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4173/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-slice1';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const SEED_ID = 'nix-shoot-fixture';
const NIX = await loadNix();

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: PHONE.width, height: PHONE.height },
  deviceScaleFactor: PHONE.dsf,
  hasTouch: true,
});

await ctx.addInitScript(
  ([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-roster', JSON.stringify([
      { id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 8,
        updatedAt: '2026-08-16T00:00:00.000Z' },
    ]));
    // A pre-existing combat state, so the "did we write?" check has something
    // real to protect rather than an absent key that is trivially unchanged.
    localStorage.setItem('codex-combat-' + id, JSON.stringify({
      inCombat: false, round: 0, actionUsed: false, bonusUsed: false,
      reactionUsed: false, movementUsed: 0, concentration: null,
    }));
  },
  [SEED_ID, JSON.stringify(NIX)],
);

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);

// ── The storage guard (plan tests 25 and 26) ──────────────────────────────
// Snapshot every codex-* key AFTER the first full render, then render again by
// navigating away and back, and compare. Any difference is the new code writing.
const before = await page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

const report = { errors: [], shots: [], storage: {} };

// ── Shot 1: the strip as it sits, collapsed ───────────────────────────────
await page.screenshot({ path: `${OUT}/combat-canon-strip-collapsed.png` });
report.shots.push('combat-canon-strip-collapsed.png');

const strip = page.getByRole('button', { name: /Canon .* spells/ }).first();
const stripText = await strip.textContent().catch(() => null);
if (!stripText) {
  console.error('FAIL: the canon match report strip is not on the Combat tab.');
  report.errors.push('strip not found');
} else {
  report.stripText = stripText.replace(/\s+/g, ' ').trim();

  const box = await strip.boundingBox();
  report.stripTouchHeight = box ? Math.round(box.height) : null;

  // ── Shot 2: expanded, showing what canon does NOT cover ─────────────────
  await strip.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/combat-canon-strip-expanded.png` });
  report.shots.push('combat-canon-strip-expanded.png');

  report.expandedText = (await page.locator('section[aria-label="Combat Helper"] > div').first()
    .textContent()).replace(/\s+/g, ' ').trim();
}

// Re-render: leave the tab and come back, then re-snapshot storage.
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(900);

const after = await page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

const changed = [];
for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
  if (before[key] !== after[key]) {
    changed.push({ key, before: (before[key] ?? '(absent)').slice(0, 80),
                        after: (after[key] ?? '(absent)').slice(0, 80) });
  }
}
report.storage = { keysWatched: Object.keys(before).length, changed };

report.errors.push(...errors);

writeFileSync(`${OUT}/_report.json`, JSON.stringify(report, null, 2));

console.log(`\nSLICE 1 PROOF — ${BASE}\n`);
console.log(`strip:      ${report.stripText ?? '(NOT FOUND)'}`);
console.log(`tap target: ${report.stripTouchHeight}px  (floor is 44)`);
console.log(`storage:    ${report.storage.keysWatched} codex-* keys watched, ` +
            `${changed.length} changed`);
for (const c of changed) console.log(`   CHANGED ${c.key}\n     was: ${c.before}\n     now: ${c.after}`);
console.log(`console:    ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:      ${OUT}/`);

await browser.close();

const failed = changed.length > 0 || errors.length > 0 || !report.stripText
  || (report.stripTouchHeight ?? 0) < 44;
process.exit(failed ? 1 : 0);
