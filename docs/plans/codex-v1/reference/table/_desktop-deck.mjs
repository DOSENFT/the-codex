/* Does the desktop layout still have the three spend surfaces?
   The deck is `lg:hidden` and the components it replaced were deleted from
   CombatHelper. If that reads the way it looks, then at >=1024px a Paladin has
   no action economy, no spell slots and no Lay on Hands at all — a feature
   deleted, not a feature restyled. Reading the class is not proof; open it. */
import { chromium, serveDist, DIST, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4298);
const b = await chromium.launch();

for (const [label, viewport] of [['phone 390x844', { width: 390, height: 844 }],
                                 ['desktop 1280x800', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, realCopy('full'));
  await goScreen(page, SCREENS.find(s => s.id === 'play-combat') ?? SCREENS[0]);
  await settle(page);

  const r = await page.evaluate(() => {
    const visible = el => {
      const s = getComputedStyle(el), rc = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && rc.width > 1 && rc.height > 1;
    };
    const hit = re => [...document.querySelectorAll('button,[role="button"],input')]
      .filter(e => visible(e) && re.test((e.textContent || '') + ' ' + (e.getAttribute('aria-label') || '')));
    const name = e => ((e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ')).slice(0, 40);
    return {
      economy: hit(/\b(Action|Bonus|Reaction|Move)\b/i).map(name),
      slots: hit(/slot|expend|1st|2nd|3rd/i).map(name),
      loh: hit(/lay on hands|heal|channel divinity/i).map(name),
    };
  });
  console.log(`  ${label}`);
  for (const k of ['economy', 'slots', 'loh'])
    console.log(`    ${k.padEnd(8)} ${r[k].length}  ${JSON.stringify(r[k].slice(0, 8))}`);
  await ctx.close();
}
console.log('');
await b.close(); await srv.close();
