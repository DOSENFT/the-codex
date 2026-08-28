// Prove Table Truth slice 10f (HEARTH-05) against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice10f.mjs [baseUrl] [shotsDir]
//
// THE CLAIM THIS PROVER EXISTS TO SETTLE
//
// Canon's appAction for HEARTH-05, verbatim: "Implement as written but display
// the total retaliation damage dealt per encounter so the DM can see the real
// numbers." Every other number on this tab is COMPUTED — change the sheet and it
// moves. This one has to be CAPTURED: a d10 came up 7 at a table, and if it is
// not written down as it happens it is gone.
//
// Marcus made the two decisions that shape it:
//
//   "App rolls, but I can correct it."  The tap rolls, and then shows the result
//   in a TEXT FIELD so a physical die can be typed over it. That field is the
//   whole of the decision. A 7 rendered as a label looks identical and is a lie
//   he cannot fix — which is why check B reads `input.value`, not text.
//
//   "Cloak up, but always reachable."  The prompt under the HP tracker is the
//   convenience and fires only while the cloak is up; the button on the Flaming
//   Cloak row is the guarantee and has no condition on it at all. Checks A and E
//   are the two halves, and E is deliberately run with the cloak DOWN.
//
// EVERY NUMBER BELOW IS READ OFF THE PAINTED PAGE and none is recomputed here —
// finding Q. The prover taps the real control, types into the real field, and
// reads the tally back out of the row. It never touches localStorage to make an
// assertion true.
//
//   A  the standing button: one in the band, on the cloak row, not on the
//      Opportunity Attack that carries 1d8+4 on the same sheet.
//   B  the app rolls, and the roll lands in an EDITABLE FIELD.   <-- HIS ANSWER
//   C  typing over it records the TYPED number, and the tally says so.
//   D  Cancel records nothing; the app's own roll records verbatim; the total
//      survives a reload, because a DM's number that dies with the tab is not
//      a number.
//   E  cloak DOWN, and the button is still there.               <-- HIS ANSWER
//   F  cloak UP: logging damage offers the die on the spot, and answering it
//      feeds the SAME tally the band shows.
//   G  out of combat the Add is refused — and SAYS SO, with the number still in
//      the field.  A control that silently eats a tap is worse than one that
//      is not there.
//   H  no ellipsis, clean console.
//
// THE SEED IS MARCUS'S SHEET, 2026-08-27, same as slice 10e: level 7, AC 18,
// 67 HP, PROF +3, STR 18 / DEX 12 / CON 14 / INT 9 / WIS 13 / CHA 16. See that
// file's header for why this is not `fixtures/nix.ts`.
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
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-slice10f';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* ── Marcus's sheet, 2026-08-27 ──────────────────────────────────────────── */

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
  /* "Im not sure what hearthbrand is, I've never seen that." The plainest thing
     a Paladin 7 can be holding — an Opportunity Attack needs a weapon to exist,
     and its 1d8+4 Slashing is what check A is really about. */
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

/* The cloak UP: a live temp HP pool that canon's feature put there. All three
   facts are needed — a pool, and a source, and a source that throws something
   back — which is what `activeRetaliation` is for. */
const CLOAK_UP = { ...MARCUS, tempHP: 10, tempHPSource: 'Flaming Cloak' };

const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

const errors = [];
const browser = await chromium.launch();

/** A fresh phone. `combatJson === null` means NO stored encounter, which is how
 *  the app reads "not in combat" — check G's whole setup. */
async function openApp(sheet, combatJson) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
    reducedMotion: 'reduce',
  });

  await ctx.addInitScript(
    ([id, seedJson, combat]) => {
      /* Seeded only if absent — 10b's rule. `addInitScript` runs on EVERY
         navigation, and check D reloads the page on purpose: an unconditional
         write would wipe the tally being measured and the check would pass for
         the wrong reason. */
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
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** The capture control as painted, read off the reactions band.
 *
 *  GEOMETRIC, not textual. `textContent` reports clipped and off-screen text in
 *  full (finding Q) and this app permanently mounts two dialogs below the fold
 *  that report visible (finding BC). "There" here means: it has a box and the
 *  box has area. The tally is matched out of the row's own text rather than
 *  recomputed, so what is asserted is the sentence the DM will read. */
const readCapture = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const area = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return { band: null };

  const buttons = [...band.querySelectorAll('button[aria-label^="Record "]')];
  const rows = [...band.querySelectorAll('li')];
  const host =
    rows.find((li) =>
      li.querySelector('button[aria-label^="Record "], input[aria-label$="retaliation damage"]'),
    ) ?? null;
  const field = host?.querySelector('input[aria-label$="retaliation damage"]') ?? null;
  const addBtn = host ? [...host.querySelectorAll('button')].find((b) => txt(b) === 'Add') : null;
  const note = host?.querySelector('[role="status"]') ?? null;

  return {
    band: txt(band),
    /* Every row that owns a Record button, and the row it sits on. One entry,
       and it is the cloak, is the claim. */
    buttons: buttons.map((b) => ({
      label: b.getAttribute('aria-label'),
      text: txt(b),
      painted: area(b),
    })),
    rowName:
      txt(host?.querySelector('button[aria-label$="— details"]'))
        .split('\n')[0]
        .slice(0, 40) ||
      (host?.querySelector('button[aria-label$="— details"]')?.getAttribute('aria-label') || '')
        .replace(/ — details$/, ''),
    rowLabel:
      host?.querySelector('button[aria-label$="— details"]')?.getAttribute('aria-label')?.replace(/ — details$/, '') ??
      null,
    rowText: txt(host),
    /* The DM's sentence, matched not built. */
    tally: (txt(host).match(/TOTAL \d+ [A-Za-z]+ over \d+ hits?|none yet/) ?? [null])[0],
    field: field
      ? {
          value: field.value,
          label: field.getAttribute('aria-label'),
          type: field.getAttribute('type'),
          inputmode: field.getAttribute('inputmode'),
          painted: area(field),
          /* IT IS A FIELD, not a label wearing a border. Nothing else on this
             strip proves Marcus can correct the number. */
          editable: !field.readOnly && !field.disabled,
        }
      : null,
    addDisabled: addBtn ? addBtn.disabled : null,
    note: note ? txt(note) : null,
  };
});

/** The offer that appears under the HP tracker, and where it is. */
const readPrompt = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const band = document.querySelector('section[aria-label="Your reactions"]');
  const spans = [...document.querySelectorAll('span')].filter((s) =>
    /roll 1d10 retaliation\?/.test(s.textContent || ''),
  );
  const span = spans[0] ?? null;
  if (!span) return { prompt: null, count: 0 };
  const host = span.parentElement;
  const r = host.getBoundingClientRect();
  return {
    prompt: txt(span),
    count: spans.length,
    yes: [...host.querySelectorAll('button')].map(txt),
    painted: r.width > 0 && r.height > 0,
    /* NOT in the reactions band. The prompt is the tracker's, and if it turned
       out to be the band's row this whole check would be measuring the control
       it already measured in A. */
    inBand: Boolean(band && band.contains(span)),
  };
});

const shot = async (page, name) => {
  await page.waitForTimeout(250);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

/** Frame the reactions band before shooting it. */
const shotBand = async (page, name) => {
  await page.evaluate(() => {
    const band = document.querySelector('section[aria-label="Your reactions"]');
    (band ?? document.body).scrollIntoView({ block: 'center' });
  });
  return shot(page, name);
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const ELLIPSIS = /…|\.\.\./;
const RECORD = 'section[aria-label="Your reactions"] button[aria-label^="Record "]';
const FIELD = 'section[aria-label="Your reactions"] input[aria-label$="retaliation damage"]';

// ===========================================================================
console.log('\n=== A · the standing button, on the row that carries the die ===\n');

const { ctx, page } = await openApp(MARCUS, IN_COMBAT);
let cap = await readCapture(page);

if (!cap.band) {
  console.error('The reactions band did not render. Nothing below can be measured.');
  await ctx.close();
  await browser.close();
  process.exit(1);
}

await shotBand(page, 'A-before-band');
console.log('  row   :', cap.rowLabel, '·', JSON.stringify(cap.tally));
for (const b of cap.buttons) console.log(`  button: ${b.label}  «${b.text}»`);

check(
  'A · exactly ONE row offers the die, and it is the cloak  <-- THIS IS THE SLICE',
  cap.buttons.length === 1 &&
    cap.buttons[0].painted &&
    /^Record 1d10 Fire retaliation$/.test(cap.buttons[0].label || ''),
  cap.buttons.length === 1
    ? `«${cap.buttons[0].text}» on the ${cap.rowLabel} row`
    : `${cap.buttons.length} buttons: ${cap.buttons.map((b) => b.label).join(' | ') || '(none)'} — ` +
      `Opportunity Attack carries 1d8+4 Slashing on this same sheet. A recogniser that ` +
      `looked for DICE would tally every off-turn swing and inflate the exact number the ` +
      `DM asked for; it looks for a die canon marked FREE.`,
);

check(
  'A · and before anything is recorded it says "none yet", not a zero',
  cap.tally === 'none yet',
  `the row reads ${JSON.stringify(cap.tally)} — a 0 reads as a measurement ("the cloak has ` +
    `done nothing"); the truth is that nothing has been written down yet, and at a table ` +
    `those are different facts`,
);

/* THE FALSIFIABILITY GUARD, and it earns its place. Run against the pre-change
   build there is no button to click, and the first `page.click` threw a
   TimeoutError that killed the process — so the run reported a CRASH where what
   it needed to report was a SPLIT. "Red on the claims about the new control,
   green on exactly the controls" is the evidence; an exception is not evidence
   of anything. Every check the missing button gates is failed here by name,
   with the reason, and the run finishes and prints its tally. */
if (cap.buttons.length !== 1) {
  const gated = [
    'B · the tap ROLLED — a whole number between 1 and 10, from the app’s own d10',
    'B · and it is an EDITABLE TEXT FIELD, not a label  <-- MARCUS’S ANSWER',
    'C · the tally reads the number he TYPED, not the number the app rolled',
    'C · the strip closed behind it — the number is recorded, not still pending',
    'C · and it counts HITS as well as damage',
    'D · Cancel records nothing and leaves the total where it was',
    'D · leaving the app’s own roll alone records THAT number, to the point',
    'D · and it survives a reload — the DM’s number outlives the tab',
    'E · with no temp HP at all, the standing button is unchanged  <-- MARCUS’S ANSWER',
    'F · logging damage while the cloak is up asks, in the feature’s own name',
    'F · Yes rolls, the number is correctable here too, and Add takes it away',
    'F · and it feeds the SAME tally the band shows — one number, two routes',
    'G · the button is there out of combat too — it is genuinely unconditional',
    'G · the refusal is PAINTED, in the reducer’s own words',
    'G · and the number he typed is still in the field, waiting',
    'G · and nothing was recorded — the refusal refused',
  ];
  console.log('\nNo capture control on the page. Every check that depends on tapping it fails.\n');
  for (const name of gated) check(name, false, 'there is no control to tap');

  /* Measured anyway, because they are the CONTROLS: they must be green on both
     builds, and a falsifiability run where everything goes red has proved that
     the prover reads the wrong page, not that the slice did anything. */
  const promptPre = await readPrompt(page);
  check(
    'E · and logging damage with the cloak down offers nothing',
    promptPre.prompt === null,
    'no prompt — true here for the trivial reason that no prompt exists yet',
  );
  check('H · nothing in the band trails off', !ELLIPSIS.test(cap.band || ''), 'the standing claim');
  check('H · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

  await ctx.close();
  await browser.close();
  writeFileSync(`${OUT}/_results.json`, JSON.stringify({ band: cap, results, errors }, null, 2));
  const red = results.filter((r) => !r.pass);
  console.log(`\nFAILED ${red.length}/${results.length}`);
  console.log(`shots + numbers in ${OUT}/`);
  process.exit(1);
}

// ===========================================================================
console.log('\n=== B · the app rolls, and the roll lands in a FIELD ===\n');

await page.click(RECORD);
await page.waitForTimeout(400);
cap = await readCapture(page);
await shotBand(page, 'B-strip-open');

const rolled = Number.parseInt(cap.field?.value ?? '', 10);
console.log('  field :', JSON.stringify(cap.field));

check(
  'B · the tap ROLLED — a whole number between 1 and 10, from the app’s own d10',
  Number.isInteger(rolled) && rolled >= 1 && rolled <= 10,
  cap.field
    ? `the strip opened carrying ${rolled} — canon says 1d10, so 1..10 is the whole range`
    : 'no field appeared at all',
);

check(
  'B · and it is an EDITABLE TEXT FIELD, not a label  <-- MARCUS’S ANSWER',
  Boolean(cap.field) &&
    cap.field.painted &&
    cap.field.editable &&
    cap.field.type === 'text' &&
    cap.field.inputmode === 'numeric' &&
    cap.field.label === '1d10 Fire retaliation damage',
  cap.field
    ? `type=${cap.field.type} inputmode=${cap.field.inputmode} editable=${cap.field.editable} — ` +
      `half the time the die that decides this is a real d10 on a real table and the app ` +
      `cannot see it. type="number" was rejected on purpose: it reports "" mid-edit, which ` +
      `would flicker Add off between the 1 and the 2 of a 12.`
    : '(no field)',
);

// ===========================================================================
console.log('\n=== C · typing over it records the TYPED number ===\n');

await page.fill(FIELD, '7');
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.waitForTimeout(500);
cap = await readCapture(page);
await shotBand(page, 'C-after-add-7');

console.log('  row   :', JSON.stringify(cap.tally));

check(
  'C · the tally reads the number he TYPED, not the number the app rolled',
  cap.tally === 'TOTAL 7 Fire over 1 hit',
  cap.tally === 'TOTAL 7 Fire over 1 hit'
    ? `the app rolled ${rolled}; he typed 7; the row says ${JSON.stringify(cap.tally)}` +
      (rolled === 7 ? '  (NOTE: the app happened to roll 7 too — see check D)' : '')
    : `the row says ${JSON.stringify(cap.tally)} after typing 7 over a rolled ${rolled}`,
);

check(
  'C · the strip closed behind it — the number is recorded, not still pending',
  cap.field === null && cap.buttons.length === 1,
  cap.field === null
    ? 'back to the standing button, with the total beside it'
    : `the field is still open carrying ${JSON.stringify(cap.field.value)}`,
);

check(
  'C · and it counts HITS as well as damage',
  /over 1 hit$/.test(cap.tally || ''),
  `«${cap.tally}» — the count is what tells him the app MISSED one, which is the failure ` +
    `mode of any tally a human has to remember to tap`,
);

// ===========================================================================
console.log('\n=== D · Cancel adds nothing · the app’s roll records verbatim · it survives a reload ===\n');

await page.click(RECORD);
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Cancel', exact: true }).click();
await page.waitForTimeout(400);
cap = await readCapture(page);

check(
  'D · Cancel records nothing and leaves the total where it was',
  cap.tally === 'TOTAL 7 Fire over 1 hit' && cap.field === null,
  `after rolling and cancelling, the row still reads ${JSON.stringify(cap.tally)}`,
);

await page.click(RECORD);
await page.waitForTimeout(400);
const second = Number.parseInt((await readCapture(page)).field?.value ?? '', 10);
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.waitForTimeout(500);
cap = await readCapture(page);
await shotBand(page, 'D-two-hits');

check(
  'D · leaving the app’s own roll alone records THAT number, to the point',
  cap.tally === `TOTAL ${7 + second} Fire over 2 hits`,
  `rolled ${second}, added untouched, and 7 + ${second} = ${7 + second}: the row reads ` +
    `${JSON.stringify(cap.tally)}`,
);

/* THE RELOAD. A tally that lives only in React state is a number that dies when
   his phone locks mid-fight, and it would look exactly as authoritative as one
   that does not. It rides in `CombatState` and is written to
   `codex-combat-<id>` by the same commit every other event uses. */
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1500);
cap = await readCapture(page);
await shotBand(page, 'D-after-reload');

check(
  'D · and it survives a reload — the DM’s number outlives the tab',
  cap.tally === `TOTAL ${7 + second} Fire over 2 hits`,
  `after a full page reload the row still reads ${JSON.stringify(cap.tally)}`,
);

await ctx.close();

// ===========================================================================
console.log('\n=== E · cloak DOWN, and the button is still there ===\n');

/* A SEPARATE CONTEXT, with `tempHP: 0`. This is the half of Marcus's second
   decision that has no condition on it, and the only way to prove "no
   condition" is to remove the thing the other half depends on. */
const down = await openApp(MARCUS, IN_COMBAT);
const capDown = await readCapture(down.page);
const promptDown = await readPrompt(down.page);
await shotBand(down.page, 'E-cloak-down');

check(
  'E · with no temp HP at all, the standing button is unchanged  <-- MARCUS’S ANSWER',
  capDown.buttons.length === 1 && capDown.buttons[0].painted,
  capDown.buttons.length === 1
    ? `«${capDown.buttons[0].text}» — the prompt is the convenience, this is the guarantee, ` +
      `and a guarantee with a condition on it is not one`
    : 'the button is gone with the cloak down',
);

/* Log damage with the cloak DOWN. `activeRetaliation` reads three facts — a
   pool, a source, and a source that throws something back — and with no pool
   there is nothing to offer. An offer here would be the app inventing a fact
   about a cloak that is not up. */
await down.page.click('button[aria-label="Apply damage"]');
await down.page.waitForTimeout(300);
await down.page.fill('input[aria-label="damage amount"]', '5');
await down.page.getByRole('button', { name: 'Apply', exact: true }).click();
await down.page.waitForTimeout(600);
const noOffer = await readPrompt(down.page);
await shot(down.page, 'E-damage-no-prompt');

check(
  'E · and logging damage with the cloak down offers nothing',
  promptDown.prompt === null && noOffer.prompt === null,
  noOffer.prompt === null
    ? 'no prompt, correctly: there is no live pool for the cloak to have absorbed anything with'
    : `offered anyway: «${noOffer.prompt}»`,
);

await down.ctx.close();

// ===========================================================================
console.log('\n=== F · cloak UP: the tracker offers the die where the damage is logged ===\n');

const up = await openApp(CLOAK_UP, IN_COMBAT);
await up.page.click('button[aria-label="Apply damage"]');
await up.page.waitForTimeout(300);
await up.page.fill('input[aria-label="damage amount"]', '5');
await up.page.getByRole('button', { name: 'Apply', exact: true }).click();
await up.page.waitForTimeout(700);
const prompt = await readPrompt(up.page);
await shot(up.page, 'F-prompt');

console.log('  prompt:', JSON.stringify(prompt.prompt), '· buttons:', (prompt.yes || []).join('/'));

check(
  'F · logging damage while the cloak is up asks, in the feature’s own name',
  Boolean(prompt.prompt) &&
    prompt.painted &&
    !prompt.inBand &&
    /^(Flaming Cloak|Hearthfire Manifest) — roll 1d10 retaliation\?$/.test(prompt.prompt) &&
    (prompt.yes || []).includes('Yes') &&
    (prompt.yes || []).includes('No'),
  prompt.prompt
    ? `«${prompt.prompt}» under the HP tracker (inBand=${prompt.inBand}), answerable Yes or No`
    : 'nothing was offered. `activeRetaliation` is read BEFORE the damage is applied for ' +
      'exactly this reason — `applyDamage` spends temp HP first, so the hit that empties the ' +
      'pool takes the cloak down with it and a read afterwards reports nothing on the very ' +
      'hit that triggered the retaliation.',
);

await up.page.getByRole('button', { name: 'Yes', exact: true }).click();
await up.page.waitForTimeout(400);
const upField = await up.page.locator('input[aria-label$="retaliation damage"]').first();
const promptRoll = Number.parseInt(await upField.inputValue(), 10);
await upField.fill('9');
await up.page.getByRole('button', { name: 'Add', exact: true }).click();
await up.page.waitForTimeout(600);
const afterPrompt = await readPrompt(up.page);
const capUp = await readCapture(up.page);
await shotBand(up.page, 'F-band-after-prompt');

check(
  'F · Yes rolls, the number is correctable here too, and Add takes it away',
  Number.isInteger(promptRoll) && promptRoll >= 1 && promptRoll <= 10 && afterPrompt.prompt === null,
  `the prompt rolled ${promptRoll}, took a typed 9 over it, and dismissed itself on Add`,
);

check(
  'F · and it feeds the SAME tally the band shows — one number, two routes',
  capUp.tally === 'TOTAL 9 Fire over 1 hit',
  capUp.tally === 'TOTAL 9 Fire over 1 hit'
    ? `the reactions band now reads ${JSON.stringify(capUp.tally)} for a hit logged on the ` +
      `HP tracker — both controls dispatch the same event to the same reducer`
    : `the band reads ${JSON.stringify(capUp.tally)}; two totals kept in step is two totals`,
);

await up.ctx.close();

// ===========================================================================
console.log('\n=== G · out of combat it refuses — and says so ===\n');

/* NO stored encounter. "Per encounter" is meaningless with no encounter, and
   accepting would open a tally the next `startCombat` immediately wipes: the app
   would take the tap, show a total, and lose it. */
const rest = await openApp(MARCUS, null);
let capRest = await readCapture(rest.page);
await shotBand(rest.page, 'G-out-of-combat');

check(
  'G · the button is there out of combat too — it is genuinely unconditional',
  Boolean(capRest.band) && capRest.buttons.length === 1,
  capRest.buttons.length === 1 ? `«${capRest.buttons[0].text}»` : 'no button out of combat',
);

await rest.page.click(RECORD);
await rest.page.waitForTimeout(400);
await rest.page.fill(FIELD, '7');
await rest.page.getByRole('button', { name: 'Add', exact: true }).click();
await rest.page.waitForTimeout(500);
capRest = await readCapture(rest.page);
await shotBand(rest.page, 'G-refused');

console.log('  note  :', JSON.stringify(capRest.note));

check(
  'G · the refusal is PAINTED, in the reducer’s own words',
  Boolean(capRest.note) && /start the encounter/i.test(capRest.note),
  capRest.note
    ? `«${capRest.note}»`
    : `the Add did nothing and said nothing. The app's one refusal surface is ` +
      `OptionDetailSheet, which this control is not inside — so a silent no-op here is a ` +
      `button that looks broken, which is the failure this slice is not allowed to ship.`,
);

check(
  'G · and the number he typed is still in the field, waiting',
  capRest.field?.value === '7',
  capRest.field
    ? `the field still reads ${JSON.stringify(capRest.field.value)} — the fix is "start the ` +
      `encounter, press Add again", not "roll it a second time and hope it comes up 7"`
    : 'the strip closed and the roll was swallowed',
);

/* CORRECTED MID-RUN, and the correction is worth keeping. This first asserted
   «the row still says "none yet"» in the same breath — and the row says no such
   thing WHILE THE STRIP IS OPEN, because the strip replaces the standing form
   rather than sitting under it. That is the component behaving correctly and the
   prover reading the wrong moment. What actually needs proving is that nothing
   was recorded, and the honest way to read that is with the strip closed. */
await rest.page.getByRole('button', { name: 'Cancel', exact: true }).click();
await rest.page.waitForTimeout(400);
const capRestClosed = await readCapture(rest.page);

check(
  'G · and nothing was recorded — the refusal refused',
  capRestClosed.tally === 'none yet' && capRestClosed.field === null,
  `with the strip closed the row reads ${JSON.stringify(capRestClosed.tally)}: a refused Add ` +
    `leaves no total behind, which is the point of refusing it — "per encounter" is ` +
    `meaningless with no encounter, and a tally opened here is one the next startCombat wipes`,
);

// ===========================================================================
console.log('\n=== H · no ellipsis, clean console ===\n');

check(
  'H · nothing in the band trails off',
  !ELLIPSIS.test(cap.band || '') && !ELLIPSIS.test(capUp.band || ''),
  'the phase’s standing claim, re-measured on the surface this slice changed',
);

check('H · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

await rest.ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify(
    { rolled, second, promptRoll, band: cap, cloakDown: capDown, cloakUp: capUp, atRest: capRest, atRestClosed: capRestClosed, prompt, results, errors },
    null,
    2,
  ),
);
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`}`);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
