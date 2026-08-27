// Prove Table Truth slice 4 against the REAL running app.
//
//   npm run build && npm run preview      (in another shell)
//   node docs/plans/table-truth/prove-slice4.mjs [baseUrl]
//
// Slice 4 is two minimise controls, and a minimise control is the one kind of
// feature a unit test cannot honestly grade: the whole claim is about SPACE and
// about what is still on screen afterwards. `npm test` runs in the node
// environment with no DOM, no layout and no pixels, so a passing unit test here
// would be a test of my own mock. The claim is geometric, so the proof is
// geometric — every number below is measured off the painted page.
//
// WHAT IS UNDER TEST, stated as the things that could go wrong:
//
//   A. THE DEFAULT DID NOT MOVE (the deck). V-6 grades painted controls, so a
//      deck that shipped minimised would pass the criterion by hiding its
//      subject. Fresh profile must render the deck EXPANDED, Lay on Hands and
//      Channel Divinity painted.
//
//   B. MINIMISE ≠ HIDE. After minimising, every piece of turn STATE is still
//      painted and still tappable: four economy chips, every slot pip. Only
//      words and the class economy fold. And it must return real height —
//      measured off `--turn-deck-h`, the variable the whole layout reads.
//
//   C. IT REMEMBERS. Reload and the choice survives, per character, in the
//      `codex-ui-` map that already existed. No new storage key.
//
//   D. THE FOLDED HEADER STATES ITS OWN STATE. This is the condition on which
//      Active Conditions was allowed to fold at all. Closed, it must say
//      "None" with none active and NAME the condition when one is.
//
//   E. NOTHING IS ORPHANED. The Lay on Hands drawer hangs off a row that folds.
//      Open the drawer, minimise, and Cure Poison must not be left floating.
//
// Storage guard as in slice 3, with `codex-ui-<id>` added to the allow-list —
// that is where both folds persist, and adding no new key is part of the claim.
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

const BASE = (process.argv[2] || 'http://localhost:4173/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-slice4';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Slice 4 may write this and nothing else. `codex-ui-<id>` is the map every
   fold in the app already shares — adding no new key is part of the claim. */
const ALLOWED = new Set([`codex-ui-${NIX.id}`]);

/* What the app does to a character just by opening it — established in slice 3,
   and re-derived here rather than trusted: see the control check at the end. */
const BOOT_FILL = new Set([
  'updatedAt', 'identities', 'campaignId', 'customHooks', 'resourcePools', 'customConditions',
]);

const browser = await chromium.launch();
const errors = [];
const steps = [];

const ctx = await browser.newContext({
  viewport: { width: PHONE.width, height: PHONE.height },
  deviceScaleFactor: PHONE.dsf,
  hasTouch: true,
});
/* The fixture has no `paladinResources`, and the first run of this prover is
   how that was found: the deck was expanded and correct, and the Lay on Hands
   and Channel Divinity rows — the two rows slice 4 claims to fold — simply were
   not on the page. `TurnDeck` gates them on `character.paladinResources`, which
   is an OPTIONAL field that nothing derives at boot; the only writer in the
   whole app is a manual "upgrade character" button in Settings.tsx:361. So a
   level-8 Paladin who never pressed that button has no Lay on Hands anywhere in
   this app. That is a real defect, recorded as finding R in 00-status.md, and it
   is NOT slice 4's to fix — slice 4 folds these rows, it does not create them.
   Seeded here with the app's own formula (character.ts:1248, level 8) so that
   the thing under test is actually painted. */
const PALADIN_AT_8 = {
  layOnHands: { max: 5 * 8, current: 5 * 8 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

await ctx.addInitScript(
  ([id, seedJson]) => {
    localStorage.setItem('codex-character-' + id, seedJson);
    localStorage.setItem('codex-active-id', id);
    const seed = JSON.parse(seedJson);
    localStorage.setItem('codex-roster', JSON.stringify([
      { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
        updatedAt: '2026-08-16T00:00:00.000Z' },
    ]));
  },
  [NIX.id, JSON.stringify({ ...NIX, paladinResources: PALADIN_AT_8 })],
);

const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

/** Everything slice 4 claims about the painted page, read in one pass. */
const measure = () => page.evaluate(() => {
  const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const deck = document.querySelector('section[aria-label="Turn deck"]');
  /* Scoped to the deck, not the document. Every claim below is a claim about
     what the DECK paints, and the level labels read [1st 2nd 1st 2nd] on the
     first run because the page behind the deck has its own slot row. A prover
     that reads through the thing it is measuring is measuring the wrong thing
     even when the number happens to come out right. */
  const words = [...(deck?.querySelectorAll('span') ?? [])].map(txt);
  const chips = [...(deck?.querySelectorAll('button[aria-pressed]') ?? [])]
    .filter((b) => /: (used|available)$/.test(b.getAttribute('aria-label') || ''));

  /* The Active Conditions section, scoped to the section itself.
     Two corrections the first run forced, both in this prover:
       · the grid was counted by text across the WHOLE document, so once Prone
         was applied the badge the HP card paints for an active condition was
         counted as a grid button and "re-folding left the grid painted" — the
         fold was fine, the tape measure was not.
       · the card height read `closest('[class*="rounded"]')`, which matches
         nothing above this button and silently returned 0 in all eight steps.
         A zero that means "I could not measure" is indistinguishable from a
         zero that means "nothing moved", which is exactly the failure a proof
         is supposed to make impossible. The section wrapper is the header's own
         parent (HPTracker.tsx:501), so it is asked directly. */
  const condHeader = [...document.querySelectorAll('button')]
    .find((b) => /^Active Conditions/i.test(txt(b)));
  const condSection = condHeader?.parentElement ?? null;
  const condGrid = condSection
    ? [...condSection.querySelectorAll('button')].filter((b) => b !== condHeader)
    : [];

  return {
    deckH: parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--turn-deck-h'), 10) || 0,
    chips: chips.map((b) => {
      /* `word` is textContent, which is the FULL string even when CSS has
         ellipsised it on screen — the first run of this prover reported four
         happy labels while the phone showed "A…" "B…" "R…" "M…". So the word is
         not evidence; the geometry is. A span whose scrollWidth exceeds the
         width it was given is a word the eye cannot finish reading. */
      const span = b.querySelector('span');
      return {
        name: b.getAttribute('aria-label'),
        word: txt(b),
        h: Math.round(b.getBoundingClientRect().height),
        w: Math.round(b.getBoundingClientRect().width),
        clipped: span ? span.scrollWidth > Math.ceil(span.getBoundingClientRect().width) + 1 : false,
      };
    }),
    /* Slot pips and Channel Divinity pips are both `.pip-tap`, and counting
       them together said "B lost 2 pips" when what B lost was the Channel
       Divinity row — a loss slice 4 declares in the source and Gate 2 licensed.
       Counting them apart is the difference between the prover catching a
       regression and the prover re-reporting a decision. */
    slotPips: [...(deck?.querySelectorAll('.pip-tap') ?? [])]
      .filter((b) => /spell slot$/.test(b.getAttribute('aria-label') || '')).length,
    cdPips: [...(deck?.querySelectorAll('.pip-tap') ?? [])]
      .filter((b) => /Channel Divinity/.test(b.getAttribute('aria-label') || '')).length,
    layOnHands: words.includes('LAY ON HANDS'),
    channelDivinity: words.includes('CHANNEL DIVINITY'),
    slotCaption: words.includes('SPELL SLOTS'),
    levelLabels: words.filter((w) => /^\d(st|nd|rd|th)$/.test(w)),
    curePoison: [...(deck?.querySelectorAll('button') ?? [])].some((b) => /Cure Poison/.test(txt(b))),
    condHeaderText: condHeader ? txt(condHeader) : null,
    condHeaderH: condHeader ? Math.round(condHeader.getBoundingClientRect().height) : 0,
    condGridPainted: condGrid.length,
    condSectionH: condSection ? Math.round(condSection.getBoundingClientRect().height) : -1,
  };
});

const readStorage = () => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
  }
  return out;
});

async function settle(ms = 1500) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function step(name, shot = true) {
  const m = await measure();
  steps.push({ name, ...m });
  if (shot) await page.screenshot({ path: `${OUT}/${name}.png` });
  return m;
}

await page.goto(BASE, { waitUntil: 'load' });
await settle();
const storageAtBoot = await readStorage();

const A = await step('A-default-deck-expanded');

// ── B. Minimise. ────────────────────────────────────────────────────────────
await page.getByRole('button', { name: 'Minimise turn deck' }).click();
await page.waitForTimeout(500);
const B = await step('B-deck-minimised');

// ── C. Reload and see whether it remembers. ─────────────────────────────────
await page.reload({ waitUntil: 'load' });
await settle();
const C = await step('C-minimised-after-reload');

// Back open, so the rest of the run is not measuring a folded deck.
await page.getByRole('button', { name: 'Expand turn deck' }).click();
await page.waitForTimeout(500);
const C2 = await step('C2-expanded-again', false);

// ── E. The drawer must not be orphaned by a minimise. ───────────────────────
await page.getByRole('button', { name: 'Show exact amounts' }).click();
await page.waitForTimeout(300);
const E1 = await measure();
await page.getByRole('button', { name: 'Minimise turn deck' }).click();
await page.waitForTimeout(400);
const E2 = await step('E-drawer-not-orphaned');
await page.getByRole('button', { name: 'Expand turn deck' }).click();
await page.waitForTimeout(400);

// ── D. The folded conditions header states its own state. ──────────────────
const D1 = await step('D1-conditions-folded-none');
await page.getByRole('button', { name: /^Active Conditions/ }).click();
await page.waitForTimeout(400);
const D2 = await step('D2-conditions-open');
await page.getByRole('button', { name: /^Prone:/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /^Active Conditions/ }).click();
await page.waitForTimeout(400);
const D3 = await step('D3-folded-but-names-it');

const storageAtEnd = await readStorage();
await browser.close();

// ── the diff ────────────────────────────────────────────────────────────────
const changed = [];
for (const k of new Set([...Object.keys(storageAtBoot), ...Object.keys(storageAtEnd)])) {
  if (storageAtBoot[k] === storageAtEnd[k]) continue;
  let detail = '';
  try {
    const a = JSON.parse(storageAtBoot[k] ?? 'null'), b = JSON.parse(storageAtEnd[k] ?? 'null');
    if (a && b && typeof a === 'object' && !Array.isArray(a)) {
      const f = [...new Set([...Object.keys(a), ...Object.keys(b)])]
        .filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
      detail = f.length ? `{${f.join(',')}}` : '';
    }
  } catch { /* not JSON */ }
  changed.push(`${k}${detail}`);
}
const illegal = changed.filter((entry) => {
  const key = entry.replace(/\{.*$/, '');
  if (ALLOWED.has(key)) return false;
  if (key === 'codex-roster' || key.startsWith('codex-campaign-')) return false;
  if (key.startsWith('codex-character-')) {
    const fields = (/\{(.*)\}/.exec(entry)?.[1] ?? '').split(',').filter(Boolean);
    // `conditions` is legitimate here — case D taps Prone on purpose.
    return !fields.length || !fields.every((f) => BOOT_FILL.has(f) || f === 'conditions');
  }
  return true;
});

// ── the report ──────────────────────────────────────────────────────────────
console.log(`\nSLICE 4 PROOF — ${BASE}\n`);
for (const s of steps) {
  console.log(`── ${s.name}`);
  console.log(`   deck:    --turn-deck-h ${s.deckH}px · ${s.chips.length} chips (${
    s.chips.map((c) => `${c.word || '·'}@${c.w}${c.clipped ? '!CLIPPED' : ''}`).join(' ')}) · ${
    s.slotPips} slot pips + ${s.cdPips} CD · levels [${s.levelLabels.join(' ')}]`);
  console.log(`   folds:   SPELL SLOTS ${s.slotCaption ? 'shown' : 'folded'} · LAY ON HANDS ${
    s.layOnHands ? 'shown' : 'folded'} · CHANNEL DIVINITY ${
    s.channelDivinity ? 'shown' : 'folded'} · Cure Poison ${s.curePoison ? 'shown' : 'folded'}`);
  console.log(`   conds:   «${s.condHeaderText}» · grid ${s.condGridPainted} painted · section ${s.condSectionH}px`);
}
console.log(`\nreclaimed: deck ${A.deckH - B.deckH}px · conditions ${D2.condSectionH - D1.condSectionH}px`);
console.log(`storage:   changed [${changed.join(', ') || 'none'}]`);
console.log(`           illegal [${illegal.join(', ') || 'none'}]`);
console.log(`console:   ${errors.length} error(s)`);
for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:     ${OUT}/`);
writeFileSync(`${OUT}/_report.json`, JSON.stringify({ steps, changed, illegal, errors }, null, 2));

// ── the grade ───────────────────────────────────────────────────────────────
const failures = [];
if (errors.length) failures.push('console errors');
if (illegal.length) failures.push(`wrote [${illegal.join(', ')}]`);

// A — the default did not move.
if (!(A.layOnHands && A.channelDivinity && A.slotCaption))
  failures.push('A: the deck did not default to expanded — V-6 default paint changed');
if (A.chips.length !== 4) failures.push(`A: ${A.chips.length} economy chips, expected 4`);
/* The four words in full, not "does it contain a letter". The check that used
   to live here was `/\w/.test(word)` and it passed against "A…" — textContent
   still says "Action" after CSS has clipped it, so the loose check could never
   have caught the thing it existed to catch. */
const WORDS = ['Action', 'Bonus', 'Reaction', 'Move'];
if (A.chips.map((c) => c.word).join('|') !== WORDS.join('|'))
  failures.push(`A: chip words are [${A.chips.map((c) => c.word).join('|')}], expected [${WORDS.join('|')}]`);
for (const c of A.chips) {
  if (c.clipped) failures.push(`A: "${c.word}" is clipped at ${c.w}px — the word cannot be read`);
}
if (A.condGridPainted !== 0) failures.push('A: Active Conditions did not default to folded');

// B — minimise ≠ hide, and it returns real height.
if (B.chips.length !== A.chips.length) failures.push(`B: lost economy chips (${B.chips.length})`);
if (B.slotPips !== A.slotPips) failures.push(`B: lost slot pips (${B.slotPips} vs ${A.slotPips})`);
/* The declared loss, asserted as a loss rather than left to be noticed. If a
   later slice puts Channel Divinity in the spine this line fails, and that is
   the correct moment to revisit the V-6 override in TurnDeck.tsx's header. */
if (A.cdPips === 0) failures.push('B: no Channel Divinity pips to begin with — the override is untested');
if (B.cdPips !== 0) failures.push(`B: Channel Divinity pips survived the fold (${B.cdPips})`);
if (B.levelLabels.join() !== A.levelLabels.join())
  failures.push(`B: lost the level labels [${B.levelLabels.join(' ')}]`);
if (B.layOnHands || B.channelDivinity || B.slotCaption)
  failures.push('B: minimised but the words and the class economy are still painted');
if (B.chips.some((c) => c.word !== ''))
  failures.push(`B: chip words did not fold (${B.chips.map((c) => c.word).join('|')})`);
if (A.deckH - B.deckH < 60)
  failures.push(`B: reclaimed only ${A.deckH - B.deckH}px, expected 60+`);
for (const c of [...A.chips, ...B.chips]) {
  if (c.h < 48) failures.push(`chip "${c.name}" is ${c.h}px, floor is 48`);
}

// C — it remembers, and expanding restores everything.
if (C.deckH !== B.deckH) failures.push(`C: reload did not remember the minimise (${C.deckH}px)`);
if (C2.deckH !== A.deckH) failures.push(`C: expanding did not restore full height (${C2.deckH}px)`);
if (!(C2.layOnHands && C2.channelDivinity)) failures.push('C: expanding did not bring back the class economy');

// D — the folded header states its own state.
if (!/None$/.test(D1.condHeaderText ?? '')) failures.push(`D: folded header does not say None («${D1.condHeaderText}»)`);
if (D1.condGridPainted !== 0) failures.push('D: folded, but the grid is still painted');
if (D2.condGridPainted === 0) failures.push('D: opening the section painted no conditions');
if (!/Prone/.test(D3.condHeaderText ?? ''))
  failures.push(`D: folded header does not name the active condition («${D3.condHeaderText}»)`);
if (D3.condGridPainted !== 0) failures.push('D: re-folding left the grid painted');
if (D1.condHeaderH < 48) failures.push(`D: the header is ${D1.condHeaderH}px, floor is 48`);
if (D1.condSectionH < 0) failures.push('D: could not find the conditions section to measure it');
if (D2.condSectionH - D1.condSectionH < 150)
  failures.push(`D: folding the conditions returned only ${D2.condSectionH - D1.condSectionH}px`);

// E — nothing orphaned.
if (!E1.curePoison) failures.push('E: the drawer never opened, so the orphan check proved nothing');
if (E2.curePoison) failures.push('E: minimising left the Cure Poison button orphaned');

if (failures.length) {
  console.log(`\nFAILED:\n${failures.map((f) => `   - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nPASS');
