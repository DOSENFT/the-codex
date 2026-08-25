/* CONTROL for A-32 / P-0.9 — does the COMMITTED tree build?
   ---------------------------------------------------------------------------
   Every criterion in this document is measured against `dist/`. `dist/` is
   built from the WORKING TREE. So a source file that exists on this laptop and
   was never staged is invisible to all sixty of them: the app runs, the
   harness is green, the screenshots are real — and the repository does not
   compile.

   That is not hypothetical. At `73e4bd1` this control's first run failed with

     src/components/CombatHelper.tsx(43,46): TS2307 Cannot find module './TurnDeck'
     src/components/Settings.tsx(29,75):     TS2307 Cannot find module '../lib/session-rollback'
     src/components/CombatHelper.tsx(989,51): TS7053 (cascade from the above)

   `c056005` added the import of `TurnDeck` to `Layout.tsx` and `CombatHelper.tsx`
   and never added `src/components/TurnDeck.tsx`. Three commits sat unpushed in
   that state. § 1 of this document opens on the fact that the same import bug
   shipped three times with green checks each time; this would have been the
   fourth, and it would have been green here too, because nothing in this
   harness had ever looked at the repo rather than the build.

   Method: check the current HEAD out into a separate worktree — a clean tree
   containing exactly what a stranger cloning this repo receives, and nothing
   from this laptop — link `node_modules` (dependencies are `package.json`'s
   job, not the tree's), and run the real production build. No mocking, no
   `--noEmit` shortcut: the same command GitHub Actions runs.

     want    the committed tree builds
     before  TS2307 x2 — two source files imported by HEAD and absent from it

   The worktree path carries the SHA, so each run gets a genuinely fresh tree
   and this control never deletes anything. They accumulate under TEMP and are
   listed with the other throwaway worktrees in the cleanup note at the end of
   this document. */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';

const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8' }).trim();
const sha = git('rev-parse', '--short', 'HEAD');
const WORK = `C:/Users/marcu/AppData/Local/Temp/codex-tree-${sha}`;

console.log(`\n\x1b[1mP-0.9 does the committed tree build — HEAD ${sha}\x1b[0m\n`);

if (!existsSync(WORK)) git('worktree', 'add', WORK, 'HEAD', '--detach');
else console.log(`  reusing the worktree already checked out for ${sha}`);

/* node_modules is not tracked in any repo and is not what this measures. A
   junction rather than a copy: same files, no 400MB and no minutes. */
if (!existsSync(join(WORK, 'node_modules'))) {
  try { symlinkSync(join(REPO, 'node_modules'), join(WORK, 'node_modules'), 'junction'); }
  catch (e) { console.log(`  could not link node_modules: ${e.message}`); }
}

let ok = false, out = '';
try {
  out = execSync('npm run build', { cwd: WORK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  ok = true;
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}`;
}

/* Report the compiler's own lines, not a summary of them — a missing module is
   the finding, and the file and line are the whole of it. */
const errs = out.split(/\r?\n/).filter(l => /error TS\d+|Cannot find module|Rollup failed/i.test(l));
if (errs.length) {
  console.log(`  \x1b[31m${errs.length} compiler error(s):\x1b[0m`);
  for (const e of errs.slice(0, 25)) console.log(`     ${e.trim()}`);
  if (errs.length > 25) console.log(`     … and ${errs.length - 25} more`);
} else if (ok) {
  const built = out.split(/\r?\n/).find(l => /built in/.test(l));
  console.log(`  \x1b[32mclean\x1b[0m  ${built ? built.trim() : 'build completed'}`);
}

/* Untracked-but-imported is the specific shape that caused this. Name it
   explicitly, because "the build failed" is a worse bug report than "these two
   files are on your laptop and not in the repository". */
const untracked = git('ls-files', '--others', '--exclude-standard', 'src').split(/\r?\n/).filter(Boolean);
if (untracked.length) {
  console.log(`\n  \x1b[33muntracked files under src/ on this machine:\x1b[0m`);
  for (const f of untracked) console.log(`     ${f}`);
} else {
  console.log(`\n  no untracked files under src/`);
}

const pass = ok && errs.length === 0;
console.log(`\n  ${pass ? '\x1b[32mP-0.9 PASSES\x1b[0m' : '\x1b[31mP-0.9 FAILS\x1b[0m'} — the committed tree at ${sha} ${pass ? 'builds clean' : 'does not build'}\n`);
process.exit(pass ? 0 : 1);
