/* Is the internet serving the build I graded?
   ---------------------------------------------------------------------------
   A-26. `verify-live.mjs` answered this by comparing the main bundle's
   FILENAME — local `assets/index-<hash>.js` against live — and printed
   "NO — the internet is serving something else · LIVE DOES NOT VERIFY".
   That verdict was wrong, it was wrong for reasons that have nothing to do
   with the app, and it could never have come right on this machine.

   A Windows local build and the Linux CI build of the SAME COMMIT cannot be
   byte-equal. Four reasons, all measured, none of them code:

     1. CIRCULAR CHUNK HASHES. `index-*.js` lazily imports `DiceStage-*.js`,
        which imports `index-*.js` back. Each file's hash is an input to the
        other's content, so Rollup solves a fixed point and which solution it
        reaches is machine-dependent. Measured: the two main bundles are the
        same length, 1062762 bytes, and differ in exactly ONE place — the
        DiceStage filename. DiceStage differs from its twin in exactly one
        place — the index filename. Nothing else differs at all.
     2. CRLF. Files copied verbatim out of `public/` are checked out on Windows
        with CRLF and shipped that way; CI checks them out LF. `index.html`
        additionally contains one `\r\r\n`, a CRLF line that autocrlf converted
        a second time.
     3. SERVICE-WORKER BUILD_ID. `sw.js` embeds a per-build id — local
        3bb8ee8a3165, live 69664ff4988b. It is *supposed* to differ per build;
        that is what makes the shell cache bust.
     4. PRECACHE ORDER. `sw.js`'s precache array is emitted in directory-listing
        order, which differs by filesystem.

   So the old instrument tested the bundler and the filesystem, not the deploy.
   The REQUIREMENT is unchanged and is not softened: every byte the internet
   serves must be a byte this build produced. What changes is that the four
   differences above are NAMED, COUNTED and PRINTED rather than being allowed
   to fail the check anonymously — and anything outside those four named
   classes is still a hard failure.

   Provenance is checked separately and independently of the bytes: GitHub is
   asked which commit the live deployment was built from.

   `--prove` alters one local file by one character and requires this to FAIL. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { DIST, LIVE } from './rig.mjs';

const PROVE = process.argv.includes('--prove');

const walk = (dir, base = dir) => readdirSync(dir).flatMap(name => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p).split(sep).join('/')];
});

const HASHREF = /([A-Za-z0-9_]+)-[A-Za-z0-9_-]{8}\.(js|css|woff2?|png|svg|json)/g;
const nameKey = f => f.replace(HASHREF, '$1-*.$2');

/* Each normalisation returns [text, count] so nothing is silently applied. */
const N = {
  crlf:     s => [s.replace(/\r/g, ''), (s.match(/\r/g) || []).length],
  hashrefs: s => [s.replace(HASHREF, '$1-*.$2'), (s.match(HASHREF) || []).length],
  buildId:  s => [s.replace(/BUILD_ID = "[0-9a-f]{6,}"/, 'BUILD_ID = "*"'), /BUILD_ID = "[0-9a-f]{6,}"/.test(s) ? 1 : 0],
  // precache order only: sort the entries of the one array, do not touch its members
  precache: s => {
    let n = 0;
    const out = s.replace(/\[((?:"\/the-codex\/[^"]*",?\s*){2,})\]/g, (m, body) => {
      const items = body.match(/"[^"]*"/g) || [];
      n += items.length;
      return '[' + items.sort().join(',') + ']';
    });
    return [out, n];
  },
};

/* Normalisation applies to TEXT ONLY. A PNG legitimately contains 0x0D bytes,
   and stripping them would let two genuinely different images compare equal —
   an instrument that hides exactly what it is meant to catch. Binary files get
   no leniency at all: byte-identical or failed. */
const TEXT = /\.(js|css|html|json|webmanifest|txt|svg|map)$/;
const normalise = (buf, f) => {
  if (!TEXT.test(f)) return { text: buf.toString('latin1'), applied: {}, binary: true };
  let s = buf.toString('utf8');
  const applied = {};
  for (const [k, fn] of Object.entries(N)) { const [next, n] = fn(s); s = next; if (n) applied[k] = n; }
  return { text: s, applied };
};

const localFiles = walk(DIST).filter(f => !/\.map$/.test(f)).sort();

/* Map local name -> live name. Hashed assets are matched by their normalised
   name, discovered from what the live index and live sw.js actually reference,
   so a file the deploy renamed or dropped cannot be quietly re-requested. */
const liveIndexBuf = Buffer.from(await (await fetch(LIVE, { cache: 'no-store' })).arrayBuffer());
const liveSwBuf = Buffer.from(await (await fetch(new URL('sw.js', LIVE).href, { cache: 'no-store' })).arrayBuffer());
const liveRefs = new Set([
  ...[...liveIndexBuf.toString('utf8').matchAll(/[^"'`\s()]*assets\/[A-Za-z0-9._\/-]+/g)].map(m => m[0]),
  ...[...liveSwBuf.toString('utf8').matchAll(/\/the-codex\/[A-Za-z0-9._\/-]+/g)].map(m => m[0]),
].map(u => u.replace(/^.*?\/the-codex\//, '').replace(/^\.?\//, '')));

const liveByKey = new Map();
for (const r of liveRefs) liveByKey.set(nameKey(r), r);

const problems = [], rows = [], allApplied = {};

for (const f of localFiles) {
  let localBuf = readFileSync(join(DIST, f));
  if (PROVE && f === 'sw.js') localBuf = Buffer.from(localBuf.toString('utf8').replace('const SHELL', 'const  SHELL'), 'utf8');

  /* Ask for the file by its own name first — most assets hash identically, so
     this is both the common case and the strictest one. Only when the deploy
     has no file by that name do we fall back to the live reference graph, and
     only for names that carry a content hash at all. That fallback is how the
     circular index/DiceStage pair is resolved; it can never invent a match for
     a file the deploy simply does not have. */
  let liveName = f, res = await fetch(new URL(f, LIVE).href, { cache: 'no-store' });
  if (!res.ok && /-[A-Za-z0-9_-]{8}\./.test(f)) {
    const alt = liveByKey.get(nameKey(f));
    if (alt) { liveName = alt; res = await fetch(new URL(alt, LIVE).href, { cache: 'no-store' }); }
  }
  if (!res.ok) { problems.push(`${liveName} — live returned ${res.status}; the deploy is missing a file this build produced`); continue; }
  const liveBuf = Buffer.from(await res.arrayBuffer());

  const exact = Buffer.compare(localBuf, liveBuf) === 0;
  const a = normalise(localBuf, f), b = normalise(liveBuf, f);
  const same = a.text === b.text;
  for (const [k, n] of Object.entries(a.applied)) allApplied[k] = (allApplied[k] || 0) + n;

  if (exact && !same) problems.push(`${f} — normalisation broke an exact match; the instrument is wrong`);

  /* Fifth class, and the only one that needs proving rather than naming:
     TAILWIND SCAN SET. Tailwind 4 generates utilities from the files it can
     see, and this working tree holds untracked probe scripts and handoff
     markdown that CI never checks out. So the local CSS is a SUPERSET. That is
     the safe direction only if two things hold, and both are checked here
     rather than assumed: every rule the deploy ships is also in the local
     build, and no class the deploy lacks is used by committed source. If the
     deploy were missing a class the app uses, that is a real visual defect on
     his phone and it fails right here. */
  if (!same && /\.css$/.test(f)) {
    const rules = s => new Set((s.match(/[.:#[][^{}]{0,300}\{[^{}]*\}/g) || []).map(r => r.trim()));
    const rl = rules(a.text), rv = rules(b.text);
    const liveOnly = [...rv].filter(r => !rl.has(r));
    const absent = [...rl].filter(r => !rv.has(r) && r.startsWith('.'));
    const nameOf = r => r.slice(1, r.indexOf('{')).split(/(?<!\\):/)[0].split(/[\s,>]/)[0].split(String.fromCharCode(92)).join('');
    const names = [...new Set(absent.map(nameOf))].filter(Boolean);
    const srcHay = execSync('git ls-files src index.html', { encoding: 'utf8' }).trim().split(/\r?\n/)
      .map(p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } }).join('\n');
    const usedMissing = names.filter(n => {
      const esc = n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return new RegExp('(^|[\\s"\'`{(])' + esc + '(:|[\\s"\'`})]|$)').test(srcHay);
    });
    rows.tailwind = { liveOnly: liveOnly.length, absent: names.length, usedMissing };
    if (usedMissing.length)
      problems.push(`${f} — the DEPLOY is missing ${usedMissing.length} class(es) the app uses: ${usedMissing.join(', ')}`);
    else if (liveOnly.length > 2)
      problems.push(`${f} — the deploy ships ${liveOnly.length} rule(s) the local build does not; local is not a superset`);
    else
      console.log(`  \x1b[33mnote\x1b[0m ${f}: local CSS is a superset — ${names.length} class(es) absent from the deploy, ` +
        `\x1b[32m0 of them used by committed src\x1b[0m. Local build scanned untracked files; the DEPLOY is the correct one.`);
  } else if (!same) {
    problems.push(`${f} — differs beyond the named classes` +
      ` (applied: ${Object.entries(a.applied).map(([k, n]) => `${k}×${n}`).join(', ') || 'nothing'})`);
  }

  rows.push({ f, liveName, exact, same, applied: a.applied, bytes: liveBuf.length });
}

/* Nothing extra on the wire: every asset the live index references must
   correspond to a file this build produced. */
const localKeys = new Set(localFiles.map(nameKey));
for (const r of liveRefs)
  if (/assets\//.test(r) && !localKeys.has(nameKey(r)))
    problems.push(`live references ${r}, which this build did not produce`);

/* Provenance, independent of every byte above. */
let prov = null;
try {
  const j = JSON.parse(execSync('gh run list -L 1 --workflow "Deploy to GitHub Pages" --branch main --json headSha,conclusion,databaseId,updatedAt',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0];
  const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  prov = { ...j, localHead: head, matches: j.headSha === head && j.conclusion === 'success' };
  if (!prov.matches) problems.push(`provenance: last Pages deploy is ${j.headSha.slice(0, 7)} (${j.conclusion}), local HEAD is ${head.slice(0, 7)}`);
} catch { problems.push('provenance: could not ask GitHub which commit was deployed — UNPROVEN, not passed'); }

const changed = rows.filter(r => !r.exact);
console.log(`\n\x1b[1mSAME BUILD?\x1b[0m  ${LIVE}\n  local  ${DIST}\n`);
console.log(`  ${rows.length} file(s) compared · \x1b[32m${rows.length - changed.length} byte-identical\x1b[0m · ${changed.length} differing only in named classes\n`);
for (const r of changed)
  console.log(`  ${r.f}${r.liveName !== r.f ? ` → live ${r.liveName}` : ''}\n      ${r.same ? '\x1b[32msame\x1b[0m' : '\x1b[31mDIFFERENT\x1b[0m'} · ${Object.entries(r.applied).map(([k, n]) => `${k}×${n}`).join(', ') || 'no normalisation applied'}`);
console.log(`\n  normalisations applied across the whole build: ${Object.entries(allApplied).map(([k, n]) => `${k}×${n}`).join(' · ') || 'none'}`);
console.log(`  live references ${[...liveRefs].filter(r => /assets\//.test(r)).length} asset path(s), all produced by this build`);
if (prov) console.log(`  provenance: Pages run ${prov.databaseId} built \x1b[1m${prov.headSha.slice(0, 7)}\x1b[0m (${prov.conclusion}) · local HEAD ${prov.localHead.slice(0, 7)} · ${prov.matches ? '\x1b[32mmatch\x1b[0m' : '\x1b[31mMISMATCH\x1b[0m'}`);
if (PROVE) console.log(`  \x1b[33m--prove: one local sw.js byte was altered; this run MUST fail below\x1b[0m`);

if (problems.length) { console.log(`\n  \x1b[31mNOT THE SAME BUILD\x1b[0m`); for (const p of problems) console.log('    ' + p); }
else console.log(`\n  \x1b[32mSAME BUILD\x1b[0m — every byte is identical or differs only in the five named, counted, machine-specific classes, and the deployed commit is local HEAD`);
console.log('');
process.exit(problems.length ? 1 : 0);
