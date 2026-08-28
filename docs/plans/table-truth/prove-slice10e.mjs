// Prove Table Truth slice 10e against the REAL running app.
//
//   npm run build && npx vite preview --port 4193 --host      (in another shell)
//   node docs/plans/table-truth/prove-slice10e.mjs [baseUrl] [shotsDir]
//
// THE CLAIM THIS PROVER EXISTS TO SETTLE
//
// Marcus, 2026-08-27, reading his own sheet back to us: "I have Sentinel and
// interception". The app showed neither, and the cause was not a ranking bug —
// `character.feats` was read by NOTHING (finding AT). Two of his reactions could
// not appear on the reactions band no matter what the sheet said.
//
// He also told us what he believes his cloak costs: "it's a reaction 1d10 damage
// if I get hit". Canon disagrees in its own paragraph — the ACTIVATION is the
// Reaction, and the 1d10 retaliation is free, automatic and uncapped. The app's
// share of the blame is exact: the row said "1d10 Fire retaliation" and left the
// price blank, and a blank price at a table reads as expensive.
//
// So this run is one arrival at a table, on HIS numbers, and every claim is read
// off the PAINTED page — never recomputed here. A prover that recomputes grades
// its own arithmetic (finding Q, slice 4).
//
//   A  the band's census: every reaction he owns has a row, and the count on
//      the toggle agrees with the number of rows underneath it.
//   B  one feat, two reactions: Sentinel's two rows carry DIFFERENT triggers
//      and are not the same row printed twice.                <-- FINDING BE
//   C  every feat row answers "when can I use it" — a real WHEN clause, and no
//      row anywhere in the band trails off in an ellipsis.
//   D  Interception says what it actually does, to the last die.
//   E  the cloak row prices the retaliation: "(free)".
//   F  the detail sheet spells the price out in words.
//   G  clean console throughout.
//
// WHY THIS SEED IS NOT THE UNIT FIXTURE. `fixtures/nix.ts` is a level-8 CHA-18
// instrument, built to reach every branch of categorizeTurnOptions, and its
// header says in as many words not to "fix" it to match Marcus. The numbers
// below are HIS, off the sheet he photographed on 2026-08-27: level 7, AC 18,
// 67 HP, PROF +3, STR 18 / DEX 12 / CON 14 / INT 9 / WIS 13 / CHA 16, spell DC
// 14, spell attack +6, proficient in Athletics and Persuasion. That makes the
// cloak 7 + 3 = 10 here, not the 11 slice 10d proved at CHA 18 — the app
// computes the formula and never reads a frozen number, so a changed score is
// supposed to move it (slice 6). Screenshots out of this file are his table.
//
// HIS FEATS ARE SEEDED THE WAY AN IMPORT ARRIVES: a name, a flavour line, and
// `effects: []`. That is the common case and it is the interesting one — canon
// has to fill the silence for a row to exist at all. If these tests pass with an
// empty `effects` array, they pass for the sheet he actually has.
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
const OUT = process.argv[3] || 'docs/plans/table-truth/_shots-slice10e';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* ── Marcus's sheet, 2026-08-27 ──────────────────────────────────────────── */

const REAL_SCORES = { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 };

/* An import gives us a name and a paragraph. It does not give us mechanics.
   None of these descriptions is reaction-shaped, on purpose: if a row appears
   below, canon filled a silence, which is the path his real data takes. */
const REAL_FEATS = [
  {
    name: 'Sentinel',
    description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.',
    source: 'General Feat',
    isHomebrew: false,
    effects: [],
  },
  {
    name: 'Interception',
    description: 'You protect your allies from harm.',
    source: 'Fighting Style',
    isHomebrew: false,
    effects: [],
  },
  {
    name: 'Lucky',
    /* Seeded because he HAS it, and because it is the control: Lucky costs no
       Reaction, so a band that lists it is a band matching on the word "feat"
       instead of on the shape of a cost. */
    description: 'You have inexplicable luck that seems to kick in at just the right moment.',
    source: 'Changeling',
    isHomebrew: false,
    effects: [],
  },
];

const MARCUS = {
  ...NIX,
  level: 7,
  armorClass: 18,
  hitPoints: { max: 67, current: 67 },
  tempHP: 0,
  proficiencyBonus: 3,
  spellSaveDC: 14,
  spellAttackBonus: 6,
  abilityScores: REAL_SCORES,
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: REAL_FEATS,
  /* "Im not sure what hearthbrand is, I've never seen that." Neither is it
     canon — the fixture invented it in slice 1 to reach the magical/mastery
     branches. His melee weapon is unrecorded, so this seed carries the plainest
     thing a Paladin 7 can be holding. The reactions band is what is under test;
     the weapon exists only because an Opportunity Attack needs one to exist. */
  weapons: [
    {
      name: 'Longsword',
      attackType: 'melee',
      abilityMod: 'STR',
      proficient: true,
      damageDice: '1d8',
      damageType: 'Slashing',
      properties: ['Versatile (1d10)'],
      range: '5 ft',
    },
  ],
  paladinResources: {
    layOnHands: { max: 5 * 7, current: 5 * 7 },
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  },
};

const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  /* NOT his turn. A reactions band is read in the window where a reaction is the
     only thing he owns, so that is the window it is measured in. It also proves
     the rows are not blocked by the "it is not your turn" rule — reactions are
     exempt from it, and this is where that exemption gets exercised. */
  yourTurn: false,
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
      /* Seeded only if absent — 10b's rule. `addInitScript` runs on every
         navigation, so an unconditional write would reset state between cases. */
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
    [NIX.id, JSON.stringify(MARCUS), IN_COMBAT],
  );

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** The reactions band, row by row, read off the painted page.
 *
 *  MEASURED GEOMETRICALLY. `textContent` reports CSS-clipped and off-screen text
 *  in full (finding Q), and this app permanently mounts two hand-rolled dialogs
 *  below the fold that `checkVisibility()` calls visible (finding BC). So "on the
 *  glass" here means: it has a box, the box has area, and the box overlaps the
 *  viewport.
 *
 *  Each row's paragraphs are returned IN ORDER rather than pre-classified. The
 *  first `<p>` in a ReactionRow is the WHEN line and is unconditional; what
 *  follows it depends on the row. Classifying here would bake this prover's
 *  guess about the component into the evidence. */
const readBand = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  const onGlass = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  };

  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return { band: null };

  const toggle = band.querySelector('button[aria-expanded]');
  const rows = [...band.querySelectorAll('li')].map((li) => {
    const btn = li.querySelector('button[aria-label$="— details"]');
    const host = btn ?? li.firstElementChild ?? li;
    const paras = [...host.querySelectorAll('p')].map(txt);
    const r = host.getBoundingClientRect();
    const bandBox = band.getBoundingClientRect();
    return {
      name: (btn?.getAttribute('aria-label') || '').replace(/ — details$/, '') || txt(host.querySelector('span')),
      cost: txt(host.querySelector('.font-mono')),
      when: paras[0] ?? null,
      paras,
      text: txt(host),
      /* PAINTED: it has a box and the box has area. This is the claim that
         catches a clipped or collapsed row. */
      painted: r.width > 0 && r.height > 0,
      /* NOT CLIPPED: the row's box sits inside the band's box. A row taller than
         its container, or pushed out of it, is the failure mode a `…` used to
         hide — and that failure is invisible to textContent (finding Q). */
      insideBand: r.top >= bandBox.top - 1 && r.bottom <= bandBox.bottom + 1,
      /* Reported, not asserted. See the note beside check A4. */
      inFirstScreen: r.top < window.innerHeight && r.bottom > 0,
      openable: Boolean(btn),
    };
  });

  return {
    band: txt(band),
    bandOnGlass: onGlass(band),
    expanded: toggle?.getAttribute('aria-expanded') ?? null,
    /* The number the toggle prints beside the heading. It is a separate read
       from `rows.length` on purpose — a count that disagrees with the list under
       it is exactly the failure a census claim is for. */
    countLabel: txt(toggle).replace(/^Your reactions\s*/, ''),
    rows,
  };
});

/** What an open detail sheet says, and whether it is really open. */
const readSheet = (page) => page.evaluate(() => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  /* Finding BC: both hand-rolled overlays are permanently in the DOM, parked at
     y=844 with pointer-events none, and both report visible. Geometry decides. */
  const open = dialogs.filter((d) => d.getBoundingClientRect().top < window.innerHeight - 1);
  const dialog = open[open.length - 1] ?? null;
  if (!dialog) return { open: null };
  return {
    open: dialog.getAttribute('aria-label') || '(unlabelled)',
    text: txt(dialog),
    /* Every line of the sheet, so a claim can be made about WHERE a sentence is
       and not merely that the string exists somewhere in a scrolling column.
       `dd` and `dt` are in this list because band ① — the numbers, and the band
       this slice changed — is a <dl>. The first version of this selector left
       them out and reported the free line missing while it was on the screen:
       a prover that queries the wrong element makes a false accusation, which is
       worse than making none. */
    lines: [...dialog.querySelectorAll('p, li, dt, dd, h3, h4, span')]
      .map(txt)
      .filter((t) => t.length > 0),
  };
});

const closeSheet = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
};

/** Bring the reactions band onto the glass and frame it. */
const shot = async (page, name) => {
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('[role="dialog"]')].some(
      (d) => d.getBoundingClientRect().top < window.innerHeight - 1,
    );
    if (open) return;
    const band = document.querySelector('section[aria-label="Your reactions"]');
    (band ?? document.body).scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const ELLIPSIS = /…|\.\.\./;

// ===========================================================================
console.log('\n=== A · the census: every reaction he owns has a row ===\n');
const { ctx, page } = await openApp();

const band = await readBand(page);
await shot(page, 'A-band');

if (!band.band) {
  console.error('The reactions band did not render at all. Nothing below can be measured.');
  await ctx.close();
  await browser.close();
  process.exit(1);
}

console.log('  expanded  :', band.expanded, '· count label:', JSON.stringify(band.countLabel));
for (const r of band.rows) console.log(`  · ${r.name.padEnd(20)} ${r.cost}`);

const names = band.rows.map((r) => r.name);
const has = (re) => names.filter((n) => re.test(n)).length;

check(
  'A · Opportunity Attack, Flaming Cloak, Sentinel ×2 and Interception  <-- THIS IS THE SLICE',
  has(/opportunity attack/i) === 1 &&
    has(/cloak/i) === 1 &&
    has(/^sentinel$/i) === 2 &&
    has(/^interception$/i) === 1,
  has(/^sentinel$/i) === 2 && has(/^interception$/i) === 1
    ? `${band.rows.length} rows: ${names.join(' | ')}`
    : `${band.rows.length} rows: ${names.join(' | ') || '(none)'} — before this slice ` +
      `\`character.feats\` was read by nothing, so Sentinel and Interception could not appear ` +
      `here however his sheet was filled in (finding AT).`,
);

check(
  'A · Lucky is NOT here — the band matches on cost, not on the word "feat"',
  has(/lucky/i) === 0,
  has(/lucky/i) === 0
    ? 'seeded, and correctly absent: nothing about Lucky costs a Reaction'
    : 'Lucky was listed. The rule being applied is "is it a feat", which is the wrong question.',
);

check(
  'A · the count beside the heading agrees with the list beneath it',
  band.countLabel.includes(String(band.rows.length)),
  `toggle reads ${JSON.stringify(band.countLabel)} · ${band.rows.length} rows painted`,
);

/* CORRECTED MID-RUN. This first read «every row is inside the viewport», and
   four of five were — because five rows on a 390×844 phone are taller than one
   screenful. That is a claim about the length of a page, not about this slice,
   and a prover that fails on it is measuring scrolling. What is worth enforcing
   geometrically is that no row is CLIPPED: each has a box, the box has area, and
   it sits inside its container. That is the failure an ellipsis used to hide and
   the one textContent cannot see (finding Q). How many fit in the first
   screenful is printed below as a number, not asserted as a pass. */
check(
  'A · every row is painted with area and none is clipped out of the band',
  band.bandOnGlass === true &&
    band.rows.every((r) => r.painted && r.insideBand),
  `band on glass=${band.bandOnGlass} · painted ${band.rows.filter((r) => r.painted).length}/${band.rows.length}` +
    ` · inside the band ${band.rows.filter((r) => r.insideBand).length}/${band.rows.length}` +
    ` · reaching ${band.rows.filter((r) => r.inFirstScreen).length} without scrolling`,
);

// ===========================================================================
console.log('\n=== B · one feat, two reactions, two different triggers ===\n');

const sentinels = band.rows.filter((r) => /^sentinel$/i.test(r.name));
for (const s of sentinels) console.log(`  when: ${s.when}`);

check(
  'B · the two Sentinel rows do not carry the same trigger  <-- FINDING BE',
  sentinels.length === 2 && sentinels[0].when !== sentinels[1].when,
  sentinels.length === 2
    ? `«${sentinels[0].when}»  vs  «${sentinels[1].when}»`
    : `${sentinels.length} Sentinel row(s). Option ids were minted from type+name and deduped by ` +
      `id, so one feat with two reactions silently became one row — invisible until a feat ` +
      `like this one arrived.`,
);

check(
  'B · one is the Disengage trigger, the other is an attack on someone else',
  sentinels.some((s) => /disengage/i.test(s.text)) &&
    sentinels.some((s) => /target other than you|attacks a target/i.test(s.text)),
  sentinels.map((s) => JSON.stringify(s.text)).join('\n      '),
);

check(
  'B · and Sentinel’s Speed-0 rider is NOT offered as a third reaction',
  sentinels.length === 2 && !sentinels.some((s) => /^When you hit/i.test(s.when || '')),
  'the rider costs nothing and is not a thing you choose to do, so it gets no row',
);

// ===========================================================================
console.log('\n=== C · every feat row answers "when can I use it", in full ===\n');

const featRows = band.rows.filter((r) => /^(sentinel|interception)$/i.test(r.name));

check(
  'C · every feat row states a real trigger — none says "not stated"',
  featRows.length === 3 &&
    featRows.every((r) => /^when\b/i.test(r.when || '') && !/not stated/i.test(r.when || '')),
  featRows.map((r) => `${r.name}: ${JSON.stringify(r.when)}`).join('\n      '),
);

check(
  'C · NOTHING in the band trails off — no ellipsis anywhere  <-- the phase’s whole point',
  !ELLIPSIS.test(band.band),
  ELLIPSIS.test(band.band)
    ? `found one: …${band.band.slice(Math.max(0, band.band.search(ELLIPSIS) - 60), band.band.search(ELLIPSIS) + 20)}`
    : `${band.band.length} characters painted, and every one of them a word`,
);

check(
  'C · every row prices itself, and the price is a Reaction',
  band.rows.every((r) => /reaction/i.test(r.cost || r.text)),
  band.rows.map((r) => `${r.name} = ${JSON.stringify(r.cost)}`).join(' · '),
);

// ===========================================================================
console.log('\n=== D · Interception says what it does, to the last die ===\n');

const interception = band.rows.find((r) => /^interception$/i.test(r.name));
console.log('  row:', interception ? interception.text : '(missing)');

check(
  'D · the row names the reduction and the die, not a summary of them',
  Boolean(interception) &&
    /reduce that damage/i.test(interception.text) &&
    /1d10/.test(interception.text) &&
    /proficiency bonus/i.test(interception.text),
  interception
    ? JSON.stringify(interception.text)
    : 'no Interception row — canon’s fighting styles never reached the turn engine',
);

check(
  'D · the trigger is separated from the effect, and rejoining them is canon’s sentence',
  Boolean(interception) &&
    /^When a creature you can see hits another creature within 5 feet of you with an attack$/i
      .test(interception.when.replace(/^when\s+/i, 'When ')),
  interception ? JSON.stringify(interception.when) : '(missing)',
);

// ===========================================================================
console.log('\n=== E · the cloak prices its retaliation ===\n');

const cloak = band.rows.find((r) => /cloak/i.test(r.name));
console.log('  row:', cloak ? cloak.text : '(missing)');

check(
  'E · the row says the 1d10 is FREE  <-- the sentence Marcus had backwards',
  Boolean(cloak) && /1d10 Fire retaliation \(free\)/.test(cloak.text),
  cloak
    ? /\(free\)/.test(cloak.text)
      ? `«${cloak.paras.find((p) => /1d10/.test(p)) ?? cloak.text}»`
      : `the row reads ${JSON.stringify(cloak.paras.find((p) => /1d10/.test(p)) ?? cloak.text)} — ` +
        `a die with a blank price beside it, which at a table reads as expensive. He has been ` +
        `holding a Reaction back for something that was already his.`
    : '(no cloak row)',
);

/* Read off the PARAGRAPH, not off the row's concatenated text. The first version
   tested `\b10 temp HP\b` against the whole row and failed on a true statement:
   the paragraph above it ends "…Rules flags", so the concatenation reads
   «flags10 temp HP» and there is no word boundary in front of the 10. Joining
   sibling elements and then asserting on word boundaries is finding AY's mistake
   from the other end — the DOM has a paragraph break there and the test had
   thrown it away. */
const cloakFacts = cloak?.paras.find((p) => /temp HP/.test(p)) ?? '';
check(
  'E · and the temp HP moved with his real Charisma — 10, not the fixture’s 12',
  /^10 temp HP\b/.test(cloakFacts) && !/\b1[12] temp HP\b/.test(cloakFacts),
  cloak
    ? `${JSON.stringify(cloak.paras.find((p) => /temp HP/.test(p)) ?? '(none)')} — level 7 + ` +
      `Charisma modifier 3, computed from canon’s formula. Canon ships a frozen 11 beside it ` +
      `for CHA 18; the app has never read it (slice 6).`
    : '(no cloak row)',
);

// ===========================================================================
console.log('\n=== F · the detail sheet spells the price out in words ===\n');

let sheet = { open: null };
if (cloak?.openable) {
  await page.click(
    `section[aria-label="Your reactions"] button[aria-label="${cloak.name} — details"]`,
  );
  await page.waitForTimeout(700);
  sheet = await readSheet(page);
  await shot(page, 'F-cloak-sheet');
}

console.log('  sheet :', sheet.open ?? '(none)');
const freeLine = (sheet.lines ?? []).find((l) => /free: no Action/i.test(l));
console.log('  line  :', freeLine ?? '(none)');

check(
  'F · the sheet names every cost the retaliation does NOT have',
  Boolean(freeLine) &&
    /no Action/i.test(freeLine) &&
    /no Bonus Action/i.test(freeLine) &&
    /no Reaction/i.test(freeLine) &&
    /no use/i.test(freeLine),
  freeLine
    ? `«${freeLine}»`
    : `the sheet says nothing about the price. "(free)" on the row is a word he has to trust; ` +
      `this line is the one that answers "free of WHAT".`,
);

check(
  'F · and the sheet still quotes canon’s sentence verbatim beside it',
  (sheet.text || '').includes('1d10 Fire to a creature that hits you with a melee attack'),
  `slice 8b’s law: a correction changes what the app SAYS, never what it COMPUTES — ` +
    `canon’s own words are still on the page under the gloss`,
);

check(
  'F · no ellipsis on the detail sheet either',
  !ELLIPSIS.test(sheet.text || ''),
  ELLIPSIS.test(sheet.text || '') ? 'found one' : `${(sheet.text || '').length} characters, all words`,
);

if (sheet.open) await closeSheet(page);

// ===========================================================================
console.log('\n=== G · no errors on the console throughout ===\n');
check('G · clean console', errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');

await ctx.close();
await browser.close();

writeFileSync(
  `${OUT}/_results.json`,
  JSON.stringify({ band, sheet, results, errors }, null, 2),
);
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`}`);
console.log(`shots + numbers in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
