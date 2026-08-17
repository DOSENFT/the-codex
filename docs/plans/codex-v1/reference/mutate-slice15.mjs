// Slice 15 mutation run — can the release proof actually fail?
//
// A release gate has a specific way of being worthless: it passes. Every check
// in prove-slice15 was green the first time it was written except two, and a
// suite that is green on arrival is indistinguishable from a suite that is not
// looking. These eight mutations break, one at a time, each thing the proof
// claims to protect, and demand the proof name the right failure.
//
// Two of them are the interesting ones:
//
//   #3 removes the SRD credit but leaves the Creative Commons link. The
//   licence obligation is to name the work AND the licence; a check that only
//   looked for "Creative Commons" would still pass with the attribution gone.
//
//   #6 sets the manifest scope to the domain root — a one-word change that is
//   correct on localhost, correct in every screenshot, and silently kills the
//   install prompt on GitHub Pages, which is the entire delivery mechanism.
//
//   node docs/plans/codex-v1/reference/mutate-slice15.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // The central Escape handler, gone — the exact state the app shipped in
    // until this slice. Settings, the character sheet and quick lookup all
    // become dialogs you can only leave by finding the ×.
    name: 'the shared Sheet stops closing on Escape',
    edits: [{
      file: 'src/components/ui/Sheet.tsx',
      from: "const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }",
      to: "const onKey = (e: KeyboardEvent) => { if (e.key === 'Nothing') onClose() }",
    }],
    expect: 'Settings closes on Escape',
  },
  {
    // The off-screen drawers go back into the tab order. Nothing looks wrong,
    // nothing throws, and a keyboard user tabs into 68 invisible controls.
    name: 'closed drawers become tabbable again',
    edits: [{
      file: 'src/hooks/useInertWhenClosed.ts',
      from: "ref.current?.toggleAttribute('inert', !isOpen)",
      to: "ref.current?.toggleAttribute('inert', false)",
    }],
    expect: 'no closed dialog leaves controls in the tab order',
  },
  {
    // The attribution goes; the licence link stays. This is the mutation that
    // decides whether check 2 is about the licence or about a keyword.
    name: 'the SRD credit is dropped but the licence link kept',
    edits: [{
      file: 'src/components/Settings.tsx',
      from: 'System Reference Document 5.2.1',
      to: 'game rules content',
    }],
    expect: 'the SRD is credited by name',
  },
  {
    // The About box lies about the version again. Harmless-looking, and the
    // first thing anybody reads when handed the app.
    name: 'the About box claims a version that does not exist',
    edits: [{ file: 'src/components/Settings.tsx', from: 'The Codex V1.0', to: 'The Codex v2.0' }],
    expect: 'the version label is V1.0',
  },
  {
    // target="_blank" without rel=noopener hands the opened page a handle back
    // into the app. Invisible in every screenshot.
    name: 'an outbound link stops being opener-safe',
    edits: [{ file: 'src/components/Settings.tsx', from: 'rel="noreferrer noopener"', to: 'rel="noreferrer"' }],
    expect: 'every outbound link is opener-safe',
  },
  {
    // The install-killer. Right on localhost, wrong on Pages, silent both times.
    name: 'the manifest scope points at the domain root',
    edits: [{ file: 'public/manifest.webmanifest', from: '"scope": "/the-codex/"', to: '"scope": "/"' }],
    expect: 'scope matches the deploy path',
  },
  {
    // A declared icon that 404s. Chrome may still install, with a blank tile.
    name: 'the maskable icon is declared but not shipped',
    edits: [{
      file: 'public/manifest.webmanifest',
      from: '"src": "icons/icon-maskable-512.png"',
      to: '"src": "icons/icon-maskable-512-missing.png"',
    }],
    expect: 'every declared icon is actually served, as an image',
  },
  {
    // The one that ends a session: HP goes back to full when the iPad reloads.
    // The save is made a no-op rather than renamed — renaming it fails the
    // build, and a mutation the compiler catches proves nothing about the
    // proof. This one type-checks, builds, and looks perfect right up until
    // somebody refreshes the page.
    name: 'the character is no longer written to storage',
    edits: [{
      file: 'src/lib/character.ts',
      from: '  localStorage.setItem(CHAR_PREFIX + character.id, JSON.stringify(character))\n  updateRosterEntry(character)',
      to: '  updateRosterEntry(character)',
    }],
    expect: 'the damage is still there after the reload',
  },
];

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

// `node mutate-slice15.mjs 6` runs mutation 6 alone.
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
    const proof = run('node docs/plans/codex-v1/reference/prove-slice15.mjs');
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
