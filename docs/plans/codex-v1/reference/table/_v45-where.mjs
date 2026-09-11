/* Where exactly are the V-4 and V-5 offenders? The harness names them by their
   text, which is not enough to find them in source — «*Stands slightly in front
   of allies…*» appears nowhere in the repo because it is HIS data. So ask the
   page for the DOM path and the classes instead of guessing from a grep. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4296);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));

for (const id of ['play/Combat', 'play/Roleplay']) {
  await goScreen(page, SCREENS.find(s => s.id === id));
  await settle(page);
  const r = await page.evaluate(() => {
    const path = el => {
      const bits = [];
      for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement)
        bits.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string'
          ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.') : ''));
      return bits.join(' < ');
    };
    const small = [];
    for (const el of document.querySelectorAll('button,input,[role="button"]')) {
      const c = el.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) continue;
      if (c.height < 44) small.push({ t: (el.textContent || '').trim().slice(0, 34), w: Math.round(c.width), h: Math.round(c.height), path: path(el) });
    }
    const cinzel = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = (n.textContent || '').trim();
      if (!t) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (!/cinzel/i.test(cs.fontFamily)) continue;
      const px = parseFloat(cs.fontSize);
      if (px < 20) cinzel.push({ t: t.slice(0, 34), px, path: path(el) });
    }
    return { small, cinzel };
  });
  console.log(`\n══ ${id} ══`);
  console.log(' V-5 controls under 44px:');
  for (const s of r.small) console.log(`   ${s.w}×${s.h}  «${s.t}»\n      ${s.path}`);
  if (!r.small.length) console.log('   none');
  console.log(' V-4 Cinzel under 20px:');
  for (const c of r.cinzel) console.log(`   ${c.px}px  «${c.t}»\n      ${c.path}`);
  if (!r.cinzel.length) console.log('   none');
}

await ctx.close(); await b.close(); await srv.close();
console.log('');
