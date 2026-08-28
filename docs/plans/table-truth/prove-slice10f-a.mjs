// SLICE 10f-a — FINDING BF: the dice control has a home that is not on top of
// the page. Geometric proof, run in Chrome against a real build.
//
//   npm run build && npx vite preview --port 4193 --host
//   node docs/plans/table-truth/prove-slice10f-a.mjs [label] [baseUrl]
//
// `label` names the output folder (`_shots-10f-a/<label>/`) so the SAME script
// can be pointed at a pre-change build and a post-change build and the two
// readings compared. That is the only honest before/after: a prover that only
// ever runs against the new code proves the new code is self-consistent, not
// that anything changed.
//
// ── WHY THIS FILE AND NOT A UNIT TEST ───────────────────────────────────────
// Finding Q (slice 4): a proof that reads `textContent` or markup is a proof of
// the MODEL. A `position: fixed` button sitting on top of a paragraph does not
// change one character of that paragraph's text — the string is perfect and the
// player still cannot read the words. So every claim below is a claim about
// BOXES: `getBoundingClientRect`, `Range.getClientRects`, and computed
// position. `TurnDeck.dice.test.tsx` proves the markup half; this proves the
// half that a string cannot express.
//
// ── THE CLAIMS ──────────────────────────────────────────────────────────────
//   1. Play paints exactly ONE control named "Open dice roller", and it is a
//      descendant of section[aria-label="Turn deck"] — docked, not floating.
//   2. On Play, ZERO text runs inside <main> are covered by a fixed element
//      that is not their own ancestor. Both deck states — because the button's
//      old `bottom` was written in terms of `--turn-deck-h`, so minimising
//      moved the defect rather than fixing it (measured: 1 run -> 2 runs).
//   3. The deck is NOT taller. The control went on the slot-pip row's dead
//      width (165px of it, measured), so `--turn-deck-h` must be unchanged and
//      <main> must not have lost a pixel on the tab that can least afford it.
//   4. On a deckless tab, <main> is finally BOUNDED against the floating
//      button — zero covered runs there too, which was never true before.
//   5. The reactions band still reports how many of its rows fit at once. This
//      number is the slice's honesty check: the fix must not have bought a
//      clean overlap count by shrinking the porthole.
//   6. Console clean.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const entry = req.resolve('playwright', { paths: searchPaths });
const pw = await import(pathToFileURL(entry).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const LABEL = (process.argv[2] || 'after').replace(/[^a-z0-9-]/gi, '');
const BASE = (process.argv[3] || 'http://localhost:4193/the-codex/').replace(/\/?$/, '/');
const OUT = `docs/plans/table-truth/_shots-10f-a/${LABEL}`;
mkdirSync(OUT, { recursive: true });
const NIX = await loadNix();

/* Marcus's real sheet, as corrected by him during slice 10e. CHA is 16, not 18;
   the feats are Sentinel / Interception / Lucky. Reused verbatim from
   prove-slice10e.mjs so the two proofs are measuring the same character. */
const MARCUS = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 }, tempHP: 0,
  proficiencyBonus: 3, spellSaveDC: 14, spellAttackBonus: 6,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  feats: [
    { name: 'Sentinel', description: 'You have mastered techniques to take advantage of every drop in any enemy’s guard.', source: 'General Feat', isHomebrew: false, effects: [] },
    { name: 'Interception', description: 'You protect your allies from harm.', source: 'Fighting Style', isHomebrew: false, effects: [] },
    { name: 'Lucky', description: 'You have inexplicable luck that seems to kick in at just the right moment.', source: 'Changeling', isHomebrew: false, effects: [] },
  ],
  weapons: [{ name: 'Longsword', attackType: 'melee', abilityMod: 'STR', proficient: true, damageDice: '1d8', damageType: 'Slashing', properties: ['Versatile (1d10)'], range: '5 ft' }],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};
const IN_COMBAT = JSON.stringify({
  inCombat: true, round: 3, yourTurn: false,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(([id, seedJson, combatJson]) => {
  if (!localStorage.getItem('codex-character-' + id)) localStorage.setItem('codex-character-' + id, seedJson);
  if (!localStorage.getItem('codex-combat-' + id)) localStorage.setItem('codex-combat-' + id, combatJson);
  localStorage.setItem('codex-active-id', id);
  if (!localStorage.getItem('codex-roster')) {
    const s = JSON.parse(seedJson);
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: s.name, class: s.class, subclass: s.subclass, level: s.level, updatedAt: '2026-08-16T00:00:00.000Z' }]));
  }
}, [NIX.id, JSON.stringify(MARCUS), IN_COMBAT]);

const consoleErrors = [];
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 160)));

await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

/* ── THE MEASUREMENT ────────────────────────────────────────────────────────
   One reading of the layout plus the only question that matters: is any WORD
   inside the scroll region underneath something fixed?

   Not "does a container overlap" — containers overlap all the time and nobody
   is harmed. A text run. And not "is the run's own fixed ancestor over it",
   because <main> is itself `position: fixed` in this app (that is why the
   naive version of this check reports every run on the page). A fixed element
   only counts if it does NOT contain the run. */
const measure = () => page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return { noMain: true };
  const mb = main.getBoundingClientRect();

  const fixed = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return false;
    if (parseFloat(cs.opacity || '1') === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

  /* CLIP TO <main> FIRST. This is the correction that finding BF turned on and
     it is worth spelling out, because the naive version of this check reports
     21 covered runs on the pre-change build and every one of the extra 19 is a
     lie.

     `Range.getClientRects()` returns VIEWPORT coordinates and does not care
     about a scrolling ancestor. A paragraph scrolled below <main>'s bottom
     edge still reports a box down at y=700 — which duly "intersects" the turn
     deck, and the header, and the tab bar. But the player is not looking at
     covered text; they are looking at text they have not scrolled to yet, and
     one flick of the thumb brings it into view unharmed.

     That is precisely the half of finding BF that MEASURING KILLED: "the deck
     covers rows 4 and 5" was this artefact, not occlusion — <main> already
     ends 1px above the deck. Real occlusion is a run inside the visible
     porthole with something fixed on top of it, and that is what survives the
     clip: the dice button, which <main> was never bounded against. */
  const clip = (r) => {
    const top = Math.max(r.top, mb.top), bottom = Math.min(r.bottom, mb.bottom);
    const left = Math.max(r.left, mb.left), right = Math.min(r.right, mb.right);
    return bottom - top > 1 && right - left > 1 ? { top, bottom, left, right } : null;
  };

  const sweep = () => {
    const out = [];
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const s = (n.textContent || '').trim();
      if (!s || !n.parentElement) continue;
      const rects = [...(() => { const r = document.createRange(); r.selectNodeContents(n); return r.getClientRects(); })()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map(clip)
        .filter(Boolean);
      if (!rects.length) continue;                        // not on screen at all
      for (const f of fixed) {
        if (f.contains(n.parentElement)) continue;        // its own chrome; see above
        const fr = f.getBoundingClientRect();
        if (!rects.some((r) => hit(r, fr))) continue;
        out.push({
          text: s.slice(0, 45),
          by: f.getAttribute('aria-label') || f.tagName.toLowerCase() + '.' + (f.className || '').toString().split(' ')[0],
        });
        break;
      }
    }
    return out;
  };

  /* THREE SCROLL POSITIONS, UNIONED. One reading proves nothing: a fixed
     button covers whatever happens to be beneath it, so a single sample can
     come back clean purely because that strip of the page was blank. The claim
     "nothing is covered" only means something if the page was scrolled under
     the chrome and still came back clean.

     Layout.tsx's own comment makes this the point: "Padding at the end of the
     content only guarantees you can scroll the last row OUT from under a fixed
     overlay. It does nothing at any other scroll position." So sample the
     other scroll positions. */
  const scroller = main.scrollHeight > main.clientHeight + 2 ? main
    : [...main.querySelectorAll('*')].find((el) => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY)) || main;
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const covered = [];
  const seen = new Set();
  const at = [];
  for (const pos of [0, Math.round(max / 2), max]) {
    scroller.scrollTop = pos;
    const found = sweep();
    at.push({ scrollTop: Math.round(scroller.scrollTop), count: found.length });
    for (const c of found) {
      const k = c.text + '|' + c.by;
      if (!seen.has(k)) { seen.add(k); covered.push(c); }
    }
  }
  scroller.scrollTop = 0;

  /* ── THE STRUCTURAL CLAIM ────────────────────────────────────────────────
     "Zero text runs covered" is true but WEAK, and the pre-change reading
     showed exactly why: on the Grimoire tab it already reported zero, not
     because the page was safe but because no word happened to land in the 56px
     corner the button occupies. Sample a different character sheet, or scroll
     one row further, and the same build covers text. A proof that depends on
     luck of layout is not a proof.

     So measure the thing that cannot get lucky: how far does each fixed
     element intrude into <main>'s visible box? Zero intrusion means no text
     CAN be covered — at any scroll position, on any sheet, forever. That is
     what "the scroll region is BOUNDED, not padded" actually asserts, and it
     is the claim this slice has to earn. */
  const intrusions = fixed
    .filter((f) => !f.contains(main) && !main.contains(f))
    .map((f) => {
      const r = f.getBoundingClientRect();
      const dy = Math.min(r.bottom, mb.bottom) - Math.max(r.top, mb.top);
      const dx = Math.min(r.right, mb.right) - Math.max(r.left, mb.left);
      return dy > 1 && dx > 1
        ? { what: f.getAttribute('aria-label') || f.tagName.toLowerCase() + '.' + (f.className || '').toString().split(' ')[0], overlapPx: Math.round(dy), widthPx: Math.round(dx) }
        : null;
    })
    .filter(Boolean);

  const dice = [...document.querySelectorAll('[aria-label="Open dice roller"]')];
  const deckSection = document.querySelector('section[aria-label="Turn deck"]');

  const band = document.querySelector('section[aria-label="Your reactions"]');
  let rowsFit = null, rowsTotal = null;
  if (band) {
    band.scrollIntoView({ block: 'start', behavior: 'instant' });
    const lis = [...band.querySelectorAll('li')];
    rowsTotal = lis.length;
    const m2 = main.getBoundingClientRect();
    rowsFit = lis.filter((li) => {
      const r = li.getBoundingClientRect();
      return r.top >= m2.top && r.bottom <= m2.bottom;
    }).length;
  }

  return {
    deckH: getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h').trim() || '(unset)',
    deckPresent: !!deckSection,
    mainH: Math.round(mb.height),
    mainTop: Math.round(mb.top),
    mainBottom: Math.round(mb.bottom),
    diceCount: dice.length,
    diceInDeck: dice.map((d) => !!(deckSection && deckSection.contains(d))),
    diceFixed: dice.map((d) => getComputedStyle(d).position === 'fixed'),
    diceBox: dice.map((d) => { const r = d.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }),
    rowsFit, rowsTotal,
    covered, coveredAt: at, scrollRange: Math.round(max), intrusions,
  };
});

const results = { label: LABEL };

// ── Play tab, deck expanded ────────────────────────────────────────────────
results.playExpanded = await measure();
await page.screenshot({ path: `${OUT}/play-expanded.png` });

/* The deck's own minimise control, found by role — a restyle must not silently
   turn this into a no-op that reports success. */
const toggled = await page.evaluate(() => {
  const t = [...document.querySelectorAll('button')]
    .find((b) => /minimi|collapse|expand/i.test(b.getAttribute('aria-label') || '') && b.closest('section[aria-label="Turn deck"]'));
  if (!t) return null;
  t.click();
  return t.getAttribute('aria-label');
});
await page.waitForTimeout(600);
results.minimisedVia = toggled;
results.playMinimised = toggled ? await measure() : null;
if (toggled) await page.screenshot({ path: `${OUT}/play-minimised.png` });

// restore the deck so the next reading starts from the state the app opens in
if (toggled) {
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('button')]
      .find((b) => /minimi|collapse|expand/i.test(b.getAttribute('aria-label') || '') && b.closest('section[aria-label="Turn deck"]'));
    t?.click();
  });
  await page.waitForTimeout(600);
}

// ── A tab with no deck ─────────────────────────────────────────────────────
/* Claim 4. This is the surface that PAYS for the fix: it has no chrome to
   adopt the control, so the button keeps floating and <main> is bounded
   against it — 71px of a 779px page, which is the 9% the header comment says
   is worth paying. Before the change, this tab had text under the button and
   nobody had ever measured it. */
const wentTo = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button, a')]
    .find((el) => /^grimoire$/i.test((el.textContent || '').trim()) || /grimoire/i.test(el.getAttribute('aria-label') || ''));
  if (!b) return null;
  b.click();
  return (b.textContent || b.getAttribute('aria-label') || '').trim();
});
await page.waitForTimeout(900);
results.decklessTab = wentTo;
results.deckless = wentTo ? await measure() : null;
if (wentTo) await page.screenshot({ path: `${OUT}/deckless.png` });

results.consoleErrors = consoleErrors;
writeFileSync(`${OUT}/_measured.json`, JSON.stringify(results, null, 2));

// ── REPORT ─────────────────────────────────────────────────────────────────
const show = (name, m) => {
  if (!m) { console.log(`  ${name}: (not reached)`); return; }
  console.log(`  ${name}`);
  console.log(`    deck=${String(m.deckH).padEnd(8)} main=${m.mainH}px (${m.mainTop}..${m.mainBottom})   band rows on one screen: ${m.rowsFit ?? '-'}/${m.rowsTotal ?? '-'}`);
  console.log(`    dice controls: ${m.diceCount}  in-deck: [${m.diceInDeck.join(', ') || '-'}]  fixed: [${m.diceFixed.join(', ') || '-'}]  box: ${JSON.stringify(m.diceBox)}`);
  console.log(`    text runs under fixed chrome: ${m.covered.length}  (scroll ${(m.coveredAt || []).map((a) => `${a.scrollTop}px:${a.count}`).join('  ')})`);
  for (const c of m.covered) console.log(`      "${c.text}"  <- ${c.by}`);
  console.log(`    fixed chrome intruding into <main>'s box: ${m.intrusions.length ? '' : 'NONE'}`);
  for (const i of m.intrusions) console.log(`      ${i.overlapPx}px deep, ${i.widthPx}px wide  <- ${i.what}`);
};
console.log(`\n══ slice 10f-a · finding BF · 390x844 · build="${LABEL}" ══`);
show('PLAY, deck expanded', results.playExpanded);
console.log(`  (minimise control: ${toggled ?? 'NOT FOUND'})`);
show('PLAY, deck minimised', results.playMinimised);
show(`DECKLESS TAB (${wentTo ?? 'not found'})`, results.deckless);
console.log(`  console errors: ${consoleErrors.length}`);
for (const e of consoleErrors) console.log(`    ${e}`);

// ── VERDICT ────────────────────────────────────────────────────────────────
/* Asserted here rather than eyeballed, so a regression makes this script exit
   non-zero instead of printing a wall of numbers nobody re-reads. */
const fail = [];
const expectDocked = LABEL !== 'before';
for (const [name, m] of [['expanded', results.playExpanded], ['minimised', results.playMinimised]]) {
  if (!m) continue;
  if (m.diceCount !== 1) fail.push(`play/${name}: ${m.diceCount} dice controls, expected exactly 1`);
  if (expectDocked && !m.diceInDeck[0]) fail.push(`play/${name}: dice control is not inside the turn deck`);
  if (expectDocked && m.diceFixed[0]) fail.push(`play/${name}: dice control is still position:fixed`);
  if (expectDocked && m.covered.length) fail.push(`play/${name}: ${m.covered.length} text run(s) under fixed chrome`);
  if (expectDocked && m.intrusions.length) fail.push(`play/${name}: fixed chrome intrudes ${m.intrusions.map((i) => `${i.overlapPx}px (${i.what})`).join(', ')}`);
}
if (results.deckless) {
  const d = results.deckless;
  if (expectDocked && d.diceCount !== 1) fail.push(`deckless: ${d.diceCount} dice controls, expected the floating one`);
  if (expectDocked && d.covered.length) fail.push(`deckless: ${d.covered.length} text run(s) under fixed chrome`);
  if (expectDocked && d.intrusions.length) fail.push(`deckless: fixed chrome intrudes ${d.intrusions.map((i) => `${i.overlapPx}px (${i.what})`).join(', ')}`);
}
if (consoleErrors.length) fail.push(`${consoleErrors.length} console error(s)`);

console.log(fail.length ? `\n✗ ${fail.length} FAILED CLAIM(S)` : '\n✓ all claims hold');
for (const f of fail) console.log(`    ${f}`);
console.log(`  shots + json: ${OUT}\n`);

await browser.close();
process.exit(LABEL === 'before' ? 0 : fail.length ? 1 : 0);
