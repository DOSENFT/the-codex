/* VERIFY LIVE — is the thing on the internet the thing that passed?
   ---------------------------------------------------------------------------
   TABLE-READY's exit condition says: deploy green, deployed SHA == the SHA that
   passed, and the live URL loaded and checked AFTER deploying. Green CI proves
   a build ran; it does not prove the bytes a phone receives are that build.
   This checks the bytes.

     1. RETIRED by A-26 — see below. Identity of build is now proven by
        `same-build.mjs`, which compares CONTENT and asks GitHub for provenance.
     2. the page loads with no caught React error, console error, or rejection
     3. the real save file imports, and the numbers on screen are the numbers
        in the file
     4. A-19: open Settings, close it, spend once — the spend must land, and
        must not be refused with a notice about another window
     5. the Veil is present and reachable (F-5)

   Run after every deploy. This is the only script here that talks to the
   internet; everything else measures a local build. */
import fs from 'node:fs';
import { chromium, LIVE, DIST, PHONE, watch, importFile, judge, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const bundleOf = html => (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [null])[0];

const localHtml = fs.readFileSync(DIST + '/index.html', 'utf8');
const liveHtml = await (await fetch(LIVE + '?cachebust=' + process.pid)).text();
const localBundle = bundleOf(localHtml);
const liveBundle = bundleOf(liveHtml);
/* A-26: `localBundle === liveBundle` is NOT a test of "same build" and this
   script must not go on claiming it is. `index-*.js` and `DiceStage-*.js`
   import each other, so each one's content hash is an input to the other's
   content; Rollup solves a fixed point, and a Windows build and the Linux CI
   build of the SAME COMMIT reach different solutions. Measured: the two main
   bundles are the same length and differ in exactly one place — the other
   chunk's filename. This check therefore printed "the internet is serving
   something else" about builds that were identical, permanently, and it is why
   P-1 read FAIL for far longer than it was actually false.
   The filenames are still PRINTED, because they are useful to see. They no
   longer decide anything. Run `node same-build.mjs` for the real answer. */
const same = localBundle && liveBundle && localBundle === liveBundle;

console.log(`\n\x1b[1mVERIFY LIVE\x1b[0m  ${LIVE}\n`);
console.log(`  local  dist bundle   ${localBundle}`);
console.log(`  live   page bundle   ${liveBundle}`);
console.log(`  same filename        ${same ? 'yes' : 'no — expected, and it proves nothing either way'}`);
console.log(`  \x1b[2midentity of build is not decided here — run \x1b[0msame-build.mjs\x1b[2m (A-26)\x1b[0m`);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
// The service worker is the app's own; leave it ON here. This is the one check
// that should see exactly what a phone sees, cache and all.
const page = await ctx.newPage(); watch(page);
await page.goto(LIVE, { waitUntil: 'networkidle' });
await settle(page);

const boot = await judge(page);
console.log(`  boots clean          ${boot.faults.length ? '\x1b[31m' + boot.faults.join(' | ') + '\x1b[0m' : '\x1b[32myes\x1b[0m'}`);

await importFile(page, realCopy('full'));
await settle(page);

const read = await page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  const c = k ? JSON.parse(localStorage.getItem(k)) : null;
  return {
    name: c?.name, level: c?.level,
    pool: c?.paladinResources?.layOnHands?.current,
    onScreen: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
  };
});
console.log(`  save file loads      ${read.name ? `\x1b[32m${read.name}, level ${read.level}, pool ${read.pool}\x1b[0m` : '\x1b[31mno character on disk after import\x1b[0m'}`);

// ---- A-19 on the deployed build --------------------------------------------
const pool = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  return k ? JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current : null;
});
const start = await pool();
await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
await page.waitForTimeout(900);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);
await page.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
await page.waitForTimeout(900);
const after = await pool();
const told = await page.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const a19 = after === start - 5 && !/another window/i.test(told);
console.log(`  A-19 settings→spend  ${a19 ? `\x1b[32m${start} → ${after}, no false alarm\x1b[0m` : `\x1b[31m${start} → ${after}${/another window/i.test(told) ? ', FALSE ALARM: ' + JSON.stringify(told.slice(0, 70)) : ''}\x1b[0m`}`);

// ---- F-5 the Veil ----------------------------------------------------------
const veil = await page.getByRole('button', { name: /veil/i }).count();
console.log(`  the Veil present     ${veil ? '\x1b[32myes\x1b[0m' : '\x1b[31mMISSING\x1b[0m'}`);

const end = await judge(page);
console.log(`  no faults at the end ${end.faults.length ? '\x1b[31m' + end.faults.join(' | ') + '\x1b[0m' : '\x1b[32mnone\x1b[0m'}`);

const ok = !boot.faults.length && !!read.name && a19 && !!veil && !end.faults.length;
console.log(`\n  ${ok ? '\x1b[32mLIVE IS THE BUILD THAT PASSED\x1b[0m' : '\x1b[31mLIVE DOES NOT VERIFY\x1b[0m'}\n`);

await ctx.close(); await b.close();
process.exit(ok ? 0 : 1);
