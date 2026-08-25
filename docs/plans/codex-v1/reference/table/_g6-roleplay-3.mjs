/* G-6 — what is actually on top of «Impulse», «Recall» and «Engage»?
   -----------------------------------------------------------------------------
   _g3c-trapped, corrected by A-41, says these three are never fully clear at any
   scroll offset on play/Roleplay, and names the blockers as `span.text-xs...`,
   `path` and `button.relative.flex-1.flex`. The last is the tab bar and is
   understood. The first two are not: a `span` and an SVG `path` sitting on a
   control's corners at every offset is either (a) a decoration inside a sibling
   that paints over it — a real defect — or (b) a descendant the containment test
   is failing to recognise, which would be an instrument defect.

   A verdict of "trapped" is worth nothing until that is settled, so this settles
   it by asking three questions the sweep cannot:

     1. WHO are the blockers, by full ancestor chain up to <body>?
     2. Does a REAL tap at the control's centre reach the control? Playwright
        dispatches a genuine pointer event at real coordinates; if the button's
        own handler runs, the control is operable regardless of what decorates
        its corners.
     3. Is the blocker interactive, or is it `pointer-events: none` scenery?

   The distinction decides whether this is a defect in the app or a defect in the
   grader, and this project has now shipped three graders that were wrong about
   the thing they were citing. Assume this one is too until it answers.        */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const TARGETS = [/^Impulse/, /^Recall/, /^Engage/];

const srv = await serveDist(DIST, 5936);
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

await goScreen(page, SCREENS.find(s => s.id === 'play/Roleplay'));
await settle(page);

const report = await page.evaluate(pats => {
  const rx = pats.map(p => new RegExp(p));
  const desc = n => !n?.tagName ? String(n)
    : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className
      ? '.' + n.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  const chain = n => { const o = []; for (let p = n; p && p !== document.body; p = p.parentElement) o.push(desc(p)); return o.join(' < '); };
  const scroller = [...document.querySelectorAll('*')]
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
  const room = scroller.scrollHeight - scroller.clientHeight;

  const out = [];
  for (const el of scroller.querySelectorAll('button')) {
    const label = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (!rx.some(r => r.test(label))) continue;

    /* Sweep for the offset with the FEWEST blocked probe points, rather than the
       first offset at which the control is fully on screen — the latter is by
       construction the moment it clears the bottom edge, i.e. flush against the
       tab bar, which is the least favourable place to judge it. */
    let bestScore = 99, best = null;
    for (let t = 0; t <= room + 24; t += 24) {
      scroller.scrollTop = Math.min(t, room);
      void scroller.offsetHeight;
      const r = el.getBoundingClientRect(), i = 4;
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + i, r.top + i],
        [r.right - i, r.top + i], [r.left + i, r.bottom - i], [r.right - i, r.bottom - i]];
      if (pts.some(([x, y]) => x < 0 || x >= innerWidth || y < 0 || y >= innerHeight)) continue;
      const hits = pts.map(([x, y]) => document.elementFromPoint(x, y));
      const bad = hits.filter(h => !(h === el || el.contains(h)));
      if (bad.length < bestScore) {
        bestScore = bad.length;
        best = {
          scrollTop: Math.round(scroller.scrollTop),
          y: `${Math.round(r.top)}..${Math.round(r.bottom)}`,
          blockers: bad.map(h => ({
            what: desc(h), chain: chain(h),
            pe: getComputedStyle(h).pointerEvents,
            insideEl: el.contains(h),
            isDescendantOfSibling: !el.contains(h),
          })),
        };
      }
      if (bestScore === 0) break;
    }
    out.push({ label: label.slice(0, 40), size: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`, bestScore, best });
  }
  return { room: Math.round(room), out };
}, TARGETS.map(r => r.source));

console.log(`play/Roleplay scroller room=${report.room}px\n`);
for (const t of report.out) {
  console.log(`«${t.label}»  ${t.size}  — worst-case blocked probe points at its BEST offset: ${t.bestScore}/5`);
  if (t.best) {
    console.log(`   at scrollTop=${t.best.scrollTop}, y ${t.best.y} of 844`);
    for (const b of t.best.blockers)
      console.log(`   blocked by ${b.what}   pointer-events=${b.pe}\n      ${b.chain}`);
    if (!t.best.blockers.length) console.log('   nothing blocking at that offset');
  }
  console.log();
}

/* Question 2: does a real tap reach it? */
console.log('── a real pointer event at the centre of each ─────────────────');
for (const pat of TARGETS) {
  const btn = page.locator('main button').filter({ hasText: pat }).first();
  if (!(await btn.count())) { console.log(`   ${pat} — NOT PRESENT (not graded, not clean)`); continue; }
  await btn.scrollIntoViewIfNeeded({ timeout: 3000 });
  await page.waitForTimeout(120);
  const before = await page.evaluate(() => document.body.innerText.length);
  let landed = 'no';
  try {
    await btn.click({ timeout: 2500 });
    landed = 'yes';
  } catch (e) { landed = 'REFUSED: ' + String(e).split('\n')[0].slice(0, 90); }
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.body.innerText.length);
  console.log(`   ${String(pat).padEnd(12)} click landed: ${landed}   screen text ${before} → ${after}${before !== after ? '  (it did something)' : '  (no visible change)'}`);
}

console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
