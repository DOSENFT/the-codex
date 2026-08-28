// FINDING BF, measured properly before anything is changed.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/_probe-bf.mjs
//
// Slice 10e closed with a screenshot that LOOKED like the reactions band was
// running under two overlays, and an `elementFromPoint` sweep that named them:
// the dice FAB and the sticky turn deck. That is enough to open a finding and
// not enough to fix one, because the two hits are not the same KIND of problem
// and a fix aimed at the wrong one is a fix that changes nothing:
//
//   * `<main>` is FIXED, and its bottom edge already sits above the deck
//     (`bottom-[calc(4rem+1px+var(--turn-deck-h)+safe-area)]`, Layout.tsx:361).
//     So a row "covered by the deck" may simply be a row scrolled below the
//     bottom of its own scroll container — off-screen, not occluded. Scrolling
//     reaches it. Nothing is broken.
//   * The FAB is `fixed z-50` at `bottom-[calc(5rem+var(--turn-deck-h)+safe)]`,
//     which is 1rem ABOVE main's bottom edge and 3.5rem tall — so it floats
//     over the LIVE content area at every scroll position. Scrolling cannot
//     reach what is under it, because it moves with the viewport.
//
// This probe separates those two by measuring, for every row of the band and at
// three scroll positions:
//
//   inClip   — is the row inside `<main>`'s visible box at all?
//   hits     — what `elementFromPoint` returns across the row's rules text
//   culprit  — of those hits, which are FIXED-position elements (real occlusion)
//              vs merely outside the clip (scroll-recoverable)
//
// It also sweeps the FAB's own box against every text node on the screen, on
// every tab, so the answer to "how much does this button cover" is a number
// rather than an impression.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
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
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4193/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-bf';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Marcus's real sheet — identical seed to prove-slice10e.mjs, because the band
   under measurement is the one 10e shipped and the row count is what makes it
   long enough to collide in the first place. */
const REAL_FEATS = [
  { name: 'Sentinel', description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.', source: 'General Feat', isHomebrew: false, effects: [] },
  { name: 'Interception', description: 'You protect your allies from harm.', source: 'Fighting Style', isHomebrew: false, effects: [] },
  { name: 'Lucky', description: 'You have inexplicable luck that seems to kick in at just the right moment.', source: 'Changeling', isHomebrew: false, effects: [] },
];

const MARCUS = {
  ...NIX,
  level: 7,
  armorClass: 18,
  hitPoints: { max: 67, current: 67 },
  tempHP: 0,
  proficiencyBonus: 3,
  spellSaveDC: 14,
  spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: REAL_FEATS,
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true, damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};

const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: PHONE.width, height: PHONE.height },
  deviceScaleFactor: PHONE.dsf, hasTouch: true, reducedMotion: 'reduce',
});
await ctx.addInitScript(([id, seedJson, combatJson]) => {
  if (!localStorage.getItem('codex-character-' + id)) localStorage.setItem('codex-character-' + id, seedJson);
  if (!localStorage.getItem('codex-combat-' + id)) localStorage.setItem('codex-combat-' + id, combatJson);
  localStorage.setItem('codex-active-id', id);
  if (!localStorage.getItem('codex-roster')) {
    const seed = JSON.parse(seedJson);
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
  }
}, [NIX.id, JSON.stringify(MARCUS), IN_COMBAT]);

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

/* ── 1 · the geometry of the chrome itself ───────────────────────────────── */

const chrome = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const fab = document.querySelector('button[aria-label="Open dice roller"]');
  const main = document.querySelector('main');
  const deck = document.querySelector('[data-turn-deck], nav + *');
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    deckVar: getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h').trim(),
    fab: box(fab),
    fabPosition: fab ? getComputedStyle(fab).position : null,
    fabZ: fab ? getComputedStyle(fab).zIndex : null,
    main: box(main),
    mainPosition: main ? getComputedStyle(main).position : null,
    deck: box(deck),
  };
});

/* ── 2 · the band, at three scroll positions ─────────────────────────────── */

/** For one row: is it inside main's clip, and what is actually on top of its text? */
const sample = () => page.evaluate(() => {
  const main = document.querySelector('main');
  const mainBox = main.getBoundingClientRect();
  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return { band: null };

  const describe = (el) => {
    if (!el) return 'null';
    const cls = [...el.classList].slice(0, 3).join('.');
    return el.tagName + (cls ? '.' + cls : '');
  };
  /* Walk up looking for a fixed ancestor. THIS is the distinction the whole
     probe exists for: a fixed thing on top of text is occlusion you cannot
     scroll away from; anything else is just the page. */
  const fixedAncestor = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return n;
    }
    return null;
  };

  return {
    scrollY: Math.round(main.scrollTop),
    rows: [...band.querySelectorAll('li')].map((li) => {
      const btn = li.querySelector('button[aria-label$="— details"]');
      const host = btn ?? li;
      const name = (btn?.getAttribute('aria-label') || '').replace(/ — details$/, '');
      const paras = [...host.querySelectorAll('p')];
      const last = paras[paras.length - 1] ?? host;
      const r = last.getBoundingClientRect();
      const inClip = r.top >= mainBox.top && r.bottom <= mainBox.bottom;

      const hits = [0.1, 0.25, 0.5, 0.75, 0.9].map((f) => {
        const x = Math.round(r.left + r.width * f);
        const y = Math.round(r.top + r.height / 2);
        if (y < 0 || y > window.innerHeight) return { f, at: [x, y], hit: 'OFFSCREEN', fixed: null };
        const el = document.elementFromPoint(x, y);
        const covered = el && !last.contains(el) && el !== last;
        const fx = covered ? fixedAncestor(el) : null;
        return { f, at: [x, y], hit: covered ? describe(el) : 'self', fixed: fx ? describe(fx) : null };
      });

      return {
        name,
        text: (last.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        box: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) },
        inClip,
        hits,
      };
    }),
  };
});

const scrollBandTo = (pos) => page.evaluate((p) => {
  const main = document.querySelector('main');
  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return;
  if (p === 'top') band.scrollIntoView({ block: 'start', behavior: 'instant' });
  else if (p === 'bottom') band.scrollIntoView({ block: 'end', behavior: 'instant' });
  else main.scrollTop = main.scrollHeight;
}, pos);

const positions = {};
for (const pos of ['top', 'bottom', 'end']) {
  await scrollBandTo(pos);
  await page.waitForTimeout(400);
  positions[pos] = await sample();
  await page.screenshot({ path: `${OUT}/band-${pos}.png` });
}

/* ── 3 · how much does the FAB cover, on every tab ───────────────────────── */

/** Every element whose own text box intersects the FAB's box. Text only — a
 *  container overlapping the FAB is not a complaint; a WORD under it is. */
const underFab = () => page.evaluate(() => {
  const fab = document.querySelector('button[aria-label="Open dice roller"]');
  if (!fab) return { fab: null };
  const f = fab.getBoundingClientRect();
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = (n.textContent || '').trim();
    if (!s) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= f.left || r.left >= f.right || r.bottom <= f.top || r.top >= f.bottom) continue;
      /* Ignore text that belongs to the FAB or to another fixed overlay parked
         off-glass — only page CONTENT counts as covered. */
      const el = n.parentElement;
      if (!el || fab.contains(el)) continue;
      out.push({ text: s.slice(0, 50), tag: el.tagName, cls: [...el.classList].slice(0, 2).join('.'), rect: { t: Math.round(r.top), l: Math.round(r.left) } });
      break;
    }
  }
  return { fab: { top: Math.round(f.top), left: Math.round(f.left), right: Math.round(f.right), bottom: Math.round(f.bottom) }, covered: out };
});

const tabs = await page.evaluate(() =>
  [...document.querySelectorAll('nav a, nav button')].map((a) => (a.textContent || '').trim()).filter(Boolean));

const fabSweep = {};
fabSweep['play (band at top)'] = await (async () => { await scrollBandTo('top'); await page.waitForTimeout(300); return underFab(); })();
fabSweep['play (scrolled to end)'] = await (async () => { await scrollBandTo('end'); await page.waitForTimeout(300); return underFab(); })();

const report = { chrome, tabs, positions, fabSweep };
writeFileSync(`${OUT}/_probe.json`, JSON.stringify(report, null, 2));

console.log('── chrome geometry ──');
console.log(JSON.stringify(chrome, null, 2));
for (const [pos, data] of Object.entries(positions)) {
  console.log(`\n── band, scrolled ${pos} (main.scrollTop=${data.scrollY}) ──`);
  for (const row of data.rows ?? []) {
    const fixedHits = row.hits.filter((h) => h.fixed);
    const off = row.hits.filter((h) => h.hit === 'OFFSCREEN').length;
    console.log(
      `  ${row.name.padEnd(18)} inClip=${String(row.inClip).padEnd(5)} offscreen=${off}/5 ` +
      `fixedOverlay=${fixedHits.length}/5 ${fixedHits.length ? '<< ' + [...new Set(fixedHits.map((h) => h.fixed))].join(', ') : ''}`);
    if (!row.inClip || fixedHits.length) console.log(`      text: "${row.text}"`);
  }
}
console.log('\n── what the dice button covers ──');
for (const [where, d] of Object.entries(fabSweep)) {
  console.log(`  ${where}: fab=${JSON.stringify(d.fab)}  covering ${d.covered.length} text run(s)`);
  for (const c of d.covered) console.log(`      ${c.tag}.${c.cls}  "${c.text}"`);
}
console.log(`\nwrote ${OUT}/_probe.json + 3 screenshots`);

await browser.close();
