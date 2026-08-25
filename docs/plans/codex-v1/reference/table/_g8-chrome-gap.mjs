/* G-8 — does the scroll box actually clear the fixed chrome, to the pixel?
   -----------------------------------------------------------------------------
   This asks ONE arithmetic question that does not depend on scroll state, page
   height, accordion animation, or any of the things that voided _g7 twice.

   Layout.tsx pins three boxes:
     header  `fixed top-0 inset-x-0 h-14 ... border-b`
     main    `fixed left-0 right-0 top-14 bottom-[calc(4rem+var(--turn-deck-h,0px)+env(safe-area-inset-bottom,0px))]`
     nav     `fixed bottom-0 inset-x-0 ... border-t`, whose INNER div is `h-16`

   Note the asymmetry, which is the reason to measure rather than assume:
     · `h-14` sits on the HEADER itself, and Tailwind preflight sets
       box-sizing:border-box, so the header's border-b is INSIDE its 56px and
       main's `top-14` (56px) meets it exactly.
     · `h-16` sits on the nav's INNER div, not on the nav. The nav has no height
       of its own, so its box is 64px of child plus its own 1px border-t = 65px,
       while main reserves `4rem` = 64px.

   If that reading is right the nav overlaps main's last painted pixel row, and
   a control whose centre lands in that row is covered with nowhere to scroll.
   If it is wrong, this prints so and nothing is changed on the strength of it.
   Either way it is read off getBoundingClientRect on the real build, not off
   the class names — this project has already shipped one fix aimed at a number
   that came from reading source instead of measuring it (A-41(b)).           */
import { chromium, serveDist, DIST, PHONE, TABLET, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

async function measure(browser, srv, viewport, dpr, name) {
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
  const rows = [];
  for (const s of SCREENS) {
    await goScreen(page, s);
    await settle(page);
    const m = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top * 100) / 100, bottom: Math.round(b.bottom * 100) / 100, h: Math.round(b.height * 100) / 100 }; };
      const header = document.querySelector('header.fixed');
      const main = document.querySelector('main');
      const nav = document.querySelector('nav[role="tablist"]');
      const deck = getComputedStyle(document.documentElement).getPropertyValue('--turn-deck-h').trim();
      return { header: r(header), main: r(main), nav: r(nav), deck: deck || '(unset)', vh: innerHeight };
    });
    if (!m.main || !m.nav) { console.log(`  ${s.id.padEnd(16)} main or nav absent — skipped`); continue; }
    /* Positive = the chrome eats into main's box. Negative = clearance. */
    const bottomOverlap = Math.round((m.main.bottom - m.nav.top) * 100) / 100;
    const topOverlap = m.header ? Math.round((m.header.bottom - m.main.top) * 100) / 100 : null;
    rows.push({ id: s.id, bottomOverlap, topOverlap });
    const bad = v => v > 0 ? `\x1b[31m+${v}px OVERLAP\x1b[0m` : `\x1b[32m${v}px\x1b[0m`;
    console.log(`  ${s.id.padEnd(16)} header.bottom=${m.header?.bottom} main.top=${m.main.top} → top ${topOverlap === null ? 'n/a' : bad(topOverlap)}`);
    console.log(`  ${''.padEnd(16)} main.bottom=${m.main.bottom} nav.top=${m.nav.top} nav.h=${m.nav.h} deck=${m.deck || '0px'} → bottom ${bad(bottomOverlap)}`);
  }
  console.log(`  ERROR FLOOR: ${errs.length ? [...new Set(errs)].join(' | ') : 'clean'}`);
  await ctx.close();
  return rows;
}

const srv = await serveDist(DIST, 5942);
const browser = await chromium.launch();
const p = await measure(browser, srv, PHONE, 3, 'phone');
const t = await measure(browser, srv, TABLET, 2, 'iPad');
await browser.close(); await srv.close();

const all = [...p.map(r => ({ ...r, vp: 'phone' })), ...t.map(r => ({ ...r, vp: 'iPad' }))];
const bottomBad = all.filter(r => r.bottomOverlap > 0);
const topBad = all.filter(r => r.topOverlap > 0);
console.log(`\n\x1b[1m${all.length} screen×viewport measurements\x1b[0m`);
console.log(`  bottom: ${bottomBad.length} where the tab bar overlaps main's box` + (bottomBad.length ? ` — by ${[...new Set(bottomBad.map(r => r.bottomOverlap))].join(', ')}px` : ''));
console.log(`  top:    ${topBad.length} where the header overlaps main's box` + (topBad.length ? ` — by ${[...new Set(topBad.map(r => r.topOverlap))].join(', ')}px` : ''));
/* This message used to read "…the h-16/border-t reading in this header is WRONG
   and nothing should be changed on it", which is only true on a build where the
   defect never existed. Run on the REPAIRED build it printed that the analysis
   was wrong at the moment the analysis had just been proven right and acted on —
   a grader stating the opposite of the truth on a green result. Zero overlap
   means either "no defect" or "defect fixed", and this file cannot tell them
   apart, so it now says exactly that instead of picking the flattering one. */
if (!bottomBad.length && !topBad.length)
  console.log('  \x1b[32mthe scroll box clears both bars on every screen×viewport pair.\x1b[0m'
    + '\n  This is the PASS state. It does not distinguish "never broken" from "fixed":'
    + '\n  the repaired build reserves 4rem+1px, and 4rem alone produced +1px on 12 of 14.');
process.exit(0);
