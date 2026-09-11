// VERIFIER probe 8 — D-4 airtight, R-9 through the real door, R-7 accepted,
// V-5b raw sizes, V-6b/V-6c sanity, D-6.
import { chromium, serveDist, DIST, PHONE, TABLET, goScreen, settle, SCREENS, importFile, storedChar, storedChars, audit } from './rig.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PORT = 5418;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const tmp = mkdtempSync(join(tmpdir(),'vfy8-'));
const wr=(n,o)=>{const p=join(tmp,n);writeFileSync(p,typeof o==='string'?o:JSON.stringify(o));return p;};
const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const E = [];
async function fresh(tag, vp=PHONE, dpr=3) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  await ctx.addInitScript(()=>localStorage.setItem('codex-sw-off','1'));
  const page = await ctx.newPage();
  page.on('pageerror',e=>E.push(`[${tag}] PAGEERROR `+String(e).split('\n')[0].slice(0,180)));
  page.on('console',m=>{if(m.type()==='error')E.push(`[${tag}] CONSOLE.ERROR `+m.text().slice(0,180));});
  await page.addInitScript(()=>{window.__rej=[];addEventListener('unhandledrejection',e=>window.__rej.push(String(e.reason).slice(0,180)));});
  await page.goto(srv.url,{waitUntil:'networkidle'});
  return { ctx, page };
}
const loh = pg => pg.evaluate(()=>{ const k=Object.keys(localStorage).find(x=>x.startsWith('codex-character-'));
  if(!k) return null; const c=JSON.parse(localStorage.getItem(k));
  const find = (o,d=0)=>{ if(d>4||!o||typeof o!=='object') return null;
    for (const [kk,v] of Object.entries(o)) { if(/layonhands/i.test(kk)) return JSON.stringify(v);
      const r=find(v,d+1); if(r) return kk+'>'+r; } return null; };
  return find(c); });

console.log('=== D-4 AIRTIGHT — the Lay on Hands pool, read from storage at each step ===');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(()=>localStorage.setItem('codex-sw-off','1'));
  const p1 = await ctx.newPage(); await p1.goto(srv.url,{waitUntil:'networkidle'});
  p1.on('console',m=>{if(m.type()==='error')E.push('[D4]p1 '+m.text().slice(0,150));});
  await importFile(p1, FULL);
  console.log(`  after import, stored pool: ${await loh(p1)}`);
  const p2 = await ctx.newPage();
  p2.on('console',m=>{if(m.type()==='error')E.push('[D4]p2 '+m.text().slice(0,150));});
  await p2.goto(srv.url,{waitUntil:'networkidle'}); await p2.waitForTimeout(1800);
  console.log(`  tab 2 opened; it now holds a snapshot of the pool at 35`);
  await p1.bringToFront();
  await p1.getByRole('button',{name:/Heal 5/i}).first().click().catch(()=>{});
  await p1.waitForTimeout(1200);
  console.log(`  tab 1 spends 5 → stored pool: ${await loh(p1)}   (expect 30)`);
  await p2.bringToFront();
  await p2.getByRole('button',{name:/Heal 5/i}).first().click().catch(()=>{});
  await p2.waitForTimeout(1400);
  const final = await loh(p2);
  console.log(`  tab 2 spends 5 → stored pool: ${final}   (expect 25 if tab 1's write survived; 30 means it was clobbered)`);
  console.log(`  tab1 screen: ${await p1.evaluate(()=>{const m=document.body.innerText.match(/\d+\s*\/\s*35/);return m?m[0]:'?';})}`);
  console.log(`  tab2 screen: ${await p2.evaluate(()=>{const m=document.body.innerText.match(/\d+\s*\/\s*35/);return m?m[0]:'?';})}`);
  await ctx.close();
}

console.log('\n=== R-9 through the real door — the harness never re-imports at all ===');
{
  const { ctx, page } = await fresh('R9');
  await importFile(page, FULL);
  const n1 = await storedChars(page);
  await page.getByRole('button',{name:/Heal 5/i}).first().click().catch(()=>{});
  await page.waitForTimeout(900);
  const spent = await loh(page);
  console.log(`  spent once; pool = ${spent}`);
  // the real door: settings
  const gear = page.getByRole('button',{name:/Open settings/i}).first();
  const opened = await gear.count() ? await gear.click().then(()=>true).catch(()=>false) : false;
  await page.waitForTimeout(900);
  const imp = page.getByRole('button',{name:/Import Character/i}).first();
  const found = await imp.count();
  console.log(`  settings opened = ${opened} · Import Character reachable there = ${found>0}`);
  if (found) {
    const ch = page.waitForEvent('filechooser');
    await imp.click(); await (await ch).setFiles(FULL); await page.waitForTimeout(1200);
    const gate = page.getByRole('button',{name:/^Import anyway$/});
    if (await gate.count()) { await gate.click(); await page.waitForTimeout(1000); }
    const n2 = await storedChars(page);
    const after = await loh(page);
    console.log(`  RE-IMPORTED the same character: keys ${n1} → ${n2} · pool ${spent} → ${after}`);
    console.log(`  >>> duplicate roster entry = ${n2>n1} · silently overwrote unsaved state = ${after!==spent}`);
  }
  await ctx.close();
}

console.log('\n=== R-7 with the payload ACCEPTED (harness never clicks Import anyway) ===');
{
  const { ctx, page } = await fresh('R7');
  const f = wr('proto2.json','{"name":"P","class":"Paladin","level":7,"hitPoints":{"max":10,"current":10},"__proto__":{"pwned":true},"constructor":{"prototype":{"pwned2":true}},"spells":[{"name":"X","__proto__":{"pwned3":true}}]}');
  await importFile(page, f, { anyway: true });
  const r = await page.evaluate(()=>({
    a: ({}).pwned !== undefined, b: Object.prototype.pwned !== undefined,
    c: ({}).pwned2 !== undefined, d: ({}).pwned3 !== undefined,
    stored: (Object.keys(localStorage).find(k=>k.startsWith('codex-character-'))||'') !== '',
  }));
  console.log(`  imported anyway; stored=${r.stored} · Object.prototype polluted: pwned=${r.a||r.b} pwned2=${r.c} pwned3=${r.d}`);
  await ctx.close();
}

console.log('\n=== V-5 / V-5b RAW — no +12 hit-area inflation ===');
{
  const { ctx, page } = await fresh('V5');
  await importFile(page, FULL);
  const TURN = /heal|expend|restore|slot|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i;
  const under44 = new Set(), under48turn = new Set();
  for (const s of SCREENS) {
    await goScreen(page, s); await settle(page);
    const folds = await page.evaluate(()=>Math.ceil(document.documentElement.scrollHeight/innerHeight));
    for (let i=0;i<Math.min(folds,6);i++) {
      await page.evaluate(n=>scrollTo(0,n*innerHeight), i); await page.waitForTimeout(200);
      const a = await audit(page);
      for (const c of a.touch) {
        if (c.w < 44 || c.h < 44) under44.add(`${s.id} «${c.label}» raw ${c.w}×${c.h} (builder's inflated ${c.hitW}×${c.hitH})`);
        if (s.id==='play/Combat' && TURN.test(c.label) && (c.w<48||c.h<48))
          under48turn.add(`«${c.label}» raw ${c.w}×${c.h} (inflated ${c.hitW}×${c.hitH})`);
      }
    }
  }
  console.log(`  V-5  controls with a RAW box under 44px: ${under44.size}`);
  [...under44].slice(0,20).forEach(x=>console.log('     '+x));
  console.log(`  V-5b play/Combat turn controls with a RAW box under 48px: ${under48turn.size}`);
  [...under48turn].slice(0,20).forEach(x=>console.log('     '+x));
  await ctx.close();
}

console.log('\n=== V-6b / V-6c sanity (builder says 13 and 14) ===');
for (const [name, vp, dpr] of [['phone',PHONE,3],['tablet',TABLET,2]]) {
  const { ctx, page } = await fresh('V6'+name, vp, dpr);
  await importFile(page, FULL);
  const occ = new Set();
  for (const s of SCREENS) {
    await goScreen(page, s);
    for (const at of ['top','bottom']) {
      for (let k=0;k<3;k++){ await page.evaluate(w=>scrollTo(0, w==='top'?0:document.documentElement.scrollHeight), at); await settle(page); }
      const a = await audit(page);
      for (const c of a.touch) if (c.occludedBy && !c.clipped) occ.add(`${s.id} @${at} «${c.label}» ← ${c.occludedBy}`);
    }
  }
  console.log(`  ${name}: ${occ.size} occluded`);
  [...occ].slice(0,6).forEach(x=>console.log('     '+x));
  await ctx.close();
}

console.log('\n=== D-6 destructive controls ===');
{
  const { ctx, page } = await fresh('D6');
  await importFile(page, FULL);
  await page.getByRole('button',{name:/Open settings/i}).first().click().catch(()=>{});
  await page.waitForTimeout(900);
  const DANGER = /^(Reset|Delete|Clear|Wipe|Remove|Start Over|New Character|Long Rest)/i;
  const names = await page.evaluate(()=>[...document.querySelectorAll('button')]
    .map(b=>(b.getAttribute('aria-label')||b.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean));
  const danger = names.filter(n=>/^(Reset|Delete|Clear|Wipe|Remove|Start Over|New Character|Long Rest)/i.test(n));
  console.log(`  destructive-looking controls in settings: ${JSON.stringify(danger)}`);
  const preCancel = await page.getByRole('button',{name:/^(Cancel|Never ?mind|Keep)/i}).count();
  console.log(`  Cancel-ish buttons ALREADY on screen before driving anything: ${preCancel}`);
  console.log(`     (the harness treats "a Cancel button exists" as proof a confirm was asked for)`);
  await ctx.close();
}

console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
