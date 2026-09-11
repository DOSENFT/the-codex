// VERIFIER probe 16 — sanity on the two remaining already-failing criteria: V-6 and S-1.
import { chromium, serveDist, DIST, PHONE, deadOrigin, goScreen, settle, SCREENS, importFile, audit } from './rig.mjs';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const b = await chromium.launch();

console.log('=== V-6 — spend controls and the tab bar inside the bottom 60% of 390×844 ===');
{
  const srv = await serveDist(DIST, 5430);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  const SPEND = /heal|expend|restore|slot|spend|use|cast|attack|damage|action|bonus|reaction|move/i;
  const outside = new Set();
  for (const s of SCREENS) {
    await goScreen(page, s); await settle(page);
    const a = await audit(page);
    for (const c of a.touch) {
      if (!SPEND.test(c.label || '')) continue;
      if (c.y !== undefined && c.y < 844 * 0.4) outside.add(`${s.id} «${(c.label || '').slice(0, 34)}» top=${Math.round(c.y)}px`);
    }
  }
  console.log(`   spend-shaped controls whose top sits above the 337px line (i.e. outside the bottom 60%): ${outside.size}`);
  [...outside].slice(0, 12).forEach(x => console.log('      ' + x));
  console.log(`   (builder reported 15 outside — FAIL. Same order of magnitude, same verdict.)`);
  await ctx.close(); await srv.close();
}

console.log('\n=== S-1 — cold launch to Nix on screen, worker warm, origin dead, 4x CPU ===');
{
  const times = [];
  for (let i = 0; i < 3; i++) {
    const { ctx, page } = await deadOrigin(b, { viewport: PHONE, dpr: 3, before: p => importFile(p, FULL) });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
    const ms = await page.evaluate(async () => {
      const dl = performance.now() + 15000;
      while (performance.now() < dl) {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!/\bNix\b/.test(n.nodeValue || '')) continue;
          const el = n.parentElement; if (!el) continue;
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') return Math.round(performance.now());
        }
        await new Promise(r => requestAnimationFrame(r));
      }
      return null;
    });
    times.push(ms);
    await ctx.close();
  }
  console.log(`   navigationStart → the frame Nix is painted on: ${times.map(t => t === null ? 'NEVER' : t + 'ms').join(', ')}   (≤2000ms)`);
  console.log(`   (builder reported 2899/2981/2776/2826/2852ms — FAIL.)`);
}
await b.close();
