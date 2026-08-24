/* Does watch()'s AI exemption ever actually fire? It requires BOTH
   /net::ERR_|Failed to load resource/ AND /11434|ollama|generativelanguage/i
   in the SAME console message text. Measure what Playwright puts in text(). */
import { chromium, serveDist, DIST, PHONE } from './rig.mjs';
const srv = await serveDist(DIST, 4297);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
const seen = [];
page.on('console', m => { if (m.type() === 'error') seen.push({ text: m.text(), loc: m.location()?.url || '' }); });
await page.goto(srv.url, { waitUntil: 'networkidle' });
// 1. an aborted request — the N-2 shape
await ctx.route('**/11434/**', r => r.abort());
await page.evaluate(() => fetch('http://localhost:11434/api/chat', { method: 'POST' }).catch(() => {}));
await page.waitForTimeout(1200);
// 2. a real 404 from a reachable host — the shape that actually occurs here
await page.evaluate(u => fetch(u).catch(() => {}), srv.url + 'definitely-not-here-11434.bin');
await page.waitForTimeout(800);
const F = t => /net::ERR_|Failed to load resource/.test(t) && /11434|ollama|generativelanguage/i.test(t);
console.log('\n  console errors seen: ' + seen.length);
for (const e of seen) console.log(`   text=${JSON.stringify(e.text)}\n     location=${JSON.stringify(e.loc)}\n     exemption fires on text? ${F(e.text)}`);
await ctx.close(); await b.close(); await srv.close();
