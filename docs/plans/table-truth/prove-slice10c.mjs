// Prove Table Truth slice 10c against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice10c.mjs [baseUrl] [shotsDir]
//
// THE QUESTION THIS PROVER EXISTS TO SETTLE
//
// Since slice 7 the app has had a "Spend" button. Since slice 1 it has had a
// reducer that spends, refuses illegal spends and can put them back. In eleven
// slices the two have never been connected: `OptionDetailSheetLive` never
// passed `onSpend`, so the button was gated off and never painted, and
// `CombatApi.take` was reachable only from `TurnScreenD` behind the `D_PREVIEW`
// flag — dead code on the real Play tab. At a table Marcus read the option in
// the sheet and then went and darkened the deck chip with his own thumb.
//
// So the claim is a round trip, and it has to be measured end to end:
//
//     tap a row  →  the sheet offers a Spend  →  tap it  →  the sheet closes,
//     the deck chip goes dark, the bytes on disk change, and the list re-ranks
//
// WHY EVERY LINK MATTERS. Two of the four links existed already and one of them
// used to be a lie. Before 10b two components held two models of one turn, so
// the deck could go dark while the list carried on offering options that had
// just been paid for (finding BB). This prover therefore reads the deck AND the
// list AND the disk after the same single tap: agreement across all three is
// the only reading that distinguishes "the app spent it" from "one component
// thinks it did".
//
// WHY B IS ITS OWN CASE. `spendFor` was widened in this slice — it used to
// return null for anything that burned neither a spell slot nor a resource
// pool, which meant Sacred Flame and Javelin, two of the four rows on a fresh
// turn, could not be spent at all. Case B asserts the button is painted for an
// Action-cost option, and it is the assertion that goes red on every build
// before 10c: there is no button there to press, so C cannot even be attempted.
//
// WHAT IS NOT PROVED HERE, and is said out loud rather than implied. The
// refusal band added in this slice is a GUARD, not a workflow: `spendFor`
// returns null for an unavailable option, so the sheet does not paint a button
// the reducer would refuse — and `detail.test.ts` runs the real reducer over
// every option the real composer offers, in three sessions, to hold that true.
// A refusal is therefore not reachable by tapping, which is why it is proved by
// render test and not here. A prover that faked one would be grading itself.
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
/* Overridable for the same reason 10b's was: the SAME prover has to be runnable
   against a stashed pre-change build, and its shots must not clobber the
   passing ones. `_shots-slice10c/before/` is produced exactly that way. */
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-slice10c';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Level 7 — Marcus's level, not the unit fixture's 8. */
const PALADIN_AT_7 = {
  layOnHands: { max: 5 * 7, current: 5 * 7 },
  channelDivinity: { max: 2, current: 2 },
  auraRange: 10,
};

/* In combat, your turn, NOTHING spent. */
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
      /* SEEDED ONLY IF ABSENT. Inherited verbatim from 10b's prover and it is
         load-bearing there and here: `addInitScript` runs on EVERY navigation,
         so an unconditional write re-seeds the combat key during case D's
         reload and silently erases the spend case C just made. A harness that
         resets the state it is measuring always reports no change, and always
         looks like evidence. */
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

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** The three witnesses, read off the PAINTED page — the list, the deck, and the
 *  disk. Nothing here recomputes anything: recomputing grades this file's
 *  arithmetic instead of the app's (finding Q, slice 4). */
const readAll = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const list = document.querySelector('section[aria-label="Your turn options"]');
  const deck = document.querySelector('section[aria-label="Turn deck"]');

  const chips = {};
  for (const b of deck?.querySelectorAll('button[aria-label*=":"]') ?? []) {
    const m = /^(\w[\w ]*):\s*(used|available)$/.exec(b.getAttribute('aria-label') || '');
    if (m) chips[m[1]] = m[2];
  }

  /* WHICH DIALOG IS ACTUALLY OPEN — decided by GEOMETRY, not by presence.
     `querySelector('[role="dialog"]')` picked the Dice Roller on the first run
     of this prover and reported "no Spend button" on a sheet that had one, and
     the reason is a defect older than this phase: `DiceRoller` and
     `MechanicsDrawer` are hand-rolled overlays (they do not use `Sheet`, which
     unmounts) and sit in the DOM permanently, each declaring
     `role="dialog" aria-modal="true"`, parked at y=844 on an 844-tall viewport
     with `pointer-events: none`. `checkVisibility()` returns TRUE for both.
     Only the transform keeps them off the glass — see finding BC.

     So: on screen means the top edge is above the fold. That is a claim about
     the paint, which is the standard finding Q set in slice 4. */
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const onScreen = dialogs.filter((d) => d.getBoundingClientRect().top < window.innerHeight - 1);
  const dialog = onScreen[onScreen.length - 1] ?? null;
  const spendBtn = [...(dialog?.querySelectorAll('button') ?? [])].find((b) =>
    /^\s*Spend/.test(txt(b)),
  );

  return {
    ready: Number((txt(list).match(/(\d+)\s+ready/) ?? [])[1] ?? -1),
    rows: [...(list?.querySelectorAll('button[aria-label$="— details"]') ?? [])]
      .map((b) => (b.getAttribute('aria-label') || '').replace(/ — details$/, '')),
    deck: chips,
    /* The sheet: open at all, on which option, and does it offer a spend. */
    sheet: dialog ? (dialog.getAttribute('aria-label') || '(unlabelled)') : null,
    /* Every dialog in the DOM, on screen or not — finding BC's raw number. */
    dialogsInDom: dialogs.map((d) => d.getAttribute('aria-label')),
    dialogsOnScreen: onScreen.map((d) => d.getAttribute('aria-label')),
    spendLabel: spendBtn ? txt(spendBtn) : null,
    refusal: txt(dialog?.querySelector('[role="alert"]')) || null,
    stored: (() => {
      try {
        const id = localStorage.getItem('codex-active-id');
        return JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null')?.turnActions ?? null;
      } catch { return null; }
    })(),
  };
});

/* Framed on the list where the deck is also in shot (it is sticky), or on the
   sheet when the sheet is up — the sheet is a full-height overlay, so scrolling
   underneath it would move nothing anyone can see. */
const shot = async (page, name) => {
  await page.evaluate(() => {
    /* Same geometric test as `readAll` — two dialogs are ALWAYS in the DOM
       (finding BC), so "is a dialog present" would never scroll the list. */
    const open = [...document.querySelectorAll('[role="dialog"]')].some(
      (d) => d.getBoundingClientRect().top < window.innerHeight - 1,
    );
    if (open) return;
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
console.log('\n=== A · arrival: a full turn, and rows to spend it on ===\n');
const { ctx, page } = await openApp();

const before = await readAll(page);
await shot(page, 'A-arrival');
console.log('  list says :', before.ready, 'ready —', before.rows.join(' | '));
console.log('  deck says :', JSON.stringify(before.deck));
console.log('  on disk   :', JSON.stringify(before.stored));

check(
  'A · nothing is spent, and all three witnesses say so',
  before.ready > 0 && before.deck.Action === 'available' && before.stored?.action === false,
  `${before.ready} ready · deck Action=${before.deck.Action} · stored action=${before.stored?.action}`,
);

// ===========================================================================
console.log('\n=== B · tap a row: does the sheet offer a way to spend it? ===\n');

/* An option whose cost is the ACTION and nothing else — the case `spendFor`
   used to return null for, which is the case that matters. Sacred Flame by
   preference because it is a cantrip and so cannot be confused with a slot
   spend; any Action row will do if the fixture ever loses it. */
const TARGET = before.rows.includes('Sacred Flame') ? 'Sacred Flame' : before.rows[0];
console.log('  tapping row:', TARGET);
await page.click(
  `section[aria-label="Your turn options"] button[aria-label="${TARGET} — details"]`,
);
await page.waitForTimeout(600);

const opened = await readAll(page);
await shot(page, 'B-sheet-open');
console.log('  sheet     :', opened.sheet);
console.log('  spend btn :', opened.spendLabel ?? '(none painted)');

check(
  'B · the sheet opened on the option that was tapped',
  opened.sheet === TARGET,
  `dialog aria-label=${JSON.stringify(opened.sheet)}, tapped ${JSON.stringify(TARGET)}`,
);

/* FINDING BC, measured rather than described. Exactly one dialog may be on the
   glass; the other two are the permanently-mounted hand-rolled overlays, and
   the gap between the two numbers below IS the defect. Asserted as "one on
   screen" because that is the claim this slice can honestly make — the DOM
   count is printed so the defect cannot be lost. */
check(
  'B · exactly one dialog is on the glass — and see finding BC for the rest',
  opened.dialogsOnScreen.length === 1,
  `on screen: ${opened.dialogsOnScreen.join(', ') || '(none)'} · in the DOM: ` +
    `${opened.dialogsInDom.join(', ')} — the extras are DiceRoller and MechanicsDrawer, ` +
    `mounted always, aria-modal="true" always, parked off the bottom edge`,
);

/* THE DECISION. Before this slice the button was never painted on the Play tab
   at all — `onSpend` was not passed, and for an Action-cost option
   `detail.spend` was null as well, so both halves of the gate were shut. */
check(
  'B · it offers a Spend, and names the cost  <-- THIS IS THE SLICE',
  Boolean(opened.spendLabel),
  opened.spendLabel
    ? `button reads ${JSON.stringify(opened.spendLabel)}`
    : `NO Spend button. The sheet describes the option perfectly and gives Marcus no way ` +
      `to take it — he has to close this and darken the deck chip by hand, which is the ` +
      `whole of what slice 10c exists to end.`,
);

// ===========================================================================
console.log('\n=== C · press it: one tap, three witnesses ===\n');

if (opened.spendLabel) {
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('[role="dialog"]')].filter(
      (d) => d.getBoundingClientRect().top < window.innerHeight - 1,
    );
    const dialog = open[open.length - 1];
    const btn = [...(dialog?.querySelectorAll('button') ?? [])].find((b) =>
      /^\s*Spend/.test((b.textContent || '').replace(/\s+/g, ' ').trim()),
    );
    btn?.click();
  });
  await page.waitForTimeout(700);
} else {
  console.log('  (skipped — there was no button to press)');
}

const spent = await readAll(page);
await shot(page, 'C-after-spend');
console.log('  sheet     :', spent.sheet ?? '(closed)');
console.log('  list says :', spent.ready, 'ready —', spent.rows.join(' | '));
console.log('  deck says :', JSON.stringify(spent.deck));
console.log('  on disk   :', JSON.stringify(spent.stored));

check(
  'C · the sheet closed — the option has been taken, not merely read',
  spent.sheet === null,
  spent.sheet === null ? 'dialog gone' : `dialog still up on ${JSON.stringify(spent.sheet)}`,
);

check(
  'C · the deck went dark and the disk agrees',
  spent.deck.Action === 'used' && spent.stored?.action === true,
  `deck Action=${spent.deck.Action} · stored action=${spent.stored?.action}`,
);

/* The third witness, and the one 10b bought: the list must re-rank off the same
   object. If this passes while the deck passes, there is one model. */
const listMoved = spent.ready !== before.ready || spent.rows.join() !== before.rows.join();
check(
  'C · the list re-ranked off the same spend — one model, still',
  listMoved,
  listMoved
    ? `${before.ready} → ${spent.ready} ready; dropped: ` +
      `${before.rows.filter((r) => !spent.rows.includes(r)).join(' | ') || '(none by name)'}`
    : `the list did not move: still ${spent.ready} ready, same rows, while the deck says the ` +
      `Action is gone. Two models of one turn are back.`,
);

// ===========================================================================
console.log('\n=== D · reload: the spend was real, not a render ===\n');

await page.reload({ waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const reloaded = await readAll(page);
await shot(page, 'D-after-reload');
console.log('  list says :', reloaded.ready, 'ready —', reloaded.rows.join(' | '));
console.log('  deck says :', JSON.stringify(reloaded.deck));
console.log('  on disk   :', JSON.stringify(reloaded.stored));

const survived = reloaded.stored?.action === true && reloaded.deck.Action === 'used';
const unchanged =
  reloaded.ready === spent.ready && reloaded.rows.join() === spent.rows.join();
check(
  'D · the spend survived the reload and the reload taught the list nothing',
  survived && unchanged,
  survived && unchanged
    ? `${before.ready} on arrival → ${spent.ready} after the Spend → ${reloaded.ready} after a ` +
      `reload. The reload is a no-op, which is 10b's guarantee holding through a write path ` +
      `10b did not have.`
    : `survived=${survived} (deck ${reloaded.deck.Action}, disk ${reloaded.stored?.action}) · ` +
      `unchanged=${unchanged} (${spent.ready} live vs ${reloaded.ready} reloaded)`,
);

// ===========================================================================
console.log('\n=== E · no errors on the console throughout ===\n');
check('E · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

await ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify({ target: TARGET, before, opened, spent, reloaded, results, errors }, null, 2),
);
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`}`);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
