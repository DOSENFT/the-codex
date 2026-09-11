/* Throwaway: what is actually on play/Combat at scroll-top now, and where?
   Prints every control the V-6 net catches, its rect, and whether the point at
   its centre resolves to it — i.e. the exact three things V-5b, V-6 and V-6b
   grade — so I stop inferring which element a failure line refers to. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const NET = /heal|expend|restore|slot|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i;

const srv = await serveDist(DIST, 4291);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await page.evaluate(() => window.scrollTo(0, 0));
await settle(page);

const out = await page.evaluate(() => {
  const deck = document.querySelector('[aria-label="Turn deck"]');
  const dr = deck ? deck.getBoundingClientRect() : null;
  const vh = window.innerHeight;
  const rows = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="tab"]')]
    .map(e => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || r.width < 1 || r.height < 1) return null;
      const label = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ');
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const inDeck = !!(deck && deck.contains(e));
      return {
        label: label.slice(0, 46), w: Math.round(r.width), h: Math.round(r.height),
        y: Math.round(cy), inDeck,
        reachable: !!(hit && (hit === e || e.contains(hit) || hit.contains(e))),
        cover: hit && !(hit === e || e.contains(hit) || hit.contains(e))
          ? (hit.tagName.toLowerCase() + '.' + String(hit.className).split(' ').slice(0, 2).join('.')).slice(0, 46) : '',
      };
    }).filter(Boolean);
  const main = document.querySelector('main');
  return { vh, deck: dr ? { top: Math.round(dr.top), h: Math.round(dr.height) } : null,
    mainBottom: main ? Math.round(main.getBoundingClientRect().bottom) : null,
    deckVar: getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h'), rows };
});

console.log(`\n  viewport ${out.vh}   deck top=${out.deck?.top} h=${out.deck?.h}   --turn-deck-h=${out.deckVar}   main bottom=${out.mainBottom}`);
console.log(`  thumb band: y must be within [${Math.round(out.vh * 0.4)}, ${out.vh}]\n`);
const net = out.rows.filter(r => NET.test(r.label));
console.log(`  ${net.length} control(s) matched by the V-6 net:\n`);
for (const r of net) {
  const bad = [];
  if (r.w < 48 || r.h < 48) bad.push(`V-5b ${r.w}x${r.h}`);
  if (r.y < out.vh * 0.4) bad.push(`V-6 above band y=${r.y}`);
  else if (r.y > out.vh) bad.push(`V-6 off screen y=${r.y}`);
  if (!r.reachable) bad.push(`V-6b covered by ${r.cover}`);
  console.log(`   ${r.inDeck ? '\x1b[36mdeck\x1b[0m' : '    '} ${String(r.y).padStart(5)}  ${String(r.w + 'x' + r.h).padStart(8)}  ${r.label.padEnd(48)}${bad.length ? '\x1b[31m' + bad.join(' · ') + '\x1b[0m' : '\x1b[32mok\x1b[0m'}`);
}
const occ = out.rows.filter(r => !r.reachable);
console.log(`\n  ${occ.length} control(s) unreachable at scroll-top (V-6b grades ALL controls, not just the net):`);
for (const r of occ.slice(0, 20)) console.log(`     «${r.label}» y=${r.y} covered by ${r.cover}`);
console.log('');
await ctx.close(); await b.close(); await srv.close();
