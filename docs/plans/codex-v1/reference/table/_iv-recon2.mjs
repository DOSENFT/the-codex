import { chromium, serveDist, DIST, PHONE, watch, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';
const srv = await serveDist(DIST, 4293);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p = await ctx.newPage(); watch(p);
await p.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p, realCopy('full'));
const list = () => p.evaluate(() => [...document.querySelectorAll('button,[role="tab"],input,textarea')]
  .filter(e => e.getBoundingClientRect().width > 0)
  .map(e => `${e.tagName.toLowerCase()} :: ${(e.getAttribute('aria-label') || e.placeholder || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`));
await p.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
await p.waitForTimeout(900);
console.log('--- play/Roleplay ---\n' + (await list()).join('\n'));
console.log('\n--- campaignId on disk: ' + await p.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  return JSON.stringify(JSON.parse(localStorage.getItem(k)).campaignId);
}));
await p.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
await p.waitForTimeout(1200);
console.log('\n--- Settings ---\n' + (await list()).join('\n'));
await b.close(); await srv.close();
