/* shots — every screen, at the two sizes this app is actually held at, with his
   real full export loaded. § 10 of TABLE-READY.md is a stranger's chance to fail
   the visual work without running anything, so these are the shipped state and
   nothing is staged: real data, default scroll position, no hovering, no props.

   Phone is 390×844 DPR3 (iPhone 14/15 class — the one hand, the dim room).
   Tablet is 834×1112 DPR2 (iPad — propped on the table edge). Both are the
   viewports the V family grades against, so a screenshot here and a V failure
   there are describing the same pixels. */
import { chromium, freshCtx, importFile, goScreen, SCREENS, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/plans/codex-v1/_shots-app';
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { tag: 'phone',  viewport: { width: 390, height: 844 },  dpr: 3 },
  { tag: 'tablet', viewport: { width: 834, height: 1112 }, dpr: 2 },
];

const b = await chromium.launch();
for (const size of SIZES) {
  const { ctx, page } = await freshCtx(b, { viewport: size.viewport, dpr: size.dpr });
  await importFile(page, realCopy('full'));
  for (const s of SCREENS) {
    await goScreen(page, s);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    const name = `${size.tag}-${s.id.replace('/', '-')}.png`;
    // Viewport-only, not fullPage: the criterion is what he can see at once.
    await page.screenshot({ path: `${OUT}/${name}` });
    console.log(`${OUT}/${name}`);
  }
  await ctx.close();
}
await b.close();
