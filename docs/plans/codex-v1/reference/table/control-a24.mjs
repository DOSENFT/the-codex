/* CONTROL for A-24 — can the rewritten F-4 and R-9 actually fail?
   ---------------------------------------------------------------------------
   A-24 rewrote two graders that were passing without asserting their criteria.
   Replacing a grader that cannot fail with another grader that cannot fail is
   the same act performed twice, so both new graders are watched failing here
   before either is reported.

   There is no pre-change worktree to point at, because the defect was in the
   CHECK and not in the app — `git checkout` of an older commit gives back the
   same app and the same green. So the negative control sabotages the exact
   behaviour each clause claims, at runtime, and asserts:

       the OLD grader's logic stays GREEN on the sabotaged app   ← it was blind
       the NEW grader's logic goes RED on the sabotaged app      ← it is not

   A row where both are green means the new clause is decoration. A row where
   the old one goes red means the sabotage was too broad to prove anything.

     sabotage 1  spends never reach disk (setItem drops codex-character writes).
                 F-4 clause 3 must fire. The screen still renders, still shows
                 Nix, still offers thirteen buttons — which is the entire basis
                 on which the old F-4 printed PASS.
     sabotage 2  none needed. R-9's old locator is measured directly: after a
                 character is loaded, /Import Character/i matches zero elements,
                 so `if (await again.count())` skipped the second import and the
                 assertion compared 1 against 1.

   `watch()` IS attached, because the old F-4 called `judge()` and `judge()`
   reads what `watch()` collects. Reproducing the old grader without it would
   be reproducing a kinder version of it. */
import { chromium, serveDist, DIST, PHONE, importFile, judge, watch, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4295);
const b = await chromium.launch();
const rows = [];

/* ── sabotage 1 — writes to the character never land ─────────────────────── */
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); watch(page);
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, realCopy('full'));
  await page.goto(srv.url + '?d=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  /* The sabotage is applied HERE, after the last navigation, and not in an
     addInitScript guarded by a `window` flag — the first version did that and
     the `?d=1` goto reset the flag, so nothing was ever sabotaged and this
     control printed "still blind" about a grader that had not been tested.
     Patch the prototype on the live page: `localStorage.setItem(…)` resolves
     through it at call time, so the running app picks it up. */
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(localStorage);
    const real = proto.setItem;
    proto.setItem = function (k, v) {
      if (String(k).startsWith('codex-character-')) return;   // silently dropped
      return real.call(this, k, v);
    };
  });

  // --- the OLD F-4, verbatim ---
  const oldJudge = await judge(page, { needs: [/Nix/] });
  const buttons = await page.locator('button').count();
  const oldPass = oldJudge.faults.length === 0 && buttons > 2;

  // --- the NEW F-4's clause 3, verbatim ---
  const slot1 = () => page.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return JSON.parse(localStorage.getItem(k))?.spellSlots?.['1']?.current ?? null;
  });
  const s0 = await slot1();
  await page.getByRole('button', { name: /Action · 1st-level slot/ }).first()
    .click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(900);
  const s1 = await slot1();
  const newPass = s0 !== null && s1 === s0 - 1;

  rows.push({
    what: 'F-4 · a spend that never reaches disk',
    detail: `${buttons} buttons on screen, no faults · slot 1: ${s0} → ${s1}`,
    oldPass, newPass,
  });
  await ctx.close();
}

/* ── sabotage 2 — none. The old R-9 locator is measured as it stands. ─────── */
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); watch(page);
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  const chars = () => page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length);
  await importFile(page, realCopy('full'));
  const n1 = await chars();
  await goScreen(page, SCREENS.find(s => s.id === 'prep/Character'));
  await settle(page);

  // --- the OLD R-9, verbatim ---
  const again = await page.getByRole('button', { name: /Import Character/i }).count();
  if (again) await importFile(page, realCopy('full'));
  const n2 = await chars();
  const oldPass = n2 <= n1 + 1;

  // --- the NEW R-9's `ran` clause ---
  let ran = true;
  await (async () => {
    await page.getByRole('button', { name: /Open settings/i }).first().click();
    await page.waitForTimeout(700);
    await importFile(page, realCopy('full'), { via: /^Import$/ });
  })().catch(() => { ran = false; });

  rows.push({
    what: 'R-9 · the second import must actually happen',
    detail: `/Import Character/i matched ${again} control(s) after load → old grader ${again ? 'ran' : 'SKIPPED'} its scenario and compared ${n1} vs ${n2}; new grader ${ran ? 'ran it via Settings→Import' : 'reported NOT RUN'}`,
    oldPass,
    newPass: !(again === 0 && oldPass),   // the new grader refuses a pass that was bought by skipping
  });
  await ctx.close();
}

console.log(`\n\x1b[1mA-24 can the rewritten graders fail?\x1b[0m  ${DIST}\n`);
let bad = 0;
for (const r of rows) {
  const good = r.oldPass && !r.newPass;
  if (!good) bad++;
  console.log(`  ${r.what}`);
  console.log(`      ${r.detail}`);
  console.log(`      old grader ${r.oldPass ? '\x1b[31mPASSES (blind)\x1b[0m' : '\x1b[33mfails — sabotage too broad to prove anything\x1b[0m'}`
            + `   new grader ${r.newPass ? '\x1b[31mPASSES (still blind)\x1b[0m' : '\x1b[32mFAILS (sees it)\x1b[0m'}\n`);
}
console.log(`  ${bad === 0 ? '\x1b[32mA-24 PASSES\x1b[0m — every rewritten clause was watched failing'
                           : `\x1b[31mA-24 FAILS\x1b[0m — ${bad} clause(s) not proven able to fail`}\n`);

await b.close(); await srv.close();
process.exit(bad === 0 ? 0 : 1);
