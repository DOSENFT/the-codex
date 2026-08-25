/* V-6 reported exactly one offender — «Apply healing» at y=272 — and did not
   say which of the seven screens it was on. There are three components in the
   source that render an "Apply healing" control. Guessing which one is a
   rumour; this asks. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen,
         SCREENS, freshCtx, audit } from './rig.mjs';
import { realCopy, THRESH } from './families.mjs';

const srv = await serveDist(DIST, 4308);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));

const TURN = /heal|expend|restore|slot|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i;

for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const a = await audit(page);
  for (const c of a.touch) {
    if (!TURN.test(c.label) || c.clipped) continue;
    const bad = c.y < a.vh * (1 - THRESH.V6_thumb) || c.y > a.vh;
    if (!bad) continue;
    console.log(`${s.id}  «${c.label}»  y=${c.y}/${a.vh}  ${c.hitW}×${c.hitH}`);
    // Which component is it? Walk up and print classes until something names it.
    const lineage = await page.evaluate(([label]) => {
      const el = [...document.querySelectorAll('button,[role="button"],a[href]')]
        .find(e => ((e.getAttribute('aria-label') || e.textContent || '').trim() === label));
      if (!el) return 'NOT FOUND';
      const out = [];
      for (let n = el, i = 0; n && i < 9 && n !== document.body; n = n.parentElement, i++)
        out.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 3).join('.') : ''));
      return out.join('\n        < ');
    }, [c.label]);
    console.log(`        ${lineage}`);
  }
}

await ctx.close(); await b.close(); await srv.close();
console.log('done');
