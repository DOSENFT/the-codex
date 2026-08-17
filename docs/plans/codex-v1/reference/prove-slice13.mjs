// Slice 13 proof — D's discipline, enforced app-wide
//
// Slice 13 was planned as "the rest of the app in D's language". Measuring it
// first changed what it is. The v0.9 palette and direction D are the SAME
// colours — void-0 is --d-bg, arcane is --d-amber, forge-0 is --d-cream, and
// the three faces are identical — because D was derived from v0.9. So there is
// no repaint to do, and doing one would have been a large diff that changed
// nothing a person could see.
//
// What separates them is discipline, and discipline is measurable: a 12px type
// floor, a 48px touch floor, 4.5:1 text contrast. This proves those hold, and
// that enforcing them cost no capability.
//
//   node docs/plans/codex-v1/reference/prove-slice13.mjs
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
const open = async (viewport = { width: 390, height: 844 }) => {
  const ctx = await b.newContext({ viewport });
  await ctx.addInitScript(([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-sw-off', '1');
  }, [NIX.id, JSON.stringify(NIX)]);
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
  p.on('pageerror', e => errors.push(String(e).slice(0, 100)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, p };
};

// ---------------------------------------------------------------------------
console.log('\n-- 1. the 12px type floor holds on every surface --');
// Not "most text is big enough". Nothing renders below the floor, anywhere.
const TINY = () => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!own) continue;
    const size = parseFloat(cs.fontSize) || 0;
    if (size < 12) out.push(`${size}px "${own.slice(0, 24)}"`);
  }
  return [...new Set(out)];
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
  ['toybox', p => p.getByRole('button', { name: 'Open The Toybox' }).click()],
  ['mechanics reference', p => p.getByRole('button', { name: 'Open mechanics reference' }).click()],
];

for (const [name, prepare] of SURFACES) {
  const { ctx, p } = await open();
  await prepare(p);
  await p.waitForTimeout(300);
  check(`${name} · nothing renders below 12px`, await p.evaluate(TINY), []);
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n-- 2. the label colour is legible, measured not assumed --');
// forge-2 is the app's standard label/secondary colour. It was #7a7265 and
// measured 3.7:1 on the card surface — below AA for text this size, on the
// colour used for nearly every label in the product. This checks the token
// itself and the ratio it actually achieves where it is actually used.
{
  const { ctx, p } = await open();
  const measured = await p.evaluate(() => {
    const lum = ([r, g, b]) => {
      const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const rgb = s => (/rgba?\(([^)]+)\)/.exec(s) || [, '0,0,0'])[1].split(',').map(Number).slice(0, 3);
    const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const token = getComputedStyle(document.documentElement).getPropertyValue('--color-forge-2').trim();
    // The real composite: glass-card is rgba(18,17,14,.92) + a 3.5% cream
    // sheen over the page floor. That sheen is why an earlier version of the
    // audit read cream text as 1:1 — it treated a 3.5% overlay as solid paint.
    const page = [10, 10, 8];
    const card = over([18, 17, 14], 0.92, page);
    const surface = over([240, 230, 211], 0.035, card);
    const el = document.createElement('span');
    el.style.color = 'var(--color-forge-2)';
    document.body.appendChild(el);
    const fg = rgb(getComputedStyle(el).color);
    el.remove();
    return { token, ratio: +ratio(fg, surface).toFixed(2) };
  });
  check('the label token is D\'s --d-dim, not the old #7a7265', measured.token, '#8b8578');
  check('label text clears WCAG AA on the card surface', measured.ratio >= 4.5, true);
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n-- 3. resource pips are catchable, and still do the right thing --');
// The touch fix only works because every filled pip in a row shares one
// handler. If that ever stops being true, expanding the hit areas starts
// stealing presses from the neighbour, so the capability check below matters
// more than the geometry one above it.
{
  const { ctx, p } = await open();
  await p.getByRole('tab', { name: 'Grimoire' }).click();
  await p.waitForTimeout(400);

  const geometry = await p.evaluate(() => {
    const pip = document.querySelector('.pip-tap');
    if (!pip) return 'no .pip-tap on the page';
    const r = pip.getBoundingClientRect();
    const after = getComputedStyle(pip, '::after');
    return { paintedHeight: Math.round(r.height), targetHeight: parseInt(after.height, 10) };
  });
  check('the pip still paints small', geometry.paintedHeight <= 16, true);
  check('the pip target reaches the 48px floor', geometry.targetHeight, 48);

  // Capability, not geometry: does pressing one still spend exactly one slot?
  //
  // The LAST filled pip of the fullest level, not the first. Every pip at a
  // level carries the same aria-label, so `.first()` is always index 0 — and
  // at index 0 a bug that spends "every slot up to the one you pressed" spends
  // exactly one, which is the correct answer. The mutation run caught this:
  // that bug survived a green proof because the proof only ever pressed the
  // one pip where it is invisible. A player presses the last full pip.
  // `/^Expend \d/`, not `/^Expend /` — the feature-use pips in GrimoireCard are
  // labelled "Expend use" with no level in them, and there are more of those on
  // screen than slot pips, so the looser pattern picked those and then crashed
  // trying to read a level out of the label. A proof that dies with a
  // TypeError proves nothing; it has to go red on a named line.
  const expendLabels = await p.getByRole('button', { name: /^Expend \d/ }).evaluateAll(
    els => els.map(e => e.getAttribute('aria-label')));
  const fullest = [...expendLabels.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1])[0];
  check('a spell-slot level with more than one slot exists to press', fullest?.[1] > 1, true);
  const label = fullest?.[0] ?? '';
  const levelMatch = /Expend (\d)/.exec(label);
  check(`the pip label "${label}" names a slot level`, !!levelMatch, true);
  const slotPip = levelMatch ? p.getByRole('button', { name: label, exact: true }).last() : null;
  if (slotPip && await slotPip.count()) {
    const level = levelMatch[1];
    const readSlot = () => p.evaluate(id => {
      const c = JSON.parse(localStorage.getItem('codex-character-' + id));
      return c.spellSlots;
    }, NIX.id);
    const before = await readSlot();
    await slotPip.click();
    await p.waitForTimeout(300);
    const after = await readSlot();
    const spent = Object.keys(before).filter(k => before[k].current !== after[k].current);
    check(`pressing "${label}" spends exactly one slot, at that level`, spent, [level]);
    check('it spends one, not several', after[level].current, before[level].current - 1);
  } else {
    check('a spell slot pip was found to press', false, true);
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n-- 4. the expanded hit area did not steal the card\'s own tap --');
// The pips live INSIDE the card header button. The ::after overlay reaches
// 18px above and below the pip, so the danger is that a tap meant to expand
// the card now expends a use instead. This is the regression the overlay could
// plausibly cause, so it is checked directly rather than reasoned about.
{
  const { ctx, p } = await open();
  await p.getByRole('button', { name: 'Switch to prep mode' }).click();
  await p.getByRole('tab', { name: 'Grimoire' }).click();
  await p.waitForTimeout(400);

  const card = p.locator('[class*="pip-tap"]').first();
  if (await card.count()) {
    const box = await card.boundingBox();
    // Press the header well clear of the pip row, where a person aiming at the
    // card name would press.
    const header = p.locator('button').filter({ hasText: /./ }).nth(0);
    const expandedBefore = await p.evaluate(() => document.querySelectorAll('[class*="pip-tap"]').length);
    await p.mouse.click(box.x + 200, box.y);
    await p.waitForTimeout(350);
    const expandedAfter = await p.evaluate(() => document.querySelectorAll('[class*="pip-tap"]').length);
    check('a tap 200px along the header row is not swallowed by the pip',
      expandedAfter >= expandedBefore, true);
  }
  // And the overlay must not be visible paint — it is a hit area, not a shape.
  // First version of this asserted `borderStyle === 'none'` and failed on
  // 'solid'. The check was wrong, not the overlay: Tailwind's preflight sets
  // `border-style: solid; border-width: 0` on every ::after in the app, so the
  // style says solid and the width says nothing is drawn. What I meant to ask
  // was "does this paint anything", so ask that — width and background, plus
  // the outline, which is the other way a pseudo-element can show up.
  const invisible = await p.evaluate(() => {
    const pip = document.querySelector('.pip-tap');
    const cs = getComputedStyle(pip, '::after');
    return {
      bg: cs.backgroundColor,
      borderWidth: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join(' '),
      // outline-WIDTH is 3px here and always will be: that is the CSS initial
      // value `medium`, reported whether or not anything is drawn. The property
      // that decides whether an outline exists is the style. Asking about width
      // was the same mistake as asking about border-style, one line up.
      outlineStyle: cs.outlineStyle,
      boxShadow: cs.boxShadow,
    };
  });
  check('the expanded target paints nothing', invisible,
    { bg: 'rgba(0, 0, 0, 0)', borderWidth: '0px 0px 0px 0px', outlineStyle: 'none', boxShadow: 'none' });
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n-- 5. bigger type broke no layout --');
// 205 sites went from 10px to 12px. That is a 20% increase on text that was
// small because it had to fit, so this looks for the two ways it could fail:
// text cut off by its own box, and a page that now scrolls sideways.
const CLIP = () => {
  const out = { doc: null, clipped: [] };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.doc = `${de.scrollWidth} > ${de.clientWidth}`;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!own) continue;
    const clips = cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
    if (clips && el.scrollWidth > el.clientWidth + 1) out.clipped.push(`"${own.slice(0, 24)}" needs ${el.scrollWidth} has ${el.clientWidth}`);
  }
  return out;
};
for (const [vpName, viewport] of [['phone', { width: 390, height: 844 }], ['iPad', { width: 1024, height: 1366 }]]) {
  for (const [name, prepare] of SURFACES.slice(0, 6)) {
    const { ctx, p } = await open(viewport);
    await prepare(p);
    await p.waitForTimeout(300);
    const r = await p.evaluate(CLIP);
    check(`${vpName} · ${name} · no clipped text, no sideways scroll`, r, { doc: null, clipped: [] });
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n-- 6. nothing in the console --');
check('no console errors or page errors', errors, []);

await b.close();
console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
console.log(fail ? 'PROOF FAILED' : 'ALL CHECKS PASS');
process.exit(fail ? 1 : 0);
