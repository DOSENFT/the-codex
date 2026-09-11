/* INDEPENDENT VERIFIER — (1) THE CLAIM.
   My own two/three-tab measurement. Nothing here calls the builder's D-4 block
   or control-d4.mjs. The stored pool is read out of localStorage by this file. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';

const PORT = 4292;
const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();

/* my own reader — parse the character record straight out of storage */
const stored = page => page.evaluate(() => {
  const k = Object.keys(localStorage).filter(x => x.startsWith('codex-character-'));
  if (k.length !== 1) return { keys: k.length, pool: null, at: null };
  const c = JSON.parse(localStorage.getItem(k[0]));
  return {
    keys: 1,
    pool: c?.paladinResources?.layOnHands?.current ?? null,
    at: c?.updatedAt ?? null,
    skills: JSON.stringify(c?.skills ?? c?.skillProficiencies ?? null).slice(0, 120),
  };
});
const heal5 = page => page.getByRole('button', { name: /^Heal 5$/i }).first();
const alertOf = page => page.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const screenPool = async page => {
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const m = t.match(/(\d+)\s*\/\s*35/);
  return m ? Number(m[1]) : null;
};

async function newCtx() {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  return ctx;
}
async function tab(ctx) {
  const p = await ctx.newPage(); watch(p);
  await p.goto(srv.url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  return p;
}
const faultsOf = async (...pages) => {
  const out = [];
  for (const p of pages) out.push(...(await judge(p)).faults);
  return out;
};
const say = (k, v) => console.log('    ' + String(k).padEnd(34) + v);

/* ─────────── A: the stated scenario ─────────── */
{
  console.log('\nA. tab1 spends TWICE (35→25), then stale tab2 spends once');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);                     // reads 35
  say('start (disk)', (await stored(p1)).pool);
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(600); }
  const a1 = await stored(p1);
  say('after tab1 x2 (disk)', a1.pool);
  await p2.bringToFront();
  await heal5(p2).click(); await p2.waitForTimeout(900);
  const a2 = await stored(p2);
  say('after stale tab2 (disk)', a2.pool + '   [25 = held, 30 = tab1 LOST]');
  say('tab2 screen shows', await screenPool(p2));
  say('tab2 alert', JSON.stringify((await alertOf(p2)).slice(0, 60)));
  say('faults', (await faultsOf(p1, p2)).join(' | ') || 'none');
  await ctx.close();
}

/* ─────────── B: three tabs ─────────── */
{
  console.log('\nB. three tabs — tab1 spends twice, then tab2 spends, then tab3 spends');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);
  const p3 = await tab(ctx);
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(600); }
  say('after tab1 x2', (await stored(p1)).pool);
  await p2.bringToFront(); await heal5(p2).click(); await p2.waitForTimeout(900);
  say('after stale tab2', (await stored(p2)).pool + '   (expect 25)');
  await p3.bringToFront(); await heal5(p3).click(); await p3.waitForTimeout(900);
  say('after stale tab3', (await stored(p3)).pool + '   (expect 25)');
  say('tab3 told', /another window/i.test(await alertOf(p3)) ? 'yes' : 'NO');
  say('faults', (await faultsOf(p1, p2, p3)).join(' | ') || 'none');
  await ctx.close();
}

/* ─────────── C: reversed order — tab2 spends FIRST ─────────── */
{
  console.log('\nC. reversed — tab2 (opened second) spends first, then tab1 spends twice');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);
  await p2.bringToFront(); await heal5(p2).click(); await p2.waitForTimeout(800);
  say('after tab2 x1', (await stored(p2)).pool + '   (expect 30)');
  await p1.bringToFront();
  await heal5(p1).click(); await p1.waitForTimeout(800);
  const s = await stored(p1);
  say('after tab1 spend #1', s.pool + '   [30 = correctly refused, 30->? ]');
  say('tab1 told', /another window/i.test(await alertOf(p1)) ? 'yes' : 'NO');
  say('tab1 screen shows', await screenPool(p1));
  await p1.getByRole('button', { name: /^I understand$/i }).first().click().catch(() => {});
  await p1.waitForTimeout(400);
  await heal5(p1).click(); await p1.waitForTimeout(800);
  say('tab1 spends again (disk)', (await stored(p1)).pool + '   (expect 25)');
  say('faults', (await faultsOf(p1, p2)).join(' | ') || 'none');
  await ctx.close();
}

/* ─────────── D: tab2 edits on a PREP screen instead of a combat spend ─────── */
{
  console.log('\nD. tab2 makes a prep-screen edit (skill proficiency), not a combat spend');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);
  // p2 into prep/Character
  await p2.bringToFront();
  await p2.getByRole('button', { name: /Switch to prep mode/i }).first().click().catch(() => {});
  await p2.waitForTimeout(700);
  await p2.getByRole('tab', { name: 'Character', exact: true }).first().click().catch(() => {});
  await p2.waitForTimeout(700);
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(600); }
  say('after tab1 x2 (disk)', (await stored(p1)).pool);
  await p2.bringToFront();
  const sk = p2.getByRole('button', { name: /^Acrobatics: not proficient/i }).first();
  await sk.click().catch(e => console.log('    (skill click failed) ' + e.message.slice(0, 80)));
  await p2.waitForTimeout(900);
  const d = await stored(p2);
  say('pool after prep edit (disk)', d.pool + '   [25 = held, 30 = tab1 LOST]');
  say('tab2 told', /another window/i.test(await alertOf(p2)) ? 'yes' : 'NO');
  say('stored skills', d.skills);
  say('faults', (await faultsOf(p1, p2)).join(' | ') || 'none');
  await ctx.close();
}

/* ─────────── E: stale tab after a long idle ─────────── */
{
  console.log('\nE. stale tab2 idles 35s before spending');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(600); }
  say('after tab1 x2', (await stored(p1)).pool);
  await p2.waitForTimeout(35000);
  await p2.bringToFront(); await heal5(p2).click(); await p2.waitForTimeout(900);
  say('after idle stale tab2', (await stored(p2)).pool + '   (expect 25)');
  say('tab2 told', /another window/i.test(await alertOf(p2)) ? 'yes' : 'NO');
  say('faults', (await faultsOf(p1, p2)).join(' | ') || 'none');
  await ctx.close();
}

/* ─────────── F: stale tab RELOADS instead of being told ─────────── */
{
  console.log('\nF. stale tab2 reloads first, then spends');
  const ctx = await newCtx();
  const p1 = await tab(ctx);
  await importFile(p1, realCopy('full'));
  const p2 = await tab(ctx);
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(600); }
  say('after tab1 x2', (await stored(p1)).pool);
  await p2.reload({ waitUntil: 'networkidle' }); await p2.waitForTimeout(1200);
  say('tab2 screen after reload', await screenPool(p2));
  await heal5(p2).click(); await p2.waitForTimeout(900);
  say('after reloaded tab2 spends', (await stored(p2)).pool + '   (expect 20 — a GOOD write)');
  say('tab2 alert (want empty)', JSON.stringify((await alertOf(p2)).slice(0, 60)));
  say('faults', (await faultsOf(p1, p2)).join(' | ') || 'none');
  await ctx.close();
}

await b.close(); await srv.close();
console.log('');
