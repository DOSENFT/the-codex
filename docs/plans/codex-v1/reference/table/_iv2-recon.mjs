/* IV2 recon — what is actually on the seven screens, and what is fixed.
   My own probe. Uses rig only for plumbing (serve, import, navigate). */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5911);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();

const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await page.addInitScript(() => {
  window.__rej = [];
  addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 200)));
});

await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1200);

const SNAP = () => {
  const vis = el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05
      && r.width > 0 && r.height > 0;
  };
  const fixed = [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).position === 'fixed' && vis(e))
    .map(e => { const r = e.getBoundingClientRect(); return {
      tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 70),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      z: getComputedStyle(e).zIndex,
    }; });
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const dis = [...document.querySelectorAll(SEL)].filter(e => vis(e) && (e.disabled || e.getAttribute('aria-disabled') === 'true'))
    .map(e => { const r = e.getBoundingClientRect(); return {
      label: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      pe: getComputedStyle(e).pointerEvents,
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    }; });
  const nctl = [...document.querySelectorAll(SEL)].filter(vis).length;
  return { fixed, dis, nctl, title: document.title, txt: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160) };
};

for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const r = await page.evaluate(SNAP);
  console.log(`\n=== ${s.id} — ${r.nctl} visible controls, ${r.dis.length} disabled`);
  console.log('  fixed:');
  for (const f of r.fixed) console.log(`    <${f.tag}> z=${f.z} ${f.x},${f.y} ${f.w}x${f.h}  ${f.cls}`);
  if (r.dis.length) { console.log('  disabled controls:'); for (const d of r.dis) console.log(`    "${d.label}"  pe=${d.pe}  ${d.x},${d.y} ${d.w}x${d.h}`); }
  console.log('  text:', r.txt);
}
console.log('\nERRORS:', errs.length ? errs : 'none', await page.evaluate(() => window.__rej));
await browser.close(); await srv.close();
