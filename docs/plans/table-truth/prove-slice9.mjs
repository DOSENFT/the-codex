// Prove Table Truth slice 9 against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice9.mjs [baseUrl]
//
// Slice 9 retires competing menus, and a retirement is the one kind of change
// where a green unit suite proves the LEAST: every test that still passes is a
// test about what is still there. Four claims below can only be settled by the
// running app.
//
//   THE CENSUS CLOSES. Slice 7's prover pinned "6 of 14 reachable" and said out
//   loud that the other eight were in `turn.mutex`, which nothing on the Play
//   tab rendered. This prover asserts every option the turn composes now has a
//   row that opens the sheet — and it computes the denominator off the app's own
//   arithmetic, so the pass cannot come from the turn getting smaller.
//
//   THE «CHOOSE ACTION» PANEL IS UNREACHABLE, AND WAS BEFORE. That was the whole
//   justification for retiring 697 lines: `openActionMenu` had no caller, so
//   nothing could open it. A claim of the form "no sequence of taps reaches X"
//   cannot be made from source alone with confidence, so case C clicks EVERY
//   enabled control on a fresh Play tab and asserts no such dialog appears.
//
//   FINDING Q, ONE MORE TIME. `line-clamp-2` was cut from two surfaces in this
//   slice (the basic actions, and TurnSummary's collapsed mechanics line) and a
//   literal `.slice(0,60) + '...'` from a third. Those are claims about pixels.
//   Case D sweeps every element painted on the Play tab — not just inside the
//   sheet, as slice 7 did — for a clamp, an ellipsis, or a box smaller than the
//   content it was handed.
//
//   AND THE STANDING CLAIM OF THIS PHASE: none of it writes anything but its own
//   collapse flags.
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
const OUT = 'docs/plans/table-truth/_shots-slice9';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

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

/** Every option with a row, per band, plus the app's own count of what it says
 *  is elsewhere. The denominator is read OFF THE SCREEN for the same reason
 *  slice 7 read it off the screen: recomputing it here would grade the prover's
 *  arithmetic instead of the app's. */
const census = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const labels = (sel) =>
    [...document.querySelectorAll(`${sel} button[aria-label$="— details"]`)]
      .map((b) => b.getAttribute('aria-label'));

  const turnSection = document.querySelector('section[aria-label="Your turn options"]');
  const elseSection = document.querySelector('section[aria-label="Everything else you could do"]');

  return {
    turn: labels('section[aria-label="Your turn options"]'),
    reactions: labels('section[aria-label="Your reactions"]'),
    contention: labels('section[aria-label="Everything else you could do"]'),
    /* "N more … are under «Everything else» below" — the sentence slice 9 made
       true. Before this slice it pointed at sections that did not exist. */
    elsewhere: Number((txt(turnSection).match(/(\d+)\s+more\b/) ?? [])[1] ?? 0),
    bandPresent: !!elseSection,
    bandOpen: elseSection?.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded') ?? null,
    /* The count on the closed band's own toggle. It is the reason to open it,
       so it has to survive the fold and it has to be the truth. */
    bandCount: Number((txt(elseSection?.querySelector('button')).match(/(\d+)\s*$/) ?? [])[1] ?? 0),
    /* Brackets: one per contended slot, each captioned and each saying so. */
    brackets: [...(elseSection?.querySelectorAll('h4') ?? [])]
      .map((h) => txt(h))
      .filter((t) => /^One of these/i.test(t)),
    pickOne: (txt(elseSection).match(/pick one/gi) ?? []).length,
  };
});

/** Finding Q, applied to the WHOLE TAB rather than one panel.
 *
 *  Slice 7 swept inside the detail sheet. The truncations this slice killed
 *  were out on the tab itself, so the sweep has to be too. Scrollables are
 *  excluded — a scrollbar is a way to see the rest, not a way to lose it. */
const clipSweep = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const clipped = [], clamps = [], ellipses = [];
  const root = document.querySelector('main') ?? document.body;

  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;              // not painted
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;

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

  /* A literal ellipsis in the PAINTED text. `…` and a `...` that follows a
     non-space character — "Rolling..." on a button is a spinner label and
     would be caught, so leaf text nodes only and the two known live-status
     strings are named rather than pattern-excused. */
  for (const el of root.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = txt(el);
    if (/…|\S\.\.\./.test(t)) ellipses.push(`${el.tagName.toLowerCase()} «${t.slice(0, 60)}»`);
  }
  return { clipped, clamps, ellipses };
});

const readStorage = (page) => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

const nameOf = (rowLabel) => rowLabel.replace(' — details', '');
const panelSel = (rowLabel) => `div[role="dialog"][aria-label="${nameOf(rowLabel)}"]`;

async function openRow(page, rowLabel) {
  await page.click(`button[aria-label="${rowLabel}"]`, { timeout: 4000 });
  await page.waitForSelector(panelSel(rowLabel), { timeout: 4000 });
  await page.waitForTimeout(300);
}
async function closeSheet(page, rowLabel) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return !!(await page.$(panelSel(rowLabel)));
}

/** Open a CollapsibleCombatSection by the words on its own toggle. */
async function openSection(page, titleFragment) {
  const btn = await page.$(`button:has-text("${titleFragment}")`);
  if (!btn) return false;
  await btn.click();
  await page.waitForTimeout(400);
  return true;
}

// ── A — the tab as it opens, and the retired surfaces are gone ──────────────
const { ctx, page } = await openApp();

const beforeOpen = await census(page);
await page.screenshot({ path: `${OUT}/A-play-tab-as-it-opens.png`, fullPage: true });

/* What must NOT be on the tab any more.
 *
 * PAINTED LEAVES, MATCHED WHOLE — and the first run of this prover is why. It
 * asked `/Prepared Spells/i.test(document.body.textContent)` and failed the
 * slice on two hits that were not the retired panel: `print/CharacterRecord`'s
 * «Prepared Spells & Cantrips» heading, which is mounted at 0×0 for the print
 * stylesheet, and a Mechanics Reference FAQ entry titled «How do prepared
 * spells work?». A substring search over the whole document is the same
 * mistake as reading `textContent` to prove a paint: it measures something
 * adjacent to the claim. So each heading is matched EXACTLY, on a leaf, and
 * only if the box it occupies has area. */
const retired = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter((el) => {
    if (el.children.length) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const paints = (exact) => leaves.some(
    (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === exact,
  );
  const body = (document.body.textContent || '').replace(/\s+/g, ' ');
  return {
    canonStrip: /Canon\s+\S+\s*·\s*\d/.test(body) || /matched\s+\d+\s+of\s+\d+/.test(body),
    actionsReferenceTitle: paints('actions reference'),
    classActionsSection: paints('class actions'),
    preparedSpellsSection: paints('prepared spells'),
    // The panel itself: mounted at all times before this slice, at y≈844.
    chooseActionDialog: [...document.querySelectorAll('div[role="dialog"]')]
      .map((d) => d.getAttribute('aria-label')),
  };
});

/* THE WRITE LOG IS RESET HERE, and what it held is kept rather than discarded.
 *
 * Two mount effects write to localStorage on every load of the Play tab with
 * no interaction at all: `CombatHelper`'s `saveCombatState` effect and
 * `TurnSummary`'s `saveActionNotes` effect. Both predate this slice and neither
 * is touched by it. Measuring from zero would let a slice that DID start
 * writing hide inside that noise, so the load-time writes are reported
 * separately and the interaction window is graded on its own. */
const loadWrites = await page.evaluate(() => {
  const w = [...new Set(window.__writes)].sort();
  window.__writes = [];
  return w;
});
/* The state as it stands once the tab has settled. Compared byte-for-byte
   against the same read at the end, this says something the write log cannot:
   not merely "no unexpected key was touched" but "no stored VALUE moved". A
   mount effect that rewrites `codex-combat-…` with identical contents is noise;
   a tap that spends a slot is not, and only this catches the difference. */
const storageBefore = await readStorage(page);

// ── B — the census closes ───────────────────────────────────────────────────
/* The band is collapsed by default (that was deliberate — Marcus asked for LESS
   on screen). So the closed state is measured first, THEN it is opened: the
   claim is not "everything is on screen at once", it is "everything is one tap
   from a row". */
await page.click('section[aria-label="Everything else you could do"] button[aria-expanded]');
await page.waitForTimeout(400);
const AFF = await census(page);
await page.evaluate(() => {
  document.querySelector('section[aria-label="Everything else you could do"]')
    ?.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/B-everything-else-open.png` });

const ALL_ROWS = [...AFF.turn, ...AFF.reactions, ...AFF.contention];

// Every one of them, opened, and the sheet read for the two facts that moved.
const swept = [];
for (const label of ALL_ROWS) {
  await page.evaluate((l) => {
    document.querySelector(`button[aria-label="${l}"]`)?.scrollIntoView({ block: 'center' });
  }, label);
  await page.waitForTimeout(120);
  await openRow(page, label);
  const s = await page.evaluate((sel) => {
    const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const panel = document.querySelector(sel);
    if (!panel) return null;
    const facts = [...panel.querySelectorAll('dl > div')].map((row) => ({
      label: txt(row.querySelector('dt')), value: txt(row.querySelector('dd')),
    }));
    const ruleLabel = [...panel.querySelectorAll('span')]
      .find((s2) => /One slot per turn|Not this turn/.test(txt(s2))) ?? null;
    return { title: txt(panel.querySelector('h2')), facts, ruleBox: ruleLabel ? txt(ruleLabel) : null };
  }, panelSel(label));
  swept.push({ label, ...(s ?? { title: null, facts: [], ruleBox: null }) });
  await closeSheet(page, label);
}

// ── C — «Choose Action» cannot be summoned ──────────────────────────────────
/* The claim retiring 697 lines rested on. Click every enabled control on a
   fresh tab and assert nothing that looks like the old panel appears. Controls
   that would leave the tab or start a destructive flow are excluded BY NAME and
   the exclusions are printed, because a silent skip is how a sweep passes
   without sweeping. */
const { ctx: ctxC, page: pageC } = await openApp();
const SKIP = /rest|end combat|next turn|start combat|delete|reset|export|import|send|stop|clear|damage|heal|roll/i;
const clickReport = await pageC.evaluate(async (skipSrc) => {
  const skip = new RegExp(skipSrc.slice(1, skipSrc.lastIndexOf('/')), 'i');
  const seen = [], skipped = [];
  const label = (b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button')].filter((b) => !b.disabled);
  for (const b of buttons) {
    const l = label(b);
    if (skip.test(l)) { skipped.push(l); continue; }
    seen.push(l);
    b.click();
    await new Promise((r) => setTimeout(r, 30));
  }
  return {
    clicked: seen.length,
    skipped,
    dialogs: [...document.querySelectorAll('div[role="dialog"]')]
      .map((d) => d.getAttribute('aria-label')),
  };
}, String(SKIP));
await pageC.waitForTimeout(600);
await pageC.screenshot({ path: `${OUT}/C-after-clicking-every-control.png`, fullPage: true });
await ctxC.close();

// ── D — the basic actions survived, whole ───────────────────────────────────
await page.keyboard.press('Escape');
await page.evaluate(() => window.scrollTo(0, 0));
await openSection(page, 'Basic actions');
await page.waitForTimeout(400);
const basics = await page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const btns = [...document.querySelectorAll('button[aria-label$="— ask the advisor"]')];
  return btns.map((b) => {
    const p = b.querySelector('p');
    const cs = p ? getComputedStyle(p) : null;
    return {
      name: (b.getAttribute('aria-label') || '').replace(' — ask the advisor', ''),
      chars: txt(p).length,
      clamped: !!cs && (cs.webkitLineClamp || '') !== '' && cs.webkitLineClamp !== 'none',
      clipped: !!p && p.scrollHeight > p.clientHeight + 1,
    };
  });
});
await page.evaluate(() => {
  document.querySelector('button[aria-label$="— ask the advisor"]')
    ?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/D-basic-actions-whole.png` });

// ── E — the clip sweep, over the whole tab ──────────────────────────────────
const CLIP = await clipSweep(page);
const writes = await page.evaluate(() => [...new Set(window.__writes)].sort());
const storageAfter = await readStorage(page);
await ctx.close();
await browser.close();

/* Which stored values actually differ between "settled" and "after every row on
   the tab was opened and read". `codex-ui-` is excluded because the collapsible
   map is SUPPOSED to move — opening «Everything else» is a UI preference and
   remembering it is the feature. Everything else moving would mean reading the
   tab changed the character. */
const changedValues = [...new Set([...Object.keys(storageBefore), ...Object.keys(storageAfter)])]
  .filter((k) => !k.startsWith('codex-ui-'))
  .filter((k) => storageBefore[k] !== storageAfter[k])
  .sort();

// ── the report ──────────────────────────────────────────────────────────────
console.log(`\nSLICE 9 PROOF — ${BASE}\n`);
console.log(`── what is gone`);
console.log(`   slice 1's canon diagnostic strip:  ${retired.canonStrip ? 'STILL THERE' : 'gone'}`);
console.log(`   "Actions Reference" title:         ${retired.actionsReferenceTitle ? 'STILL THERE' : 'gone'}`);
console.log(`   its Class Actions section:         ${retired.classActionsSection ? 'STILL THERE' : 'gone'}`);
console.log(`   its Prepared Spells section:       ${retired.preparedSpellsSection ? 'STILL THERE' : 'gone'}`);
console.log(`   dialogs mounted on a fresh tab:    [${retired.chooseActionDialog.join(', ') || 'none'}]`);

console.log(`\n── «Choose Action» could never be opened — the claim, tested`);
console.log(`   clicked ${clickReport.clicked} enabled control(s) on a fresh Play tab`);
console.log(`   deliberately not clicked: [${clickReport.skipped.join(', ') || 'none'}]`);
console.log(`   dialogs that appeared:    [${clickReport.dialogs.join(', ') || 'none'}]`);

console.log(`\n── the census, before and after the fold`);
console.log(`   closed: ${beforeOpen.turn.length} turn + ${beforeOpen.reactions.length} reaction rows, ` +
  `band says "${beforeOpen.bandCount}" and the list says "${beforeOpen.elsewhere} more"`);
console.log(`   open:   ${AFF.turn.length} turn + ${AFF.reactions.length} reaction + ${AFF.contention.length} in «Everything else»` +
  `  = ${ALL_ROWS.length} rows that open a sheet`);
console.log(`   brackets: ${AFF.brackets.length} [${AFF.brackets.join(' | ')}], "pick one" painted ${AFF.pickOne}×`);
console.log(`   slice 7 measured 6 of 14 reachable. Now ${ALL_ROWS.length}.`);

console.log(`\n── every row, opened`);
for (const s of swept) {
  const save = s.facts.find((f) => f.label === 'Save');
  console.log(`   ${String(s.facts.length).padStart(2)} facts  ${s.ruleBox ? '[' + s.ruleBox + ']' : '           '}  ` +
    `${(s.title || '??').padEnd(34)}${save ? '  Save: ' + save.value : ''}`);
}

console.log(`\n── the basic actions, which were NOT subsumed and therefore stayed`);
console.log(`   ${basics.length} action(s), ${basics.filter((b) => b.clamped || b.clipped).length} clipped`);
for (const b of basics) console.log(`   ${b.clamped || b.clipped ? '✗' : 'ok'}  ${String(b.chars).padStart(3)}ch  ${b.name}`);

console.log(`\n── finding Q, swept over the whole Play tab`);
console.log(`   line-clamp / cutting ellipsis: ${CLIP.clamps.length}`);
for (const c of CLIP.clamps.slice(0, 6)) console.log(`      ${c}`);
console.log(`   boxes smaller than their text: ${CLIP.clipped.length}`);
for (const c of CLIP.clipped.slice(0, 6)) console.log(`      ${c}`);
console.log(`   literal "…" or "..." painted:  ${CLIP.ellipses.length}`);
for (const c of CLIP.ellipses.slice(0, 6)) console.log(`      ${c}`);

console.log(`\n── storage`);
/* Two windows, reported apart. The first is what the Play tab writes just by
   being loaded — two mount effects that predate this slice. The second is the
   one this slice is graded on: everything written from the first tap onward. */
console.log(`   written on load, before any tap: [${loadWrites.join(', ') || 'none'}]`);
console.log(`   written from the first tap on:   [${writes.join(', ') || 'none'}]`);
console.log(`   stored values that MOVED:        [${changedValues.join(', ') || 'none'}]`);
console.log(`\nconsole:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify(
  { beforeOpen, AFF, retired, clickReport, swept, basics, CLIP, loadWrites, writes, changedValues, errors },
  null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push(`console errors: ${errors[0]}`);

// A — the retirements actually happened.
if (retired.canonStrip) failures.push("A: slice 1's canon diagnostic strip is still painted on the Play tab");
if (retired.actionsReferenceTitle) failures.push('A: the "Actions Reference" title is still on the tab');
if (retired.classActionsSection) failures.push('A: the panel\'s Class Actions section is still painted');
if (retired.preparedSpellsSection) failures.push('A: the panel\'s Prepared Spells section is still painted');
if (retired.chooseActionDialog.some((l) => /choose|action menu/i.test(l || ''))) {
  failures.push(`A: an action-menu dialog is still mounted: [${retired.chooseActionDialog.join(', ')}]`);
}

// B — the census closed, and the count on the fold is the truth.
if (!AFF.bandPresent) failures.push('B: there is no «Everything else» band on the tab');
if (beforeOpen.bandOpen !== 'false') failures.push(`B: the band did not start collapsed (aria-expanded=${beforeOpen.bandOpen})`);
if (beforeOpen.contention.length) failures.push(`B: the collapsed band painted ${beforeOpen.contention.length} rows — the fold hides nothing`);
if (beforeOpen.bandCount !== AFF.contention.length) {
  failures.push(`B: the fold says ${beforeOpen.bandCount} but opens onto ${AFF.contention.length} rows`);
}
if (beforeOpen.elsewhere !== AFF.contention.length) {
  failures.push(`B: the turn list says "${beforeOpen.elsewhere} more" but «Everything else» holds ${AFF.contention.length}`);
}
if (ALL_ROWS.length < 14) failures.push(`B: only ${ALL_ROWS.length} of the turn's options have a row — slice 7 measured 14 composed`);
if (new Set(ALL_ROWS).size !== ALL_ROWS.length) {
  const dupes = ALL_ROWS.filter((l, i) => ALL_ROWS.indexOf(l) !== i);
  failures.push(`B: an option is painted twice — [${[...new Set(dupes)].join(', ')}] — which makes a player count it twice`);
}
if (!AFF.brackets.length) failures.push('B: no contention bracket is painted — the contending options read as a flat list, which is a wrong rule');
if (AFF.pickOne !== AFF.brackets.length) failures.push(`B: ${AFF.brackets.length} bracket(s) but "pick one" painted ${AFF.pickOne}×`);
if (swept.some((s) => !s.title)) failures.push(`B: ${swept.filter((s) => !s.title).length} row(s) did not open a sheet`);

/* THE RULE BOX IS FINALLY REACHABLE. Slice 7 built it, unit-tested it, and
   proved it unroutable: every option it applies to was in `turn.mutex`. If no
   sheet shows one now, this slice did not do the thing it exists to do. */
if (!swept.some((s) => s.ruleBox)) {
  failures.push('B: no reachable sheet shows the one-levelled-slot-per-turn rule box — the route slice 9 owed is still not there');
}

// The save DC, the one fact the retired panel had and the sheet did not.
const withSave = swept.filter((s) => s.facts.some((f) => f.label === 'Save'));
if (!withSave.length) failures.push('B: no sheet states a Save at all — the fact the panel had cannot be checked');
const dcless = withSave.filter((s) => !/\bDC\s*\d+/.test(s.facts.find((f) => f.label === 'Save').value));
if (dcless.length) {
  failures.push(`B: ${dcless.length} sheet(s) state a Save with no DC number: [${dcless.map((s) => s.title).join(', ')}] — the retirement cost Marcus a fact`);
}

// C — nothing summons the retired panel.
if (clickReport.clicked < 10) failures.push(`C: only ${clickReport.clicked} controls were clicked — the sweep did not sweep`);
if (clickReport.dialogs.some((l) => /choose|action menu/i.test(l || ''))) {
  failures.push(`C: clicking around SUMMONED an action menu: [${clickReport.dialogs.join(', ')}] — the retirement removed a real capability`);
}

// D — the basic actions stayed, and stayed whole.
if (basics.length !== 14) failures.push(`D: ${basics.length} basic actions painted, expected 14 — the section that was NOT subsumed lost entries`);
const cutBasics = basics.filter((b) => b.clamped || b.clipped);
if (cutBasics.length) failures.push(`D: ${cutBasics.length} basic action description(s) still cut on the glass: [${cutBasics.map((b) => b.name).join(', ')}]`);
if (basics.some((b) => b.chars < 20)) failures.push('D: a basic action description is under 20 characters — it says nothing');

// E — finding Q, over the whole tab.
if (CLIP.clamps.length) failures.push(`E: ${CLIP.clamps.length} element(s) on the Play tab clamp or ellipsis their text: ${CLIP.clamps[0]}`);
if (CLIP.clipped.length) failures.push(`E: ${CLIP.clipped.length} element(s) are smaller than the text they were handed: ${CLIP.clipped[0]}`);
if (CLIP.ellipses.length) failures.push(`E: ${CLIP.ellipses.length} literal ellipsis painted: ${CLIP.ellipses[0]}`);

/* F — read-only, still. Graded on the INTERACTION window only: `writes` was
   reset after load, so the two mount effects are out of scope here and printed
   above instead. `codex-ui-` is the one key a tap is allowed to write — that is
   the collapsible map, and opening the band IS a UI preference. Anything else
   means reading the tab spent a resource, which is the bug this whole plan
   exists downstream of. */
const stray = writes.filter((k) => !k.startsWith('codex-ui-'));
if (stray.length) failures.push(`F: tapping around wrote keys it had no business writing: [${stray.join(', ')}]`);
if (changedValues.length) {
  failures.push(`F: reading the tab CHANGED stored state: [${changedValues.join(', ')}] — opening a row spent something`);
}

console.log(`\n${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
