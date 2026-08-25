/* Proving the Button.tsx change did what it claims and nothing else.

   Three questions, because "it builds" is not evidence:
   1. Does a DISABLED button now resolve to itself under elementFromPoint?
      (the V-6b defect)
   2. Does a disabled button still refuse to fire its onClick?
      (the seal — if this regressed, the fix is worse than the bug)
   3. Do the `enabled:hover:` rewrites leave the disabled paint identical to
      what a `pointer-events-none` button used to show? Tailwind must have
      emitted `:enabled:hover` selectors, not dropped them silently. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen,
         SCREENS, freshCtx } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4309);
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: srv.url, viewport: PHONE });
await importFile(page, realCopy('full'));

await goScreen(page, SCREENS.find(s => s.id === 'prep/Persona'));
await settle(page);

const r = await page.evaluate(() => {
  const out = { probed: [], cssHasEnabledHover: false, clickFired: null };
  /* Tailwind 4 wraps every utility in `@layer utilities { ... }`, so the top
     level of `sh.cssRules` is a single CSSLayerBlockRule and a flat loop sees
     no selectors at all. The first version of this probe did exactly that and
     reported "false" for a rule that is present — walk the tree. */
  out.enabledHoverSelectors = [];
  const walk = rules => { for (const rule of rules || []) {
    if (rule.selectorText && /:enabled/.test(rule.selectorText) && /:hover|:active/.test(rule.selectorText))
      out.enabledHoverSelectors.push(rule.selectorText.slice(0, 70));
    if (rule.cssRules) walk(rule.cssRules);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
  out.cssHasEnabledHover = out.enabledHoverSelectors.length > 0;
  const adds = [...document.querySelectorAll('button[aria-label^="Add to"]')];
  for (const el of adds.slice(0, 3)) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const cs = getComputedStyle(el);
    out.probed.push({
      label: el.getAttribute('aria-label'),
      disabled: el.disabled,
      resolvesToSelf: top === el || el.contains(top),
      topWas: top ? top.tagName.toLowerCase() + '.' + String(top.className).split(/\s+/).slice(0, 2).join('.') : 'null',
      pointerEvents: cs.pointerEvents,
      cursor: cs.cursor,
      color: cs.color, bg: cs.backgroundColor, border: cs.borderColor,
    });
  }
  /* Does a disabled button still refuse to act?
     The first version of this asked with `t.click()` AND a manual
     `dispatchEvent(new MouseEvent('click'))` and reported the OR of the two.
     dispatchEvent is a programmatic dispatch — it bypasses `disabled` by
     definition and would fire on any element alive or dead, so the probe was
     guaranteed to say "fired" no matter what the app did. Ask only the
     question a finger can ask. */
  const t = adds.find(e => e.disabled);
  if (t) {
    let fired = false;
    t.addEventListener('click', () => { fired = true; }, { once: true });
    t.click();                 // synthetic activation — must be a no-op on :disabled
    out.clickFired = fired;
    const rect = t.getBoundingClientRect();
    out.hitTarget = [Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2)];
  }
  return out;
});

console.log('css emitted :enabled:hover rules :', r.cssHasEnabledHover);
for (const s of (r.enabledHoverSelectors || [])) console.log('   ' + s);
console.log('disabled .click() fired handler  :', r.clickFired, '  (must be false)');

/* And the question only a real input event can answer: does a genuine tap at
   the centre of a disabled button reach anything at all? Before the change it
   fell through to the row wrapper. */
if (r.hitTarget) {
  await page.evaluate(() => { window.__leak = [];
    document.addEventListener('click', e => window.__leak.push(
      e.target.tagName + '.' + String(e.target.className).split(/\s+/)[0]), true); });
  await page.mouse.click(r.hitTarget[0], r.hitTarget[1]);
  await page.waitForTimeout(150);
  const leak = await page.evaluate(() => window.__leak);
  console.log(`real tap at ${r.hitTarget}  → listeners reached: ${leak.length ? leak.join(', ') : 'NONE'}`);
}
for (const p of r.probed) {
  console.log(`\n«${p.label}»  disabled=${p.disabled}`);
  console.log(`   resolvesToSelf=${p.resolvesToSelf}   elementFromPoint → ${p.topWas}`);
  console.log(`   pointer-events=${p.pointerEvents}  cursor=${p.cursor}`);
  console.log(`   color=${p.color}  bg=${p.bg}  border=${p.border}`);
}

await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await settle(page);
await page.screenshot({ path: 'shot-combat-390.png' });
await goScreen(page, SCREENS.find(s => s.id === 'prep/Persona'));
await settle(page);
await page.screenshot({ path: 'shot-persona-390.png' });

await ctx.close(); await b.close(); await srv.close();
console.log('\nscreenshots written');
