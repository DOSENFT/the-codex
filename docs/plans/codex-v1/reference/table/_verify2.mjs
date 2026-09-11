// VERIFIER probe 2 — pixel-truth contrast. No computed-style guessing for the
// background: screenshot the element and read the actually painted pixels.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile } from './rig.mjs';
const PORT = 5412;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e).split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR ' + m.text().slice(0,200)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);

// scratch page purely to decode PNGs
const scratch = await ctx.newPage();
await scratch.goto('data:text/html,<canvas id=c></canvas>');

const srgb = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const lum = ([r,g,b]) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(b);
const ratio = (a,bb) => { const [x,y] = [lum(a), lum(bb)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

async function pixels(clip) {
  const buf = await page.screenshot({ clip });
  return scratch.evaluate(async b64 => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin], { type: 'image/png' }));
    const cv = document.getElementById('c'); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    const hist = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = `${d[i]},${d[i+1]},${d[i+2]}`;
      hist.set(k, (hist.get(k) || 0) + 1);
    }
    const sorted = [...hist.entries()].sort((a,b) => b[1]-a[1]);
    return { total: d.length/4, top: sorted.slice(0, 6) };
  }, buf.toString('base64'));
}

// Candidates: the exact nodes the builder's audit skipped as "onImage".
const CANDIDATES = [
  // [screen, text-to-find, why]
  ['play/Combat', '35', 'V-3 Lay on Hands counter'],
  ['play/Combat', 'Charmed', 'V-2 condition chip 12px'],
  ['prep/Character', '18', 'V-3 AC'],
  ['prep/Character', '67', 'V-3 HP'],
  ['prep/Character', 'Nix', 'V-4 Cinzel size'],
  ['play/Roleplay', 'Nix', 'V-4 Cinzel size'],
];

console.log('=== PIXEL-TRUTH contrast / size on nodes the builder skipped as "onImage" ===\n');
for (const [screenId, needle, why] of CANDIDATES) {
  const s = SCREENS.find(x => x.id === screenId);
  await goScreen(page, s); await settle(page);
  await page.evaluate(() => scrollTo(0,0)); await page.waitForTimeout(300);

  const hits = await page.evaluate(n => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = w.nextNode(); node; node = w.nextNode()) {
      if (node.nodeValue.trim() !== n) continue;
      const el = node.parentElement; if (!el) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (r.width < 1 || r.height < 1) continue;
      if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
      out.push({ x: r.left, y: r.top, w: r.width, h: r.height,
        color: cs.color, size: parseFloat(cs.fontSize), weight: cs.fontWeight,
        family: (cs.fontFamily||'').split(',')[0].replace(/["']/g,''),
        opacity: cs.opacity, cls: String(el.className).slice(0,50) });
    }
    return out;
  }, needle);

  if (!hits.length) { console.log(`  ${screenId} «${needle}» — not on the first fold, skipping`); continue; }
  const h = hits[0];
  const px = await pixels({ x: h.x, y: h.y, width: Math.max(1,h.w), height: Math.max(1,h.h) });
  const fg = h.color.match(/[\d.]+/g).slice(0,3).map(Number);
  // the modal colour inside the box IS the painted background
  const bgPx = px.top[0][0].split(',').map(Number);
  // darkest/lightest extreme = the glyph ink actually painted
  const inkCandidates = px.top.map(([k,c]) => ({ rgb: k.split(',').map(Number), c }));
  const bgL = lum(bgPx);
  const ink = inkCandidates.slice(1).sort((a,z) => Math.abs(lum(z.rgb)-bgL) - Math.abs(lum(a.rgb)-bgL))[0];
  console.log(`  ${screenId.padEnd(15)} «${needle}»  (${why})`);
  console.log(`     ${h.family} ${h.size}px w${h.weight} opacity=${h.opacity}  colour=${h.color}`);
  console.log(`     painted bg (modal pixel) = rgb(${bgPx})   painted ink (extreme) = rgb(${ink ? ink.rgb : '?'})`);
  console.log(`     contrast  computed-fg vs painted-bg = ${ratio(fg, bgPx).toFixed(2)}:1` +
              (ink ? `   painted-ink vs painted-bg = ${ratio(ink.rgb, bgPx).toFixed(2)}:1` : ''));
  console.log('');
}

console.log('\n=== V-5: do the 40px Roleplay controls really get 44px of hit area? ===');
{
  const s = SCREENS.find(x => x.id === 'play/Roleplay');
  await goScreen(page, s); await settle(page);
  const info = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button,[role="button"],[role="tab"],a[href]')) {
      const r = el.getBoundingClientRect();
      if (r.height < 1 || r.height >= 44) continue;
      const p = el.parentElement, pr = p.getBoundingClientRect(), pcs = getComputedStyle(p);
      // who is directly above/below? if a sibling abuts, the "hit area" is a fiction
      const sibs = [...p.children].filter(c => c !== el).map(c => { const cr = c.getBoundingClientRect();
        return { gapAbove: Math.round(r.top - cr.bottom), gapBelow: Math.round(cr.top - r.bottom) }; })
        .filter(g => (g.gapAbove >= 0 && g.gapAbove < 30) || (g.gapBelow >= 0 && g.gapBelow < 30));
      out.push({ label: (el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
        h: Math.round(r.height), w: Math.round(r.width),
        parentTag: p.tagName.toLowerCase(), parentPadT: pcs.paddingTop, parentPadB: pcs.paddingBottom,
        parentGap: pcs.rowGap || pcs.gap, parentH: Math.round(pr.height),
        nearestGaps: sibs.slice(0,3) });
    }
    return out;
  });
  const seen = new Set();
  for (const i of info) { const k = i.label+i.h; if (seen.has(k)) continue; seen.add(k);
    console.log(`  «${i.label}» ${i.w}x${i.h}  parent<${i.parentTag}> padT=${i.parentPadT} padB=${i.parentPadB} gap=${i.parentGap}  neighbour gaps: ${JSON.stringify(i.nearestGaps)}`); }
  if (!info.length) console.log('  (none under 44 on this fold)');
}

console.log('\n=== errors during probe 2 ===');
console.log(errs.length ? errs.join('\n') : '  (none)');
await b.close(); await srv.close();
