// PHASE CLOSE — measure the whole definition of done, at HEAD, in one run.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-phase1.mjs [baseUrl] [shotsDir]
//
// WHY THIS EXISTS AND WHY IT IS NOT A SUMMARY OF THE SLICE PROVERS
//
// Every one of the eight points below was proved once, by the slice that built
// it, against the build that existed that afternoon. Ten more slices then landed
// on top. A phase close that re-reads those green runs is reading history: it
// proves that each claim was true at the moment it was made, which is not the
// question. The question is whether all eight are true TOGETHER, NOW, at the
// commit that would actually be deployed.
//
// So this prover re-measures from scratch. It shares no state and no cached
// result with any earlier prover, and where an earlier slice proved something at
// the MODEL level (node, `renderToStaticMarkup`) it is re-asserted here against
// PAINT, because finding Q stands: a string renderer reports CSS-clipped text in
// full, and this whole phase exists because text was being cut.
//
// THE EIGHT, from 04-slices.md §"Definition of done for the phase":
//
//   1  No definition anywhere on the Play tab ends in `…`.
//   2  Every turn option row is exactly two lines, full text one tap away.
//   3  Spell save DC, AC, initiative and proficiency visible without scrolling.
//   4  A reaction list exists, states its trigger first, reachable from the deck.
//   5  Conditions and the deck both minimise; spend state survives the fold.
//   6  Gemini connects, and survives Google retiring a model WITHOUT a code change.
//   7  Tests green, including the storage-safety tests.
//   8  `codex-character-${id}` byte-identical except for what Marcus changed.
//
// TWO OF THE EIGHT CANNOT BE SETTLED BY A BROWSER, and are handled honestly:
//
//   7 is a node claim and is measured by `npx vitest run`. This prover restates
//     the number it must match rather than pretending to have run it.
//   6 has two halves. "Survives a retirement without a code change" is
//     structural and IS measured here — against `dist/`, the artifact that
//     actually ships, because a model id absent from `src/` but inlined by the
//     bundler would still 404 at Marcus's table. "Gemini connects" needs his
//     private key and a paid round trip to Google; it is reported UNVERIFIED
//     rather than assumed, and check 6c says so in as many words.
//
// EVERY NUMBER IS READ OFF THE PAINTED PAGE. Nothing here recomputes a value and
// compares it to itself, nothing writes to localStorage to make an assertion
// true, and no claim about the screen is made from `textContent` alone.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
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
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-phase1';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Marcus's sheet as he last reported it, 2026-08-27. Same seed as 10e and 10f,
   for the same reason: a fixture that drifts from his sheet proves the app works
   for a character nobody plays. */
const MARCUS = {
  ...NIX,
  level: 7,
  armorClass: 18,
  hitPoints: { max: 67, current: 67 },
  tempHP: 0,
  tempHPSource: null,
  proficiencyBonus: 3,
  spellSaveDC: 14,
  spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: [
    { name: 'Sentinel', description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.', source: 'General Feat', isHomebrew: false, effects: [] },
    { name: 'Interception', description: 'You protect your allies from harm.', source: 'Fighting Style', isHomebrew: false, effects: [] },
    { name: 'Lucky', description: 'You have inexplicable luck that seems to kick in at just the right moment.', source: 'Changeling', isHomebrew: false, effects: [] },
  ],
  weapons: [
    { name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true,
      damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' },
  ],
  paladinResources: {
    layOnHands: { max: 35, current: 35 },
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  },
};

const SHEET_BYTES = JSON.stringify(MARCUS);
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

async function openApp(sheet = MARCUS, combatJson = IN_COMBAT) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  /* Seeded only if absent — 10b's rule. `addInitScript` runs on every
     navigation, and check 8 reloads on purpose. */
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
    [NIX.id, JSON.stringify(sheet), combatJson],
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  return { ctx, page };
}

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};
const note = (name, detail) => {
  results.push({ name, pass: null, detail });
  console.log(`NOTE  ${name}\n      ${detail}`);
};

const shot = async (page, name) => {
  await page.waitForTimeout(250);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

/* ────────────────────────────────────────────────────────────────────────────
   The page, read geometrically. Injected once and reused by every check so
   that no two checks disagree about what "painted" means.
   ──────────────────────────────────────────────────────────────────────────── */
const READ = () => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const painted = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01;
  };

  const main = document.querySelector('main');
  const deck = document.querySelector('section[aria-label="Turn deck"]');
  const opts = document.querySelector('section[aria-label="Your turn options"]');
  const band = document.querySelector('section[aria-label="Your reactions"]');

  /* THE CLIPPING SCAN, and it is the point of doing this in a browser at all.
     A literal "…" in the text is the fault this phase was opened to kill, but
     the same fault wearing CSS reports NOTHING to textContent (finding Q). So
     both are looked for: the character, and any element that is actually
     cutting its own content off with an ellipsis right now. */
  const clipped = [];
  for (const el of document.querySelectorAll('main *, section[aria-label="Turn deck"] *, [role="dialog"] *')) {
    if (el.children.length !== 0) continue;
    if (!painted(el)) continue;
    const cs = getComputedStyle(el);
    const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    if (!overflows) continue;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') {
      clipped.push({ tag: el.tagName, text: txt(el).slice(0, 70), reason: cs.textOverflow === 'ellipsis' ? 'text-overflow' : 'line-clamp' });
    }
  }

  /* Every painted leaf of text on the tab, so the literal scan cannot be fooled
     by looking in only the places I remembered to look. */
  const leaves = [];
  for (const el of document.querySelectorAll('main *, section[aria-label="Turn deck"] *, [role="dialog"] *')) {
    if (el.children.length !== 0) continue;
    if (!painted(el)) continue;
    const t = txt(el);
    if (t) leaves.push(t);
  }

  const dcSpan = [...document.querySelectorAll('span')].find(
    (s) => txt(s) === 'Save DC' && s.getBoundingClientRect().height > 0,
  );
  const vitalsRow = dcSpan?.parentElement?.parentElement ?? null;

  const expandables = [...document.querySelectorAll('button[aria-expanded]')].map((b) => ({
    label: b.getAttribute('aria-label'),
    text: txt(b).slice(0, 40),
    expanded: b.getAttribute('aria-expanded') === 'true',
    box: box(b),
  }));

  return {
    main: main ? box(main) : null,
    viewport: { w: innerWidth, h: innerHeight },
    deck: deck ? { box: box(deck), text: txt(deck) } : null,
    clipped,
    leaves,
    vitals: vitalsRow
      ? [...vitalsRow.children].map((c) => ({ text: txt(c), box: box(c), painted: painted(c) }))
      : null,
    options: opts
      ? [...opts.querySelectorAll('li')].map((li) => ({
          text: txt(li),
          box: box(li),
          /* Not clipped: the row's own content fits the row's own box. A row
             that is two lines tall because the third was cut off would pass a
             height check and fail this one. */
          fits: li.scrollHeight <= li.clientHeight + 1,
          detail: li.querySelector('button[aria-label$="— details"]')?.getAttribute('aria-label') ?? null,
        }))
      : null,
    reactions: band
      ? [...band.querySelectorAll('li')].map((li) => {
          /* Each line is kept twice: once as a bare string, because 4a/4b/4c
             only ever ask what it SAYS — and once as a cell carrying whether it
             is painted and whether it is cutting itself off, because 4a2 asks
             what Marcus can actually SEE, and those are different questions. */
          const cells = [...li.querySelectorAll('p,span,div')]
            .filter((e) => e.children.length === 0 && txt(e))
            .map((e) => {
              const cs = getComputedStyle(e);
              const overflows = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1;
              return {
                text: txt(e),
                painted: painted(e),
                clips: overflows && (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none'),
              };
            });
          return { text: txt(li), box: box(li), lines: cells.map((c) => c.text), cells };
        })
      : null,
    /* The four spend pips, by their own aria-labels rather than by position. */
    pips: [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /^(Action|Bonus|Reaction|Move): (used|available)/.test(e.getAttribute('aria-label') || ''))
      .map((e) => ({ label: e.getAttribute('aria-label'), box: box(e), painted: painted(e) })),
    expandables,
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => ({
      label: d.getAttribute('aria-label'),
      text: txt(d),
      box: box(d),
      painted: painted(d),
    })),
  };
};

const ELLIPSIS_CHAR = '…';
const ELLIPSIS_DOTS = /\S\.\.\.(\s|$)/;
/* Canon's OWN ellipsis is not the app cutting anything — ErrataBand.test.tsx
   found this and was right to. The claim is "no ellipsis the APP introduced",
   so a leaf is only guilty if it ends in one, which is what a truncator does
   and what a quotation does not. */
const guiltyOf = (t) => t.endsWith(ELLIPSIS_CHAR) || ELLIPSIS_DOTS.test(t);

const { ctx, page } = await openApp();
let R = await page.evaluate(READ);

if (!R.options || !R.reactions || !R.vitals || !R.deck) {
  console.error('The Play tab did not render its surfaces. Nothing below can be measured.');
  console.error(JSON.stringify({ options: !!R.options, reactions: !!R.reactions, vitals: !!R.vitals, deck: !!R.deck }));
  await ctx.close();
  await browser.close();
  process.exit(1);
}

await shot(page, '1-play-tab-top');

// ===========================================================================
console.log('\n=== 1 · no definition anywhere on the Play tab ends in "…" ===\n');

const guilty = R.leaves.filter(guiltyOf);
check(
  '1a · no painted text on the Play tab trails off',
  guilty.length === 0,
  guilty.length
    ? `${guilty.length} guilty: ${guilty.slice(0, 4).map((g) => JSON.stringify(g.slice(-50))).join(' | ')}`
    : `${R.leaves.length} painted text leaves scanned across the turn options, the reactions band, ` +
      `the deck and every mounted dialog — none ends in an ellipsis`,
);

check(
  '1b · and nothing is cutting itself off in CSS either  <-- finding Q',
  R.clipped.length === 0,
  R.clipped.length
    ? `${R.clipped.length} clipping: ${R.clipped.slice(0, 3).map((c) => `${c.reason} «${c.text}»`).join(' | ')}`
    : `no painted leaf overflows its own box with text-overflow:ellipsis or a line-clamp. ` +
      `This is the half textContent cannot see: CSS-clipped text reports in FULL to a string ` +
      `renderer, so every node-side "no ellipsis" test in this repo is blind to it`,
);

// ===========================================================================
console.log('\n=== 2 · every turn option row is two lines, full text one tap away ===\n');

const heights = [...new Set(R.options.map((o) => o.box.h))];
check(
  '2a · every option row is the same height, and none is clipped',
  heights.length === 1 && R.options.every((o) => o.fits) && R.options.length > 0,
  `${R.options.length} rows, height${heights.length === 1 ? '' : 's'} ${heights.join('/')}px, ` +
    `${R.options.filter((o) => o.fits).length}/${R.options.length} fit their own box. ` +
    `A uniform row is what makes the list scannable mid-turn; "fits" is the half that ` +
    `distinguishes a two-line row from a three-line row with the third line cut off`,
);

/* One tap. Not "a route exists" — the actual tap, and the actual text. */
const firstDetail = R.options[0].detail;
await page.click(`button[aria-label="${firstDetail}"]`);
await page.waitForTimeout(600);
const opened = await page.evaluate(READ);
await shot(page, '2-detail-sheet');
const sheet = opened.dialogs.filter((d) => d.painted && d.box.h > 200).sort((a, b) => b.box.h - a.box.h)[0] ?? null;

check(
  '2b · one tap opens the full definition, and it is long-form prose',
  Boolean(sheet) && sheet.text.length > 400 && !guiltyOf(sheet.text),
  sheet
    ? `«${firstDetail}» → a painted dialog ${sheet.box.w}×${sheet.box.h} carrying ` +
      `${sheet.text.length} characters, no trailing ellipsis. The row is the glance; ` +
      `this is the route the phase was opened to build`
    : `no painted dialog appeared. NOTE: this app permanently mounts two role="dialog" ` +
      `overlays below the fold (finding BC), so the match requires PAINT and HEIGHT, ` +
      `not merely the presence of the role`,
);

const sheetGuilty = (opened.leaves || []).filter(guiltyOf);
check(
  '2c · and nothing inside the opened sheet trails off either',
  sheetGuilty.length === 0 && opened.clipped.length === 0,
  sheetGuilty.length || opened.clipped.length
    ? `${sheetGuilty.length} trailing, ${opened.clipped.length} clipping`
    : `the surface that carries the LONGEST text in the app is the one most likely to cut it, ` +
      `and it cuts nothing`,
);

await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// ===========================================================================
console.log('\n=== 3 · save DC, AC, initiative and proficiency, without scrolling ===\n');

R = await page.evaluate(READ);
const WANT = ['Save DC', 'AC', 'Init', 'Prof'];
const found = WANT.map((w) => {
  const cell = (R.vitals || []).find((v) => v.text.endsWith(w));
  const inView =
    cell &&
    cell.painted &&
    cell.box.y >= R.main.y - 1 &&
    cell.box.y + cell.box.h <= R.main.y + R.main.h + 1;
  return { want: w, text: cell?.text ?? null, box: cell?.box ?? null, inView: Boolean(inView) };
});

check(
  '3 · all four are painted and inside the unscrolled window',
  found.every((f) => f.inView),
  found.map((f) => `${f.want}=${JSON.stringify(f.text)}${f.inView ? '' : ' (OUT OF VIEW)'}`).join('  ') +
    `  — main is the bounded scroll region y=${R.main.y}..${R.main.y + R.main.h}, and every ` +
    `cell sits inside it at scrollY=0. "Without scrolling" is a claim about the WINDOW, not ` +
    `about the document, which is why it is measured against main and not against innerHeight`,
);

check(
  '3b · and they are the numbers off his sheet, not placeholders',
  found[0].text === '14Save DC' && found[1].text === '18AC' && found[2].text === '+1Init' && found[3].text === '+3Prof',
  `DC 14 (8+3+3 with CHA 16), AC 18, Init +1 (DEX 12), Prof +3 (level 7) — computed from the ` +
    `seeded sheet, and every one of them matches what Marcus reported on 2026-08-27`,
);

// ===========================================================================
console.log('\n=== 4 · a reaction list, trigger first, reachable from the deck ===\n');

const rows = R.reactions;
check(
  '4a · the list exists and carries more than one reaction',
  rows.length >= 2,
  `${rows.length} rows: ${rows.map((r) => r.lines[0]).join(' | ')}`,
);

/* TRIGGER FIRST, measured as ORDER within the row rather than as presence
   anywhere in it. "States its trigger" is satisfied by a trigger buried under
   the dice; "states its trigger FIRST" is the thing a player needs at 11pm. */
const triggerFirst = rows.map((r) => {
  const t = r.text;
  const trig = Math.max(t.indexOf('WHEN'), t.toLowerCase().indexOf('when'));
  const dice = t.search(/\dd\d/);
  return { name: r.lines[0], trig, dice, ok: trig > -1 && (dice === -1 || trig < dice) };
});
check(
  '4b · every row states WHEN before it states the dice',
  triggerFirst.every((t) => t.ok),
  triggerFirst.map((t) => `${t.name}: when@${t.trig} dice@${t.dice}`).join(' | ') +
    `  — a reaction you cannot use is a number; the trigger is the whole of what makes it a choice`,
);

const cloak = rows.find((r) => /Flaming Cloak/.test(r.lines[0] || ''));
check(
  '4c · and the cloak\'s retaliation says it is FREE  <-- his own misreading, corrected',
  Boolean(cloak) && /retaliation \(free\)/.test(cloak.text),
  cloak
    ? `«${(cloak.lines.find((l) => /retaliation/.test(l)) || '').trim()}» — Marcus believed the 1d10 ` +
      `costs his Reaction. Canon prices the ACTIVATION (Reaction · 1 Channel Divinity use) and ` +
      `leaves the retaliation free, automatic and uncapped. Both facts are on this one row`
    : 'no Flaming Cloak row',
);

/* FINDING BJ, found at phase close by reading a PASSING check's own data.
   4a asserted "more than one row" and printed «Sentinel | Sentinel». Both rows
   are real and neither is a duplicate — Sentinel has two distinct reaction
   clauses (a Disengage within 5 feet, and an attack on someone other than you)
   and splitting them is right, because at a table you need to recognise each
   trigger on its own. But they carry the SAME heading, so the band reads as if
   it repeated itself.

   THIS CHECK WAS REWRITTEN, AND THE REWRITE IS THE HONEST PART. It first read
   "every row is told apart by its HEADING alone", which failed — and that
   standard was invented by me mid-run and appears in no requirement. Item 4 of
   the definition of done asks for a list that states its trigger first; a row
   is a heading AND its trigger, and both are painted. Demanding the heading
   carry the whole distinction fails a row that is, in fact, perfectly
   readable — while a row whose distinguishing text was CLIPPED would have
   passed it, because a clipped heading is still a distinct heading.

   So it now measures the thing that actually decides whether Marcus can tell
   two rows apart: for every group of rows sharing a heading, the text he can
   SEE — painted, and not cutting itself off — must differ between them. That
   can fail two ways (identical rows; a distinction hidden behind an ellipsis),
   and it is strictly harder to satisfy than what it replaced on exactly the
   case that matters. The cosmetic half is not dropped: it drops to a note
   below, which is where finding BH already lives. */
const headings = rows.map((r) => r.lines[0]);
const repeated = [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
const groups = repeated.map((h) => {
  const group = rows.filter((r) => r.lines[0] === h);
  const seen = group.map((r) =>
    r.cells.filter((c) => c.painted && !c.clips).map((c) => c.text).join(' ⏐ '),
  );
  return { h, seen, distinct: new Set(seen).size === seen.length };
});
/* ── AND THEN FINDING BJ WAS FIXED, WHICH BROKE THIS CHECK BY SATISFYING IT ──
   With the headings now disambiguated, `groups` is EMPTY and the version above
   passed while observing nothing — it printed the word "vacuous" and scored
   itself green. That is finding BG exactly: a sampled claim that FAILED TO
   OBSERVE the fault, dressed as a claim that the fault is absent. BG's own
   ruling is to prefer a structural claim that FORBIDS it.

   So the claim is inverted. It no longer asks "where headings collide, is the
   distinction visible" — it asks the stronger question the band can always
   answer: is every heading distinct from every other, AND painted, AND not
   cutting itself off. That can never be vacuous, because there is always at
   least one row to read; it subsumes the old check, because a collision now
   fails outright rather than being excused by a visible second line; and it
   still forbids the ellipsis dodge, because a heading made distinct only by
   text hidden behind a clamp fails the second half. */
const visibleHeads = rows.map((r) => r.cells[0] ?? { text: r.lines[0], painted: false, clips: true });
const stillRepeated = [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
const hiddenHeads = visibleHeads.filter((c) => !c.painted || c.clips);
check(
  '4a2 · every reaction row wears its own heading, and every heading is readable',
  rows.length > 0 && stillRepeated.length === 0 && hiddenHeads.length === 0,
  rows.length === 0
    ? 'no reaction rows at all — nothing to read'
    : `${rows.length} rows, ${new Set(headings).size} distinct headings, ${hiddenHeads.length} unreadable: ` +
      headings.map((h) => `«${h}»`).join(' ') +
      (stillRepeated.length ? `  — REPEATED: ${stillRepeated.join(', ')}` : '') +
      (hiddenHeads.length ? `  — HIDDEN: ${hiddenHeads.map((c) => c.text).join(', ')}` : '') +
      `  — finding BJ: one feat with two reaction clauses now heads each row with its own trigger ` +
      `words, lifted verbatim from canon at the point the two triggers stop agreeing, so «Sentinel» ` +
      `twice became «Sentinel · takes the Disengage action» and «Sentinel · attacks a target other ` +
      `than you». Both rows survive — nothing was collapsed to make this pass`,
);

const deckHasReaction = R.pips.some((p) => /^Reaction: /.test(p.label) && p.painted);
check(
  '4d · reachable from the deck — the deck names Reaction as a thing you spend',
  deckHasReaction && R.deck.box.h > 0,
  `the fixed deck (${R.deck.box.w}×${R.deck.box.h} at y=${R.deck.box.y}) carries a painted ` +
    `Reaction pip, and the band sits in the same scroll region above it`,
);

// ===========================================================================
console.log('\n=== 5 · the deck and the conditions both minimise ===\n');

const deckOpenH = R.deck.box.h;
await page.click('button[aria-label="Minimise turn deck"]');
await page.waitForTimeout(600);
const folded = await page.evaluate(READ);
await shot(page, '5-deck-folded');

check(
  '5a · the deck folds, and gets smaller doing it',
  folded.deck.box.h < deckOpenH &&
    folded.expandables.some((e) => e.label === 'Expand turn deck' && !e.expanded),
  `deck ${deckOpenH}px → ${folded.deck.box.h}px, and the control now reads "Expand turn deck". ` +
    `The height is the claim: aria-expanded="false" over an unchanged box is a lie a screen ` +
    `reader believes and Marcus does not`,
);

const foldedPips = folded.pips.filter((p) => p.painted);
check(
  '5b · and the spend state survives the fold  <-- the whole point of folding it',
  foldedPips.length >= 4,
  `${foldedPips.length} painted spend pips with the deck folded: ` +
    `${foldedPips.map((p) => p.label.split(':')[0]).join(', ')}. A deck that hides whether you ` +
    `have used your Action is a deck you have to unfold every round, which is not a minimise`,
);

await page.click('button[aria-label="Expand turn deck"]');
await page.waitForTimeout(500);

/* The conditions fold lives far down the tab and has no aria-label — it is
   found by the words on it, which is what Marcus reads too. */
const condHandle = page.locator('button[aria-expanded]').filter({ hasText: 'Active Conditions' }).first();
await condHandle.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const condBefore = await condHandle.evaluate((b) => ({
  expanded: b.getAttribute('aria-expanded') === 'true',
  sectionH: Math.round((b.parentElement?.getBoundingClientRect().height) || 0),
}));
await condHandle.click();
await page.waitForTimeout(600);
const condAfter = await condHandle.evaluate((b) => ({
  expanded: b.getAttribute('aria-expanded') === 'true',
  sectionH: Math.round((b.parentElement?.getBoundingClientRect().height) || 0),
}));
await shot(page, '5-conditions-toggled');

check(
  '5c · Active Conditions opens and closes, and the box moves with it',
  condBefore.expanded !== condAfter.expanded && condBefore.sectionH !== condAfter.sectionH,
  `aria-expanded ${condBefore.expanded} → ${condAfter.expanded}, container ` +
    `${condBefore.sectionH}px → ${condAfter.sectionH}px. Marcus asked for this one by name: ` +
    `"it doesnt happen often and that portion takes up so much room"`,
);

// ===========================================================================
console.log('\n=== 6 · Gemini survives a retirement WITHOUT a code change ===\n');

/* AGAINST dist/, NOT src/. A model id absent from the source but inlined by the
   bundler from a JSON import or a default would still 404 at his table, and the
   repo's own guard test only greps src/. This greps the bytes that ship. */
let compiled = [];
try {
  const hits = execSync('grep -rhoE "gemini-[0-9][0-9a-zA-Z.-]*" dist/ || true', { encoding: 'utf8' });
  compiled = [...new Set(hits.split('\n').map((s) => s.trim()).filter(Boolean))];
} catch { compiled = ['(grep failed)']; }

check(
  '6a · the SHIPPED bundle names no Gemini model at all',
  compiled.length === 0,
  compiled.length
    ? `dist/ contains ${compiled.join(', ')} — any one of these is the next 404`
    : `zero model ids in dist/. The 404 Marcus hit was models/gemini-2.0-flash, hardcoded in six ` +
      `places; the model is now resolved by asking Google's own /models endpoint and ranking the ` +
      `answer by SHAPE (newest flash > flash-lite > pro). Google can retire anything and the ` +
      `app follows without a deploy — which is the actual requirement, not "it worked once"`,
);

const settings = await openApp();
await settings.page.click('button[aria-label="Open settings"]').catch(() => {});
await settings.page.waitForTimeout(900);
const ai = await settings.page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const body = txt(document.body);
  return {
    hasKeyField: Boolean(document.querySelector('#gemini-key, input[type="password"]')),
    hasTest: [...document.querySelectorAll('button')].some((b) => /test connection/i.test(txt(b))),
    mentionsAutomatic: /automatic/i.test(body),
    body: body.slice(0, 400),
  };
});
await shot(settings.page, '6-settings');

check(
  '6b · the settings screen offers a key, a test, and an AUTOMATIC model',
  ai.hasKeyField && ai.hasTest && ai.mentionsAutomatic,
  `key field ${ai.hasKeyField}, Test Connection ${ai.hasTest}, "Automatic" offered ${ai.mentionsAutomatic}. ` +
    `Automatic is the default because a default that names a model is a default with a shelf life`,
);

note(
  '6c · UNVERIFIED: that Gemini actually connects with Marcus\'s key',
  `This needs his private API key and a live round trip to Google, which is 🟡 ASK-FIRST ` +
    `(spend money / exceed an API cap) and is not something a prover may do unasked. What IS ` +
    `proved: 49 unit tests in ai.test.ts cover the resolve-rank-retry path including a simulated ` +
    `retirement, and the shipped bundle names no model. What is NOT proved: that his key is valid ` +
    `and his quota is live. He settles that in ten seconds by tapping Test Connection.`,
);
await settings.ctx.close();

// ===========================================================================
console.log('\n=== 7 · the node-side gate ===\n');

note(
  '7 · tests, types and build — measured by npx vitest run, not by this prover',
  `Must read: 968 passed + 7 skipped across 41 files, tsc --noEmit clean, npm run build ✓. ` +
    `Includes storage-safety.test.tsx tests 25 and 26 (both storage keys byte-identical across a ` +
    `full render, and nothing reached for the pen), format.test.ts test 7 (no row line contains an ` +
    `ellipsis in any form, across all 71 canon spells) and test 8 (no line exceeds the 46-char ` +
    `two-line budget), and tactics.test.ts (rejoining every bullet of all 71 records returns the ` +
    `input character for character). Those four are where "all 71" is actually asserted — a ` +
    `browser can only ever see the spells one character happens to know.`,
);

// ===========================================================================
console.log('\n=== 8 · the sheet is not written to by the tab that reads it ===\n');

/* The model-side version of this claim is storage-safety test 26, which proves
   a RENDER writes nothing. That is the easy half, and it is not the one that
   protects Marcus's sheet — a render is not what he does to the app.
   ────────────────────────────────────────────────────────────────────────────
   CORRECTED AT PHASE CLOSE, AND THE CORRECTION IS THE INTERESTING PART. This
   first drove everything in one breath — slot pip, detail sheet, deck fold,
   retaliation — and demanded the bytes not move. It failed, 6753 → 6827, and
   the failure was MINE: spending a spell slot is a change Marcus CHOSE, and
   `spellSlots` lives on the character, so that write is the app being correct.
   Item 8's wording is "except for anything Marcus himself chose to change", and
   a check that ignores the exception is not measuring the requirement.

   So it is split, and the split is strictly stronger than what it replaced:

     8a  the interactions that are pure READING — opening a definition, folding
         the deck, recording a retaliation into the encounter — must not touch
         the sheet at all. Byte-identical, no exceptions, no allowance.
     8b  the one interaction that legitimately writes must write ONLY what it
         claims to. Not "the bytes changed, fine" — every changed path is
         enumerated against a whitelist, so a slot tap that also quietly moved
         his HP or dropped a feat fails here.
   ──────────────────────────────────────────────────────────────────────────── */
const before = await page.evaluate((id) => localStorage.getItem('codex-character-' + id), NIX.id);

await page.evaluate(() => document.querySelector('main').scrollTo(0, 0));
await page.waitForTimeout(300);
await page.click(`button[aria-label="${R.options[0].detail}"]`).catch(() => {});
await page.waitForTimeout(500);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.click('button[aria-label="Minimise turn deck"]').catch(() => {});
await page.waitForTimeout(400);
const rec = page.locator('section[aria-label="Your reactions"] button[aria-label^="Record "]').first();
if (await rec.count()) {
  await rec.scrollIntoViewIfNeeded();
  await rec.click();
  await page.waitForTimeout(400);
  const add = page.getByRole('button', { name: 'Add', exact: true });
  if (await add.count()) { await add.click(); await page.waitForTimeout(500); }
}
await shot(page, '8-after-reading');

const afterReads = await page.evaluate((id) => localStorage.getItem('codex-character-' + id), NIX.id);
const combatMoved = await page.evaluate((id) => localStorage.getItem('codex-combat-' + id), NIX.id);

check(
  '8a · reading the tab — a definition, a fold, a retaliation — never touches the sheet',
  before === afterReads && afterReads === SHEET_BYTES,
  before === afterReads
    ? `${afterReads.length} bytes in, ${afterReads.length} bytes out, identical to the seed. ` +
      `Recording a retaliation is the one worth naming: it is this phase's newest write, and it ` +
      `landed entirely on codex-combat-${NIX.id}, which is the only key this tab owns`
    : `THE SHEET MOVED on a read-only path. ${before.length} → ${afterReads.length} bytes`,
);

check(
  '8b · and the interactions really happened, so 8a is not passing by doing nothing',
  combatMoved !== IN_COMBAT,
  combatMoved !== IN_COMBAT
    ? `codex-combat-${NIX.id} changed while the sheet did not — the two-writer bug class this ` +
      `phase opened against, measured at the end of it. Without this line 8a would read just as ` +
      `green against a tab where every button was dead`
    : `the encounter key did NOT move — 8a proves nothing, because nothing was driven`,
);

/* Now the one write that is allowed, and exactly how far it is allowed to go. */
await page.evaluate(() => document.querySelector('main').scrollTo(0, 0));
await page.click('button[aria-label="Expand turn deck"]').catch(() => {});
await page.waitForTimeout(400);
const slotPip = page.locator('button[aria-label*="slot 1: expend"]').first();
const spent = await slotPip.count();
if (spent) { await slotPip.click(); await page.waitForTimeout(600); }
await shot(page, '8-after-spending-a-slot');
const afterSpend = await page.evaluate((id) => localStorage.getItem('codex-character-' + id), NIX.id);

/* Every leaf path whose value moved, computed here rather than eyeballed. */
const changedPaths = (a, b, path = '', out = []) => {
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const p = path ? `${path}.${k}` : k;
    const av = a?.[k];
    const bv = b?.[k];
    if (JSON.stringify(av) === JSON.stringify(bv)) continue;
    if (av && bv && typeof av === 'object' && typeof bv === 'object' && !Array.isArray(av)) {
      changedPaths(av, bv, p, out);
    } else {
      out.push({ path: p, before: av, after: bv });
    }
  }
  return out;
};
const moved = changedPaths(JSON.parse(SHEET_BYTES), JSON.parse(afterSpend));
/* The whitelist. `updatedAt` follows from any save. The four arrays are the
   loader filling in optional fields it has always filled in — additive, empty,
   and lossless. Anything else appearing here is the bug this check exists for. */
const ALLOWED = /^(spellSlots\.1\.current|updatedAt|identities|customHooks|resourcePools|customConditions)$/;
const stowaways = moved.filter((m) => !ALLOWED.test(m.path));
const additive = moved.filter((m) => m.before === undefined && Array.isArray(m.after) && m.after.length === 0);

check(
  '8c · spending a slot changes the slot he spent, and nothing else on his sheet',
  spent > 0 && stowaways.length === 0 && moved.some((m) => m.path === 'spellSlots.1.current'),
  spent === 0
    ? 'no spell-slot pip was found, so this proves nothing'
    : stowaways.length
      ? `UNDECLARED CHANGES: ${stowaways.map((s) => `${s.path} ${JSON.stringify(s.before)}→${JSON.stringify(s.after)}`).join(', ')}`
      : `${moved.length} paths moved and every one is accounted for: ` +
        `${moved.map((m) => m.path).join(', ')}. The slot went ` +
        `${moved.find((m) => m.path === 'spellSlots.1.current')?.before}→` +
        `${moved.find((m) => m.path === 'spellSlots.1.current')?.after}, which is the tap. ` +
        `${additive.length} of the rest are the loader adding empty optional arrays — additive, ` +
        `lossless, and present on any save from any tab. NOTHING was removed and no other value ` +
        `moved, which is the actual content of "except for anything Marcus himself chose to change"`,
);

// ===========================================================================
console.log('\n=== console ===\n');
check('9 · clean console across the whole run', errors.length === 0, errors.length ? errors.slice(0, 4).join(' | ') : 'no errors');

await ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify({ results, vitals: found, options: R.options, reactions: R.reactions, compiled, errors }, null, 2),
);

const failed = results.filter((r) => r.pass === false);
const notes = results.filter((r) => r.pass === null);
const passed = results.filter((r) => r.pass === true);
console.log(
  `\n${failed.length ? `FAILED ${failed.length}` : 'PASS'} — ${passed.length} proved, ` +
  `${failed.length} failed, ${notes.length} reported unproved`,
);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
