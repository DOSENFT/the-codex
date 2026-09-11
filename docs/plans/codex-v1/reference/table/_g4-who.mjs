/* G-4 who — 38 % of the «Paralyzed» chip's pixels are gold (212,167,74) and its
   ink is red-400. That is not a contrast failure, it is something painted on
   top. Name it before deciding whether it is a defect. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5927);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL); await page.waitForTimeout(1000);
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);
console.log(await page.evaluate(() => {
  const out = [];
  for (const x of [55, 90, 114, 150, 175]) for (const y of [620, 626, 632]) {
    const h = document.elementFromPoint(x, y);
    if (!h) { out.push(`${x},${y} -> null`); continue; }
    const s = getComputedStyle(h), r = h.getBoundingClientRect();
    out.push(`${x},${y} -> <${h.tagName.toLowerCase()}> "${(h.textContent||'').trim().slice(0,24)}" pos=${s.position} z=${s.zIndex}\n        bg=${s.backgroundColor} bgimg=${(s.backgroundImage||'none').slice(0,70)}\n        rect=${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}  cls=${(typeof h.className==='string'?h.className:'').slice(0,100)}`);
  }
  return out.join('\n');
}));
await ctx.close(); await browser.close(); await srv.close();
