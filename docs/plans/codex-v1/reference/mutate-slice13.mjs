// Slice 13 mutation run — can the proof actually fail?
//
// This slice is three global claims: nothing renders below 12px, the label
// colour clears AA, and the resource pips are catchable without stealing each
// other's presses. Global claims are the easiest kind to prove by accident —
// a check that queries the wrong thing passes on every surface at once and
// looks like thoroughness. So each mutation puts back exactly one of the
// things the slice removed, and the proof has to name it.
//
// Mutation 5 is the one worth reading: it does not break the pips, it breaks
// the ASSUMPTION that makes expanding them safe. If the filled pips ever stop
// sharing a handler, the enlarged hit areas start stealing presses from each
// other, and a geometry check alone would still be green.
//
//   node docs/plans/codex-v1/reference/mutate-slice13.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // The regression this slice exists to prevent, at one site. If the proof
    // only samples "most" surfaces, a single 10px label survives it.
    //
    // This first pointed at combat/StatsBar.tsx and SURVIVED — because
    // StatsBar.tsx is never imported by anything. It is dead code, so no edit
    // to it can fail any proof. That was an INVALID mutation reported as a
    // hole, which is the harness lying in the safe-looking direction. Anchored
    // now to the spell-slot level label, which is on screen in session
    // Grimoire, a surface the proof visits.
    name: 'one label goes back under the type floor',
    edits: [{ file: 'src/components/GrimoirePage.tsx',
      from: '"text-xs text-forge-2 font-medium"', to: '"text-[10px] text-forge-2 font-medium"' }],
    expect: 'nothing renders below 12px',
  },
  {
    // The whole contrast fix, reverted. 111 distinct failures come back.
    name: 'the label colour goes back to the unreadable #7a7265',
    edits: [{ file: 'src/index.css', from: '--color-forge-2: #8b8578;', to: '--color-forge-2: #7a7265;' }],
    expect: 'the label token is D\'s --d-dim',
  },
  {
    // Half a fix: the right token, the wrong value. Catches a proof that only
    // string-matches the token and never measures the ratio it produces.
    name: 'the label colour is changed but still fails AA',
    edits: [{ file: 'src/index.css', from: '--color-forge-2: #8b8578;', to: '--color-forge-2: #807a6e;' }],
    expect: 'label text clears WCAG AA on the card surface',
  },
  {
    // The touch floor, removed. The pips paint the same, so only a measured
    // target height notices.
    name: 'the pips lose their expanded hit area',
    edits: [{ file: 'src/index.css', from: '  height: var(--d-touch-min, 48px);\n  transform: translateY(-50%);', to: '  height: 12px;\n  transform: translateY(-50%);' }],
    expect: 'the pip target reaches the 48px floor',
  },
  {
    // NOT a broken pip — a broken premise. Expanding adjacent hit areas is only
    // safe because every filled pip calls the same handler. Give each pip its
    // own index-specific behaviour and the enlarged targets start spending the
    // wrong slot. Geometry stays perfect; capability does not.
    // First written as a loop in the pip's onClick — `for (k = 0; k <= i; k++)
    // handleExpendSlot(level)` — and it SURVIVED, because it is a no-op.
    // `expendSpellSlot(character, level)` is pure and the handler closes over
    // one `character`, so calling it four times in a tick computes the same
    // next state four times and spends exactly one slot. The proof was right
    // and the mutation was empty. Composing the call is the wholesale version:
    // it genuinely spends two.
    name: 'a pip press spends two slots instead of one',
    edits: [{ file: 'src/components/GrimoirePage.tsx',
      from: 'onCharacterUpdate(expendSpellSlot(character, level))',
      to: 'onCharacterUpdate(expendSpellSlot(expendSpellSlot(character, level), level))' }],
    expect: 'it spends one, not several',
  },
  {
    // The hit area becomes visible paint — a grey slab over the card. The kind
    // of thing that ships because the person who added it only ever looked at
    // the DOM.
    name: 'the invisible hit area starts painting',
    edits: [{ file: 'src/index.css', from: '.pip-tap::after {\n  content: \'\';', to: '.pip-tap::after {\n  content: \'\';\n  background: rgba(255,255,255,0.08);' }],
    expect: 'the expanded target paints nothing',
  },
  {
    // Bigger type with no room for it. This is the failure mode the type floor
    // could plausibly have caused, so the proof has to be able to see it.
    name: 'a raised label is forced into a box too small for it',
    edits: [{ file: 'src/components/GrimoirePage.tsx',
      from: '"text-xs text-forge-2 font-medium"',
      to: '"text-xs text-forge-2 font-medium w-4 overflow-hidden whitespace-nowrap"' }],
    expect: 'no clipped text, no sideways scroll',
  },
];

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

let holes = 0, invalid = 0;
for (const m of MUTATIONS) {
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
    // This repo has both line endings; a multi-line anchor written one way
    // matches nothing in the other.
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
    const proof = run('node docs/plans/codex-v1/reference/prove-slice13.mjs');
    if (proof.ok) {
      console.log(`  SURVIVED ${m.name}\n           the proof stayed green with this broken; it is not testing it`);
      holes++;
    } else {
      const hit = proof.out.split('\n').some(l => l.startsWith('  FAIL') && l.includes(m.expect));
      if (hit) console.log(`  killed   ${m.name}\n           by: ${m.expect}`);
      else {
        console.log(`  MISDIRECT ${m.name}\n           the proof failed, but not on "${m.expect}" — it may be failing for the wrong reason`);
        holes++;
      }
    }
  } finally {
    restore();
  }
}

run('npx vite build');
console.log(`\n${MUTATIONS.length - holes - invalid}/${MUTATIONS.length} killed` +
  (invalid ? `, ${invalid} INVALID` : '') + (holes ? `, ${holes} HOLE(S)` : ''));
process.exit(holes || invalid ? 1 : 0);
