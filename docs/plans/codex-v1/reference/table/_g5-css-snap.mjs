/* SUPERSEDED by _g5-css-ab.mjs — kept only so the discredited numbers have a
   traceable source. The extractor below has NO LEFT BOUNDARY, so it reads every
   decimal fraction in the stylesheet as a class name (`0.32` → `32`). The
   "1374 → 1290, 84 removed" this file produced was therefore not a count of
   classes; the corrected figures, from real builds of both states, are
   1329 → 1248, 81 removed, 0 added. Its companion _g5-css-before.json carries
   the same contamination. Do not cite either. See TABLE-READY § A-37(c).
   -----------------------------------------------------------------------------
   G-5 — snapshot / compare the built stylesheet's class set.
   `node _g5-css-snap.mjs save`  before a change, `… diff` after.
   The point of taking the BEFORE reading first is that a whitelist which
   accidentally excluded `src/` would produce a tiny, beautiful stylesheet and a
   silently unstyled app, and only a diff against the previous set can tell that
   apart from the intended result. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
const SNAP = join(ROOT, 'docs/plans/codex-v1/reference/table/_g5-css-before.json');
const mode = process.argv[2] || 'save';

const dir = join(ROOT, 'dist/assets');
const file = readdirSync(dir).find(f => /\.css$/.test(f));
const css = readFileSync(join(dir, file), 'utf8');
const classes = new Set();
for (const m of css.matchAll(/\.((?:\\[^\s{,>:]|[A-Za-z0-9_-])+)/g)) classes.add(m[1].split('\\').join(''));

if (mode === 'save') {
  writeFileSync(SNAP, JSON.stringify({ file, bytes: css.length, classes: [...classes].sort() }, null, 1));
  console.log(`saved  ${file}  ${css.length} bytes  ${classes.size} classes`);
} else {
  const before = JSON.parse(readFileSync(SNAP, 'utf8'));
  const was = new Set(before.classes);
  const gone = [...was].filter(c => !classes.has(c));
  const added = [...classes].filter(c => !was.has(c));
  console.log(`before ${before.file}  ${before.bytes} bytes  ${was.size} classes`);
  console.log(`after  ${file}  ${css.length} bytes  ${classes.size} classes\n`);
  console.log(`removed (${gone.length}): ${gone.join(' ') || '—'}`);
  console.log(`\nadded   (${added.length}): ${added.join(' ') || '—'}`);
}
