/* One occlusion out of fifteen is not a scroll artifact: prep/Persona has a
   BUTTON — no accessible name, so the audit can only call it «BUTTON» — with a
   `div.flex.gap-2` painted over its centre. Both are inside the same
   `div.glass-card.p-5`, so this is not chrome covering content; it is a card
   covering itself. It reproduces at 390 and at 834, four times on tablet and
   once on phone, which rules out a one-off wrap.

   Two unknowns and no way to guess either: WHICH button (it has no name), and
   WHY the sibling is on top (negative margin? absolute? z-index? a row that
   overflows its own box?). So print the full lineage of both, both rects, and
   every box in between with its position/z-index/margin/transform. */
import { chromium, serveDist, DIST, PHONE, TABLET, importFile, settle, goScreen, SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4301);
const b = await chromium.launch();

const PROBE = `(() => {
  const path = e => { const out = [];
    for (let n = e, i = 0; n && i < 6 && n !== document.body; n = n.parentElement, i++)
      out.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\\s+/).slice(0,3).join('.') : ''));
    return out.join(' < '); };
  const box = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { rect: [r.left, r.top, r.width, r.height].map(Math.round).join(','),
             pos: s.position, z: s.zIndex, mt: s.marginTop, mb: s.marginBottom,
             tf: s.transform === 'none' ? '-' : s.transform, ov: s.overflow }; };

  const out = [];
  for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
    const top = document.elementFromPoint(cx, cy);
    const covered = top && top !== el && !el.contains(top);
    if (!covered && name) continue;              // fine and named — nothing to say
    out.push({
      name: name || '(NO ACCESSIBLE NAME)',
      html: el.outerHTML.replace(/\\s+/g, ' ').slice(0, 160),
      self: { path: path(el), ...box(el) },
      cover: covered ? { path: path(top), ...box(top) } : null,
      stack: covered ? document.elementsFromPoint(cx, cy).slice(0, 5).map(n =>
        n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\\s+/).slice(0,2).join('.') : '')) : null,
    });
  }
  return out; })()`;

for (const [vp, label] of [[PHONE, 'PHONE 390'], [TABLET, 'TABLET 834']]) {
  console.log(`\n████ ${label} ████`);
  const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: vp });
  await importFile(page, realCopy('full'));
  const s = SCREENS.find(x => x.id === 'prep/Persona');
  await goScreen(page, s);
  await settle(page);
  const hits = await page.evaluate(PROBE);
  for (const h of hits) {
    console.log(`\n── ${h.name}`);
    console.log(`   ${h.html}`);
    console.log(`   self  ${h.self.path}`);
    console.log(`         rect=${h.self.rect} pos=${h.self.pos} z=${h.self.z} tf=${h.self.tf}`);
    if (h.cover) {
      console.log(`   cover ${h.cover.path}`);
      console.log(`         rect=${h.cover.rect} pos=${h.cover.pos} z=${h.cover.z} mt=${h.cover.mt} mb=${h.cover.mb} tf=${h.cover.tf}`);
      console.log(`   stack ${h.stack.join(' | ')}`);
    } else {
      console.log(`   (not covered — listed for the missing name only)`);
    }
  }
  if (!hits.length) console.log('   nothing');
  await ctx.close();
}

await b.close(); await srv.close();
console.log('');
