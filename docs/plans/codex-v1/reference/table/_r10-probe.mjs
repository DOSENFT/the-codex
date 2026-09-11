/* Cheap pre-flight for the R-10 fix, run BEFORE the 16-minute harness.
   It reproduces the R-10 scenario from families.mjs verbatim, then reports
   BOTH branches separately — because the harness prints one verdict and I want
   to know which of the two acceptable outcomes I actually got:

     branch CANCEL   — the write was held; pool stays at the session value
     branch ANYWAY   — he clicked through; pool is the file value AND the words
                       on screen name what moved

   A pass on the first branch that I mistook for a pass on the second is
   exactly the class of mistake A-27 is about. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, judge, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4297);
const b = await chromium.launch();

const pool = page => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  return k ? JSON.parse(localStorage.getItem(k))?.paladinResources?.layOnHands?.current ?? null : null;
});
const body = page => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

async function scenario(anyway) {
  const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
  await importFile(page, realCopy('full'));
  const before = await pool(page);
  await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
  await page.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
  await page.waitForTimeout(900);
  const spent = await pool(page);

  await page.getByRole('button', { name: /Open settings/i }).first().click();
  await page.waitForTimeout(700);
  const was = new Set((await body(page)).split(' '));
  await importFile(page, realCopy('full'), { via: /^Import$/, anyway });
  await settle(page);
  const after = await pool(page);
  const added = (await body(page)).split(' ').filter(w => !was.has(w)).join(' ');
  const named = /replac|overwrit|discard|you will lose|you'll lose|lost|since you|current progress|in.session|had spent/i.test(added);
  const { faults } = await judge(page);
  await ctx.close();
  return { before, spent, after, named, added, faults };
}

for (const anyway of [false, true]) {
  const r = await scenario(anyway);
  const label = anyway ? 'ANYWAY (clicks through the gate)' : 'CANCEL  (gate left standing)';
  console.log(`\n  ── ${label} ──`);
  console.log(`  file=${r.before}  session-after-heal=${r.spent}  after-reimport=${r.after}`);
  console.log(`  notice names it: ${r.named ? '\x1b[32myes\x1b[0m' : '\x1b[31mNO\x1b[0m'}`);
  console.log(`  added words: "${r.added.slice(0, 220)}"`);
  if (r.faults.length) console.log(`  \x1b[31mFAULTS: ${r.faults.join(' · ')}\x1b[0m`);
  const overwritten = r.after === r.before;
  const verdict = overwritten
    ? (r.named ? 'PASS — overwrote, and said so' : 'FAIL — overwrote silently')
    : (r.after === r.spent ? 'PASS — session kept' : `FAIL — third state ${r.after}`);
  console.log(`  ${/^PASS/.test(verdict) ? '\x1b[32m' : '\x1b[31m'}${verdict}\x1b[0m`);
}

await b.close(); await srv.close();
console.log('');
