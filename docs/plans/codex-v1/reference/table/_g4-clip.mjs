/* G-4 clip — is «Paralyzed» painted at all?
   Its box says 50,618 129x15 and the pixels there are spell-slot pips. Either
   something covers it, or it is not on the screen and rig's visible() thinks it
   is. Walk its ancestors and print every one that could be clipping it. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5928);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL); await page.waitForTimeout(1000);
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);
console.log(await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => !e.children.length && (e.textContent||'').trim() === 'Paralyzed');
  if (!el) return 'not found';
  const lines = [];
  lines.push(`self visible-by-hit-test: ${document.elementFromPoint(114, 626) === el || el.contains(document.elementFromPoint(114, 626))}`);
  lines.push(`checkVisibility(): ${el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) : 'n/a'}`);
  for (let p = el, i = 0; p && p !== document.documentElement; p = p.parentElement, i++) {
    const s = getComputedStyle(p), r = p.getBoundingClientRect();
    const clips = s.overflow !== 'visible' || s.clipPath !== 'none' || s.contentVisibility === 'hidden';
    const zero = r.height < 1 || r.width < 1;
    if (clips || zero || s.transform !== 'none' || s.height === '0px')
      lines.push(`  ${i} <${p.tagName.toLowerCase()}.${(typeof p.className==='string'?p.className:'').split(/\s+/).slice(0,3).join('.')}>  rect=${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}  overflow=${s.overflow}  height=${s.height}  transform=${s.transform.slice(0,40)}  cv=${s.contentVisibility}`);
  }
  return lines.join('\n');
}));
await ctx.close(); await browser.close(); await srv.close();
