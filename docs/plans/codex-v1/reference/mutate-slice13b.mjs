// Slice 13b mutation run — can the proof actually fail?
//
// 13b is a slice about REJECTING findings: 1484 of 1742 touch "failures" and
// 600 of 778 Cinzel "failures" were rejected as instrument error. A slice that
// mostly decides not to change things is the easiest kind to fake, so the
// proof has to be able to catch both directions of wrong:
//
//   · the fix not applied      (mutations 1, 4, 5)
//   · the fix OVERAPPLIED      (mutations 2, 3)
//
// Mutation 3 is the one worth reading. The lazy way to make every <h3> stop
// being Cinzel is to delete the base rule outright — which also strips the
// display face from every title in the product. That is a look regression that
// passes any check written only as "no h3 is Cinzel". It has to go red.
//
//   node docs/plans/codex-v1/reference/mutate-slice13b.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // The most-pressed control in the app goes back under the floor.
    // Took two rewrites, and both failures were the mutation's fault.
    //
    // v1 removed the BUTTON's min-h-[44px] and survived: the container is
    // h-[46px] with the buttons as stretched flex children, so they measure
    // 44px with or without the declaration.
    // v2 shrank the CONTAINER back to h-8 and also survived, because the
    // button's own min-h-[44px] then held it at 44 on its own.
    //
    // The fix has two independently sufficient halves, so only removing both
    // is a real regression. (Worth knowing for the future: under v2 the button
    // overflowed an h-8 overflow-hidden container, so a player would have SEEN
    // a 32px control while boundingBox still reported 44 — Playwright's box
    // does not account for clipping by an ancestor. Not a problem in the real
    // code, where the container is 46px, but it is the kind of thing that
    // makes a geometry proof lie.)
    name: 'the mode toggle goes back under the touch floor',
    edits: [
      { file: 'src/components/Layout.tsx',
        from: 'border border-white/10 h-[46px]', to: 'border border-white/10 h-8' },
      // Twice, deliberately: String.replace takes only the first match and
      // there are two of these buttons (Play and Prep). The proof measures
      // Prep, which is the second — so a single edit would leave the very
      // control under test untouched and the mutation would "survive" again
      // for a third reason that has nothing to do with the proof.
      { file: 'src/components/Layout.tsx',
        from: "'px-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider'",
        to: "'px-2.5 text-xs font-bold uppercase tracking-wider'" },
      { file: 'src/components/Layout.tsx',
        from: "'px-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider'",
        to: "'px-2.5 text-xs font-bold uppercase tracking-wider'" },
    ],
    expect: '"Switch to prep mode" is at least 44px tall',
  },
  {
    // The whole Cinzel reckoning, reverted: headings go back to being chosen
    // by HTML semantics. 600 findings come back.
    name: 'every heading is a display serif again',
    edits: [{ file: 'src/index.css', from: '  h1, h2 {\n    font-family: var(--font-display);', to: '  h1, h2, h3, h4, h5, h6 {\n    font-family: var(--font-display);' }],
    expect: 'no <h3> inherits Cinzel without asking for it',
  },
  {
    // The OVER-correction. Cheapest way to clear the audit, and it silently
    // de-serifs every title in the product. If the proof only checked that h3
    // stopped being Cinzel, this would be invisible.
    name: 'Cinzel is stripped from titles too, not just list headings',
    edits: [{ file: 'src/index.css', from: '  h1, h2 {\n    font-family: var(--font-display);\n    font-weight: 600;\n  }', to: '  h1, h2 {\n    font-weight: 600;\n  }' }],
    expect: 'a bare <h2> still defaults to Cinzel',
  },
  {
    // The skill dot's hit area grows past its own row and starts reaching into
    // the neighbouring skill. The dot still paints identically, so only a
    // measured pitch comparison — or a press near the edge — notices.
    name: 'the skill dot hit area spills into the row above',
    edits: [{ file: 'src/index.css', from: '.row-tap::after {\n  content: \'\';\n  position: absolute;\n  top: 50%;\n  left: 0;\n  right: 0;\n  height: 44px;', to: '.row-tap::after {\n  content: \'\';\n  position: absolute;\n  top: 50%;\n  left: 0;\n  right: 0;\n  height: 96px;' }],
    // 96px was chosen deliberately: row pitch is 56px, so this overlaps both
    // neighbours while still being small enough that the FIRST version of the
    // check (`h / 2 < pitch`, i.e. 48 < 56) waved it through. It survived, and
    // that survival is what exposed the check as asking the wrong question.
    expect: 'the hit area does not overlap the next skill\'s',
  },
  {
    // The reach fix removed entirely. The dot is 24px again.
    name: 'the skill dots lose their enlarged hit area',
    edits: [{ file: 'src/components/CharacterPage.tsx',
      from: "'row-tap w-6 h-6 rounded-full mr-2", to: "'w-6 h-6 rounded-full mr-2" }],
    expect: 'its hit area reaches the 44px floor',
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
    const proof = run('node docs/plans/codex-v1/reference/prove-slice13b.mjs');
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
