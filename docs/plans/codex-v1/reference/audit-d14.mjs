// Slice 14 audit — the motion budget, measured
//
// Direction D declares three durations and nothing else:
//
//   --d-dur-tap       90ms   it acknowledged you
//   --d-dur-state    220ms   the board changed
//   --d-dur-ceremony 700ms   a death save, a level, binding a session
//
// and a `prefers-reduced-motion: reduce` block that zeroes all three.
//
// Two questions, and the second one is the one that matters:
//
//   1. CONFORMANCE — how much of the app moves at a duration that is not in
//      the budget? (A grep says 413 hardcoded `duration-200`. A grep cannot
//      tell you whether those elements are on screen or what they animate.)
//
//   2. REDUCED MOTION — with the OS switch on, does the app actually still?
//      The token block zeroes the three variables, but a variable only stills
//      the things that CONSUME it, and only two places in `src/` do. Everything
//      else carries its own hardcoded duration and cannot hear the switch.
//      If that is true, "respects reduced motion" is a claim the app fails,
//      and it is an accessibility failure rather than a matter of taste.
//
// Both are measured in the real browser on the real surfaces, because a
// duration that is declared on an element which never renders is not motion.
//
//   node docs/plans/codex-v1/reference/audit-d14.mjs
// (the preview server must already be running on 4173)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = 'http://localhost:4173/the-codex/';
const NIX = await loadNix();

// The budget, in milliseconds. 0 is always legal — it means "does not move".
const BUDGET = [0, 90, 220, 700];

const MEASURE = (budget) => {
  const ms = v => {
    // computed values come back as "0.2s" or "200ms", comma-separated when the
    // shorthand names several properties.
    if (!v) return [];
    return v.split(',').map(s => {
      s = s.trim();
      if (s.endsWith('ms')) return parseFloat(s);
      if (s.endsWith('s')) return parseFloat(s) * 1000;
      return 0;
    });
  };

  // "Stilled" is not "exactly 0ms". The standard reduced-motion fix collapses
  // durations to 0.01ms rather than 0, because a genuinely zero-duration
  // animation never fires and never applies its `forwards` fill — the element
  // would be left at its FROM frame, i.e. invisible for a fade-in. So anything
  // under a millisecond is stilled, and an audit that reads 0.01ms as motion is
  // an audit that reports its own fix as a failure. (It did, once: 816 became
  // 3024 the first time this was run against the fix.)
  const MOVES = d => d >= 1;

  // The budget's three integers are a VOCABULARY. This is the number that is a
  // RULE: "a tap must never cost you a second you needed." A control the thumb
  // presses must acknowledge inside the state tier — 220ms. Cards, drawers and
  // meters are not taps and are judged by the ceremony ceiling instead.
  const TAP_CEILING = 220;
  const CEREMONY_CEILING = 700;
  const isControl = el =>
    el.matches('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]');

  const out = { offBudget: [], reduceIgnored: [], transitionAll: [], running: [], slowTap: [], overCeremony: [] };
  const seen = new Set();
  const note = (list, el, extra) => {
    // Dedupe by what the element IS, not where it sits — the same button class
    // appearing on nine surfaces is one thing to fix, not nine.
    const key = list + '|' + el.tagName + '|' + String(el.className).slice(0, 70) + '|' + JSON.stringify(extra);
    if (seen.has(key)) return;
    seen.add(key);
    out[list].push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 70),
      what: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      ...extra,
    });
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // Off-screen and zero-area elements cannot be seen to move.
    if (r.width === 0 || r.height === 0) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;

    const tProp = cs.transitionProperty || '';
    const tDur = ms(cs.transitionDuration).filter(MOVES);
    const aName = cs.animationName || 'none';
    const aDur = ms(cs.animationDuration).filter(MOVES);
    const animates = aName !== 'none' && aDur.length > 0;

    if (reduced) {
      // The whole question of section 2: with the switch ON, is anything still
      // declaring a non-zero duration? A transition that never fires is still a
      // latent one — the moment a class flips, it moves.
      if (tDur.length) note('reduceIgnored', el, { kind: 'transition', prop: tProp.slice(0, 40), ms: Math.max(...tDur) });
      if (animates) note('reduceIgnored', el, { kind: 'animation', prop: aName, ms: Math.max(...aDur) });
      continue;
    }

    // `transition-property: all` animates EVERY animatable property, including
    // layout ones. It is why a card can animate its own height when its content
    // changes — motion nobody designed, at a duration nobody chose.
    if (/\ball\b/.test(tProp) && tDur.length) note('transitionAll', el, { ms: Math.max(...tDur) });

    for (const d of tDur) if (!budget.includes(Math.round(d))) note('offBudget', el, { kind: 'transition', prop: tProp.slice(0, 40), ms: Math.round(d) });
    if (animates) for (const d of aDur) if (!budget.includes(Math.round(d))) note('offBudget', el, { kind: 'animation', prop: aName, ms: Math.round(d) });

    // The two enforced ceilings.
    const worst = Math.max(0, ...tDur, ...(animates ? aDur : []));
    if (worst > CEREMONY_CEILING) note('overCeremony', el, { ms: Math.round(worst), prop: (tProp || aName).slice(0, 40) });
    // A control's own feedback. `transition-property` is read so that a button
    // which merely CONTAINS a slow meter is not blamed for it — only durations
    // declared on the control itself count.
    if (isControl(el) && tDur.length && Math.max(...tDur) > TAP_CEILING) {
      note('slowTap', el, { ms: Math.round(Math.max(...tDur)), prop: tProp.slice(0, 40) });
    }
  }

  // Animations the browser says are ACTUALLY running right now. Under reduce
  // this should be empty; anything here is moving on screen, not merely
  // declared. (`animation-play-state` and infinite spinners show up here.)
  for (const a of document.getAnimations()) {
    const t = a.effect && a.effect.target;
    if (!t) continue;
    const timing = a.effect.getTiming();
    const dur = typeof timing.duration === 'number' ? timing.duration : 0;
    if (!MOVES(dur)) continue;
    note('running', t, { name: a.animationName || (a.effect.getKeyframes && 'css'), ms: Math.round(dur), iter: timing.iterations === Infinity ? 'infinite' : timing.iterations });
  }

  return out;
};

const b = await chromium.launch();
const report = [];
let totals = { offBudget: 0, reduceIgnored: 0, transitionAll: 0, running: 0, slowTap: 0, overCeremony: 0 };

async function surface(name, viewport, prepare, reducedMotion) {
  const ctx = await b.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-sw-off', '1');
  }, [NIX.id, JSON.stringify(NIX)]);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  try {
    await prepare(p);
    // Long enough that entry animations have finished — anything still running
    // after this is either infinite or too slow for a table.
    await p.waitForTimeout(900);
    const r = await p.evaluate(MEASURE, BUDGET);
    for (const k of Object.keys(totals)) totals[k] += r[k].length;
    report.push({ name, ...r });
    const line = Object.entries(r).map(([k, v]) => `${k} ${String(v.length).padStart(3)}`).join('  ');
    console.log(`  ${name.padEnd(38)} ${line}`);
  } catch (e) {
    console.log(`  ${name.padEnd(38)} SKIPPED — ${e.message.split('\n')[0].slice(0, 50)}`);
  }
  await ctx.close();
}

const tab = n => async p => { await p.getByRole('tab', { name: n }).click(); };
const prep = n => async p => {
  await p.getByRole('button', { name: 'Switch to prep mode' }).click();
  await p.getByRole('tab', { name: n }).click();
};
const sheet = n => async p => { await p.getByRole('button', { name: n }).click(); };

const PHONE = { width: 390, height: 844 };
const IPAD = { width: 1024, height: 1366 };

const SURFACES = [
  ['session Combat', tab('Combat')],
  ['session Grimoire', tab('Grimoire')],
  ['session Roleplay', tab('Roleplay')],
  ['prep Character', prep('Character')],
  ['prep Grimoire', prep('Grimoire')],
  ['prep Persona', prep('Persona')],
  ['prep Academy', prep('Academy')],
  ['dice roller', sheet('Open dice roller')],
  ['settings', sheet('Open settings')],
  ['toybox', sheet('Open The Toybox')],
  ['mechanics reference', sheet('Open mechanics reference')],
  ['character sheet', sheet('Open character sheet')],
];

for (const mode of ['no-preference', 'reduce']) {
  console.log(`\n  ── prefers-reduced-motion: ${mode} ${'─'.repeat(40 - mode.length)}`);
  console.log('  surface                                off-budget  reduce-ignored  trans-all  running');
  console.log('  ' + '-'.repeat(84));
  for (const [vp, tagName] of [[PHONE, 'phone'], [IPAD, 'iPad']]) {
    for (const [name, prepare] of SURFACES) {
      await surface(`${mode} · ${tagName} · ${name}`, vp, prepare, mode);
    }
  }
}

await b.close();

const rank = kind => {
  const m = new Map();
  for (const s of report) for (const row of s[kind]) {
    const k = row.tag + '|' + row.cls + '|' + row.ms + '|' + (row.prop ?? row.name ?? '');
    if (!m.has(k)) m.set(k, { ...row, on: [] });
    m.get(k).on.push(s.name);
  }
  return [...m.values()].sort((a, b) => b.on.length - a.on.length);
};

console.log('\n  ' + '='.repeat(84));
console.log(`  TOTALS   off-budget ${totals.offBudget}   reduce-ignored ${totals.reduceIgnored}   transition-all ${totals.transitionAll}   running ${totals.running}`);
console.log(`  ENFORCED slow-tap(>220ms) ${totals.slowTap}   over-ceremony(>700ms) ${totals.overCeremony}   reduce-ignored ${totals.reduceIgnored}`);
console.log('  ' + '='.repeat(84));

for (const [kind, title] of [
  ['reduceIgnored', 'STILL DECLARES MOTION WITH REDUCED-MOTION ON'],
  ['slowTap', 'CONTROLS SLOWER THAN THE 220ms TAP CEILING'],
  ['overCeremony', 'ANYTHING SLOWER THAN THE 700ms CEREMONY CEILING'],
  ['running', 'ANIMATIONS ACTUALLY RUNNING'],
  ['offBudget', 'DURATIONS OUTSIDE THE BUDGET'],
  ['transitionAll', 'transition-property: all'],
]) {
  const rows = rank(kind);
  if (!rows.length) { console.log(`\n  ${title}: none`); continue; }
  console.log(`\n  ${title} — ${rows.length} distinct, worst first by reach`);
  for (const r of rows.slice(0, 12)) {
    console.log(`    ${String(r.ms + 'ms').padEnd(8)} ${(r.prop ?? r.name ?? '').slice(0, 22).padEnd(24)} <${r.tag}> ${JSON.stringify(r.what)}`);
    console.log(`      on ${r.on.length} surface(s) · ${r.cls}`);
  }
  if (rows.length > 12) console.log(`    … and ${rows.length - 12} more`);
}

const distinct = kind => [...new Set(report.flatMap(s => s[kind].map(r => r.ms)))].sort((a, b) => a - b);
console.log(`\n  distinct durations in use (normal): ${distinct('offBudget').join(', ')}ms  (budget is ${BUDGET.join(', ')})`);

writeFileSync(new URL('./audit-d14.json', import.meta.url), JSON.stringify({ totals, report }, null, 1));
console.log('\n  full detail → docs/plans/codex-v1/reference/audit-d14.json');
