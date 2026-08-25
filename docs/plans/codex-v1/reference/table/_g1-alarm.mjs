/* G-1 — the other half of the storage guard.
   -----------------------------------------------------------------------------
   `_iv2-combatcrash.mjs` proves the screen no longer dies. It does not prove
   Marcus is TOLD. A guard that swallows the throw and carries on is a quieter
   version of the same lie: the encounter runs, the round counter advances, and
   nothing on the phone has been written — he finds out on the next reload,
   after the session, when the state is gone.

   So: break codex-* writes, tap Start Combat, and ask the one question that
   matters — is there a visible alarm on screen, in words, saying the save did
   not happen?  Then tap Action and Next Turn and confirm it is still there. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile, BOUNDARY_RE } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5921);
const browser = await chromium.launch();

const BREAK = () => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = proto.setItem;
  window.__realSet = real; window.__threw = [];
  proto.setItem = function (k, v) {
    if (String(k).startsWith('codex-')) {
      window.__threw.push(String(k));
      const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
    }
    return real.call(this, k, v);
  };
};

const click = (page, sel) => page.evaluate(s => {
  const b = [...document.querySelectorAll('button,[role="button"]')].find(x =>
    new RegExp(s).test((x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ')) && !x.disabled);
  if (!b) return 'MISSING'; b.scrollIntoView({ block: 'center' }); b.click(); return 'ok';
}, sel);

/* What counts as "told": words on screen, painted, inside the viewport, that
   name the failure. Not a console line, not an aria-live node with zero size. */
const alarm = page => page.evaluate(() => {
  const RE = /not saved|could not save|save failed|couldn.t be saved|storage (is )?full|out of (space|room)/i;
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || !RE.test(t)) continue;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    hits.push({
      text: t.slice(0, 90),
      onScreen: r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight,
      visible: s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05,
      px: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      font: Math.round(parseFloat(s.fontSize)),
    });
  }
  return hits;
});

const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
page.errs = [];
page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 120)));
page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text().split('\n')[0].slice(0, 120)); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);
await goScreen(page, SCREENS[0]); await settle(page);

console.log('before the break — alarms on screen:', JSON.stringify(await alarm(page)));

await page.evaluate(BREAK);
for (const step of ['^Start Combat$', '^Action$', '^Next Turn$']) {
  const r = await click(page, step);
  await page.waitForTimeout(1200);
  const hits = await alarm(page);
  const live = hits.filter(h => h.onScreen && h.visible);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log(`${step.padEnd(16)} tap=${r} boundary=${BOUNDARY_RE.test(t)} errs=${page.errs.length} TOLD=${live.length > 0}`);
  live.forEach(h => console.log(`   "${h.text}"  ${h.px} @${h.font}px`));
  if (!live.length && hits.length) console.log('   found but NOT visible:', JSON.stringify(hits));
}
await page.screenshot({ path: 'docs/plans/codex-v1/reference/table/_g1-alarm.png' });
console.log('keys that threw:', JSON.stringify(await page.evaluate(() => window.__threw)));
console.log('ERRORS:', [...new Set(page.errs)]);

await ctx.close(); await browser.close(); await srv.close();
