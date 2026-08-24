/* NEGATIVE CONTROL for A-19 — the one-tab false refusal.
   ---------------------------------------------------------------------------
   Independent verification of `e4a8035` (D-4, refuse-and-reconcile) found that
   the guard fired in a browser with ONE TAB OPEN. `CampaignEditor` mounts when
   Settings opens and calls `saveCharacter` directly, never through the hook
   that was keeping the record of what disk held — so disk moved, the hook's
   ref did not, and the next ordinary spend was refused with a notice blaming a
   window that did not exist. Marcus lost a Lay on Hands charge every time he
   opened Settings.

   This drives exactly that: import, open Settings, close it, spend once.
   There is no second tab and no second context anywhere in this file.

     want   35 → 30, no alarm
     e4a8035  35 → 35, "This character was changed in another window…"

   `--prev` runs it against the e4a8035 worktree; no flag runs the current
   build. A fix that cannot be watched failing here is not proven. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-a19/dist';
const prev = process.argv.includes('--prev');
const dir = prev ? PREV : DIST;
const label = prev ? 'PREV e4a8035 (readAt lived in the hook)' : 'HEAD (the record lives at the write)';
const port = prev ? 4272 : 4273;

const FULL = realCopy('full');

const pool = page => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  if (!k) return null;
  try { return JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current; }
  catch { return null; }
});
const alarm = page => page.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});

const srv = await serveDist(dir, port);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));

const page = await ctx.newPage(); watch(page);
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
const start = await pool(page);

// The bypass write: opening Settings mounts CampaignEditor, which saves.
await page.getByRole('button', { name: /Open settings/i }).first().click();
await page.waitForTimeout(900);
const afterSettings = await pool(page);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

// One ordinary spend, in the only tab that exists.
await page.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
await page.waitForTimeout(900);
const afterSpend = await pool(page);
const told = await alarm(page);

const { faults } = await judge(page);

console.log(`\n\x1b[1mA-19 one tab, open Settings, then spend — ${label}\x1b[0m  ${dir}\n`);
console.log(`  pool after import           ${start}`);
console.log(`  pool after opening Settings ${afterSettings}`);
console.log(`  pool after ONE Heal 5       ${afterSpend}   (want ${start - 5})`);
console.log(`  false alarm                 ${/another window/i.test(told) ? '\x1b[31mYES\x1b[0m — ' + JSON.stringify(told.slice(0, 90)) : 'none'}`);
console.log(`  faults                      ${faults.length ? faults.join(' | ') : 'none'}`);
const ok = afterSpend === start - 5 && !/another window/i.test(told) && !faults.length;
console.log(`\n  ${ok ? '\x1b[32mA-19 PASSES\x1b[0m' : '\x1b[31mA-19 FAILS\x1b[0m'} on this build\n`);

await ctx.close(); await b.close(); await srv.close();
