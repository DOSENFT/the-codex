// IV recon — what controls exist, so my own scripts do not borrow the builder's.
import { chromium, serveDist, DIST, PHONE, watch, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4291);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p = await ctx.newPage(); watch(p);
await p.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p, realCopy('full'));

const list = () => p.evaluate(() => [...document.querySelectorAll('button,[role="tab"],input,textarea,select')]
  .filter(e => e.getBoundingClientRect().width > 0)
  .map(e => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} :: ${(e.getAttribute('aria-label') || e.value || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)}`));

console.log('--- play/Combat ---'); console.log((await list()).join('\n'));

// prep mode
const toPrep = p.getByRole('button', { name: /Switch to prep mode/i });
if (await toPrep.count()) await toPrep.click();
await p.waitForTimeout(600);
await p.getByRole('tab', { name: 'Character', exact: true }).first().click().catch(() => {});
await p.waitForTimeout(600);
console.log('\n--- prep/Character ---'); console.log((await list()).join('\n'));

const k = await p.evaluate(() => Object.keys(localStorage));
console.log('\n--- localStorage keys ---\n' + k.join('\n'));

await b.close(); await srv.close();
