// Prove Table Truth slice 7 against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice7.mjs [baseUrl]
//
// Slice 7 is the slice where the "…" dies, and that sentence is a claim about
// PIXELS. Five things below cannot be settled anywhere but a browser:
//
//   FINDING Q, THE REASON THIS FILE EXISTS. `OptionDetailSheet.test.tsx` proves
//   there is no ellipsis in the MARKUP. That is not the same claim. The three
//   surviving truncations in this app are CSS `line-clamp-2` — the string is
//   whole in the DOM and cut on the glass, and a string-renderer test reports it
//   complete. So every element in the sheet is asked whether the layout engine
//   clipped it: overflow vs scroll size, plus the computed clamp itself.
//
//   FINDING X, THE LINE COUNT. Where a line count is needed it is DISTINCT
//   ROUNDED TOPS from a Range, never rect count — a rect is drawn per inline
//   FRAGMENT, so a <li> with an inline <b> lead reports two "lines" while
//   painting one. Band 4's bullets are exactly that shape.
//
//   ONLY A BROWSER CAN SETTLE "THE TAP OPENS THE RIGHT THING". Two surfaces now
//   open this sheet — the turn list and the reactions band — and they hand it
//   two differently-built options. Case D taps a reaction, which is the path
//   through `ReactionRow.option`, the field slice 7 added.
//
//   ONLY THE RUNNING APP CAN SETTLE "HOW MUCH OF THE TURN CAN REACH IT". Case F
//   is a census, and it is the case that found this slice's headline problem:
//   the Play tab renders `turn.ranked` and the reactions band, and NOTHING
//   renders `turn.mutex`. Every one of Nix's seven slot-spending options is in
//   `mutex`. So the sheet is real, correct and tested — and the one-slot-per-
//   turn rule box inside it cannot be reached from the screen at all. The
//   census is PINNED rather than merely printed, so the number cannot shrink
//   quietly while slice 9 builds the route.
//
//   AND THE STANDING CLAIM OF THIS PHASE: the surface writes nothing on its own.
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
const OUT = 'docs/plans/table-truth/_shots-slice7';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

const PALADIN_AT_8 = {
  layOnHands: { max: 5 * 8, current: 5 * 8 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

const ROUND = 3;
const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: ROUND,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

/* THE SPENT SLOT IS NOT A FIELD ON CombatState — it is derived from the LOG,
 * per round (compose.ts:164 → economy.ts spellSlotSpentThisTurn). Writing a
 * `spellSlotUsedThisTurn: true` into the combat bytes, which is what the first
 * draft of this prover did, changes nothing and PASSES nothing: it just seeds
 * an unread field. The only honest way to put the app in that state is to give
 * it the log entry a real cast would have written. */
const SLOT_SPENT_LOG = JSON.stringify([
  {
    round: ROUND,
    label: 'Divine Smite',
    spellSlotLevel: 1,
    event: { type: 'takeOption', option: { id: 'spell-divine-smite', name: 'Divine Smite' } },
    restore: { combat: JSON.parse(IN_COMBAT) },
  },
]);

const errors = [];
const browser = await chromium.launch();

async function openApp({ log = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
    reducedMotion: 'reduce',   // the sheet's spring must not race the measurement
  });

  await ctx.addInitScript(
    ([id, seedJson, combatJson, logJson]) => {
      if (!localStorage.getItem('codex-character-' + id)) {
        localStorage.setItem('codex-character-' + id, seedJson);
      }
      if (!localStorage.getItem('codex-combat-' + id)) {
        localStorage.setItem('codex-combat-' + id, combatJson);
      }
      if (logJson) localStorage.setItem('codex-combat-log-' + id, logJson);
      localStorage.setItem('codex-active-id', id);
      if (!localStorage.getItem('codex-roster')) {
        const seed = JSON.parse(seedJson);
        localStorage.setItem('codex-roster', JSON.stringify([
          { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
            updatedAt: '2026-08-16T00:00:00.000Z' },
        ]));
      }
    },
    [NIX.id, JSON.stringify({ ...NIX, paladinResources: PALADIN_AT_8 }), IN_COMBAT, log],
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

/** What the Play tab offers to open — and how much of the turn it does NOT. */
const census = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const labels = (sel) =>
    [...document.querySelectorAll(`${sel} li button[aria-label$="— details"]`)]
      .map((b) => b.getAttribute('aria-label'));

  const turnSection = document.querySelector('section[aria-label="Your turn options"]');
  const reactSection = document.querySelector('section[aria-label="Your reactions"]');

  /* The app's own count of what it is NOT showing — "8 more … are in the
     sections below". Read off the screen rather than recomputed here, so the
     census is the app's arithmetic and not the prover's. */
  const elsewhere = Number(
    (txt(turnSection).match(/(\d+)\s+more\b/) ?? [])[1] ?? 0,
  );
  const rankedRows = turnSection?.querySelectorAll('li').length ?? 0;
  const reactionRows = reactSection?.querySelectorAll('li').length ?? 0;

  return {
    turn: labels('section[aria-label="Your turn options"]'),
    reactions: labels('section[aria-label="Your reactions"]'),
    rankedRows,
    reactionRows,
    elsewhere,
    total: rankedRows + reactionRows + elsewhere,
    /* A chevron with nowhere to go would be the half-built control the
       guardrails forbid; a tap with no chevron is an invisible affordance. */
    chevrons: [...document.querySelectorAll(
      'section[aria-label="Your turn options"] li, section[aria-label="Your reactions"] li',
    )].filter((li) => (li.textContent || '').includes('▸')).length,
  };
});

/** Everything slice 7 claims about the OPEN sheet, read off the paint.
 *
 *  THE PANEL IS FOUND BY ITS OWN LABEL, and the first run of this prover is
 *  why. `ActionMenu` — one of the competing menus slice 9 retires — is mounted
 *  on the Play tab AT ALL TIMES with `role="dialog" aria-modal="true"`, parked
 *  off-screen at y=844. A `querySelector` for the role found IT, six times, and
 *  reported the detail sheet as empty. Every "band is empty" failure in that
 *  run was a measurement of the wrong element.
 *
 *  It also means a permanently-mounted aria-modal dialog is sitting in the
 *  accessibility tree of the Play tab claiming the rest of the page is inert.
 *  That is slice 9's problem, recorded here because this is where it was seen. */
const readSheet = (page, expected) => page.evaluate((label) => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  const panel = [...document.querySelectorAll('div[role="dialog"][aria-modal="true"]')]
    .find((d) => d.getAttribute('aria-label') === label);
  if (!panel) return { open: false, clipped: [], clamps: [], facts: [], rolls: [], tactics: [], all: '' };

  /* THE CLIP TEST — finding Q, made geometric.
   *
   * An element is CLIPPED when the box it was given is smaller than the content
   * it was handed AND it is not allowed to scroll. `line-clamp` and
   * `overflow:hidden` both show up here; a string cut in the MODEL does not,
   * which is why the markup test and this one are both required and neither is
   * sufficient. The panel is legitimately `overflow-y-auto`, so scrollables are
   * excluded — a scrollbar is not a truncation. */
  const clipped = [];
  const clamps = [];
  for (const el of panel.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    if (clamp && clamp !== 'none') clamps.push(`${el.tagName.toLowerCase()} line-clamp:${clamp} «${txt(el).slice(0, 40)}»`);
    if (cs.textOverflow === 'ellipsis') clamps.push(`${el.tagName.toLowerCase()} text-overflow:ellipsis «${txt(el).slice(0, 40)}»`);
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') continue;
    if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1) {
      clipped.push(`${el.tagName.toLowerCase()} h ${el.scrollHeight}>${el.clientHeight} «${txt(el).slice(0, 40)}»`);
    }
    if (cs.overflowX === 'hidden' && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0) {
      clipped.push(`${el.tagName.toLowerCase()} w ${el.scrollWidth}>${el.clientWidth} «${txt(el).slice(0, 40)}»`);
    }
  }

  const bandOf = (needle) => {
    const l = [...panel.querySelectorAll('span')].find((s) => txt(s).toLowerCase() === needle);
    return l ? l.parentElement : null;
  };

  const rollBand = bandOf('roll from here');
  const rolls = [...(rollBand?.querySelectorAll(':scope > div > *') ?? [])]
    .map((el) => {
      const kids = [...el.querySelectorAll('span')];
      return { notation: txt(kids[0]), label: txt(kids[1]), tappable: el.tagName === 'BUTTON' };
    })
    .filter((r) => r.notation);

  const facts = [...panel.querySelectorAll('dl > div')].map((row) => ({
    label: txt(row.querySelector('dt')),
    value: txt(row.querySelector('dd')),
  }));

  const what = txt(bandOf('what it does')?.querySelector('p'));

  /* The rule box has no fixed label — it is identified by its own words,
     because the whole point is that the two states say DIFFERENT things. */
  const ruleLabel = [...panel.querySelectorAll('span')]
    .find((s) => /One slot per turn|Not this turn/.test(txt(s))) ?? null;

  const tacticsToggle = [...panel.querySelectorAll('button')]
    .find((b) => /How to use it/i.test(txt(b))) ?? null;

  const tactics = (() => {
    const ul = tacticsToggle?.parentElement?.querySelector('ul');
    if (!ul) return [];
    return [...ul.querySelectorAll('li')].map((li) => {
      // FINDING X: distinct rounded tops, never rect count. A bullet is
      // <b>LEAD</b> + text, so a rect-count read calls one painted line two.
      const range = document.createRange();
      range.selectNodeContents(li);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return { lead: txt(li.querySelector('b')), text: txt(li), lines: tops.size };
    });
  })();

  return {
    open: true,
    title: txt(panel.querySelector('h2')),
    label: panel.getAttribute('aria-label'),
    z: getComputedStyle(panel).zIndex,
    all: txt(panel),
    facts,
    what,
    whatLen: what.length,
    rolls,
    ruleBox: ruleLabel ? txt(ruleLabel) : null,
    ruleText: ruleLabel ? txt(ruleLabel.parentElement?.querySelector('p')) : null,
    tacticsPresent: !!tacticsToggle,
    tacticsExpanded: tacticsToggle?.getAttribute('aria-expanded') ?? null,
    tactics,
    clipped,
    clamps,
    top: Math.round(panel.getBoundingClientRect().top),
    height: Math.round(panel.getBoundingClientRect().height),
  };
}, expected);

const readStorage = (page) => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

/** The row's aria-label is "<name> — details"; the sheet's is "<name>". */
const nameOf = (rowLabel) => rowLabel.replace(' — details', '');
/** Scoped to the sheet, never to `role=dialog` at large — see readSheet. */
const panelSel = (rowLabel) => `div[role="dialog"][aria-label="${nameOf(rowLabel)}"]`;

async function openRow(page, rowLabel) {
  await page.click(`button[aria-label="${rowLabel}"]`);
  await page.waitForSelector(panelSel(rowLabel), { timeout: 4000 });
  await page.waitForTimeout(400);
}

async function unfoldTactics(page, rowLabel) {
  const t = await page.$(`${panelSel(rowLabel)} button:has-text("How to use it")`);
  if (t) { await t.click(); await page.waitForTimeout(300); return true; }
  return false;
}

async function closeSheet(page, rowLabel) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return !!(await page.$(panelSel(rowLabel)));
}

// ── A — the affordances, and the census ─────────────────────────────────────
const { ctx, page } = await openApp();
const AFF = await census(page);
/* Shot A must show the thing its filename claims. At scroll 0 the turn list is
 * below the fold and behind the sticky deck (the placement problem slice 9
 * owns), so a viewport shot of the top of the tab shows none of the rows this
 * slice made tappable. Scroll to them first — and take the un-scrolled shot too,
 * because "you have to scroll to reach it" is itself a measurement Marcus is
 * owed rather than one to hide behind a nicer screenshot. */
await page.screenshot({ path: `${OUT}/A0-play-tab-as-it-opens.png` });
await page.evaluate(() => {
  document.querySelector('section[aria-label="Your turn options"]')
    ?.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/A-play-tab-rows-now-tappable.png` });
const storageBefore = await readStorage(page);
await page.evaluate(() => { window.__writes = []; });

// ── B — a turn row opens the sheet; four bands, in order ────────────────────
const firstTurnRow = AFF.turn[0];
if (firstTurnRow) await openRow(page, firstTurnRow);
const A = await readSheet(page, nameOf(firstTurnRow ?? ''));
if (A.open) await page.screenshot({ path: `${OUT}/B-the-sheet-bands-1-to-3.png` });

const writesWhileOpen = await page.evaluate(() => [...new Set(window.__writes)].sort());
const stillOpenAfterEscape = firstTurnRow ? await closeSheet(page, firstTurnRow) : false;
const storageAfter = await readStorage(page);

/* ── C — band 4 is folded, and unfolding is what reveals the advice ──────────
 *
 * THIS BLOCK SEARCHES FOR ITS OWN SUBJECT, and that is the whole point of it.
 *
 * Run 3 of this prover graded band 4 against `AFF.turn[0]` — Hearthbrand, a
 * weapon, which canon files no tactics for. `tacticsPresent` was false, the
 * `if (A.open && A.tacticsPresent)` guard fell through, and FOUR assertions
 * about the slice's own promise ("tactics folded by default") quietly graded
 * nothing while the run printed PASS. A guard that skips when the subject is
 * absent is a test that cannot fail.
 *
 * So: open every reachable sheet until one HAS the band, grade that one — and
 * if none of them has it, FAIL, because slice 7 promised a fourth band and a
 * turn where no option can show you one has not delivered it. Of the 14
 * options only 5 carry canon tactics (Sacred Flame · Divine Smite · Shield of
 * Faith · Cure Wounds · Warding Bond) and four of those five are in the
 * unrouted `turn.mutex` — so this search passes through three sheets before it
 * finds anything, which is itself a measurement of the reachability gap.
 */
let tacticsRow = null, T = { open: false, tacticsPresent: false }, T_OPEN = { tactics: [], all: '' };
for (const label of [...AFF.turn, ...AFF.reactions]) {
  await openRow(page, label);
  const probe = await readSheet(page, nameOf(label));
  if (probe.tacticsPresent) {
    tacticsRow = label;
    T = probe;
    await unfoldTactics(page, label);
    T_OPEN = await readSheet(page, nameOf(label));
    await page.evaluate((sel) => {
      const p = document.querySelector(sel);
      if (p) p.scrollTop = p.scrollHeight;
    }, panelSel(label));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/C-band-4-unfolded.png` });
    await closeSheet(page, label);
    break;
  }
  await closeSheet(page, label);
}
// Band ORDER is graded on the richest sheet available: the tactics one if a
// reachable option has tactics, otherwise A's own read (which still carries
// bands 1–3), so a missing band 4 fails as a missing band 4 and not as a
// spurious "band 2 has no heading".
const A_OPEN = T_OPEN.all ? T_OPEN : A;

// ── D — a REACTION opens it: the ReactionRow.option path slice 7 added ──────
let B = { open: false, facts: [], rolls: [] };
if (AFF.reactions.length) {
  const cloak = AFF.reactions.find((l) => /Flaming Cloak/i.test(l)) ?? AFF.reactions[0];
  await openRow(page, cloak);
  B = await readSheet(page, nameOf(cloak));
  await page.screenshot({ path: `${OUT}/D-opened-from-the-reactions-band.png` });
  await closeSheet(page, cloak);
}

// ── E — every reachable sheet, swept for a clip ─────────────────────────────
const swept = [];
for (const label of [...AFF.turn, ...AFF.reactions]) {
  await openRow(page, label);
  await unfoldTactics(page, label);
  const s = await readSheet(page, nameOf(label));
  swept.push({
    label, title: s.title, whatLen: s.whatLen, facts: s.facts.length, rolls: s.rolls.length,
    ruleBox: s.ruleBox, clipped: s.clipped, clamps: s.clamps,
    ellipsis: /…|\S\.\.\./.test(s.all) ? s.all.match(/.{0,40}(…|\.\.\.).{0,20}/)?.[0] : null,
  });
  await closeSheet(page, label);
}
await ctx.close();

// ── F — the same census with the levelled slot already spent ────────────────
const { ctx: ctxF, page: pageF } = await openApp({ log: SLOT_SPENT_LOG });
const AFF_F = await census(pageF);
const spentSheets = [];
for (const label of [...AFF_F.turn, ...AFF_F.reactions]) {
  await openRow(pageF, label);
  const s = await readSheet(pageF, nameOf(label));
  spentSheets.push({ title: s.title, ruleBox: s.ruleBox });
  await closeSheet(pageF, label);
}
await pageF.screenshot({ path: `${OUT}/E-turn-with-the-slot-already-spent.png` });
await ctxF.close();

await browser.close();

// ── the diff ────────────────────────────────────────────────────────────────
const GUARDED = [`codex-combat-${NIX.id}`, `codex-character-${NIX.id}`];
const moved = GUARDED.filter((k) => storageBefore[k] !== storageAfter[k]);

// ── the report ──────────────────────────────────────────────────────────────
console.log(`\nSLICE 7 PROOF — ${BASE}\n`);
console.log(`── the affordance`);
console.log(`   turn rows that open a sheet:      ${AFF.turn.length}  [${AFF.turn.map(nameOf).join(' | ')}]`);
console.log(`   reaction rows that open a sheet:  ${AFF.reactions.length}  [${AFF.reactions.map(nameOf).join(' | ')}]`);
console.log(`   chevrons painted: ${AFF.chevrons}  (tappable rows: ${AFF.turn.length + AFF.reactions.length})`);

if (A.open) {
  console.log(`\n── the sheet, opened from a turn row: «${A.title}»`);
  console.log(`   z-index ${A.z} · top y=${A.top} · ${A.height}px tall`);
  console.log(`   band 1 — ${A.facts.length} facts`);
  for (const f of A.facts.slice(0, 8)) console.log(`            ${(f.label || '·').padEnd(12)} ${f.value}`);
  console.log(`   band 2 — ${A.whatLen} chars, painted whole:`);
  console.log(`            «${A.what.slice(0, 120)}${A.what.length > 120 ? ' …[this report only]' : ''}»`);
  console.log(`   band 3 — ${A.rolls.length} roll(s): [${A.rolls.map((r) => `${r.notation} ${r.label}${r.tappable ? '' : ' (inert)'}`).join(' | ')}]`);
  console.log(`            rule box: ${A.ruleBox ? `«${A.ruleBox}» ${A.ruleText}` : 'none — correct, this option spends no slot'}`);
  console.log(`   band 4 — present:${A.tacticsPresent}${A.tacticsPresent ? '' : ' — canon files no tactics for this one'}`);
}

if (tacticsRow) {
  console.log(`\n── band 4, graded on the first reachable sheet that HAS one: «${T.title}»`);
  console.log(`   searched ${[...AFF.turn, ...AFF.reactions].indexOf(tacticsRow) + 1} sheet(s) to find it`);
  console.log(`   folded on open:${T.tacticsExpanded === 'false'} → unfolded after one tap:${T_OPEN.tacticsExpanded}`);
  console.log(`   ${T_OPEN.tactics.length} bullet(s), ${T_OPEN.tactics.filter((b) => b.lead).length} with a heading`);
  for (const b of T_OPEN.tactics.slice(0, 6)) {
    // `text` is the whole <li>, WHICH INCLUDES the <b> lead — printing both
    // renders the heading twice in this report and nowhere else. Strip it, so
    // nobody reading these numbers goes hunting for a Finding-Y duplicate bug
    // that only exists in the printf.
    const rest = b.lead && b.text.startsWith(b.lead) ? b.text.slice(b.lead.length) : b.text;
    console.log(`            [${String(b.lines).padStart(2)} lines] ${b.lead ? b.lead + ' ' : ''}${rest.replace(/^[\s:—–-]+/, '').slice(0, 56)}`);
  }
}

console.log(`\n── opened from the reactions band: «${B.title ?? 'n/a'}»`);
console.log(`   ${B.facts.length} facts · ${B.rolls.length} roll(s) [${B.rolls.map((r) => r.notation).join(' | ')}] · band 2 ${B.whatLen ?? 0} chars`);

console.log(`\n── the "…" is dead, measured on the glass (finding Q)`);
let clipCount = 0, ellipsisCount = 0;
for (const s of swept) {
  const bad = [...s.clipped, ...s.clamps];
  clipCount += bad.length;
  if (s.ellipsis) ellipsisCount++;
  console.log(`   ${bad.length || s.ellipsis ? '✗' : 'ok'}  ${String(s.whatLen).padStart(4)}ch  ${s.facts} facts  ${s.rolls} rolls  ${s.title}` +
    `${bad.length ? `   CLIPPED: ${bad[0]}` : ''}${s.ellipsis ? `   ELLIPSIS: «${s.ellipsis}»` : ''}`);
}

console.log(`\n── the census: how much of the turn can reach the sheet`);
console.log(`   ranked rows ${AFF.rankedRows} + reactions ${AFF.reactionRows} + "${AFF.elsewhere} more … in the sections below" = ${AFF.total} options`);
console.log(`   reachable:   ${AFF.turn.length + AFF.reactions.length} of ${AFF.total}`);
console.log(`   sheets showing a slot rule box: ${swept.filter((s) => s.ruleBox).length}`);
console.log(`   with the levelled slot ALREADY SPENT: ${AFF_F.turn.length + AFF_F.reactions.length} reachable of ${AFF_F.total}, ` +
  `${spentSheets.filter((s) => s.ruleBox).length} showing a rule box`);
console.log(`   → every slot-spending option is in turn.mutex, and nothing on the Play tab renders turn.mutex.`);
console.log(`     The rule box is built, unit-tested and UNROUTED. Slice 9 owns the route.`);

console.log(`\n── storage`);
console.log(`   keys written while the sheet was open: [${writesWhileOpen.join(', ') || 'none'}]`);
console.log(`   guarded keys moved: [${moved.join(', ') || 'none'}]`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`,
  JSON.stringify({ AFF, A, tacticsRow, T, T_OPEN, A_OPEN, B, AFF_F, spentSheets, swept, moved, writesWhileOpen, errors }, null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);

// A — the affordance is real, visible, and leads somewhere.
if (AFF.turn.length === 0) failures.push('A: no turn row opens a detail sheet');
if (AFF.reactions.length === 0) failures.push('A: no reaction row opens a detail sheet');
if (AFF.chevrons !== AFF.turn.length + AFF.reactions.length) {
  failures.push(`A: ${AFF.chevrons} chevrons for ${AFF.turn.length + AFF.reactions.length} tappable rows — either a chevron with nowhere to go, or a tap with no sign of it`);
}
if (!A.open) failures.push('A: tapping a turn row did not open the sheet');

// B — the four bands, present and in order, on screen.
if (A.open) {
  if (!A.title) failures.push('B: the sheet has no title');
  if (A.label !== A.title) failures.push(`B: the dialog label «${A.label}» is not the option «${A.title}»`);
  if (A.facts.length === 0) failures.push('B: band 1 is empty — no stat block');
  if (!A.what) failures.push('B: band 2 is empty — the sheet does not say what it does');
  const order = ['what it does', 'roll from here', 'how to use it'];
  const at = order.map((n) => A_OPEN.all.toLowerCase().indexOf(n));
  if (at[0] < 0) failures.push('B: band 2 has no heading');
  for (let i = 1; i < at.length; i++) {
    if (at[i] >= 0 && at[i - 1] >= 0 && at[i] < at[i - 1]) {
      failures.push(`B: bands out of order — «${order[i]}» painted before «${order[i - 1]}»`);
    }
  }
  if (A.top < 0) failures.push(`B: the sheet opened above the viewport (top=${A.top}) — band 1 is unreachable`);
  if (A.height < 200) failures.push(`B: the sheet is only ${A.height}px tall — it did not really open`);
  if (Number(A.z) < 50) failures.push(`B: the sheet paints at z-index ${A.z} — under the tab bar`);
}

// C — THE HEADLINE. Nothing in any reachable sheet is cut, on the glass.
if (clipCount) failures.push(`C: ${clipCount} clipped/clamped element(s) inside a detail sheet — the "…" is not dead`);
if (ellipsisCount) failures.push(`C: ${ellipsisCount} sheet(s) painted a literal ellipsis`);
if (swept.length !== AFF.turn.length + AFF.reactions.length) {
  failures.push(`C: swept ${swept.length} sheets, expected ${AFF.turn.length + AFF.reactions.length}`);
}
const noWhat = swept.filter((s) => !s.whatLen);
if (noWhat.length) failures.push(`C: ${noWhat.length} option(s) say nothing in band 2: [${noWhat.map((s) => s.title).join(', ')}]`);
const noFacts = swept.filter((s) => !s.facts);
if (noFacts.length) failures.push(`C: ${noFacts.length} option(s) have an empty band 1: [${noFacts.map((s) => s.title).join(', ')}]`);

// D — band 4 folds, and unfolding it is what reveals canon's advice.
//     Graded on a sheet that HAS the band, and it is a FAILURE if no reachable
//     sheet does — see the case C block for why this is not guarded away.
if (!tacticsRow) {
  failures.push(
    `D: none of the ${AFF.turn.length + AFF.reactions.length} reachable sheets has a "How to use it" band — ` +
    'slice 7 promised a fourth band and no option on the turn can show one'
  );
} else {
  if (T.tacticsExpanded !== 'false') failures.push(`D: band 4 did not start folded (aria-expanded=${T.tacticsExpanded})`);
  if (T_OPEN.tacticsExpanded !== 'true') failures.push('D: band 4 did not open when tapped');
  if (T_OPEN.tactics.length === 0) failures.push('D: band 4 opened onto nothing');
  if (T_OPEN.tactics.length && !T_OPEN.tactics.some((b) => b.lead)) {
    failures.push("D: band 4 has no headings — canon's ALL-CAPS sections were not split");
  }
  // The fold has to actually hide something, or it is decoration.
  if (T.tactics.length >= T_OPEN.tactics.length && T_OPEN.tactics.length > 0) {
    failures.push(`D: band 4 painted ${T.tactics.length} bullet(s) while still folded — the fold hides nothing`);
  }
}

// E — the reactions path resolves to a sheet of the same shape.
if (AFF.reactions.length) {
  if (!B.open) failures.push('E: tapping a reaction row did not open the sheet');
  else {
    if (!B.what) failures.push('E: a reaction sheet says nothing in band 2');
    if (!B.facts.length) failures.push('E: a reaction sheet has an empty band 1');
  }
}

/* F — THE CENSUS, PINNED.
 *
 * This is not a pass/fail about the sheet; it is a pin on the ROUTE. Slice 7
 * wired six of Nix's fourteen options to the sheet — `turn.ranked` and the
 * reactions band — and the other eight are behind the menus slice 9 retires.
 * Every slot-spending option is among the eight, which is why no reachable
 * sheet shows a rule box in either turn state.
 *
 * Pinned rather than printed so the number can only ever go UP. A later change
 * that quietly drops a row out of the shortlist would otherwise reduce the
 * reach of this whole slice and nothing would say so. */
const reachable = AFF.turn.length + AFF.reactions.length;
if (reachable < 6) failures.push(`F: reachability REGRESSED — ${reachable} of ${AFF.total} options can open the sheet, was 6`);
if (AFF.total < 14) failures.push(`F: the turn composed ${AFF.total} options, expected at least 14 — the fixture changed under this proof`);
if (swept.some((s) => s.ruleBox) || spentSheets.some((s) => s.ruleBox)) {
  console.log(`\n   NOTE: a rule box is now reachable — the census note above is stale and slice 9 may have landed.`);
}

// G — Escape closes, and a read-only sheet writes nothing.
if (stillOpenAfterEscape) failures.push('G: Escape did not close the sheet');
if (moved.length) failures.push(`G: a guarded key changed while a READ-ONLY sheet was open: [${moved.join(', ')}]`);
const stray = writesWhileOpen.filter((k) => !k.startsWith('codex-ui-'));
if (stray.length) failures.push(`G: opening the sheet wrote keys it had no business writing: [${stray.join(', ')}]`);

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
