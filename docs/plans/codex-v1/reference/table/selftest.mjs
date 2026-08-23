// P-0 — THE INSTRUMENT.
//
// Graded before anything else. If P-0 fails, every other result in this run is
// void, regardless of what it says.
//
// The reason this file exists: the same import bug shipped three times with
// every check green. The app was not the weak part. The check was. So the check
// is calibrated against a build that is KNOWN to be broken — 73c45d8, the SHA
// deployed at dosenft.github.io right now — and is not allowed to grade the
// real build until it has been shown to fail on that one.
//
// Where a criterion can be calibrated against that real bad build rather than
// against an injected one, it is. Injection is used only for the failure classes
// 73c45d8 does not happen to contain.
//
//   P-0.1  fails on a CAUGHT React error          [real: 73c45d8, play/Combat]
//   P-0.2  fails on a console.error with no visual symptom at all
//                                                 [real: 73c45d8, play/Roleplay]
//   P-0.3  fails on an unhandled promise rejection
//   P-0.4  fails on a blank body
//   P-0.5  fails on a screen that renders and is empty of its own reason to exist
//   P-0.6  deletion matrix: every control load-bearing — for each one there is a
//          bad case that ONLY it catches, proven by removing it and watching the
//          bad case pass
//   P-0.7  (added) sensitivity: fails 73c45d8 on the input shapes that break it
//   P-0.8  (added) specificity: passes HEAD on those same shapes
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import {
  freshCtx, goScreen, SCREENS, importFile, judge, ALL_DETECTORS,
} from './rig.mjs';
import { realCopy, write } from './families.mjs';

export const BROKEN_DIST = 'C:/Users/marcu/AppData/Local/Temp/codex-broken/dist';
export const BROKEN_SHA = '73c45d8';
const BROKEN_PORT = 4199;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

/** Serve a dist/ under /the-codex/ so the broken build can be opened exactly the
 *  way the real one is. */
export function serveDist(dir, port) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/the-codex\/?/, '');
    let file = join(dir, p || 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(readFileSync(file));
  });
  return new Promise(r => srv.listen(port, () => r({
    url: `http://localhost:${port}/the-codex/`,
    close: () => new Promise(rr => srv.close(rr)),
  })));
}

/* The structural markers familyF uses. Duplicated here on purpose: P-0 must not
   depend on families.mjs exporting its internals. */
const CHROME = {
  'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i],
  'play/Grimoire': [/Grimoire/i],
  'play/Roleplay': [/Perform|Catchphrase|Dialogue/i],
  'prep/Character': [/Ability Scores/i],
  'prep/Grimoire': [/Session Status|Lock & Load/i],
  'prep/Persona': [/Persona Engine|Identity/i],
  'prep/Academy': [/ROLEPLAY COACH|Training/i],
};

const SKELETON = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};
/* The 12 hostile-but-legal inner shapes of F-3 — the shapes that actually break
   73c45d8. His two real export shapes do NOT break it; see P-0.7's detail. */
const NESTED = {
  'bare weapon': { weapons: [{ name: 'Longsword' }] },
  'bare spell': { spells: [{ name: 'Bless' }] },
  'bare feature': { features: [{ name: 'Lay on Hands' }] },
  'object in equipment': { equipment: [{ name: 'Rope' }] },
  'bare feat': { feats: [{ name: 'Sentinel' }] },
  'bare pool': { resourcePools: [{ name: 'Hearth Embers' }] },
  'bare identity': { identities: [{ name: 'The Ashen Knight' }] },
  'bare condition': { customConditions: [{ name: 'Emberburn' }] },
  'bare hook': { customHooks: [{ name: 'A debt unpaid' }] },
  'bare supply': { supplies: [{ name: 'Rations' }] },
  'persona: {}': { persona: {} },
  'one of everything': {
    weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }],
    equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }],
    features: [{ name: 'Lay on Hands' }], identities: [{ name: 'Ash' }], persona: {},
  },
};
const shapeFile = kind => write(`p0-${kind.replace(/\W/g, '-')}.json`, { ...SKELETON, ...NESTED[kind] });

/** Import a file, walk to one screen, judge it with a chosen detector set. */
async function oneScreen(b, { base, viewport, file, screenId, detectors }) {
  const screen = SCREENS.find(s => s.id === screenId);
  const { ctx, page } = await freshCtx(b, { base, viewport, detectors });
  await importFile(page, file);
  await goScreen(page, screen);
  const j = await judge(page, { needs: CHROME[screenId] || [], detectors });
  await ctx.close();
  return j.faults;
}

/** Import a file, walk all seven, judge each. */
async function walkBase(b, { base, viewport, file, detectors = ALL_DETECTORS }) {
  const { ctx, page } = await freshCtx(b, { base, viewport, detectors });
  const faults = [];
  try {
    await importFile(page, file);
    for (const s of SCREENS) {
      await goScreen(page, s);
      const j = await judge(page, { needs: CHROME[s.id] || [], detectors });
      if (j.faults.length) faults.push(`${s.id}: ${j.faults.join(' | ')}`);
    }
  } catch (e) { faults.push('harness: ' + String(e).slice(0, 160)); }
  await ctx.close();
  return faults;
}

/* ── injected defects, for the three classes 73c45d8 does not contain ────────
   Each is written to be caught by exactly one control, so that removing that
   control lets it through. That is what "load-bearing" has to mean. */
const INJECT = {
  // an uncaught throw, page otherwise entirely intact
  pageerror: () => setTimeout(() => { throw new Error('P0-INJECTED-UNCAUGHT'); }, 500),
  // a rejection inside an app that installs a global swallower — real class:
  // preventDefault() stops the browser reporting it, so pageerror and console
  // both go quiet and only a listener registered first ever sees it
  rejection: () => {
    window.addEventListener('unhandledrejection', e => e.preventDefault());
    setTimeout(() => { Promise.reject(new Error('P0-INJECTED-REJECTION')); }, 500);
  },
  // the old, weakest question — and the only control that works on a screen
  // nobody has written markers for
  blank: () => setTimeout(() => { document.body.innerHTML = ''; }, 1400),
  // one per-surface boundary notice inside an otherwise complete screen: every
  // marker still present, nothing thrown in this page's lifetime. This is the
  // shape the bug shipped in three times.
  boundary: () => setTimeout(() => {
    const d = document.createElement('div');
    d.style.cssText = 'padding:1rem;color:#caa';
    d.textContent = 'Combat stopped. The rest of the app is still running.';
    document.body.appendChild(d);
  }, 1400),
  // renders, throws nothing, and is empty of its own reason to exist
  hollow: () => setTimeout(() => {
    document.body.innerHTML = '<div style="padding:2rem;color:#ccc">The Codex</div>'
      + '<div style="padding:1rem;color:#888">A screen with none of its own furniture on it. '
      + 'It is not blank. It did not throw. There is nothing here to play from.</div>';
  }, 1400),
};

/** Load the app with one injected defect and report which controls fire. */
async function probeInjected(b, { base, viewport }, kind, detectors) {
  const { ctx, page } = await freshCtx(b, { base, viewport, detectors });
  await page.addInitScript(INJECT[kind]);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2100);
  // 'blank' is the control that must work WITHOUT knowing the screen; give it
  // no markers so nothing but blank itself can fire.
  const needs = kind === 'blank' ? [] : [/Import Character/i];
  const j = await judge(page, { needs, detectors });
  await ctx.close();
  return j.faults;
}

const ALL6 = [...ALL_DETECTORS];

export async function proveInstrument(b, R, opts) {
  R.section('P-0 — THE INSTRUMENT  (if this fails, every result below is void)');
  let voided = false;
  const fail = () => { voided = true; };

  if (!existsSync(BROKEN_DIST)) {
    R.unproven('P-0.*', 'calibration against the known-broken build', `no build at ${BROKEN_DIST}`);
    return { voided: true, matrix: [] };
  }
  const srv = await serveDist(BROKEN_DIST, BROKEN_PORT);
  const broken = { base: srv.url, viewport: opts.viewport };
  const spellFile = shapeFile('bare spell');

  /* ── P-0.1 — a CAUGHT React error. Real, not injected: 73c45d8 renders the
        boundary notice on play/Combat for a spell with no level field. ─────── */
  {
    const f = await oneScreen(b, { ...broken, file: spellFile, screenId: 'play/Combat', detectors: ALL6 });
    const caught = f.some(x => /BOUNDARIED/.test(x));
    R.check('P-0.1', `FAIL-ON-CAUGHT — a caught React error on ${BROKEN_SHA} is reported  [real defect, not injected]`,
      caught, caught ? '' : 'the boundary notice was NOT reported: ' + f.join(' | '));
    console.log(`         calibration: FAIL-ON-CAUGHT ${caught ? 'ok' : 'BLIND'}`);
    if (!caught) fail();
  }

  /* ── P-0.2 — a console.error with NO visual symptom at all. Also real:
        73c45d8 on play/Roleplay keeps every marker, is not blank, is not
        boundaried, and is throwing. This is the exact shape that shipped
        three times with the checks green. ─────────────────────────────────── */
  {
    const all = await oneScreen(b, { ...broken, file: spellFile, screenId: 'play/Roleplay', detectors: ALL6 });
    const silent = await oneScreen(b, { ...broken, file: spellFile, screenId: 'play/Roleplay', detectors: ALL6.filter(d => d !== 'console') });
    const ok = all.some(x => x.startsWith('console:')) && silent.length === 0;
    R.check('P-0.2', 'FAIL-ON-CONSOLE — a console.error with no visual symptom whatsoever is reported',
      ok, ok ? '' : `withAll=[${all.join(' | ')}] withoutConsole=[${silent.join(' | ')}]`);
    console.log(`         calibration: FAIL-ON-CONSOLE ${ok ? 'ok' : 'BLIND'}`);
    console.log(`         ↑ every marker present, not blank, not boundaried — and throwing. ` +
      `This screen is what "the checks were green" looked like.`);
    if (!ok) fail();
  }

  /* ── P-0.3 / P-0.4 / P-0.5 — the classes 73c45d8 does not contain ───────── */
  for (const [id, kind, tag, what] of [
    ['P-0.3', 'rejection', 'FAIL-ON-REJECTION', 'an unhandled promise rejection is reported, even when the app swallows it'],
    ['P-0.4', 'blank', 'FAIL-ON-BLANK', 'a blank body is reported, with no markers needed'],
    ['P-0.5', 'hollow', 'FAIL-ON-HOLLOW', 'a screen that renders, throws nothing, and is empty of its reason to exist is reported'],
  ]) {
    const f = await probeInjected(b, opts, kind, ALL6);
    const ok = f.length > 0;
    R.check(id, `${tag} — ${what}`, ok, ok ? '' : `INJECTED "${kind}" WAS NOT CAUGHT`);
    console.log(`         calibration: ${tag} ${ok ? 'ok' : 'BLIND'}`);
    if (!ok) fail();
  }

  /* ── P-0.6 — deletion matrix. For each control, a bad case that only it
        catches: with every control on, the case FAILS; with that one control
        removed, the case PASSES. A control that cannot be missed is decorative;
        a control that catches nothing is not a control. ───────────────────── */
  R.section('P-0.6 — deletion matrix: is each control load-bearing?');
  const CASES = {
    // control      → the bad case for which it is the only witness
    console: { real: true, run: d => oneScreen(b, { ...broken, file: spellFile, screenId: 'play/Roleplay', detectors: d }), note: `${BROKEN_SHA} bare-spell · play/Roleplay` },
    pageerror: { run: d => probeInjected(b, opts, 'pageerror', d), note: 'uncaught throw, page intact' },
    rejection: { run: d => probeInjected(b, opts, 'rejection', d), note: 'rejection + a global swallower' },
    blank: { run: d => probeInjected(b, opts, 'blank', d), note: 'empty body, screen has no markers' },
    boundary: { run: d => probeInjected(b, opts, 'boundary', d), note: 'one boundaried card, screen otherwise whole' },
    hollow: { run: d => probeInjected(b, opts, 'hollow', d), note: 'renders, silent, empty of its own furniture' },
  };
  const matrix = [];
  console.log(`  ${'control'.padEnd(10)} ${'caught'.padEnd(7)} ${'passes-without'.padEnd(15)} bad case`);
  for (const d of ALL6) {
    const c = CASES[d];
    const withAll = await c.run(ALL6);
    const without = await c.run(ALL6.filter(x => x !== d));
    const caught = withAll.length > 0;
    const passesWithout = without.length === 0;
    const bearing = caught && passesWithout;
    matrix.push({ control: d, caught, passesWithout, bearing, real: !!c.real, note: c.note, alsoCaughtBy: without });
    console.log(`  ${d.padEnd(10)} ${(caught ? '✓' : '✗').padEnd(7)} ${(passesWithout ? '✓' : '✗ ' + without.join('|').slice(0, 40)).padEnd(15)} ${c.note}${c.real ? '  [REAL]' : ''}`);
  }
  const weak = matrix.filter(m => !m.bearing);
  R.check('P-0.6', `every control load-bearing, proven by deletion  [${matrix.filter(m => m.bearing).length}/${matrix.length}]`,
    weak.length === 0,
    weak.map(m => `${m.control}: ${!m.caught ? 'caught nothing' : 'not load-bearing — also caught by ' + m.alsoCaughtBy.join(' | ').slice(0, 120)}`).join('\n         '));
  if (weak.length) fail();

  /* ── P-0.7 / P-0.8 — added criteria: sensitivity and specificity against a
        whole real build, not one screen. ─────────────────────────────────── */
  R.section('P-0.7 / P-0.8 — the whole known-broken build');
  {
    const caughtShapes = [], missedShapes = [];
    for (const kind of Object.keys(NESTED)) {
      const f = await walkBase(b, { ...broken, file: shapeFile(kind) });
      (f.length ? caughtShapes : missedShapes).push(kind);
    }
    // his two real export shapes, for the record
    const realThin = await walkBase(b, { ...broken, file: realCopy('thin') });
    const realFull = await walkBase(b, { ...broken, file: realCopy('full') });
    R.check('P-0.7', `the harness FAILS ${BROKEN_SHA} — the SHA deployed right now — on ${caughtShapes.length}/12 hostile-but-legal shapes`,
      caughtShapes.length > 0,
      `caught: ${caughtShapes.join(', ')}\n         not broken on that build: ${missedShapes.join(', ') || 'none'}`);
    if (!caughtShapes.length) fail();
    console.log(`         his REAL thin export on ${BROKEN_SHA}: ${realThin.length ? realThin.length + ' screen(s) faulted' : 'clean'}`);
    console.log(`         his REAL full export on ${BROKEN_SHA}: ${realFull.length ? realFull.length + ' screen(s) faulted' : 'clean'}`);

    const headMissed = [];
    for (const kind of caughtShapes) {
      const f = await walkBase(b, { base: opts.base, viewport: opts.viewport, file: shapeFile(kind) });
      if (f.length) headMissed.push(`${kind} → ${f.join(' ; ')}`);
    }
    R.check('P-0.8', `the same harness PASSES HEAD on all ${caughtShapes.length} shapes it just failed ${BROKEN_SHA} on (it is not simply always red)`,
      headMissed.length === 0, headMissed.join('\n         '));
    if (headMissed.length) fail();
  }

  await srv.close();
  return { voided, matrix };
}
