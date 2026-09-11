// scratch — why does the veiled screenshot show the fight?
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
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([id, seed]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-sw-off', '1');
}, [NIX.id, JSON.stringify(NIX)]);
const p = await ctx.newPage();
await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Veil this scene' }).click();
await p.waitForTimeout(600);
console.log(await p.evaluate(() => {
  const el = document.querySelector('.veil-scene');
  if (!el) return 'NO .veil-scene IN THE DOM';
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    parent: el.parentElement?.tagName + '#' + (el.parentElement?.id || ''),
    position: cs.position, zIndex: cs.zIndex, background: cs.backgroundColor,
    opacity: cs.opacity, display: cs.display,
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    dbg: getComputedStyle(document.documentElement).getPropertyValue('--d-bg'),
    animation: cs.animationName + ' ' + cs.animationDuration,
    topAtCentre: document.elementFromPoint(195, 400)?.className,
  };
}));
await p.screenshot({ path: 'docs/plans/codex-v1/reference/_probe12.png' });
await b.close();
