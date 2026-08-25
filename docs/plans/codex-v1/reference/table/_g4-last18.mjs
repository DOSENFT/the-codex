/* G-4 last18 — the residual after the overlay pass is 18 nodes of 1116, and 1.6 %
   is small enough to wave through, which is exactly why it gets named instead.
   Two clusters:

     9  play/Combat only  «Choose Action» «1st/2nd Level Spells» «4 slots» …
                          the ActionMenu. Its opener, "Manage Actions", lives in
                          SmartActionsGrid and the grader logged «no opener on
                          this screen», so the sheet is mounted but unreachable
                          from the fixture's state.
     9  «Normal» on six screens (gold, #c5a55a) and «Rehearsal» «Warmup»
                          «Journal» on prep/Persona (#979182).

   This asks the DOM, in the state the grader was actually in, why each is not
   painted — and for the ActionMenu, what control WOULD open it. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const WANT = ['Choose Action', 'Normal', 'Rehearsal', 'Warmup', 'Journal'];
const srv = await serveDist(DIST, 5929);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);

const EXPLAIN = want => {
  const desc = e => e.tagName.toLowerCase()
    + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 5).join('.') : '');
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.trim();
    if (!want.includes(t)) continue;
    const el = n.parentElement; if (!el) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inView = cx >= 0 && cx < innerWidth && cy >= 0 && cy < innerHeight;
    const hit = inView ? document.elementFromPoint(cx, cy) : null;
    const painted = !!hit && (hit === el || el.contains(hit));
    // is the miss caused by pointer-events, i.e. a hit-test artefact not occlusion?
    let pe = null;
    for (let p = el; p && p !== document.body; p = p.parentElement)
      if (getComputedStyle(p).pointerEvents === 'none') { pe = desc(p); break; }
    out.push({
      t, self: desc(el), painted,
      rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      inView, hit: hit ? desc(hit) : '(none)', pointerEventsNone: pe,
    });
  }
  return out;
};

for (const id of ['play/Combat', 'prep/Persona']) {
  const sc = SCREENS.find(s => s.id === id);
  await goScreen(page, sc); await settle(page);
  // reproduce the grader's overlay state: open the dice sheet
  const dice = page.locator('[aria-label="Open dice roller"]').first();
  if (await dice.count()) { await dice.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(450); await settle(page); }
  console.log(`\n══ ${id} (dice sheet open)`);
  for (const r of await page.evaluate(EXPLAIN, WANT))
    console.log(`  "${r.t}"  painted=${r.painted}  inView=${r.inView}  rect=${r.rect}\n      self=${r.self}\n      hit =${r.hit}\n      pointer-events:none at = ${r.pointerEventsNone || '(none)'}`);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

/* And the ActionMenu: what, if anything, on play/Combat can open it? */
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);
const controls = await page.evaluate(() => [...document.querySelectorAll('main button, main [role="button"]')]
  .map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46))
  .filter(Boolean));
console.log(`\n══ play/Combat — every control inside <main> (${controls.length}), looking for the ActionMenu's opener:`);
for (const c of [...new Set(controls)]) console.log(`   · ${c}`);
await ctx.close(); await browser.close(); await srv.close();
