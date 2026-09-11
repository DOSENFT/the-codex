// VERIFIER probe 13 — N-2 done properly: hang the AI FIRST, then take a turn.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile } from './rig.mjs';
const srv = await serveDist(DIST, 5427);
const b = await chromium.launch();
const E = [];
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
let hits = 0;
await ctx.route(/11434|ollama|generativelanguage|googleapis/i, async r => { hits++; await new Promise(x => setTimeout(x, 120000)); });
const page = await ctx.newPage();
page.on('pageerror', e => E.push('PAGEERROR ' + String(e).split('\n')[0].slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') E.push('CONSOLE.ERROR ' + m.text().slice(0, 200)); });
await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 200))); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);

// 1. provoke the AI on every screen so a request is genuinely in flight and hanging
for (const s of SCREENS) {
  await goScreen(page, s); await settle(page);
  const btns = page.getByRole('button', { name: /Ask|Suggest|Coach|Generate|Advis|Analy|AI|Oracle|Whisper|Think/i });
  const n = Math.min(await btns.count(), 4);
  for (let i = 0; i < n; i++) await btns.nth(i).click({ timeout: 1500 }).catch(() => { });
}
console.log(`AI requests now hanging: ${hits}`);

// 2. with those hanging, take a real turn on the combat screen
await goScreen(page, SCREENS[0]); await settle(page);
await page.evaluate(() => { window.__ev = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__ev.push(Math.round(e.duration)); }).observe({ type: 'event', buffered: false, durationThreshold: 0 }); });
const walls = [];
for (const re of [/Heal 5/i, /^Action$/, /^Bonus$/, /^Reaction$/, /^Move$/]) {
  const el = page.getByRole('button', { name: re }).first();
  if (!(await el.count())) continue;
  const t0 = Date.now(); await el.click({ timeout: 4000 }).catch(() => { });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  walls.push(`${String(re).slice(0, 12)}=${Date.now() - t0}ms`);
}
const ev = (await page.evaluate(() => window.__ev)).filter(Number.isFinite);
console.log(`S-3 while the AI hangs: input→paint worst ${ev.length ? Math.max(...ev) : 'n/a'}ms · wall ${walls.join(' ')}`);

// 3. does a spinner outlive the turn? six seconds is the turn.
await page.waitForTimeout(6500);
const spin = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[role="status"],[aria-busy="true"],.animate-spin,.animate-pulse')]
    .filter(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; });
  return { n: els.length, sample: els.slice(0, 4).map(e => (e.className + '|' + (e.innerText || '').replace(/\s+/g, ' ')).slice(0, 90)) };
});
console.log(`spinners still on screen 6.5s after the turn: ${spin.n}  ${JSON.stringify(spin.sample)}`);
const dead = [];
for (const s of SCREENS) { await goScreen(page, s); const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); if (t.trim().length < 40) dead.push(s.id + ' BLANK'); if (/stopped[\s\S]{0,80}rest of the app is still running|something went wrong/i.test(t)) dead.push(s.id + ' BOUNDARIED'); }
console.log(`screens dead while the AI hangs: ${dead.length ? dead.join(', ') : 'none'}`);
const rej = await page.evaluate(() => window.__rej || []);
console.log(`unhandled rejections: ${rej.length ? rej.join(' | ') : 'none'}`);
console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close(); await srv.close();
