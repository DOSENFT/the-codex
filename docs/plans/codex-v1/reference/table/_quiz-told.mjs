/* Throwaway: when Generate Question fails, what is the player actually told?
   The probe found no [role="alert"]. That is not the same as "nothing is
   shown" — an error rendered as an ordinary <div> is still visible, just not
   announced. This diffs the visible text across the press. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4297);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
await settle(page);
await page.locator('button,[role="tab"]').filter({ hasText: /^\s*Quizzes/i }).first().click();
await settle(page);

const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
const before = await text();
await page.getByRole('button', { name: /^Generate Question$/i }).first().click();
await page.waitForTimeout(3000);
const after = await text();

const bw = new Set(before.split(' '));
const added = after.split(' ').filter(w => !bw.has(w));
console.log('\nADDED after pressing Generate Question:\n  ', JSON.stringify(added.join(' ')));
console.log('\nany element whose text mentions failure:');
console.log(await page.evaluate(() => [...document.querySelectorAll('*')]
  .filter(e => !e.children.length && /error|fail|unable|could not|couldn|try again|check your/i.test(e.textContent || ''))
  .map(e => e.tagName + ': ' + e.textContent.trim().slice(0, 120))));
console.log('\nspinner still up?', await page.evaluate(() => !!document.querySelector('[class*="animate-spin"]')));
console.log('');
await ctx.close(); await b.close(); await srv.close();
