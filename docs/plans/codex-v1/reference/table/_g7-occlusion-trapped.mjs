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
   result cannot be read selectively afterwards.                              */
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
  const scroller = [...document.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
    || document.scrollingElement;
  const room = scroller.scrollHeight - scroller.clientHeight;

  const controls = [...document.querySelectorAll(SEL_)].map(el => ({
    el, label: norm(el.getAttribute('aria-label') || el.textContent || el.tagName),
  }));

  const out = [];
  for (const want of wanted) {
    const hit = controls.find(c => c.label.slice(0, want.length) === want)
      || controls.find(c => c.label.includes(want.slice(0, 20)));
    if (!hit) { out.push({ want, found: false }); continue; }
    const el = hit.el;

    let clearedAt = null, offsetsTested = 0, offsetsOnScreen = 0, lastBlocker = null;
    for (let t = 0; t <= room + 24; t += 24) {
      scroller.scrollTop = Math.min(t, room);
      void scroller.offsetHeight;
      offsetsTested++;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (!(cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight)) continue;
      offsetsOnScreen++;
      const top = document.elementFromPoint(cx, cy);
      if (top && (top === el || el.contains(top))) {
        clearedAt = { scrollTop: Math.round(scroller.scrollTop), y: Math.round(cy) };
        break;
      }
      lastBlocker = { what: desc(top), pe: top ? getComputedStyle(top).pointerEvents : '-', y: Math.round(cy) };
    }
    out.push({
      want, found: true, label: hit.label.slice(0, 44),
      size: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      room: Math.round(room), offsetsTested, offsetsOnScreen, clearedAt, lastBlocker,
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
      const trapped = r.clearedAt === null;
      console.log(`  ${trapped ? '\x1b[31mTRAPPED\x1b[0m  ' : '\x1b[32mCLEARABLE\x1b[0m'} ${sid}  «${r.label}»  ${r.size}`);
      console.log(`      V-6b named: ${expect}   scroll room ${r.room}px, ${r.offsetsOnScreen}/${r.offsetsTested} offsets had it on screen`);
      if (trapped) console.log(`      \x1b[31mcentre never resolves to the control at ANY offset\x1b[0m — last blocker ${r.lastBlocker?.what} (pointer-events=${r.lastBlocker?.pe}) at y=${r.lastBlocker?.y}`);
      else console.log(`      clear at scrollTop=${r.clearedAt.scrollTop}, centre y=${r.clearedAt.y} of ${viewport.height}`);
      verdicts.push({ sid, want: r.want, verdict: trapped ? 'TRAPPED' : 'CLEARABLE' });
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
const trapped = all.filter(v => v.verdict === 'TRAPPED');
const clearable = all.filter(v => v.verdict === 'CLEARABLE');
const missing = all.filter(v => v.verdict === 'NOT FOUND');
console.log(`\n\x1b[1m${all.length} findings re-measured · ${trapped.length} TRAPPED · ${clearable.length} CLEARABLE · ${missing.length} not found\x1b[0m`);
console.log('V-6b and V-6c remain FAIL either way — this probe adds a distinction, it does not remove a criterion.');
if (trapped.length) { console.log('\nTRAPPED — a control Marcus cannot reach at any scroll offset:'); for (const t of trapped) console.log(`  ${t.sid}  «${t.want.slice(0, 44)}»`); }
process.exit(0);
