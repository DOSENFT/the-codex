// Throwaway: where on the Play tab does "Prepared Spells" still paint?
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = mod.chromium ?? mod.default?.chromium;
const NIX = await loadNix();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([id, seed]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  const s = JSON.parse(seed);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: s.name, class: s.class, subclass: s.subclass, level: s.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [NIX.id, JSON.stringify(NIX)]);
const p = await ctx.newPage();
await p.goto('http://localhost:4193/the-codex/', { waitUntil: 'load' });
await p.waitForTimeout(1800);
console.log(JSON.stringify(await p.evaluate(() => {
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (/Prepared Spells/i.test(t)) {
      const r = el.getBoundingClientRect();
      let path = [], n = el;
      while (n && n !== document.body) { path.unshift(n.tagName.toLowerCase() + (n.getAttribute('aria-label') ? `[${n.getAttribute('aria-label')}]` : '')); n = n.parentElement; }
      hits.push({ t, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], path: path.slice(-8).join(' > ') });
    }
  }
  return { hits, activeTab: document.querySelector('[aria-current="page"]')?.textContent };
}), null, 2));
await b.close();
