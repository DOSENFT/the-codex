/* Throwaway: does R-9's second import ever actually run?
   The grader reads
       const again = page.getByRole('button', { name: /Import Character/i });
       if (await again.count()) { await importFile(page, realCopy('full')); }
   — so if that locator finds nothing, the second import is skipped, n2 === n1,
   and `n2 <= n1 + 1` passes. A grader that passes by not performing its own
   scenario is the failure this project is named for. This asks whether the
   locator resolves after a character is loaded, and finds what the real
   re-import control is called. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4298);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });

const count = () => page.evaluate(() =>
  Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length);

console.log('\n\x1b[1mR-9 — does the second import happen at all?\x1b[0m\n');
console.log('  empty state, /Import Character/i matches:',
  await page.getByRole('button', { name: /Import Character/i }).count());

await importFile(page, realCopy('full'));
await settle(page);
console.log('  characters after first import:', await count());

await goScreen(page, SCREENS.find(s => s.id === 'prep/Character'));
await settle(page);
console.log('  on prep/Character, /Import Character/i matches:',
  await page.getByRole('button', { name: /Import Character/i }).count(),
  '  <- if 0, R-9 has never run its own scenario');

/* Where IS the re-import control? */
for (const where of ['prep/Character', 'settings']) {
  if (where === 'settings') {
    await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  const names = await page.evaluate(() => [...document.querySelectorAll('button,label,[role="button"]')]
    .map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' '))
    .filter(t => /import|load|upload|file|restore/i.test(t)));
  console.log(`  controls mentioning import on ${where}:`, JSON.stringify(names));
}
console.log('');
await ctx.close(); await b.close(); await srv.close();
