/* G-9 — WHERE is an occluded control, at the exact instant V-6b calls it occluded?
   -----------------------------------------------------------------------------
   _g7 tried twice to classify the twelve V-6b/V-6c findings by sweeping scroll
   offsets, and was voided twice — once for driving the wrong scroller, once on a
   falsification condition built on a false premise about position:fixed. Both
   failures share a cause: the sweep reproduced a DIFFERENT page state than V-6b
   grades in. prep/Grimoire measured 3010px of scroll room in one revision and
   1437px in the next, on the same build, because the accordions had settled
   differently.

   So this file stops sweeping. It reproduces V-6b's setup EXACTLY — the same
   scrollOrThrow(at) three times with settle() between, which is what families.mjs
   does and why it does it — and then asks one geometric question at that single
   frozen instant:

     Where is the control's rectangle, relative to <main>'s box?

   There are only a few possible answers and they mean different things:

     STRADDLES-FOLD   r.top < main.bottom < r.bottom, and the centre is below
                      main.bottom. The control is the item at the fold: half of
                      it is clipped by its own scroller, its geometric centre
                      lands outside the painted region, and elementFromPoint
                      there returns whatever fixed chrome is behind. This is
                      ordinary scrolling-list behaviour, and if it is the answer
                      then V-6b is reporting the fold, not a defect.
     INSIDE           the whole rectangle is within main's box and the centre is
                      still not the control. Something is genuinely painted on
                      top. That IS a defect.
     OUTSIDE          the rectangle is wholly outside main's box.

   The prediction, stated before the run so it cannot be fitted afterwards: if
   the fold explanation is right, the phone's five `nav.fixed.bottom-0` findings
   are STRADDLES-FOLD at main.bottom, and the iPad's four `header.fixed.top-0`
   findings are the same thing at the TOP edge (r.top < main.top < r.bottom with
   the centre above main.top). The two findings whose coverer is not page chrome
   — prep/Persona `button.fixed.z-50` and prep/Academy `span.text-xs.font-mo` —
   should come back INSIDE, because a floating button and a sibling span are not
   the fold and cannot be explained by it.

   If the two non-chrome findings come back STRADDLES-FOLD, the fold explanation
   has swallowed cases it should not and this file is void like the last two.
   If the chrome findings come back INSIDE, the fold explanation is simply wrong.
   Either way it is written down first.                                        */
import { chromium, serveDist, DIST, PHONE, TABLET, SCREENS, goScreen, settle, importFile, scrollOrThrow } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"]),[onclick]';

/* V-6b's own occlusion test, plus the geometry it never records. */
const PROBE = () => {
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const main = document.querySelector('main');
  const mb = main.getBoundingClientRect();
  const out = [];
  for (const el of document.querySelectorAll(SEL_)) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') <= 0.05) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight)) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!(cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight)) continue;
    const top = document.elementFromPoint(cx, cy);
    if (!top || top === el || el.contains(top)) continue;   // not occluded — V-6b's test

    const inMain = main.contains(el);
    let where;
    if (!inMain) where = 'NOT-IN-MAIN';
    else if (r.top < mb.bottom && r.bottom > mb.bottom && cy >= mb.bottom) where = 'STRADDLES-FOLD-BOTTOM';
    else if (r.top < mb.top && r.bottom > mb.top && cy <= mb.top) where = 'STRADDLES-FOLD-TOP';
    else if (r.top >= mb.top && r.bottom <= mb.bottom) where = 'INSIDE';
    else where = 'OUTSIDE';

    out.push({
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 44),
      where, coverer: desc(top),
      rect: `${Math.round(r.top)}..${Math.round(r.bottom)}`, cy: Math.round(cy),
      mainBox: `${Math.round(mb.top)}..${Math.round(mb.bottom)}`,
      /* How far the centre is past the edge it is past. 0 or negative would mean
         the classification above is not doing what its name says. */
      pastBy: cy >= mb.bottom ? Math.round(cy - mb.bottom) : cy <= mb.top ? Math.round(mb.top - cy) : 0,
    });
  }
  return out;
};

async function run(browser, srv, viewport, dpr, name) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, hasTouch: true, isMobile: viewport === PHONE });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);

  console.log(`\n\x1b[1m${name}  ${viewport.width}×${viewport.height}\x1b[0m`);
  const found = [];
  for (const s of SCREENS) {
    await goScreen(page, s);
    await settle(page);
    for (const at of ['top', 'bottom']) {
      /* Verbatim from families.mjs: three rounds, settle between, so the
         accordions have stopped growing and "the bottom" has stopped moving. */
      for (let k = 0; k < 3; k++) { await scrollOrThrow(page, at, `${s.id} @${at}`); await settle(page); }
      const res = await page.evaluate(`(${PROBE.toString().replace(/SEL_/g, JSON.stringify(SEL))})()`);
      for (const r of res) { found.push({ ...r, sid: s.id, at, vp: name }); }
    }
  }
  const C = { 'STRADDLES-FOLD-BOTTOM': '\x1b[33m', 'STRADDLES-FOLD-TOP': '\x1b[33m', INSIDE: '\x1b[31m', OUTSIDE: '\x1b[35m', 'NOT-IN-MAIN': '\x1b[35m' };
  for (const f of found) {
    console.log(`  ${C[f.where] || ''}${f.where.padEnd(22)}\x1b[0m ${f.sid} @${f.at}  «${f.label}»`);
    console.log(`      rect y ${f.rect}, centre ${f.cy} · main ${f.mainBox} · centre past the edge by ${f.pastBy}px · covered by ${f.coverer}`);
  }
  console.log(`  ERROR FLOOR: ${errs.length ? [...new Set(errs)].join(' | ') : 'clean'}`);
  await ctx.close();
  return found;
}

const srv = await serveDist(DIST, 5943);
const browser = await chromium.launch();
const p = await run(browser, srv, PHONE, 3, 'phone');
const t = await run(browser, srv, TABLET, 2, 'iPad');
await browser.close(); await srv.close();

const all = [...p, ...t];
const tally = {};
for (const f of all) tally[f.where] = (tally[f.where] || 0) + 1;
console.log(`\n\x1b[1m${all.length} occluded control(s) located\x1b[0m`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

/* The two predictions from the header, checked by the file, not by me. */
const nonChrome = all.filter(f => /button\.fixed|span\.text-xs/.test(f.coverer));
const chrome = all.filter(f => /nav\.fixed|header\.fixed|button\.relative\.flex-1|button\.flex\.items-center/.test(f.coverer));
const badNonChrome = nonChrome.filter(f => f.where.startsWith('STRADDLES'));
const badChrome = chrome.filter(f => f.where === 'INSIDE');
console.log(`\n\x1b[1mpredictions, stated in the header before this ran\x1b[0m`);
console.log(`  chrome-covered findings should STRADDLE a fold: ${chrome.length - badChrome.length}/${chrome.length} do`);
console.log(`  non-chrome-covered findings should be INSIDE:    ${nonChrome.length - badNonChrome.length}/${nonChrome.length} are`);
if (badNonChrome.length || badChrome.length) {
  console.log(`\n\x1b[31mVOID — the fold explanation does not hold: ${badNonChrome.length} non-chrome finding(s) straddle a fold, ${badChrome.length} chrome finding(s) are INSIDE.`);
  console.log(`No mechanism is claimed. V-6b/V-6c stand at FAIL, 12 findings, unexplained.\x1b[0m`);
  process.exit(2);
}
console.log(`  \x1b[32mboth held\x1b[0m`);
const real = all.filter(f => f.where === 'INSIDE');
console.log(`\n\x1b[1m${real.length} of ${all.length} are controls genuinely painted over inside the scroll box — the rest are the item at the fold.\x1b[0m`);
for (const f of real) console.log(`  ${f.vp} ${f.sid} @${f.at}  «${f.label}»  covered by ${f.coverer}`);
console.log('\nV-6b and V-6c remain FAIL. This locates the findings; it does not reclassify the criterion.');
process.exit(0);
