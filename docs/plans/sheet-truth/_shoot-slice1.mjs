// Slice 1 proof shot: the SAME screen, from two builds.
//
//   node docs/plans/sheet-truth/_shoot-slice1.mjs <beforeUrl> <afterUrl>
//
// Both are real builds of the app, not mockups. The only difference between
// them is `loadCharacter` calling `resolveCharacter`. Seeded identically: CHA
// 16 sitting beside the stored CHA-18 pair, which is exactly what an edit in
// Prep leaves behind today.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3,
  spellSaveDC: 15, spellAttackBonus: 7,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [label, url] of [['before', process.argv[2]], ['after', process.argv[3]]]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, reducedMotion: 'reduce',
  });
  await ctx.addInitScript(([id, seed, combat]) => {
    localStorage.setItem('codex-character', seed);
    localStorage.setItem(`codex-combat-${id}`, combat);
  }, [MARCUS.id, JSON.stringify(MARCUS), IN_COMBAT]);
  const page = await ctx.newPage();
  await page.goto(url.replace(/\/?$/, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // The vitals card plus whatever sits directly under it — which is where the
  // "your sheet and the rules disagree" banner lives. Located by SHAPE (the
  // element whose only text is the label), never by a class name.
  const box = await page.evaluate(() => {
    const label = [...document.querySelectorAll('*')].find(
      e => e.children.length === 0 && /^Save DC$/i.test((e.textContent || '').trim()));
    const card = label?.closest('div')?.parentElement?.parentElement;
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box) throw new Error(`${label}: could not locate the vitals card`);

  await page.screenshot({
    path: `${OUT}slice1-vitals-${label}.png`,
    clip: { x: Math.max(0, box.x - 6), y: Math.max(0, box.y - 6), width: Math.min(390, box.width + 12), height: box.height + 12 },
  });
  await page.screenshot({ path: `${OUT}slice1-play-${label}.png`, fullPage: false });
  console.log(`${label}: vitals card ${Math.round(box.width)}x${Math.round(box.height)} at y=${Math.round(box.y)}`);
  await ctx.close();
}

await browser.close();
