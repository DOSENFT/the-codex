// Slice 12 mutation run — can the proof actually fail?
//
// Thirty-eight green lines that cannot go red are decoration. Slice 12 is
// mostly a claim about ABSENCE — no switch, no log, no accidental dismissal —
// and absence is the hardest thing to prove you are testing, because a proof
// that checks nothing also finds nothing missing. So every mutation here ADDS
// the forbidden thing back: a settings switch, a counter, a backdrop dismiss,
// a fade that shows the fight through it.
//
// Two of them are the plausible refactors rather than sabotage. Mounting the
// veil inside App is what a tidy-minded reader would do on sight, and it is the
// change that quietly breaks the promise on three screens.
//
// Every edit is compared before and after, so a sed that silently matched
// nothing reports INVALID rather than posing as a hole in the proof. A mutation
// the build refuses is INVALID too: the proof never ran against it.
//
//   node docs/plans/codex-v1/reference/mutate-slice12.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // THE TIDY-UP. "Why is this component outside App? Everything else is
    // inside." Because App returns early three times. Mount it in Layout and
    // the veil is missing on setup, on the loading frame, and behind ?d=1 —
    // and nothing about the app looks broken, which is the danger.
    name: 'the veil is mounted inside App, like everything else',
    edits: [
      { file: 'src/main.tsx', from: '    <Veil />\n', to: '' },
      { file: 'src/App.tsx',
        from: "import type { Character } from './lib/character'",
        to: "import type { Character } from './lib/character'\nimport { Veil } from './components/safety/Veil'" },
      { file: 'src/App.tsx', from: '      </motion.div>\n    </Layout>', to: '      </motion.div>\n      <Veil />\n    </Layout>' },
    ],
    expect: 'the ?d=1 turn screen, where Layout never renders',
  },
  {
    // The switch this slice exists to forbid. Whatever a future settings toggle
    // is called, this is the shape it takes.
    name: 'a settings switch can turn the veil off',
    edits: [{ file: 'src/components/safety/Veil.tsx',
      from: '  return (\n    <button\n      ref={buttonRef}',
      to: "  if (localStorage.getItem('codex-veil-off') !== null) return null\n  return (\n    <button\n      ref={buttonRef}" }],
    expect: 'every plausible "off" seeded, and it is still there',
  },
  {
    // Standard modal behaviour, and wrong here: a fumbled tap in the middle of
    // the worst moment at the table puts the scene straight back.
    name: 'a tap on the backdrop dismisses it, the way every other modal does',
    edits: [{ file: 'src/components/safety/Veil.tsx',
      from: '<div ref={sceneRef} className="veil-scene"',
      to: '<div ref={sceneRef} onClick={lower} className="veil-scene"' }],
    expect: 'a tap on the backdrop does not lift it',
  },
  {
    // The defect the proof found on its first run: focus falls to <body> and
    // Tab walks into the fight behind the veil.
    name: 'focus can fall out of the veiled scene again',
    edits: [{ file: 'src/components/safety/Veil.tsx',
      from: "    document.addEventListener('focusout', catchFall)\n", to: '' }],
    expect: 'focus came back after the backdrop tap',
  },
  {
    // The house transition, restored. It looked right and it costs the only
    // 220ms that matter. `isVisible()` is true at opacity 0, so only the
    // explicit opacity check stands between this and green.
    name: 'the veil fades in over 220ms, showing the fight through it',
    edits: [{ file: 'src/components/safety/safety-d.css',
      from: '  text-align: center;\n',
      to: '  text-align: center;\n  animation: veil-fall var(--d-dur-state) var(--d-ease);\n}\n@keyframes veil-fall { from { opacity: 0; } to { opacity: 1; } }\n.veil-unused {\n' }],
    expect: 'opaque the instant it is raised, with nothing animating in',
  },
  {
    // "Just a counter, for the DM." No. Nobody has to explain afterwards, and
    // there is no artefact for anyone to read later.
    name: 'raising the veil is counted',
    edits: [{ file: 'src/components/safety/Veil.tsx',
      from: '  const raise = useCallback(() => setVeiled(true), [])',
      to: "  const raise = useCallback(() => {\n    localStorage.setItem('codex-veil-count', String((Number(localStorage.getItem('codex-veil-count')) || 0) + 1))\n    setVeiled(true)\n  }, [])" }],
    expect: 'a full raise-and-lower cycle changed nothing in storage',
  },
  {
    // A save that is not a save. The list shows the line; the device never took
    // it; the next session opens to an agreement nobody made.
    name: 'the covenant is never actually written to storage',
    edits: [{ file: 'src/lib/covenant.ts',
      from: '    store.setItem(COVENANT_KEY, JSON.stringify(saved))',
      to: '    void JSON.stringify(saved)' }],
    expect: 'both boundaries reached storage',
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
    // This repo has both line endings, and a multi-line anchor written one way
    // matches nothing in the other. Try it as written, then in CRLF, and carry
    // the file's own endings into the replacement — otherwise the harness ends
    // up reporting on its own newlines rather than on the code.
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
    const proof = run('node docs/plans/codex-v1/reference/prove-slice12.mjs');
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
