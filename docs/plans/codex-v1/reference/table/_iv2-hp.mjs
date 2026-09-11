/* IV2 — what the HP card actually is, and can a turn be played on it. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5917);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 130)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 130)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);
await goScreen(page, SCREENS[0]); await settle(page);

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    return {
      buttons: [...document.querySelectorAll('button,[role="button"]')].filter(vis).map(b => {
        const r = b.getBoundingClientRect();
        return { n: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), dis: !!b.disabled };
      }).filter(b => b.y > -100 && b.y < 900),
      inputs: [...document.querySelectorAll('input,textarea,select')].filter(vis).map(i => ({ t: i.type, im: i.inputMode, al: i.getAttribute('aria-label'), ph: i.placeholder, v: i.value, y: Math.round(i.getBoundingClientRect().y) })),
      hp: (document.body.innerText.match(/HIT POINTS\s+(\S+)/) || [])[1],
    };
  });
  console.log(`\n--- ${tag} --- HP=${d.hp}`);
  console.log('  buttons:', d.buttons.map(b => `${b.n}${b.dis ? '[dis]' : ''}@${b.y}`).join(' | '));
  console.log('  inputs :', JSON.stringify(d.inputs));
  return d;
};
await dump('initial play/Combat');

// press the thing literally called Damage
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Damage');
  if (!b) return 'not found';
  b.click(); return 'clicked';
});
console.log('\nclick "Damage" ->', clicked);
await page.waitForTimeout(600);
await dump('after Damage');
console.log('\nERRORS:', errs.length ? errs : 'clean');
await browser.close(); await srv.close();
