// Slice 14 mutation run — can the proof actually fail?
//
// Slice 14 has an unusually high faking risk in BOTH halves, which is why this
// file has nine mutations rather than five.
//
//   The motion half is two central rules, and the cheap way to make a
//   reduced-motion audit read zero is to still the whole app for everyone.
//   Mutations 3 and 4 are that over-correction: a dead spinner and a dead app.
//   A proof that only measured "is anything moving under reduce" would call
//   both of those a success.
//
//   The paper half is a document nobody looks at on screen, so it can rot
//   silently — a section quietly dropped, a level filter removed, the shell
//   printing on top of it. Mutations 6 to 9 are the ways it goes wrong without
//   anyone noticing until the page comes out of the printer.
//
//   node docs/plans/codex-v1/reference/mutate-slice14.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // The CSS half of the fix, gone. Transitions and @keyframes stop hearing
    // the switch; the ~816 declaring elements come back.
    name: 'the blanket reduced-motion rule is deleted',
    edits: [{
      file: 'src/index.css',
      from: '  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;',
      to: '  .nothing-matches-this,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;',
    }],
    expect: 'no surface declares motion under reduce',
  },
  {
    // The JS half, gone. A CSS media query cannot reach the Web Animations
    // API, so every `motion.div` in 17 files animates regardless — and the
    // CSS-only probe would not notice, because Motion's animations are not
    // declared in computed style at all. Only getAnimations() sees this.
    name: 'MotionConfig stops honouring the OS preference',
    edits: [{ file: 'src/main.tsx', from: '<MotionConfig reducedMotion="user">', to: '<MotionConfig reducedMotion="never">' }],
    expect: 'no non-spinner animation runs under reduce',
  },
  {
    // OVER-CORRECTION #1. The cheapest possible way to score zero on the
    // reduced-motion audit is to remove the one exception. It also freezes
    // every loading spinner into a static glyph, which reads as a hung app —
    // a worse accessibility outcome than the thing it was fixing.
    name: 'the spinner carve-out is removed with the blanket rule',
    edits: [{
      file: 'src/index.css',
      from: '  .animate-spin {\n    animation-duration: 1.5s !important;',
      to: '  .animate-spin-disabled {\n    animation-duration: 1.5s !important;',
    }],
    expect: '.animate-spin keeps a real duration under reduce',
  },
  {
    // OVER-CORRECTION #2, and the big one. Drop the media query and the app
    // stills for EVERYBODY. Every reduced-motion check in the proof goes green
    // and stays green. This is the mutation that decides whether the proof is
    // about accessibility or just about a number being zero.
    name: 'motion is stilled for everyone, not just those who asked',
    edits: [{ file: 'src/index.css', from: '@media (prefers-reduced-motion: reduce) {\n  *,', to: '@media all {\n  *,' }],
    expect: 'motion is still declared with no preference',
  },
  {
    // The budget's tap tier, violated. 1000ms on the mode toggle and the tab
    // bar: still under nothing, over both ceilings, and invisible in a
    // screenshot. Only a measured duration catches a sluggish control.
    name: 'the tab bar takes a full second to respond',
    edits: [{ file: 'src/components/Layout.tsx', from: "'transition-all duration-200 ease-forge',", to: "'transition-all duration-1000 ease-forge'," }],
    expect: 'no control is slower than the 220ms tap ceiling',
  },
  {
    // The print stylesheet stops hiding the app. Ctrl+P then prints the dark
    // shell on page one and the record after it — which is what the slice
    // exists to stop, and looks fine in every on-screen test.
    name: 'the app shell prints on top of the record',
    edits: [{ file: 'src/design/print.css', from: '  #root > *:not(.print-record) {\n    display: none !important;\n  }', to: '  #root > *:not(.print-record) {\n    display: block;\n  }' }],
    expect: 'the app shell is hidden in print',
  },
  {
    // The record leaks onto the screen. This is the regression that would make
    // the whole slice a net loss — a second, static copy of the character
    // sheet stapled to the bottom of every surface.
    name: 'the print record becomes visible on screen',
    edits: [{ file: 'src/design/print.css', from: '.print-record {\n  display: none;\n}', to: '.print-record {\n  display: block;\n}' }],
    expect: 'record is present but display:none on screen',
  },
  {
    // A section quietly loses rows. This is exactly the failure mode of the
    // tabbed sheet the record replaces — you find out the skill you needed is
    // missing at the table, on paper, with no way to fix it.
    name: 'the record prints only the first five skills',
    edits: [{ file: 'src/components/print/CharacterRecord.tsx', from: '{ALL_SKILLS.map((s) => (', to: '{ALL_SKILLS.slice(0, 5).map((s) => (' }],
    expect: 'all eighteen skills',
  },
  {
    // The level gate removed. Nix prints Hearth Warden — a level 20 feature he
    // will not have for twelve levels — as though he could use it tonight.
    // Every count in the proof still passes except the one that reads names.
    name: 'the record offers features above the character\'s level',
    edits: [{ file: 'src/components/print/CharacterRecord.tsx', from: 'c.features.filter((f) => f.level <= c.level)', to: 'c.features.filter((f) => f.level <= 20)' }],
    expect: 'no above-level feature on paper',
  },
];

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

// `node mutate-slice14.mjs 4` runs mutation 4 alone. Nine mutations is nine
// builds and nine full proof runs; re-verifying one of them should not cost
// twenty minutes.
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
    const proof = run('node docs/plans/codex-v1/reference/prove-slice14.mjs');
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
console.log(`\n${SELECTED.length - holes - invalid}/${SELECTED.length} killed` +
  (invalid ? `, ${invalid} INVALID` : '') + (holes ? `, ${holes} HOLE(S)` : ''));
process.exit(holes || invalid ? 1 : 0);
