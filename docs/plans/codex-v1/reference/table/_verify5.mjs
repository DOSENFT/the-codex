// VERIFIER probe 5 — D-family and F-4/F-5 driven the way the CRITERION says,
// not the way the harness happens to.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChar, storedChars } from './rig.mjs';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PORT = 5415;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const THIN = 'C:/Users/marcu/Downloads/codex-nix-lvl7.json';
const tmp = mkdtempSync(join(tmpdir(), 'vfy5-'));

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const allErrs = [];
async function fresh(tag) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off','1'));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrs.push(`[${tag}] PAGEERROR ` + String(e).split('\n')[0].slice(0,180)));
  page.on('console', m => { if (m.type()==='error') allErrs.push(`[${tag}] CONSOLE.ERROR ` + m.text().slice(0,180)); });
  await page.addInitScript(() => { window.__rej=[]; addEventListener('unhandledrejection', e=>window.__rej.push(String(e.reason).slice(0,180))); });
  await page.goto(srv.url, { waitUntil:'networkidle' });
  return { ctx, page };
}
const deep = (a,z) => JSON.stringify(a) === JSON.stringify(z);

/* ── D-1 as WRITTEN: "import each real export, EXPORT IT AGAIN, every key
      present in the original is present in the output with a deep-equal value" ── */
console.log('=== D-1 — the criterion says EXPORT IT AGAIN. The harness reads localStorage. ===');
for (const [name, file] of [['full', FULL], ['thin', THIN]]) {
  const { ctx, page } = await fresh('D1-'+name);
  await importFile(page, file);
  await page.getByRole('button', { name: /Switch to prep mode/i }).click().catch(()=>{});
  await page.waitForTimeout(500);
  const btn = page.getByRole('button', { name: /Export Character/i }).first();
  if (!await btn.count()) { console.log(`  ${name}: NO Export Character button on prep`); await ctx.close(); continue; }
  await btn.scrollIntoViewIfNeeded().catch(()=>{});
  const dlp = page.waitForEvent('download', { timeout: 10000 }).catch(()=>null);
  await btn.click(); const dl = await dlp;
  if (!dl) { console.log(`  ${name}: no download fired`); await ctx.close(); continue; }
  const p = join(tmp, `exp-${name}.json`); await dl.saveAs(p);
  const src = JSON.parse(readFileSync(file,'utf8'));
  const out = JSON.parse(readFileSync(p,'utf8'));
  const dropped = [], altered = [];
  for (const [k,v] of Object.entries(src)) {
    if (k === 'updatedAt') continue;
    if (!(k in out)) { dropped.push(k); continue; }
    if (!deep(v, out[k])) altered.push(`${k}: ${JSON.stringify(v).slice(0,70)} → ${JSON.stringify(out[k]).slice(0,70)}`);
  }
  console.log(`  ${name}: ${Object.keys(src).length} source keys · DROPPED ${dropped.length} [${dropped.join(', ')}] · NOT DEEP-EQUAL ${altered.length}`);
  altered.slice(0,12).forEach(x=>console.log('      '+x));
  await ctx.close();
}

/* ── D-4 as WRITTEN: "one writes; the other must not overwrite the write with
      stale state ON ITS NEXT SAVE". The harness makes tab 2 click a TAB, which
      is not a save. Here tab 2 performs a real save. ── */
console.log('\n=== D-4 — make tab 2 actually SAVE, which the harness never does ===');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off','1'));
  const p1 = await ctx.newPage(); const p2Errs = [];
  p1.on('console', m => { if (m.type()==='error') allErrs.push('[D4-p1] '+m.text().slice(0,160)); });
  await p1.goto(srv.url, { waitUntil:'networkidle' });
  await importFile(p1, FULL);
  const p2 = await ctx.newPage();
  p2.on('console', m => { if (m.type()==='error') allErrs.push('[D4-p2] '+m.text().slice(0,160)); });
  await p2.goto(srv.url, { waitUntil:'networkidle' });
  await p2.waitForTimeout(1500);          // p2 now holds a SNAPSHOT of pre-spend state

  const readHp = async pg => pg.evaluate(() => {
    const k = Object.keys(localStorage).find(x=>x.startsWith('codex-character-'));
    const c = k ? JSON.parse(localStorage.getItem(k)) : null;
    return c ? JSON.stringify({ hp: c.hitPoints, pools: c.resourcePools?.map(p=>p.current), slots: c.spellSlots }) : 'none';
  });
  const base = await readHp(p1);
  // tab 1 writes
  await p1.bringToFront();
  const s1 = p1.getByRole('button', { name: /Heal 5/i }).first();
  await s1.click().catch(()=>{}); await p1.waitForTimeout(900);
  const afterTab1 = await readHp(p1);
  console.log(`  base      : ${base}`);
  console.log(`  after tab1: ${afterTab1}   (changed=${base!==afterTab1})`);
  // tab 2, holding stale state, now performs its OWN write
  await p2.bringToFront();
  const s2 = p2.getByRole('button', { name: /Heal 5/i }).first();
  const drove = await s2.count() ? await s2.click().then(()=>true).catch(()=>false) : false;
  await p2.waitForTimeout(1000);
  const afterTab2 = await readHp(p2);
  console.log(`  tab2 drove a real spend = ${drove}`);
  console.log(`  after tab2: ${afterTab2}`);
  console.log(`  >>> tab 1's write survived tab 2's save? ${afterTab2 !== base ? 'need to inspect' : 'NO — reverted to base'}`);
  // what the harness's own weaker action does, for comparison
  await ctx.close();
}

/* ── D-5: what text actually satisfied "userWasTold"? ── */
console.log('\n=== D-5 — the harness accepts /storage|full/ anywhere on the page. What matched? ===');
{
  const { ctx, page } = await fresh('D5');
  await importFile(page, FULL);
  const before = await storedChar(page);
  const textBefore = await page.evaluate(()=>document.body.innerText);
  console.log(`  does the page ALREADY match /could not save|save failed|storage|full|out of space/i BEFORE any failure? ` +
    `${/could not save|save failed|storage|full|out of space/i.test(textBefore)}` +
    (/(could not save|save failed|storage|full|out of space)/i.test(textBefore) ? `  matched: "${textBefore.match(/(could not save|save failed|storage|full|out of space)/i)[0]}"` : ''));
  await page.evaluate(() => { const pr = Object.getPrototypeOf(localStorage); window.__r = pr.setItem;
    pr.setItem = function(k,v){ if(String(k).startsWith('codex-')){ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e;} return window.__r.call(this,k,v); }; });
  const sp = page.getByRole('button', { name: /Heal 5/i }).first();
  if (await sp.count()) { await sp.click(); await page.waitForTimeout(1200); }
  const textAfter = await page.evaluate(()=>document.body.innerText);
  const newText = textAfter.split('\n').filter(l => !textBefore.includes(l));
  console.log(`  NEW text on screen after the write failed:\n      ${newText.slice(0,8).map(s=>JSON.stringify(s)).join('\n      ') || '(nothing new appeared)'}`);
  await page.evaluate(()=>{ Object.getPrototypeOf(localStorage).setItem = window.__r; });
  console.log(`  prior save intact = ${(await storedChar(page)) === before}`);
  await ctx.close();
}

/* ── F-4 as WRITTEN: "shows a ranked shortlist with at least one action in it,
      AND SPENDS A REAL RESOURCE". The harness only counts buttons > 2. ── */
console.log('\n=== F-4 — the criterion requires a real spend on ?d=1. Does one happen? ===');
{
  const { ctx, page } = await fresh('F4');
  await importFile(page, FULL);
  await page.goto(srv.url + '?d=1', { waitUntil:'networkidle' });
  await page.waitForTimeout(1200);
  const before = await storedChar(page);
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')]
    .map(b => ({ l: (b.getAttribute('aria-label')||b.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
                 dis: b.disabled })).filter(x=>x.l));
  console.log(`  buttons on ?d=1 (${btns.length}): ` + btns.map(x=>`«${x.l}»${x.dis?'[disabled]':''}`).join(' '));
  // try every plausible spend
  let spent = false, which = '';
  for (const re of [/^Action$/i, /^Bonus$/i, /^Reaction$/i, /Heal/i, /Expend/i, /Slot/i, /Use$/i]) {
    const el = page.getByRole('button', { name: re }).first();
    if (!await el.count()) continue;
    if (!await el.isEnabled().catch(()=>false)) continue;
    await el.click().catch(()=>{}); await page.waitForTimeout(800);
    if ((await storedChar(page)) !== before) { spent = true; which = String(re); break; }
  }
  console.log(`  a real resource was spent on ?d=1 = ${spent} ${which}`);
  const undo = await page.getByRole('button', { name: /^(Undo|Restore)$/i }).count();
  console.log(`  Undo/Restore present on ?d=1 = ${undo > 0}  (S-4 is graded on play/Combat only)`);
  await ctx.close();
}

/* ── F-5 as WRITTEN: "present and operable on every screen, in both modes,
      INCLUDING MID-IMPORT and BEHIND AN ERROR BOUNDARY". ── */
console.log('\n=== F-5 — mid-import and behind a boundary, which the harness never visits ===');
{
  const { ctx, page } = await fresh('F5');
  // mid-import = the thin-file gate dialog is up
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import Character/i }).first().click();
  await (await chooser).setFiles(THIN);
  await page.waitForTimeout(1000);
  const gateUp = await page.getByRole('button', { name: /^Import anyway$/ }).count();
  const veilMid = await page.getByRole('button', { name: /Veil this scene/i }).count();
  const veilMidVisible = veilMid ? await page.getByRole('button', { name: /Veil this scene/i }).first().isVisible() : false;
  console.log(`  gate dialog up = ${gateUp>0} · veil present mid-import = ${veilMid>0} · visible = ${veilMidVisible}`);
  if (veilMid) {
    // OPERABLE, not merely present — the criterion says operable
    const box = await page.getByRole('button', { name: /Veil this scene/i }).first().boundingBox();
    const top = box ? await page.evaluate(([x,y]) => { const e = document.elementFromPoint(x,y);
      return e ? e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0] : 'null'; },
      [box.x+box.width/2, box.y+box.height/2]) : 'no box';
    console.log(`  what is actually at the veil's centre mid-import: ${top}`);
    const ok = await page.getByRole('button', { name: /Veil this scene/i }).first().click({ timeout: 3000 }).then(()=>true).catch(e=>String(e).split('\n')[0]);
    await page.waitForTimeout(700);
    const t = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,120));
    console.log(`  veil click mid-import = ${ok} · screen now: "${t}"`);
  }
  await ctx.close();
}

/* ── D-2 reload stability, reproduced ── */
console.log('\n=== D-2 reproduced ===');
{
  const { ctx, page } = await fresh('D2');
  await importFile(page, FULL);
  const snaps = [];
  for (let i=0;i<3;i++){ await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(900); snaps.push(await storedChar(page)); }
  const norm = s => { const o = JSON.parse(s); delete o.updatedAt; return JSON.stringify(o); };
  console.log(`  identical across 3 cold reloads (updatedAt excluded) = ${norm(snaps[0])===norm(snaps[1]) && norm(snaps[1])===norm(snaps[2])}`);
  console.log(`  byte-identical INCLUDING updatedAt = ${snaps[0]===snaps[1] && snaps[1]===snaps[2]}   <-- criterion says "byte-identical stored character"`);
  await ctx.close();
}

console.log('\n=== errors across probe 5 ===');
console.log(allErrs.length ? [...new Set(allErrs)].join('\n') : '  (none)');
await b.close(); await srv.close();
