/* throwaway: where is a SECOND import startable once a character is loaded? */
import { chromium, LOCAL, PHONE, importFile, SCREENS, goScreen } from './rig.mjs';
import { realCopy } from './families.mjs';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

const labels = async () => page.evaluate(() =>
  [...document.querySelectorAll('button')].map(x => (x.innerText || x.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean));

for (const s of SCREENS) {
  await goScreen(page, s);
  const L = await labels();
  const hit = L.filter(x => /import/i.test(x));
  console.log(s.id.padEnd(16), hit.length ? JSON.stringify(hit) : '—');
}
// and the settings surface, if there is a control to open it
const all = await labels();
console.log('\nall buttons on last screen:', JSON.stringify(all));
await ctx.close(); await b.close();
