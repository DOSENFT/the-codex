// Slice 7 proof — the moment.  What the screen does when the turn is not yours.
//
// The unit suite proves the engine: 274 tests, and eight mutations of Slice 7's
// own logic all killed. None of that can make the claim the slice was actually
// taken for, which is a claim about a screen at a table —
//
//   Nix's turn ends. Four other people take theirs. Somewhere in there a goblin
//   steps out of his reach, and Marcus has about two seconds to find the one
//   thing he is still allowed to do, on a phone, in a lit room, while five
//   people talk.
//
// Before this slice the app answered that with a list of everything he could
// not do, headed "YOUR TURN", with Opportunity Attack nowhere on it — it was
// prose in dnd-data.ts, read by nothing, offered on no turn of no fight ever.
//
// Three things below are only provable here, in a real browser, against a real
// build, and every one of them passes `vitest` in its broken state:
//
//   * the caption. `turn.yourTurn` was correct in the composer for the whole of
//     the engine work while the heading above the list still said "Your turn",
//     because no unit test reads a heading. It was caught by LOOKING at the
//     off-turn screenshot, which is the same way both of Slice 6c's bugs were
//     caught, and is now pinned here so it cannot come back.
//   * the footer. A button wired to the wrong verb is invisible to the reducer
//     tests, which never press anything.
//   * the round trip. End turn → the moment → a reaction spent → my turn begins
//     → the reaction is back, through localStorage, with a reload in the middle,
//     because an iPad that sleeps mid-combat is the normal case and not an edge.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice7.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const ID = NIX.id;
const BASE = 'http://localhost:4173/the-codex/';
const TURN = BASE + '?d=1';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

/** The persisted encounter — app state, not the sheet. `yourTurn` is the whole
 *  subject of this slice, so it is read from the bytes and never inferred. */
const COMBAT = id => JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null');

/** What the screen is saying, read the way an eye reads it. */
const VIEW = () => {
  const q = s => [...document.querySelectorAll(s)];
  const rows = q('.colB .act').map(e => ({
    name: e.querySelector('.anm')?.textContent,
    disabled: e.disabled === true,
    why: e.querySelector('.why')?.textContent ?? null,
    note: e.querySelector('.note')?.textContent ?? null,
    cost: e.querySelector('.cost')?.textContent ?? null,
    text: e.textContent ?? '',
    // Which rows the CSS actually lit. Read off the computed style rather than
    // off the class list: a rule that fails to match is exactly the failure
    // this is here to catch, and `.moment` being on the root proves nothing
    // about whether the selector below it ever bit.
    litEdge: getComputedStyle(e).borderLeftWidth,
  }));
  const caps = q('.colB .list > .cap').map(c => ({
    lbl: c.querySelector('.lbl')?.textContent,
    ink: getComputedStyle(c.querySelector('.lbl')).color,
  }));
  const band = document.querySelector('.mband');
  const btns = q('.edge .btn');
  return {
    moment: document.querySelector('.dturn')?.classList.contains('moment') ?? null,
    caps,
    rows,
    band: band ? {
      trig: band.querySelector('.mtrig')?.textContent,
      sub: band.querySelector('.msub')?.textContent,
    } : null,
    econ: Object.fromEntries(q('.econ .eslot').map(e =>
      [e.textContent.trim(), e.classList.contains('open')])),
    undo: { text: btns[0]?.textContent, disabled: btns[0]?.disabled },
    primary: { text: btns[1]?.textContent, disabled: btns[1]?.disabled },
    refusal: document.querySelector('.refusal')?.textContent ?? null,
  };
};

const row = (v, name) => v.rows.find(r => r.name === name) ?? null;
const tap = async (p, name) =>
  { await p.locator('.colB .act').filter({ hasText: name }).first().click(); await p.waitForTimeout(220); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await ctx.addInitScript(([id, seed]) => {
  // SEED ONCE. This script reloads deliberately, and a re-seed on the reload
  // would hand back the reaction it is trying to prove stayed spent.
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-combat-' + id, JSON.stringify({
      inCombat: true, round: 3,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
      concentrating: null,
      // Deliberately ABSENT, not `true`. Every encounter saved before this
      // slice existed is missing the field, and the first thing to prove is
      // that Marcus's own saved fight still opens on his own turn.
    }));
  }
  localStorage.setItem('codex-active-id', id);
}, [ID, JSON.stringify(NIX)]);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// ---------------------------------------------------------------------------
console.log('\n-- 1. a fight saved BEFORE this slice still opens on your turn --');
await p.goto(TURN, { waitUntil: 'networkidle' });
await p.waitForSelector('.act', { timeout: 10000 });
let v = await p.evaluate(VIEW);

check('no `yourTurn` in storage is read as YOUR turn', v.moment, false);
check('  ...the caption says so', v.caps[0]?.lbl, 'Your turn');
check('  ...no band is drawn', v.band, null);
check('  ...and the primary button is End turn', v.primary.text, 'End turn');

// The reaction now exists as an OFFER, on your turn as well, because the rule
// it models is real all the time — it is simply ranked to the bottom.
const oa = 'Opportunity Attack — Hearthbrand';
check('the opportunity attack is on the screen at all', row(v, oa) !== null, true);
check('  ...ranked out of the shortlist, and saying why', row(v, oa)?.note, 'Not on your turn');
check('  ...carrying the real weapon\'s dice', /1d8/.test(row(v, oa)?.text ?? ''), true);
check('  ...and its rider', /Sap/.test(row(v, oa)?.text ?? ''), true);
check('no opportunity attack for the thrown Javelin',
  v.rows.filter(r => /^Opportunity Attack/.test(r.name)).length, 1);

// ---------------------------------------------------------------------------
console.log('\n-- 2. he ends his turn, and the page turns over -----------------');
await p.locator('.edge .btn.primary').click();
await p.waitForTimeout(220);
v = await p.evaluate(VIEW);

check('the encounter records that it is not his turn', (await p.evaluate(COMBAT, ID)).yourTurn, false);
check('the screen agrees', v.moment, true);

// THE DEFECT THE SHOOT FOUND. The composer was already correct here while this
// heading still read "YOUR TURN" over a list of reactions.
check('THE CAPTION NO LONGER LIES', v.caps[0]?.lbl, 'The moment');
check('  ...and "Everything else" is untouched below it', v.caps[1]?.lbl, 'Everything else');

check('the band names what is happening', v.band?.trig, 'Someone else is acting');
check('  ...and what he still holds',
  v.band?.sub, 'Your Reaction is the one thing that is yours right now.');
// No board until Slice 9, so no creature and no trigger may be named. A
// sentence this build cannot check is worse here than no sentence at all.
check('  ...naming no creature it cannot see',
  /goblin|orc|enemy|attacker/i.test(v.band?.trig + ' ' + v.band?.sub), false);

check('the economy shows only the reaction open',
  v.econ, { Action: false, Bonus: false, Reaction: true, Move: false });

// ---------------------------------------------------------------------------
console.log('\n-- 3. the one thing he can do is at the top ---------------------');
// `rest` rows are all blocked off-turn, so the live rows are exactly the
// shortlist — and the shortlist is exactly the reactions.
const live = v.rows.filter(r => !r.disabled);
check('every live row is a reaction', live.every(r => /Reaction/i.test(r.cost)), true);
check('the opportunity attack is one of them', live.some(r => r.name === oa), true);
check('  ...and it is FIRST on the screen', v.rows[0]?.name, oa);
check('no live row still says "Not on your turn"',
  live.some(r => r.note === 'Not on your turn'), false);
// FOUND BY LOOKING AT THE SHOT, like both of Slice 6c's. The rank note under
// each live row read "This is the moment" — directly beneath a band that had
// just said the same thing louder. Two rows repeating the header in a quieter
// voice is the "Undertow — Undertow" fault again, so the phrase was dropped and
// only the weight kept.
check('and no live row repeats the band back at him', live.map(r => r.note), [null, null]);

// THE CSS ACTUALLY BIT. `.dturn.moment .act:not(.blocked)` is the whole of
// treatment B's emphasis and a typo in it fails silently and beautifully.
check('the live rows take the lit 3px edge',
  live.every(r => r.litEdge === '3px'), true);
check('  ...and the blocked ones keep the plain 2px',
  v.rows.filter(r => r.disabled).every(r => r.litEdge === '2px'), true);

// D greys with a reason; it never hides. His sword is still on screen.
check('his weapon is still listed, greyed', row(v, 'Hearthbrand')?.disabled, true);
check('  ...with the honest reason', row(v, 'Hearthbrand')?.why, 'It is not your turn');

check('the footer offers the next true thing', v.primary.text, 'My turn begins');

// ---------------------------------------------------------------------------
console.log('\n-- 4. he takes it ----------------------------------------------');
await tap(p, oa);
v = await p.evaluate(VIEW);
check('no refusal — the row and the reducer agreed', v.refusal, null);
check('the reaction is spent, in storage', (await p.evaluate(COMBAT, ID)).turnActions.reaction, true);
check('the economy closes', v.econ.Reaction, false);
check('nothing is offered any more', v.rows.filter(r => !r.disabled).length, 0);
check('and the band stops promising a reaction he no longer has',
  v.band?.sub, 'Your Reaction is spent — it returns when your turn does.');
check('the undo names it', v.undo.text, `Undo ${oa}`);

// ---------------------------------------------------------------------------
console.log('\n-- 5. he reaches for it a second time --------------------------');
// THE OLD BUG, from the other side. Before this slice `endTurn` handed the
// reaction back at the round boundary, so a second one was free the instant you
// tapped End turn — in the exact window where you would reach for it.
//
// This was first written to tap the row and assert the reducer's refusal, and
// the tap TIMED OUT: the row is already `disabled`, so the second spend is
// stopped a layer earlier than expected and the refusal string never appears.
// That is the better outcome and the assertion was rewritten to say so rather
// than reaching past the button to force the case. The reducer's own refusal is
// not left unproven — `reduce.test.ts` drives it directly, off-turn, wording
// and all, in the group that mutation M7 forced into existence.
check('the row is not merely refused, it is not pressable',
  row(v, oa)?.disabled, true);
check('  ...saying which of his four slots is gone', row(v, oa)?.why, 'Your reaction is spent');
check('  ...and nothing was spent twice', (await p.evaluate(COMBAT, ID)).turnActions.reaction, true);

// ---------------------------------------------------------------------------
console.log('\n-- 6. the iPad sleeps through the rest of the round -------------');
await p.goto(TURN, { waitUntil: 'networkidle' });
await p.waitForSelector('.act', { timeout: 10000 });
v = await p.evaluate(VIEW);
check('it is still not his turn', v.moment, true);
check('the reaction is still spent', v.econ.Reaction, false);
check('and the undo survived the reload', v.undo.text, `Undo ${oa}`);

// ---------------------------------------------------------------------------
console.log('\n-- 7. his turn comes round ------------------------------------');
await p.locator('.edge .btn.primary').click();
await p.waitForTimeout(220);
v = await p.evaluate(VIEW);
const c = await p.evaluate(COMBAT, ID);
check('storage says his turn', c.yourTurn, true);
check('the reaction came back WITH the turn, not before it', c.turnActions.reaction, false);
check('  ...and so did everything else',
  [c.turnActions.action, c.turnActions.bonusAction, c.turnActions.movement], [false, false, false]);
check('the band is gone', v.band, null);
check('the caption is his again', v.caps[0]?.lbl, 'Your turn');
check('the footer is End turn again', v.primary.text, 'End turn');
check('his sword is live again', row(v, 'Hearthbrand')?.disabled, false);
check('and the opportunity attack has gone back to the bottom',
  row(v, oa)?.note, 'Not on your turn');

// ---------------------------------------------------------------------------
console.log('\n-- 8. the console ----------------------------------------------');
check('nothing threw', errors, []);

// ---------------------------------------------------------------------------
// Both devices, in the moment, for the eye. The engine is put off-turn through
// the real buttons rather than by writing state, so the shot is of the screen
// Marcus actually reaches.
for (const [label, width, height] of [['phone', 390, 844], ['ipad', 1366, 1024]]) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(TURN, { waitUntil: 'networkidle' });
  await page.waitForSelector('.act', { timeout: 10000 });
  await page.locator('.edge .btn.primary').click();   // end turn → the moment
  await page.waitForTimeout(250);
  await page.screenshot({ path: `_shots-app/slice7-moment-${label}.png`, fullPage: false });
  await page.locator('.edge .btn.primary').click();   // my turn begins → back
  await page.waitForTimeout(250);
  await page.screenshot({ path: `_shots-app/slice7-yourturn-${label}.png`, fullPage: false });
  await page.close();
}
console.log('\n  shots: _shots-app/slice7-{moment,yourturn}-{phone,ipad}.png');

await b.close();
console.log(failures === 0 ? '\nALL CHECKS PASS\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
