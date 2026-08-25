/* G-5 — `bgOf` composites translucent layers with the wrong formula.
   -----------------------------------------------------------------------------
   THE BUG. rig.mjs:395 accumulates the background stack like this:

       acc = { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) }

   `over(fg, bg, a) = fg*a + bg*(1-a)` weights the BACK layer by (1 - acc.a) and
   never multiplies it by that layer's OWN alpha. So a back layer painted at 6 %
   is mixed in as if it were opaque. The alpha channel is accumulated correctly
   on the very next expression, which is what makes it hard to see: the formula
   knows the layer is 6 % for the purposes of alpha and forgets it for the
   purposes of colour.

   Correct source-over of a front composite (acc, aa) onto a back layer (c, ac):

       na  = aa + ac*(1 - aa)
       rgb = (acc*aa + c*ac*(1 - aa)) / na

   It is only wrong when a TRANSLUCENT layer sits behind another translucent
   layer, which is why it survived: most of this app paints ink on one tint on an
   opaque ground, and with ac = 1 the two formulas are identical.

   WHAT IT COST. prep/Persona's accordion count badges are `bg-void-2/60` inside
   a `bg-white/[0.04]` button on `bg-void-0`. The 4 % white is composited as
   FULL white, the ground comes out at rgb(78,77,74) instead of rgb(27,26,22),
   and the run of record failed V-2 on «14» 4.15:1, «21» 4.17:1 and «4» 4.17:1.
   The painted-pixel reader put the same three nodes at 8.65–8.82:1, and pure
   arithmetic outside the browser puts them at 8.86:1. Two independent
   instruments against one, and the one is the one with the derivable error.

   WHY THIS IS NOT SOFTENING. It turns three reds green, which is the direction
   that must never be taken on faith, so nothing here is taken on faith:

     · the two versions differ by ONE expression. This file does not re-implement
       AUDIT_DOM; it takes the real one, string-replaces that single expression,
       asserts the match was unique, and runs both. Any delta is caused by that
       line or by nothing.
     · every node whose verdict CHANGES is printed — in both directions. A fix
       to a compositor can invent new failures as easily as it can clear old
       ones, and if this one does, those are real defects and they are listed.
     · every changed node is arbitrated by the painted-pixel reader, which shares
       no code with either formula.

   If the corrected formula disagrees with the pixels, it does not go in.      */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile,
         scrollPage, AUDIT_DOM, pixelContrast } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

const SRC = AUDIT_DOM.toString();
const OLD = 'acc = acc === null ? { rgb: c.rgb, a: c.a } : { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) };';
const NEW = 'acc = acc === null ? { rgb: c.rgb, a: c.a } : (function () { var na = acc.a + c.a * (1 - acc.a); ' +
            'return { rgb: acc.rgb.map(function (v, i) { return (v * acc.a + c.rgb[i] * c.a * (1 - acc.a)) / na; }), a: na }; })();';

if (SRC.split(OLD).length !== 2) {
  console.log('!! the compositor line is not present exactly once in AUDIT_DOM — rig.mjs moved. NOT running.');
  process.exit(1);
}
const FIXED = SRC.replace(OLD, NEW);

const srv = await serveDist(DIST, 5935);
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

let pop = 0, moved = 0;
const cleared = [], created = [], disputed = [];

for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  for (const where of ['top', 'bottom']) {
    await scrollPage(page, where); await settle(page);

    const a = await page.evaluate('(' + SRC + ')()');
    const b = await page.evaluate('(' + FIXED + ')()');
    if (a.text.length !== b.text.length) {
      console.log(`!! ${sc.id}@${where}: the two walks disagree on population (${a.text.length} vs ${b.text.length}) — comparison abandoned`);
      continue;
    }

    /* The field is `contrast`. The first version of this file read `.ratio`,
       which does not exist, so every comparison was undefined-vs-undefined and
       it printed "0 moved · 0 cleared · 0 created · 0 disputed" — a clean green
       from a probe that had measured nothing at all. A missing field is now
       fatal, because a comparison that cannot fail is the thing this whole
       document exists to catch. */
    if (!('contrast' in (a.text[0] || {}))) {
      console.log('!! AUDIT_DOM text nodes carry no `contrast` field — the shape changed. NOT comparing.');
      process.exit(1);
    }

    /* Same walk, same order, one expression apart: index i is the same node. */
    const changed = [];
    for (let i = 0; i < a.text.length; i++) {
      const x = a.text[i], y = b.text[i];
      pop++;
      if (Math.abs((x.contrast || 0) - (y.contrast || 0)) > 0.01) moved++;
      const floor = x.numeric ? 7 : 4.5;
      const wasBad = x.contrast !== null && x.contrast < floor, nowBad = y.contrast !== null && y.contrast < floor;
      if (wasBad !== nowBad) changed.push({ i, x, y, floor, dir: wasBad ? 'cleared' : 'created' });
    }
    if (!changed.length) continue;

    /* The arbiter shares no code with either formula. */
    const px = await pixelContrast(page, changed.map(c => c.x));
    const byKey = new Map(px.map(m => [`${m.t}|${m.size}`, m.pixel]));

    for (const c of changed) {
      const pixel = byKey.get(`${c.x.t}|${c.x.size}`);
      const row = { screen: `${sc.id}@${where}`, t: String(c.x.t).slice(0, 34), size: c.x.size,
                    floor: c.floor, old: c.x.contrast, neu: c.y.contrast, pixel };
      /* Which formula does the painted pixel agree with? Whichever it is nearer
         to. If it is nearer the OLD one, the correction is wrong and says so. */
      if (pixel == null) disputed.push({ ...row, why: 'no painted reading — cannot arbitrate' });
      else if (Math.abs(pixel - row.neu) <= Math.abs(pixel - row.old)) (c.dir === 'cleared' ? cleared : created).push(row);
      else disputed.push({ ...row, why: 'the PIXELS agree with the OLD formula' });
    }
  }
}

const show = (title, rows, colour) => {
  console.log(`\n\x1b[1m${title}\x1b[0m (${rows.length})`);
  for (const r of rows)
    console.log(`  ${colour}${r.screen}\x1b[0m «${r.t}» ${r.size}px  floor ${r.floor}  ` +
      `old \x1b[31m${r.old?.toFixed(2)}\x1b[0m → new \x1b[32m${r.neu?.toFixed(2)}\x1b[0m  ` +
      `pixel ${r.pixel == null ? '—' : r.pixel.toFixed(2)}${r.why ? `  ← ${r.why}` : ''}`);
};

console.log(`\n\x1b[1m═══ bgOf: one expression, ${pop} node-readings compared ═══\x1b[0m`);
console.log(`  ${moved} reading(s) moved by more than 0.01 — the rest are stacks with no translucent layer behind another, where the two formulas are identical.`);
show('CLEARED — was failing, now passes, and the pixels back the new number', cleared, '\x1b[32m');
show('CREATED — was passing, now fails: these are REAL DEFECTS, not artefacts', created, '\x1b[31m');
show('DISPUTED — the correction does NOT go in if this list is non-empty', disputed, '\x1b[33m');
console.log(`\nerror floor: ${errs.length ? '\x1b[31m' + errs.join(' | ') + '\x1b[0m' : '\x1b[32mclean\x1b[0m'}`);
await browser.close(); srv.close();
