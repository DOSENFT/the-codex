/* G-5 — the trapped sweep, run where it has never been run: inside the sheets.
   -----------------------------------------------------------------------------
   `_g3c-trapped.mjs` reports "0 TRAPPED of 315 controls across 7 screens", and
   that green has the same shape as the one A-36 caught in the contrast grader:
   it is true about the population it looked at, and the population is not the
   app. It sweeps `main` on the seven base screens and never opens anything. But
   every sheet, drawer, editor and popover in this app lives in the z-50 overlay
   layer — «Choose Action», «Dice Roller», «Mechanics Reference» — and those are
   the surfaces he is touching during a six-second turn. A control he cannot
   reach inside the action sheet is exactly as unusable as one he cannot reach
   on the page, and no criterion has ever looked.

   So the same question, asked of the overlays: is there ANY scroll position of
   the sheet's own scroller at which each of its controls is fully clear?

   Two things are done differently from the base sweep, and both matter:

     · The scroller is chosen from INSIDE the open sheet, not from the document.
       `main` is still the largest scroller on the page while a sheet is open,
       and it is `inert` and behind — sweeping it would scroll the wrong box and
       call the sheet's own controls trapped. The base probe's own scar (405 of
       788 "trapped" because it swept the wrong scroller) is the reason.

     · If the sheet cannot be located after its opener is clicked, that is
       printed as UNPROVEN and counted separately. A sheet this cannot find is
       not a sheet with no defects.

   The app's own buttons open everything. No style is overridden, no state is
   poked, nothing is un-inerted.                                              */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5931);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
page.on('requestfailed', r => errs.push('reqfail: ' + r.url().slice(-60)));
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

const SWEEP_OVERLAY = () => {
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05
      && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; };

  /* The open sheet: a dialog that is neither inert nor aria-hidden, on screen,
     and actually painted where he can see it. Closed sheets stay mounted with
     translateY(height), so "is it in the viewport" is the discriminator. */
  const roots = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')]
    .filter(e => !e.hasAttribute('inert') && e.getAttribute('aria-hidden') !== 'true' && vis(e))
    .filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight - 40; });
  const root = roots.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  })[0];
  if (!root) return { found: false };

  const inner = [...root.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && vis(e))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
  const scroller = inner || root;
  const room = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const home = scroller.scrollTop;

  /* The probe points must lie inside the control's actual SHAPE, not its box.
     The second run of this file reported 7 TRAPPED dice buttons on all seven
     screens — «Select d4» … «Select d100», 44x44, "blocked by" their own parent
     strip — and every one was reachable. They are `rounded-full`: a circle of
     radius 22 inset into a 44x44 box. A corner probe 4px in sits at distance
     √(18²+18²) = 25.5 from the centre, i.e. 3.5px OUTSIDE the button, so
     elementFromPoint correctly returned the parent and the probe called the
     miss a defect. 49 of the 49 remaining findings were this.

     So the corner inset is derived from the border radius: to clear a corner of
     radius r along the 45° diagonal you must come in by r − r/√2, plus 2px of
     margin. For a 22px radius that is 8.4px, not 4. Square controls are
     unaffected (r = 0 → the old 4px). This narrows the shape tested, which is
     the direction that makes a FAIL harder to produce — so it is stated plainly
     rather than buried: a control is now judged on a slightly smaller region
     than before, and every verdict it changed went red → green because the
     region it lost was never part of the button.

     ── and the box must be a box the control actually occupies. ──
     The run that first swept the settings drawer convicted the Creative
     Commons link on all seven screens, "blocked by: p", 5/5 probe points on
     screen at scrollTop=2520/2598. It is an inline `<a>` that WRAPS. For a
     wrapped inline, `getBoundingClientRect()` returns the union of its line
     fragments — a rectangle whose corners fall in the gaps beside the short
     line, on the surrounding `<p>`'s text. The link was never covered; the
     probe was testing pixels the link does not paint, and `elementFromPoint`
     answered that question correctly.

     So the probe rect comes from `getClientRects()`, taking the largest
     fragment. Block-level controls — every button in this app — return exactly
     one rect, so nothing about them changes. A wrapped link is judged on its
     longest line, which is a place his thumb can actually land. This changed
     exactly one verdict, the CC-BY link, red → green; stated here for the same
     reason as the radius correction above, because it is a change that makes a
     FAIL harder to produce and those do not go unannounced. */
  const boxOf = el => {
    const rects = [...el.getClientRects()];
    if (rects.length < 2) return el.getBoundingClientRect();
    return rects.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
  };
  const clearAt = el => {
    const r = boxOf(el);
    const cs = getComputedStyle(el);
    const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
    const i = Math.max(4, rad - rad / Math.SQRT2 + 2);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cx >= innerWidth || cy < 0 || cy >= innerHeight) return false;
    const pts = [[cx, cy], [r.left + i, r.top + i], [r.right - i, r.top + i],
      [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]]
      .filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight);
    if (pts.length < 5) return false;
    return pts.every(([x, y]) => { const h = document.elementFromPoint(x, y); return h && (h === el || el.contains(h)); });
  };

  /* Controls of the SHEET, and only those the chosen scroller can move. A
     control in a nested horizontal strip is reported as its own category, not
     silently folded into either verdict. */
  const all = [...root.querySelectorAll('button,[role="button"],a[href],input,select,textarea')]
    .filter(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2 && s.display !== 'none' && s.visibility !== 'hidden'
        && parseFloat(s.opacity || '1') >= 0.05; });
  const candidates = all.filter(el => scroller.contains(el));
  const outside = all.length - candidates.length;

  /* Every scrollable box strictly between the control and the swept scroller.
     THIS IS THE CORRECTION THAT MATTERS. The first run of this file reported
     **77 TRAPPED of 392**, and every one of them was blocked by
     `div.flex.gap-1.5.overflow-x-auto` — the dice picker's HORIZONTAL strip, or
     the mechanics drawer's category rail. A vertical sweep cannot move a
     horizontal scroller, so those controls were never tested; they were
     convicted for sitting in a box the instrument does not drive. G-3b made
     exactly this error and inflated its finding by it, and _g3c's header warns
     about it in so many words. Repeating it while quoting the warning would be
     the most embarrassing possible way to fail.

     So a nested scroller is DRIVEN, not blamed: the control is brought into
     view along its own axis first — which is what his thumb does — and only
     then is the outer scroller swept underneath it. */
  const nestedOf = el => {
    const out = [];
    for (let p = el.parentElement; p && p !== scroller; p = p.parentElement) {
      const s = getComputedStyle(p);
      if ((/auto|scroll/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 4) ||
          (/auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4)) out.push(p);
    }
    return out;
  };

  const STEP = 24, trapped = [];
  for (const el of candidates) {
    const nest = nestedOf(el);
    if (nest.length) { try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch { /* ignore */ } }
    const nestHome = nest.map(n => [n.scrollLeft, n.scrollTop]);

    /* `best` is the scroll offset at which the most of this control was inside
       the viewport. The verdict does not use it — the verdict is `free`, decided
       over the whole sweep. It exists because the DIAGNOSIS used to be taken at
       `home`, an offset with no relationship to the failure, and so every
       control whose trouble is near the bottom of a 2598px drawer reported its
       blocker as "(off-viewport)" — which says only "it is not on screen when
       the sheet first opens", a fact about the sheet's initial scroll and not
       about why the control could never be reached. Naming the wrong culprit is
       how a real defect gets filed as a harness artifact and dismissed. */
    let free = false, best = home, bestIn = -1;
    for (let t = 0; t <= room + STEP; t += STEP) {
      scroller.scrollTop = Math.min(t, room);
      /* scrollIntoView above may have moved the outer scroller too; the nested
         boxes are re-pinned so the outer sweep is the only thing varying. */
      nest.forEach((n, i) => { n.scrollLeft = nestHome[i][0]; n.scrollTop = nestHome[i][1]; });
      void scroller.offsetHeight;
      if (clearAt(el)) { free = true; break; }
      const b = boxOf(el);
      const inView = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 4, b.top + 4],
        [b.right - 4, b.top + 4], [b.left + 4, b.bottom - 4], [b.right - 4, b.bottom - 4]]
        .filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight).length;
      if (inView > bestIn) { bestIn = inView; best = scroller.scrollTop; }
    }
    if (free) continue;
    scroller.scrollTop = best;
    nest.forEach((n, i) => { n.scrollLeft = nestHome[i][0]; n.scrollTop = nestHome[i][1]; });
    void scroller.offsetHeight;
    const r = boxOf(el), i = 4;
    const by = new Set();
    for (const [x, y] of [[r.left + r.width / 2, r.top + r.height / 2], [r.left + i, r.top + i],
      [r.right - i, r.top + i], [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]]) {
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) { by.add('(off-viewport)'); continue; }
      const h = document.elementFromPoint(x, y);
      if (h && !(h === el || el.contains(h))) by.add(desc(h));
    }
    trapped.push({
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) || '(unlabelled)',
      self: desc(el), by: [...by].join(' | '), disabled: !!el.disabled, nested: nest.length,
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      at: `scrollTop=${Math.round(best)}/${Math.round(room)}, ${bestIn}/5 probe points on screen, ` +
          `x ${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}, y ${Math.round(r.top)}..${Math.round(r.bottom)} of ${innerHeight}`,
    });
  }
  scroller.scrollTop = home;
  const driven = candidates.filter(el => nestedOf(el).length).length;
  return { found: true, root: desc(root), scroller: desc(scroller), room: Math.round(room),
           candidates: candidates.length, outside, driven, trapped };
};

/* The overlay set, read out of the app rather than remembered.
   -----------------------------------------------------------------------------
   This list used to hold three entries, one of which was
   `button:has-text("Manage Actions")` for the ActionMenu sheet — copied from
   `_g4-prove.mjs`, which has carried it since G-4. That selector cannot match.
   «Manage Actions» exists in exactly one file, `combat/SmartActionsGrid.tsx`,
   and:

     $ grep -rn "SmartActionsGrid" src --include=*.tsx | grep -v combat/SmartActionsGrid.tsx
     (no output)

   — nothing imports it. Chased to the state instead of the label, the same
   answer arrives from the other side: `setActionMenuOpen(true)` appears once in
   the app, inside `openActionMenu` at CombatHelper.tsx:1198, and
   `openActionMenu` is never called. `<ActionMenu isOpen={actionMenuOpen}>` is
   mounted at CombatHelper.tsx:1361 and `actionMenuOpen` can only ever be
   `false`. ActionMenu is unreachable in the running app; the live action
   surface is `SmartActionsPanel`, inside the "Actions Reference" collapsible,
   which is page content and is swept by the ordinary V-6 passes, not here.

   So the entry was not fixed, it was removed: there is no opener to point it
   at. That ActionMenu is dead code is a behaviour fact and behaviour is sealed
   — it is written up in TABLE-READY § A-39 and left unbuilt.

   The other five were found by reading every `…Open(true)` in `src/` rather
   than by recalling which overlays exist, because the ActionMenu entry proves
   what recall is worth here. Four of them — settings, toybox, character sheet,
   dice — hang off the header and tab bar and so exist on all seven screens;
   `lookup` lives in TurnSummary and therefore only in combat. */
const OVERLAYS = [
  { name: 'dice', sel: '[aria-label="Open dice roller"]' },
  { name: 'mechanics', sel: '[aria-label="Open mechanics reference"]' },
  { name: 'settings', sel: '[aria-label="Open settings"]' },
  { name: 'toybox', sel: '[aria-label="Open The Toybox"]' },
  { name: 'sheet', sel: '[aria-label^="Open character sheet"]' },
  { name: 'lookup', sel: '[aria-label="Quick lookup"]' },
  /* The two hand-rolled sheets a PAGE renders, rather than Layout. They are
     here because of what `<main>`'s stacking context does to anything inside
     it (see ui/Sheet.tsx's header): the portal fixes the three sheets that
     share the Sheet primitive, and these two do not share it. Whether they are
     also trapped is now measured instead of reasoned about. */
  { name: 'spell-editor', sel: 'button:text-is("Spell")' },
  { name: 'feature-editor', sel: 'button:text-is("Feature")' },
];

/* --selftest plants a real occluder over the open sheet — an opaque bar pinned
   across the middle of it, at the same z-index the overlay layer uses — and
   requires the sweep to convict the controls under it. Without this, a green
   from a test whose probe region I had just narrowed would be worth nothing.
   The bar is added AFTER the sheet opens and removed before the next one, and
   the app is never edited: this is the harness sabotaging its own view to check
   the instrument, which is what P-0.6 does for the error floor. */
const SELFTEST = process.argv.includes('--selftest');
const plant = () => page.evaluate(() => {
  const d = document.createElement('div');
  d.id = '__g5_occluder';
  d.style.cssText = 'position:fixed;left:0;right:0;top:55%;height:140px;z-index:60;background:#000;';
  document.body.appendChild(d);
});
const unplant = () => page.evaluate(() => document.getElementById('__g5_occluder')?.remove());

let cand = 0, trap = 0, unproven = 0, nested = 0, opened = 0, absent = 0;
const redlines = [];
/* Which overlays were opened at least once, anywhere, and where each absence
   fell. `absent` on one screen is ordinary — the header overlays exist
   everywhere but «Quick lookup» does not. An overlay absent on EVERY screen in
   BOTH combat states is the ActionMenu failure repeating, and is printed as a
   named line rather than folded into a count. */
const everOpened = new Set(), absences = [];

async function overlayPass(sc, tag) {
  for (const ov of OVERLAYS) {
    const btn = page.locator(ov.sel).first();
    if (!(await btn.count())) { absent++; absences.push(`${tag}>${ov.name}`); continue; }
    try {
      await btn.scrollIntoViewIfNeeded({ timeout: 3000 });
      await btn.click({ timeout: 3000 });
    } catch {
      unproven++; console.log(`   ?? ${tag} > ${ov.name}: opener present, not clickable — UNPROVEN`);
      await goScreen(page, sc); await settle(page); continue;
    }
    await page.waitForTimeout(500); await settle(page);
    if (SELFTEST) await plant();

    const r = await page.evaluate(SWEEP_OVERLAY);
    if (SELFTEST) await unplant();
    if (!r.found) {
      unproven++;
      console.log(`   ?? ${tag} > ${ov.name}: clicked the opener, found no open dialog — UNPROVEN, not clean`);
    } else {
      opened++; everOpened.add(ov.name);
      cand += r.candidates; trap += r.trapped.length; nested += r.driven;
      const flag = r.trapped.length ? '\x1b[31m' : '\x1b[32m';
      console.log(`${flag}── ${tag} > ${ov.name}\x1b[0m  <${r.root}> scroller <${r.scroller}> room=${r.room}px  ` +
                  `${r.candidates} controls (${r.driven} inside a nested scroller, driven)  \x1b[1m${r.trapped.length} TRAPPED\x1b[0m`);
      for (const t of r.trapped) {
        console.log(`   \x1b[31mXX\x1b[0m "${t.label}"${t.disabled ? ' [disabled]' : ''}  ${t.self}  ${t.size}${t.nested ? `  [in ${t.nested} nested scroller(s)]` : ''}\n        blocked by: ${t.by}\n        best case: ${t.at}`);
        redlines.push(`${sc.id}>${ov.name}: ${t.label} (${t.size}) — ${t.by}`);
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(350);
    await goScreen(page, sc); await settle(page);
  }
}

/* OUT of combat and IN it. A fresh import is out of combat, and half of what
   this app is for only exists once initiative is rolled: «Quick lookup» is
   rendered by TurnSummary, which CombatHelper mounts behind
   `combatState.inCombat`. The first run of this file reported "7 opener(s)
   absent" and moved on — an overlay that was never opened is not an overlay
   with no defects, and a green built out of absences is the exact shape of
   A-36(e). So the app's own «Start Combat» is pressed and the whole pass runs
   again, in the state the app is named for. The absent count is still printed
   either way, and any overlay that stays absent in both states is named, so a
   silent skip cannot recur. */
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  await overlayPass(sc, sc.id);

  if (sc.id === 'play/Combat') {
    const start = page.locator('button:has-text("Start Combat")').first();
    if (!(await start.count())) {
      unproven++;
      console.log('   ?? play/Combat: no «Start Combat» control — the in-combat overlays stay UNPROVEN');
    } else {
      try {
        await start.scrollIntoViewIfNeeded({ timeout: 3000 });
        await start.click({ timeout: 3000 });
        await page.waitForTimeout(800); await settle(page);
        await overlayPass(sc, 'play/Combat(in combat)');
      } catch (e) {
        unproven++;
        console.log(`   ?? play/Combat: could not enter combat (${String(e).split('\n')[0].slice(0, 70)}) — UNPROVEN`);
      }
    }
  }
}

console.log(`\n===== ${trap} TRAPPED of ${cand} controls, across ${opened} opened overlay(s) =====`);
console.log(`${nested} of those sat inside a nested scroller and were brought into view along its own axis first, then swept.`);
console.log(`${unproven} overlay(s) could not be opened or located — UNPROVEN. ${absent} opener(s) absent on their screen.`);

const never = OVERLAYS.filter(o => !everOpened.has(o.name));
if (never.length) {
  console.log(`\n\x1b[31m${never.length} overlay(s) NEVER OPENED ANYWHERE — ungraded, not clean:\x1b[0m`);
  for (const o of never) console.log(`   XX ${o.name}  ${o.sel}   absent on: ` +
    absences.filter(a => a.endsWith('>' + o.name)).map(a => a.split('>')[0]).join(', '));
} else {
  console.log(`\x1b[32mevery overlay in the list opened at least once — none was graded by absence.\x1b[0m`);
}
if (redlines.length) { console.log('\nfindings:'); for (const l of redlines) console.log('  · ' + l); }
console.log('ERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
if (SELFTEST) console.log(trap
  ? `\n\x1b[32mSELF-TEST PASSED — the planted occluder was caught ${trap} time(s). This probe can still convict.\x1b[0m`
  : `\n\x1b[31mSELF-TEST FAILED — an opaque bar was pinned over every open sheet and NOTHING was reported.\x1b[0m`);
await ctx.close(); await browser.close(); await srv.close();
/* A never-opened overlay exits red. Criteria may be added, never softened:
   before this line the file could print "0 TRAPPED" while having graded
   nothing, and exit 0. That is what it did on its first run. */
process.exit((SELFTEST ? !trap : (trap || never.length)) || errs.length ? 1 : 0);
