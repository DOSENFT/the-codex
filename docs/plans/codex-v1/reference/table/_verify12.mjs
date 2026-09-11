// VERIFIER probe 12 — S-3/S-5/S-6 re-measured with buffered:false so nothing from
// boot can leak in, and the E family with the fallback fixed + the service worker ON.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChar } from './rig.mjs';
const srv = await serveDist(DIST, 5426);
const b = await chromium.launch();
const E = [];
const arm = (p, t) => { p.on('pageerror', e => E.push(`[${t}] PAGEERROR ` + String(e).split('\n')[0].slice(0, 200))); p.on('console', m => { if (m.type() === 'error') E.push(`[${t}] CONSOLE.ERROR ` + m.text().slice(0, 200)); }); };

console.log('=== S-3 / S-5 / S-6 — observers registered buffered:FALSE, throttle applied only after import ===');
console.log('    (so every number below belongs to the turn itself, not to boot)');
for (const trial of [1, 2, 3]) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); arm(page, 'S' + trial);
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json');
  await settle(page); await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__cls = 0; window.__long = []; window.__ev = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__ev.push({ n: e.name, d: Math.round(e.duration) }); }).observe({ type: 'event', buffered: false, durationThreshold: 0 });
  });
  await page.waitForTimeout(600);
  const targets = [/Heal 5/i, /^Action$/, /^Bonus$/, /^Reaction$/, /^Move$/];
  const walls = [];
  for (let i = 0; i < 10; i++) {
    const el = page.getByRole('button', { name: targets[i % targets.length] }).first();
    if (!(await el.count()) || !(await el.isEnabled().catch(() => false))) continue;
    const t0 = Date.now(); await el.click().catch(() => { });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    walls.push(Date.now() - t0);
  }
  const { cls, long, ev } = await page.evaluate(() => ({ cls: window.__cls, long: window.__long, ev: window.__ev }));
  const worst = ev.length ? Math.max(...ev.map(x => x.d)) : NaN;
  console.log(`  trial ${trial}: taps=${walls.length} · S-3 input→paint worst ${worst}ms (${ev.length} entries) · wall worst ${Math.max(...walls)}ms`);
  console.log(`            S-5 long tasks: [${long.join(',') || 'none'}]  >200ms = ${long.filter(d => d > 200).length}`);
  console.log(`            S-6 CLS = ${cls.toFixed(4)}  (≤0.02)`);
  await ctx.close();
}

console.log('\n=== E family, fixed: 200 varied actions, always returning to the combat screen ===');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });   // SERVICE WORKER ON
  const page = await ctx.newPage(); arm(page, 'E');
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json');
  await page.waitForTimeout(4500);   // let the precache land
  const cdp = await ctx.newCDPSession(page);
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => { }); const { result } = await cdp.send('Runtime.evaluate', { expression: 'performance.memory ? performance.memory.usedJSHeapSize : 0' }); return result.value || 0; };
  const nodes = () => page.evaluate(() => document.getElementsByTagName('*').length);
  let h10 = 0, n10 = 0, done = 0;
  const kinds = { toggle: 0, spend: 0, tab: 0, scroll: 0, cond: 0, other: 0 };
  for (let i = 0; done < 200 && i < 1400; i++) {
    const pick = done % 8;
    let ok = false;
    try {
      if (pick === 2) { await goScreen(page, SCREENS[(done / 8 | 0) % 7]); await goScreen(page, SCREENS[0]); kinds.tab++; ok = true; }
      else if (pick === 4) { await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(60); await page.evaluate(() => scrollTo(0, 0)); kinds.scroll++; ok = true; }
      else if (pick === 5) {
        const el = page.getByRole('button', { name: /Charmed|Poisoned|Prone|Stunned|Blinded/i }).first();
        if (await el.count()) { await el.click({ timeout: 1500 }); kinds.cond++; ok = true; }
      } else if (pick === 1) {
        for (const re of [/Heal 5/i, /Expend/i]) { const el = page.getByRole('button', { name: re }).first(); if (await el.count() && await el.isEnabled().catch(() => false)) { await el.click({ timeout: 1500 }); kinds.spend++; ok = true; break; } }
      }
      if (!ok) { const el = page.getByRole('button', { name: /^(Action|Bonus|Reaction|Move)$/ }).nth(done % 4); if (await el.count()) { await el.click({ timeout: 1500 }); kinds.toggle++; ok = true; } }
    } catch { }
    if (!ok) { const el = page.getByRole('button', { name: /^Action$/ }).first(); if (await el.count()) { await el.click({ timeout: 2000 }).catch(() => { }); kinds.other++; ok = true; } }
    if (!ok) { console.log(`   stalled at action ${done}`); break; }
    done++;
    if (done === 10) { await goScreen(page, SCREENS[0]); await settle(page); h10 = await heap(); n10 = await nodes(); }
  }
  await goScreen(page, SCREENS[0]); await settle(page);
  const h200 = await heap(), n200 = await nodes();
  console.log(`   actions driven: ${done} ${JSON.stringify(kinds)}`);
  console.log(`   E-1 heap  ${(h10 / 1e6).toFixed(2)}MB → ${(h200 / 1e6).toFixed(2)}MB = ${h10 ? (((h200 - h10) / h10) * 100).toFixed(1) : '?'}%  (≤25%)`);
  console.log(`   E-2 nodes ${n10} → ${n200} = ${n200 - n10}  (≤50)`);
  const st = await page.evaluate(async () => {
    let ls = 0, big = ['', 0];
    for (const k of Object.keys(localStorage)) { const n = (localStorage.getItem(k) || '').length * 2; ls += n; if (n > big[1]) big = [k, n]; }
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    let cacheBytes = 0, files = 0;
    try { for (const n of await caches.keys()) { const c = await caches.open(n); for (const rq of await c.keys()) { files++; const r = await c.match(rq); if (r) cacheBytes += (await r.clone().arrayBuffer()).byteLength; } } } catch { }
    return { ls, big, est, cacheBytes, files, keys: await caches.keys() };
  });
  console.log(`   E-3 localStorage (all the harness counts): ${(st.ls / 1024).toFixed(0)}KB · largest key ${(st.big[1] / 1024).toFixed(0)}KB`);
  console.log(`   E-3 cache storage: ${st.files} files, ${(st.cacheBytes / 1024).toFixed(0)}KB  ${JSON.stringify(st.keys)}`);
  console.log(`   E-3 navigator.storage.estimate().usage = ${st.est ? (st.est.usage / 1024).toFixed(0) + 'KB' : 'n/a'}  vs the 4096KB ceiling`);
  await page.evaluate(() => { window.__e4 = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__e4.push(Math.round(e.duration)); }).observe({ type: 'event', buffered: false, durationThreshold: 0 }); });
  const s0 = await storedChar(page); const b0 = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
  const t0 = Date.now(); await page.getByRole('button', { name: /^Action$/ }).first().click({ timeout: 3000 }).catch(() => { });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const wall = Date.now() - t0;
  const b1 = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
  const e4 = (await page.evaluate(() => window.__e4)).filter(Number.isFinite);
  console.log(`   E-4 landed=${b1 !== b0 || (await storedChar(page)) !== s0} · input→paint worst ${e4.length ? Math.max(...e4) : 'n/a'}ms · wall ${wall}ms  (≤100)`);
  await ctx.close();
}
console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
