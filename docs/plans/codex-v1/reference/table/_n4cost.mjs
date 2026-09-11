/* _n4cost.mjs — what does the offline navigation path actually COST?
 *
 * _n4.mjs reported 2343ms between workerStart and responseStart on an offline
 * cold boot. S-1 budgets 2000ms for the whole cold launch, so that number has
 * to be accounted for rather than shrugged at. It has two possible owners:
 *
 *   (a) `await fetch(request)` failing against a dead origin — which the worker
 *       has ALWAYS done first, on every offline navigation, before and after
 *       this change. Network-first is rule 1 and is not negotiable.
 *   (b) the validate-then-choose work this change added.
 *
 * This separates them. Run it against the fixed worker and again against the
 * pre-fix worker (git stash src/pwa/sw.js && npx vite build) — the delta
 * between the two runs is (b), and (b) is the only part this change owns.
 *
 * The boot here is UNPOISONED on purpose: that is the N-1 path, the one with a
 * before-and-after to compare.
 */
import { chromium, serveDist, DIST, watch, settle, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const PORT = 5451;
const browser = await chromium.launch();
const srv = await serveDist(DIST, PORT);
const base = srv.url;
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

const p1 = await ctx.newPage();
watch(p1);
await p1.goto(base, { waitUntil: 'networkidle' });
await importFile(p1, realCopy('full'));
await settle(p1);
await p1.waitForTimeout(4000);
await p1.reload({ waitUntil: 'networkidle' });
await p1.waitForTimeout(2500);
const lkg = await p1.evaluate(async () => (await caches.keys()).includes('codex-shell-lkg'));
await p1.close();
await srv.close();

const nums = [];
for (let i = 0; i < 3; i++) {
  const p = await ctx.newPage();
  watch(p);
  await p.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2500);
  const n = await p.evaluate(async b => {
    const nav = performance.getEntriesByType('navigation')[0];
    // How long a failed fetch to the dead origin takes, from this same process.
    const t0 = performance.now();
    await fetch(b).catch(() => {});
    const deadFetch = performance.now() - t0;
    return {
      workerToResponse: Math.round(nav.responseStart - nav.workerStart),
      responseEnd: Math.round(nav.responseEnd),
      deadFetch: Math.round(deadFetch),
      chars: document.body.innerText.trim().length,
    };
  }, base);
  nums.push(n);
  await p.close();
}

console.log(`\n  LKG cache present: ${lkg}  (false = this is the PRE-FIX worker)`);
console.log('  offline cold boot, unpoisoned — 3 runs:');
for (const n of nums) {
  console.log(`    workerStart→responseStart ${String(n.workerToResponse).padStart(5)}ms` +
    `   a failed fetch() to the dead origin costs ${String(n.deadFetch).padStart(5)}ms` +
    `   body ${n.chars} chars`);
}
const med = a => [...a].sort((x, y) => x - y)[1];
console.log(`  median workerStart→responseStart: ${med(nums.map(n => n.workerToResponse))}ms`);
console.log(`  median dead-fetch cost          : ${med(nums.map(n => n.deadFetch))}ms`);

await ctx.close();
await browser.close();
