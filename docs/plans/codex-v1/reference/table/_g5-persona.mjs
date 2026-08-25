/* G-5 — the three V-2 nodes on prep/Persona, located rather than guessed at.
   -----------------------------------------------------------------------------
   The run of record failed V-2 on «14» 4.15:1, «21» 4.17:1 and «4» 4.17:1, all
   12px, all on prep/Persona. The obvious suspects are the accordion count
   badges at IdentityPage.tsx:162 — but `_g5-neutral.mjs` computes that row at
   8.86:1 worst case, twice the measured value, so the obvious suspect is either
   the wrong node or is not painted the way its classes say.

   Either way the answer is not another model. This prints, for every node whose
   text is one of the three, the computed ink, the FULL chain of ancestor
   background layers down to the first opaque one, the rect, and the grader's own
   pixel reading — so the next edit is aimed at a named element with a known
   ground, which is the step both A-23 and A-35 skipped.                       */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, audit, pixelContrast, scrollPage } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const WANTED = ['14', '21', '4'];

const srv = await serveDist(DIST, 5934);
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
await goScreen(page, SCREENS.find(s => s.id === 'prep/Persona'));
await settle(page);

for (const where of ['top', 'bottom']) {
  await scrollPage(page, where); await settle(page);

  const { text } = await audit(page);
  const hits = text.filter(n => n.painted && WANTED.includes(String(n.t).trim()) && n.size <= 13);
  const px = await pixelContrast(page, hits);
  const byKey = new Map(px.map(m => [`${m.t}|${m.size}`, m]));

  const found = await page.evaluate(W => {
    const desc = e => e.tagName.toLowerCase() +
      (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 5).join('.') : '');
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.nodeValue || '').trim();
      if (!W.includes(t)) continue;
      const el = n.parentElement; if (!el) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (parseFloat(cs.fontSize) > 13 || r.width < 1 || r.height < 1) continue;
      /* Every background layer between the ink and the first opaque ground, plus
         any opacity/filter on the way, because a translucent stack is exactly
         where a computed model and a painted pixel come apart. */
      const layers = [];
      for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
        const s = getComputedStyle(p);
        const bits = [];
        if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') bits.push(`bg ${s.backgroundColor}`);
        if (s.backgroundImage && s.backgroundImage !== 'none') bits.push(`img ${s.backgroundImage.slice(0, 42)}`);
        if (s.opacity !== '1') bits.push(`opacity ${s.opacity}`);
        if (s.filter && s.filter !== 'none') bits.push(`filter ${s.filter}`);
        if (s.mixBlendMode && s.mixBlendMode !== 'normal') bits.push(`blend ${s.mixBlendMode}`);
        if (bits.length) layers.push(`${desc(p)} :: ${bits.join(' · ')}`);
        if (/^rgb\(/.test(s.backgroundColor)) break;   // first fully opaque ground
      }
      out.push({ t, size: Math.round(parseFloat(cs.fontSize)), color: cs.color,
        rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        cls: desc(el), layers });
    }
    return out;
  }, WANTED);

  console.log(`\n\x1b[1m── prep/Persona @${where} — ${found.length} candidate node(s) ──\x1b[0m`);
  for (const n of found) {
    const m = byKey.get(`${n.t}|${n.size}`);
    console.log(`\n  «${n.t}» ${n.size}px  ${n.color}  ${n.rect}  ${m ? `pixel \x1b[1m${m.pixel?.toFixed(2)}:1\x1b[0m` : 'no pixel reading'}`);
    console.log(`     ${n.cls}`);
    for (const l of n.layers) console.log(`       ↑ ${l}`);
  }
}

console.log(`\nerror floor: ${errs.length ? '\x1b[31m' + errs.join(' | ') + '\x1b[0m' : '\x1b[32mclean\x1b[0m'}`);
await browser.close(); srv.close();
