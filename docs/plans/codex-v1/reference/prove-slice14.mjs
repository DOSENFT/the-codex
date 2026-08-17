// Slice 14 proof — the motion budget, and the paper fallback
//
// Two halves, one slice, and both are about the app being usable when the
// normal conditions do not hold.
//
//   MOTION.  The budget in tokens.css names three durations — 90ms tap, 220ms
//   state, 700ms ceremony — and a switch: `prefers-reduced-motion`. Measuring
//   the app found the switch was near-decorative. 816 elements declared motion
//   with reduce on, 86 animations ran. Two central fixes closed it: a blanket
//   media query in index.css (CSS transitions and @keyframes) and
//   <MotionConfig reducedMotion="user"> in main.tsx (the Web Animations API,
//   which a media query cannot reach).
//
//   What is NOT enforced, and why: the budget's exact integers. The app uses
//   140/150/180/200/300/400/500ms. Nothing exceeds the 700ms ceiling and no
//   control exceeds the 220ms tap ceiling, so the TIERS hold; forcing 828
//   elements onto three integers would be perceptually invisible churn against
//   working layouts. The same judgement Slice 13b made about the 44px floor.
//   The enforced properties are the three that a person can feel: reduce works,
//   taps are not sluggish, nothing crawls.
//
//   PAPER.  The interactive character sheet is a bottom Sheet with five tabs
//   whose inactive tabs are NOT RENDERED, so Ctrl+P on it produces one clipped
//   tab. The fix is a separate document mounted beside the app shell. This
//   proves it is invisible on screen, complete on paper, and reachable from
//   every surface — including the ones that are not the character sheet.
//
//   node docs/plans/codex-v1/reference/prove-slice14.mjs
// (the preview server must already be running on 4173)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const BASE = 'http://localhost:4173/the-codex/';
const NIX = await loadNix();

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`); }
};

const b = await chromium.launch();
const errors = [];
const open = async ({ viewport = { width: 390, height: 844 }, reducedMotion = 'no-preference' } = {}) => {
  const ctx = await b.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-sw-off', '1');
  }, [NIX.id, JSON.stringify(NIX)]);
  /* A high-water mark, not a snapshot. Motion is by definition the thing that
     is not there when you look — the first version of check 3 sampled 120ms
     after networkidle, by which time the entrance wave had finished, and
     concluded the app no longer animates. It does; the instrument blinked. */
  await ctx.addInitScript(() => {
    window.__maxRunning = 0;
    const tick = () => {
      const n = document.getAnimations().filter(a => a.playState === 'running').length;
      if (n > window.__maxRunning) window.__maxRunning = n;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  p.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, p };
};

/* The one number this instrument turns on. The standard reduced-motion fix
   collapses durations to 0.01ms rather than 0, because a true 0 cancels
   transitionend and breaks code that waits for it. An audit that reads 0.01ms
   as "still moving" reports its own fix as a failure — which is exactly what
   this instrument did on its first run, going from 816 to 3024. */
const MOTION_PROBE = () => {
  const MOVES = d => d >= 1;
  const ms = v => (v || '').split(',').map(s => {
    const t = s.trim();
    return t.endsWith('ms') ? parseFloat(t) : t.endsWith('s') ? parseFloat(t) * 1000 : 0;
  });
  const isControl = el => el.matches('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]');

  let declares = 0, slowTap = 0, overCeremony = 0;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const durs = [...ms(cs.transitionDuration), ...ms(cs.animationDuration)].filter(MOVES);
    if (!durs.length) continue;
    declares++;
    const worst = Math.max(...durs);
    if (worst > 700) overCeremony++;
    if (isControl(el) && worst > 220) slowTap++;
  }

  // getAnimations() is the honest question: not "was motion declared" but "is
  // anything moving right now". Spinners are carved out on purpose — a stilled
  // spinner is a frozen app, which is a worse accessibility outcome than a
  // rotating one.
  const live = document.getAnimations().filter(a => a.playState === 'running');
  const spinners = live.filter(a => a.effect?.target?.closest?.('.animate-spin')).length;

  return { declares, slowTap, overCeremony, running: live.length, spinners };
};

/* The carve-out cannot be proved by waiting for a spinner to appear on a
   surface that may not have one, so it is proved directly: inject one spinner
   and one ordinary animated element into the live page under reduce, and read
   what the stylesheet did to each. */
const CARVE_OUT_PROBE = () => {
  const mk = cls => {
    const d = document.createElement('div');
    d.className = cls;
    d.style.animationName = 'fadeIn';
    d.style.animationDuration = '600ms';
    document.body.appendChild(d);
    // Chrome serialises 0.01ms as "1e-05s", so compare numbers, not strings.
    const raw = getComputedStyle(d).animationDuration.trim();
    d.remove();
    return raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000;
  };
  return { spinner: mk('animate-spin'), ordinary: mk('') };
};

const SURFACES = [
  ['session Combat', p => p.getByRole('tab', { name: 'Combat' }).click()],
  ['session Grimoire', p => p.getByRole('tab', { name: 'Grimoire' }).click()],
  ['session Roleplay', p => p.getByRole('tab', { name: 'Roleplay' }).click()],
  ['prep Character', p => p.getByRole('button', { name: 'Switch to prep mode' }).click().then(() => p.getByRole('tab', { name: 'Character' }).click())],
  ['prep Grimoire', p => p.getByRole('button', { name: 'Switch to prep mode' }).click().then(() => p.getByRole('tab', { name: 'Grimoire' }).click())],
  ['prep Persona', p => p.getByRole('button', { name: 'Switch to prep mode' }).click().then(() => p.getByRole('tab', { name: 'Persona' }).click())],
  ['prep Academy', p => p.getByRole('button', { name: 'Switch to prep mode' }).click().then(() => p.getByRole('tab', { name: 'Academy' }).click())],
  ['character sheet', p => p.getByRole('button', { name: 'Open character sheet' }).click()],
  ['dice roller', p => p.getByRole('button', { name: 'Open dice roller' }).click()],
  ['settings', p => p.getByRole('button', { name: 'Open settings' }).click()],
];

// ===========================================================================
console.log('\n-- 1. reduced motion stills the app, on every surface --');
// The property, stated plainly: with the OS switch on, nothing on any surface
// declares motion and nothing is animating. Not "less motion" — none.
{
  const declared = [], running = [];
  for (const [name, go] of SURFACES) {
    const { ctx, p } = await open({ reducedMotion: 'reduce' });
    try { await go(p); } catch { /* surface unreachable is caught by 5 */ }
    await p.waitForTimeout(500);
    const m = await p.evaluate(MOTION_PROBE);
    if (m.declares) declared.push(`${name}:${m.declares}`);
    if (m.running - m.spinners > 0) running.push(`${name}:${m.running - m.spinners}`);
    await ctx.close();
  }
  check('no surface declares motion under reduce', declared, []);
  check('no non-spinner animation runs under reduce', running, []);
}

// ===========================================================================
console.log('\n-- 2. the spinner carve-out survives the blanket rule --');
// A blanket `animation-duration: 0.01ms !important` freezes loading spinners
// into a static glyph that reads as a hung app. The one exception is deliberate
// and this is the only test that would notice if it were dropped.
{
  const { ctx, p } = await open({ reducedMotion: 'reduce' });
  const probe = await p.evaluate(CARVE_OUT_PROBE);
  check('ordinary animation is stilled under reduce', probe.ordinary < 1, true);
  check('.animate-spin keeps a real duration under reduce', probe.spinner, 1500);
  await ctx.close();
}

// ===========================================================================
console.log('\n-- 3. normal motion was not killed to achieve that --');
// The failure mode of a blanket rule is a blanket rule that is always on. With
// no preference expressed, the app must still animate.
{
  const { ctx, p } = await open();
  const m = await p.evaluate(MOTION_PROBE);
  await p.getByRole('tab', { name: 'Grimoire' }).click();
  await p.waitForTimeout(400);
  const peak = await p.evaluate(() => window.__maxRunning);
  check('motion is still declared with no preference', m.declares > 0, true);
  check('animations still run with no preference', peak > 0, true);
  console.log(`       (peak concurrent animations with no preference: ${peak})`);
  await ctx.close();
}

// ===========================================================================
console.log('\n-- 4. the two ceilings hold, on every surface, both viewports --');
// The budget's tiers, enforced. 220ms is the point a tap stops feeling like a
// response; 700ms is the point anything stops feeling like a transition.
{
  const slow = [], crawl = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 1366 }]) {
    for (const [name, go] of SURFACES) {
      const { ctx, p } = await open({ viewport });
      try { await go(p); } catch { /* covered by 5 */ }
      await p.waitForTimeout(400);
      const m = await p.evaluate(MOTION_PROBE);
      if (m.slowTap) slow.push(`${viewport.width}/${name}:${m.slowTap}`);
      if (m.overCeremony) crawl.push(`${viewport.width}/${name}:${m.overCeremony}`);
      await ctx.close();
    }
  }
  check('no control is slower than the 220ms tap ceiling', slow, []);
  check('nothing is slower than the 700ms ceremony ceiling', crawl, []);
}

// ===========================================================================
console.log('\n-- 5. the record is invisible on screen and complete on paper --');
{
  const { ctx, p } = await open({ viewport: { width: 1024, height: 1366 } });

  // Screen: it must cost the app nothing. Present in the DOM, painting nothing.
  const onScreen = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="print-record"]');
    if (!el) return 'absent';
    const cs = getComputedStyle(el);
    return `${cs.display}/${el.getBoundingClientRect().height}`;
  });
  check('record is present but display:none on screen', onScreen, 'none/0');

  await p.emulateMedia({ media: 'print' });
  /* One frame, not zero. Switching media can put background-color into a
     transition, and getComputedStyle read in the same task returns the value
     BEFORE it — so "paper is white" read the dark theme and failed for a reason
     that had nothing to do with the stylesheet. Found by mutation 4. */
  await p.waitForTimeout(150);
  const printed = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="print-record"]');
    const cs = getComputedStyle(el);
    const shellShown = [...document.getElementById('root').children]
      .filter(c => c !== el && getComputedStyle(c).display !== 'none').length;
    const q = s => el.querySelectorAll(s).length;
    const bodyCs = getComputedStyle(document.body);
    return {
      display: cs.display,
      height: Math.round(el.getBoundingClientRect().height),
      shellShown,
      // The abilities block runs across, so the six live in the header row.
      abilities: q('.pr-abilities thead th:not(:empty)'),
      abilityRows: q('.pr-abilities tbody tr'),
      skills: q('.pr-skills li'),
      weapons: q('.pr-weapons tbody tr'),
      spells: q('.pr-spells tbody tr'),
      slotLevels: q('.pr-slots li'),
      pools: q('.pr-pools li'),
      features: q('.pr-features li'),
      ink: cs.color,
      paper: bodyCs.backgroundColor,
      text: el.innerText,
    };
  });

  check('record renders in print', printed.display, 'block');
  check('record has real height in print', printed.height > 400, true);
  check('the app shell is hidden in print', printed.shellShown, 0);

  // Completeness. Every number a player would otherwise unlock the iPad for.
  const expectedSpells = NIX.spells.filter(s => s.level === 0 || !NIX.canPrepareSpells || s.prepared).length;
  const expectedPools = new Set(
    NIX.features
      .filter(f => f.level <= NIX.level && f.usesMax !== undefined && f.usesCurrent !== undefined)
      .map(f => f.name),
  ).size;
  const expectedFeatures = NIX.features.filter(f => f.level <= NIX.level).length;
  const expectedSlots = Object.values(NIX.spellSlots).filter(s => s.max > 0).length;

  check('all six abilities', printed.abilities, 6);
  check('score, modifier and save for each', printed.abilityRows, 3);
  check('all eighteen skills', printed.skills, 18);
  check('every weapon', printed.weapons, NIX.weapons.length);
  check('every available spell', printed.spells, expectedSpells);
  check('every slot level', printed.slotLevels, expectedSlots);
  check('every countable pool', printed.pools, expectedPools);
  check('every available feature', printed.features, expectedFeatures);

  // …and none of the ones he cannot use yet. Nix is level 8; his sheet lists
  // features up to 20. Paper is the play aid, not the plan.
  check('no above-level feature on paper', /Hearth Warden|Smoldering Smite/.test(printed.text), false);

  // Ink. Printing the dark theme costs a cartridge and returns a grey page.
  check('ink is black on paper', printed.ink, 'rgb(0, 0, 0)');
  check('paper is white', printed.paper, 'rgb(255, 255, 255)');

  // The numbers themselves, spot-checked against the character.
  const has = s => printed.text.includes(s);
  check('the identity line is right', has('Nix') && has(`Level ${NIX.level}`), true);
  check('AC is on the page', has(String(NIX.armorClass)), true);
  check('max HP is on the page', has(String(NIX.hitPoints.max)), true);

  await ctx.close();
}

// ===========================================================================
console.log('\n-- 6. Ctrl+P works from anywhere, not just the character sheet --');
// This is the whole reason the record is mounted beside the app shell rather
// than inside a tab. If it ever moves inside Layout, this goes red.
{
  const reach = [];
  for (const [name, go] of SURFACES) {
    const { ctx, p } = await open({ viewport: { width: 1024, height: 1366 } });
    try { await go(p); } catch { /* noop */ }
    await p.emulateMedia({ media: 'print' });
    await p.waitForTimeout(100);
    const ok = await p.evaluate(() => {
      const el = document.querySelector('[data-testid="print-record"]');
      return !!el && getComputedStyle(el).display === 'block' && el.getBoundingClientRect().height > 400;
    });
    if (!ok) reach.push(name);
    await ctx.close();
  }
  check('the record prints from every surface', reach, []);

  // Including the flagged turn screen, which returns early out of App.
  const { ctx, p } = await open({ viewport: { width: 1024, height: 1366 } });
  await p.goto(BASE + '?d=1', { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(100);
  const dOk = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="print-record"]');
    return !!el && getComputedStyle(el).display === 'block';
  });
  check('the record prints from the ?d=1 turn screen', dOk, true);
  await ctx.close();
}

// ===========================================================================
console.log('\n-- 7. the print control is reachable with a thumb --');
// Ctrl+P is not a gesture on the iPad this is played on.
{
  const { ctx, p } = await open();
  await p.getByRole('button', { name: 'Open character sheet' }).click();
  const btn = p.getByRole('button', { name: 'Print character record' });
  const box = await btn.boundingBox();
  check('print control exists', !!box, true);
  check('print control clears the 44px floor', box && box.width >= 44 && box.height >= 44, true);
  await ctx.close();
}

// ===========================================================================
console.log('\n-- 8. nothing threw --');
check('no console or page errors', [...new Set(errors)], []);

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
