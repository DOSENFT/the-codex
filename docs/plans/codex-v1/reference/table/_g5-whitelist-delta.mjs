/* G-5 — did the whitelist move any graded number?
   -----------------------------------------------------------------------------
   A-37(f) said no measured value SHOULD move, because none of the 81 dropped
   classes is used by the app — and then said that "should" is a model and a
   model does not get to close a row. This closes it with the two runs.

   `results-local.json` from the pre-whitelist full run was committed at
   `d217ca2` before the post-whitelist run overwrote it, so both readings of the
   same 60-odd criteria exist and can be compared field by field. Timings are
   reported but never counted as a difference: S-1 and S-3 are wall-clock rows
   and vary run to run on this laptop, which is a fact about the machine and not
   about the stylesheet.                                                       */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
const P = 'docs/plans/codex-v1/reference/table/results-local.json';

const after = JSON.parse(readFileSync(`${ROOT}/${P}`, 'utf8'));
const before = JSON.parse(execSync(`git show d217ca2:${P}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }));

const rowsOf = r => {
  const out = new Map();
  const walk = v => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      if (typeof v.id === 'string' && ('pass' in v || 'verdict' in v || 'note' in v))
        out.set(v.id, { pass: v.pass ?? v.verdict, note: String(v.note ?? v.detail ?? '') });
      return Object.values(v).forEach(walk);
    }
  };
  walk(r);
  return out;
};

const A = rowsOf(after), B = rowsOf(before);
if (!A.size || !B.size) {
  console.log(`!! parsed ${B.size} rows before and ${A.size} after — the shape is not what this expects.`);
  console.log('!! NOT reporting a comparison. Top-level keys:', Object.keys(after).join(', '));
  process.exit(1);
}

/* Wall-clock rows, expected to drift between runs on this laptop.

   THIS LIST WAS WIDENED AFTER SEEING THE RESULT, so here is exactly what
   happened. The first version held only S-1 and S-3, and the run printed:

     3 rows changed — S-1 [timing], S-3 [timing], and
       N-2  before: 71ms;   after: 63ms;
     the whitelist is NOT inert to the graded numbers — 0 verdict, 1 non-timing.

   N-2 was then read rather than argued with. Its printed value is `spend 63ms`,
   a millisecond wall-clock; its criterion text in § 5 is "With the AI endpoint
   black-holed ... **S-3 still holds**" — it is S-3's stopwatch run under a dead
   endpoint. It is the same species as the two rows already here, and 71 → 63ms
   is drift in the direction of *faster*, which no added stylesheet rule causes.
   So this is a correction of a misclassification, not a threshold moved to
   reach a green: no row's verdict, tolerance or comparison changed, and if the
   whitelist had moved N-2 the row would still be printed — it is printed
   either way, and only its heading changes. */
const TIMING = /^(S-[13]|N-2)$/;
let same = 0, verdict = [], numeric = [], only = [];
for (const id of new Set([...A.keys(), ...B.keys()])) {
  const a = A.get(id), b = B.get(id);
  if (!a || !b) { only.push(`${id} (${a ? 'after only' : 'before only'})`); continue; }
  if (String(a.pass) !== String(b.pass)) { verdict.push(`${id}: ${b.pass} → ${a.pass}`); continue; }
  if (a.note !== b.note) {
    (TIMING.test(id) ? numeric : numeric).push(`${id}${TIMING.test(id) ? ' [timing]' : ''}\n      before: ${b.note.slice(0, 130)}\n      after:  ${a.note.slice(0, 130)}`);
    continue;
  }
  same++;
}

console.log(`${B.size} rows before · ${A.size} rows after · ${same} byte-identical\n`);
if (only.length) console.log(`\x1b[33mpresent in one run only (${only.length}): ${only.join(', ')}\x1b[0m\n`);
if (verdict.length) {
  console.log(`\x1b[31m${verdict.length} VERDICT CHANGE(S):\x1b[0m`);
  for (const v of verdict) console.log('  ' + v);
  console.log('');
}
if (numeric.length) {
  console.log(`${numeric.length} row(s) whose reported number changed:`);
  for (const n of numeric) console.log('  · ' + n);
  console.log('');
}
const real = numeric.filter(n => !/\[timing\]/.test(n)).length;
console.log(verdict.length || real
  ? `\x1b[31mthe whitelist is NOT inert to the graded numbers — ${verdict.length} verdict, ${real} non-timing.\x1b[0m`
  : `\x1b[32mno verdict moved and no non-timing number moved. The whitelist is inert to every graded row.\x1b[0m`);
process.exit(verdict.length || real ? 1 : 0);
