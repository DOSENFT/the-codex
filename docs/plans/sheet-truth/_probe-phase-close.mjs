/* SHEET TRUTH phase close — the headline claim, on glass, in one photograph.
 *
 *   node docs/plans/sheet-truth/_probe-phase-close.mjs
 *
 * Marcus's words when he opened this phase:
 *
 *   "in combat my spell definitions, and probably a lot of other things, are
 *    claiming that my charisma is 18, when in fact it's 16. What I change in
 *    the prep screen must directly effect and be used app wide"
 *
 * THE MEASUREMENT IS THE SAME BYTES INTO TWO BUILDS. One storage blob — his
 * real ability line (CHA 16) carrying the stale derived numbers his sheet had
 * actually accumulated (DC 15, attack +7, from the months it believed CHA 18) —
 * is written into localStorage for the pre-phase build on :4217 and today's
 * build on :4223. Neither build is told anything the other is not.
 *
 * On the pre-phase build the stored 15 is what the Play tab paints, because
 * that build trusts storage. On today's build `resolveCharacter` recomputes on
 * the way out of storage, so the same bytes paint 14. Nothing about the seed
 * changed; the door changed.
 *
 * FINDING Q APPLIES. A probe that reads `textContent` is a proof of the model,
 * not the screen — so the Save DC box is located, checked for real painted area
 * inside the band's own box, checked to be the topmost thing at its own centre,
 * and only then read and photographed.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })(),
];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const SHOTS = new URL('./shots/', import.meta.url);
mkdirSync(SHOTS, { recursive: true });

const BUILDS = [
  { tag: 'before-main', url: 'http://localhost:4217/the-codex/', what: 'pre-phase build (main @ ea28aad)' },
  { tag: 'after-slice7', url: 'http://localhost:4223/the-codex/', what: "today's build (sheet-truth)" },
];

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
};

/* THE BUG, AS HE WAS ACTUALLY CARRYING IT. Charisma 16 is the truth; 15 and +7
   are what a sheet that had been told 18 for months had written down. A level 7
   Paladin with CHA 16 and proficiency +3 has DC 8+3+3 = 14 and attack +6. */
const SEED = (() => {
  const seed = {
    ...NIX,
    level: 7,
    abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
    proficiencyBonus: 3,
    spellSaveDC: 15,
    spellAttackBonus: 7,
    spells: (NIX.spells ?? []).map(s => ({ ...s, prepared: true })),
    spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } },
  };
  delete seed.paladinResources;
  return seed;
})();

const browser = await chromium.launch();

async function openPlayTab(url) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, reducedMotion: 'reduce',
  });
  const errors = [];
  await ctx.addInitScript(
    ([id, seedJson, combatJson]) => {
      localStorage.setItem('codex-character-' + id, seedJson);
      localStorage.setItem('codex-combat-' + id, combatJson);
      localStorage.setItem('codex-active-id', id);
      const seed = JSON.parse(seedJson);
      localStorage.setItem('codex-roster', JSON.stringify([
        { id, name: seed.name, class: seed.class, subclass: seed.subclass,
          level: seed.level, updatedAt: '2026-08-26T00:00:00.000Z' },
      ]));
      localStorage.setItem('codex-character', seedJson);
    },
    [NIX.id, JSON.stringify(SEED), JSON.stringify(IN_COMBAT)],
  );
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

/* FINDING BL, PAID FOR TWICE. The first version of this probe looked up each
   label with a document-wide `find`, and reported the proficiency bonus as NOT
   FOUND on BOTH builds — which would have read as "the band lost a number".
   It had not: `uppercase` and `truncate` are CSS only, so the label text really
   is "Prof", and the label really was found. It was simply a DIFFERENT "Prof"
   somewhere else on the Play tab, whose own box holds no numeral. A probe that
   matches by proximity must check the anchor it matched. Everything below is
   therefore scoped to the band itself, found as the smallest element that
   contains all five of its labels. */
const LABELS = ['Save DC', 'AC', 'Init', 'Prof', 'Sp Atk'];

async function findBand(page) {
  return page.evaluate(labels => {
    const holdsAll = el => {
      const kids = [...el.querySelectorAll('span')]
        .filter(s => s.children.length === 0)
        .map(s => s.textContent?.trim());
      return labels.every(l => kids.includes(l));
    };
    const all = [...document.querySelectorAll('div')].filter(holdsAll);
    if (!all.length) return null;
    // The smallest such element is the band; anything larger merely contains it.
    const band = all.reduce((a, b) => (a.contains(b) ? b : a));
    band.setAttribute('data-probe-band', '1');
    const r = band.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, LABELS);
}

/** Read one stat FROM INSIDE THE BAND, and prove it is actually painted. */
async function paintedStat(page, label) {
  return page.evaluate(lbl => {
    const band = document.querySelector('[data-probe-band]');
    if (!band) return null;
    const tag = [...band.querySelectorAll('span')]
      .find(el => el.children.length === 0 && el.textContent?.trim() === lbl);
    if (!tag) return null;
    const box = tag.parentElement;
    const value = [...box.querySelectorAll('span')]
      .filter(el => el.children.length === 0)
      .map(el => el.textContent?.trim())
      .filter(t => t && t !== lbl)[0] ?? null;
    const r = box.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return { value, painted: false, why: 'zero area' };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const painted = !!top && (box.contains(top) || top.contains(box));
    return { value, painted, why: painted ? 'topmost at its own centre' : 'occluded' };
  }, label);
}

/** The disagreement banner, if the band is showing one. */
async function flagBanner(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => /disagree on \d+ thing/.test(b.textContent ?? ''));
    if (!btn) return { banner: null, titles: [] };
    const panel = btn.parentElement;
    const titles = [...(panel?.querySelectorAll('p') ?? [])]
      .map(p => p.textContent?.trim())
      .filter(t => t && /^(Spell save DC|Spell attack bonus|Proficiency bonus|Spell slots)$/.test(t));
    return { banner: btn.textContent?.replace(/\s+/g, ' ').trim(), titles: [...new Set(titles)] };
  });
}

const report = [];
for (const b of BUILDS) {
  const { ctx, page, errors } = await openPlayTab(b.url);
  const bandBox = await findBand(page);
  if (!bandBox) throw new Error(`no vitals band on ${b.url} — probing the wrong screen`);
  const dc = await paintedStat(page, 'Save DC');
  const atk = await paintedStat(page, 'Sp Atk');
  const prof = await paintedStat(page, 'Prof');
  const flags = await flagBanner(page);

  /* THE CARD, NOT THE ROW. The band is the row of five boxes; the card that
     wraps it also holds the disagreement panel, which is half of what this
     photograph is for. Clipping to the row gave a 4KB "after" against a 58KB
     "before" — two pictures of different things, which is not a comparison. */
  const card = await page.evaluate(() => {
    const band = document.querySelector('[data-probe-band]');
    const c = band.parentElement ?? band;
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  await page.screenshot({
    path: new URL(`phase-close-vitals-${b.tag}.png`, SHOTS).pathname.replace(/^\//, ''),
    clip: { x: Math.max(0, card.x - 6), y: Math.max(0, card.y - 6), width: card.w + 12, height: card.h + 12 },
  });

  report.push({ build: b.what, tag: b.tag, dc, atk, prof, flags, errors });
  await ctx.close();
}

await browser.close();

console.log('SEEDED (identical bytes into both builds):');
console.log('  CHA 16 · level 7 · stored spellSaveDC 15 · stored spellAttackBonus +7');
console.log('  TRUE for that sheet: DC 14, attack +6, proficiency +3\n');
for (const r of report) {
  console.log(`── ${r.build}  [${r.tag}]`);
  console.log(`   Save DC painted : ${r.dc?.value ?? 'NOT FOUND'}   (${r.dc?.painted ? r.dc.why : r.dc?.why ?? '—'})`);
  console.log(`   Sp Atk painted  : ${r.atk?.value ?? 'NOT FOUND'}`);
  console.log(`   Prof painted    : ${r.prof?.value ?? 'NOT FOUND'}`);
  console.log(`   disagreement    : ${r.flags.banner ?? 'none shown'}`);
  console.log(`   flagged         : ${r.flags.titles.length ? r.flags.titles.join(' · ') : '—'}`);
  if (r.errors.length) console.log(`   page errors     : ${r.errors.join(' | ')}`);
  console.log('');
}
