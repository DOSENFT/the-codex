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
const NIX = await loadNix();
const BEFORE = { ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 }, tempHP: 0, tempHPSource: null,
  proficiencyBonus: 3, spellSaveDC: 15, spellAttackBonus: 7,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 18 }, skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.addInitScript(s => localStorage.setItem('codex-character', s), JSON.stringify(BEFORE));
const p = await ctx.newPage();
await p.goto('http://localhost:4218/the-codex/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.getByRole('button', { name: 'Switch to prep mode' }).click();
await p.waitForTimeout(900);

const info = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '') === 'Character');
  return btns.map(b => {
    const r = b.getBoundingClientRect();
    let blocked = null, n = b;
    while (n) {
      if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') { blocked = 'aria-hidden on ' + n.tagName; break; }
      if (n.hasAttribute && n.hasAttribute('inert')) { blocked = 'inert on ' + n.tagName; break; }
      n = n.parentElement;
    }
    const cs = getComputedStyle(b);
    return { rect: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], blocked, disabled: b.disabled,
             display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
  });
});
console.log('CHARACTER BUTTONS:', JSON.stringify(info, null, 1));
console.log('getByRole count :', await p.getByRole('button', { name: 'Character', exact: true }).count());
console.log('attr sel count  :', await p.locator('button[aria-label="Character"]').count());
console.log('dialogs open    :', await p.locator('[role="dialog"]').count());
console.log('dialog attrs    :', JSON.stringify(await p.evaluate(() =>
  [...document.querySelectorAll('[role="dialog"]')].map(d => ({
    modal: d.getAttribute('aria-modal'), hidden: d.getAttribute('aria-hidden'),
    label: d.getAttribute('aria-label'), rect: (r => [r.x | 0, r.y | 0, r.width | 0, r.height | 0])(d.getBoundingClientRect()),
  })))));
console.log('prep-mode btn via role:', await p.getByRole('button', { name: 'Switch to prep mode' }).count());
await b.close();
