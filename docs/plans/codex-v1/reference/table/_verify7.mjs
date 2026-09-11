// VERIFIER probe 7 — D-4 done properly, F-4 spend, F-5 behind a real error
// boundary, R-family, D-3, D-6, N-3.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChar, storedChars } from './rig.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PORT = 5417;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const THIN = 'C:/Users/marcu/Downloads/codex-nix-lvl7.json';
const EMPTY = 'C:/Users/marcu/Downloads/codex-character-data.json';
const tmp = mkdtempSync(join(tmpdir(),'vfy7-'));
const wr = (n,o) => { const p = join(tmp,n); writeFileSync(p, typeof o==='string'?o:JSON.stringify(o)); return p; };
const SKEL = { name:'Hearthwright', class:'Paladin', level:7, hitPoints:{max:67,current:67}, armorClass:18,
  abilityScores:{STR:18,DEX:10,CON:14,INT:10,WIS:12,CHA:16} };

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const E = [];
async function fresh(tag, opts={}) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  if (!opts.sw) await ctx.addInitScript(()=>localStorage.setItem('codex-sw-off','1'));
  const page = await ctx.newPage();
  page.on('pageerror', e => E.push(`[${tag}] PAGEERROR ` + String(e).split('\n')[0].slice(0,200)));
  page.on('console', m => { if (m.type()==='error') E.push(`[${tag}] CONSOLE.ERROR ` + m.text().slice(0,200)); });
  await page.addInitScript(()=>{ window.__rej=[]; addEventListener('unhandledrejection',e=>window.__rej.push(String(e.reason).slice(0,200))); });
  if (opts.route) await ctx.route(opts.route.re, opts.route.fn);
  await page.goto(srv.url, { waitUntil:'networkidle' });
  return { ctx, page };
}
const rej = async (page, tag) => { const r = await page.evaluate(()=>{const x=window.__rej||[];window.__rej=[];return x;}).catch(()=>[]);
  E.push(...r.map(x=>`[${tag}] REJECTION ${x}`)); };
const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;

/* ── D-4 done properly: compare the WHOLE stored record ── */
console.log('=== D-4 — full stored record, tab 1 writes, tab 2 then saves ===');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(()=>localStorage.setItem('codex-sw-off','1'));
  const p1 = await ctx.newPage(); await p1.goto(srv.url,{waitUntil:'networkidle'});
  p1.on('console',m=>{if(m.type()==='error')E.push('[D4p1] '+m.text().slice(0,160));});
  await importFile(p1, FULL);
  const p2 = await ctx.newPage(); p2.on('console',m=>{if(m.type()==='error')E.push('[D4p2] '+m.text().slice(0,160));});
  await p2.goto(srv.url,{waitUntil:'networkidle'}); await p2.waitForTimeout(1600);
  const key = p => p.evaluate(()=>{ const k=Object.keys(localStorage).find(x=>x.startsWith('codex-character-'));
    return k?localStorage.getItem(k):null; });
  const pool = s => { try { const o=JSON.parse(s); return JSON.stringify(o).match(/"(layOnHands|hearthEmbers|current)"[^,}]*/g)?.slice(0,3); } catch { return null; } };
  const base = await key(p1);
  await p1.bringToFront();
  const s1 = p1.getByRole('button',{name:/Heal 5/i}).first();
  const c1 = await s1.count() ? await s1.click().then(()=>true).catch(()=>false) : false;
  await p1.waitForTimeout(1000);
  const a1 = await key(p1);
  console.log(`  tab1 clicked Heal 5 = ${c1} · stored record CHANGED = ${a1 !== base} (len ${base?.length} → ${a1?.length})`);
  console.log(`     -> the harness's own D-4 sets wrote=true purely because this click LANDED, not because it wrote.`);
  // now force tab 2 to save from its stale snapshot
  await p2.bringToFront();
  const s2 = p2.getByRole('button',{name:/Heal 5/i}).first();
  const c2 = await s2.count() ? await s2.click().then(()=>true).catch(()=>false) : false;
  await p2.waitForTimeout(1200);
  const a2 = await key(p2);
  console.log(`  tab2 clicked Heal 5 = ${c2} · stored record after tab2 = ${a2===a1?'unchanged from tab1':'CHANGED'}`);
  // did tab 1's spend survive? read the Lay on Hands number both tabs now show
  const show1 = await p1.evaluate(()=>{const m=document.body.innerText.match(/(\d+)\s*\/\s*35/); return m?m[0]:'?';});
  const show2 = await p2.evaluate(()=>{const m=document.body.innerText.match(/(\d+)\s*\/\s*35/); return m?m[0]:'?';});
  const stored = (()=>{ try{ const o=JSON.parse(a2); const s=JSON.stringify(o); const m=s.match(/"layOnHands[^,}]*|"current":\d+/g); return m?m.slice(0,4).join(' '):'?';}catch{return '?';} })();
  console.log(`  tab1 shows Lay on Hands ${show1} · tab2 shows ${show2} · stored: ${stored}`);
  console.log(`  >>> two spends happened; if the pool reads 30/35 rather than 25/35, tab 2 clobbered tab 1.`);
  await ctx.close();
}

/* ── F-4: prove a REAL resource is spent on ?d=1 ── */
console.log('\n=== F-4 — a real resource spent on ?d=1 (criterion text), not "buttons > 2" ===');
{
  const { ctx, page } = await fresh('F4');
  await importFile(page, FULL);
  await page.goto(srv.url+'?d=1',{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
  const slots = () => page.evaluate(()=>{ const k=Object.keys(localStorage).find(x=>x.startsWith('codex-character-'));
    const c=k?JSON.parse(localStorage.getItem(k)):null; return c?JSON.stringify(c.spellSlots):'none'; });
  const before = await slots();
  const bless = page.getByRole('button',{name:/Bless/i}).first();
  const clicked = await bless.count() ? await bless.click().then(()=>true).catch(()=>false) : false;
  await page.waitForTimeout(900);
  let after = await slots();
  // a card may open a confirm/cast step
  const cast = page.getByRole('button',{name:/^(Cast|Use|Confirm|Spend)/i}).first();
  if (after===before && await cast.count()) { await cast.click().catch(()=>{}); await page.waitForTimeout(900); after = await slots(); }
  console.log(`  clicked a spell card = ${clicked}`);
  console.log(`  spellSlots before: ${before}`);
  console.log(`  spellSlots after : ${after}`);
  console.log(`  >>> a REAL resource was spent = ${before !== after}`);
  await rej(page,'F4'); await ctx.close();
}

/* ── F-5: behind a real error boundary. Kill a lazily-loaded chunk. ── */
console.log('\n=== F-5 — behind an ERROR BOUNDARY (the criterion says it must hold there) ===');
{
  const { ctx, page } = await fresh('F5b', { route: { re: /DiceStage.*\.js/, fn: r => r.abort('failed').catch(()=>{}) } });
  await importFile(page, FULL);
  const dice = page.getByRole('button',{name:/dice|roll/i}).first();
  const has = await dice.count();
  if (has) { await dice.click().catch(()=>{}); await page.waitForTimeout(2500); }
  const t = (await page.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').trim();
  const boundaried = BOUNDARY.test(t);
  const veil = await page.getByRole('button',{name:/Veil this scene/i}).count();
  let operable = 'n/a';
  if (veil) operable = await page.getByRole('button',{name:/Veil this scene/i}).first().click({timeout:3000}).then(()=>'yes').catch(e=>String(e).split('\n')[0].slice(0,60));
  console.log(`  dice control found = ${has>0} · boundary text on screen = ${boundaried}`);
  if (boundaried) console.log(`     boundary said: "${t.match(BOUNDARY)[0].slice(0,120)}"`);
  console.log(`  veil present = ${veil>0} · operable = ${operable}`);
  await rej(page,'F5b'); await ctx.close();
}

/* ── R-family, reproduced with my own listeners ── */
console.log('\n=== R-family reproduced ===');
{
  const big = { ...SKEL, homebrewNotes: 'x'.repeat(12*1024*1024) };
  const cases = [
    ['R-1', EMPTY, /export/i],
    ['R-2', wr('prose.json','eggs, milk, a longsword'), /not a JSON|Settings/i],
    ['R-3', THIN, /Import anyway/i],
    ['R-4', wr('trunc.json', JSON.stringify(SKEL).slice(0,60)), /not a JSON|invalid|malformed|could not/i],
    ['R-5', wr('huge.json', big), null],
    ['R-6', wr('arr.json',[SKEL]), /not a|invalid|could not|export/i],
    ['R-7', wr('proto.json','{"name":"P","class":"Paladin","level":7,"__proto__":{"pwned":true},"constructor":{"pwned":true}}'), null],
    ['R-8', wr('bin.json',' \x89PNG\r\n\n'+' '.repeat(200)), /not a JSON|invalid|could not|export/i],
  ];
  for (const [id, file, expect] of cases) {
    const { ctx, page } = await fresh(id);
    const t0 = Date.now();
    await importFile(page, file, { anyway:false });
    const ms = Date.now()-t0;
    const t = (await page.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').trim();
    const saved = await storedChars(page);
    const retry = /Import Character/i.test(t);
    const msgOk = expect ? expect.test(t) : null;
    let extra = '';
    if (id==='R-7') extra = ` protoPolluted=${await page.evaluate(()=>({}).pwned!==undefined||Object.prototype.pwned!==undefined)}`;
    if (id==='R-5') extra = ` importCall=${ms}ms (harness allows 1900ms of which 900 is its own sleep)`;
    if (id==='R-3') extra = ` cancelOffered=${/Cancel/.test(t)} namesThinFields=${/ability scores|weapons|equipment/i.test(t)}`;
    console.log(`  ${id}: saved=${saved} retryPossible=${retry} messageMatches=${msgOk}${extra}`);
    console.log(`        screen: "${t.slice(0,180)}"`);
    await rej(page,id); await ctx.close();
  }
  // R-9
  const { ctx, page } = await fresh('R-9');
  await importFile(page, FULL);
  const n1 = await storedChars(page);
  // spend something so there IS unsaved/changed state, then re-import the same file
  const sp = page.getByRole('button',{name:/Heal 5/i}).first();
  if (await sp.count()) { await sp.click().catch(()=>{}); await page.waitForTimeout(900); }
  const mid = await storedChar(page);
  await goScreen(page, SCREENS.find(s=>s.id==='prep/Character'));
  const again = page.getByRole('button',{name:/Import Character/i});
  const reimported = await again.count() > 0;
  if (reimported) await importFile(page, FULL);
  const n2 = await storedChars(page);
  const after = await storedChar(page);
  console.log(`  R-9: chars ${n1} → ${n2} · a second Import Character control was reachable = ${reimported}`);
  console.log(`       state after the re-import ${after===mid?'PRESERVED the spend':'OVERWROTE the spend'} (criterion: "no silent overwrite of unsaved state")`);
  await rej(page,'R-9'); await ctx.close();
}

/* ── D-3 ── */
console.log('\n=== D-3 reproduced ===');
for (const [label, file, cancel] of [['{}',EMPTY,false],['prose',wr('p2.json','eggs'),false],['thin+Cancel',THIN,true]]) {
  const { ctx, page } = await fresh('D3');
  await importFile(page, file, { anyway:false });
  if (cancel) { const c = page.getByRole('button',{name:/^Cancel$/});
    console.log(`  Cancel offered = ${await c.count()>0}`); if (await c.count()) { await c.click(); await page.waitForTimeout(600);} }
  console.log(`  ${label}: codex-character-* keys written = ${await storedChars(page)}`);
  await ctx.close();
}

/* ── N-3 ── */
console.log('\n=== N-3 reproduced ===');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const foreign = new Set(); const origin = new URL(srv.url).origin;
  page.on('request', r => { try { const o = new URL(r.url()).origin; if (o!==origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.add(o); } catch {} });
  page.on('console',m=>{if(m.type()==='error')E.push('[N3] '+m.text().slice(0,160));});
  await page.goto(srv.url,{waitUntil:'networkidle'});
  await importFile(page, FULL);
  for (const s of SCREENS) { await goScreen(page,s); }
  console.log(`  foreign origins during boot + full walk: ${foreign.size ? [...foreign].join(', ') : 'none'}`);
  await ctx.close();
}

console.log('\n=== ALL ERRORS SEEN IN PROBE 7 ===');
console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
