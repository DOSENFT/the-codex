// Shoot and audit the REAL APP — not a mockup. Same guardrails as
// shoot-mockups.mjs, pointed at a running build, so direction D is measured
// where it actually has to hold up.
//
//   npm run build && npm run preview        (in another shell)
//   node docs/plans/codex-v1/reference/shoot-app.mjs [baseUrl]
//
// Playwright stays a reference tool resolved from the npx cache, never a trunk
// dependency — the app must build on a machine that has never heard of it.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

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
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4173/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/codex-v1/_shots-app';
mkdirSync(OUT, { recursive: true });

const PHONE = { name: 'phone', width: 390, height: 844, dsf: 3 };
const IPAD = { name: 'ipad-landscape', width: 1366, height: 1024, dsf: 2 };

// A minimal Nix so the app boots past character setup. loadCharacter() spreads
// defaults over whatever it finds (character.ts:382-413), so this is enough —
// and it is written to a THROWAWAY browser profile, never to Marcus's device.
// NOTE: `spells`, `features` and `spellSlots` are NOT defaulted by
// loadCharacter(), and getPreparedSpells() calls character.spells.filter() at
// boot — so a stored character missing them white-screens the app above every
// error boundary. Logged as a trunk fix; the fixture supplies them meanwhile.
const SEED_ID = 'nix-shoot-fixture';
const SEED = {
  id: SEED_ID,
  name: 'Nix',
  race: 'Changeling',
  class: 'Paladin',
  subclass: 'Oath of the Hearth',
  level: 8,
  spellcastingAbility: 'Charisma',
  spellSaveDC: 16,
  spellAttackBonus: 8,
  proficiencyBonus: 3,
  armorClass: 19,
  hitPoints: { max: 76, current: 41 },
  conditions: [],
  deathSaves: { successes: 0, failures: 0 },
  tempHP: 0,
  spells: [],
  spellSlots: { 1: { max: 4, current: 3 }, 2: { max: 3, current: 2 } },
  canPrepareSpells: true,
  maxPreparedSpells: 8,
  features: [],
  paladinResources: {
    layOnHands: { max: 40, current: 15 },
    channelDivinity: { max: 2, current: 1 },
    auraRange: 10,
  },
  abilityScores: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 18 },
  skillProficiencies: [],
  skillExpertise: [],
  savingThrowProficiencies: ['WIS', 'CHA'],
  weapons: [],
  gender: '',
  pronouns: 'he/him',
  equipment: [],
  supplies: [],
  feats: [],
  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
};

// A deliberately threadbare stored character. This is the regression guard for
// the boot crash: before loadCharacter() defaulted spells/features/spellSlots,
// this seed white-screened the app above every error boundary.
const THIN = { id: SEED_ID, name: 'Thin', class: 'Paladin', level: 1 };

const TARGETS = [
  { path: '?d=1', label: 'turn-d--phone', vp: PHONE },
  { path: '?d=1', label: 'turn-d--ipad', vp: IPAD },
  { path: '', label: 'v0.9-combat--phone', vp: PHONE },
  { path: '', label: 'v0.9-combat--ipad', vp: IPAD },
  { path: '', label: 'thin-character-boots--phone', vp: PHONE, seed: THIN },
];

const browser = await chromium.launch();
const report = [];

for (const t of TARGETS) {
  const ctx = await browser.newContext({
    viewport: { width: t.vp.width, height: t.vp.height },
    deviceScaleFactor: t.vp.dsf,
    hasTouch: true,
  });
  await ctx.addInitScript(
    ([id, seed]) => {
      localStorage.setItem('codex-character-' + id, seed);
      localStorage.setItem('codex-active-id', id);
      localStorage.setItem(
        'codex-roster',
        JSON.stringify([
          { id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 8,
            updatedAt: '2026-08-16T00:00:00.000Z' },
        ]),
      );
    },
    [SEED_ID, JSON.stringify(t.seed ?? SEED)],
  );

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + t.path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${t.label}.png` });

  const audit = await page.evaluate((vpH) => {
    const out = {};
    out.scrollHeight = document.documentElement.scrollHeight;
    out.overflowsViewport = document.documentElement.scrollHeight > vpH + 2;
    out.horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    // Did the app actually boot, or are we auditing an empty root?
    out.rootChildren = document.getElementById('root')?.childElementCount ?? 0;
    out.sawTurnScreen = !!document.querySelector('.dturn');
    out.sawErrorBoundary = !!document.querySelector('[role="alert"]');

    const tappable = [...document.querySelectorAll(
      'button,[role="button"],a,.obj,.act,.face,.eslot,.card,.tap,[data-tap]'
    )];
    const small = [];
    for (const el of tappable) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 48 || r.height < 48) {
        small.push({ cls: el.className || el.tagName,
          text: (el.textContent || '').trim().slice(0, 28),
          w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    out.underMinTouch = small.slice(0, 12);
    out.underMinTouchCount = small.length;

    const cinzelSmall = [], tiny = [];
    for (const el of document.querySelectorAll('*')) {
      const txt = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!txt) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const fam = cs.fontFamily.toLowerCase();
      const sample = el.textContent.trim().slice(0, 24);
      if (fam.includes('cinzel') && size < 20) cinzelSmall.push({ sample, size });
      if (size < 12) tiny.push({ sample, size });
    }
    out.cinzelUnder20 = cinzelSmall.slice(0, 12);
    out.cinzelUnder20Count = cinzelSmall.length;
    out.under12px = tiny.slice(0, 12);
    out.under12pxCount = tiny.length;
    return out;
  }, t.vp.height);

  const png = (await page.screenshot()).toString('base64');
  const ink = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let gold = 0, ember = 0, lit = 0;
    const total = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
      if (max > 70) lit++;
      if (max <= 90 || max - min <= 30) continue;
      if (!(r >= gr && gr >= b)) continue;
      const hue = (gr - b) / (max - min);   // >= 0.45 gold, else ember
      if (hue >= 0.45) gold++; else ember++;
    }
    return {
      goldPctOfLitPixels: +(100 * gold / Math.max(lit, 1)).toFixed(1),
      emberPctOfLitPixels: +(100 * ember / Math.max(lit, 1)).toFixed(1),
      litPctOfScreen: +(100 * lit / total).toFixed(1),
    };
  }, png);

  report.push({ shot: t.label, errors: [...new Set(errors)].slice(0, 5), ...audit, ...ink });
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/_audit.json`, JSON.stringify(report, null, 2));

for (const r of report) {
  console.log(`\n${r.shot}`);
  console.log(`  booted            root children ${r.rootChildren}`
    + `${r.sawTurnScreen ? ' · D turn screen present' : ''}`
    + `${r.sawErrorBoundary ? ' · ERROR BOUNDARY TRIPPED' : ''}`);
  console.log(`  errors            ${r.errors.length ? r.errors.join(' | ') : 'none'}`);
  console.log(`  fits viewport     ${r.overflowsViewport ? `NO (${r.scrollHeight}px)` : 'yes'}`
    + `${r.horizontalOverflow ? '  H-OVERFLOW' : ''}`);
  console.log(`  touch < 48px      ${r.underMinTouchCount}`
    + (r.underMinTouchCount ? `  e.g. ${r.underMinTouch.map(s => `${s.cls}(${s.w}x${s.h})`).slice(0,3).join(', ')}` : ''));
  console.log(`  Cinzel < 20px     ${r.cinzelUnder20Count}`
    + (r.cinzelUnder20Count ? `  e.g. ${r.cinzelUnder20.map(s => `"${s.sample}" ${s.size}px`).slice(0,3).join(', ')}` : ''));
  console.log(`  any text < 12px   ${r.under12pxCount}`
    + (r.under12pxCount ? `  e.g. ${r.under12px.map(s => `"${s.sample}" ${s.size}px`).slice(0,3).join(', ')}` : ''));
  console.log(`  gold of lit ink   ${r.goldPctOfLitPixels}%   (ember ${r.emberPctOfLitPixels}%)`);
}
