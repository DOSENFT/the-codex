// VERIFIER probe 14 — R-9 actually performed through the settings door the
// harness's /Import Character/i regex cannot see; and what "New Character" costs.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChars } from './rig.mjs';
const srv = await serveDist(DIST, 5428);
const b = await chromium.launch();
const E = [];
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const mk = async tag => {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', e => E.push(`[${tag}] PAGEERROR ` + String(e).split('\n')[0].slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') E.push(`[${tag}] CONSOLE.ERROR ` + m.text().slice(0, 200)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  return { ctx, page };
};
const pool = pg => pg.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-')); if (!k) return null; const c = JSON.parse(localStorage.getItem(k)); const f = (o, d = 0) => { if (d > 4 || !o || typeof o !== 'object') return null; for (const [kk, v] of Object.entries(o)) { if (/layonhands/i.test(kk)) return JSON.stringify(v); const r = f(v, d + 1); if (r) return r; } return null; }; return f(c); });

console.log('=== what the settings panel actually calls its import control ===');
{
  const { ctx, page } = await mk('L');
  await importFile(page, FULL);
  await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { });
  await page.waitForTimeout(900);
  const labels = await page.evaluate(() => [...document.querySelectorAll('button')].map(x => (x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')).filter(t => /import/i.test(t)));
  console.log(`   settings buttons matching /import/i: ${JSON.stringify(labels)}`);
  console.log(`   does the harness's regex /Import Character/i match any of them? ${labels.some(l => /Import Character/i.test(l))}`);
  await ctx.close();
}

console.log('\n=== R-9 PERFORMED: the same character imported twice in a row ===');
{
  const { ctx, page } = await mk('R9');
  await importFile(page, FULL);
  const n1 = await storedChars(page);
  const id1 = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).sort());
  await page.getByRole('button', { name: /Heal 5/i }).first().click().catch(() => { });
  await page.waitForTimeout(1000);
  const spent = await pool(page);
  console.log(`   after import: ${n1} roster key(s) · pool ${spent} (unsaved-in-spirit state: he has healed)`);
  await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { });
  await page.waitForTimeout(900);
  const imp = page.getByRole('button', { name: /import/i }).first();
  if (!(await imp.count())) { console.log('   no import control in settings'); }
  else {
    const ch = page.waitForEvent('filechooser');
    await imp.click(); await (await ch).setFiles(FULL); await page.waitForTimeout(1400);
    const gate = page.getByRole('button', { name: /^Import anyway$/ });
    const gated = await gate.count() > 0;
    if (gated) { await gate.click(); await page.waitForTimeout(1200); }
    const warn = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const warned = /already|overwrit|replac|duplicate|existing/i.test(warn);
    await page.waitForTimeout(800);
    const n2 = await storedChars(page);
    const id2 = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).sort());
    const after = await pool(page);
    console.log(`   re-imported. gated=${gated} · warned about an existing character = ${warned}`);
    console.log(`   roster keys ${n1} → ${n2}   ${JSON.stringify(id1)} → ${JSON.stringify(id2)}`);
    console.log(`   pool ${spent} → ${after}`);
    console.log(`   >>> DUPLICATE ROSTER ENTRY = ${n2 > n1}`);
    console.log(`   >>> SILENT OVERWRITE OF UNSAVED STATE = ${after !== spent && !warned}`);
  }
  await ctx.close();
}

console.log('\n=== D-6: what "New Character" costs, since it asks nothing ===');
{
  const { ctx, page } = await mk('D6');
  await importFile(page, FULL);
  const before = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')));
  await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^New Character/i }).first().click().catch(() => { });
  await page.waitForTimeout(1500);
  const txt = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160);
  const after = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')));
  const active = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /active|current|selected/i.test(x) && x.startsWith('codex')); return k ? k + '=' + localStorage.getItem(k) : 'no active-character key found'; });
  console.log(`   one tap, no confirm. screen now: "${txt}"`);
  console.log(`   roster keys ${before.length} → ${after.length}   Nix still in storage = ${after.some(k => before.includes(k))}`);
  console.log(`   active pointer: ${active}`);
  const backable = await page.getByRole('button', { name: /Nix|Cancel|Back|Switch/i }).count();
  console.log(`   controls that could get him back to Nix from here: ${backable}`);
  await ctx.close();
}
console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
