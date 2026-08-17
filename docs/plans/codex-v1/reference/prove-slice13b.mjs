// Slice 13b proof — the floors, corrected
//
// Slice 13 enforced D's floors as written. Slice 13b measured what that
// actually cost and found two of the numbers were wrong for this app:
//
//   · 1742 "touch failures", of which 1484 were elements sitting at 44-47px —
//     the Apple HIG floor, applied deliberately across the whole product.
//     Forcing them to 48 would have reflowed every dense layout to satisfy a
//     number rather than a thumb. The floor is now 44 (enforced) with 48 as a
//     goal for primary controls.
//   · 778 "Cinzel too small", of which 600 came from ONE base rule making every
//     h1-h6 a display serif by HTML semantics rather than by role. A dense
//     reference list correctly uses <h3> fifty times; none of those are
//     ceremony.
//
// So this file proves three things that a class-level check cannot: that the
// enforced floor actually holds on the controls that were broken, that Cinzel
// retreated to the top of the hierarchy WITHOUT abandoning the places it
// belongs (the non-degradation half — this is the check that stops the fix
// from becoming a de-serifing of the whole product), and that the skill dot's
// enlarged hit area stops at its own row.
//
// That last one is the one worth reading. Unlike a spell pip — where every
// filled pip at a level calls the same handler, which is what made overlapping
// hit areas harmless — each skill dot cycles a DIFFERENT skill. If the area
// spills into the row above, a press sets the wrong proficiency, and the player
// will not find out until a roll is already wrong at the table.
//
//   node docs/plans/codex-v1/reference/prove-slice13b.mjs
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
    localStorage.setItem('codex-app-mode', 'session');
  }, [NIX.id, JSON.stringify(NIX)]);
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
  p.on('pageerror', e => errors.push(String(e).slice(0, 100)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, p };
};

// ── 1. the controls that were under the floor now reach it ──────────────────
console.log('\n1. the named sub-44px controls reach the enforced floor');
{
  const { ctx, p } = await open();
  // The mode toggle is the most-pressed control in the app and it measured
  // 30px. Its container carries a 1px border, so h-11 alone produced a 42px
  // button — proving the floor on the CONTAINER would have passed while the
  // thing a thumb actually hits was still short. Measure the button.
  for (const label of ['Switch to prep mode', 'Open character sheet']) {
    const box = await p.getByRole('button', { name: label }).first().boundingBox();
    check(`"${label}" is at least 44px tall`, box && Math.round(box.height) >= 44, true);
  }
  await ctx.close();
}

// ── 2. Cinzel retreated to ceremony, and stayed there ───────────────────────
console.log('\n2. Cinzel is claimed by the top of the hierarchy only');
{
  const { ctx, p } = await open();
  await p.getByRole('button', { name: 'Open mechanics reference' }).click();
  await p.waitForTimeout(400);

  const fonts = await p.evaluate(() => {
    const fam = el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const h3 = [...document.querySelectorAll('h3')];

    // The default is tested by INJECTING bare headings rather than by looking
    // for real ones. The first version of this check read the h1/h2 already on
    // screen, and every one of them carried an explicit `font-display` class —
    // so deleting the base rule outright changed nothing it could see and the
    // check passed while the product silently lost its display face. Two real
    // headings do rely on the default (ResourceLedger's section heading and the
    // Veil title) but neither is on this surface, and a proof that depends on
    // which components happen to be mounted is a proof that will go vacuous
    // again the next time a layout moves. A bare element cannot.
    const probe = tag => {
      const el = document.createElement(tag);
      el.textContent = 'probe';
      document.body.appendChild(el);
      const f = fam(el);
      el.remove();
      return f;
    };

    return {
      h3Count: h3.length,
      h3Cinzel: h3.filter(e => fam(e) === 'Cinzel' && !e.className.includes('font-display')).length,
      bareH2: probe('h2'),
      bareH3: probe('h3'),
    };
  });

  // The list headings exist and are no longer a display serif by accident.
  check('the reference list renders many <h3> headings', fonts.h3Count > 5, true);
  check('no <h3> inherits Cinzel without asking for it', fonts.h3Cinzel, 0);
  check('a bare <h3> does not default to Cinzel', fonts.bareH3 === 'Cinzel', false);

  // The non-degradation half. Without this, deleting the base rule entirely
  // would pass the checks above and quietly strip the display face from every
  // title in the product.
  check('a bare <h2> still defaults to Cinzel', fonts.bareH2, 'Cinzel');
  await ctx.close();
}

// ── 3. the skill dot's hit area stops at its own row ────────────────────────
console.log('\n3. the enlarged skill dot cannot toggle its neighbour');
{
  const { ctx, p } = await open({ width: 1024, height: 1366 });
  await p.getByRole('button', { name: 'Switch to prep mode' }).click();
  await p.getByRole('tab', { name: 'Character' }).click();
  await p.waitForTimeout(500);

  const dots = p.getByRole('button', { name: /Tap to change\.$/ });
  const n = await dots.count();
  check('the skill list rendered its proficiency dots', n > 2, true);

  if (n > 2) {
    const geom = await dots.evaluateAll(els => els.slice(0, 3).map(e => {
      const r = e.getBoundingClientRect();
      const a = getComputedStyle(e, '::after');
      return { top: r.top, bottom: r.bottom, h: parseFloat(a.height) || 0, label: e.getAttribute('aria-label') };
    }));

    check('the dot still paints small', Math.round(geom[0].bottom - geom[0].top), 24);
    check('its hit area reaches the 44px floor', geom[0].h >= 44, true);

    // The safety claim, measured rather than asserted. Row pitch is the
    // distance between two dot centres (56px here); each area is centred on
    // its own dot, so two neighbouring areas touch exactly when the area
    // height equals the pitch.
    //
    // The first version of this check asked `h / 2 < pitch`, which is the
    // wrong question — it permits an area of up to 112px, i.e. one that
    // overlaps its neighbour completely, and it let a 96px mutation through.
    // The property worth having is that the areas do not overlap AT ALL.
    const c0 = (geom[0].top + geom[0].bottom) / 2;
    const c1 = (geom[1].top + geom[1].bottom) / 2;
    const pitch = Math.abs(c1 - c0);
    check('rows are far enough apart to measure', pitch > 0, true);
    check('the hit area does not overlap the next skill\'s', geom[0].h <= pitch, true);

    // And the behavioural version of the same claim: pressing the very top of
    // the second dot's area must change the SECOND skill, not the first.
    const before = await dots.evaluateAll(els => els.slice(0, 3).map(e => e.getAttribute('aria-label')));
    const box = await dots.nth(1).boundingBox();
    await p.mouse.click(box.x + box.width / 2, box.y - 8); // 8px above the painted dot
    await p.waitForTimeout(300);
    const after = await dots.evaluateAll(els => els.slice(0, 3).map(e => e.getAttribute('aria-label')));

    const changed = before.map((v, i) => v !== after[i]);
    check('a press just above the dot still lands on that dot', changed[1], true);
    check('it did not also change the skill above it', changed[0], false);
    check('it did not change the skill below it', changed[2], false);
  }
  await ctx.close();
}

// ── 4. nothing regressed into the console ───────────────────────────────────
console.log('\n4. clean console');
check('no console errors or page errors', errors, []);

await b.close();
console.log(`\n${pass} passed${fail ? `, ${fail} FAILED` : ''}`);
console.log(fail ? 'FAILURES' : 'ALL CHECKS PASS');
process.exit(fail ? 1 : 0);
