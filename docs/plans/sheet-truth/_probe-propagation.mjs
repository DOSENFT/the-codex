// DOES THE PREP TAB REACH COMBAT? — a measurement, not an inference.
//
//   npx vite preview --port 4210 --host
//   node docs/plans/sheet-truth/_probe-propagation.mjs [url]
//
// Marcus reports that in combat his spell definitions claim Charisma 18 when it
// is 16, and concludes the Prep tab is "not at all connected" to combat.
//
// Reading the code says otherwise: App.tsx holds ONE useCharacter() and passes
// the same Character to every page including TurnLive. But this app's own rule
// (finding Q) is that reading the model is not reading the screen, and I am
// about to tell him his diagnosis of the mechanism is wrong — so the claim had
// better be measured, not argued.
//
// THE PROBE: seed CHA 16, read what combat SAYS. Raise CHA to 18 through the
// Prep UI exactly as he would. Come back and read combat again.
//
//   If the COMPUTED numbers move .... the wiring is live, and the 18s he sees
//                                     are frozen canon prose, not stale state.
//   If they do NOT move ............. there is a real disconnect and it is a
//                                     far bigger fix than rewriting prose.
//
// Either answer is useful. The point is to find out which one is true.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); }
    catch { return []; }
  })(),
];
let chromium;
try {
  const entry = req.resolve('playwright', { paths: searchPaths });
  const mod = await import(pathToFileURL(entry).href);
  chromium = mod.chromium ?? mod.default?.chromium;
} catch {
  console.error('playwright not found.');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4210/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();

const MARCUS = {
  ...NIX,
  level: 7,
  armorClass: 18,
  hitPoints: { max: 67, current: 67 },
  tempHP: 0,
  tempHPSource: null,
  proficiencyBonus: 3,
  /* Seeded DELIBERATELY as the correct pair for CHA 16: DC 8+3+3 = 14,
     attack 3+3 = +6. If these are stored fields rather than derived ones, that
     is itself a finding — see the STORED-OR-DERIVED question below. */
  spellSaveDC: 14,
  spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: {
    layOnHands: { max: 35, current: 35 },
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  },
};

const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
});
await ctx.addInitScript(([id, seedJson, combat]) => {
  localStorage.setItem('codex-character', seedJson);
  localStorage.setItem(`codex-combat-${id}`, combat);
}, [MARCUS.id, JSON.stringify(MARCUS), IN_COMBAT]);

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });

/** Everything the app currently believes about the character, from ITS OWN
 *  storage — not from my seed object, which would only prove I can echo myself. */
const stored = () => page.evaluate(() => {
  const raw = localStorage.getItem('codex-character');
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { CHA: c.abilityScores?.CHA, dc: c.spellSaveDC, atk: c.spellAttackBonus, level: c.level };
});

/** Numbers as PAINTED anywhere on the current screen. */
const painted = () => page.evaluate(() => {
  const t = document.body.innerText;
  const grab = (re) => { const m = t.match(re); return m ? m[0] : null; };
  return {
    saveDC: grab(/(?:Save\s*DC|Spell\s*Save\s*DC|DC)\s*:?\s*\d+/i),
    anyDC15: /\bDC\s*15\b/.test(t),
    anyDC14: /\bDC\s*14\b/.test(t),
    cha18Prose: /Charisma\s*18/i.test(t),
    len: t.length,
  };
});

const line = (s) => console.log(s);
line('=== BASE STATE (seeded CHA 16) ===');
line(`stored : ${JSON.stringify(await stored())}`);
line(`play   : ${JSON.stringify(await painted())}`);

/* Go find the Prep/Character surface and raise CHA to 18 the way Marcus would.
   Selectors are discovered, not assumed — this app has been renamed repeatedly
   and a hardcoded selector that misses would look exactly like a disconnect. */
const navText = await page.evaluate(() =>
  [...document.querySelectorAll('nav button, nav a, [role="tab"], header button')]
    .map((e) => e.innerText.trim()).filter(Boolean));
line(`\n=== NAV TARGETS ===\n${JSON.stringify(navText)}`);

const tryClick = async (name) => {
  const el = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
  if (await el.count().catch(() => 0)) { await el.click().catch(() => {}); return true; }
  return false;
};
for (const t of ['Prep', 'Character', 'Sheet']) {
  if (await tryClick(t)) { line(`clicked: ${t}`); break; }
}
await page.waitForTimeout(500);

/* The CHA control, whatever shape it wears. */
const chaProbe = await page.evaluate(() => {
  const hits = [];
  for (const el of document.querySelectorAll('button, input, [role="button"]')) {
    const s = `${el.getAttribute('aria-label') ?? ''} ${el.innerText ?? ''} ${el.value ?? ''}`;
    if (/\bCHA\b|Charisma/i.test(s)) {
      hits.push({ tag: el.tagName, label: el.getAttribute('aria-label'), text: (el.innerText || '').slice(0, 40) });
    }
  }
  return hits.slice(0, 8);
});
line(`\n=== CHA CONTROLS ON PREP ===\n${JSON.stringify(chaProbe, null, 1)}`);

/* Edit through the STORE the same way the UI does, then re-render, if the UI
   path is not reachable headlessly. This still tests propagation: it changes
   the single source and asks whether combat notices. It does NOT prove the
   Prep BUTTON works, and that limit is stated rather than hidden. */
await page.evaluate(() => {
  const raw = localStorage.getItem('codex-character');
  const c = JSON.parse(raw);
  c.abilityScores.CHA = 18;
  localStorage.setItem('codex-character', JSON.stringify(c));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

line('\n=== AFTER RAISING CHA TO 18 IN STORAGE ===');
line(`stored : ${JSON.stringify(await stored())}`);
line(`screen : ${JSON.stringify(await painted())}`);

await browser.close();
