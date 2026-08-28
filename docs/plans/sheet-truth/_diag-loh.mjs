// Throwaway: where on the Grimoire does "Lay on Hands" and its counter live?
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4220/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();
const seed = { ...NIX, level: 7, abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 } };
delete seed.paladinResources;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(s => localStorage.setItem('codex-character', s), JSON.stringify(seed));
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('button[aria-label="Switch to prep mode"]').first().click();
await page.waitForTimeout(400);
await page.locator('button[aria-label="Grimoire"]').first().click();
await page.waitForTimeout(700);
const loadout = page.locator('button[aria-label="Open loadout panel"]').first();
console.log('loadout toggle present:', await loadout.count());
if (await loadout.count()) { await loadout.click(); await page.waitForTimeout(600); }

console.log(await page.evaluate(() => {
  const rows = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    const t = (el.textContent || '').trim();
    const r = el.getBoundingClientRect();
    if (!/lay on hands/i.test(t) && !/^\d+\s*\/\s*\d+$/.test(t) && !/^Prepared:/.test(t)) continue;
    rows.push(`${JSON.stringify(t).padEnd(24)} top=${Math.round(r.top)} h=${Math.round(r.height)} <${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 50)}">`);
  }
  return rows.join('\n') || '(nothing matched)';
}));
await browser.close();
