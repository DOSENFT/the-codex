import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const NIX = await loadNix();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1024, height: 1366 } });
await ctx.addInitScript(([id, seed]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-sw-off', '1');
}, [NIX.id, JSON.stringify(NIX)]);
const p = await ctx.newPage();
await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Switch to prep mode' }).click();
await p.getByRole('tab', { name: 'Character' }).click();
await p.waitForTimeout(500);
const dots = p.getByRole('button', { name: /Tap to change\.$/ });
const g = await dots.evaluateAll(els => els.slice(0,3).map(e => {
  const r = e.getBoundingClientRect(); const a = getComputedStyle(e,'::after');
  return { top:+r.top.toFixed(1), bot:+r.bottom.toFixed(1), after:a.height };
}));
console.log('dot geometry:', JSON.stringify(g));
console.log('pitch:', ((g[1].top+g[1].bot)/2 - (g[0].top+g[0].bot)/2).toFixed(1));
// mode toggle
const mt = await p.getByRole('button', { name: 'Switch to prep mode' }).first().boundingBox();
console.log('mode toggle box:', JSON.stringify(mt));
// h1/h2 audit
const h = await p.evaluate(() => {
  const fam = el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g,'').trim();
  return [...document.querySelectorAll('h1,h2')].map(e => ({ tag:e.tagName, cls:(e.className||'').slice(0,40), fam:fam(e), txt:(e.textContent||'').trim().slice(0,20) }));
});
console.log('h1/h2 on this screen:', JSON.stringify(h, null, 1).slice(0, 900));
await b.close();
