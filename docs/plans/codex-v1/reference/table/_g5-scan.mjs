/* G-5 — is the shipped CSS still a function of the committed tree?
   -----------------------------------------------------------------------------
   A-35 added `@source not "../docs";` to index.css because the probe scripts
   under docs/ were feeding class names into Tailwind's scan and inflating the
   app's stylesheet: 1513 classes locally against 1434 from a clean checkout.
   That fix names ONE directory. Tailwind 4's auto-source-detection scans
   everything that is not gitignored, and this repository root currently holds
   ten untracked files — handoff markdown, an audit dump, a stray .mjs — every
   one of which is scanned, and none of which CI ever checks out.

   So the same defect may simply have moved up one directory. This answers it
   WITHOUT a rebuild, because a rebuild is not available while the harness is
   serving dist:

     · take every class selector the built CSS actually ships;
     · take the text of every file `git ls-files` reports (what CI sees);
     · take the text of every untracked file at the repo root (what only this
       machine sees);
     · report any shipped class that appears in the second set and NOT the first.

   Such a class is a rule the deploy will not have. That is the safe direction
   for the *app* — the deploy simply lacks a rule nothing uses — but it means
   the stylesheet on this machine is not the stylesheet on his phone, and every
   contrast number in this document was measured against the local one.

   Read-only. It builds nothing and writes nothing.                          */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
/* Optional argv[2] names a different build to read. That exists so this file
   can be pointed at the PRE-whitelist build and made to go red on demand: a
   clean result from a checker nobody has seen fail is not evidence. */
const DIST = join(ROOT, process.argv[2] || 'dist');

const cssFile = readdirSync(join(DIST, 'assets')).find(f => /\.css$/.test(f));
if (!cssFile) { console.log('!! no built CSS in dist/assets — nothing to check'); process.exit(1); }
const css = readFileSync(join(DIST, 'assets', cssFile), 'utf8');

/* Class selectors as authored, with Tailwind's escapes removed so the name can
   be looked for in source the way a human wrote it.

   The lookbehind is load-bearing and was missing in the first version of this
   file. Without it every decimal fraction in the stylesheet reads as a class:
   `0.32` yields `32`, `1.5rem` yields `5rem`. Those fragments then get chased
   through the source and reported as findings. Left boundary added by
   _g5-css-ab.mjs's post-mortem; the corrected extraction is 1329/1248 rather
   than 1374/1290. */
const shipped = new Set();
for (const m of css.matchAll(/(?<![0-9A-Za-z_)\]])\.((?:[\\][^\s{,>:]|[A-Za-z0-9_-])+)/g))
  shipped.add(m[1].replace(/\\/g, ''));

const read = p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };

const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .trim().split(/\r?\n/).filter(Boolean)
  .filter(p => !p.startsWith('docs/'))           // excluded from the scan by index.css
  .map(p => read(join(ROOT, p))).join('\n');

const untrackedRoot = execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
  .trim().split(/\r?\n/).filter(Boolean)
  .filter(p => !p.includes('/'))                 // repo root only
  .filter(p => { try { return statSync(join(ROOT, p)).isFile(); } catch { return false; } });

console.log(`built CSS: assets/${cssFile} — ${shipped.size} distinct class selector(s)`);
console.log(`untracked files at the repo root that Tailwind can still see (${untrackedRoot.length}):`);
for (const p of untrackedRoot) console.log(`   · ${p}`);

const localText = untrackedRoot.map(p => read(join(ROOT, p))).join('\n');

/* `:` belongs in the LEADING set, not only the trailing one. A bare utility in
   the stylesheet is very often written by the app under a variant — the CSS
   carries `.border-gold\/50` and src/ writes `hover:border-gold/50` — and a
   test that will not step over the colon calls that class local-only when the
   app is using it. That one omission produced a named, quoted, wrong finding
   in index.css's own comment. */
const word = n => new RegExp('(^|[\\s"\'`{(\\[:])' + n.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&') + '($|[\\s"\'`})\\]:])');

const ghosts = [...shipped].filter(n => {
  if (!word(n).test(localText)) return false;    // not contributed by a local-only file
  return !word(n).test(tracked);                 // and nothing CI checks out uses it
});

console.log(`\n${ghosts.length} shipped class(es) present ONLY in untracked root files:`);
for (const g of ghosts.slice(0, 40)) console.log(`   \x1b[33m${g}\x1b[0m`);
if (ghosts.length > 40) console.log(`   … and ${ghosts.length - 40} more`);

console.log(ghosts.length
  ? `\n  \x1b[31mthe local stylesheet is NOT the stylesheet the deploy builds.\x1b[0m ` +
    `Every contrast number in TABLE-READY was measured against the local one.`
  : `\n  \x1b[32mclean — no shipped class comes from a file CI cannot see.\x1b[0m`);
