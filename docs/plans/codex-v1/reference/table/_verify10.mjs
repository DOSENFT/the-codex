// VERIFIER probe 10 — S-2 / S-5 / S-6 re-measured, and the E family re-run with
// actions that are not a single button toggled 200 times.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChar } from './rig.mjs';
const PORT = 5420;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const E = [];
async function fresh(tag) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', e => E.push(`[${tag}] PAGEERROR ` + String(e).split('\n')[0].slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') E.push(`[${tag}] CONSOLE.ERROR ` + m.text().slice(0, 200)); });
  await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 200))); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, page, cdp };
}

console.log('=== S-2 tab switch, measured by input-to-next-paint AND by "did the old screen leave" ===');
{
  const { ctx, page } = await fresh('S2');
  await importFile(page, FULL);
  // an exclusive fingerprint per screen: text present on it and on no sibling
  const fp = {};
  const seen = {};
  for (const s of SCREENS) { await goScreen(page, s); await settle(page); seen[s.id] = await page.evaluate(() => document.body.innerText); }
  for (const s of SCREENS) {
    const mine = new Set(seen[s.id].split(/\n+/).map(x => x.trim()).filter(x => x.length > 4 && x.length < 60));
    for (const o of SCREENS) if (o.id !== s.id) for (const line of seen[o.id].split(/\n+/).map(x => x.trim())) mine.delete(line);
    fp[s.id] = [...mine][0] || null;
  }
  const rows = [];
  for (const s of SCREENS) {
    if (!fp[s.id]) { rows.push(`${s.id.padEnd(16)} NO EXCLUSIVE MARKER — unmeasurable`); continue; }
    const away = SCREENS.find(o => o.mode === s.mode && o.id !== s.id);
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await goScreen(page, away); await settle(page);
      await page.evaluate(() => { window.__e2 = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__e2.push(Math.round(e.duration)); }).observe({ type: 'event', buffered: false, durationThreshold: 0 }); });
      const t0 = Date.now();
      await page.getByRole('tab', { name: s.tab, exact: true }).first().click().catch(() => {});
      const arrived = await page.evaluate(async m => {
        const dl = performance.now() + 6000;
        while (performance.now() < dl) { if (document.body.innerText.includes(m)) return Math.round(performance.now()); await new Promise(r => requestAnimationFrame(r)); }
        return null;
      }, fp[s.id]);
      const wall = Date.now() - t0;
      const ev = (await page.evaluate(() => window.__e2 || [])).filter(Number.isFinite);
      runs.push({ wall, ev: ev.length ? Math.max(...ev) : null, arrived: arrived !== null });
    }
    const worstWall = Math.max(...runs.map(r => r.wall));
    const worstEv = Math.max(...runs.map(r => r.ev ?? 0));
    const never = runs.some(r => !r.arrived);
    rows.push(`${s.id.padEnd(16)} worst wall ${worstWall}ms · worst input→paint ${worstEv || 'n/a'}ms ${never ? '· NEVER ARRIVED' : ''}  [«${fp[s.id].slice(0, 34)}»]`);
  }
  rows.forEach(r => console.log('   ' + r));
  await ctx.close();
}

console.log('\n=== S-3 / S-5 / S-6 sanity, my own 10-action turn ===');
{
  const { ctx, page } = await fresh('S3');
  await importFile(page, FULL);
  await page.evaluate(() => {
    window.__cls = 0; window.__long = []; window.__ev = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__ev.push({ n: e.name, d: Math.round(e.duration) }); }).observe({ type: 'event', buffered: true, durationThreshold: 0 });
  });
  const targets = [/Heal 5/i, /^Action$/, /^Bonus$/, /^Reaction$/, /^Move$/];
  const walls = [];
  for (let i = 0; i < 10; i++) {
    const el = page.getByRole('button', { name: targets[i % targets.length] }).first();
    if (!(await el.count()) || !(await el.isEnabled().catch(() => false))) continue;
    const t0 = Date.now();
    await el.click().catch(() => {});
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    walls.push(Date.now() - t0);
  }
  const { cls, long, ev } = await page.evaluate(() => ({ cls: window.__cls, long: window.__long, ev: window.__ev }));
  console.log(`   taps landed: ${walls.length} · wall ${walls.join(',')}ms`);
  console.log(`   input→paint entries: ${ev.length} · worst ${ev.length ? Math.max(...ev.map(x => x.d)) : 'n/a'}ms`);
  console.log(`   long tasks >200ms: ${long.filter(d => d > 200).length}   (all long tasks: ${long.join(',') || 'none'})`);
  console.log(`   CLS during the turn: ${cls.toFixed(4)}  (threshold 0.02)`);
  // S-6 the honest way: measure CLS while SCROLLING and switching, which is what
  // a thumb actually does, not only while tapping in place.
  await page.evaluate(() => { window.__cls2 = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls2 += e.value; }).observe({ type: 'layout-shift' }); });
  for (const s of SCREENS) { await goScreen(page, s); await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(400); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400); }
  console.log(`   CLS across a walk of all 7 screens with scrolling: ${(await page.evaluate(() => window.__cls2)).toFixed(4)}`);
  await ctx.close();
}

console.log('\n=== E family — 200 VARIED actions, not one toggle 200 times ===');
{
  const { ctx, page, cdp } = await fresh('E');
  await importFile(page, FULL);
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); const { result } = await cdp.send('Runtime.evaluate', { expression: 'performance.memory ? performance.memory.usedJSHeapSize : 0' }); return result.value || 0; };
  const nodes = () => page.evaluate(() => document.getElementsByTagName('*').length);
  const listeners = async () => { const { result } = await cdp.send('Runtime.evaluate', { expression: '1' }); return result.value; };
  let h10 = 0, n10 = 0, done = 0;
  const kinds = { toggle: 0, spend: 0, tab: 0, scroll: 0, mode: 0, roll: 0, cond: 0 };
  const rand = n => Math.floor(Math.random() * n);
  for (let i = 0; done < 200 && i < 900; i++) {
    const pick = done % 7;
    let ok = false;
    try {
      if (pick === 0 || pick === 3) {           // an action-economy toggle
        const el = page.getByRole('button', { name: /^(Action|Bonus|Reaction|Move)$/ }).nth(rand(4));
        if (await el.count()) { await el.click({ timeout: 1500 }); kinds.toggle++; ok = true; }
      } else if (pick === 1) {                   // a real spend, or a slot
        for (const re of [/Heal 5/i, /Expend/i, /Slots?:/i]) {
          const el = page.getByRole('button', { name: re }).first();
          if (await el.count() && await el.isEnabled().catch(() => false)) { await el.click({ timeout: 1500 }); kinds.spend++; ok = true; break; }
        }
      } else if (pick === 2) {                   // a tab switch
        await goScreen(page, SCREENS[rand(SCREENS.length)]); kinds.tab++; ok = true;
      } else if (pick === 4) {                   // scrolling
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.evaluate(() => scrollTo(0, 0)); kinds.scroll++; ok = true;
      } else if (pick === 5) {                   // a condition chip
        const el = page.getByRole('button', { name: /Charmed|Poisoned|Prone|Stunned|Blinded/i }).nth(rand(3));
        if (await el.count()) { await el.click({ timeout: 1500 }); kinds.cond++; ok = true; }
      } else {                                   // a dice roll / any live control on combat
        const el = page.getByRole('button', { name: /Damage|Roll|d20|Attack/i }).first();
        if (await el.count() && await el.isEnabled().catch(() => false)) { await el.click({ timeout: 1500 }); kinds.roll++; ok = true; }
      }
    } catch { }
    if (!ok) { const el = page.getByRole('button', { name: /^(Action|Bonus|Reaction|Move)$/ }).first(); if (await el.count()) { await el.click({ timeout: 1500 }).catch(() => {}); kinds.toggle++; ok = true; } }
    if (ok) done++; else break;
    if (done === 10) { await goScreen(page, SCREENS[0]); h10 = await heap(); n10 = await nodes(); }
  }
  await goScreen(page, SCREENS[0]); await settle(page);
  const h200 = await heap(), n200 = await nodes();
  console.log(`   actions driven: ${done}  ${JSON.stringify(kinds)}`);
  console.log(`   E-1 heap  ${(h10 / 1e6).toFixed(2)}MB → ${(h200 / 1e6).toFixed(2)}MB  = ${h10 ? (((h200 - h10) / h10) * 100).toFixed(1) : '?'}%   (≤25%)`);
  console.log(`   E-2 nodes ${n10} → ${n200}  = ${n200 - n10}   (≤50)`);
  const st = await page.evaluate(async () => {
    let ls = 0, big = ['', 0];
    for (const k of Object.keys(localStorage)) { const n = (localStorage.getItem(k) || '').length * 2; ls += n; if (n > big[1]) big = [k, n]; }
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    let cacheBytes = 0;
    try { for (const n of await caches.keys()) { const c = await caches.open(n); for (const rq of await c.keys()) { const r = await c.match(rq); if (r) cacheBytes += (await r.clone().arrayBuffer()).byteLength; } } } catch { }
    return { ls, big, est, cacheBytes };
  });
  console.log(`   E-3 localStorage only (what the harness counts): ${(st.ls / 1024).toFixed(0)}KB  largest ${st.big[0]} ${(st.big[1] / 1024).toFixed(0)}KB`);
  console.log(`   E-3 cache-storage bytes:                        ${(st.cacheBytes / 1024).toFixed(0)}KB`);
  console.log(`   E-3 navigator.storage.estimate().usage (TRUE origin usage): ${st.est ? (st.est.usage / 1024).toFixed(0) + 'KB' : 'n/a'}   (<4096KB)`);
  // E-4
  await page.evaluate(() => { window.__e4 = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__e4.push(Math.round(e.duration)); }).observe({ type: 'event', buffered: false, durationThreshold: 0 }); });
  const before = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
  const s0 = await storedChar(page);
  const live = page.getByRole('button', { name: /^(Action|Bonus|Reaction|Move)$/ }).first();
  const t0 = Date.now(); await live.click({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const wall = Date.now() - t0;
  const after = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
  const ev4 = (await page.evaluate(() => window.__e4)).filter(Number.isFinite);
  console.log(`   E-4 action ${done + 1}: landed=${after !== before || (await storedChar(page)) !== s0} · input→paint worst ${ev4.length ? Math.max(...ev4) : 'n/a'}ms · wall ${wall}ms  (≤100)`);
  const rej = await page.evaluate(() => window.__rej || []);
  if (rej.length) E.push('[E] REJECTION ' + rej.join(' | '));
  await ctx.close();
}

console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
