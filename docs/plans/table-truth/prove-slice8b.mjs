// Prove Table Truth slice 8b against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice8b.mjs [baseUrl]
//
// Slice 8 made canon's twelve errata readable and answerable. 8b makes ONE of
// those answers reach the point of use: the cloak's missing trigger. The law it
// is built on, and the thing this prover exists to measure:
//
//     A RULING CHANGES WHAT THE APP SAYS. IT NEVER CHANGES WHAT THE APP
//     COMPUTES.
//
// Both halves are browser claims, and neither is settled by the unit suite:
//
//   THE SAYS HALF. `ReactionsBand.test.tsx` proves the markup contains the
//   clause. Finding Q says that proves nothing about the glass — CSS-clipped
//   text still reports in full to a string renderer. Cases B and C read the WHEN
//   line and its attribution out of the LIVE DOM, and case F measures the whole
//   band geometrically for a clamp.
//
//   THE COMPUTES HALF, which is the one worth having. A unit test can only
//   assert the numbers it thought to name. This prover instead scrapes EVERY
//   numeric token painted on the Play tab outside the Rules-flags band, before
//   and after the ruling, and diffs the multisets. A ruling that quietly bumped
//   a save DC, a slot count, an HP total or a die anywhere on the tab shows up
//   as a diff nobody had to predict.
//
//   IT SURVIVES A RELOAD, and it is REVERSIBLE. Canon's HEARTH-01 forbids
//   implementing a fix *silently*; attributed, reversible and visible is the
//   conflict being presented. Case D reloads. Case E takes the ruling back and
//   requires the row to return to admitting the gap — an app that cannot undo a
//   house rule has not presented a conflict, it has picked a side.
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
const OUT = 'docs/plans/table-truth/_shots-slice8b';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Canon off disk, so the clause this prover expects is the clause canon wrote.
   A prover carrying its own copy of the string grades itself. */
const CANON = JSON.parse(readFileSync('src/canon/oath-of-the-hearth.json', 'utf8'));
const H03 = CANON.errata.find((e) => e.id === 'HEARTH-03');
/* The one trigger-shaped clause canon put in quotation marks, extracted here the
   same way `trigger.ts` extracts it — from canon's own quote marks, by shape.
   Duplicated deliberately: if the prover and the app ever disagree about what
   canon quoted, the prover fails, which is the correct direction to fail in. */
const CANON_CLAUSE = (() => {
  for (const field of [H03?.recommendedFix, H03?.narrowerAlternative, H03?.appAction]) {
    if (typeof field !== 'string') continue;
    for (const m of field.matchAll(/['‘“"]([^'’”"]{4,240})['’”"]/g)) {
      const c = m[1].trim();
      if (/^(?:when|if)\b/i.test(c)) return c;
    }
  }
  return null;
})();

const DM_WORDING = 'When you or an ally within 30 feet takes Fire damage';

const PALADIN_AT_7 = {
  layOnHands: { max: 5 * 7, current: 5 * 7 },
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

const FLAGS = 'section[aria-label="Rules flags on your sheet"]';
const REACTIONS = 'section[aria-label="Your reactions"]';
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
    /* LEVEL 7 — Marcus confirmed it on 2026-08-27. The nix.ts unit fixture says
       8 for branch coverage (a Paladin 8 has no 3rd slot tier, which is the only
       way to exercise that path); this prover runs the character he actually
       plays. `liveErrata` returns the identical six ids at both levels, which is
       why slice 8's proof stands unchanged. */
    [NIX.id, JSON.stringify({ ...NIX, level: 7, paladinResources: PALADIN_AT_7 }), IN_COMBAT],
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

/** The cloak's row, read as it is PAINTED.
 *
 *  The WHEN line is split across two pieces of type — the clause's own lead word
 *  as a label, then the remainder (see `splitTriggerLead`) — so it is read as
 *  the whole paragraph's text rather than by hunting for one span. */
const readCloak = (page) => page.evaluate((sel) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const band = document.querySelector(sel);
  if (!band) return null;
  const rows = [...band.querySelectorAll('li')];
  const li = rows.find((el) => /Flaming Cloak/.test(txt(el)));
  if (!li) return { present: false, rowCount: rows.length };
  const ps = [...li.querySelectorAll('p')].map((p) => {
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    return {
      text: txt(p),
      painted: r.width > 0 && r.height > 0,
      top: Math.round(r.top),
      clamped: !!clamp && clamp !== 'none',
      overflowing: p.scrollHeight > p.clientHeight + 1,
    };
  });
  return {
    present: true,
    rowCount: rows.length,
    whole: txt(li),
    /* Located by CONTENT, not by index: a row that grows a paragraph must not
       silently shift what this prover thinks it is reading. */
    /* Case-INSENSITIVE, and the reason is worth stating: a real trigger paints
       its own lead word, uppercased by `splitTriggerLead` — "WHEN". The unstated
       row paints a literal lowercase "when" and lets CSS uppercase it. Both are
       the WHEN line; a case-sensitive locator would report the unstated row as
       having none, which is the prover lying about the case it is grading. */
    when: ps.find((p) => /^(when|if)\b/i.test(p.text)) ?? null,
    attribution: ps.find((p) => /ruling|suggested fix/i.test(p.text)) ?? null,
    body: ps.find((p) => /temp HP/.test(p.text)) ?? null,
    flag: ps.find((p) => /Canon lists/.test(p.text)) ?? null,
    unstated: /not stated/.test(txt(li)),
  };
}, REACTIONS);

/** EVERY numeric token painted on the tab, outside the Rules-flags band.
 *
 *  This is the "computes" half, and it is deliberately not a list of numbers
 *  somebody thought to check. It walks every painted leaf, pulls every number
 *  out of it, and returns the multiset. The Rules-flags band is excluded because
 *  its caption ("6 · 5 unanswered") is SUPPOSED to count down — that is case D's
 *  claim, graded separately. Everything else on the Play tab is a computed value
 *  and must be character-identical either side of a ruling. */
const numbersOn = (page) => page.evaluate((skip) => {
  const skipRoot = document.querySelector(skip);
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.children.length) continue;
    if (skipRoot && skipRoot.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    /* An erratum id is a NAME, not a quantity. The first run of this prover
       failed here and the failure was the prover's: the attribution line the
       ruling adds reads "canon's suggested fix · HEARTH-03", and the sweep
       counted the "03" as a number that had appeared on the tab. It had — as
       part of a record's name. Stripped by the id's own shape, so every actual
       quantity on the tab is still compared. */
    const t = (el.textContent || '').replace(/HEARTH-\d+/g, '').replace(/\s+/g, ' ').trim();
    for (const m of t.matchAll(/\d+(?:d\d+)?(?:\.\d+)?/g)) out.push(m[0]);
  }
  return out.sort();
}, FLAGS);

/** Finding Q, swept over the reactions band. */
const clipSweep = (page, sel) => page.evaluate((s) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const clipped = [], clamps = [], ellipses = [];
  const root = document.querySelector(s);
  if (!root) return { clipped, clamps, ellipses, swept: 0 };
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
    if (!el.children.length && /…|\S\.\.\./.test(txt(el))) {
      ellipses.push(`${el.tagName.toLowerCase()} «${txt(el).slice(0, 60)}»`);
    }
  }
  return { clipped, clamps, ellipses, swept };
}, sel);

const readStorage = (page) => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

const drainWrites = (page) => page.evaluate(() => {
  const w = [...new Set(window.__writes)].sort();
  window.__writes = [];
  return w;
});

async function scrollTo(page, sel) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
  await page.waitForTimeout(300);
}

/** Put a band in a KNOWN state — see prove-slice8.mjs, where blind-toggling a
 *  band `useCollapsible` had already remembered CLOSED it and the sweep then
 *  measured nothing. */
async function setBandOpen(page, sel, want) {
  const head = `${sel} > button[aria-expanded]`;
  const now = await page.getAttribute(head, 'aria-expanded');
  if (String(want) !== now) {
    await page.click(head);
    await page.waitForTimeout(400);
  }
  return page.getAttribute(head, 'aria-expanded');
}

/** Record a ruling on HEARTH-03 in the Rules-flags band, then come back. */
async function rule(page, label) {
  await setBandOpen(page, FLAGS, true);
  await scrollTo(page, FLAGS);
  await page.click(`${FLAGS} [aria-label="Ruling for HEARTH-03"] button:has-text("${label}")`);
  await page.waitForTimeout(400);
}

// ── A — before: the row admits the gap, and points at where to close it ──────
const { ctx, page } = await openApp();
const loadWrites = await drainWrites(page);
const storageBefore = await readStorage(page);

await setBandOpen(page, REACTIONS, true);
await scrollTo(page, REACTIONS);
const before = await readCloak(page);
const numbersBefore = await numbersOn(page);
await page.screenshot({ path: `${OUT}/A-before-unstated.png` });

// ── B — canon's fix, chosen in the flags band ────────────────────────────────
await rule(page, "Canon's fix");
await page.screenshot({ path: `${OUT}/B-ruling-recorded.png` });
const rulingWrites = await drainWrites(page);
const storedRuling = await page.evaluate((id) => localStorage.getItem('codex-errata-' + id), NIX.id);

// ── C — after: the clause is on the row, and it is attributed ────────────────
await setBandOpen(page, REACTIONS, true);
await scrollTo(page, REACTIONS);
const afterCanon = await readCloak(page);
const numbersAfter = await numbersOn(page);
await page.screenshot({ path: `${OUT}/C-after-canon-ruling.png` });

/* THE COMPUTES HALF. Multiset diff, both directions — a number that appeared and
   a number that vanished are both the app having recomputed something. */
const bag = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const numberDrift = (() => {
  const a = bag(numbersBefore), b = bag(numbersAfter);
  const drift = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const was = a.get(k) ?? 0, now = b.get(k) ?? 0;
    if (was !== now) drift.push(`${k}: ${was}→${now}`);
  }
  return drift.sort();
})();

// ── D — it survives a reload ────────────────────────────────────────────────
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const reloadWrites = await drainWrites(page);
const bandAfterReload = await setBandOpen(page, REACTIONS, true);
await scrollTo(page, REACTIONS);
const afterReload = await readCloak(page);
await page.screenshot({ path: `${OUT}/D-survives-reload.png` });

// ── E — the DM's own words outrank canon's, verbatim ────────────────────────
await rule(page, 'My DM ruled');
await page.fill(`${FLAGS} textarea#dm-HEARTH-03`, DM_WORDING);
/* Committed on blur, not per keystroke — a sentence is forty writes to disk if
   every character saves. So the blur is the commit, and it has to be real. */
await page.click(`${FLAGS} > button[aria-expanded]`);
await page.waitForTimeout(400);
await setBandOpen(page, FLAGS, true);
await page.waitForTimeout(200);
await setBandOpen(page, REACTIONS, true);
await scrollTo(page, REACTIONS);
const afterDm = await readCloak(page);
await page.screenshot({ path: `${OUT}/E-dm-ruling.png` });

// ── F — and it is REVERSIBLE, which is what makes it not-silent ─────────────
await rule(page, 'Not asked yet');
await setBandOpen(page, REACTIONS, true);
await scrollTo(page, REACTIONS);
const afterUndo = await readCloak(page);
const numbersUndone = await numbersOn(page);
await page.screenshot({ path: `${OUT}/F-reverted.png` });

const CLIP = await clipSweep(page, REACTIONS);
const tapWrites = [...new Set([...rulingWrites, ...(await drainWrites(page))])].sort();
const storageAfter = await readStorage(page);
await ctx.close();
await browser.close();

const changedValues = [...new Set([...Object.keys(storageBefore), ...Object.keys(storageAfter)])]
  .filter((k) => !k.startsWith('codex-ui-') && !k.startsWith('codex-errata-'))
  .filter((k) => storageBefore[k] !== storageAfter[k])
  .sort();

// ── the report ──────────────────────────────────────────────────────────────
const line = (p) => (p ? `«${p.text}»${p.clamped ? ' CLAMPED' : ''}${p.overflowing ? ' BOX TOO SMALL' : ''}` : '—');

console.log(`\nSLICE 8b PROOF — ${BASE}`);
console.log(`canon's quoted clause, read off disk: «${CANON_CLAUSE ?? 'NONE FOUND'}»\n`);

console.log(`── A · before any ruling`);
console.log(`   reaction rows painted: ${before?.rowCount ?? 0}`);
console.log(`   WHEN:        ${line(before?.when)}`);
console.log(`   attribution: ${line(before?.attribution)}`);
console.log(`   what it does:${line(before?.body)}`);
console.log(`   numeric tokens on the tab: ${numbersBefore.length}`);

console.log(`\n── B/C · canon's fix, chosen`);
console.log(`   WHEN:        ${line(afterCanon?.when)}`);
console.log(`   attribution: ${line(afterCanon?.attribution)}`);
console.log(`   what it does:${line(afterCanon?.body)}`);
console.log(`   canon flag:  ${line(afterCanon?.flag)}`);
console.log(`   stored bytes: ${storedRuling ?? 'NOTHING WAS STORED'}`);

console.log(`\n── the law · a ruling changes what it SAYS, never what it COMPUTES`);
console.log(`   numeric tokens before: ${numbersBefore.length}   after: ${numbersAfter.length}`);
console.log(`   numbers that MOVED:    [${numberDrift.join(', ') || 'none'}]`);

console.log(`\n── D · after a reload`);
console.log(`   band came back: aria-expanded=${bandAfterReload}`);
console.log(`   WHEN:        ${line(afterReload?.when)}`);
console.log(`   attribution: ${line(afterReload?.attribution)}`);

console.log(`\n── E · the DM's own words`);
console.log(`   WHEN:        ${line(afterDm?.when)}`);
console.log(`   attribution: ${line(afterDm?.attribution)}`);

console.log(`\n── F · taken back`);
console.log(`   WHEN:        ${line(afterUndo?.when)}`);
console.log(`   attribution: ${line(afterUndo?.attribution)}`);
console.log(`   numbers vs the very start: [${(() => {
  const a = bag(numbersBefore), b = bag(numbersUndone);
  const d = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if ((a.get(k) ?? 0) !== (b.get(k) ?? 0)) d.push(`${k}: ${a.get(k) ?? 0}→${b.get(k) ?? 0}`);
  }
  return d.sort().join(', ') || 'none';
})()}]`);

console.log(`\n── finding Q, swept over the reactions band`);
console.log(`   elements measured: ${CLIP.swept}`);
console.log(`   line-clamp / cutting ellipsis: ${CLIP.clamps.length}`);
for (const c of CLIP.clamps.slice(0, 6)) console.log(`      ${c}`);
console.log(`   boxes smaller than their text: ${CLIP.clipped.length}`);
for (const c of CLIP.clipped.slice(0, 6)) console.log(`      ${c}`);
console.log(`   ellipses anywhere:             ${CLIP.ellipses.length}`);
for (const c of CLIP.ellipses.slice(0, 6)) console.log(`      ${c}`);

console.log(`\n── storage`);
console.log(`   written on load, before any tap:  [${loadWrites.join(', ') || 'none'}]`);
console.log(`   written by the reload's re-mount: [${reloadWrites.join(', ') || 'none'}]`);
console.log(`   written by TAPS:                  [${tapWrites.join(', ') || 'none'}]`);
console.log(`   stored values that MOVED:         [${changedValues.join(', ') || 'none'}]`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify(
  { CANON_CLAUSE, before, afterCanon, afterReload, afterDm, afterUndo, numbersBefore,
    numbersAfter, numberDrift, storedRuling, CLIP, loadWrites, reloadWrites, tapWrites,
    changedValues, errors },
  null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);
if (!CANON_CLAUSE) failures.push('canon no longer quotes a trigger-shaped clause on HEARTH-03 — this prover is grading nothing');

// A — the gap is admitted, and the row says where to close it.
if (!before?.present) failures.push('A: there is no Flaming Cloak row in the reactions band');
if (!before?.unstated) failures.push(`A: the row does not admit the missing trigger before a ruling: ${line(before?.when)}`);
if (!/record one in Rules flags/.test(before?.when?.text ?? '')) {
  /* On the WHEN LINE, not merely somewhere in the row. The notice is the answer
     to "when can I use this" — filed anywhere else it is a footnote, and off
     your turn a footnote is not read. */
  failures.push(`A: the unstated row does not point at where the answer goes, on the line that asked the question: ${line(before?.when)}`);
}
if (before?.attribution) failures.push(`A: an attribution line is painted with NO ruling behind it: ${line(before.attribution)}`);

// B/C — the clause arrives, whole, attributed, in the right place.
const wantWhen = CANON_CLAUSE ? CANON_CLAUSE.replace(/^(when|if)\b[,:]?\s+/i, (m) => m.trim().toUpperCase() + ' ') : '';
if (afterCanon?.when?.text !== wantWhen) {
  failures.push(`C: the WHEN line is not canon's clause character-for-character — want «${wantWhen}», got ${line(afterCanon?.when)}`);
}
if (!afterCanon?.attribution) {
  failures.push('C: the clause arrived with NO attribution — indistinguishable from a trigger the app invented, which is what slice 6 refused to ship');
} else if (!/canon's suggested fix/i.test(afterCanon.attribution.text) || !/HEARTH-03/.test(afterCanon.attribution.text)) {
  failures.push(`C: the attribution does not name both the source and the record: ${line(afterCanon.attribution)}`);
}
if (afterCanon?.when && afterCanon.attribution && afterCanon.body) {
  if (!(afterCanon.when.top <= afterCanon.attribution.top && afterCanon.attribution.top <= afterCanon.body.top)) {
    failures.push('C: WHEN / attribution / what-it-does are not painted in that order — off your turn the trigger is the only thing that matters and it must come first');
  }
}
if (afterCanon?.unstated) failures.push('C: the row still says "not stated" after a ruling was recorded');
if (!storedRuling || !/HEARTH-03/.test(storedRuling)) failures.push(`C: the ruling is not in localStorage: ${storedRuling ?? 'null'}`);

// THE LAW — nothing computed moved.
if (numbersBefore.length < 20) {
  failures.push(`the law: only ${numbersBefore.length} numeric tokens were found on the tab — the sweep is measuring nothing, so "no number moved" is vacuous`);
}
if (numberDrift.length) {
  failures.push(`THE LAW IS BROKEN: recording a ruling moved ${numberDrift.length} number(s) on the tab: [${numberDrift.join(', ')}]`);
}
if (afterCanon?.body?.text !== before?.body?.text) {
  failures.push(`the law: what the cloak DOES changed with the ruling — «${before?.body?.text}» → «${afterCanon?.body?.text}»`);
}
if (afterCanon?.flag?.text !== before?.flag?.text) {
  failures.push(`the law: the ⚑ errata count changed with the ruling — canon still holds four whether or not one is answered`);
}

// D — it survives.
if (afterReload?.when?.text !== wantWhen) {
  failures.push(`D: the ruling did NOT survive a reload — the WHEN line came back as ${line(afterReload?.when)}`);
}
if (!afterReload?.attribution) failures.push('D: the attribution did not survive the reload');

// E — the DM outranks canon, verbatim.
const wantDm = DM_WORDING.replace(/^(when|if)\b[,:]?\s+/i, (m) => m.trim().toUpperCase() + ' ');
if (afterDm?.when?.text !== wantDm) {
  failures.push(`E: the DM's words did not reach the row verbatim — want «${wantDm}», got ${line(afterDm?.when)}`);
}
if (!/your DM's ruling/i.test(afterDm?.attribution?.text ?? '')) {
  failures.push(`E: the row does not name the DM as the source: ${line(afterDm?.attribution)}`);
}

// F — and it is reversible, which is what makes it "presented" and not "silent".
if (!afterUndo?.unstated) {
  failures.push(`F: taking the ruling back did not return the row to admitting the gap: ${line(afterUndo?.when)} — a house rule that cannot be undone is one the app picked a side on`);
}
if (afterUndo?.attribution) failures.push(`F: an attribution survived the ruling being withdrawn: ${line(afterUndo.attribution)}`);

// Finding Q, over the band at its largest.
if (CLIP.swept < 20) failures.push(`Q: only ${CLIP.swept} elements were measured — the reactions band was not open`);
if (CLIP.clamps.length) failures.push(`Q: ${CLIP.clamps.length} element(s) clamp or ellipsis their text: ${CLIP.clamps[0]}`);
if (CLIP.clipped.length) failures.push(`Q: ${CLIP.clipped.length} element(s) are smaller than the text they were handed: ${CLIP.clipped[0]}`);
if (CLIP.ellipses.length) failures.push(`Q: ${CLIP.ellipses.length} ellipsis on the reaction rows: ${CLIP.ellipses[0]}`);

// Storage — reading and ruling still spend nothing.
const stray = tapWrites.filter((k) => !k.startsWith('codex-ui-') && !k.startsWith('codex-errata-'));
if (stray.length) failures.push(`storage: tapping around wrote keys it had no business writing: [${stray.join(', ')}]`);
if (changedValues.length) failures.push(`storage: recording a ruling CHANGED stored state: [${changedValues.join(', ')}]`);

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
