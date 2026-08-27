// Prove Table Truth slice 8 against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice8.mjs [baseUrl]
//
// Slice 8 makes canon's twelve errata readable and answerable. Four of its five
// claims cannot be settled by a unit suite:
//
//   THE FAULTS ARE PAINTED WHOLE, CHARACTER FOR CHARACTER. `ErrataBand.test.tsx`
//   asserts canon's text reaches the MARKUP; finding Q says that proves nothing
//   about the glass, because CSS-clipped text still reports in full to a string
//   renderer. Case B reads what is painted out of the live DOM and compares it to
//   the canon JSON on disk — not a substring, the whole string — and separately
//   measures every box in the band for a clamp or an overflow.
//
//   THE ANSWER SURVIVES A RELOAD. That is the entire point of the ruling store,
//   and it is the one claim no render test can make: `setRuling` returning the
//   right object proves nothing about `localStorage` on a real origin. Case D
//   taps a ruling, reloads the page, and reads the control back.
//
//   THE TWO SURFACES AGREE. A ruling recorded in the band must be the ruling the
//   option detail sheet reports, or the app contradicts itself about the same
//   rule on the same screen. Case E taps the ruling in one surface and reads it
//   in the other.
//
//   AND THE STANDING CLAIM OF THIS PHASE: reading changes nothing. Case F grades
//   two storage windows apart — what the tab writes just by loading (two mount
//   effects that predate this slice; slice 10 owns them) and what is written from
//   the first tap on, which is what slice 8 is graded on.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const OUT = 'docs/plans/table-truth/_shots-slice8';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Canon, read straight off disk. The comparison below is against THIS, not
   against a string typed into the prover — a prover that carries its own copy
   of the text grades itself. */
const CANON = JSON.parse(readFileSync('src/canon/oath-of-the-hearth.json', 'utf8'));
const ERRATA = Object.fromEntries(CANON.errata.map((e) => [e.id, e]));
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/* The six live for Nix at level 8, from `errata.test.ts`'s corpus assertion.
   Named rather than recomputed: recomputing them here would grade the prover's
   copy of `scopeErrata` instead of the app's. */
const LIVE = ['HEARTH-03', 'HEARTH-04', 'HEARTH-05', 'HEARTH-06', 'HEARTH-07', 'HEARTH-08'];

const PALADIN_AT_8 = {
  layOnHands: { max: 5 * 8, current: 5 * 8 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

const BAND = 'section[aria-label="Rules flags on your sheet"]';
const errors = [];
const browser = await chromium.launch();

async function openApp() {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
    reducedMotion: 'reduce',
  });

  await ctx.addInitScript(
    ([id, seedJson, combatJson]) => {
      localStorage.setItem('codex-character-' + id, seedJson);
      localStorage.setItem('codex-combat-' + id, combatJson);
      localStorage.setItem('codex-active-id', id);
      if (!localStorage.getItem('codex-roster')) {
        const seed = JSON.parse(seedJson);
        localStorage.setItem('codex-roster', JSON.stringify([
          { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
            updatedAt: '2026-08-16T00:00:00.000Z' },
        ]));
      }
    },
    [NIX.id, JSON.stringify({ ...NIX, paladinResources: PALADIN_AT_8 }), IN_COMBAT],
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

/** What the band says about itself, open or shut. */
const readBand = (page, sel) => page.evaluate((s) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const band = document.querySelector(s);
  if (!band) return null;
  const head = band.querySelector('button[aria-expanded]');

  /* Each live erratum's card, read as it is PAINTED. `problem` is located by
     its own box rather than by index so a re-order cannot silently pass. */
  const rows = [...band.querySelectorAll('li')].map((li) => {
    const spans = [...li.querySelectorAll('span')].map(txt);
    const id = spans.find((t) => /^HEARTH-\d+$/.test(t)) ?? null;
    const ps = [...li.querySelectorAll('p')];
    const boxes = ps.map((p) => {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
      return {
        text: txt(p),
        painted: r.width > 0 && r.height > 0,
        clamped: !!clamp && clamp !== 'none',
        overflowing: p.scrollHeight > p.clientHeight + 1,
      };
    });
    const group = li.querySelector('[role="group"]');
    return {
      id,
      severity: spans.find((t) => /^(breaking|high|medium|low)$/.test(t)) ?? null,
      levelNote: spans.find((t) => /^level /.test(t)) ?? null,
      boxes,
      /* The control must be here WITHOUT opening the card. A caption reading
         "6 still unanswered" that costs six taps to act on is a nag. */
      rulingGroup: group ? group.getAttribute('aria-label') : null,
      pressed: group
        ? txt([...group.querySelectorAll('button')].find((b) => b.getAttribute('aria-pressed') === 'true'))
        : null,
      headings: [...li.querySelectorAll('span')].map(txt).filter((t) => /^(What's wrong|Why it went wrong|Canon's recommended fix|A narrower fix canon also offers|What this app does about it|How it compares to official rules|Canon's assessment|What makes it less bad|Also worth knowing)$/.test(t)),
      expanded: li.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded') ?? null,
    };
  });

  return {
    present: true,
    caption: txt(head),
    open: head?.getAttribute('aria-expanded') ?? null,
    rows,
    laterFold: txt([...band.querySelectorAll('span')].find((el) => /arrive as you level/.test(txt(el)))),
  };
}, sel);

/** Finding Q, swept over the band's own subtree.
 *
 *  Takes canon's strings so it can answer the question that matters. The first
 *  run flagged one ellipsis and it turned out to be CANON'S: HEARTH-03's
 *  recommendedFix quotes a suggested rules sentence and elides its tail —
 *  "...expend one use of your Channel Divinity...". Painting that faithfully is
 *  correct; deleting it would falsify the source. So the invariant this phase
 *  actually holds is not "no ellipsis on the glass", it is "no ellipsis THE APP
 *  INTRODUCED" — and the two are told apart by whether the painted string is
 *  character-identical to a string canon wrote. A clamp would leave a prefix. */
const clipSweep = (page, sel, canonStrings) => page.evaluate(([s, canon]) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const known = new Set(canon);
  const clipped = [], clamps = [], ellipses = [], canonEllipses = [];
  const root = document.querySelector(s);
  if (!root) return { clipped, clamps, ellipses, canonEllipses, swept: 0 };
  let swept = 0;

  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    swept++;
    const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    if (clamp && clamp !== 'none') clamps.push(`${el.tagName.toLowerCase()} line-clamp:${clamp} «${txt(el).slice(0, 44)}»`);
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      clamps.push(`${el.tagName.toLowerCase()} text-overflow:ellipsis CUTTING «${txt(el).slice(0, 44)}»`);
    }
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') continue;
    if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1 && el.children.length === 0) {
      clipped.push(`${el.tagName.toLowerCase()} h ${el.scrollHeight}>${el.clientHeight} «${txt(el).slice(0, 44)}»`);
    }
  }
  for (const el of root.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = txt(el);
    if (!/…|\S\.\.\./.test(t)) continue;
    /* Canon wrote it → faithful. Anything else → the app cut a string, which is
       the exact fault this whole phase exists to kill. */
    (known.has(t) ? canonEllipses : ellipses).push(`${el.tagName.toLowerCase()} «${t.slice(0, 60)}»`);
  }
  return { clipped, clamps, ellipses, canonEllipses, swept };
}, [sel, canonStrings]);

const readStorage = (page) => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

async function scrollTo(page, sel) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
  await page.waitForTimeout(300);
}

/** Put the band in a KNOWN state rather than toggling it blindly.
 *
 *  The first run of this prover failed here, and the failure was the prover's:
 *  it clicked "Rules flags" after the reload to re-open the band, but the band
 *  was ALREADY open — `useCollapsible` had remembered the open from case B in
 *  `codex-ui-*`. The click closed it, and the later fold and the clip sweep then
 *  measured a folded band and reported nothing. A toggle is not an "open". */
async function setBandOpen(page, want) {
  const head = `${BAND} > button[aria-expanded]`;
  const now = await page.getAttribute(head, 'aria-expanded');
  if (String(want) !== now) {
    await page.click(head);
    await page.waitForTimeout(400);
  }
  return page.getAttribute(head, 'aria-expanded');
}

/** Reset the write log and hand back what it held. */
const drainWrites = (page) => page.evaluate(() => {
  const w = [...new Set(window.__writes)].sort();
  window.__writes = [];
  return w;
});

// ── A — the band as the tab opens: one line, and it states the work ──────────
const { ctx, page } = await openApp();

const loadWrites = await drainWrites(page);
const storageBefore = await readStorage(page);

const closed = await readBand(page, BAND);
if (closed) await scrollTo(page, BAND);
await page.screenshot({ path: `${OUT}/A-band-closed.png` });

// ── B — opened: six faults, painted whole, compared to canon on disk ─────────
await page.click(`${BAND} > button[aria-expanded]`);
await page.waitForTimeout(400);
await scrollTo(page, BAND);
const open = await readBand(page, BAND);
await page.screenshot({ path: `${OUT}/B-band-open.png`, fullPage: true });

/* The comparison that matters. For each live erratum, is canon's `problem`
   string present on the glass IN FULL — same characters, same length? A clamp
   would leave the text in the DOM and the box short; a `.slice()` would leave
   the box right and the text short. Both are caught here, from opposite ends. */
const faults = LIVE.map((id) => {
  const row = (open?.rows ?? []).find((r) => r.id === id);
  const want = squash(ERRATA[id]?.problem);
  const box = row?.boxes?.find((b) => b.text === want)
    ?? row?.boxes?.find((b) => want.startsWith(b.text.slice(0, 40)))
    ?? null;
  return {
    id,
    found: !!row,
    canonChars: want.length,
    paintedChars: box ? box.text.length : 0,
    exact: !!box && box.text === want,
    clamped: !!box?.clamped,
    overflowing: !!box?.overflowing,
  };
});

// ── C — the fix is one tap away; the answer never was ────────────────────────
const beforeTap = open?.rows?.find((r) => r.id === 'HEARTH-03');
await page.click(`${BAND} li:has-text("HEARTH-03") button[aria-expanded]`);
await page.waitForTimeout(350);
const afterTap = (await readBand(page, BAND))?.rows?.find((r) => r.id === 'HEARTH-03');
await scrollTo(page, BAND);
await page.screenshot({ path: `${OUT}/C-one-erratum-expanded.png`, fullPage: true });

const h03 = ERRATA['HEARTH-03'];
const expanded = await page.evaluate((s) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const li = [...document.querySelectorAll(`${s} li`)].find((el) => /HEARTH-03/.test(txt(el)));
  return li ? [...li.querySelectorAll('p')].map(txt) : [];
}, BAND);

// ── D — the answer survives a reload ─────────────────────────────────────────
await page.click(`${BAND} [aria-label="Ruling for HEARTH-03"] button:has-text("Canon's fix")`);
await page.waitForTimeout(300);
const afterRuling = await readBand(page, BAND);
await scrollTo(page, BAND);
await page.screenshot({ path: `${OUT}/D-ruling-recorded.png` });

const errataKeyWritten = await drainWrites(page);
const storedRuling = await page.evaluate((id) => localStorage.getItem('codex-errata-' + id), NIX.id);

await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
/* The reload re-mounts the tab, so the two pre-slice-8 mount effects fire again
   (finding AR — slice 10 owns them). Drained into their OWN bucket: leaving them
   in the interaction window would grade slice 8 for a write it did not make,
   which is how the first run of this prover failed case F. */
const reloadWrites = await drainWrites(page);
const afterReload = await readBand(page, BAND);

// ── E — the two surfaces agree ───────────────────────────────────────────────
/* Hearthfire Manifest is the ONE turn option of Nix's fourteen that reaches any
   erratum (measured in `OptionDetailSheet.test.tsx`). It reaches four, three of
   which are still unanswered — so this sheet shows both readings at once, which
   is the strongest form of the claim. */
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
const sheetRow = 'button[aria-label="Hearthfire Manifest — details"]';
let sheet = null;
if (await page.$(sheetRow)) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sheetRow);
  await page.waitForTimeout(150);
  await page.click(sheetRow);
  await page.waitForSelector('div[role="dialog"][aria-label="Hearthfire Manifest"]', { timeout: 4000 });
  await page.waitForTimeout(350);
  sheet = await page.evaluate(() => {
    const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const panel = document.querySelector('div[role="dialog"][aria-label="Hearthfire Manifest"]');
    const body = txt(panel);
    return {
      followsCanon: /Your table follows canon's fix/.test(body),
      unanswered: (body.match(/not ruled on yet/g) ?? []).length,
      erratumCount: Number((body.match(/Canon lists (\d+) errat/) ?? [])[1] ?? 0),
    };
  });
  await page.screenshot({ path: `${OUT}/E-sheet-shows-the-ruling.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

// ── the "later" fold, and the whole-band clip sweep ──────────────────────────
/* The sweep is only worth running over the band at its LARGEST — every live card
   open, one card's blocks expanded, and the later fold down. A sweep of a folded
   band measures five elements and passes by measuring nothing. */
const bandStateAfterReload = await setBandOpen(page, true);
await page.click(`${BAND} li:has-text("HEARTH-03") button[aria-expanded]`);
await page.waitForTimeout(300);
await page.click(`${BAND} button:has-text("arrive as you level")`);
await page.waitForTimeout(350);
const withLater = await readBand(page, BAND);
await scrollTo(page, BAND);
await page.screenshot({ path: `${OUT}/F-later-errata.png`, fullPage: true });

/* Every string canon wrote, squashed the same way the sweep squashes the DOM.
   Read off disk, so a canon edit re-grades the app rather than the prover. */
const CANON_STRINGS = CANON.errata.flatMap((e) =>
  Object.values(e).filter((v) => typeof v === 'string').map(squash));
const CLIP = await clipSweep(page, BAND, CANON_STRINGS);
const writes = [...new Set([...errataKeyWritten, ...(await drainWrites(page))])].sort();
const storageAfter = await readStorage(page);
await ctx.close();
await browser.close();

/* Which stored values moved. `codex-ui-` is excluded because remembering a fold
   is the feature; `codex-errata-` is excluded because recording a ruling is what
   this slice is FOR and case D grades it separately. Anything else moving means
   reading the tab changed the character. */
const changedValues = [...new Set([...Object.keys(storageBefore), ...Object.keys(storageAfter)])]
  .filter((k) => !k.startsWith('codex-ui-') && !k.startsWith('codex-errata-'))
  .filter((k) => storageBefore[k] !== storageAfter[k])
  .sort();

// ── the report ──────────────────────────────────────────────────────────────
console.log(`\nSLICE 8 PROOF — ${BASE}\n`);
console.log(`── the band, closed`);
console.log(`   present:  ${closed?.present ? 'yes' : 'NO'}`);
console.log(`   caption:  «${closed?.caption ?? '—'}»`);
console.log(`   collapsed: ${closed?.open === 'false' ? 'yes' : `NO (aria-expanded=${closed?.open})`}`);
console.log(`   rows painted while closed: ${closed?.rows.length ?? 0}`);

console.log(`\n── the six live errata, opened`);
console.log(`   caption:  «${open?.caption ?? '—'}»`);
for (const f of faults) {
  console.log(`   ${f.exact && !f.clamped && !f.overflowing ? 'ok' : '✗ '}  ${f.id}  ` +
    `canon ${String(f.canonChars).padStart(4)}ch → painted ${String(f.paintedChars).padStart(4)}ch` +
    `${f.clamped ? '  CLAMPED' : ''}${f.overflowing ? '  BOX TOO SMALL' : ''}${f.found ? '' : '  NO ROW'}`);
}
console.log(`   severities: [${(open?.rows ?? []).map((r) => r.severity).join(', ')}]`);
console.log(`   levels:     [${(open?.rows ?? []).map((r) => r.levelNote).join(' | ')}]`);
console.log(`   ruling controls reachable without expanding a card: ` +
  `${(open?.rows ?? []).filter((r) => r.rulingGroup).length} of ${open?.rows.length ?? 0}`);

console.log(`\n── canon's fix, one tap away`);
console.log(`   before the tap, HEARTH-03 painted headings: [${(beforeTap?.headings ?? []).join(', ') || 'none'}]`);
console.log(`   after  the tap, HEARTH-03 painted headings: [${(afterTap?.headings ?? []).join(', ') || 'none'}]`);
console.log(`   recommendedFix on the glass, whole: ` +
  `${expanded.some((t) => t === squash(h03?.recommendedFix)) ? 'yes' : 'NO'}`);
console.log(`   appAction on the glass, whole:      ` +
  `${expanded.some((t) => t === squash(h03?.appAction)) ? 'yes' : 'NO'}`);

console.log(`\n── the answer, and whether it survives a reload`);
console.log(`   caption after ruling:  «${afterRuling?.caption ?? '—'}»`);
console.log(`   pressed after ruling:  ${afterRuling?.rows.find((r) => r.id === 'HEARTH-03')?.pressed ?? '—'}`);
console.log(`   keys written by the tap: [${errataKeyWritten.join(', ') || 'none'}]`);
console.log(`   stored bytes:            ${storedRuling ?? 'NOTHING WAS STORED'}`);
console.log(`   caption after reload:  «${afterReload?.caption ?? '—'}»`);
console.log(`   pressed after reload:  ${afterReload?.rows.find((r) => r.id === 'HEARTH-03')?.pressed ?? '—'}`);

console.log(`\n── the detail sheet, reading the same ruling`);
console.log(`   ${sheet ? JSON.stringify(sheet) : 'the Hearthfire Manifest row was not on the tab'}`);

console.log(`\n── what arrives later`);
console.log(`   band came back from the reload: aria-expanded=${bandStateAfterReload}`);
console.log(`   fold:  «${withLater?.laterFold ?? '—'}»`);
console.log(`   rows once opened: ${withLater?.rows.length ?? 0} (six live + the later ones)`);

console.log(`\n── finding Q, swept over the band`);
console.log(`   elements measured: ${CLIP.swept}`);
console.log(`   line-clamp / cutting ellipsis: ${CLIP.clamps.length}`);
for (const c of CLIP.clamps.slice(0, 6)) console.log(`      ${c}`);
console.log(`   boxes smaller than their text: ${CLIP.clipped.length}`);
for (const c of CLIP.clipped.slice(0, 6)) console.log(`      ${c}`);
console.log(`   ellipses THE APP introduced:   ${CLIP.ellipses.length}`);
for (const c of CLIP.ellipses.slice(0, 6)) console.log(`      ${c}`);
console.log(`   ellipses CANON wrote, kept:    ${CLIP.canonEllipses.length}`);
for (const c of CLIP.canonEllipses.slice(0, 6)) console.log(`      ${c}`);

console.log(`\n── storage`);
console.log(`   written on load, before any tap:  [${loadWrites.join(', ') || 'none'}]`);
console.log(`   written by the reload's re-mount: [${reloadWrites.join(', ') || 'none'}]`);
console.log(`   written by TAPS, both windows:    [${writes.join(', ') || 'none'}]`);
console.log(`   stored values that MOVED:        [${changedValues.join(', ') || 'none'}]`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify(
  { closed, open, faults, beforeTap, afterTap, expanded, afterRuling, storedRuling, afterReload,
    sheet, withLater, CLIP, loadWrites, writes, changedValues, errors },
  null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);

// A — it is on the tab, it is folded, and the fold states the work.
if (!closed?.present) failures.push('A: there is no Rules flags band on the Play tab');
if (closed?.open !== 'false') failures.push(`A: the band did not start collapsed (aria-expanded=${closed?.open})`);
if (closed?.rows.length) failures.push(`A: the collapsed band painted ${closed.rows.length} rows — the fold hides nothing`);
if (!/6 unanswered/.test(closed?.caption ?? '')) {
  failures.push(`A: the closed caption does not state the outstanding work: «${closed?.caption}» — a bare count is a number you learn to ignore`);
}

// B — the six are there, worst first, and canon's words are whole.
const missing = faults.filter((f) => !f.found);
if (missing.length) failures.push(`B: ${missing.length} live erratum/a have no row: [${missing.map((f) => f.id).join(', ')}]`);
const cut = faults.filter((f) => f.found && !f.exact);
if (cut.length) {
  failures.push(`B: canon's fault text does not reach the glass whole: ` +
    cut.map((f) => `${f.id} ${f.canonChars}→${f.paintedChars}ch`).join(', '));
}
const clamped = faults.filter((f) => f.clamped || f.overflowing);
if (clamped.length) failures.push(`B: ${clamped.length} fault(s) are clamped or overflow their box: [${clamped.map((f) => f.id).join(', ')}]`);
if ((open?.rows ?? [])[0]?.severity !== 'high') {
  failures.push(`B: the band does not lead with the worst live erratum (leads with «${(open?.rows ?? [])[0]?.severity}»)`);
}
if (!(open?.rows ?? []).some((r) => /your sheet/.test(r.levelNote ?? ''))
  || !(open?.rows ?? []).some((r) => /canon/.test(r.levelNote ?? ''))) {
  failures.push('B: the band does not say where each level came from — the sheet and canon can disagree and the reader is entitled to know which answered');
}
const noControl = (open?.rows ?? []).filter((r) => !r.rulingGroup);
if (noControl.length) failures.push(`B: ${noControl.length} row(s) offer no ruling control without first being expanded`);

// C — the fix is behind exactly one tap, and arrives whole.
if ((beforeTap?.headings ?? []).some((h) => /recommended fix|app does/i.test(h))) {
  failures.push('C: canon\'s fix is painted before the card is tapped — the band is five screens of prose on open');
}
if (!(afterTap?.headings ?? []).includes("Canon's recommended fix")) {
  failures.push(`C: tapping the card did not reveal canon's fix (headings: [${(afterTap?.headings ?? []).join(', ')}])`);
}
if (!expanded.some((t) => t === squash(h03?.recommendedFix))) {
  failures.push("C: canon's recommendedFix is not on the glass character-for-character");
}
if (!expanded.some((t) => t === squash(h03?.appAction))) {
  failures.push("C: canon's appAction is not on the glass character-for-character");
}

// D — the answer is recorded, and it survives.
if (afterRuling?.rows.find((r) => r.id === 'HEARTH-03')?.pressed !== "Canon's fix") {
  failures.push('D: tapping the ruling did not mark it as the answer');
}
if (!/5 unanswered/.test(afterRuling?.caption ?? '')) {
  failures.push(`D: the caption did not count down after a ruling: «${afterRuling?.caption}»`);
}
if (!errataKeyWritten.some((k) => k.startsWith('codex-errata-'))) {
  failures.push(`D: no codex-errata-* key was written: [${errataKeyWritten.join(', ') || 'none'}]`);
}
if (!storedRuling || !/HEARTH-03/.test(storedRuling)) {
  failures.push(`D: the ruling is not in localStorage: ${storedRuling ?? 'null'}`);
}
if (afterReload?.rows.find((r) => r.id === 'HEARTH-03')?.pressed !== "Canon's fix") {
  failures.push('D: the ruling did NOT survive a reload — which is the whole point of storing it');
}

// E — the two surfaces agree.
if (!sheet) failures.push('E: the Hearthfire Manifest row could not be opened, so the sheet could not be read');
else {
  if (sheet.erratumCount !== 4) failures.push(`E: the sheet reports ${sheet.erratumCount} errata on Hearthfire Manifest, expected 4`);
  if (!sheet.followsCanon) failures.push('E: the ruling recorded in the band does not appear in the detail sheet — the two surfaces disagree about the same rule');
  if (sheet.unanswered !== 3) failures.push(`E: the sheet marks ${sheet.unanswered} of the other three as unanswered`);
}

// The later fold.
if (!/6 more arrive as you level/.test(withLater?.laterFold ?? '')) {
  failures.push(`E: the "arrives later" fold does not name six: «${withLater?.laterFold}»`);
}

// Finding Q, over the band.
if (CLIP.swept < 40) failures.push(`Q: only ${CLIP.swept} elements were measured — the band was not open, so the sweep swept nothing`);
if (CLIP.clamps.length) failures.push(`Q: ${CLIP.clamps.length} element(s) clamp or ellipsis their text: ${CLIP.clamps[0]}`);
if (CLIP.clipped.length) failures.push(`Q: ${CLIP.clipped.length} element(s) are smaller than the text they were handed: ${CLIP.clipped[0]}`);
if (CLIP.ellipses.length) {
  failures.push(`Q: ${CLIP.ellipses.length} ellipsis the app INTRODUCED — a string was cut: ${CLIP.ellipses[0]}`);
}
/* The counterweight: if canon's own ellipsis stops arriving, the sweep has gone
   blind or the app started rewriting canon's prose. Either way, not a pass. */
if (!CLIP.canonEllipses.length) {
  failures.push("Q: canon's own ellipsis (HEARTH-03's quoted rules text) is not on the glass — the app is editing canon, or the sweep is measuring nothing");
}

/* F — reading still changes nothing. Graded on the TAP windows only: the log is
   drained after the first load and again after the reload, so the two mount
   effects that predate this slice (finding AR — slice 10 owns them) are reported
   above rather than graded here. Two keys are allowed a tap — `codex-ui-` (the
   collapse map) and `codex-errata-` (this slice's whole purpose). Anything else
   means reading the tab spent a resource. */
const stray = writes.filter((k) => !k.startsWith('codex-ui-') && !k.startsWith('codex-errata-'));
if (stray.length) failures.push(`F: tapping around wrote keys it had no business writing: [${stray.join(', ')}]`);
if (changedValues.length) {
  failures.push(`F: reading the band CHANGED stored state: [${changedValues.join(', ')}] — recording a ruling spent something`);
}

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
