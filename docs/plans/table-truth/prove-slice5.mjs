// Prove Table Truth slice 5 against the REAL running app.
//
//   npm run build && npx vite preview --port 4193      (in another shell)
//   node docs/plans/table-truth/prove-slice5.mjs [baseUrl]
//
// Slice 5 makes two claims that a unit test cannot settle, for two different
// reasons, and one it can.
//
//   THE CLAIM UNIT TESTS OWN — "it writes nothing". Proved in node by
//   `src/components/turn/storage-safety.test.tsx`, which renders the surface and
//   records every setItem. It is proved AGAIN here because the node test cannot
//   run effects, and the effect on this page is the LEGACY writer inside
//   CombatHelperInner — the very thing the new provider is mounted beside. The
//   node test proves the new code is innocent; this proves the pair of them,
//   together, in a browser, leave Marcus's saved encounter exactly as found.
//
//   THE CLAIM ONLY PIXELS CAN SETTLE — "exactly two lines, never an ellipsis".
//   `ROW_BUDGET_CHARS = 46` was measured at 390px and a character budget is a
//   PREDICTION about wrapping. The check is therefore not "does the string
//   contain …" — slice 4's finding Q is that `textContent` happily reports a
//   full word CSS has already clipped — but a Range over each detail line
//   asking the layout engine how many line boxes it actually drew.
//
//   THE CLAIM ABOUT WHAT CANON CHANGED — Sacred Flame must read "2d8 Radiant"
//   (a cantrip scaled to Nix's CHARACTER level, 5-10 → ×2) and "DC 16 DEX" (his
//   own sheet's save DC). Both numbers were absent from this screen yesterday.
//
// And one thing this prover is not testing but is deliberately WATCHING:
// slice 4's finding R, the level-8 Paladin with no Lay on Hands anywhere,
// because `TurnDeck` gates it on an optional field nothing derives at boot. The
// last case seeds a character WITHOUT that field and reports what each surface
// shows. It asserts nothing; R is not slice 5's to fix. It measures, so the
// closeout can say what is true instead of what is assumed.
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
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4193/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-slice5';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* The same seed slice 4 used, so the "after" shot is comparable with
   `_shots-slice4/A-default-deck-expanded.png` — which IS the before, being the
   Play tab exactly as it stood when slice 4 closed. See finding R. */
const PALADIN_AT_8 = {
  layOnHands: { max: 5 * 8, current: 5 * 8 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

const errors = [];
const browser = await chromium.launch();

/** One browser, one character, seeded once. `seedPaladin: false` is case F. */
async function openApp({ seedPaladin }) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
  });

  /* SEEDED ONLY IF ABSENT. This script re-runs on every navigation, and a seed
     that overwrites on reload would silently restore the very bytes the reload
     is supposed to be checking — the comparison would pass by construction. */
  await ctx.addInitScript(
    ([id, seedJson]) => {
      if (!localStorage.getItem('codex-character-' + id)) {
        localStorage.setItem('codex-character-' + id, seedJson);
      }
      localStorage.setItem('codex-active-id', id);
      if (!localStorage.getItem('codex-roster')) {
        const seed = JSON.parse(seedJson);
        localStorage.setItem('codex-roster', JSON.stringify([
          { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
            updatedAt: '2026-08-16T00:00:00.000Z' },
        ]));
      }
    },
    [NIX.id, JSON.stringify(seedPaladin ? { ...NIX, paladinResources: PALADIN_AT_8 } : NIX)],
  );

  /* The pen, watched. Installed AFTER the seed script so the seed's own writes
     are not counted, and before the app's bundle so nothing it does escapes. */
  await ctx.addInitScript(() => {
    window.__writes = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      window.__writes.push(String(k));
      return setItem.call(this, k, v);
    };
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** Everything slice 5 claims about the painted page, read in one pass. */
const measure = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  /** How many line boxes the layout engine actually drew for this element.
   *  Not a character count, not scrollHeight/lineHeight: the rects a Range
   *  reports ARE the lines, straight from the engine that wrapped them. */
  const lineBoxes = (el) => {
    if (!el) return 0;
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getClientRects().length;
  };

  const section = document.querySelector('section[aria-label="Your turn options"]');
  const rows = [...(section?.querySelectorAll('li') ?? [])].map((li) => {
    const head = li.querySelector('div');
    const spans = [...(head?.querySelectorAll('span') ?? [])];
    const paras = [...li.querySelectorAll('p')];
    const detail = paras[0] ?? null;
    return {
      name: txt(spans[0]),
      cost: txt(spans[1]),
      detail: txt(detail),
      detailLines: lineBoxes(detail),
      nameLines: lineBoxes(spans[0]),
      h: Math.round(li.getBoundingClientRect().height),
      /* The name is the one span that may be clipped by CSS rather than
         wrapped, and textContent would not say so. Finding Q, applied. */
      nameClipped: spans[0] ? spans[0].scrollWidth > Math.ceil(spans[0].getBoundingClientRect().width) + 1 : false,
    };
  });

  const deck = document.querySelector('section[aria-label="Turn deck"]');

  return {
    present: !!section,
    caption: txt(section?.querySelector('h3')),
    count: txt(section?.querySelector('h3')?.nextElementSibling),
    footer: txt([...(section?.querySelectorAll('p') ?? [])].pop()),
    sectionText: txt(section),
    sectionTop: section ? Math.round(section.getBoundingClientRect().top) : -1,
    sectionH: section ? Math.round(section.getBoundingClientRect().height) : -1,
    rows,
    /* Finding R's two surfaces, asked the same question. */
    listHasLayOnHands: rows.some((r) => /Lay on Hands/i.test(r.name)),
    deckHasLayOnHands: /LAY ON HANDS/i.test(txt(deck)),
    writes: [...new Set(window.__writes)].sort(),
  };
});

const readStorage = (page) => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

// ── A/B/C/D/E — the main run ────────────────────────────────────────────────
const { ctx, page } = await openApp({ seedPaladin: true });

const A = await measure(page);
await page.screenshot({ path: `${OUT}/A-play-tab-with-the-list.png` });
const section = await page.$('section[aria-label="Your turn options"]');
if (section) await section.screenshot({ path: `${OUT}/B-the-list-close-up.png` });

const storageAfterFirstRender = await readStorage(page);

// ── E. Reload: a full second render, no interaction, and compare the bytes. ──
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const E = await measure(page);
const storageAfterSecondRender = await readStorage(page);
await ctx.close();

// ── F. Finding R, measured rather than assumed. ─────────────────────────────
const { ctx: ctxF, page: pageF } = await openApp({ seedPaladin: false });
const F = await measure(pageF);
await pageF.screenshot({ path: `${OUT}/F-no-paladinResources.png` });
await ctxF.close();

await browser.close();

// ── the diff ────────────────────────────────────────────────────────────────
const GUARDED = [`codex-combat-${NIX.id}`, `codex-character-${NIX.id}`];
const moved = GUARDED.filter(
  (k) => storageAfterFirstRender[k] !== storageAfterSecondRender[k],
);
const changedAll = [...new Set([
  ...Object.keys(storageAfterFirstRender), ...Object.keys(storageAfterSecondRender),
])].filter((k) => storageAfterFirstRender[k] !== storageAfterSecondRender[k]);

// ── the report ──────────────────────────────────────────────────────────────
const ELLIPSIS = /…|\.\.\./;
console.log(`\nSLICE 5 PROOF — ${BASE}\n`);
console.log(`── the list`);
console.log(`   «${A.caption}» · ${A.count} · at y=${A.sectionTop}, ${A.sectionH}px tall`);
for (const r of A.rows) {
  console.log(`   ${String(r.h).padStart(3)}px  ${r.nameLines}+${r.detailLines} lines  ${
    r.name}${r.nameClipped ? ' !CLIPPED' : ''}  ·  ${r.cost}`);
  console.log(`          ${r.detail}`);
}
console.log(`   footer: «${A.footer}»`);
console.log(`\n── storage`);
console.log(`   keys written during boot+render: [${A.writes.join(', ') || 'none'}]`);
console.log(`   guarded keys moved across a full re-render: [${moved.join(', ') || 'none'}]`);
console.log(`   any key changed: [${changedAll.join(', ') || 'none'}]`);
console.log(`\n── finding R (no paladinResources)`);
console.log(`   ranked list shows Lay on Hands: ${F.listHasLayOnHands}`);
console.log(`   turn deck shows LAY ON HANDS:   ${F.deckHasLayOnHands}`);
console.log(`   rows without the field: ${F.rows.length} (with it: ${A.rows.length})`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify({ A, E, F, moved, changedAll, errors }, null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);

// A — the engine is on the page.
if (!A.present) failures.push('A: the ranked list is not on the Play tab at all');
if (A.rows.length < 3) failures.push(`A: ${A.rows.length} rows, expected at least 3`);
if (A.caption !== 'Your turn') failures.push(`A: caption is «${A.caption}»`);

// B — every row is complete. A row missing any of its three parts is not an
// option, it is a rumour.
for (const r of A.rows) {
  if (!r.name) failures.push('B: a row has no name');
  if (!r.cost) failures.push(`B: "${r.name}" has no cost`);
  if (!r.detail) failures.push(`B: "${r.name}" has no detail line`);
  if (r.nameClipped) failures.push(`B: "${r.name}" is clipped — the name cannot be read`);
}

// C — exactly two lines, measured off the paint.
for (const r of A.rows) {
  if (r.nameLines !== 1) failures.push(`C: "${r.name}" wrapped its name to ${r.nameLines} lines`);
  if (r.detailLines !== 1) failures.push(`C: "${r.name}" wrapped its detail to ${r.detailLines} lines: «${r.detail}»`);
}

// D — no ellipsis anywhere in the new surface, and canon's numbers are in it.
if (ELLIPSIS.test(A.sectionText)) failures.push(`D: the list contains an ellipsis: «${A.sectionText.match(/.{0,40}(…|\.\.\.).{0,20}/)?.[0]}»`);
const flame = A.rows.find((r) => /Sacred Flame/i.test(r.name));
if (!flame) failures.push('D: Sacred Flame is not in the ranked list');
else {
  if (!/2d8 Radiant/.test(flame.detail)) failures.push(`D: Sacred Flame reads «${flame.detail}» — not scaled to level 8`);
  if (!/DC 16 DEX/.test(flame.detail)) failures.push(`D: Sacred Flame does not state the save: «${flame.detail}»`);
}

// E — the bytes did not move, across a genuine second full render.
if (moved.length) failures.push(`E: a guarded key changed across a re-render: [${moved.join(', ')}]`);
if (E.rows.length !== A.rows.length) failures.push(`E: the list changed shape on reload (${A.rows.length} → ${E.rows.length})`);

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
