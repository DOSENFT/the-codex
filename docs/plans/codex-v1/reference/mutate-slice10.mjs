// Slice 10 mutation run — can the proof actually fail?
//
// `prove-slice10.mjs` is forty-six green lines, and forty-six green lines that
// cannot go red are decoration. Each mutation below restores, faithfully, the
// state this slice was opened to change — the Google <link> that was really in
// index.html this morning, the precache that really did carry 201KB of dead
// .woff, the worker that really did re-create the cache the off switch had just
// deleted. If a mutation does not turn the proof red, the proof is not testing
// what its name says.
//
// Every mutation is compared against the file before and after. A sed that
// silently matched nothing would otherwise "survive" and be reported as a hole
// in the proof, which is the one failure mode a mutation harness must not have.
//
//   node docs/plans/codex-v1/reference/mutate-slice10.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    name: 'the Google Fonts <link> comes back',
    file: 'index.html',
    from: '    <link rel="manifest"',
    to: '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" />\n    <link rel="manifest"',
    expect: 'zero requests to any other origin',
  },
  {
    name: 'the precache carries the legacy .woff again',
    file: 'vite.config.ts',
    from: "        .filter(f => !f.endsWith('.woff'))\n",
    to: '',
    expect: 'NOT the legacy woff',
  },
  {
    // WHOLESALE, across both files, because that is the only faithful form of
    // it. Deleting the `RELEASED` early-return on its own left the three put
    // guards standing and the proof stayed green — which was not the proof
    // failing to test the fix, it was the mutation failing to undo it. The fix
    // is one mechanism in two halves (the worker stops writing; the page waits
    // to be told), so the mutation removes both halves and puts the original
    // fire-and-forget postMessage back exactly as it was written this morning.
    name: 'the off switch goes back to fire-and-forget, and the worker keeps writing',
    edits: [
      { file: 'src/pwa/register.ts', from: '  await releaseController()',
        to: "  navigator.serviceWorker.controller?.postMessage('codex-sw-purge')" },
      { file: 'src/pwa/sw.js', from: '  if (RELEASED) return\n', to: '' },
      { file: 'src/pwa/sw.js', from: 'if (!RELEASED) (await caches.open(SHELL)).put(indexRequest(), fresh.clone())',
        to: '(await caches.open(SHELL)).put(indexRequest(), fresh.clone())' },
      { file: 'src/pwa/sw.js', from: 'if (fresh.ok && !RELEASED) (await caches.open(SHELL)).put(request, fresh.clone())',
        to: 'if (fresh.ok) (await caches.open(SHELL)).put(request, fresh.clone())' },
      { file: 'src/pwa/sw.js', from: 'if (fresh.ok && !RELEASED) {', to: 'if (fresh.ok) {' },
    ],
    expect: 'deletes every cache it made',
  },
  {
    // The shell fallback. `expect` names the FIRST assertion this breaks rather
    // than the deep-link one two lines below it: with the fallback gone, the
    // ordinary offline reload of `?d=1` is already a white screen, because a
    // URL with a query string was never cached under its own key either. The
    // deep link is the same code path taken further, so nothing tests it alone
    // — and nothing needs to.
    name: 'offline, a navigation is matched on its own URL instead of the shell',
    edits: [{ file: 'src/pwa/sw.js',
      from: 'const cached = (await caches.match(indexRequest())) || (await caches.match(request))',
      to: 'const cached = await caches.match(request)' }],
    expect: 'no network at all',
  },
].map(m => m.edits ? m : { ...m, edits: [{ file: m.file, from: m.from, to: m.to }] });

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

let holes = 0, invalid = 0;
for (const m of MUTATIONS) {
  // Snapshot every file this mutation touches, apply every edit, and refuse to
  // continue unless each one actually changed something.
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
    const after = before.replace(e.from, e.to);
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
      // A mutation that fails to COMPILE proves nothing either: the proof was
      // never run against it. Say so rather than counting a kill.
      console.log(`  INVALID  ${m.name}\n           the build refused it, so the proof never ran`);
      invalid++;
      continue;
    }
    const proof = run('node docs/plans/codex-v1/reference/prove-slice10.mjs');
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
