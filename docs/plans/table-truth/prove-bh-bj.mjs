// FINDINGS BH AND BJ — the two things phase 1 closed with open, proved at paint.
//
//   npm run build && npx vite preview --port 4193 --host       (after, in a shell)
//   npx vite preview --port 4194 --host                        (before, optional)
//   node docs/plans/table-truth/prove-bh-bj.mjs [afterUrl] [beforeUrl] [shotsDir]
//
// BH  There was no way to END an encounter from the Play tab. `onEndCombat` was
//     a prop of TurnSummary, wired to a complete handler, destructured, and
//     never called. Combat could be started and never finished.
//
// BJ  Two reaction rows both headed «Sentinel». Neither is a duplicate — the
//     feat has two separate reaction clauses — but two rows under one name read
//     as the app stuttering, and both detail buttons were named «Sentinel —
//     details», so a screen reader offered the same door twice.
//
// WHY A BROWSER, when both have node tests. Finding Q: a proof that reads
// `textContent` is a proof of the MODEL. CSS-clipped text reports in FULL to a
// string renderer, and this whole phase exists because text was being cut. So
// every claim below is geometric — painted, unclipped, and measured in pixels —
// and the two-tap sequence that reveals the confirm strip is actually TAPPED,
// which no node test in this repo can do.
//
// THE BEFORE RUN IS OPTIONAL BUT IS THE POINT. Pointed at a preview of the
// phase-close commit, this same script must FAIL both claims. A prover that
// cannot go red against the code it was written to indict has measured nothing.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync } from 'node:fs';
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

const AFTER = (process.argv[2] || 'http://localhost:4193/the-codex/').replace(/\/?$/, '/');
const BEFORE = process.argv[3] || '';
const OUT = process.argv[4] || 'docs/plans/table-truth/_shots-bh-bj';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Marcus's sheet as he last reported it — the same seed prove-phase1.mjs uses,
   and the feats array is load-bearing here: without Sentinel there is no
   heading collision and BJ's checks would measure nothing at all. */
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

const IN_COMBAT = JSON.stringify({
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
});

const browser = await chromium.launch();

async function openApp(base) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
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
    [NIX.id, JSON.stringify(MARCUS), IN_COMBAT],
  );
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  return { ctx, page };
}

/* The reactions band, read the way finding Q demands: every leaf carries
   whether it is PAINTED and whether it is cutting itself off, because "what the
   row says" and "what Marcus can see" are different questions. */
const READ_BAND = () => {
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const painted = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01;
  };
  const band = document.querySelector('section[aria-label="Your reactions"]');
  if (!band) return null;
  return [...band.querySelectorAll('li')].map((li) => {
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
    const detail = [...li.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label'));
    return { heading: cells[0]?.text ?? '', cells, detail };
  });
};

/* The door, read as geometry, and the DECK it lives in.
 *
 * A control that exists in the DOM but sits below the visible window is not a
 * control Marcus can press at the table — and that is not hypothetical here.
 * The first attempt at BH put this button in `TurnSummary`'s header, and this
 * very reader is what caught it: y=1297 inside a scroller whose window ends at
 * 478, some 800px below anything on screen. So the claim is not "it exists"
 * but "it is on the glass", and the deck's height is read at the same time
 * because the slot is only free if it costs the option list nothing. */
const READ_DOOR = () => {
  const btn = document.querySelector('button[aria-label="End combat"]');
  const deck = document.querySelector('section[aria-label="Turn deck"]');
  const b = (e) => {
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    present: !!btn,
    box: btn ? b(btn) : null,
    deck: deck ? { ...b(deck), position: getComputedStyle(deck).position } : null,
    startCombat: !![...document.querySelectorAll('button')].some((x) => /start combat/i.test(x.textContent || '')),
    viewport: { w: innerWidth, h: innerHeight },
  };
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};
const shot = async (page, name) => {
  await page.waitForTimeout(250);
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

// ===========================================================================
async function run(base, tag) {
  console.log(`\n=== ${tag.toUpperCase()} · ${base} ===\n`);
  const { ctx, page } = await openApp(base);
  await shot(page, `${tag}-1-play-tab`);

  // ── BJ ───────────────────────────────────────────────────────────────────
  const rows = await page.evaluate(READ_BAND);
  if (!rows) {
    check(`${tag} · BJ · the reactions band rendered at all`, false, 'no section[aria-label="Your reactions"] — nothing below can be measured');
  } else {
    const headings = rows.map((r) => r.heading);
    const dupes = [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
    check(
      `${tag} · BJ1 · no two reaction rows wear the same heading`,
      dupes.length === 0,
      dupes.length
        ? `repeated: ${dupes.map((d) => `«${d}»`).join(', ')} — of ${headings.length} rows: ${headings.map((h) => `«${h}»`).join(' ')}`
        : `${headings.length} rows, ${new Set(headings).size} distinct headings: ${headings.map((h) => `«${h}»`).join(' ')}`,
    );

    /* The heading has to be READABLE, not merely different. A distinction that
       lives behind an ellipsis is the exact fault this phase exists to kill,
       and it would satisfy BJ1 while satisfying nobody at the table. */
    const clippedHeads = rows.filter((r) => r.cells[0] && (!r.cells[0].painted || r.cells[0].clips));
    check(
      `${tag} · BJ2 · every heading is painted and none is cutting itself off`,
      clippedHeads.length === 0,
      clippedHeads.length
        ? clippedHeads.map((r) => `«${r.heading}» painted=${r.cells[0].painted} clips=${r.cells[0].clips}`).join(' | ')
        : `all ${rows.length} headings painted, none clipped`,
    );

    const labels = rows.flatMap((r) => r.detail);
    const dupeLabels = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
    check(
      `${tag} · BJ3 · no two rows offer a button with the same accessible name`,
      dupeLabels.length === 0,
      dupeLabels.length ? `repeated: ${dupeLabels.join(' , ')}` : `${labels.length} button names, all distinct`,
    );

    const sentinels = rows.filter((r) => r.heading.startsWith('Sentinel'));
    check(
      `${tag} · BJ4 · both of Sentinel's reactions are still THERE — nothing was collapsed`,
      sentinels.length === 2,
      `${sentinels.length} Sentinel rows: ${sentinels.map((s) => `«${s.heading}»`).join(' ')}`,
    );
  }

  // ── BH ───────────────────────────────────────────────────────────────────
  const hdr = await page.evaluate(READ_DOOR);
  const deckInCombat = hdr.deck;
  check(
    `${tag} · BH1 · the Play tab paints a control named «End combat»`,
    hdr.present === true,
    hdr.present ? `at ${hdr.box.x},${hdr.box.y} · ${hdr.box.w}×${hdr.box.h}` : 'button[aria-label="End combat"] does not exist — combat can be started and never finished',
  );

  if (hdr.present) {
    /* THE CHECK THAT CAUGHT MY OWN FIRST ATTEMPT, kept exactly as it was when
       it went red: on the glass, without scrolling, at a thumb's size. */
    check(
      `${tag} · BH2 · it is a real tap target, entirely within the visible window`,
      hdr.box.w >= 44 && hdr.box.h >= 44 &&
        hdr.box.x >= 0 && hdr.box.x + hdr.box.w <= hdr.viewport.w &&
        hdr.box.y >= 0 && hdr.box.y + hdr.box.h <= hdr.viewport.h,
      `${hdr.box.w}×${hdr.box.h} at x=${hdr.box.x}..${hdr.box.x + hdr.box.w} of ${hdr.viewport.w}, y=${hdr.box.y}..${hdr.box.y + hdr.box.h} of ${hdr.viewport.h}`,
    );

    check(
      `${tag} · BH3 · it lives in the deck, which does not scroll away`,
      hdr.deck !== null && hdr.deck.position === 'fixed' &&
        hdr.box.y >= hdr.deck.y && hdr.box.y + hdr.box.h <= hdr.deck.y + hdr.deck.h,
      hdr.deck
        ? `deck ${hdr.deck.w}×${hdr.deck.h} at y=${hdr.deck.y}, position:${hdr.deck.position}; button y=${hdr.box.y} inside=${hdr.box.y >= hdr.deck.y}`
        : 'no section[aria-label="Turn deck"]',
    );

    check(
      `${tag} · BH3b · it shares one slot with «Start Combat» — never both at once`,
      hdr.startCombat === false,
      `«Start Combat» painted during combat = ${hdr.startCombat}`,
    );

    // First tap ARMS. It must not end the fight.
    const combatBefore = await page.evaluate((id) => localStorage.getItem('codex-combat-' + id), NIX.id);
    await page.click('button[aria-label="End combat"]');
    await page.waitForTimeout(400);
    await shot(page, `${tag}-2-armed`);

    const armed = await page.evaluate(() => {
      const strip = document.querySelector('[aria-label="End combat confirmation"]');
      if (!strip) return { present: false };
      const r = strip.getBoundingClientRect();
      const words = (strip.textContent || '').replace(/\s+/g, ' ').trim();
      const buttons = [...strip.querySelectorAll('button')].map((b) => {
        const bb = b.getBoundingClientRect();
        return { label: b.getAttribute('aria-label'), w: Math.round(bb.width), h: Math.round(bb.height), x: Math.round(bb.x) };
      });
      return { present: true, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, words, buttons };
    });
    const combatAfterArm = await page.evaluate((id) => localStorage.getItem('codex-combat-' + id), NIX.id);

    check(
      `${tag} · BH4 · the first tap ARMS and does not end the fight`,
      armed.present === true && combatAfterArm === combatBefore && combatAfterArm !== null,
      armed.present
        ? `strip painted ${armed.box.w}×${armed.box.h} at y=${armed.box.y}; codex-combat unchanged=${combatAfterArm === combatBefore}`
        : 'no confirm strip appeared after the first tap',
    );

    check(
      `${tag} · BH5 · the strip says what it will cost, in the words of what happens`,
      armed.present && /End the encounter\?/.test(armed.words) && /damage log is saved/.test(armed.words) && !/…/.test(armed.words),
      armed.present ? `«${armed.words.slice(0, 130)}»` : 'no strip',
    );

    check(
      `${tag} · BH6 · both doors are real tap targets and named apart`,
      armed.present && armed.buttons.length === 2 && armed.buttons.every((b) => b.h >= 44) &&
        new Set(armed.buttons.map((b) => b.label)).size === 2 &&
        armed.buttons.find((b) => b.label === 'Keep fighting') && armed.buttons.find((b) => b.label === 'End combat — confirm'),
      armed.present ? armed.buttons.map((b) => `${b.label} ${b.w}×${b.h}`).join(' | ') : 'no strip',
    );

    // "Keep going" must put it back exactly as it was.
    if (armed.present) {
      await page.click('button[aria-label="Keep fighting"]');
      await page.waitForTimeout(400);
      const gone = await page.evaluate(() => !document.querySelector('[aria-label="End combat confirmation"]'));
      const stillFighting = await page.evaluate((id) => localStorage.getItem('codex-combat-' + id), NIX.id);
      check(
        `${tag} · BH7 · «Keep going» disarms and the encounter is untouched`,
        gone && stillFighting === combatBefore,
        `strip gone=${gone}, codex-combat byte-identical=${stillFighting === combatBefore}`,
      );

      // And now, for real.
      await page.click('button[aria-label="End combat"]');
      await page.waitForTimeout(300);
      await page.click('button[aria-label="End combat — confirm"]');
      await page.waitForTimeout(900);
      await shot(page, `${tag}-3-ended`);

      const after = await page.evaluate((id) => {
        const raw = localStorage.getItem('codex-combat-' + id);
        const deck = document.querySelector('section[aria-label="Turn deck"]');
        const dr = deck ? deck.getBoundingClientRect() : null;
        return {
          raw,
          deck: dr ? { w: Math.round(dr.width), h: Math.round(dr.height), y: Math.round(dr.y) } : null,
          state: raw ? JSON.parse(raw) : null,
          startVisible: !!document.querySelector('button')
            && [...document.querySelectorAll('button')].some((b) => /start combat/i.test(b.textContent || '')),
          summaryGone: !document.querySelector('[aria-label="End combat confirmation"]'),
          roundGone: ![...document.querySelectorAll('*')].some((e) => e.children.length === 0 && /^Round 3$/.test((e.textContent || '').trim())),
        };
      }, NIX.id);

      check(
        `${tag} · BH8 · the confirm actually ends it — combat state cleared, «Start Combat» offered again`,
        (after.state === null || after.state.inCombat === false) && after.startVisible && after.summaryGone && after.roundGone,
        `codex-combat=${after.raw === null ? 'removed' : `inCombat=${after.state.inCombat}`}, Start Combat offered=${after.startVisible}, «Round 3» gone=${after.roundGone}`,
      );

      /* THE COST, MEASURED RATHER THAN ASSERTED — and the first draft of this
         claim was WRONG, which is why it is measured. I wrote that the slot was
         "free" because «End Combat» occupies the one «Start Combat» already
         occupies. Against the before-build this reader says otherwise: the deck
         is 302px in combat there and 368px here, because that slot used to be
         EMPTY during a fight. The scrolling option list loses 66px for the
         duration of every encounter. That is the honest price of the control
         being reachable at all — the version that was free measured at an 800px
         scroll — and it is recorded here rather than in a sentence nobody can
         check. What IS free is the second growth: the deck is exclusive between
         the two buttons, so it grows once and no further, which is what the
         assertion below actually pins. */
      check(
        `${tag} · BH9 · the deck grows ONCE — no taller during a fight than after it`,
        deckInCombat && after.deck && deckInCombat.h === after.deck.h,
        deckInCombat && after.deck
          ? `in combat ${deckInCombat.w}×${deckInCombat.h} at y=${deckInCombat.y} · after ${after.deck.w}×${after.deck.h} at y=${after.deck.y} · Δh=${after.deck.h - deckInCombat.h}px`
          : 'deck not found in one of the two states',
      );
    }
  }

  await ctx.close();
}

await run(AFTER, 'after');
if (BEFORE) await run(BEFORE, 'before');

await browser.close();

// ===========================================================================
const failed = results.filter((r) => r.pass === false);
const passed = results.filter((r) => r.pass === true);
console.log(`\n${'='.repeat(70)}`);
console.log(`${passed.length} proved · ${failed.length} failed`);
console.log(`shots: ${OUT}`);

if (BEFORE) {
  /* The falsifiability report. Every claim tagged `after` must pass and the
     matching `before` claim must FAIL, or this prover is not measuring the fix
     — it is measuring something that was already true. */
  const afterFails = failed.filter((r) => r.name.startsWith('after'));
  const beforeFails = failed.filter((r) => r.name.startsWith('before'));
  console.log(`\nFALSIFIABLE: ${afterFails.length === 0 && beforeFails.length > 0 ? 'YES' : 'NO'}`);
  console.log(`  after:  ${afterFails.length} failures (must be 0)`);
  console.log(`  before: ${beforeFails.length} failures (must be > 0 — these are the two findings)`);
  beforeFails.forEach((r) => console.log(`    · ${r.name}`));
  process.exit(afterFails.length === 0 && beforeFails.length > 0 ? 0 : 1);
}

process.exit(failed.length === 0 ? 0 : 1);
