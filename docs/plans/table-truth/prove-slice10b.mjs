// Prove Table Truth slice 10b against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice10b.mjs [baseUrl] [shotsDir]
//
// THE QUESTION THIS PROVER EXISTS TO SETTLE
//
// Gate 3's least-confident decision #1 asked, in as many words: *should the
// write path move at all in Phase 1, or should Phase 1 ship read-only and leave
// `CombatHelper` as the writer?* It has been carried, unanswered, since before
// a line of this phase was written, on the grounds that nine slices of evidence
// would be cheaper than a guess. This is the evidence.
//
// It is not an architecture question. Two components on the Play tab hold two
// separate models of the same turn:
//
//   · `CombatHelperInner` owns `combatState` (a useState) and persists it from
//     an effect. The turn deck spends through it. This is the LEGACY writer.
//   · `CombatProvider` reads `codex-combat-${id}` ONCE, in a state initialiser,
//     and has no effect of any kind — verified: zero `useEffect` in the file.
//     `composeTurn` gates every option's availability on `combat.turnActions`
//     (compose.ts:161-162), so the ranked list is composed from that snapshot.
//
// They agree at mount. The question is what happens after the first tap, and
// source alone cannot answer it with the confidence this decision needs.
//
// THE MEASUREMENT. The list prints its own count — "{n} ready" — from
// `turn.ranked.length`. Spend the Action on the deck and that number MUST fall:
// every action-costing option has just become unaffordable. If it does not
// move, the list is composing from a snapshot taken before the spend, and the
// app is offering Marcus options he has already paid for.
//
// Case C is the control that rules out a compose bug or a seeding artifact:
// reload, changing nothing else, and compare against the live number.
//
// WHAT IT MEASURED, BEFORE AND AFTER. Run against the code as it stood when
// this file was written, it failed 1 of 6:
//
//     4 ready on arrival  →  4 after the spend  →  1 after a reload
//                            ^^^^^^^^^^^^^^^^^ the bug, on screen, in numbers
//
// Run against the fix — one owner of `codex-combat-${id}`, `CombatProvider` —
// it passes 6 of 6 at 4 → 1 → 1. C is therefore stated as "the reload changes
// nothing", which is an assertion that can still go red: it fails on the old
// code (4 ≠ 1) and it will fail again the day a second copy of the state comes
// back. A prover kept as a description of a bug that has been fixed is a
// prover that tests nothing.
//
// Case E is the other half of the slice: finding AR, the writes that happened
// on MOUNT, before Marcus touched anything.
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
/* Overridable so the SAME prover can be run against a stashed pre-change build
   without clobbering the passing shots. `_shots-slice10b/before/` was produced
   exactly that way, and it is the other half of the proof: the two folders hold
   the same reads of the same tap, one on each side of the fix. */
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-slice10b';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Level 7 — MARCUS's level, not the fixture's 8. The provers seed the real
   character; the unit fixture sits at 8 on purpose for branch coverage. */
const PALADIN_AT_7 = {
  layOnHands: { max: 5 * 7, current: 5 * 7 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

/* In combat, your turn, NOTHING spent. The state the divergence starts from. */
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
      /* SEEDED ONLY IF ABSENT — and this is load-bearing, not tidiness.
         `addInitScript` runs on EVERY navigation, so an unconditional write
         here re-seeds the combat key during case C's reload and silently
         erases the spend case B just made. The first run of this prover did
         exactly that: case C reported 4 → 4 → 4 and "deck: available", which
         reads as "the reload did not help" when in truth the reload had been
         handed a fresh, unspent turn. A harness that resets the state it is
         measuring will always report no change, and will always look like
         evidence. */
      if (!localStorage.getItem('codex-combat-' + id)) {
        localStorage.setItem('codex-combat-' + id, combatJson);
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
    [NIX.id, JSON.stringify({ ...NIX, level: 7, paladinResources: PALADIN_AT_7 }), IN_COMBAT],
  );

  /* THE PEN, RECORDED. A SECOND init script, and the order is the point:
     Playwright runs these in the order they were added, so the seeding above
     has already happened by the time the wrapper is installed and no seed is
     ever counted as an app write. Everything after this is the app's own hand.

     Recording `setItem` rather than diffing the bytes, for the reason
     storage-safety.test.tsx gives: a write that happens to put back an
     identical string passes a byte comparison, and that is luck, not safety. */
  await ctx.addInitScript(() => {
    const writes = [];
    window.__writes = writes;
    const raw = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      writes.push(String(k));
      return raw.call(this, k, v);
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

/** What the two models each say, read off the PAINTED page.
 *
 *  `ready` comes from the list's own header, and `deck` from the deck's own
 *  aria-labels. Neither is recomputed here: recomputing would grade this
 *  prover's arithmetic instead of the app's, which is the slice-7 lesson and
 *  finding Q's. The two numbers are produced by two different components from
 *  two different objects, which is precisely the thing under test. */
const readBoth = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const list = document.querySelector('section[aria-label="Your turn options"]');
  const deck = document.querySelector('section[aria-label="Turn deck"]');

  const chips = {};
  for (const b of deck?.querySelectorAll('button[aria-label*=":"]') ?? []) {
    const m = /^(\w[\w ]*):\s*(used|available)$/.exec(b.getAttribute('aria-label') || '');
    if (m) chips[m[1]] = m[2];
  }

  return {
    /* "N ready" — turn.ranked.length, straight off the provider's model. */
    ready: Number((txt(list).match(/(\d+)\s+ready/) ?? [])[1] ?? -1),
    /* Every row the list is currently offering, by name. */
    rows: [...(list?.querySelectorAll('button[aria-label$="— details"]') ?? [])]
      .map((b) => (b.getAttribute('aria-label') || '').replace(/ — details$/, '')),
    /* "N more … under «Everything else»" — the options compose moved OUT of
       ranked. If a spend is seen, options leave `ranked` and this rises. */
    elsewhere: Number((txt(list).match(/(\d+)\s+more\b/) ?? [])[1] ?? 0),
    /* The legacy model's view of the same turn. */
    deck: chips,
    /* And what is actually on disk, which is the legacy writer's output. */
    stored: (() => {
      try {
        const id = localStorage.getItem('codex-active-id');
        return JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null')?.turnActions ?? null;
      } catch { return null; }
    })(),
  };
});

/* Framed on the list, not on whatever happened to be at the top of the page.
   The first cut of this shot caught the vitals band and the deck and left
   "YOUR TURN — n ready" cropped at the fold, so the picture showed everything
   except the thing under test. The deck is sticky and stays in frame anyway,
   which is what makes a single shot able to show BOTH models at once — and
   showing both at once is the entire claim of this slice. */
const shot = async (page, name) => {
  await page.evaluate(() => {
    document
      .querySelector('section[aria-label="Your turn options"]')
      ?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

// ===========================================================================
console.log('\n=== A · the two models agree on arrival ===\n');
const { ctx, page } = await openApp();

const before = await readBoth(page);
await shot(page, 'A-before-spend');
console.log('  list says   :', before.ready, 'ready —', before.rows.join(' | '));
console.log('  deck says   :', JSON.stringify(before.deck));
console.log('  on disk     :', JSON.stringify(before.stored));

check(
  'A · nothing is spent, and both models say so',
  before.ready > 0 && before.deck.Action === 'available' && before.stored?.action === false,
  `${before.ready} ready · deck Action=${before.deck.Action} · stored action=${before.stored?.action}`,
);

// ===========================================================================
console.log('\n=== B · spend the Action on the deck, and watch the list ===\n');

/* The tap a player makes. Nothing else is touched. */
await page.click('section[aria-label="Turn deck"] button[aria-label="Action: available"]');
await page.waitForTimeout(600);

const after = await readBoth(page);
await shot(page, 'B-after-spend');
console.log('  list says   :', after.ready, 'ready —', after.rows.join(' | '));
console.log('  deck says   :', JSON.stringify(after.deck));
console.log('  on disk     :', JSON.stringify(after.stored));

const deckSawIt = after.deck.Action === 'used' && after.stored?.action === true;
check(
  'B · the deck recorded the spend, and persisted it',
  deckSawIt,
  `deck Action=${after.deck.Action} · stored action=${after.stored?.action}`,
);

/* THE CLAIM. Action-costing options are now unaffordable, so `ranked` must
   shrink. Anything still listed is an option the app is offering Marcus for a
   slot he has already spent. */
const listMoved = after.ready !== before.ready || after.rows.join() !== before.rows.join();
check(
  'B · the ranked list noticed  <-- THIS IS THE DECISION',
  listMoved,
  listMoved
    ? `list moved ${before.ready} → ${after.ready} ready`
    : `list did NOT move: still ${after.ready} ready, same rows. The deck says the Action ` +
      `is spent and the disk agrees, but the list is still composed from the snapshot ` +
      `read at mount. Rows still offered: ${after.rows.join(' | ')}`,
);

// ===========================================================================
console.log('\n=== C · reload, changing nothing else ===\n');

/* If the number is correct ONLY after a reload, the cause is the staleness and
   nothing else. This is the control that rules out a compose bug or a seeding
   artifact — the same bytes, the same code, one fresh mount. */
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const reloaded = await readBoth(page);
await shot(page, 'C-after-reload');
console.log('  list says   :', reloaded.ready, 'ready —', reloaded.rows.join(' | '));
console.log('  deck says   :', JSON.stringify(reloaded.deck));
console.log('  on disk     :', JSON.stringify(reloaded.stored));

/* The spend must survive a reload at all — otherwise "the list moved" in B
   could be a render that never reached the disk. */
check(
  'C · the spend is still on disk after a reload',
  reloaded.stored?.action === true && reloaded.deck.Action === 'used',
  `deck Action=${reloaded.deck.Action} · stored action=${reloaded.stored?.action}`,
);

/* THE REGRESSION GUARD. Post-fix the reload teaches the list nothing, because
   the list was already right. Pre-fix this is 4 vs 1 and goes red. */
const reloadChangedNothing =
  reloaded.ready === after.ready && reloaded.rows.join() === after.rows.join();
check(
  'C · the reload changes nothing — the live list was already right',
  reloadChangedNothing,
  reloadChangedNothing
    ? `${before.ready} on arrival → ${after.ready} after the spend → ${reloaded.ready} after a reload. ` +
      `The reload is a no-op, which is the whole claim: one owner of the state, and every ` +
      `surface on the tab composing from it.`
    : `STALE. ${before.ready} → ${after.ready} (spend) → ${reloaded.ready} (reload). The list is ` +
      `right only after a reload, so something is composing from a snapshot again. Rows still ` +
      `offered after the spend: ${after.rows.join(' | ')}`,
);

// ===========================================================================
console.log('\n=== E · finding AR: what the tab writes before Marcus touches it ===\n');

/* A FRESH context, opened and left alone. No tap, no scroll, nothing. Two
   effects used to fire here — `CombatHelper`'s `saveCombatState` and
   `TurnSummary`'s `saveActionNotes` — and between them they rewrote the
   encounter and the notes of a player who had done nothing but look at the
   screen. On a suspended tab that is not merely untidy: it is the app's copy
   of the state overwriting the player's, unprompted.

   Waited out to 2.5s rather than read immediately, because an effect that
   fires late still fires. A prover that reads too early proves its own
   impatience. */
const fresh = await openApp();
await fresh.page.waitForTimeout(1000);
const mountWrites = await fresh.page.evaluate(() => window.__writes ?? []);
await fresh.ctx.close();

const AR_KEYS = /^codex-(combat|action-notes)-/;
const offenders = mountWrites.filter((k) => AR_KEYS.test(k));
console.log('  keys written on mount:', mountWrites.length ? [...new Set(mountWrites)].join(', ') : '(none)');
check(
  'E · nothing writes the encounter or the notes on mount — finding AR',
  offenders.length === 0,
  offenders.length
    ? `wrote ${[...new Set(offenders)].join(', ')} with no input from the player`
    : `${mountWrites.length} write(s) on load, none of them codex-combat-* or codex-action-notes-*`,
);

// ===========================================================================
console.log('\n=== D · no errors on the console throughout ===\n');
check('D · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

await ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify({ before, after, reloaded, mountWrites, results, errors }, null, 2),
);
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`}`);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
