// Prove Table Truth slice 2 against the REAL running app.
//
//   npm run build && npm run preview      (in another shell)
//   node docs/plans/table-truth/prove-slice2.mjs [baseUrl]
//
// Two seeds, because one is not enough to prove this slice:
//
//   A. The Nix fixture as it stands — a level 8 Paladin whose slots are CORRECT.
//      Proves the band renders and that the checker stays quiet about slots when
//      it should. (It still flags the +1 save-DC drift the fixture has always
//      carried; see vitals.test.ts test 18.)
//   B. Marcus's actual screenshot — level 7 WITH two 3rd-level slots. This is
//      the case the slice exists for, and a prover that never renders it would
//      be proving the easy half.
//
// Same storage guard as slice 1: the band must not write. It has UI state
// (the flag fold) and that state is deliberately not persisted, so a changed
// codex-* key here means a real regression, not a preference being saved.
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
const OUT = 'docs/plans/table-truth/_shots-slice2';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

// Seed B: exactly what his screenshot showed — level 7, and slot pips at 3rd.
const NIX_L7 = {
  ...NIX,
  level: 7,
  spellSlots: {
    ...NIX.spellSlots,
    3: { max: 2, current: 2 },
  },
};

const browser = await chromium.launch();
const report = { cases: [], errors: [] };

async function shoot(name, seed, id) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
  });
  await ctx.addInitScript(
    ([id, seedJson]) => {
      localStorage.setItem('codex-character-' + id, seedJson);
      localStorage.setItem('codex-active-id', id);
      localStorage.setItem('codex-roster', JSON.stringify([
        { id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 7,
          updatedAt: '2026-08-16T00:00:00.000Z' },
      ]));
      localStorage.setItem('codex-combat-' + id, JSON.stringify({
        inCombat: false, round: 0, actionUsed: false, bonusUsed: false,
        reactionUsed: false, movementUsed: 0, concentration: null,
      }));
    },
    [id, JSON.stringify(seed)],
  );

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  const before = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
    }
    return out;
  });

  await page.screenshot({ path: `${OUT}/${name}.png` });

  // The five vitals boxes, read off the painted DOM rather than assumed.
  const stats = await page.evaluate(() => {
    const labels = ['Save DC', 'AC', 'Init', 'Prof', 'Sp Atk'];
    const out = {};
    for (const el of document.querySelectorAll('span')) {
      const text = (el.textContent || '').trim();
      if (!labels.includes(text)) continue;
      const value = el.parentElement?.querySelector('span')?.textContent?.trim();
      if (value && value !== text) out[text] = value;
    }
    return out;
  });

  // The discrepancy block, if the checker fired.
  const flagHeader = await page
    .getByRole('button', { name: /disagree on/ })
    .first()
    .textContent()
    .catch(() => null);

  const flagBody = flagHeader
    ? await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find((b) => /disagree on/.test(b.textContent || ''));
        return btn?.parentElement?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      })
    : null;

  // Touch floor on the one new control this slice adds.
  let tap = null;
  if (flagHeader) {
    const box = await page.getByRole('button', { name: /disagree on/ }).first().boundingBox();
    tap = box ? Math.round(box.height) : null;
  }

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
    if (before[key] !== after[key]) changed.push(key);
  }

  report.errors.push(...errors);
  report.cases.push({
    name, stats,
    flagHeader: flagHeader?.replace(/\s+/g, ' ').trim() ?? null,
    flagBody, tap,
    keysWatched: Object.keys(before).length, changed,
  });
  await ctx.close();
}

await shoot('A-level8-slots-correct', NIX, 'nix-slice2-a');
await shoot('B-level7-with-3rd-slots', NIX_L7, 'nix-slice2-b');

writeFileSync(`${OUT}/_report.json`, JSON.stringify(report, null, 2));

console.log(`\nSLICE 2 PROOF — ${BASE}\n`);
for (const c of report.cases) {
  console.log(`── ${c.name}`);
  console.log(`   vitals:  ${Object.entries(c.stats).map(([k, v]) => `${k} ${v}`).join(' · ') || '(NONE FOUND)'}`);
  console.log(`   flag:    ${c.flagHeader ?? '(none — checker silent)'}`);
  console.log(`   tap:     ${c.tap ?? 'n/a'}px  (floor is 44)`);
  console.log(`   storage: ${c.keysWatched} keys watched, ${c.changed.length} changed ${c.changed.join(', ')}`);
}
console.log(`\nconsole: ${report.errors.length} error(s)`);
for (const e of report.errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:   ${OUT}/`);

await browser.close();

const five = (c) => Object.keys(c.stats).length === 5;
const failed =
  report.errors.length > 0 ||
  report.cases.some((c) => c.changed.length > 0) ||
  report.cases.some((c) => !five(c)) ||
  report.cases.some((c) => c.tap !== null && c.tap < 44) ||
  // Case B MUST flag the slots. If it does not, this slice did not ship.
  !/disagree on/.test(report.cases[1]?.flagHeader ?? '');
process.exit(failed ? 1 : 0);
