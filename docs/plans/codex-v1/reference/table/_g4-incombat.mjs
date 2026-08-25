/* G-4 in combat — locating the numeral the new pass found.
   -----------------------------------------------------------------------------
   Adding the in-combat state to the grader moved three numbers at once:
   population 1116 -> 1139, tier C 12 -> 10, and V-3 from 0 to 1. The third is
   the one that matters — a 12px «1» reading 5.73:1 against a 7:1 numeral floor,
   on play/Combat, in combat. Every earlier run measured this screen showing
   «Start Combat», so this node had never been on screen while anything was
   grading. It is not a regression; it is the first look.

   The grader's dedup key is screen|text|size and carries no coordinates, so
   «1» at 12px could be any of several nodes. This finds the actual element:
   enter combat, walk every numeric text node, and print the ones at 12px with
   their rect, their computed ink, and their ancestry — enough to name the
   component and fix the rule rather than the pixel.                          */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, audit, pixelContrast } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5931);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);
const start = page.locator('button:has-text("Start Combat")').first();
console.log(`«Start Combat» present: ${await start.count() > 0}`);
await start.click({ timeout: 5000 });
await page.waitForTimeout(900); await settle(page);

/* What the in-combat surface actually offers — including whether «Manage
   Actions» now exists, which is the other half of the residual. */
const controls = await page.evaluate(() => [...new Set([...document.querySelectorAll('main button, main [role="button"]')]
  .map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46)).filter(Boolean))]);
console.log(`\ncontrols in <main> now (${controls.length}):`);
for (const c of controls) console.log(`   · ${c}`);

/* Every 12px numeral on screen, with ancestry, graded by the same pixel reader
   the grader uses — so this names the same node by the same measurement. */
const { text } = await audit(page);
const small = text.filter(n => n.painted && n.numeric && n.size <= 13);
const px = await pixelContrast(page, small);
const byKey = new Map(px.map(m => [`${m.t}|${m.size}`, m.pixel]));

const where = await page.evaluate(() => {
  const desc = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '');
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.trim();
    if (!/^\d+$/.test(t)) continue;
    const el = n.parentElement; if (!el) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (parseFloat(cs.fontSize) > 13) continue;
    if (r.width < 1 || r.height < 1) continue;
    const chain = [];
    for (let p = el; p && p !== document.body && chain.length < 4; p = p.parentElement) chain.push(desc(p));
    out.push({ t, size: Math.round(parseFloat(cs.fontSize)), color: cs.color,
      rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`, chain });
  }
  return out;
});
console.log(`\n12px-and-under numerals in combat (${where.length}):`);
for (const n of where) {
  const p = byKey.get(`${n.t}|${n.size}`);
  const flag = p != null && p < 7 ? 'XX' : '  ';
  console.log(`${flag} "${n.t}" ${n.size}px  ${p != null ? p.toFixed(2) + ':1' : '(not read)'}  ${n.color}  ${n.rect}\n      ${n.chain.join('  <  ')}`);
}
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
