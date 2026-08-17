// Mutation run for the TURN BRAIN — slices 6, 6b, 6c and 7.
//
// This file exists to pay a debt the plan named out loud (00-status.md, "Known
// process debt", 2026-08-16):
//
//   "the browser-level proofs for the turn brain — 6, 6b, 6c, 7 — have never
//    been shown able to go red. Those are the checks we lean on hardest during
//    every non-degradation sweep, so an untested proof there is the most
//    expensive kind. → a mutation pass over 6/6b/6c/7 is a required part of
//    Slice 15, not optional."
//
// It is the most expensive kind for a specific reason. Those four proofs are
// what every later slice reruns to claim it broke nothing. If one of them is
// green no matter what, then every "non-degradation verified" line written
// since Slice 8 rests on it, and none of them know.
//
// One file for four proofs rather than four files, because the mutations are
// all in the same three engine modules and the interesting ones cross proof
// boundaries — mutation 1 breaks the 2024 one-slot rule, which slice 6 asserts
// and slices 6b/6c/7 quietly rely on.
//
// FINDING, recorded here because the run is the evidence (2026-08-17): the
// engine enforces its rules in TWO independent layers, and the first pass of
// this file did not know that. `compose.ts` gives a row a `blockedReason`, so
// the UI disables it and says why; `reduce.ts` calls `refuse(...)` if the event
// arrives anyway. Break one layer and the screen still behaves, so a
// browser-level proof stays green — correctly. That is defence in depth, not a
// proof hole, and the honest mutation is therefore a TWO-LAYER edit: take the
// rule out of both places at once and see whether the proof notices. Mutations
// 3, 6 and 8 are written that way, each with both anchors named below.
//
//   node docs/plans/codex-v1/reference/mutate-turn-brain.mjs        all
//   node docs/plans/codex-v1/reference/mutate-turn-brain.mjs 3      just #3
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const P6  = 'docs/plans/codex-v1/reference/prove-slice6.mjs';
const P6B = 'docs/plans/codex-v1/reference/prove-slice6b.mjs';
const P6C = 'docs/plans/codex-v1/reference/prove-slice6c.mjs';
const P7  = 'docs/plans/codex-v1/reference/prove-slice7.mjs';

const MUTATIONS = [
  {
    // The 2024 rule that one turn buys one spell slot. Removed, every slot on
    // the sheet stays live all turn and the app cheerfully lets a player break
    // the rulebook — which is the single most consequential thing this engine
    // does that the old combat screen never did.
    name: 'the one-slot-per-turn rule stops being enforced',
    proof: P6,
    edits: [{
      file: 'src/lib/turn/compose.ts',
      from: "blockedReason = 'You may expend only one spell slot on a turn'",
      to: "blockedReason = undefined",
    }],
    // Anchor corrected 2026-08-17. This kills at the check that the rule is
    // still being SAID, not at the one that the rows are disabled — because
    // with no reason attached the rows go AVAILABLE, so the "every remaining
    // spender is disabled" line is vacuously true over an empty set. The
    // stronger check was already in the proof; the guess here was wrong.
    expect: 'the one-slot rule is being SAID somewhere',
  },
  {
    // A pool that can be spent past empty. Nix ends the fight with -1 embers,
    // and nothing anywhere says no.
    name: 'a resource pool can be spent below zero',
    proof: P6B,
    edits: [{
      file: 'src/lib/rules-2024/resources.ts',
      from: 'return pool !== null && pool.current >= amount',
      to: 'return pool !== null',
    }],
    // Anchor corrected 2026-08-17. The proof catches this one row EARLIER than
    // I guessed: `affordable()` is what puts the "Not enough … left" sentence on
    // the row, so the reason vanishes before the count ever goes negative. It is
    // the better check of the two — it fires while Nix still has one ember, not
    // after he has spent one he did not have.
    expect: 'and the row now says WHY, in his own words',
  },
  {
    // The affordability rule stops explaining itself. The row still refuses to
    // fire; it just goes silent about it, which is the difference between a rule
    // and a bug as far as anyone at the table can tell — a greyed row with no
    // sentence under it reads as the app being broken.
    //
    // TWO-LAYER, and it has to be. The first pass edited only the reducer's
    // message and SURVIVED, which was the right result: compose blocks the row,
    // so the reducer is never asked and its wording never reaches a screen. The
    // behaviour "no reason anywhere" needs both halves silenced. Note the
    // compose edit sets the empty string rather than `undefined` — `available`
    // is `blockedReason === undefined`, so `''` keeps the row disabled and
    // removes only the words. That is the mutation, precisely: still refused,
    // no longer explained.
    name: 'an unaffordable option refuses without saying why',
    proof: P6B,
    edits: [
      {
        file: 'src/lib/turn/compose.ts',
        from: 'blockedReason = option.unaffordableReason',
        to: "blockedReason = ''",
      },
      {
        file: 'src/lib/turn/reduce.ts',
        from: 'return refuse(state, `Not enough ${site.name} left.`)',
        to: 'return refuse(state, ``)',
      },
    ],
    expect: 'and the row now says WHY, in his own words',
  },
  {
    // Half-declared counters get through. A feature with a max and no current
    // becomes a pool the author never wrote — and the bug this rule replaced
    // rendered it "0 / 2" and then refused to fire it.
    //
    // RETARGETED 2026-08-17, and this one is a real gap, named rather than
    // papered over. Against the browser proof this mutation SURVIVED, for the
    // dullest possible reason: no fixture in `_fixtures-app/` has a
    // half-declared counter, so nothing on any screen the proof can reach
    // exercises the rule. That is a fixture gap in prove-slice6b, not a
    // property of the engine — the rule IS covered, by
    // resources.test.ts:'does not count a half-declared counter as a pool at
    // all', so the mutation is aimed at the layer that actually holds the line.
    // Wave 5 should add a half-declared feature to the 6b fixture and move this
    // back up to the browser.
    name: 'half-declared feature counters become real pools',
    proof: 'npx vitest run src/lib/rules-2024/resources.test.ts',
    proofIsCmd: true,
    failLine: /×/,
    edits: [{
      file: 'src/lib/rules-2024/resources.ts',
      from: 'if (feature.usesMax === undefined || feature.usesCurrent === undefined) continue',
      to: 'if (feature.usesMax === undefined && feature.usesCurrent === undefined) continue',
    }],
    expect: 'does not count a half-declared counter as a pool at all',
  },
  {
    // Name-sniffing beats the author again. This is the exact bug slice 6c was
    // taken for: Marcus writes "Undertow Aura", declares it an Action, and the
    // app files it as passive scenery because of one word in its name.
    name: 'a feature name overrides the action type its author declared',
    proof: P6C,
    edits: [{
      file: 'src/lib/turn/options.ts',
      from: "|| (declared === undefined && feature.name.toLowerCase().includes('aura'))",
      to: "|| feature.name.toLowerCase().includes('aura')",
    }],
    expect: 'the feature he declared an Action is ON THE SCREEN',
  },
  {
    // Off-turn enforcement, gone. Round 3, the ogre is swinging, and the app
    // will happily let Marcus take his Action — the whole point of slice 7.
    //
    // TWO-LAYER. The reducer edit alone SURVIVED, and rightly: compose had
    // already greyed the row, so nothing ever reached the reducer to be refused
    // and the screen was still correct. Both anchors have to go for the app to
    // actually offer the sword mid-ogre.
    name: 'anything can be taken while it is not your turn',
    proof: P7,
    edits: [
      {
        file: 'src/lib/turn/reduce.ts',
        from: "if (combat.yourTurn === false && slot !== 'reaction' && slot !== 'free') {",
        to: "if (false && slot !== 'reaction' && slot !== 'free') {",
      },
      {
        file: 'src/lib/turn/compose.ts',
        from: "blockedReason = 'It is not your turn'",
        to: 'blockedReason = undefined',
      },
    ],
    expect: '...with the honest reason',
  },
  {
    // A spent reaction comes back the moment the turn ends instead of when the
    // next turn begins, so it can be spent twice in one round. Nothing on
    // screen looks wrong; you simply get a free reaction every round.
    name: 'a spent reaction returns before the turn does',
    proof: P7,
    edits: [{
      file: 'src/lib/turn/reduce.ts',
      from: 'reaction: combat.turnActions?.reaction === true,',
      to: 'reaction: true,',
    }],
    // Anchor corrected 2026-08-17. It dies at the economy strip during the
    // off-turn moment, several checks before the reload check I had guessed —
    // the strip is meant to show the reaction OPEN and everything else shut, and
    // with the reaction handed back early the strip contradicts itself.
    expect: 'the economy shows only the reaction open',
  },
  {
    // The compatibility read that lets fights saved before slice 7 open on
    // YOUR turn rather than in someone else's moment. Flip it and every
    // pre-existing combat state boots into an off-turn screen with the
    // player's own options greyed out.
    //
    // TWO-LAYER, and this pair is the clearest illustration of why. `compose`
    // reads absent-as-true; `reconcile` in reduce.ts separately WRITES
    // `yourTurn: true` into any combat state that lacks it. Flip only the read
    // and the write repairs the state on the very first event, so the screen is
    // right within one tick and the proof — correctly — sees nothing. The
    // compatibility promise is kept by two mechanisms, so it takes two edits to
    // break the promise.
    name: 'a fight saved before slice 7 boots off-turn',
    proof: P7,
    edits: [
      {
        file: 'src/lib/turn/compose.ts',
        from: 'const yourTurn = combat?.yourTurn !== false',
        to: 'const yourTurn = combat?.yourTurn === true',
      },
      {
        file: 'src/lib/turn/reduce.ts',
        from: "const turnKnown = typeof state.combat.yourTurn === 'boolean'",
        to: 'const turnKnown = true',
      },
    ],
    expect: 'no `yourTurn` in storage is read as YOUR turn',
  },
];

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

const only = process.argv[2] ? Number(process.argv[2]) : null;
const SELECTED = only ? [MUTATIONS[only - 1]] : MUTATIONS;

let holes = 0, invalid = 0;
for (const m of SELECTED) {
  const originals = new Map();
  for (const e of m.edits) if (!originals.has(e.file)) originals.set(e.file, readFileSync(file(e.file), 'utf8'));
  const restore = () => {
    for (const [f, text] of originals) {
      writeFileSync(file(f), text);
      if (readFileSync(file(f), 'utf8') !== text) throw new Error(`could not restore ${f}`);
    }
  };
  let applied = true;
  for (const e of m.edits) {
    const before = readFileSync(file(e.file), 'utf8');
    // This repo has both line endings.
    const crlf = s => s.replace(/\n/g, '\r\n');
    let after = before.replace(e.from, e.to);
    if (after === before) after = before.replace(crlf(e.from), crlf(e.to));
    if (after === before) {
      console.log(`  INVALID  ${m.name}\n           anchor gone from ${e.file}: ${JSON.stringify(e.from.slice(0, 60))}`);
      applied = false;
      break;
    }
    writeFileSync(file(e.file), after);
  }
  if (!applied) { restore(); invalid++; continue; }
  try {
    const built = run('npx vite build');
    if (!built.ok) {
      console.log(`  INVALID  ${m.name}\n           the build refused it, so the proof never ran`);
      invalid++;
      continue;
    }
    // Most mutations are answered by a browser proof; #4's rule lives one layer
    // down, so its "proof" is a vitest file and its failure lines are marked ×
    // rather than FAIL.
    const label = m.proofIsCmd ? m.proof : m.proof.split('/').pop();
    const failLine = m.failLine ?? /FAIL/;
    const proof = run(m.proofIsCmd ? m.proof : `node ${m.proof}`);
    if (proof.ok) {
      console.log(`  SURVIVED ${m.name}\n           ${label} stayed green with this broken; it is not testing it`);
      holes++;
    } else {
      const hit = proof.out.split('\n').some(l => failLine.test(l) && l.includes(m.expect));
      if (hit) console.log(`  killed   ${m.name}\n           by: ${m.expect}`);
      else {
        console.log(`  MISDIRECT ${m.name}\n           ${label} failed, but not on "${m.expect}" — it may be failing for the wrong reason`);
        /* Print what DID fail. A misdirect has two very different causes and
           the summary cannot tell them apart: either the proof caught the
           mutation at a different (possibly better) check and the anchor here
           is simply mis-guessed, or the proof fell over for an unrelated reason
           and is not testing this at all. Only the failure text says which. */
        for (const l of proof.out.split('\n').filter(l => failLine.test(l)).slice(0, 4)) {
          console.log(`             ↳ ${l.trim()}`);
        }
        holes++;
      }
    }
  } finally {
    restore();
  }
}

run('npx vite build');
console.log(`\n${SELECTED.length - holes - invalid}/${SELECTED.length} killed` +
  (invalid ? `, ${invalid} INVALID` : '') + (holes ? `, ${holes} HOLE(S)` : ''));
process.exit(holes || invalid ? 1 : 0);
