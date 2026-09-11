// Reconnaissance for the phase-close prover. Reads the Play tab and reports the
// selectors that actually exist, so prove-phase1.mjs is written against the DOM
// rather than against my memory of it. Throwaway.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, writeFileSync } from 'node:fs';
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

const BASE = 'http://localhost:4193/the-codex/';
const NIX = await loadNix();
const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3, spellSaveDC: 14, spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true,
    damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, seedJson, combat]) => {
  localStorage.setItem('codex-character-' + id, seedJson);
  localStorage.setItem('codex-combat-' + id, combat);
  localStorage.setItem('codex-active-id', id);
  const seed = JSON.parse(seedJson);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, [NIX.id, JSON.stringify(MARCUS), IN_COMBAT]);

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);

const recon = await page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    tabs: [...document.querySelectorAll('nav button, [role="tab"]')].map((b) => txt(b)).slice(0, 12),
    sections: [...document.querySelectorAll('section[aria-label]')].map((s) => ({ label: s.getAttribute('aria-label'), box: box(s) })),
    expandables: [...document.querySelectorAll('button[aria-expanded]')].map((b) => ({
      label: b.getAttribute('aria-label'), text: txt(b).slice(0, 60), expanded: b.getAttribute('aria-expanded'), box: box(b),
    })),
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => ({ label: d.getAttribute('aria-label'), box: box(d) })),
    // The five vitals boxes, found by their word.
    vitals: ['Save DC', 'AC', 'Init', 'Prof', 'Sp Atk'].map((word) => {
      const span = [...document.querySelectorAll('span')].find((s) => txt(s) === word);
      const cell = span?.parentElement ?? null;
      return { word, found: Boolean(span), value: txt(cell?.firstElementChild), box: cell ? box(cell) : null };
    }),
    mainBox: document.querySelector('main') ? box(document.querySelector('main')) : null,
    scrollH: document.documentElement.scrollHeight,
    optionRows: [...(document.querySelector('section[aria-label="Your turn options"]')?.querySelectorAll('li') || [])].map((li) => ({
      text: txt(li).slice(0, 90), box: box(li),
      detailBtn: li.querySelector('button[aria-label$="— details"]')?.getAttribute('aria-label') ?? null,
    })),
    reactionRows: [...(document.querySelector('section[aria-label="Your reactions"]')?.querySelectorAll('li') || [])].map((li) => ({
      text: txt(li).slice(0, 110), box: box(li),
    })),
    deckText: txt(document.querySelector('section[aria-label="Turn deck"]')).slice(0, 200),
  };
});

console.log(JSON.stringify(recon, null, 2));
console.log('ERRORS', errors);
writeFileSync('docs/plans/table-truth/_recon-phase1.json', JSON.stringify({ recon, errors }, null, 2));
await browser.close();
