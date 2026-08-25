/* G-3c — the only question that matters: can he get to it?
   -----------------------------------------------------------------------------
   G-3b classified 39 controls as "covered by fixed chrome" and 0 as scrollable,
   which is wrong, and wrong in the direction that inflates the finding — the
   same error V-9 made. `main` is itself position:fixed, so EVERY page control
   has a fixed ancestor and every coverer resolves to some other fixed box. The
   turn deck covering the conditions grid is not a defect; the conditions grid
   scrolls out from under it.

   There is no clever static rule for this. So this asks the question by doing
   it: for each control that is not fully tappable where it sits, sweep the
   scroller through its whole range and check, at every step, whether the
   control is ever fully clear of everything else.

     FREE      there is a scroll position where all five test points hit the
               control itself. He can reach it. Not a defect.
     TRAPPED   there is no such position, anywhere in the scroll range. The
               control cannot be tapped on this screen at all. A defect.

   TRAPPED is measured, not inferred, and the sweep is over the real scroller at
   real coordinates. A control that is TRAPPED here is one he cannot use.

   CORRECTED 2026-08-25 (A-41). The eight lines that stood here said this:

     "KNOWN LIMIT, stated because the result is a green one. This drives exactly
      one scroller per screen ... Controls inside a NESTED scroller ... cannot be
      moved by it, so they report "(off-viewport)" and land in TRAPPED without
      having been tested. Those are UNPROVEN, not failed. The 13 residual
      findings at the last run are all of that kind and are listed as such; the
      number this probe is entitled to assert is ... 0."

   That paragraph is where TABLE-READY § 12's "0 trapped of 315" came from. It
   is a COMMENT, not an output: this file printed `13 TRAPPED of 315` on every
   run it ever made, and the document reported 0. The claim that all 13 sat in
   nested scrollers was never measured — it was asserted here and then cited
   there as though it had been. That is the same move as a hand-built tally, and
   § 4 grades the worst case, not the argued one.

   Three changes, all of which make a FAIL harder to produce, all disclosed for
   that reason:

     (a) A nested scroller is now DRIVEN, not blamed — the control is brought
         into view along its own axis first, which is what his thumb does, and
         only then is `main` swept underneath it. Ported from _g5-trapped-overlay
         (A-40), where the same correction took 77 phantom findings to 0.
     (b) The diagnosis is taken at the offset where the most of the control was
         on screen, not at `home`. At `home` anything below the fold reports
         "(off-viewport)", which is a fact about the initial scroll and not about
         why a control could never be reached. All 13 said exactly that.
     (c) A wrapped inline is measured by its largest line box, not by the union
         of its fragments, whose corners land on the surrounding paragraph.

   And the known limit is now MEASURED rather than asserted: every finding
   reports how many scrollable boxes sit between it and the swept scroller, so
   "it was in a nested strip" is a number in the output that a stranger can
   check, not a sentence in a comment.                                         */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5924);
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

const SWEEP = () => {
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const onScreen = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1
      && r.bottom > 0 && r.top < innerHeight; };
  const scroller = [...document.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && onScreen(e))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
    || document.scrollingElement;
  const room = scroller.scrollHeight - scroller.clientHeight;
  const home = scroller.scrollTop;

  /* Test points: centre plus four inset corners, clipped to the viewport. A
     control is CLEAR only when every in-viewport point hits itself, and at
     least the centre is in the viewport — a control whose only visible sliver
     is one corner is not a 44px target and does not count as reached. */
  /* A-41(c): a wrapped inline's getBoundingClientRect() is the union of its
     line fragments, so its corners land on the surrounding block. Measure the
     largest line box — a place his thumb can actually land. */
  const boxOf = el => {
    const rects = [...el.getClientRects()];
    if (rects.length < 2) return el.getBoundingClientRect();
    return rects.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
  };
  const clearAt = el => {
    const r = boxOf(el), i = 4;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cx >= innerWidth || cy < 0 || cy >= innerHeight) return false;
    const pts = [[cx, cy], [r.left + i, r.top + i], [r.right - i, r.top + i],
      [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]]
      .filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight);
    if (pts.length < 5) return false;   // partly off-screen: keep scrolling
    return pts.every(([x, y]) => { const h = document.elementFromPoint(x, y); return h && (h === el || el.contains(h)); });
  };

  /* ONLY controls that live inside the scroller being swept. The first version
     of this scanned every control in the document and reported 405 of 788 as
     trapped — because the mechanics-reference drawer is a second scroller with
     3769px of content parked off-viewport, and sweeping `main` can never bring
     its rows in. They were not trapped; they were in a box this sweep was not
     touching. rig.mjs's scrollPage comment warns about exactly that drawer, and
     I walked into it anyway. A control this sweep cannot move is a control this
     sweep may not judge. */
  const candidates = [];
  for (const el of scroller.querySelectorAll('button,[role="button"],a[href],input,select,textarea')) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') < 0.05) continue;
    candidates.push(el);
  }

  /* A-41(a): every scrollable box strictly between the control and the swept
     scroller. Reported per finding, so the "it was only a nested strip" defence
     is a number a stranger can check rather than a sentence in this header. */
  const nestedOf = el => {
    const out = [];
    for (let p = el.parentElement; p && p !== scroller; p = p.parentElement) {
      const s = getComputedStyle(p);
      if ((/auto|scroll/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 4) ||
          (/auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4)) out.push(p);
    }
    return out;
  };

  const STEP = 24;
  const trapped = [];
  for (const el of candidates) {
    const nest = nestedOf(el);
    if (nest.length) { try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch { /* ignore */ } }
    const nestHome = nest.map(n => [n.scrollLeft, n.scrollTop]);

    /* A-41(b): `best` is the offset at which the most of this control was on
       screen. The VERDICT does not use it — the verdict is `free`, decided over
       the whole sweep. It exists so the diagnosis names the real blocker
       instead of "(off-viewport)", which every one of the previous 13 said. */
    /* A-41(d): `centreEver` records whether the CENTRE point — where a thumb
       actually lands — ever hit this control during the sweep. It does not
       change the verdict, which stays the five-point rule. It exists because
       "cannot be tapped at all" and "can be tapped, but its 4px corners are
       overlapped by a sibling decoration" are different defects with different
       costs at the table, and reporting them as one number tells him neither.
       Both are still counted as TRAPPED below; this only says which is which. */
    let free = false, best = home, bestIn = -1, centreEver = false;
    for (let t = 0; t <= room + STEP; t += STEP) {
      scroller.scrollTop = Math.min(t, room);
      nest.forEach((n, i) => { n.scrollLeft = nestHome[i][0]; n.scrollTop = nestHome[i][1]; });
      void scroller.offsetHeight;                     // force layout
      const cb = boxOf(el);
      const ccx = cb.left + cb.width / 2, ccy = cb.top + cb.height / 2;
      if (ccx >= 0 && ccx < innerWidth && ccy >= 0 && ccy < innerHeight) {
        const ch = document.elementFromPoint(ccx, ccy);
        if (ch && (ch === el || el.contains(ch))) centreEver = true;
      }
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
    const blockers = new Set();
    for (const [x, y] of [[r.left + r.width / 2, r.top + r.height / 2], [r.left + i, r.top + i],
      [r.right - i, r.top + i], [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]]) {
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) { blockers.add('(off-viewport)'); continue; }
      const h = document.elementFromPoint(x, y);
      if (h && !(h === el || el.contains(h))) blockers.add(desc(h));
    }
    trapped.push({
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) || '(unlabelled)',
      self: desc(el), by: [...blockers].join(' | '), disabled: !!el.disabled, nested: nest.length,
      centreEver,
      size: `${Math.round(r.width)}x${Math.round(r.height)}`, room: Math.round(room),
      at: `scrollTop=${Math.round(best)}/${Math.round(room)}, ${bestIn}/5 probe points on screen, ` +
          `x ${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}, y ${Math.round(r.top)}..${Math.round(r.bottom)} of ${innerHeight}`,
    });
  }
  scroller.scrollTop = home;
  const driven = candidates.filter(el => nestedOf(el).length).length;
  return { room: Math.round(room), scroller: desc(scroller), candidates: candidates.length, driven, trapped };
};

let total = 0, cand = 0, nested = 0, stillNested = 0, centreOk = 0;
for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  const r = await page.evaluate(SWEEP);
  cand += r.candidates; total += r.trapped.length; nested += r.driven;
  stillNested += r.trapped.filter(t => t.nested).length;
  centreOk += r.trapped.filter(t => t.centreEver).length;
  console.log(`\n── ${sc.id}  scroller <${r.scroller}> room=${r.room}px  ${r.candidates} controls (${r.driven} inside a nested scroller, driven)  ${r.trapped.length} TRAPPED`);
  for (const t of r.trapped)
    console.log(`   XX "${t.label}"${t.disabled ? ' [disabled]' : ''}  ${t.self}  ${t.size}${t.nested ? `  [in ${t.nested} nested scroller(s)]` : ''}\n        blocked by: ${t.by}\n        best case: ${t.at}`);
}
console.log(`\n===== ${total} TRAPPED of ${cand} controls, across all 7 screens =====`);
console.log(`${nested} of those sat inside a nested scroller and were brought into view along their own axis first, then swept.`);
console.log(`Of the ${total} findings, ${total - centreOk} could never be hit even at their centre — those are controls he cannot press at all; the remaining ${centreOk} take a real tap at the centre and are overlapped only at their 4px corners.`);
console.log(`Of the ${total} findings, ${stillNested} are still inside a nested scroller after being driven — those and only those are the "UNPROVEN" class the old header claimed all 13 were.`);
console.log('ERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
/* A trapped control exits red. The previous version exited 0 unconditionally
   while printing 13 findings, which is how a comment came to outrank an output. */
process.exit(total || errs.length ? 1 : 0);
