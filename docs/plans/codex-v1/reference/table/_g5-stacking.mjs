/* G-5 — WHY is a z-51 dialog underneath a z-44 button?
   -----------------------------------------------------------------------------
   `_g5-trapped-overlay.mjs` found three controls in the combat Quick Lookup
   sheet that hit-test to `button.veil-btn` (z-index 44) and to the dice FAB
   (`fixed z-50 right-4`). The sheet's own panel is `zIndex: z + 1` = 51, set in
   ui/Sheet.tsx. 51 is greater than 44 and greater than 50, so on the flat
   reading of the numbers this cannot happen — which is the tell that the
   numbers are not being compared in one context.

   This file does not assume the answer. It walks from the sheet panel up to
   `<html>` and prints, for every ancestor, the properties that create a
   stacking context, so the containing context is read off the page rather than
   recalled: whichever ancestor creates one is the box the panel's 51 is
   measured inside, and the veil button's 44 is measured against THAT box's own
   level, not against 51.

   Run: node docs/plans/codex-v1/reference/table/_g5-stacking.mjs             */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5934);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

const combat = SCREENS.find(s => s.id === 'play/Combat');
await goScreen(page, combat); await settle(page);
await page.locator('button:has-text("Start Combat")').first().click();
await page.waitForTimeout(800); await settle(page);
await page.locator('[aria-label="Quick lookup"]').first().click();
await page.waitForTimeout(600); await settle(page);

const report = await page.evaluate(() => {
  const desc = e => e.tagName.toLowerCase() +
    (e.id ? '#' + e.id : '') +
    (e.className && typeof e.className === 'string'
      ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');

  /* The properties that create a stacking context, as the spec lists them and
     as this app could plausibly trip: a positioned element with a z-index that
     is not `auto`; any fixed or sticky element; opacity < 1; transform, filter,
     backdrop-filter, perspective, clip-path, mask; will-change on any of those;
     isolation:isolate; contain:paint/layout; and a flex/grid CHILD with a
     z-index. Only the ones actually true are printed, so the output is the
     evidence and not a checklist. */
  const why = el => {
    const s = getComputedStyle(el), out = [];
    const pos = s.position, z = s.zIndex;
    if (pos === 'fixed') out.push('position:fixed');
    if (pos === 'sticky') out.push('position:sticky');
    if (z !== 'auto' && /relative|absolute/.test(pos)) out.push(`position:${pos} + z-index:${z}`);
    if (parseFloat(s.opacity) < 1) out.push(`opacity:${s.opacity}`);
    if (s.transform !== 'none') out.push(`transform:${s.transform.slice(0, 40)}`);
    if (s.filter !== 'none') out.push(`filter:${s.filter.slice(0, 40)}`);
    if (s.backdropFilter && s.backdropFilter !== 'none') out.push(`backdrop-filter:${s.backdropFilter.slice(0, 30)}`);
    if (s.perspective !== 'none') out.push('perspective');
    if (s.clipPath !== 'none') out.push('clip-path');
    if (s.mixBlendMode !== 'normal') out.push(`mix-blend-mode:${s.mixBlendMode}`);
    if (s.isolation === 'isolate') out.push('isolation:isolate');
    if (/paint|layout|content|strict/.test(s.contain)) out.push(`contain:${s.contain}`);
    if (/transform|opacity|filter/.test(s.willChange)) out.push(`will-change:${s.willChange}`);
    return out;
  };

  /* Every open dialog is listed, with its label and z, before one is chosen —
     the first version of this file took `querySelector`'s first match and
     printed a z-index that did not match the one QuickLookup passes (55 → 56),
     which is exactly the sort of near-miss that gets waved through. If the
     label does not say which sheet was measured, the measurement is not
     evidence about that sheet. */
  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .map(d => ({ label: d.getAttribute('aria-label'), z: getComputedStyle(d).zIndex, el: desc(d) }));
  const panel = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .find(d => /lookup/i.test(d.getAttribute('aria-label') || ''));
  if (!panel) return { found: false, dialogs };

  const chain = [];
  for (let e = panel; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    chain.push({ el: desc(e), z: s.zIndex, pos: s.position, creates: why(e) });
  }

  const veil = document.querySelector('button.veil-btn');
  const fab = document.querySelector('button.fixed.z-50.right-4') ||
              [...document.querySelectorAll('button')].find(b => /z-50/.test(b.className) && /right-4/.test(b.className));

  const outsideOf = (el, ctxEl) => !!el && !!ctxEl && !ctxEl.contains(el);

  /* The context the panel's z-index is actually resolved in: the nearest
     ancestor above it that creates one. */
  const ctxIdx = chain.findIndex((c, i) => i > 0 && c.creates.length);
  const ctxEl = ctxIdx >= 0 ? [...(function* () { let e = panel; while (e) { yield e; e = e.parentElement } })()][ctxIdx] : null;

  return {
    found: true,
    dialogs,
    panelLabel: panel.getAttribute('aria-label'),
    panelZ: getComputedStyle(panel).zIndex,
    chain,
    context: ctxIdx >= 0 ? { el: chain[ctxIdx].el, z: chain[ctxIdx].z, creates: chain[ctxIdx].creates } : null,
    veil: veil ? { z: getComputedStyle(veil).zIndex, outsideContext: outsideOf(veil, ctxEl) } : null,
    fab: fab ? { el: desc(fab), z: getComputedStyle(fab).zIndex, outsideContext: outsideOf(fab, ctxEl) } : null,
  };
});

if (!report.found) {
  console.log('!! no Quick Lookup dialog found — nothing measured, and this file reports nothing rather than a guess.');
  console.log('   dialogs present:', JSON.stringify(report.dialogs));
} else {
  console.log(`dialogs open: ${report.dialogs.map(d => `"${d.label}" z=${d.z}`).join(' · ')}`);
  console.log(`measuring: "${report.panelLabel}"  z-index: ${report.panelZ}\n`);
  console.log('ancestor chain, panel → html (★ = creates a stacking context):');
  for (const c of report.chain) {
    console.log(`  ${c.creates.length ? '\x1b[33m★\x1b[0m' : ' '} ${c.el.padEnd(48)} pos=${c.pos.padEnd(8)} z=${String(c.z).padEnd(6)} ${c.creates.join(', ')}`);
  }
  console.log('');
  if (report.context) {
    console.log(`\x1b[33mThe panel's z-index ${report.panelZ} is resolved INSIDE <${report.context.el}> (z=${report.context.z}).\x1b[0m`);
    console.log(`That box, not the panel, is what competes with anything outside it — because of: ${report.context.creates.join(', ')}`);
  } else {
    console.log('No ancestor creates a stacking context — the panel competes at the root, and this is NOT the explanation.');
  }
  console.log('');
  if (report.veil) console.log(`button.veil-btn      z=${report.veil.z}   outside that context: ${report.veil.outsideContext}`);
  if (report.fab) console.log(`${report.fab.el}   z=${report.fab.z}   outside that context: ${report.fab.outsideContext}`);
}
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
