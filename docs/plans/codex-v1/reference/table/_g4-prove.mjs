/* G-4 proof — V-2 and V-3 over the population that was never graded.
   -----------------------------------------------------------------------------
   Two things are being tested and they must not be confused.

   1. THE INSTRUMENT. rig.mjs:325 parsed colours with /rgba?\(/ and Tailwind 4
      emits oklch(), so every oklch node came back with ink=null and was dropped
      by pixelContrast() before grading. A-34 adds a canvas fallback. This probe
      prints COVERAGE — how many visible text nodes have an ink colour at all —
      so the size of the old blind spot is a number in this log and not a claim.

   2. THE APP. The verifier measured play/Combat's «No active conditions» at
      2.36:1 against V-2's 4.5:1. `--color-forge-2` is 4.85:1 at full opacity, so
      every `text-forge-2/N` in the codebase is under the floor; there were 28.
      G-4 removed the alpha at all 28.

   THE SWEEP, and why the first version of this probe was not entitled to its
   green. It visited two scroll positions per screen — 'top' and 'bottom' — and
   graded whatever was painted at those two. Its own accounting then said:

       text nodes rig considers on the page   2627
       of those, PAINTED where they claim to be 613
       not painted there (clipped or covered)  2014   <- NOT GRADED

   613 of 2627 is 23 %. A green over 23 % of the population reported without the
   denominator is precisely the defect this whole document exists to catch, and
   I wrote it. `<main>` is an overflow:auto band 356px tall holding ~1554px of
   content; two samples of a 356px window cannot see the middle of it. So this
   version steps the real scroller through its whole range — the same shape
   _g3c-trapped.mjs already uses for controls — auditing and pixel-reading at
   every step, and de-duplicating by screen+text+size. What is still ungraded at
   the end is printed with its count and named UNPROVEN, not counted as passing.

   The stepped sweep took coverage from 23 % to 50.9 %, and then its own residual
   named the rest: ~70 distinct nodes on every one of the seven screens, which is
   too uniform to be page content. _g4-why.mjs asked the DOM why each was not
   painted and got one answer — three bottom sheets («Choose Action», «Dice
   Roller», «Mechanics Reference»), mounted globally, `inert` and translated down
   by their own height. Closed. So this probe now OPENS them, by their own
   controls, and sweeps each one too. See the OVERLAYS block below.

   KNOWN LIMIT, stated because the result is a green one. One scroller at a
   time: the largest on-screen vertical one — `main` on the base pass, the sheet
   itself once a sheet is open. Any text that is never painted in any of those
   states stays in the ungraded list and is printed as UNPROVEN with its count.

   Thresholds are V-2's 4.5:1 and V-3's 7:1 for numerals, unchanged. Numerals are
   identified by rig's own NUMERIC test, not by a fresh one written here.

   Run against the previous dist to watch it fail; against this one to watch it
   pass. Anything it reports as UNGRADED is stated as ungraded, not as passing. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, audit, pixelContrast } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const V2 = 4.5, V3 = 7;
/* --dist <path> so the SAME grader can be pointed at an older build. Watching
   this probe go red on `618fcc3` is the only thing that makes its green on HEAD
   worth anything. */
const dArg = process.argv.indexOf('--dist');
const DIST_USED = dArg > -1 ? process.argv[dArg + 1] : DIST;
console.log(`grading: ${DIST_USED}`);
const srv = await serveDist(DIST_USED, 5925);
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

/* Scroller election. rig.mjs's scrollPage rule — on-screen first, then largest —
   is right for a bare screen and WRONG the moment a sheet is open, which cost a
   whole pass to learn: on prep/Character `main` has 3692px of room and the open
   mechanics sheet has 3010px, so "largest" elected the page BEHIND the sheet.
   The sweep then scrolled a surface the user cannot even see while the sheet
   sat still, and 44 nodes of open, on-screen drawer stayed ungraded.

   So when a sheet is open, the sheet IS the page: candidates are restricted to
   a non-inert bottom sheet and its descendants. Openness is read from the app's
   own `inert`, not from a flag this probe sets. */
const CANDIDATES = over => over
  ? `[...document.querySelectorAll('div.fixed.inset-x-0.bottom-0:not([inert])')]
       .flatMap(s => [s, ...s.querySelectorAll('*')])`
  : `[...document.querySelectorAll('*')]`;
const ELECT = over => `(() => {
  const onScreen = e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05
      && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < window.innerHeight;
  };
  const el = ${CANDIDATES(over)}
    .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && onScreen(e))
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
  return el || ${over ? 'null' : 'document.scrollingElement || document.documentElement'};
})()`;

const geometry = (page, over) => page.evaluate(`(() => {
  const el = ${ELECT(over)};
  if (!el) return null;
  return { room: el.scrollHeight - el.clientHeight, view: el.clientHeight,
           tag: el.tagName.toLowerCase() };
})()`);
const scrollTo = (page, t, over) => page.evaluate(`(() => {
  const el = ${ELECT(over)};
  if (!el) return -1;
  el.scrollTop = ${t};
  void el.offsetHeight;
  ${over ? '' : `window.scrollTo(0, ${t});`}
  return el.scrollTop;
})()`);

/* key for a distinct node. pixelContrast returns {t,size,numeric,pixel} and no
   coordinates, so screen+text+size is the finest key both sides share. Two
   different nodes with identical text AND size on one screen collapse into one;
   that is the same dedup the report already used and it is stated, not hidden. */
const key = (screen, n) => `${screen}|${n.t}|${n.size}`;

const population = new Map();   // key -> a sample row, every node rig ever saw
const graded = new Map();       // key -> worst pixel ratio seen
const underV2 = new Map(), underV3 = new Map();
let positions = 0, reads = 0;

/* Sweep whatever is currently the largest on-screen scroller, from top to
   bottom, grading at every stop. `keyScreen` is the SCREEN the nodes belong to,
   which is deliberately not `where` — an overlay's text is still that screen's
   text, so opening the dice drawer closes population entries that the base pass
   left ungraded instead of opening a second, parallel population. */
async function sweep(page, keyScreen, where, over = false) {
  await scrollTo(page, 0, over); await page.waitForTimeout(250); await settle(page);
  const g = await geometry(page, over);
  /* An open sheet whose content fits needs no sweep — one stop at 0 grades it.
     Saying so out loud beats silently sweeping the page behind it. */
  const stops = [];
  if (!g) { stops.push(0); console.log(`── ${where.padEnd(30)} (no scroller — single stop)`); }
  else {
    /* Overlap of 80px between windows so a node straddling a step boundary, or
       sitting under the fixed turn deck at one position, gets a second look. */
    const STEP = Math.max(120, g.view - 80);
    for (let t = 0; t <= g.room; t += STEP) stops.push(t);
    if (stops[stops.length - 1] !== g.room) stops.push(g.room);
    console.log(`── ${where.padEnd(30)} <${g.tag}> view=${Math.round(g.view)} room=${Math.round(g.room)}  ${stops.length} stops`);
  }

  for (const t of stops) {
    await scrollTo(page, t, over);
    await page.waitForTimeout(180); await settle(page);
    positions++;
    const { text } = await audit(page);
    for (const n of text) if (!population.has(key(keyScreen, n))) population.set(key(keyScreen, n), { ...n, screen: keyScreen });
    const px = await pixelContrast(page, text.filter(n => n.painted));
    reads += px.length;
    for (const m of px) {
      const k = key(keyScreen, m);
      /* worst reading wins: a node graded 6:1 at one stop and 2.6:1 at another
         is a 2.6:1 node. Taking the best would be softening by sampling. */
      if (!graded.has(k) || m.pixel < graded.get(k).pixel) graded.set(k, { ...m, screen: keyScreen, at: `${where}@${t}` });
    }
  }
}

/* THE OVERLAYS. _g4-why.mjs found that the sweep's whole residual was three
   bottom sheets — «Choose Action», «Dice Roller», «Mechanics Reference» —
   mounted on every screen with `inert` and `translateY(height)`, i.e. CLOSED.
   No scroll position paints them, and 120 nodes per screen of text he reads at
   the table were sitting outside V-2 entirely.

   They are not unreachable; the grader simply never opened them. It opens them
   now, by the app's own controls, and grades what appears. That is the harness
   using the app, not the harness editing it: no style is overridden, no state
   is poked, nothing is un-inerted. Escape then a fresh goScreen resets between
   overlays so one sheet's state cannot leak into the next one's measurement. */
const OVERLAYS = [
  { name: 'dice', sel: '[aria-label="Open dice roller"]' },
  { name: 'mechanics', sel: '[aria-label="Open mechanics reference"]' },
  // ActionMenu's opener lives in SmartActionsGrid and exists on play/Combat only
  { name: 'actions', sel: 'button:has-text("Manage Actions")' },
];

async function overlayPass(sc, tag) {
  for (const ov of OVERLAYS) {
    const btn = page.locator(ov.sel).first();
    if (!(await btn.count())) { console.log(`   ·· ${tag} ${ov.name}: no opener in this state — its text stays UNGRADED`); continue; }
    try {
      await btn.scrollIntoViewIfNeeded({ timeout: 3000 });
      await btn.click({ timeout: 3000 });
    } catch { console.log(`   ·· ${tag} ${ov.name}: opener present but not clickable — UNPROVEN`); continue; }
    await page.waitForTimeout(450); await settle(page);
    await sweep(page, sc.id, `${tag}>${ov.name}`, true);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
    await goScreen(page, sc); await settle(page);
  }
}

for (const sc of SCREENS) {
  await goScreen(page, sc); await settle(page);
  await sweep(page, sc.id, sc.id);
  await overlayPass(sc, sc.id);

  /* IN COMBAT — the state this whole app is named for, and it was ungraded.
     The seven screens are entered from a fresh import, and a fresh import is
     OUT of combat, so play/Combat has always been measured showing «Start
     Combat». Every surface behind that button — the initiative order, the turn
     banner, the action economy, and the ActionMenu whose opener «Manage
     Actions» only renders in combat — has never been read by any pass. That is
     also the whole of the 9-node residual _g4-last18 reported: not unreachable,
     just never entered.

     A design criterion measured only in the state where nothing is happening is
     not measuring this app. The harness presses the app's own button and grades
     what appears, under the SAME screen key, so in-combat text closes ungraded
     out-of-combat entries instead of opening a second population to compare
     favourably against. */
  if (sc.id === 'play/Combat') {
    const start = page.locator('button:has-text("Start Combat")').first();
    if (!(await start.count())) console.log('   ·· play/Combat: no «Start Combat» control — the in-combat surface stays UNGRADED');
    else {
      try {
        await start.scrollIntoViewIfNeeded({ timeout: 3000 });
        await start.click({ timeout: 3000 });
        await page.waitForTimeout(700); await settle(page);
        await sweep(page, sc.id, 'play/Combat(in combat)');
        await overlayPass(sc, 'play/Combat(in combat)');
      } catch (e) { console.log(`   ·· play/Combat: could not enter combat (${String(e).split('\n')[0].slice(0, 80)}) — UNPROVEN`); }
    }
  }
}
for (const [k, m] of graded) {
  if (m.numeric) { if (m.pixel < V3) underV3.set(k, m); }
  else if (m.pixel < V2) underV2.set(k, m);
}

/* TIER B — the closed overlays.
   The sweep's residual is not random. It is ~70 nodes on every one of the seven
   screens, and the first thirty read «Choose Action», «Dice Roller», «Quick
   Roll», «d20»: the action sheet and the dice drawer, mounted on every screen
   and closed. No amount of scrolling `main` paints them, because they are not
   in `main`'s flow — they are dismissed overlays. Yet that text is text Marcus
   reads at the table the moment he opens the drawer, and leaving it ungraded
   would put the app's two busiest panels outside V-2 entirely.

   pixelContrast exists for ONE reason: bgOf() returns null when it meets a
   background-IMAGE, because it cannot divide by a gradient. When there is no
   image in the chain, bgOf's composite is not an approximation of the pixels —
   it is the exact WCAG computation, and the modal-bin pixel read is the weaker
   of the two. So a node with `contrast != null && !onImage` is fully graded by
   rig's own DOM number, painted or not.

   This is a second tier, reported as its own tier and against the SAME
   thresholds. It is not a fallback that lets anything through: a node with an
   image behind it and no painted pixels stays in tier C and is named UNPROVEN. */
const compos = new Map();
for (const [k, n] of population) {
  if (graded.has(k)) continue;
  if (n.contrast == null || n.onImage) continue;
  compos.set(k, n);
}
const cUnderV2 = new Map(), cUnderV3 = new Map();
for (const [k, n] of compos) {
  if (n.numeric) { if (n.contrast < V3) cUnderV3.set(k, n); }
  else if (n.contrast < V2) cUnderV2.set(k, n);
}

const ungraded = [...population.entries()]
  .filter(([k]) => !graded.has(k) && !compos.has(k)).map(([, n]) => n);
console.log(`\n===== population — every drop is named, because a silent drop reads as a pass =====`);
console.log(`  scroll positions visited                ${positions}`);
console.log(`  distinct text nodes rig ever saw        ${population.size}`);
console.log(`  tier A — PIXEL-READ somewhere           ${graded.size}   (${(graded.size / population.size * 100).toFixed(1)} %)`);
console.log(`  tier B — never painted, exact composite ${compos.size}   (${(compos.size / population.size * 100).toFixed(1)} %)`);
console.log(`  tier A+B graded                         ${graded.size + compos.size}   (${((graded.size + compos.size) / population.size * 100).toFixed(1)} %)`);
console.log(`  pixel reads taken (incl. repeats)       ${reads}`);
console.log(`  tier C — never painted, image behind    ${ungraded.length}   <- UNPROVEN, not passing`);
const byScreen = new Map();
for (const n of ungraded) byScreen.set(n.screen, (byScreen.get(n.screen) || 0) + 1);
for (const [s, c] of byScreen) console.log(`      ${s.padEnd(18)} ${c}`);
console.log(`\n  first 30 tier-C nodes (never painted AND a background-image in the chain):`);
for (const n of ungraded.slice(0, 30)) console.log(`    -- ${n.screen}  "${n.t}"  ${n.size}px  ink=${n.ink ? n.ink.join(',') : 'null'}  onImage=${n.onImage}`);
if (ungraded.length > 30) console.log(`    ... and ${ungraded.length - 30} more`);

console.log(`\n===== V-2  text below ${V2}:1 =====  ${underV2.size + cUnderV2.size} distinct  (A ${underV2.size} · B ${cUnderV2.size})`);
for (const u of underV2.values()) console.log(`  XX [A pixel] ${u.screen}@${u.at}  "${u.t}"  ${u.size}px  ${u.pixel}:1`);
for (const u of cUnderV2.values()) console.log(`  XX [B compos] ${u.screen}  "${u.t}"  ${u.size}px  ${u.contrast}:1  ${u.cls}`);
console.log(`\n===== V-3  numerals below ${V3}:1 =====  ${underV3.size + cUnderV3.size} distinct  (A ${underV3.size} · B ${cUnderV3.size})`);
for (const u of underV3.values()) console.log(`  XX [A pixel] ${u.screen}@${u.at}  "${u.t}"  ${u.size}px  ${u.pixel}:1`);
for (const u of cUnderV3.values()) console.log(`  XX [B compos] ${u.screen}  "${u.t}"  ${u.size}px  ${u.contrast}:1  ${u.cls}`);
console.log('\nERROR FLOOR:', errs.length ? [...new Set(errs)] : 'clean');
await ctx.close(); await browser.close(); await srv.close();
