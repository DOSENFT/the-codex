/* G-7 — are the twelve V-6b / V-6c findings TRAPPED, or merely occluded at an end?
   -----------------------------------------------------------------------------
   The live run at 247beda leaves exactly three failures, and all three are the
   same family: V-6 (1 control outside the thumb zone), V-6b (7 occluded on the
   phone), V-6c (5 occluded on the iPad). Before any of them is fixed, one
   question has to be answered honestly, because the fix is different in each
   direction and this project's whole history is fixes aimed at the wrong thing.

   V-6b grades at two scroll offsets only, top and bottom, and families.mjs
   justifies that with:

     "At an intermediate offset every control passes under the fixed bottom bar
      at some point and can be scrolled back out again; that is scrolling, not
      occlusion. At the two ends it cannot be scrolled away, and that is the
      failure this criterion is about."

   That reasoning does not survive being read against the actual findings:

     · five phone findings are `@top ... covered by ... nav.fixed.bottom-0`.
       At scroll-TOP a control under the BOTTOM bar is cleared by scrolling
       DOWN — the direction that is fully available at scroll-top.
     · four iPad findings are `@bottom ... covered by header.fixed.top-0`.
       At scroll-BOTTOM a control under the TOP header is cleared by scrolling
       UP — again the direction that is fully available there.

   So the premise "at the two ends it cannot be scrolled away" is, for nine of
   the twelve, the opposite of true. That does NOT soften V-6b: the criterion is
   frozen, it reads "no control covered by anything", and it stays FAIL. What it
   changes is which of the twelve is a control Marcus cannot use at the table and
   which is a control that needs a scroll to reach — and only measurement can say
   which, so this measures it instead of arguing it.

   METHOD — one question, asked the way V-6b asks it, at EVERY offset:
     For each named control, sweep the scroller from 0 to its maximum in 24px
     steps and, at each offset, run V-6b's own test verbatim:
     `document.elementFromPoint(centre)` must resolve to the control or a
     descendant. TRAPPED means that test failed at every single offset. Anything
     else is CLEARABLE, and the offset that clears it is printed.

   Three of the twelve are named by a coverer that is not fixed page chrome —
   `button.fixed.z-50` and `span.text-xs.font-mo`. Those cannot be explained by
   scrolling at all and are expected to come back TRAPPED. If they do not, this
   probe is wrong and its verdicts are void; that is stated up front so the
   result cannot be read selectively afterwards.

   ── REVISION 2 — the condition above FIRED, and this is what was wrong ──────
   Run 1 reported 5 TRAPPED · 7 CLEARABLE. `prep/Persona`, covered by
   `button.fixed.z-50`, came back CLEARABLE. By the paragraph directly above,
   that voids run 1 entirely, and run 1's numbers are not reported anywhere as
   a result. Three independent tells confirm the void rather than excuse it:

     · the five "TRAPPED" rows each reported the control on screen at 127 of 127
       offsets with its centre pinned at y≈785–813 across a 3010px sweep. A
       control that does not move when 3010px of scroll is applied is a control
       this probe was NOT SCROLLING.
     · three different screens reported the identical 3010px scroll room.
     · «Start One-Shot Adventure» reported `0/127 offsets had it on screen` and
       `last blocker undefined`, and was still printed TRAPPED. Never-visible is
       not trapped. That is a logic defect, not a measurement.

   Two root causes, both fixed here:

     1. SCROLLER SELECTION. Run 1 took the single largest-overflow element in
        the document, which is families.mjs's heuristic — fine for a whole-page
        sweep, wrong for a named control, because on three of these screens the
        largest scroller is an inner container the control does not live in. The
        control is now scrolled by walking UP from the control itself to every
        scrollable ancestor, and the sweep drives the nearest one. A control is
        scrolled by the box that actually scrolls it, or it is not scrolled.
     2. THREE VERDICTS, NOT TWO. `TRAPPED` now requires the control to have been
        on screen at ≥1 offset AND blocked at every offset it was on screen.
        A control on screen at zero offsets is `NEVER-VISIBLE`, reported
        separately and never folded into either of the other two.

   Falsification condition for THIS revision, stated before it runs, same as
   before: the two findings whose coverer is not page chrome — prep/Persona
   (`button.fixed.z-50`) and prep/Academy (`span.text-xs.font-mo`) — must come
   back TRAPPED or NEVER-VISIBLE. A coverer that is `position: fixed` or a
   sibling painting over the control cannot be scrolled out from under. If
   either returns CLEARABLE, revision 2 is void too and no verdict here is
   reported.                                                                  */
import { chromium, serveDist, DIST, PHONE, TABLET, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

/* Verbatim from the live transcript of run-247beda-live.log. Labels are matched
   as a prefix so the harness's 40-char truncation is not a source of misses. */
const PHONE_FINDINGS = [
  ['play/Roleplay', 'Burn clean, and quickly.', 'nav.fixed.bottom-0'],
  ['prep/Character', 'Acrobatics: not proficient. Tap to change', 'nav.fixed.bottom-0'],
  ['prep/Character', 'Acrobatics(DEX)', 'nav.fixed.bottom-0'],
  ['prep/Grimoire', 'BlessSpellAction30 feetConc1stSlots:4/4', 'nav.fixed.bottom-0'],
  ['prep/Grimoire', 'Unprepare Bless', 'nav.fixed.bottom-0'],
  ['prep/Persona', 'Remove slow to trust, but deeply loyal once', 'button.fixed.z-50'],
  ['prep/Academy', 'Start One-Shot Adventure', 'span.text-xs.font-mo'],
];
const TABLET_FINDINGS = [
  ['play/Grimoire', 'BlessSpellAction30 feetConc1stSlots:4/4', 'header.fixed.top-0'],
  ['prep/Grimoire', 'CommandSpellAction60 feetConc1stSlots:4/4', 'header.fixed.top-0'],
  ['prep/Grimoire', 'Unprepare Command', 'header.fixed.top-0'],
  ['prep/Persona', '“A little warmth for the chill in your bones', 'header.fixed.top-0'],
  ['prep/Academy', 'Random Catchphrase', 'nav.fixed.bottom-0'],
];

const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"]),[onclick]';

/* V-6b's own centre test, swept. Returns one record per named control. */
const SWEEP = (wanted) => {
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const norm = s => (s || '').trim().replace(/\s+/g, ' ');

  /* REVISION 2 — the box that scrolls THIS control, not the biggest box on the
     page. Walk up from the control; every ancestor that can actually scroll is
     collected, nearest first. Run 1 drove one document-wide scroller and three
     of the controls simply never moved. */
  const scrollersFor = el => {
    const out = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(s.overflowY)) out.push(p);
    }
    const de = document.scrollingElement;
    if (de && de.scrollHeight > de.clientHeight + 4 && !out.includes(de)) out.push(de);
    return out;
  };

  const controls = [...document.querySelectorAll(SEL_)].map(el => ({
    el, label: norm(el.getAttribute('aria-label') || el.textContent || el.tagName),
  }));

  const out = [];
  for (const want of wanted) {
    const hit = controls.find(c => c.label.slice(0, want.length) === want)
      || controls.find(c => c.label.includes(want.slice(0, 20)));
    if (!hit) { out.push({ want, found: false }); continue; }
    const el = hit.el;

    const chain = scrollersFor(el);
    const scroller = chain[0];
    if (!scroller) { out.push({ want, found: true, label: hit.label.slice(0, 44), noScroller: true }); continue; }
    const room = scroller.scrollHeight - scroller.clientHeight;

    let clearedAt = null, offsetsTested = 0, offsetsOnScreen = 0, lastBlocker = null;
    let minY = Infinity, maxY = -Infinity;
    for (let t = 0; t <= room + 24; t += 24) {
      scroller.scrollTop = Math.min(t, room);
      void scroller.offsetHeight;
      offsetsTested++;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      if (!(cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight)) continue;
      offsetsOnScreen++;
      const top = document.elementFromPoint(cx, cy);
      if (top && (top === el || el.contains(top))) {
        clearedAt = { scrollTop: Math.round(scroller.scrollTop), y: Math.round(cy) };
        break;
      }
      lastBlocker = { what: desc(top), pe: top ? getComputedStyle(top).pointerEvents : '-', y: Math.round(cy) };
    }
    /* REVISION 2 — three verdicts. Run 1 had two, and folded "never on screen"
       into TRAPPED, which is how «Start One-Shot Adventure» was reported as
       unreachable-at-every-offset on the strength of zero measurements. */
    const verdict = clearedAt ? 'CLEARABLE' : offsetsOnScreen === 0 ? 'NEVER-VISIBLE' : 'TRAPPED';
    out.push({
      want, found: true, verdict, label: hit.label.slice(0, 44),
      size: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      room: Math.round(room), offsetsTested, offsetsOnScreen, clearedAt, lastBlocker,
      scrollerDesc: desc(scroller), scrollerDepth: chain.length,
      /* Did the control actually MOVE? This is the check whose absence let run 1
         report a pinned control as swept. A range of 0 means the sweep did
         nothing and the verdict is not a measurement of anything. */
      travelled: Number.isFinite(minY) ? Math.round(maxY - minY) : null,
    });
  }
  return out;
};

async function run(browser, srv, viewport, dpr, findings, title) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, hasTouch: true, isMobile: viewport === PHONE });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(1000);

  console.log(`\n\x1b[1m${title}  ${viewport.width}×${viewport.height} @${dpr}x\x1b[0m`);
  const byScreen = new Map();
  for (const [sid, label, coverer] of findings) {
    if (!byScreen.has(sid)) byScreen.set(sid, []);
    byScreen.get(sid).push({ label, coverer });
  }

  const verdicts = [];
  for (const [sid, items] of byScreen) {
    const screen = SCREENS.find(s => s.id === sid);
    if (!screen) { console.log(`  ${sid} — NOT A KNOWN SCREEN, skipped`); continue; }
    await goScreen(page, screen);
    await settle(page);
    const res = await page.evaluate(
      `(${SWEEP.toString().replace(/SEL_/g, JSON.stringify(SEL))})(${JSON.stringify(items.map(i => i.label))})`);
    for (let i = 0; i < res.length; i++) {
      const r = res[i], expect = items[i].coverer;
      if (!r.found) {
        console.log(`  \x1b[33m??\x1b[0m ${sid}  «${r.want.slice(0, 40)}»  NOT FOUND on this screen — not graded, not clean`);
        verdicts.push({ sid, want: r.want, verdict: 'NOT FOUND' });
        continue;
      }
      if (r.noScroller) {
        console.log(`  \x1b[33m??\x1b[0m ${sid}  «${r.label}»  has NO scrollable ancestor — cannot be swept, not graded`);
        verdicts.push({ sid, want: r.want, verdict: 'NO SCROLLER' });
        continue;
      }
      const tag = { CLEARABLE: '\x1b[32mCLEARABLE\x1b[0m', TRAPPED: '\x1b[31mTRAPPED\x1b[0m  ', 'NEVER-VISIBLE': '\x1b[35mNEVER-VIS\x1b[0m' }[r.verdict];
      console.log(`  ${tag} ${sid}  «${r.label}»  ${r.size}`);
      console.log(`      V-6b named: ${expect}   swept ${r.scrollerDesc} (${r.scrollerDepth} scrollable ancestor(s)), room ${r.room}px, ${r.offsetsOnScreen}/${r.offsetsTested} offsets on screen`);
      /* The self-check run 1 did not have. If the control's centre did not move
         across the whole sweep, the sweep did not sweep it and no verdict on
         this row means anything. */
      if (r.travelled !== null && r.travelled < 24 && r.room > 48)
        console.log(`      \x1b[33mINSTRUMENT WARNING: centre travelled only ${r.travelled}px across ${r.room}px of scroll — this row was not actually swept\x1b[0m`);
      else console.log(`      centre travelled ${r.travelled}px across the sweep`);
      if (r.verdict === 'TRAPPED') console.log(`      \x1b[31mon screen but blocked at every one of its ${r.offsetsOnScreen} offsets\x1b[0m — last blocker ${r.lastBlocker?.what} (pointer-events=${r.lastBlocker?.pe}) at y=${r.lastBlocker?.y}`);
      else if (r.verdict === 'NEVER-VISIBLE') console.log(`      \x1b[35mnever on screen at any offset\x1b[0m — V-6b saw it, this sweep did not reach the offset V-6b used. Reported, not counted as trapped.`);
      else console.log(`      clear at scrollTop=${r.clearedAt.scrollTop}, centre y=${r.clearedAt.y} of ${viewport.height}`);
      verdicts.push({ sid, want: r.want, verdict: r.verdict });
    }
  }
  console.log(`  ERROR FLOOR: ${errs.length ? [...new Set(errs)].join(' | ') : 'clean'}`);
  await ctx.close();
  return verdicts;
}

const srv = await serveDist(DIST, 5941);
const browser = await chromium.launch();
const a = await run(browser, srv, PHONE, 3, PHONE_FINDINGS, 'V-6b — the 7 phone findings');
const b = await run(browser, srv, TABLET, 2, TABLET_FINDINGS, 'V-6c — the 5 iPad findings');
await browser.close(); await srv.close();

const all = [...a, ...b];
const of = v => all.filter(x => x.verdict === v);
const trapped = of('TRAPPED'), clearable = of('CLEARABLE'), never = of('NEVER-VISIBLE');
const other = all.filter(x => !['TRAPPED', 'CLEARABLE', 'NEVER-VISIBLE'].includes(x.verdict));
console.log(`\n\x1b[1m${all.length} findings re-measured · ${trapped.length} TRAPPED · ${clearable.length} CLEARABLE · ${never.length} NEVER-VISIBLE · ${other.length} ungraded\x1b[0m`);
console.log('V-6b and V-6c remain FAIL either way — this probe adds a distinction, it does not remove a criterion.');

/* The falsification condition from the header, checked by the probe itself
   rather than by me reading its output charitably. */
const NOT_CHROME = [['prep/Persona', 'Remove slow to trust'], ['prep/Academy', 'Start One-Shot Adventure']];
const violations = NOT_CHROME.filter(([sid, pre]) => {
  const v = all.find(x => x.sid === sid && x.want.startsWith(pre.slice(0, 18)));
  return v && v.verdict === 'CLEARABLE';
});
console.log(`\n\x1b[1mfalsification check\x1b[0m — the 2 findings whose coverer is not page chrome must not be CLEARABLE:`);
for (const [sid, pre] of NOT_CHROME) {
  const v = all.find(x => x.sid === sid && x.want.startsWith(pre.slice(0, 18)));
  console.log(`  ${sid}  «${pre}» → ${v ? v.verdict : 'NOT MEASURED'}`);
}
if (violations.length) {
  console.log(`\n\x1b[31mREVISION 2 IS VOID — ${violations.length} of them came back CLEARABLE, which the header said cannot happen.`);
  console.log(`No verdict from this run is reported. V-6b/V-6c stand at FAIL with 12 findings, unclassified.\x1b[0m`);
  process.exit(2);
}
console.log('  \x1b[32mheld — the verdicts below are reportable\x1b[0m');
if (trapped.length) { console.log('\nTRAPPED — on screen, and blocked at every offset it is on screen:'); for (const t of trapped) console.log(`  ${t.sid}  «${t.want.slice(0, 44)}»`); }
if (never.length) { console.log('\nNEVER-VISIBLE — this sweep never got it on screen; V-6b did. Not counted as trapped:'); for (const t of never) console.log(`  ${t.sid}  «${t.want.slice(0, 44)}»`); }
process.exit(0);
