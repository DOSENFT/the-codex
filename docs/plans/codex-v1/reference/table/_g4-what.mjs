/* G-4 what — before repairing anything else, find out what «Paralyzed» actually
   is. The number did not move when ConditionsGrid's inactive style was fixed,
   which means either the fix does not reach this node or the node is not the
   one I think it is. Ask, do not assume. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, audit } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5926);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);

const rows = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    if ((el.textContent || '').trim() !== 'Paralyzed') continue;
    const chain = [];
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      chain.push({
        tag: p.tagName.toLowerCase(),
        cls: (typeof p.className === 'string' ? p.className : '').slice(0, 120),
        color: s.color, opacity: s.opacity, bg: s.backgroundColor,
      });
      if (chain.length >= 5) break;
    }
    const r = el.getBoundingClientRect();
    out.push({ rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`, chain });
  }
  return out;
});
for (const r of rows) {
  console.log(`\n«Paralyzed» at ${r.rect}`);
  r.chain.forEach((c, i) => console.log(`   ${i}  <${c.tag}> op=${c.opacity} color=${c.color}\n        bg=${c.bg}\n        ${c.cls}`));
}
console.log(`\n${rows.length} node(s)`);

/* Now the measurement itself, opened up: rig's `ink`, and the modal pixel bin
   pixelContrast() would call the background. If those two disagree with what
   the DOM says, the finding is the instrument's and not the app's. */
const { text } = await audit(page);
const node = text.find(n => n.t === 'Paralyzed');
console.log('\nrig audit row:', JSON.stringify(node));
const shot = (await page.screenshot({ type: 'png' })).toString('base64');
const detail = await page.evaluate(async ({ shot, n }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
  const dpr = img.width / window.innerWidth;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(Math.round(n.x * dpr), Math.round(n.y * dpr),
    Math.round(n.w * dpr), Math.round(n.h * dpr)).data;
  const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    const b = bins.get(k);
    if (b) { b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
    else bins.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
  }
  const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 4)
    .map(b => `${Math.round(b.r / b.n)},${Math.round(b.g / b.n)},${Math.round(b.b / b.n)} x${b.n}`);
  return { px: d.length / 4, top };
}, { shot, n: node });
console.log('pixels read:', detail.px, '\ntop bins:', detail.top);
await ctx.close(); await browser.close(); await srv.close();
