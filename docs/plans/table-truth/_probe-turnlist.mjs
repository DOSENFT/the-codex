// Throwaway: why does "Your turn options" paint no tappable rows?
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })(),
];
const entry = req.resolve('playwright', { paths: searchPaths });
const mod = await import(pathToFileURL(entry).href);
const chromium = mod.chromium ?? mod.default?.chromium;

const NIX = await loadNix();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([id, seed, combat]) => {
  localStorage.setItem('codex-character-' + id, seed);
  if (combat) localStorage.setItem('codex-combat-' + id, combat);
  localStorage.setItem('codex-active-id', id);
  const s = JSON.parse(seed);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: s.name, class: s.class, subclass: s.subclass, level: s.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [NIX.id,
    JSON.stringify({ ...NIX, paladinResources: { layOnHands: { max: 40, current: 40 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 } }),
    process.argv[2] === 'nocombat' ? null : JSON.stringify({ inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null, conditions: [] })]);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('http://localhost:4193/the-codex/', { waitUntil: 'load' });
await p.waitForTimeout(2000);
console.log(JSON.stringify(await p.evaluate(() => {
  const s = document.querySelector('section[aria-label="Your turn options"]');
  return {
    exists: !!s,
    text: (s?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400),
    liCount: s?.querySelectorAll('li').length ?? -1,
    buttonsInside: [...(s?.querySelectorAll('button') ?? [])].map((x) => x.getAttribute('aria-label')),
    allDetailButtons: [...document.querySelectorAll('button[aria-label$="details"]')].map((x) => x.getAttribute('aria-label')),
    sections: [...document.querySelectorAll('section[aria-label]')].map((x) => x.getAttribute('aria-label')),
  };
}), null, 1));
await b.close();
