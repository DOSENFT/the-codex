// Prove Table Truth slice 10d against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice10d.mjs [baseUrl] [shotsDir]
//
// THE TWO CLAIMS THIS PROVER EXISTS TO SETTLE
//
// Canon's HEARTH-04 is one sentence: "If the cloak is active and the player
// gains Temporary Hit Points from another source, the app must prompt." Measured
// before this slice, the app did the opposite twice over:
//
//   1. `setTempHP` was a blind assignment. 11 from the cloak became 5 from
//      anywhere, the cloak ended by its own wording, and nothing said a word.
//      That is VAL-06, pinned `it.fails` in slice 10a.
//
//   2. Taking the cloak granted NOTHING. `_probe10d.mjs` ran the real reducer:
//      `tempHP` before 0 → after 0, while the detail sheet was on screen showing
//      Marcus "11 temp HP" computed from canon's own formula. The app did the
//      arithmetic and then made him type the answer into a different screen.
//
// So the run below is one continuous session at a table, and every number in it
// is read off the PAINTED page or off the DISK — never recomputed here. A prover
// that recomputes grades its own arithmetic (finding Q, slice 4).
//
//   A  arrival — no pool, no warning. The quiet state.
//   B  type 5 into Temp HP over an empty pool: ONE press, no warning. The
//      control, and the regression guard — a prompt that fires on the ordinary
//      case is a prompt nobody reads.
//   C  type 3 over that live 5. The warning must be ON THE GLASS (geometry, not
//      textContent), the first press must NOT destroy the pool, and the button
//      must change its verb to name what it is about to do.   <-- HEARTH-04
//   D  open Flaming Cloak: the same warning, above the Spend button, on the
//      other surface that can replace a pool. A rule enforced on one surface
//      only is not enforced.
//   E  press Spend: the pool becomes canon's computed number and the app records
//      WHAT granted it.                                        <-- THE GRANT
//   F  clean console throughout.
//
// WHY C USES A SMALLER NUMBER AND D A LARGER ONE. 3 over 5 is the trade the old
// code silently made worse; 11 over 3 is a replacement that is not worse and
// must still warn, because the cloak "lasts until the Temporary Hit Points are
// depleted" and ANY other pool ends it. Both directions, one session.
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
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-slice10d';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Level 7 — Marcus's level, not the unit fixture's 8. At Charisma 18 the cloak
   is 7 + 4 = 11, which is the number canon's own worked example states. */
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
      /* SEEDED ONLY IF ABSENT — 10b's rule, and it matters more here than it did
         there. `addInitScript` runs on every navigation, and the character key
         is the very thing this prover measures: an unconditional write would
         reset `tempHP` to 0 between cases and report "no change" forever. */
      if (!localStorage.getItem('codex-character-' + id)) {
        localStorage.setItem('codex-character-' + id, seedJson);
      }
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
    [NIX.id, JSON.stringify({ ...NIX, level: 7, tempHP: 0, paladinResources: PALADIN_AT_7 }), IN_COMBAT],
  );

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** Everything this slice can be judged on, read off the painted page and off
 *  the disk in one pass.
 *
 *  THE WARNING IS MEASURED GEOMETRICALLY. `textContent` reports CSS-clipped and
 *  off-screen text in full (finding Q), and this app permanently mounts two
 *  hand-rolled dialogs parked below the fold that `checkVisibility()` calls
 *  visible (finding BC). So "on the glass" here means: it has a box, the box has
 *  area, and its top edge is inside the viewport. */
const readAll = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  const onGlass = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  };

  /* The temp HP badge in the HP tracker: the number Marcus reads at the table. */
  const badge = [...document.querySelectorAll('span')]
    .map(txt)
    .find((t) => /^\+\d+ temp$/.test(t)) ?? null;

  /* The two warnings. Both are `role="status"`; they are told apart by where
     they live — one is inside the open sheet, the other is not. */
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const open = dialogs.filter((d) => d.getBoundingClientRect().top < window.innerHeight - 1);
  const dialog = open[open.length - 1] ?? null;

  const statuses = [...document.querySelectorAll('[role="status"]')];
  const trackerWarning = statuses.find((s) => !dialog?.contains(s) && /do not stack/.test(txt(s)));
  const sheetWarning = statuses.find((s) => dialog?.contains(s) && /do not stack/.test(txt(s)));

  const applyBtn = [...document.querySelectorAll('button')].find((b) =>
    /^(Apply|Replace \d+ with \d+)$/.test(txt(b)),
  );
  const spendBtn = [...(dialog?.querySelectorAll('button') ?? [])].find((b) =>
    /^\s*Spend/.test(txt(b)),
  );

  const stored = (() => {
    try {
      const id = localStorage.getItem('codex-active-id');
      const c = JSON.parse(localStorage.getItem('codex-character-' + id) || 'null');
      return c ? { tempHP: c.tempHP ?? null, tempHPSource: c.tempHPSource ?? null } : null;
    } catch { return null; }
  })();

  return {
    badge,
    stored,
    applyLabel: applyBtn ? txt(applyBtn) : null,
    trackerWarning: trackerWarning ? txt(trackerWarning) : null,
    trackerWarningOnGlass: onGlass(trackerWarning),
    sheet: dialog ? (dialog.getAttribute('aria-label') || '(unlabelled)') : null,
    sheetWarning: sheetWarning ? txt(sheetWarning) : null,
    sheetWarningOnGlass: onGlass(sheetWarning),
    /* The sheet SCROLLS. "On the glass" therefore cannot mean "visible the
       instant it opens" — the definition worth enforcing is that the warning is
       painted in the SAME FRAME as the control it is warning about. He cannot
       reach the button without the sentence being in front of him. */
    spendOnGlass: onGlass(spendBtn),
    /* Ordering inside the sheet: the warning must come BEFORE the button. A
       sentence under the button is a report on a press that already happened. */
    warningBeforeSpend:
      sheetWarning && spendBtn
        ? sheetWarning.compareDocumentPosition(spendBtn) & Node.DOCUMENT_POSITION_FOLLOWING
          ? true
          : false
        : null,
    reactionRows: [
      ...document.querySelectorAll(
        'section[aria-label="Your reactions"] button[aria-label$="— details"]',
      ),
    ].map((b) => (b.getAttribute('aria-label') || '').replace(/ — details$/, '')),
  };
});

/** Scroll the HP tracker onto the glass and frame it. When the sheet is up it
 *  covers the screen, so nothing is scrolled. */
const shot = async (page, name) => {
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('[role="dialog"]')].some(
      (d) => d.getBoundingClientRect().top < window.innerHeight - 1,
    );
    if (open) return;
    const heading = [...document.querySelectorAll('h3, h2')].find((h) =>
      /^Hit Points$/i.test((h.textContent || '').trim()),
    );
    (heading?.closest('div') ?? document.body).scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

/** Open the Temp HP field and type a number. Nothing is applied. */
async function typeTemp(page, amount) {
  await page.click('button[aria-label="Set temporary hit points"]');
  await page.waitForTimeout(250);
  await page.fill('input[aria-label="temp amount"]', String(amount));
  await page.waitForTimeout(250);
}

const pressApply = async (page) => {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /^(Apply|Replace \d+ with \d+)$/.test((b.textContent || '').replace(/\s+/g, ' ').trim()),
    );
    btn?.click();
  });
  await page.waitForTimeout(450);
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

// ===========================================================================
console.log('\n=== A · arrival: no pool, and nothing shouting about one ===\n');
const { ctx, page } = await openApp();

const arrival = await readAll(page);
await shot(page, 'A-arrival');
console.log('  badge     :', arrival.badge ?? '(none)');
console.log('  on disk   :', JSON.stringify(arrival.stored));

check(
  'A · no temporary hit points, and no warning anywhere',
  arrival.stored?.tempHP === 0 && arrival.badge === null && arrival.trackerWarning === null,
  `disk tempHP=${arrival.stored?.tempHP} · badge=${arrival.badge ?? 'none'} · warning=${arrival.trackerWarning ?? 'none'}`,
);

// ===========================================================================
console.log('\n=== B · the ordinary case: 5 temp HP, one press, no prompt ===\n');

await typeTemp(page, 5);
const typed5 = await readAll(page);
await shot(page, 'B-typed-5');
console.log('  warning   :', typed5.trackerWarning ?? '(none — correct)');
console.log('  button    :', typed5.applyLabel);

check(
  'B · granting a pool where there was none prompts nobody',
  typed5.trackerWarning === null && typed5.applyLabel === 'Apply',
  `warning=${typed5.trackerWarning ?? 'none'} · button reads ${JSON.stringify(typed5.applyLabel)}`,
);

await pressApply(page);
const applied5 = await readAll(page);
await shot(page, 'B-applied-5');
console.log('  badge     :', applied5.badge ?? '(none)');
console.log('  on disk   :', JSON.stringify(applied5.stored));

check(
  'B · one press was enough, and the app admits it does not know the source',
  applied5.stored?.tempHP === 5 && applied5.badge === '+5 temp' && applied5.stored?.tempHPSource === null,
  `disk ${JSON.stringify(applied5.stored)} · badge=${applied5.badge}`,
);

// ===========================================================================
console.log('\n=== C · HEARTH-04: 3 would destroy the 5 he is standing in ===\n');

await typeTemp(page, 3);
const warned = await readAll(page);
await shot(page, 'C-warned');
console.log('  warning   :', warned.trackerWarning ?? '(NONE — the bug)');
console.log('  on glass  :', warned.trackerWarningOnGlass);
console.log('  button    :', warned.applyLabel);

check(
  'C · the warning is ON THE GLASS before any press  <-- THIS IS THE SLICE',
  Boolean(warned.trackerWarning) && warned.trackerWarningOnGlass === true,
  warned.trackerWarning
    ? `painted, with a box inside the viewport: ${JSON.stringify(warned.trackerWarning)}`
    : `NOTHING. He types 3 over an 11-point cloak and the app takes it silently — which is ` +
      `VAL-06 as measured, and what canon rates HIGH.`,
);

check(
  'C · it says what would be lost, and that the two pools cannot both be kept',
  /5 temporary hit points you already have/.test(warned.trackerWarning || '') &&
    /fewer/.test(warned.trackerWarning || '') &&
    /do not stack/.test(warned.trackerWarning || ''),
  JSON.stringify(warned.trackerWarning),
);

await pressApply(page);
const armed = await readAll(page);
await shot(page, 'C-armed');
console.log('  after 1st press — badge:', armed.badge, '· disk:', JSON.stringify(armed.stored));
console.log('  button    :', armed.applyLabel);

check(
  'C · the FIRST press destroyed nothing',
  armed.stored?.tempHP === 5 && armed.badge === '+5 temp',
  `disk tempHP=${armed.stored?.tempHP} · badge=${armed.badge} — still the pool he had`,
);

check(
  'C · and the button now names what the next press will do',
  armed.applyLabel === 'Replace 5 with 3',
  `button reads ${JSON.stringify(armed.applyLabel)} — a control that says "Apply" while it is ` +
    `about to end a cloak is the bug HEARTH-04 describes`,
);

await pressApply(page);
const replaced = await readAll(page);
await shot(page, 'C-replaced');
console.log('  after 2nd press — badge:', replaced.badge, '· disk:', JSON.stringify(replaced.stored));

check(
  'C · the second press is obeyed — the player chooses, the app does not veto',
  replaced.stored?.tempHP === 3 && replaced.badge === '+3 temp',
  `disk tempHP=${replaced.stored?.tempHP} · 2024 lets him keep either pool, and a smaller one ` +
    `with a better duration is a real play`,
);

// ===========================================================================
console.log('\n=== D · the other surface: the sheet warns before its Spend ===\n');

const cloakRow = replaced.reactionRows.find((n) => /cloak/i.test(n)) ?? replaced.reactionRows[0];
console.log('  reactions :', replaced.reactionRows.join(' | ') || '(none)');
console.log('  opening   :', cloakRow);

if (cloakRow) {
  await page.click(
    `section[aria-label="Your reactions"] button[aria-label="${cloakRow} — details"]`,
  );
  await page.waitForTimeout(700);
}

/* Scroll to the button he is about to press. The whole point of D is what is in
   front of him AT THE MOMENT OF THE PRESS, so the measurement is taken there —
   not at the top of a sheet he has not finished reading. */
await page.evaluate(() => {
  const open = [...document.querySelectorAll('[role="dialog"]')].filter(
    (d) => d.getBoundingClientRect().top < window.innerHeight - 1,
  );
  const dialog = open[open.length - 1];
  const btn = [...(dialog?.querySelectorAll('button') ?? [])].find((b) =>
    /^\s*Spend/.test((b.textContent || '').replace(/\s+/g, ' ').trim()),
  );
  btn?.scrollIntoView({ block: 'end' });
});
await page.waitForTimeout(400);

const sheet = await readAll(page);
await shot(page, 'D-sheet-warning');
console.log('  sheet     :', sheet.sheet ?? '(none)');
console.log('  warning   :', sheet.sheetWarning ?? '(none)');
console.log('  order     :', sheet.warningBeforeSpend);
console.log('  both lit  :', `warning=${sheet.sheetWarningOnGlass} spend=${sheet.spendOnGlass}`);

check(
  'D · the sheet opened on the cloak and warns about the pool already up',
  sheet.sheet === cloakRow &&
    Boolean(sheet.sheetWarning) &&
    /3 temporary hit points you already have/.test(sheet.sheetWarning || ''),
  `sheet=${JSON.stringify(sheet.sheet)} · warning=${JSON.stringify(sheet.sheetWarning)}`,
);

check(
  'D · warning and button are painted in the SAME frame  <-- he cannot press blind',
  sheet.sheetWarningOnGlass === true && sheet.spendOnGlass === true,
  `warning on glass=${sheet.sheetWarningOnGlass} · Spend on glass=${sheet.spendOnGlass} — ` +
    `the sheet scrolls, so the test that matters is what is in front of him where his thumb is`,
);

check(
  'D · the warning sits ABOVE the button, not under it',
  sheet.warningBeforeSpend === true,
  `warningBeforeSpend=${sheet.warningBeforeSpend} — underneath it would be indistinguishable ` +
    `from the refusal band, which reports on a press that already happened`,
);

// ===========================================================================
console.log('\n=== E · the grant: taking the cloak hands him the pool ===\n');

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
await page.waitForTimeout(900);

const granted = await readAll(page);
await shot(page, 'E-granted');
console.log('  badge     :', granted.badge ?? '(none)');
console.log('  on disk   :', JSON.stringify(granted.stored));

check(
  'E · the pool is canon’s computed number, not a number he typed  <-- THE GRANT',
  granted.stored?.tempHP === 11 && granted.badge === '+11 temp',
  granted.stored?.tempHP === 11
    ? `3 → 11. Level 7 + Charisma modifier 4, resolved from canon's formula — and canon's own ` +
      `worked example says 11 at level 7 with Charisma 18. Before this slice the reducer spent ` +
      `the Channel Divinity use and left tempHP at 3.`
    : `tempHP is ${granted.stored?.tempHP}. The cloak was spent and granted nothing, which is ` +
      `the measured pre-10d behaviour.`,
);

check(
  'E · and the app now knows WHAT granted it',
  /cloak/i.test(granted.stored?.tempHPSource || ''),
  `tempHPSource=${JSON.stringify(granted.stored?.tempHPSource)} — this is the field VAL-06's ` +
    `gap pin said had to exist before any prompt could name the pool it was ending`,
);

// ===========================================================================
console.log('\n=== F · no errors on the console throughout ===\n');
check('F · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

await ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify(
    { arrival, typed5, applied5, warned, armed, replaced, sheet, granted, results, errors },
    null,
    2,
  ),
);
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`}`);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
