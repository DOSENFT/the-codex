// Triage. Three of the failing numbers are suspiciously close to a Playwright
// timeout (15010 ≈ 15000, 8223 ≈ 8000, 30023 ≈ 30000). A timeout is not a
// measurement. Find out, for each, whether the app is slow or the instrument is
// asking the wrong question — and fix the instrument, never the threshold.
import { chromium, freshCtx, goScreen, SCREENS, importFile, judge, drain } from './rig.mjs';
import { realCopy } from './families.mjs';

const LOCAL = 'http://localhost:4173/the-codex/';
const opts = { base: LOCAL, viewport: { width: 390, height: 844 } };
const b = await chromium.launch();
const only = process.argv[2] || 'all';

/* ── S-1: is "Nix" actually findable after a reload? ─────────────────────── */
if (only === 'all' || only === 's1') {
  const { ctx, page } = await freshCtx(b, opts);
  await importFile(page, realCopy('full'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const t = await page.evaluate(() => document.body.innerText);
  console.log('S-1 · body contains "Nix":', /Nix/.test(t));
  console.log('S-1 · getByText("Nix") count:', await page.getByText('Nix').count());
  console.log('S-1 · getByText("Nix").first() visible:',
    await page.getByText('Nix').first().isVisible().catch(e => 'ERR ' + String(e).slice(0, 80)));
  console.log('S-1 · first 160ch:', t.replace(/\s+/g, ' ').slice(0, 160));
  await ctx.close();
}

/* ── S-2: does getByText(regex) find the Roleplay marker? ────────────────── */
if (only === 'all' || only === 's2') {
  const { ctx, page } = await freshCtx(b, opts);
  await importFile(page, realCopy('full'));
  await goScreen(page, SCREENS.find(s => s.id === 'play/Roleplay'));
  const t = await page.evaluate(() => document.body.innerText);
  console.log('\nS-2 · innerText matches /Perform|Catchphrase|Dialogue/:', /Perform|Catchphrase|Dialogue/i.test(t));
  for (const re of [/Perform/i, /Catchphrase/i, /Dialogue/i, /CATCHPHRASES/]) {
    console.log(`S-2 · getByText(${re}) count:`, await page.getByText(re).count());
  }
  console.log('S-2 · headings:', (await page.locator('h1,h2,h3,h4').allInnerTexts()).slice(0, 12).join(' · '));
  await ctx.close();
}

/* ── E-4: after 200 actions, is the button unclickable? ──────────────────── */
if (only === 'all' || only === 'e4') {
  const { ctx, page } = await freshCtx(b, opts);
  await importFile(page, realCopy('full'));
  const el = page.getByRole('button', { name: /Heal 5/i }).first();
  console.log('\nE-4 · Heal 5 count at t=0:', await el.count(), 'enabled:', await el.isEnabled().catch(() => 'n/a'));
  for (let i = 0; i < 60; i++) await el.click({ timeout: 2000 }).catch(() => {});
  const after = page.getByRole('button', { name: /Heal 5/i }).first();
  console.log('E-4 · after 60 clicks — count:', await after.count(),
    'visible:', await after.isVisible().catch(() => 'n/a'),
    'enabled:', await after.isEnabled().catch(() => 'n/a'));
  const box = await after.boundingBox().catch(() => null);
  console.log('E-4 · box:', JSON.stringify(box));
  const t0 = Date.now();
  const err = await after.click({ timeout: 3000 }).then(() => null).catch(e => String(e).split('\n').slice(0, 4).join(' / '));
  console.log('E-4 · click after 60:', err ? `FAILED in ${Date.now() - t0}ms — ${err.slice(0, 300)}` : `ok in ${Date.now() - t0}ms`);
  await ctx.close();
}

/* ── N-1: does it actually boot offline with the service worker on? ──────── */
if (only === 'all' || only === 'n1') {
  const ctx = await b.newContext({ viewport: opts.viewport, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const { watch } = await import('./rig.mjs');
  watch(page);
  await page.goto(LOCAL, { waitUntil: 'networkidle' });
  await importFile(page, realCopy('full'));
  for (const wait of [3500, 8000, 15000]) {
    await page.waitForTimeout(wait === 3500 ? 3500 : 4500);
    const state = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      const keys = await caches.keys();
      const counts = {};
      for (const k of keys) counts[k] = (await (await caches.open(k)).keys()).length;
      return {
        regs: regs.length,
        controlled: !!navigator.serviceWorker.controller,
        state: regs[0] ? (regs[0].active ? 'active' : regs[0].installing ? 'installing' : 'waiting') : 'none',
        counts,
      };
    });
    console.log(`\nN-1 · after ~${wait}ms:`, JSON.stringify(state));
  }
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => console.log('N-1 · reload threw:', String(e).slice(0, 120)));
  await page.waitForTimeout(2500);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  console.log('N-1 · offline body length:', t.length, '|', t.slice(0, 200));
  await drain(page);
  console.log('N-1 · errors:', page.errs.slice(0, 8));
  const failed = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(r => r.responseStatus === 0 || r.transferSize === 0 && r.decodedBodySize === 0)
    .map(r => r.name.split('/').pop()).slice(0, 20));
  console.log('N-1 · resources that did not arrive:', failed);
  await ctx.close();
}

await b.close();
