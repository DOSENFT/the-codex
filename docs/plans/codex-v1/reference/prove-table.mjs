#!/usr/bin/env node
// prove-table.mjs — the single command TABLE-READY.md is graded by.
//
//   node docs/plans/codex-v1/reference/prove-table.mjs             local preview
//   node docs/plans/codex-v1/reference/prove-table.mjs --live      the deployed site
//   node docs/plans/codex-v1/reference/prove-table.mjs --selftest  P-0 only
//   node docs/plans/codex-v1/reference/prove-table.mjs --only F,V  iterate on one family
//
// P-0 runs FIRST, always, unless --only is used. If P-0 fails, the run is
// marked VOID and every result under it is worthless — that is the whole point
// of grading the instrument before the thing it measures.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { chromium, LOCAL, LIVE, PHONE, makeReport } from './table/rig.mjs';
import { familyF, familyD, familyR, familyS, familyV, familyN, familyE, THRESH } from './table/families.mjs';
import { proveInstrument } from './table/selftest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = f => (argv.find(a => a.startsWith(f + '=')) || '').split('=')[1]
  || (argv[argv.indexOf(f) + 1] && !argv[argv.indexOf(f) + 1].startsWith('--') ? argv[argv.indexOf(f) + 1] : '');

const LIVE_MODE = has('--live');
const SELFTEST_ONLY = has('--selftest');
const ONLY = (val('--only') || '').split(',').filter(Boolean).map(s => s.trim().toUpperCase());

const base = LIVE_MODE ? LIVE : LOCAL;
const opts = { base, viewport: PHONE, dpr: 3, live: LIVE_MODE };

// Live runs F, R, V, N (P-2). S and E measure the machine, not the deploy, and
// D-5/D-7 drive downloads and storage failure — those are graded locally.
const FAMILIES = [
  ['F', familyF], ['D', familyD], ['R', familyR],
  ['S', familyS], ['V', familyV], ['N', familyN], ['E', familyE],
];
const LIVE_SET = ['F', 'R', 'V', 'N'];

const sha = (() => {
  try { return execSync('git rev-parse HEAD', { cwd: join(here, '../../../..') }).toString().trim(); }
  catch { return 'unknown'; }
})();

console.log(`\n\x1b[1mTABLE-READY — ${LIVE_MODE ? 'DEPLOYED' : 'LOCAL'}\x1b[0m`);
console.log(`  target   ${base}`);
console.log(`  local HEAD ${sha.slice(0, 7)}`);
console.log(`  viewport ${opts.viewport.width}×${opts.viewport.height} @3x`);

const R = makeReport();
const b = await chromium.launch();
const t0 = Date.now();
let instrument = { voided: false, matrix: [] };

try {
  if (!ONLY.length) {
    instrument = await proveInstrument(b, R, opts);
    if (instrument.voided) {
      console.log('\n\x1b[41m\x1b[97m  P-0 FAILED — THE INSTRUMENT IS NOT TRUSTWORTHY. ' +
        'EVERY RESULT BELOW IS VOID.  \x1b[0m');
    }
  } else {
    console.log('\n\x1b[33m  --only: P-0 skipped. This run is PARTIAL and may not be reported as a result.\x1b[0m');
  }

  if (!SELFTEST_ONLY) {
    for (const [key, fn] of FAMILIES) {
      if (ONLY.length && !ONLY.includes(key)) continue;
      if (!ONLY.length && LIVE_MODE && !LIVE_SET.includes(key)) {
        R.unproven(key + '-*', `family ${key} against the deployed site`, 'graded locally only — measures the machine, not the deploy (see P-2)');
        continue;
      }
      try { await fn(b, R, opts); }
      catch (e) { R.no(key + '-!', `family ${key} threw and could not complete`, String(e).slice(0, 400)); }
    }
  }
} finally {
  await b.close();
}

const secs = Math.round((Date.now() - t0) / 1000);
const unproven = R.rows.filter(r => r.verdict === 'UNPROVEN').length;
console.log(`\n\x1b[1m═══ ${R.pass} pass · ${R.fail} fail · ${unproven} unproven · ${secs}s ═══\x1b[0m`);
if (instrument.voided) console.log('\x1b[31mVOID: P-0 failed. None of the above counts.\x1b[0m');
for (const r of R.rows.filter(r => r.verdict === 'FAIL')) console.log(`  \x1b[31mFAIL\x1b[0m ${r.id} ${r.what}`);
for (const r of R.rows.filter(r => r.verdict === 'UNPROVEN')) console.log(`  \x1b[33m????\x1b[0m ${r.id} ${r.what} — ${r.detail}`);

const out = join(here, 'table', `results-${LIVE_MODE ? 'live' : 'local'}${ONLY.length ? '-partial' : ''}.json`);
writeFileSync(out, JSON.stringify({
  target: base, sha, mode: LIVE_MODE ? 'live' : 'local',
  partial: ONLY.length > 0, void: instrument.voided,
  detectorMatrix: instrument.matrix, thresholds: THRESH,
  seconds: secs, pass: R.pass, fail: R.fail, unproven, rows: R.rows,
}, null, 2));
console.log(`  → ${out}`);

process.exit(instrument.voided || R.fail > 0 ? 1 : 0);
