// Prove Table Truth slice 6 against the REAL running app.
//
//   npm run build && npx vite preview --port 4193      (in another shell)
//   node docs/plans/table-truth/prove-slice6.mjs [baseUrl]
//
// Slice 6 answers the two questions Marcus asked about reactions — "what does
// it do" and "when can i use it" — and four of its claims cannot be settled by
// a unit test:
//
//   ONLY PIXELS CAN SETTLE "IT FITS". `ReactionsBand.test.tsx` proves the
//   markup; a character budget is a PREDICTION about wrapping. So every line is
//   measured with a Range, asking the layout engine how many line boxes it
//   actually drew — slice 4's finding Q, which is that `textContent` cheerfully
//   reports text CSS has already clipped.
//
//   ONLY THE WHOLE PAGE CAN SETTLE "IT IS NOT PAINTED TWICE". `YourTurnList`
//   now filters reactions out. Off your turn rank.ts puts them at the TOP of
//   `ranked`, so this is exactly where a double-paint would appear, and case C
//   seeds an off-turn encounter to look for it.
//
//   ONLY A BROWSER CAN SETTLE "IT COLLAPSES AND REMEMBERS". `useCollapsible`
//   writes on toggle. Case B taps the header and checks both that the rows go
//   and that the ONLY key written is the shared `codex-ui-` map — no new
//   storage key was invented for this band.
//
//   AND THE STANDING CLAIM OF THIS PHASE: the surface writes nothing on its own.
//   Case D reloads and compares the guarded bytes, as slice 5 did.
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
const OUT = 'docs/plans/table-truth/_shots-slice6';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

const PALADIN_AT_8 = {
  layOnHands: { max: 5 * 8, current: 5 * 8 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

/** An encounter in progress, and NOT Marcus's turn. The window in which a
 *  Reaction is the whole of what he owns — and the state in which a
 *  double-painted row would be most visible. */
const OFF_TURN = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
  conditions: [],
});

const errors = [];
const browser = await chromium.launch();

async function openApp({ combatBytes = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
  });

  await ctx.addInitScript(
    ([id, seedJson, combat]) => {
      if (!localStorage.getItem('codex-character-' + id)) {
        localStorage.setItem('codex-character-' + id, seedJson);
      }
      if (combat && !localStorage.getItem('codex-combat-' + id)) {
        localStorage.setItem('codex-combat-' + id, combat);
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
    [NIX.id, JSON.stringify({ ...NIX, paladinResources: PALADIN_AT_8 }), combatBytes],
  );

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

/** Everything slice 6 claims about the painted page, read in one pass. */
const measure = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  /** Line boxes as the layout engine drew them. Not scrollHeight/lineHeight,
   *  not a character count: the rects a Range reports ARE the lines.
   *
   *  DISTINCT TOPS, not rect count — and the first run of this prover is why.
   *  A reaction row's WHEN line is a `<p>` holding an inline `<span>` label
   *  followed by text, so the Range reports one rect per inline FRAGMENT: the
   *  label and the clause came back as 3 and 4 "lines" while painting 1 and 2.
   *  Fragments that share a top edge are one line, which is what a reader sees
   *  and therefore what the budget is about. Slice 5's rows had a single text
   *  node each, so the count and the tops agreed and the flaw never showed. */
  const lineBoxes = (el) => {
    if (!el) return 0;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
    return tops.size;
  };

  const band = document.querySelector('section[aria-label="Your reactions"]');
  const rows = [...(band?.querySelectorAll('li') ?? [])].map((li) => {
    const spans = [...(li.querySelector('div')?.querySelectorAll('span') ?? [])];
    const paras = [...li.querySelectorAll('p')];
    const when = paras[0] ?? null;
    const body = paras[1] ?? null;
    return {
      name: txt(spans[0]),
      cost: txt(spans[1]),
      when: txt(when),
      whenLines: lineBoxes(when),
      body: txt(body),
      bodyLines: lineBoxes(body),
      flag: txt(paras[2]),
      h: Math.round(li.getBoundingClientRect().height),
      nameClipped: spans[0]
        ? spans[0].scrollWidth > Math.ceil(spans[0].getBoundingClientRect().width) + 1
        : false,
    };
  });

  const turnList = document.querySelector('section[aria-label="Your turn options"]');
  const turnRows = [...(turnList?.querySelectorAll('li') ?? [])].map((li) =>
    txt(li.querySelector('span')));

  return {
    present: !!band,
    header: txt(band?.querySelector('h3')),
    headerButton: txt(band?.querySelector('button')),
    expanded: band?.querySelector('button')?.getAttribute('aria-expanded') ?? null,
    bandText: txt(band),
    bandTop: band ? Math.round(band.getBoundingClientRect().top) : -1,
    bandH: band ? Math.round(band.getBoundingClientRect().height) : -1,
    rows,
    turnListCaption: txt(turnList?.querySelector('h3')),
    turnRows,
    /* The double-paint check: a reaction's name appearing in BOTH lists. */
    duplicated: rows
      .map((r) => r.name)
      .filter((n) => n && turnRows.some((t) => t === n)),
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

// ── A — the band, out of combat, as it first paints ─────────────────────────
const { ctx, page } = await openApp();
const A = await measure(page);
await page.screenshot({ path: `${OUT}/A-play-tab-with-the-band.png` });
const bandEl = await page.$('section[aria-label="Your reactions"]');
if (bandEl) {
  await bandEl.scrollIntoViewIfNeeded();
  await bandEl.screenshot({ path: `${OUT}/B-the-band-close-up.png` });
}
const storageAfterFirstRender = await readStorage(page);

// ── B — it collapses, and it writes only the shared UI map ──────────────────
await page.evaluate(() => { window.__writes = []; });
await page.click('section[aria-label="Your reactions"] button');
await page.waitForTimeout(300);
const B = await measure(page);
await page.screenshot({ path: `${OUT}/C-the-band-collapsed.png` });
const writesOnToggle = await page.evaluate(() => [...new Set(window.__writes)].sort());

// re-open, so case D reloads from the same visual state as A
await page.click('section[aria-label="Your reactions"] button');
await page.waitForTimeout(300);

// ── D — a genuine second full render; the guarded bytes must not move ───────
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const D = await measure(page);
const storageAfterSecondRender = await readStorage(page);
await ctx.close();

// ── C — off your turn: where a double-paint would show ──────────────────────
const { ctx: ctxC, page: pageC } = await openApp({ combatBytes: OFF_TURN });
const C = await measure(pageC);
await pageC.screenshot({ path: `${OUT}/D-off-turn.png` });
await ctxC.close();

await browser.close();

// ── the diff ────────────────────────────────────────────────────────────────
const GUARDED = [`codex-combat-${NIX.id}`, `codex-character-${NIX.id}`];
const moved = GUARDED.filter(
  (k) => storageAfterFirstRender[k] !== storageAfterSecondRender[k],
);

// ── the report ──────────────────────────────────────────────────────────────
const ELLIPSIS = /…|\.\.\./;
console.log(`\nSLICE 6 PROOF — ${BASE}\n`);
console.log(`── the band`);
console.log(`   «${A.header}» · ${A.rows.length} rows · at y=${A.bandTop}, ${A.bandH}px tall`);
for (const r of A.rows) {
  console.log(`   ${String(r.h).padStart(3)}px  ${r.name}${r.nameClipped ? ' !CLIPPED' : ''}  ·  ${r.cost}`);
  console.log(`          WHEN (${r.whenLines} line): ${r.when}`);
  console.log(`          BODY (${r.bodyLines} line): ${r.body}`);
  if (r.flag) console.log(`          FLAG: ${r.flag}`);
}
console.log(`\n── no double paint`);
console.log(`   on-turn  turn list «${A.turnListCaption}»: [${A.turnRows.join(' | ')}]`);
console.log(`   off-turn turn list «${C.turnListCaption}»: [${C.turnRows.join(' | ')}]`);
console.log(`   off-turn band rows: [${C.rows.map((r) => r.name).join(' | ')}]`);
console.log(`   names in BOTH lists: [${[...A.duplicated, ...C.duplicated].join(', ') || 'none'}]`);
console.log(`\n── collapse`);
console.log(`   aria-expanded  open→${A.expanded}  after tap→${B.expanded}`);
console.log(`   rows after tap: ${B.rows.length}   header still reads: «${B.headerButton}»`);
console.log(`   keys written by the tap: [${writesOnToggle.join(', ') || 'none'}]`);
console.log(`\n── storage`);
console.log(`   keys written during boot+render: [${A.writes.join(', ') || 'none'}]`);
console.log(`   guarded keys moved across a full re-render: [${moved.join(', ') || 'none'}]`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify({ A, B, C, D, moved, writesOnToggle, errors }, null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);

// A — the band is on the page and complete.
if (!A.present) failures.push('A: the reactions band is not on the Play tab at all');
if (A.rows.length !== 2) failures.push(`A: ${A.rows.length} reaction rows, expected 2`);
for (const r of A.rows) {
  if (!r.name) failures.push('A: a row has no name');
  if (!r.cost) failures.push(`A: "${r.name}" has no cost`);
  if (!r.when) failures.push(`A: "${r.name}" does not answer WHEN`);
  if (!r.body) failures.push(`A: "${r.name}" does not answer what it does`);
  if (r.nameClipped) failures.push(`A: "${r.name}" is clipped — the name cannot be read`);
  if (r.bodyLines !== 1) failures.push(`A: "${r.name}" wrapped its body to ${r.bodyLines} lines: «${r.body}»`);
  if (r.whenLines > 2) failures.push(`A: "${r.name}" wrapped its WHEN to ${r.whenLines} lines: «${r.when}»`);
}
if (ELLIPSIS.test(A.bandText)) {
  failures.push(`A: the band contains an ellipsis: «${A.bandText.match(/.{0,40}(…|\.\.\.).{0,20}/)?.[0]}»`);
}

// B — canon reached the table, computed rather than read.
const cloak = A.rows.find((r) => /Flaming Cloak/i.test(r.name));
if (!cloak) failures.push('B: Flaming Cloak is not in the band');
else {
  if (!/12 temp HP/.test(cloak.body)) failures.push(`B: the cloak reads «${cloak.body}» — not the temp HP he actually gets`);
  if (/11 temp HP/.test(cloak.body)) failures.push("B: the cloak is reading canon's frozen level-7 snapshot");
  if (!/1d10 Fire/.test(cloak.body)) failures.push(`B: the cloak does not state the retaliation: «${cloak.body}»`);
  if (!/not stated/i.test(cloak.when)) failures.push(`B: the cloak's missing trigger is not shown: «${cloak.when}»`);
  if (/when you take damage/i.test(A.bandText)) failures.push('B: a trigger was INVENTED — canon suggests that wording to a DM, it does not state it');
  if (!/errat/i.test(cloak.flag)) failures.push(`B: canon's errata on this feature are not flagged: «${cloak.flag}»`);
}
const oa = A.rows.find((r) => /Opportunity/i.test(r.name));
if (!oa) failures.push('B: Opportunity Attack is not in the band');
else {
  if (!/leaves your reach/i.test(oa.when)) failures.push(`B: OA does not state its trigger: «${oa.when}»`);
  if (/leaves your reach/i.test(oa.body)) failures.push('B: OA states its trigger twice — once as WHEN and again in the body');
}

// C — one row, one place, in both halves of the round.
if (A.duplicated.length) failures.push(`C: painted twice on your turn: [${A.duplicated.join(', ')}]`);
if (C.duplicated.length) failures.push(`C: painted twice off your turn: [${C.duplicated.join(', ')}]`);
if (C.rows.length !== 2) failures.push(`C: off-turn band shows ${C.rows.length} rows, expected 2`);

// D — it collapses, it remembers, and it invents no storage key.
if (A.expanded !== 'true') failures.push(`D: the band did not start open (aria-expanded=${A.expanded})`);
if (B.expanded !== 'false') failures.push(`D: the band did not collapse (aria-expanded=${B.expanded})`);
if (B.rows.length !== 0) failures.push(`D: ${B.rows.length} rows still painted after collapsing`);
if (!B.headerButton.includes('2')) failures.push(`D: the collapsed header lost its count: «${B.headerButton}»`);
const strayKeys = writesOnToggle.filter((k) => !k.startsWith('codex-ui-'));
if (strayKeys.length) failures.push(`D: collapsing wrote keys it had no business writing: [${strayKeys.join(', ')}]`);
if (!writesOnToggle.some((k) => k.startsWith('codex-ui-'))) failures.push('D: the collapse state was not persisted at all');

// E — the standing claim: nothing writes on its own.
if (moved.length) failures.push(`E: a guarded key changed across a re-render: [${moved.join(', ')}]`);
if (D.rows.length !== A.rows.length) failures.push(`E: the band changed shape on reload (${A.rows.length} → ${D.rows.length})`);

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
