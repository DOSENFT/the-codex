// Throwaway probe: WHAT is painted on top of the reactions band, and how much of
// it does it cover? Both screenshots show a floating control over the third row.
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
const MARCUS = { ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 }, tempHP: 0,
  proficiencyBonus: 3, spellSaveDC: 14, spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: [{ name: 'Sentinel', description: 'x', isHomebrew: false, effects: [] },
          { name: 'Interception', description: 'x', isHomebrew: false, effects: [] }],
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true,
              damageDice: '1d8', damageType: 'Slashing', properties: [], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 } };
const COMBAT = JSON.stringify({ inCombat: true, round: 3, yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, s, c]) => {
  if (!localStorage.getItem('codex-character-' + id)) localStorage.setItem('codex-character-' + id, s);
  if (!localStorage.getItem('codex-combat-' + id)) localStorage.setItem('codex-combat-' + id, c);
  localStorage.setItem('codex-active-id', id);
  const seed = JSON.parse(s);
  if (!localStorage.getItem('codex-roster')) localStorage.setItem('codex-roster', JSON.stringify([{ id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [NIX.id, JSON.stringify(MARCUS), COMBAT]);
const page = await ctx.newPage();
await page.goto('http://localhost:4193/the-codex/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

console.log(JSON.stringify(await page.evaluate(() => {
  const band = document.querySelector('section[aria-label="Your reactions"]');
  band.scrollIntoView({ block: 'start' });
  const rows = [...band.querySelectorAll('li')];
  // Hit-test the CENTRE of each row's body text. If the topmost element there is
  // not inside the row, something is painted over the words.
  return rows.map((li) => {
    const p = [...li.querySelectorAll('p')].pop() ?? li;
    const r = p.getBoundingClientRect();
    const probes = [0.25, 0.5, 0.75, 0.9].map((f) => {
      const x = r.left + r.width * f, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return { f, covered: !(top && li.contains(top)),
               by: top && !li.contains(top) ? (top.tagName + '.' + (top.className || '').toString().split(' ').slice(0, 3).join('.')) : null };
    });
    return { row: (li.querySelector('button')?.getAttribute('aria-label') || '').replace(/ — details$/, ''),
             text: (p.textContent || '').slice(0, 40), top: Math.round(r.top), probes };
  });
}, null), null, 1));
await browser.close();
