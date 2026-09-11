/* INDEPENDENT VERIFIER — (2) REGRESSIONS.
   ONE tab. No second tab anywhere. Every attempt below is a write the app
   should ACCEPT. Any refusal, any "changed in another window", any spend that
   does not reach disk, is a regression caused by the D-4 guard. */
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';

const PORT = 4294;
const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const tmp = mkdtempSync(join(tmpdir(), 'iv-'));
const FULL = realCopy('full');

const second = JSON.parse(readFileSync(FULL, 'utf8'));
const secondPath = join(tmp, 'second.json');
second.id = 'iv-second-character';
second.name = 'Verifier Two';
writeFileSync(secondPath, JSON.stringify(second));

const dump = page => page.evaluate(() => {
  const ks = Object.keys(localStorage).filter(x => x.startsWith('codex-character-'));
  const out = {};
  for (const k of ks) {
    const c = JSON.parse(localStorage.getItem(k));
    out[k.replace('codex-character-', '')] = { pool: c?.paladinResources?.layOnHands?.current, at: c?.updatedAt, name: c?.name };
  }
  out.__active = localStorage.getItem('codex-active-id');
  return out;
});
const activeOf = d => d[d.__active] || null;
const heal5 = page => page.getByRole('button', { name: /^Heal 5$/i }).first();
const alertOf = page => page.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const dismiss = async page => {
  const btn = page.getByRole('button', { name: /^I understand$/i }).first();
  if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(300); }
};
const openSettings = async p => {
  await p.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
  await p.waitForTimeout(1500);
};
const closeSettings = async p => {
  const x = p.getByRole('button', { name: /^(Close settings|×|Close)$/i }).first();
  if (await x.count()) await x.click().catch(() => {});
  else await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(700);
};
const combatTab = async p => {
  await p.getByRole('button', { name: /Switch to session mode/i }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  await p.getByRole('tab', { name: 'Combat', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(700);
};
async function newTab() {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage(); watch(p);
  await p.goto(srv.url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  return { ctx, p };
}
const RESULTS = [];
const record = (id, what, bad, detail) => {
  RESULTS.push({ id, bad });
  console.log(`  ${bad ? '\x1b[31mREGRESSION\x1b[0m' : '\x1b[32m   ok     \x1b[0m'} ${id.padEnd(4)} ${what}\n             ${detail}`);
};

console.log('\n(2) REGRESSIONS — one tab, no second tab anywhere\n');

/* R1 — import a file over an existing character with the same id, via Settings→Import */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  const before = await dump(p);
  await openSettings(p);
  const imp = p.getByRole('button', { name: /^Import$/i }).first();
  let did = 'no Import button in Settings';
  if (await imp.count()) {
    const ch = p.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
    await imp.click();
    const c = await ch;
    if (c) { await c.setFiles(FULL); did = 're-imported the same file'; await p.waitForTimeout(1200); }
    const gate = p.getByRole('button', { name: /^Import anyway$/ });
    if (await gate.count()) { await gate.click(); await p.waitForTimeout(800); }
  }
  await closeSettings(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1000);
  const post = await dump(p); const a = activeOf(post);
  const al = await alertOf(p);
  record('R1', 'import a file over an existing character with the same id, then spend',
    /another window/i.test(al) || !a || a.pool !== 30,
    `${did}; keys ${Object.keys(before).length - 1}->${Object.keys(post).length - 1}; pool ${a && a.pool} (want 30); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R2 — import, then five spends fast */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  for (let i = 0; i < 5; i++) { await heal5(p).click().catch(() => {}); await p.waitForTimeout(180); }
  await p.waitForTimeout(900);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R2', 'import, then five spends 180ms apart',
    /another window/i.test(al) || a.pool !== 10, `pool ${a.pool} (want 10); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R3 — two characters, switch between them, then spend */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await openSettings(p);
  const imp = p.getByRole('button', { name: /^Import$/i }).first();
  const ch = p.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
  await imp.click(); const c = await ch; if (c) await c.setFiles(secondPath);
  await p.waitForTimeout(1200);
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) { await gate.click(); await p.waitForTimeout(800); }
  await closeSettings(p);
  const roster = await dump(p);
  // switch to the other one, and back
  let did = '';
  for (const want of [/Nix/i, /Verifier Two/i]) {
    await openSettings(p);
    const sw = p.getByRole('button', { name: /^Switch Character$/i }).first();
    if (await sw.count()) { await sw.click().catch(() => {}); await p.waitForTimeout(800); }
    const pick = p.getByRole('button', { name: want }).first();
    if (await pick.count()) { await pick.click().catch(() => {}); did += 'switched; '; await p.waitForTimeout(1000); }
    await closeSettings(p);
  }
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1000);
  const post = await dump(p); const a = activeOf(post); const al = await alertOf(p);
  record('R3', 'two characters in the roster, switch back and forth, then spend',
    /another window/i.test(al) || !a || a.pool !== 30,
    `${did || 'no switch control'}chars ${Object.keys(roster).length - 1}; active ${a && a.name} pool ${a && a.pool} (want 30); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R4 — delete a character, then spend on the next one */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await openSettings(p);
  const imp = p.getByRole('button', { name: /^Import$/i }).first();
  const ch = p.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
  await imp.click(); const c = await ch; if (c) await c.setFiles(secondPath);
  await p.waitForTimeout(1200);
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) { await gate.click(); await p.waitForTimeout(800); }
  await closeSettings(p);
  await openSettings(p);
  const del = p.getByRole('button', { name: /^Delete Character$/i }).first();
  let did = 'no Delete Character button';
  if (await del.count()) {
    await del.click().catch(() => {}); await p.waitForTimeout(800);
    const conf = p.getByRole('button', { name: /^(Delete|Confirm|Yes.*|Delete Character)$/i }).last();
    if (await conf.count()) { await conf.click().catch(() => {}); await p.waitForTimeout(1200); }
    did = 'deleted';
  }
  await closeSettings(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1100);
  const post = await dump(p); const a = activeOf(post); const al = await alertOf(p);
  record('R4', 'delete a character, then spend on the next one',
    /another window/i.test(al) || !a || a.pool !== 30,
    `${did}; remaining ${Object.keys(post).length - 1}; active ${a && a.name} pool ${a && a.pool} (want 30); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R5 — reload mid-session, then spend */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await heal5(p).click(); await p.waitForTimeout(800);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1000);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R5', 'spend, reload the page, spend again',
    /another window/i.test(al) || a.pool !== 25, `pool ${a.pool} (want 25); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R6 — spend, export, spend again */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await heal5(p).click(); await p.waitForTimeout(800);
  await openSettings(p);
  const exp = p.getByRole('button', { name: /^Export$/i }).first();
  let did = 'no Export button';
  if (await exp.count()) {
    const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await exp.click().catch(() => {});
    const got = await dl; did = got ? 'exported ' + got.suggestedFilename() : 'clicked Export (no download event)';
  }
  await closeSettings(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1000);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R6', 'spend, export, spend again',
    /another window/i.test(al) || a.pool !== 25, `${did}; pool ${a.pool} (want 25); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R7 — two spends in the same tick */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  const btn = heal5(p);
  await Promise.all([btn.click(), btn.click()]);
  await p.waitForTimeout(1400);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R7', 'two Heal-5 clicks fired together',
    /another window/i.test(al) || a.pool !== 25,
    `pool ${a.pool} (25 = both landed; 30 = one spend silently lost); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R7b — the same double click against the PREVIOUS build, to see if it is a regression */
/* (run separately, see _iv-regress-prev.mjs) */

/* R8 — open Settings (CampaignEditor mounts and writes), close, then spend */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  const pre = activeOf(await dump(p));
  await openSettings(p);
  const mid = activeOf(await dump(p));
  await closeSettings(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1200);
  const post = activeOf(await dump(p)); const al = await alertOf(p);
  record('R8', 'open Settings, close it, then spend — ONE tab',
    /another window/i.test(al) || post.pool !== 30,
    `stamp ${pre.at} -> ${mid.at} (settings alone moved it); pool ${post.pool} (want 30); alert ${JSON.stringify(al.slice(0, 110))}`);
  await ctx.close();
}

/* R9 — add a custom roleplay hook (EngageCard saves directly then calls setCharacter) */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await p.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /^Add Hook$/i }).first().click().catch(() => {});
  await p.waitForTimeout(700);
  const boxes = await p.locator('textarea').all();
  let typed = 'no textarea';
  for (const t of boxes) {
    const ph = (await t.getAttribute('placeholder')) || '';
    if (/hook/i.test(ph)) { await t.fill('IV added this hook'); typed = 'typed into ' + JSON.stringify(ph.slice(0, 34)); break; }
  }
  if (typed === 'no textarea' && boxes.length) { await boxes[0].fill('IV added this hook'); typed = 'typed into first textarea'; }
  await p.waitForTimeout(300);
  const add = p.getByRole('button', { name: /^(Add|Save|Add Hook)$/i }).last();
  let clicked = 'no submit';
  if (await add.count()) { await add.click().catch(() => {}); clicked = 'submitted'; }
  await p.waitForTimeout(1400);
  const al = await alertOf(p);
  const hooks = await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
    return (JSON.parse(localStorage.getItem(k)).customHooks || []).length;
  });
  record('R9', 'add a custom roleplay hook (one tab)',
    /another window/i.test(al),
    `${typed}; ${clicked}; customHooks now ${hooks}; alert ${JSON.stringify(al.slice(0, 130))}`);
  await dismiss(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1100);
  const a2 = activeOf(await dump(p)); const al2 = await alertOf(p);
  record('R9b', 'spend AFTER adding a custom hook',
    /another window/i.test(al2) || a2.pool !== 30,
    `pool ${a2.pool} (want 30); alert ${JSON.stringify(al2.slice(0, 110))}`);
  await ctx.close();
}

/* R10 — spend, long rest, spend */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await heal5(p).click(); await p.waitForTimeout(800);
  await openSettings(p);
  const lr = p.getByRole('button', { name: /^Long Rest$/i }).first();
  let did = 'no Long Rest button';
  if (await lr.count()) { await lr.click().catch(() => {}); await p.waitForTimeout(900);
    const conf = p.getByRole('button', { name: /^(Confirm|Yes.*|Long Rest|Take Long Rest)$/i }).last();
    if (await conf.count()) { await conf.click().catch(() => {}); await p.waitForTimeout(1000); }
    did = 'long rest'; }
  await closeSettings(p);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1100);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R10', 'spend, long rest, spend again', /another window/i.test(al),
    `${did}; pool ${a.pool}; alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

/* R11 — spend after opening/closing the Toybox */
{
  const { ctx, p } = await newTab();
  await importFile(p, FULL);
  await p.getByRole('button', { name: /Open The Toybox/i }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(700);
  await combatTab(p);
  await heal5(p).click().catch(() => {}); await p.waitForTimeout(1000);
  const a = activeOf(await dump(p)); const al = await alertOf(p);
  record('R11', 'open the Toybox, close it, then spend',
    /another window/i.test(al) || a.pool !== 30, `pool ${a.pool} (want 30); alert ${JSON.stringify(al.slice(0, 70))}`);
  await ctx.close();
}

console.log('\n  ' + RESULTS.filter(r => r.bad).length + ' regression(s) out of ' + RESULTS.length + ' attempts: '
  + RESULTS.filter(r => r.bad).map(r => r.id).join(', ') + '\n');
await b.close(); await srv.close();
