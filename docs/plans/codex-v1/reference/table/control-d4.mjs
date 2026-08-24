/* NEGATIVE CONTROL for D-4 (Amendment A-17).
   D-4 was green for the whole of this project's life while the bug it names was
   sitting in `useCharacter`. §11 found the clobber by hand, on a build the
   grader had just called clean. So the tightened criterion does not get to be
   believed either until it has been watched to fail.

   Runs the identical two-tab scenario against c2aa5bb — the commit immediately
   BEFORE refuse-and-reconcile, and immediately AFTER the N-4 and §9.11 work, so
   what this measures is the write path and nothing else. `--now` runs it against
   the current build.

   The arithmetic is the whole point, and it is why tab one spends twice:

     start 35 · tab 1 spends 5 twice → 25 · stale tab 2 spends 5
       last-write-wins  → 30   (tab 2 writes 35−5 over tab 1's 25)
       refuse+reconcile → 25   (tab 2's write never lands)

   30 is a number that cannot be reached without a lost write. The old criterion
   had tab one spend ONCE, so both outcomes read 30 and it could not fail. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-d4/dist';
const now = process.argv.includes('--now');
const dir = now ? DIST : PREV;
const label = now ? 'HEAD (refuse-and-reconcile)' : 'PREV c2aa5bb (last-write-wins)';
const port = now ? 4263 : 4262;

const FULL = realCopy('full');   // his real level-7 export, copied, never opened for writing

const pool = page => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  if (!k) return null;
  try { return JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current; }
  catch { return null; }
});
const heal5 = page => page.getByRole('button', { name: /^Heal 5$/i }).first();

const srv = await serveDist(dir, port);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));

const p1 = await ctx.newPage(); watch(p1);
await p1.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p1, FULL);

const p2 = await ctx.newPage(); watch(p2);
await p2.goto(srv.url, { waitUntil: 'networkidle' });
await p2.waitForTimeout(1200);

const start = await pool(p1);
await p1.bringToFront();
for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(650); }
const after1 = await pool(p1);

await p2.bringToFront();
await heal5(p2).click();
await p2.waitForTimeout(900);
const after2 = await pool(p2);

const alert = await p2.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const onScreen = (await p2.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const reconciled = after1 !== null && new RegExp(`\\b${after1}/`).test(onScreen);

await p2.getByRole('button', { name: /^I understand$/i }).first().click().catch(() => {});
await p2.waitForTimeout(400);
await heal5(p2).click().catch(() => {});
await p2.waitForTimeout(800);
const after3 = await pool(p2);

const faults = [...(await judge(p1)).faults, ...(await judge(p2)).faults];

console.log(`\n\x1b[1mD-4 two tabs against ${label}\x1b[0m  ${dir}\n`);
console.log(`  start                       ${start}`);
console.log(`  after tab 1 spends 5 twice  ${after1}   (expect ${start - 10})`);
console.log(`  after stale tab 2 spends 5  ${after2}   \x1b[2m→ clobber ${start - 5} · refusal ${start - 10}\x1b[0m`);
console.log(`  stale tab told              ${/another window/i.test(alert) ? 'yes' : 'NO'}  ${JSON.stringify(alert.slice(0, 70))}`);
console.log(`  stale tab screen reconciled ${reconciled ? 'yes' : 'NO'}`);
console.log(`  stale tab usable afterwards ${after3 === after1 - 5 ? 'yes' : 'NO'}  (${after1} → ${after3})`);
console.log(`  faults                      ${faults.length ? faults.join(' | ') : 'none'}`);
const verdict = after2 === after1 && /another window/i.test(alert) && reconciled && after3 === after1 - 5 && !faults.length;
console.log(`\n  ${verdict ? '\x1b[32mD-4 PASSES\x1b[0m' : '\x1b[31mD-4 FAILS\x1b[0m'} on this build\n`);

await ctx.close(); await b.close(); await srv.close();
