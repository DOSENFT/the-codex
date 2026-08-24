/* SHOTS for A-22 — the two surfaces this pass owns, photographed the way they
   are actually held.
   ---------------------------------------------------------------------------
   390x844 at DPR 3, real character loaded through the front door, every
   Character section open, all three Academy segments visited. Two frames per
   surface: `-top` is what a tired person sees before they move a thumb, and
   `-full` is the whole column so a change in rhythm further down cannot hide.

     node shots-a22.mjs --tag before
     node shots-a22.mjs --tag after

   The tag goes in the filename, so the pair sits side by side in the folder
   and neither one can be quietly overwritten by the other. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, goScreen, SCREENS, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const TAG = arg('--tag', 'shot');
const PORT = Number(arg('--port', 4323));
const OUT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/plans/codex-v1/_shots-app';
mkdirSync(OUT, { recursive: true });

const srv = await serveDist(DIST, PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

/* Smooth scrolling makes a full-page capture stitch mid-animation. Off for the
   photograph, exactly as in control-a22.mjs — it moves when a pixel is painted,
   never what colour it is. */
const still = () => page.addStyleTag({ content: 'html,body,*{scroll-behavior:auto !important}' });

const shoot = async name => {
  await settle(page);
  const top = `${OUT}/a22-${name}-${TAG}-top.png`;
  const full = `${OUT}/a22-${name}-${TAG}-full.png`;
  await page.screenshot({ path: top });
  await page.screenshot({ path: full, fullPage: true });
  console.log(`  ${top}\n  ${full}`);
};

console.log(`\nA-22 shots — 390x844 DPR3 — tag "${TAG}"\n`);

await goScreen(page, SCREENS.find(s => s.id === 'prep/Character'));
await still();
for (let pass = 0; pass < 4; pass++) {
  const clicked = await page.evaluate(() => {
    let n = 0;
    for (const b of document.querySelectorAll('section[aria-label="Character"] > div > button')) {
      if (!String(b.className).includes('min-h-[52px]')) continue;
      if (b.parentElement.children.length < 2) { b.click(); n++; }
    }
    return n;
  });
  await page.waitForTimeout(350);
  if (!clicked) break;
}
await page.evaluate(() => { document.documentElement.scrollTop = 0; });
await shoot('prep-character');

await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
await still();
for (const seg of ['Training', 'Quizzes', 'Accent']) {
  const btn = page.locator('section[aria-label="Academy"] > div > button', { hasText: new RegExp('^' + seg) }).first();
  if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(500); }
  await page.evaluate(() => { document.documentElement.scrollTop = 0; });
  await shoot(`prep-academy-${seg.toLowerCase()}`);
}

if (page.errs.length) {
  console.log(`\n  \x1b[31m${page.errs.length} console/page error(s) while shooting:\x1b[0m`);
  for (const e of page.errs.slice(0, 10)) console.log('     ' + e);
}
console.log('');
await ctx.close(); await browser.close(); await srv.close();
process.exit(page.errs.length ? 1 : 0);
