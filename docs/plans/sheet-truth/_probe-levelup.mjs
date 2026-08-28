// SLICE 4 PROOF — does a level-up move everything, and leave spent alone?
//
//   node docs/plans/sheet-truth/_probe-levelup.mjs [url] [tag]
//
// Marcus taps "Level Up to N". Seven numbers should follow him: proficiency,
// spell save DC, spell attack, prepared spells, and the three paladin pools
// (Lay on Hands, Channel Divinity, aura range). One thing must NOT follow him:
// what he has already spent. Levelling up is not a long rest.
//
// The seed is a Paladin who has been PLAYING — most of his Lay on Hands spent,
// a Channel Divinity used. That is the trap. A level-up that recomputes the pool
// as `{max: 45, current: 45}` looks right on every screen and has silently
// handed him back healing he already burned. So each pool is checked twice: the
// max moved, and the current did not.
//
// THREE LEVEL-UPS, NOT ONE, and this is the point of the rewrite. The first
// draft ran only 8 -> 9 and scored Channel Divinity and aura range as "ok" —
// but neither of them CHANGES at 8 -> 9, so both passed by standing still. That
// is a sampled claim that failed to observe a fault, which is finding BG in the
// measuring tool. Each of the three cases is a boundary where a different number
// is supposed to move:
//
//   8  -> 9   proficiency, save DC, spell attack, prepared, Lay on Hands
//   10 -> 11  Channel Divinity 2 -> 3    (and Lay on Hands again)
//   17 -> 18  aura range 10 -> 30        (and proficiency 6)
//
// WHERE EACH NUMBER IS READ:
//   - proficiency / save DC / spell attack / prepared : off the rendered DOM,
//     by finding a LEAF element whose text is exactly the label and reading the
//     value beside it — never a regex over innerText, which is finding Q. Each
//     is additionally checked to have a non-zero box, so it is a claim about
//     what is on the screen and not merely in the tree.
//   - the three pools : the localStorage record. They are STORED — `.current`
//     is Marcus's and has to survive — so the file is the real artefact rather
//     than a proxy for it. Parsed, then read by key, never by substring.
//
// A FOURTH CASE, added after the first run of this probe. Cases 1-3 seed
// `paladinResources`, and while diagnosing the prepared-count gap the Grimoire
// tab was dumped and read "Lay on Hands ... Uses: 15/40" — numbers that were
// not in the `paladinResources` the seed had set. Nix HAS no
// `paladinResources`; his Lay on Hands is a FEATURE with `usesMax`, and that is
// the copy every screen he uses actually reads. So cases 1-3 were, on their
// own, a proof about a field his sheet does not have. Case 4 is his real shape,
// and it is read off the SCREEN as well as off the file.

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4220/the-codex/').replace(/\/?$/, '/');
const TAG = process.argv[3] || 'slice4';
const OUT = `${dirname(fileURLToPath(import.meta.url))}/shots`;
const NIX = await loadNix();

/* Every number on each seed is RIGHT for the level it starts at. Nothing is
 * seeded stale — the staleness has to be manufactured by the app's own level-up,
 * which is the fault under test. CHA 16 -> +3 throughout.
 *
 * SPENT ON PURPOSE, in every case. */
const CASES = [
  {
    from: 8,
    seed: {
      level: 8,
      paladinResources: {
        layOnHands: { max: 40, current: 12 },
        channelDivinity: { max: 2, current: 1 },
        auraRange: 10,
      },
    },
    // Canon's level-9 row: prof 4, 9 prepared, Lay on Hands 45, 2 Channel Divinity.
    truth: {
      'Prof': '+4', 'Save DC': '15', 'Sp Atk': '+7', 'prepared': 9,
      'layOnHands.max': 45, 'channelDivinity.max': 2, 'auraRange': 10,
    },
    spent: { 'layOnHands.current': 12, 'channelDivinity.current': 1 },
    moves: 'proficiency, save DC, spell attack, prepared spells, Lay on Hands',
  },
  {
    from: 10,
    seed: {
      level: 10,
      paladinResources: {
        layOnHands: { max: 50, current: 7 },
        channelDivinity: { max: 2, current: 0 },
        auraRange: 10,
      },
    },
    // Level 11: prof 4, 10 prepared, Lay on Hands 55, Channel Divinity 2 -> 3.
    truth: {
      'Prof': '+4', 'Save DC': '15', 'Sp Atk': '+7', 'prepared': 10,
      'layOnHands.max': 55, 'channelDivinity.max': 3, 'auraRange': 10,
    },
    // Nothing spent comes back — not even from a pool that is now bigger.
    spent: { 'layOnHands.current': 7, 'channelDivinity.current': 0 },
    moves: 'Channel Divinity 2 -> 3',
  },
  {
    from: 17,
    seed: {
      level: 17,
      paladinResources: {
        layOnHands: { max: 85, current: 3 },
        channelDivinity: { max: 3, current: 2 },
        auraRange: 10,
      },
    },
    // Level 18: prof 6, 14 prepared, Lay on Hands 90, aura 10 -> 30.
    truth: {
      'Prof': '+6', 'Save DC': '17', 'Sp Atk': '+9', 'prepared': 14,
      'layOnHands.max': 90, 'channelDivinity.max': 3, 'auraRange': 30,
    },
    spent: { 'layOnHands.current': 3, 'channelDivinity.current': 2 },
    moves: 'aura range 10 -> 30, proficiency +6',
  },
  {
    from: 7,
    /* NIX AS HE ACTUALLY IS. No `paladinResources` at all — the pool lives on
       the feature record, part-spent at 15 of 40, and 40 is already wrong for
       level 7 (canon says 35). Both halves of that are the case: the stale
       ceiling has to come right, and the 15 he has left has to still be 15. */
    seed: { level: 7, noPaladinResources: true },
    /* READ BEFORE THE TAP, and this is the claim that cannot pass by standing
       still. His sheet carries 40 at level 7; canon's level-7 row says 35. So
       merely OPENING the Grimoire has to show 35 — the stale ceiling corrected
       on the way off the disk, with the 15 he has left untouched. Against slice
       3 the screen says 40 here, which is the bug as he would meet it.
       (The after-numbers below happen to be 40 either way at this boundary, so
       on their own they would prove nothing. Finding BG, one more time.) */
    beforeTruth: { 'screen.usesMax': 35, 'screen.usesCurrent': 15 },
    truth: {
      'Prof': '+3', 'Save DC': '14', 'Sp Atk': '+6', 'prepared': 7,
      'feature.usesMax': 40,
      'screen.usesMax': 40,
    },
    spent: { 'feature.usesCurrent': 15 },
    moves: 'Lay on Hands 35 -> 40 on the feature record he can actually see',
  },
];

/** Label -> value off the painted DOM. A leaf whose text is EXACTLY the label,
 *  then the value beside it. Rejects anything with a zero-area box, so a node
 *  that exists but is not on the screen cannot be read as if it were. */
const readPainted = () => {
  const out = {};
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    const text = (el.textContent || '').trim();

    if (/^(Save DC|AC|Init|Prof|Sp Atk)$/i.test(text)) {
      if (!seen(el)) continue;
      out[text] = (el.parentElement?.textContent ?? '').trim().replace(text, '').trim();
      continue;
    }
    /* The prepared count is prose — "Prepared: 7 / 7" — with no aria attribute
       and no `role="progressbar"` to read instead. Anchored exactly, on a leaf,
       and required to have a box. The first draft looked for an `aria-label`
       that does not exist and silently reported `null`; a probe that cannot
       find a number must say so, not score it as a failure of the app. */
    const prepared = /^Prepared:\s*(\d+)\s*\/\s*(\d+)$/.exec(text);
    if (prepared && seen(el)) out.prepared = Number(prepared[2]);
  }

  /* The Lay on Hands counter, as the Grimoire card paints it — "15/40" in a
     leaf of its own. Found STRUCTURALLY: locate the leaf whose text is exactly
     the feature's name, then walk up until an ancestor also contains a leaf
     matching `n/m`, and read that. Never a regex over the page's innerText,
     which would happily match any two numbers with a slash between them
     anywhere on the screen (finding Q). */
  /* Counted, and reported. A probe that finds no anchor at all must be able to
     say "I could not see it" in a way that is distinguishable from "the app
     showed the wrong number" — those are opposite conclusions and this script
     has already confused them once. */
  out['_anchors'] = 0;
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length !== 0) continue;
    if ((el.textContent || '').trim() !== 'Lay on Hands') continue;
    if (seen(el)) out['_anchors']++;
    /* The ANCHOR needs a box as much as the counter does. The print view is
       permanently in the DOM at zero height and carries its own "Lay on Hands"
       span; without this the walk anchored there, found the hit-point bar 17px
       below it, and reported the character's HP as the size of the pool. */
    if (!seen(el)) continue;
    /* AND GEOMETRICALLY. The first draft of this walk climbed six ancestors and
       returned the first `n/m` it met — which was "76/76", the hit-point bar,
       because six levels up is the whole page. A counter that belongs to this
       row is ON this row, so it has to be within a row's height of the name.
       That is a claim about the screen; "somewhere in a shared ancestor" is
       not. */
    const anchor = el.getBoundingClientRect();
    let node = el;
    for (let up = 0; up < 6 && node.parentElement; up++) {
      node = node.parentElement;
      let found = false;
      for (const leaf of node.querySelectorAll('*')) {
        if (leaf.children.length !== 0) continue;
        const counter = /^(\d+)\s*\/\s*(\d+)$/.exec((leaf.textContent || '').trim());
        const box = leaf.getBoundingClientRect();
        if (!counter || box.width === 0 || box.height === 0) continue;
        /* AT OR BELOW the name, and close to it. Two layouts paint this: the
           loadout row puts the counter on the same line as the name, the
           Grimoire card puts it 78px under the heading. Both are "this
           feature's counter"; the hit-point bar 17px under a zero-height print
           span was not, and is excluded by the anchor's own box check above. */
        if (box.top < anchor.top - 4 || box.top - anchor.top > 120) continue;
        out['screen.usesCurrent'] = Number(counter[1]);
        out['screen.usesMax'] = Number(counter[2]);
        found = true;
        break;
      }
      if (found) break;
    }
    break;
  }
  return out;
};

/** The stored record, parsed. Keys, never substrings — finding Q. */
const readDisk = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('codex-character-')) {
      try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
    }
  }
  return null;
};

const browser = await chromium.launch();
let totalCorrect = 0, totalPossible = 0, totalKept = 0, totalSpentChecks = 0;
let slotsAlwaysHeld = true;
const toasts = [];

for (const c of CASES) {
  const seed = {
    ...NIX, armorClass: 18, hitPoints: { max: 76, current: 76 },
    tempHP: 0, tempHPSource: null,
    abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
    skillProficiencies: ['Athletics', 'Persuasion'],
    ...c.seed,
  };
  // Case 4's whole point: the field is ABSENT, not empty. Deleted rather than
  // set to undefined, because `JSON.stringify` drops undefined keys anyway and
  // a reader of this file should not have to know that.
  if (seed.noPaladinResources) { delete seed.paladinResources; delete seed.noPaladinResources; }

  // A fresh context per case — a shared one would carry the previous level.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, reducedMotion: 'reduce',
  });
  await ctx.addInitScript(s => {
    if (localStorage.getItem('probe-seeded')) return;
    localStorage.setItem('probe-seeded', '1');
    localStorage.setItem('codex-character', s);
  }, JSON.stringify(seed));
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // Attribute selectors throughout — finding BH: two permanently-mounted
  // `aria-modal` dialogs take the tab bar out of the accessibility tree.
  const tap = sel => page.locator(sel).first().click();

  /* The prepared count and the feature counters live in the LoadoutPanel,
     behind this toggle. The first draft never opened it and reported
     `prepared: null` for every case — a gap in the MEASURING TOOL that would
     have been read as a gap in the app. */
  const openLoadout = async () => {
    const button = page.locator('button[aria-label="Open loadout panel"]').first();
    if (await button.count()) {
      await button.click();
      await page.waitForTimeout(500);
    }
  };

  await tap('button[aria-label="Switch to prep mode"]');
  await page.waitForTimeout(400);

  /* ── what the sheet says BEFORE anything is tapped ─────────────────── */
  await tap('button[aria-label="Grimoire"]');
  await page.waitForTimeout(700);
  await openLoadout();
  const before = await page.evaluate(readPainted);

  /* ── the level-up, through the real UI ────────────────────────────── */
  await tap('button[aria-label="Open settings"]');
  await page.waitForTimeout(600);

  const tagged = await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      if (/^Level Up to \d+$/.test((b.textContent || '').trim())) {
        b.setAttribute('data-probe', 'levelup');
        return (b.textContent || '').trim();
      }
    }
    return null;
  });
  if (!tagged) { console.error(`FAILED: no Level Up button at level ${c.from}`); await browser.close(); process.exit(1); }
  await page.locator('[data-probe="levelup"]').scrollIntoViewIfNeeded();
  await page.click('[data-probe="levelup"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/slice4-${c.from}to${c.from + 1}-settings-${TAG}.png` });

  /* What the app SAYS moved. Slice 4 owes Marcus a sentence naming the numbers,
     rather than "update your spells and features as needed". */
  const toast = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length !== 0) continue;
      const t = (el.textContent || '').trim();
      if (/level(l)?ed up/i.test(t)) return t;
    }
    return null;
  });
  toasts.push({ from: c.from, toast });

  /* The Settings drawer is a real `aria-modal` panel and it stays open over the
     tab bar, intercepting pointer events. Escape, not a click on the scrim — a
     scrim click lands wherever the layout happens to put it. */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await tap('button[aria-label="Grimoire"]');
  await page.waitForTimeout(700);
  await openLoadout();
  const grimoire = await page.evaluate(readPainted);
  await page.screenshot({ path: `${OUT}/slice4-${c.from}to${c.from + 1}-grimoire-${TAG}.png` });

  /* The vitals band, in combat, with nothing reloaded. */
  await tap('button[aria-label="Switch to session mode"]');
  await page.waitForTimeout(400);
  await tap('button[aria-label="Combat"]');
  await page.waitForTimeout(700);
  const vitals = await page.evaluate(readPainted);
  await page.screenshot({ path: `${OUT}/slice4-${c.from}to${c.from + 1}-combat-${TAG}.png` });

  const disk = await page.evaluate(readDisk);
  await ctx.close();

  // The feature-backed copy, off the file. By key, on a parsed object.
  const loh = (disk?.features ?? []).find(f => f.name === 'Lay on Hands') ?? null;

  const got = {
    'Prof': vitals['Prof'],
    'Save DC': vitals['Save DC'],
    'Sp Atk': vitals['Sp Atk'],
    'prepared': grimoire.prepared ?? null,
    'layOnHands.max': disk?.paladinResources?.layOnHands?.max ?? null,
    'channelDivinity.max': disk?.paladinResources?.channelDivinity?.max ?? null,
    'auraRange': disk?.paladinResources?.auraRange ?? null,
    'feature.usesMax': loh?.usesMax ?? null,
    'screen.usesMax': grimoire['screen.usesMax'] ?? null,
  };
  const spentGot = {
    'layOnHands.current': disk?.paladinResources?.layOnHands?.current ?? null,
    'channelDivinity.current': disk?.paladinResources?.channelDivinity?.current ?? null,
    'feature.usesCurrent': loh?.usesCurrent ?? null,
  };

  console.log(`\n${'='.repeat(64)}`);
  console.log(`LEVEL ${c.from} -> ${c.from + 1}   (the boundary where ${c.moves} moves)`);
  console.log(`level on the file: ${disk?.level}`);
  console.log(`visible "Lay on Hands" anchors: before=${before._anchors} after=${grimoire._anchors}`);
  console.log(`${'='.repeat(64)}`);

  if (c.beforeTruth) {
    console.log('\n  what the sheet already said, before anything was tapped');
    for (const [k, want] of Object.entries(c.beforeTruth)) {
      const ok = String(before[k]) === String(want);
      if (ok) totalCorrect++;
      totalPossible++;
      console.log(`    ${ok ? 'ok   ' : 'WRONG'} ${k.padEnd(20)} got ${String(before[k]).padEnd(6)} want ${want}`);
    }
  }

  console.log('\n  the seven numbers, after the tap');
  for (const [k, want] of Object.entries(c.truth)) {
    const ok = String(got[k]) === String(want);
    if (ok) totalCorrect++;
    totalPossible++;
    console.log(`    ${ok ? 'ok   ' : 'WRONG'} ${k.padEnd(20)} got ${String(got[k]).padEnd(6)} want ${want}`);
  }

  console.log('\n  what he already spent (must not move)');
  for (const [k, want] of Object.entries(c.spent)) {
    const ok = String(spentGot[k]) === String(want);
    if (ok) totalKept++;
    totalSpentChecks++;
    console.log(`    ${ok ? 'ok   ' : 'REFUNDED'} ${k.padEnd(24)} got ${String(spentGot[k]).padEnd(6)} want ${want}`);
  }

  /* Spell slots stay HIS, at every level — his sheet carries slots the table
     does not grant and the app never corrects that. Asserted as "unchanged",
     not as "matches canon". */
  const held = JSON.stringify(seed.spellSlots ?? null) === JSON.stringify(disk?.spellSlots ?? null);
  if (!held) slotsAlwaysHeld = false;
  console.log(`\n  spell slots untouched: ${held ? 'yes' : 'NO — the app overruled his table'}`);
}

await browser.close();

console.log(`\n${'='.repeat(64)}`);
console.log('WHAT THE APP TOLD HIM');
for (const t of toasts) console.log(`  ${t.from} -> ${t.from + 1}: ${t.toast ?? '(nothing)'}`);
console.log(`\nCORRECT AFTER THE TAP: ${totalCorrect} of ${totalPossible}`);
console.log(`SPENT KEPT:            ${totalKept} of ${totalSpentChecks}`);
console.log(`SPELL SLOTS UNTOUCHED: ${slotsAlwaysHeld ? 'yes, in every case' : 'NO'}`);
process.exit(totalCorrect === totalPossible && totalKept === totalSpentChecks && slotsAlwaysHeld ? 0 : 1);
