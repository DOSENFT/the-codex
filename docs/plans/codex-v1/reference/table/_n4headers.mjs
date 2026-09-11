/* _n4headers.mjs — scratch. Is the residual font failure on the offline
 * ?sw=off path a real defect, or an artefact of rig.serveDist() sending
 * `cache-control: no-store` on hashed assets that the real deploy sends as
 * immutable? Same probe, two servers, one variable. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium, DIST, watch, settle, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };

function serve(dir, port, immutable) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/the-codex\/?/, '');
    let file = join(dir, p || 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    const hashed = p.startsWith('assets/');
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': immutable && hashed ? 'public, max-age=31536000, immutable' : 'no-store',
    });
    res.end(readFileSync(file));
  });
  return new Promise(r => srv.listen(port, () => r({
    url: `http://localhost:${port}/the-codex/`,
    close: () => new Promise(rr => srv.close(rr)),
  })));
}

const browser = await chromium.launch();
let port = 5430;

for (const immutable of [false, true]) {
  const srv = await serve(DIST, port++, immutable);
  const base = srv.url;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const p1 = await ctx.newPage();
  watch(p1);
  await p1.goto(base, { waitUntil: 'networkidle' });
  await importFile(p1, realCopy('full'));
  await settle(p1);
  await p1.waitForTimeout(4000);
  await p1.reload({ waitUntil: 'networkidle' });
  await p1.waitForTimeout(2500);
  await p1.evaluate(async b => {
    const shell = (await caches.keys()).find(n => n.startsWith('codex-shell-') && n !== 'codex-shell-lkg');
    await (await caches.open(shell)).put(b, new Response(
      '<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>',
      { headers: { 'content-type': 'text/html' } }));
  }, base);
  await p1.close();
  await srv.close();

  const p = await ctx.newPage();
  watch(p);
  const failed = [];
  p.on('requestfailed', r => failed.push(`${r.resourceType()} ${r.url().split('/').pop()}`));
  await p.goto(base + '?sw=off', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(4000);
  const text = await p.evaluate(() => document.body.innerText);
  console.log(`\n=== hashed assets served ${immutable ? 'immutable (production-like)' : 'no-store (rig.serveDist)'} ===`);
  console.log(`  ?sw=off offline: ${text.trim().length} chars, Nix=${/Nix/.test(text)}`);
  console.log(`  console errors : ${p.errs.length}`);
  console.log(`  failed requests: ${failed.length ? failed.join(', ') : 'none'}`);
  await ctx.close();
}
await browser.close();
