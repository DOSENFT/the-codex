/* G-5 — the honest before/after for the Tailwind whitelist.
   -----------------------------------------------------------------------------
   The first attempt at this comparison used a snapshot taken with the class
   extractor `/\.((?:\\[^\s{,>:]|[A-Za-z0-9_-])+)/g`, and that regex has no left
   boundary. Every decimal fraction in the stylesheet was therefore read as a
   class name: `0.32` yielded `32`, `1.5rem` yielded `5rem`, `3.40282e38px`
   yielded `40282e38px`. 170-odd of the "classes" in that snapshot begin with a
   digit and none of them are classes. So "84 removed" was never 84 classes, and
   the four regressions that survey reported were arithmetic, not CSS.

   That matters beyond tidiness: index.css's own A-36 comment currently claims
   "FOUR shipped classes ... and one numeric fragment" leaked from untracked
   files. The fragment was an artefact of this same regex. A false sentence in
   the record is the thing this project keeps failing on, so the comparison is
   redone here with a left boundary, from a real build of both states.

   ONE variable. The pre-whitelist state is produced by writing the OLD @import
   directive into the CURRENT working tree — same source, same untracked files,
   same everything except the three lines under test — and building it to a
   scratch outDir so dist/ is never touched. index.css is restored in a finally,
   and a .bak is written first so a crash mid-build is recoverable by hand.   */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
const CSS_SRC = join(ROOT, 'src/index.css');
const BAK = CSS_SRC + '.ab-bak';
const OUT = join(ROOT, 'dist-ab');

/* Left boundary: a class selector is never preceded by a digit, a letter, `_`,
   `)` or `]`. Without this the extractor reads arithmetic as identifiers. */
const RE = /(?<![0-9A-Za-z_)\]])\.((?:\\[^\s{,>:]|[A-Za-z0-9_-])+)/g;
const classesOf = css => {
  const s = new Set();
  for (const m of css.matchAll(RE)) s.add(m[1].split('\\').join(''));
  return s;
};
const cssIn = dir => {
  const a = join(dir, 'assets');
  const f = readdirSync(a).find(x => /\.css$/.test(x));
  return { file: f, text: readFileSync(join(a, f), 'utf8') };
};

const NEW = '@import "tailwindcss" source(none);\r\n@source "./";\r\n@source "../index.html";';
const OLD = '@import "tailwindcss";\r\n@source not "../docs";';

const original = readFileSync(CSS_SRC, 'utf8');
let needle = NEW, sep = '\r\n';
if (!original.includes(needle)) { needle = NEW.split('\r\n').join('\n'); sep = '\n'; }
if (original.split(needle).length !== 2) {
  console.log('!! the whitelist directive is not present exactly once in index.css — refusing to edit.');
  process.exit(1);
}

writeFileSync(BAK, original);
let after, before;
try {
  after = cssIn(join(ROOT, 'dist'));                       // already built, whitelisted
  writeFileSync(CSS_SRC, original.replace(needle, OLD.split('\r\n').join(sep)));
  console.log('building the PRE-whitelist state to dist-ab/ …');
  execSync(`npx vite build --outDir dist-ab --emptyOutDir`, { cwd: ROOT, stdio: 'inherit' });
  before = cssIn(OUT);
} finally {
  writeFileSync(CSS_SRC, original);
  console.log(`\nindex.css restored (${readFileSync(CSS_SRC, 'utf8') === original ? 'byte-identical' : '!! MISMATCH — restore from ' + BAK}).`);
}

const B = classesOf(before.text), A = classesOf(after.text);
const removed = [...B].filter(c => !A.has(c)).sort();
const added = [...A].filter(c => !B.has(c)).sort();

console.log(`\nbefore  ${before.file}  ${before.text.length} bytes  ${B.size} classes  (blacklist)`);
console.log(`after   ${after.file}  ${after.text.length} bytes  ${A.size} classes  (whitelist)\n`);
console.log(`removed (${removed.length}): ${removed.join(' ') || '—'}`);
console.log(`\nadded   (${added.length}): ${added.join(' ') || '—'}`);

writeFileSync(join(ROOT, 'docs/plans/codex-v1/reference/table/_g5-css-ab.json'),
  JSON.stringify({ before: { file: before.file, bytes: before.text.length, n: B.size },
                   after: { file: after.file, bytes: after.text.length, n: A.size },
                   removed, added }, null, 1));
rmSync(BAK, { force: true });
if (process.argv.includes('--keep')) {
  console.log('\nscratch kept at dist-ab/ (--keep) so other probes can be pointed at the');
  console.log('pre-whitelist build and shown to go red. dist/ was never touched.');
} else {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  console.log('\nscratch dist-ab/ and the .bak removed; dist/ was never touched.');
}
