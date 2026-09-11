/* _n4.mjs — the criterion N-4 defect, reproduced and then disproved.
 *
 * WHAT THE GRADER IN families.mjs MEASURES, AND WHY IT IS NOT THIS.
 * The N-4 block there poisons the shell, calls ctx.setOffline(true), notes
 * whether the app is bricked (as a NOTE — nothing is asserted on it), then
 * calls ctx.setOffline(FALSE) and only then loads `?sw=off`. So the repair is
 * graded with the network up. It is a real check of "does ?sw=off clear a bad
 * cache", and a real check of nothing at all about a basement.
 *
 * This probe removes both escapes:
 *   - offline means the HTTP server is CLOSED, not a CDP flag. rig.mjs already
 *     documents why that distinction is the difference between a measurement
 *     and an artefact.
 *   - the network never comes back. Every assertion below is made with the
 *     origin dead and stays dead until the process exits.
 *
 * Run:  node docs/plans/codex-v1/reference/table/_n4.mjs
 * Exit 0 = the parachute works. Exit 1 = it does not, and says where.
 */
import { chromium, serveDist, DIST, watch, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
import { importFile } from './rig.mjs';

const PORT = 5421;
const say = (...a) => console.log(...a);
const fails = [];
const check = (name, ok, detail = '') => {
  say(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!ok) fails.push(name + (detail ? ` — ${detail}` : ''));
  return ok;
};

/** Everything the caches hold, named, so the report is not a claim. */
const cacheReport = page => page.evaluate(async () => {
  const out = {};
  for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length;
  return out;
});

/** The state of a freshly cold-booted page, judged the way rig.judge() does. */
async function readPage(page) {
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  const rej = await page.evaluate(() => {
    const r = window.__rejections || []; window.__rejections = []; return r;
  }).catch(() => []);
  page.errs.push(...rej.map(x => 'rejection: ' + x));
  return { text, len: text.length, errs: [...page.errs] };
}

const browser = await chromium.launch();
const srv = await serveDist(DIST, PORT);
const base = srv.url;
let serverAlive = true;
say(`\n\x1b[1mN-4 — a poisoned shell in a basement\x1b[0m`);
say(`  serving ${DIST}`);
say(`  at      ${base}\n`);

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

try {
  /* ── 1. install the app for real, with the worker ON ───────────────────── */
  const p1 = await ctx.newPage();
  watch(p1);
  await p1.goto(base, { waitUntil: 'networkidle' });
  await importFile(p1, realCopy('full'));
  await settle(p1);
  await p1.waitForTimeout(4000);                       // let install+activate land

  // A second visit, which is what a real device does. This is also the moment
  // the worker itself first answers a navigation.
  await p1.reload({ waitUntil: 'networkidle' });
  await p1.waitForTimeout(2500);

  const caches1 = await cacheReport(p1);
  say('  caches after install + one worker-served navigation:');
  for (const [k, v] of Object.entries(caches1)) say(`    ${k}  ${v} entries`);

  check('the app installed and the character imported',
    /Nix/.test((await readPage(p1)).text), '');
  check('a last-known-good shell exists and is not empty',
    (caches1['codex-shell-lkg'] || 0) > 1, `codex-shell-lkg = ${caches1['codex-shell-lkg'] || 0} entries`);

  const served = await p1.evaluate(() =>
    performance.getEntriesByType('resource').filter(r => r.workerStart > 0).length);
  say(`  ${served} subresources served by the worker on that reload\n`);

  /* ── 2. poison the shell ───────────────────────────────────────────────── */
  // Byte-for-byte the poison the N-4 grader uses: a valid 200 text/html
  // document with a real <div id="root"> in it, naming a bundle that does not
  // exist. Nothing about the RESPONSE is wrong. That is the point.
  const poisoned = await p1.evaluate(async b => {
    const shell = (await caches.keys()).find(n => n.startsWith('codex-shell-') && n !== 'codex-shell-lkg');
    if (!shell) return null;
    await (await caches.open(shell)).put(b, new Response(
      '<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>',
      { headers: { 'content-type': 'text/html' } }));
    return shell;
  }, base);
  check('the active shell cache was poisoned', !!poisoned, `cache = ${poisoned}`);

  // Prove the poison actually took, so a silent no-op cannot masquerade as a fix.
  const poisonStuck = await p1.evaluate(async b => {
    const shell = (await caches.keys()).find(n => n.startsWith('codex-shell-') && n !== 'codex-shell-lkg');
    const r = await (await caches.open(shell)).match(b);
    return r ? (await r.text()).includes('GONE-0000') : false;
  }, base);
  check('the poison is what the active shell now returns', poisonStuck);

  // And prove the parachute was NOT poisoned along with it.
  const lkgClean = await p1.evaluate(async b => {
    const r = await (await caches.open('codex-shell-lkg')).match(b);
    if (!r) return 'missing';
    const t = await r.text();
    return t.includes('GONE-0000') ? 'poisoned' : (/assets\/index-.*\.js/.test(t) ? 'clean' : 'unrecognised');
  }, base);
  check('the parachute is untouched by the poison', lkgClean === 'clean', `codex-shell-lkg index = ${lkgClean}`);

  await p1.close();

  /* ── 3. kill the origin. For real. It never comes back. ────────────────── */
  await srv.close();
  serverAlive = false;
  say('\n  \x1b[33mHTTP server closed. The origin is gone and stays gone.\x1b[0m\n');
  // Confirm it: anything that can still reach the network invalidates the run.
  const dead = await fetch(base).then(() => false).catch(() => true);
  check('the origin really is unreachable', dead);

  /* ── 4. cold boot, offline, poisoned ───────────────────────────────────── */
  const p2 = await ctx.newPage();
  watch(p2);
  await p2.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p2.waitForTimeout(3000);
  const r2 = await readPage(p2);
  say(`  cold boot: body innerText = ${r2.len} chars`);
  say(`    "${r2.text.slice(0, 140).replace(/\n/g, ' ')}…"`);
  check('N-4a  the page is not blank with the origin dead', r2.len > 0, `${r2.len} chars`);
  check('N-4a  the app is usable — his character is on screen', /Nix/.test(r2.text),
    r2.text.slice(0, 90));
  check('N-4a  no pageerror / console error / unhandled rejection', r2.errs.length === 0,
    r2.errs.slice(0, 3).join(' | '));
  const from2 = await p2.evaluate(() =>
    performance.getEntriesByType('resource').filter(r => r.workerStart > 0).length);
  say(`  ${from2} subresources served by the worker, with no network`);
  // What the fallback COSTS. S-1 budgets 2000ms for a cold launch with the
  // origin dead, so the validate-then-choose work added to the offline
  // navigation path has to be small enough to be invisible against it.
  const nav = await p2.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? { worker: Math.round(n.responseStart - n.workerStart), total: Math.round(n.responseEnd) } : null;
  });
  say(`  worker spent ${nav?.worker}ms deciding + serving that navigation (S-1 budget is 2000ms total)\n`);

  /* ── 5. the documented kill switch, STILL offline ──────────────────────── */
  // Same context on purpose: caches and registrations are per-context, so a new
  // context would have an empty disk and would be testing nothing.
  const p3 = await ctx.newPage();
  watch(p3);
  await p3.goto(base + '?sw=off', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p3.waitForTimeout(3500);
  const r3 = await readPage(p3);
  say(`  ?sw=off offline: body innerText = ${r3.len} chars`);
  say(`    "${r3.text.slice(0, 140).replace(/\n/g, ' ')}…"`);
  check('N-4b  ?sw=off is not blank with the origin dead', r3.len > 0, `${r3.len} chars`);
  check('N-4b  ?sw=off shows his character, offline', /Nix/.test(r3.text), r3.text.slice(0, 90));
  check('N-4b  no pageerror / console error / unhandled rejection', r3.errs.length === 0,
    r3.errs.slice(0, 3).join(' | '));

  /* ── 6. the network is never restored ──────────────────────────────────── */
  check('the network was never restored at any point in this run', !serverAlive);
  await p3.close();
} catch (e) {
  check('the probe ran to completion', false, String(e).slice(0, 300));
} finally {
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  if (serverAlive) await srv.close().catch(() => {});
}

say(`\n\x1b[1m${fails.length ? `\x1b[31m${fails.length} FAILED` : '\x1b[32mALL GREEN'}\x1b[0m`);
for (const f of fails) say(`  \x1b[31m×\x1b[0m ${f}`);
process.exit(fails.length ? 1 : 0);
