/* G-6 — which components ship but cannot be reached?
   -----------------------------------------------------------------------------
   Three times now a grader in this project has been probing a control that
   cannot render, and reported around the miss rather than failing:

     A-39  «Manage Actions» lives in combat/SmartActionsGrid.tsx, which nothing
           imports. _g4-prove.mjs probed it for its entire life.
     A-41  «End Turn» lives in combat/InitiativeTracker.tsx, which is re-exported
           by combat/index.ts and imported by nothing. _iv2-combatcrash.mjs
           records that scenario as `MISSING` and the document counted three
           scenarios as clean.
     A-41  ActionMenu.tsx is mounted on every combat screen behind a flag that
           can never be true. Its five controls are 5 of the 8 findings in
           _g3c-trapped, unreachable at every scroll offset because the dialog
           they belong to cannot be opened.

   That is a pattern, not three incidents, and the way to stop finding it one
   grader at a time is to enumerate it. This walks the real module graph from the
   entry point and reports every file under src/ that nothing reachable imports.

   METHOD, and its limits, stated because a false "dead" is the expensive error:
     · Resolution is binding-level, so a barrel that re-exports a name does NOT
       keep that name alive unless something imports the name FROM the barrel.
       That is the InitiativeTracker case and a file-level graph misses it.
     · `export *` from a barrel is treated as keeping every star target alive,
       because the origin of a name cannot be resolved without type information.
       Conservative: it can only under-report.
     · Any file named by a dynamic import() or by a bare string that matches its
       path is kept alive. Conservative in the same direction.
     · A file reported dead is then CHECKED AGAINST dist/, but only via a
       literal UNIQUE to it. A shared string proves nothing about which module
       emitted it, and the first run of this file got four of five verdicts
       wrong that way. The corrected answer is that unreachable modules do not
       reach the bundle at all — Rollup drops them — so this dead code costs
       maintenance and a false surface, not bytes.
     · Test files and the URL-registered service worker are excluded: neither is
       imported from main.tsx and neither is dead.                             */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';

const ROOT = resolve(process.argv[2] || 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex');
const SRC = join(ROOT, 'src');
const ENTRY = ['src/main.tsx', 'src/index.css'];

const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
/* Tests are reached by vitest, not by main.tsx, and the service worker is
   fetched by URL at registration. Neither is dead. The first run of this file
   listed 17 test files and sw.js among its 68 findings, which is exactly the
   false positive this header calls the expensive error — so it is excluded here
   rather than explained away in the report. */
const isTest = f => /\.(test|spec|characterization\.test)\.[jt]sx?$/.test(f) || /[\\/]fixtures[\\/]/.test(f);
const isEntryByUrl = f => /[\\/]pwa[\\/]sw\.js$/.test(f);
const all = walk(SRC).filter(f => /\.(tsx?|jsx?)$/.test(f) && !/\.d\.ts$/.test(f)
  && !isTest(f) && !isEntryByUrl(f));
const rel = f => relative(ROOT, f).split(sep).join('/');

const EXT = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
const resolveImport = (fromFile, spec) => {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const e of EXT) { const c = base + e; try { if (statSync(c).isFile()) return c; } catch { /* next */ } }
  return null;
};

/* Parse one file into: plain imports (whole-file), named imports, and the
   re-export table that makes barrels resolvable at the binding level. */
const parse = src => {
  const imports = [];      // {spec, names:[] | null}   null = whole file (default/namespace/side-effect)
  const reexports = [];    // {spec, names:[] | null}
  const dynamic = [];
  const re = /(?:^|\n)\s*import\s+(?:([\w*\s{},$]+?)\s+from\s*)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const clause = (m[1] || '').trim(), spec = m[2];
    if (!clause) { imports.push({ spec, names: null }); continue; }
    const braced = clause.match(/\{([^}]*)\}/);
    const hasDefaultOrNs = /^[\w$]+\s*(,|$)/.test(clause) || clause.includes('*');
    if (braced && !hasDefaultOrNs) {
      const names = braced[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      imports.push({ spec, names });
    } else imports.push({ spec, names: null });
  }
  const rx = /(?:^|\n)\s*export\s+(?:\*|\{([^}]*)\})\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = rx.exec(src))) {
    if (m[1] === undefined) reexports.push({ spec: m[2], names: null });
    else reexports.push({ spec: m[2], names: m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean) });
  }
  const dy = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dy.exec(src))) dynamic.push(m[1]);
  return { imports, reexports, dynamic };
};

const cache = new Map();
const info = f => { if (!cache.has(f)) cache.set(f, parse(readFileSync(f, 'utf8'))); return cache.get(f); };

const live = new Set();
const queue = [];
for (const e of ENTRY) { const p = join(ROOT, e); try { if (statSync(p).isFile() && /\.(tsx?|jsx?)$/.test(p)) queue.push([p, null]); } catch { /* skip */ } }

while (queue.length) {
  const [file, wanted] = queue.shift();
  const key = file + '::' + (wanted || '*');
  if (live.has(key)) continue;
  live.add(key); live.add(file);
  const { imports, reexports, dynamic } = info(file);

  /* If this file was entered for specific NAMES and it re-exports them, follow
     only to those origins — the barrel itself keeps nothing else alive. */
  const isBarrelHit = wanted && reexports.length &&
    wanted.every(n => reexports.some(r => r.names === null || r.names.includes(n)));
  if (isBarrelHit) {
    for (const n of wanted) {
      for (const r of reexports) {
        if (r.names !== null && !r.names.includes(n)) continue;
        const t = resolveImport(file, r.spec);
        if (t) queue.push([t, null]);
      }
    }
    continue;
  }
  for (const im of [...imports, ...reexports]) {
    const t = resolveImport(file, im.spec);
    if (t) queue.push([t, im.names]);
  }
  for (const d of dynamic) { const t = resolveImport(file, d); if (t) queue.push([t, null]); }
}

const dead = all.filter(f => !live.has(f));

/* Does it ship? Look for a distinctive literal in the built bundle. */
let bundle = '';
try {
  const A = join(ROOT, 'dist', 'assets');
  for (const f of readdirSync(A)) if (f.endsWith('.js')) bundle += readFileSync(join(A, f), 'utf8');
} catch { /* no dist */ }
/* A literal only proves which module it came from if it appears in exactly ONE
   source file. The first run of this file reported `ships — bundle contains
   "Spell Slots"` for SpellSlotPips.tsx; that string lives in six source files,
   five of them reachable, so it proved nothing about any of them. Four of the
   five "ships" verdicts were that same mistake.

   Attribution now requires uniqueness, and the answer it gives is the opposite
   of the guess: «Manage Actions», unique to the dead SmartActionsGrid.tsx, is
   ABSENT from the bundle. Rollup does not emit an unreachable module. Dead code
   in this project costs maintenance and a false surface — it does NOT cost
   bytes, and TABLE-READY § 14 item 11 said it did. */
const srcOf = new Map(all.map(f => [f, readFileSync(f, 'utf8')]));
const uniqueLits = f => {
  const src = srcOf.get(f) || '';
  const lits = [...src.matchAll(/["'`]([A-Z][A-Za-z][A-Za-z ]{8,40})["'`]/g)].map(m => m[1])
    .concat([...src.matchAll(/>\s*([A-Z][A-Za-z][A-Za-z ]{8,40}?)\s*</g)].map(m => m[1].trim()));
  return [...new Set(lits)].filter(t => {
    let n = 0;
    for (const gs of srcOf.values()) if (gs.includes(t)) { n++; if (n > 1) return false; }
    return n === 1;
  });
};
const shipsFrom = f => {
  if (!bundle) return '(no dist to check)';
  const uniq = uniqueLits(f);
  if (!uniq.length) return 'no literal unique to this file — bundle presence not testable';
  const present = uniq.filter(t => bundle.includes(t));
  return present.length
    ? `\x1b[31mSHIPS\x1b[0m — unique literal ${JSON.stringify(present[0])} is in the bundle`
    : `does not ship — ${JSON.stringify(uniq[0])} is unique to it and absent from the bundle`;
};

console.log(`\x1b[1mG-6 — unreachable modules under src/\x1b[0m   entry: ${ENTRY.join(', ')}`);
console.log(`${all.length} source files · ${all.length - dead.length} reachable · \x1b[1m${dead.length} unreachable\x1b[0m\n`);

const byDir = new Map();
for (const f of dead) { const d = dirname(rel(f)); if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(f); }
for (const [d, fs] of [...byDir].sort()) {
  console.log(`  ${d}/`);
  for (const f of fs.sort()) {
    const loc = readFileSync(f, 'utf8').split('\n').length;
    console.log(`     \x1b[31mXX\x1b[0m ${rel(f).replace(d + '/', '').padEnd(30)} ${String(loc).padStart(5)} lines   ${shipsFrom(f)}`);
  }
}

/* A component that is mounted but behind a flag that can never be true is NOT
   caught above — it is reachable from the entry graph. ActionMenu is exactly
   that, and it is the most expensive of the three, so it is named explicitly
   rather than left to be rediscovered by a fourth grader. */
console.log(`\n\x1b[1mmounted-but-unopenable (not module-dead; named because the graph cannot see it)\x1b[0m`);
const CM = join(SRC, 'components', 'CombatHelper.tsx');
try {
  const s = readFileSync(CM, 'utf8');
  const setter = (s.match(/const \[actionMenuOpen, (\w+)\]/) || [])[1];
  const opener = (s.match(/const (openActionMenu) = useCallback/) || [])[1];
  const setTrue = setter ? (s.match(new RegExp(setter + '\\(true\\)', 'g')) || []).length : 0;
  let callers = 0;
  if (opener) for (const f of all) if (f !== CM && readFileSync(f, 'utf8').includes(opener)) callers++;
  const inCM = opener ? (readFileSync(CM, 'utf8').match(new RegExp('\\b' + opener + '\\b', 'g')) || []).length : 0;
  console.log(`  ActionMenu: state setter ${setter} set true in ${setTrue} place(s) — all inside ${opener}()`);
  console.log(`  ${opener}() referenced ${inCM} time(s) in CombatHelper.tsx (its declaration) and ${callers} time(s) anywhere else`);
  console.log(callers === 0
    ? `  \x1b[31mXX ActionMenu can never open. It renders on every combat screen.\x1b[0m`
    : `  ok — it has a caller`);
} catch (e) { console.log('  could not read CombatHelper.tsx: ' + e.message); }

console.log(`\n\x1b[1m${dead.length} unreachable file(s).\x1b[0m Deleting them is Marcus's call (CLAUDE.md: delete = ASK-FIRST). This file only reports.`);
process.exit(0);
