/* _n4update.mjs — the other half of the N-4 fix, which is the half that can
 * quietly ruin the app: does a real deploy STILL LAND?
 *
 * A last-known-good cache is one line of code away from being a stale-forever
 * app, and a stale-forever app is a worse bug than the one it replaced —
 * because it is silent, it survives every push, and nobody finds it until a
 * rules fix he needs at a table is not there. So this probe deploys three times
 * on the same origin and asks, in order:
 *
 *   ALPHA   installs and earns the parachute.
 *   BRAVO   is a genuine new deploy. It must land online immediately, and once
 *           its worker activates the parachute must FOLLOW it.
 *   CHARLIE is a BROKEN deploy: an index.html naming a bundle that is not on
 *           the server. It must land online — we do not get to refuse a deploy
 *           — and it must NOT be promoted. With the origin then dead, the
 *           device must roll back to BRAVO rather than show the white screen
 *           CHARLIE is.
 *
 * TWO THINGS THIS FILE DOES NOT BORROW FROM rig.mjs, both on purpose:
 *
 *  1. ITS OWN SERVER.  rig.serveDist() answers EVERY unknown path with
 *     index.html and a 200 — an SPA fallback applied to `assets/` too. Under
 *     that server a deploy naming a missing bundle gets a 200 back, the worker
 *     caches it (it is `ok`), and a broken deploy looks precachable. No real
 *     static host behaves that way; GitHub Pages 404s a missing asset. The
 *     first draft of this probe used serveDist and "proved" a rollback that had
 *     not happened. The server below 404s missing files under `assets/` and
 *     falls back to index.html only for navigations, which is the real shape.
 *
 *  2. COLD STARTS, NOT RELOADS.  sw.js deliberately does not skipWaiting, and
 *     page.reload() does not release the old worker's client — so a waiting
 *     worker never activates and the new deploy's cache never appears. Reload
 *     is not "the next time he opens it". Closing the page and opening another
 *     one is.
 *
 * Run:  node docs/plans/codex-v1/reference/table/_n4update.mjs
 */
import { createServer } from 'node:http';
import { cpSync, readFileSync, writeFileSync, mkdtempSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, DIST, watch, settle, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const PORT = 5441;
const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!ok) fails.push(name + (detail ? ` — ${detail}` : ''));
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };

/** A static host that tells the truth about missing files. `dir` is swapped
 *  between deploys without the port changing — same origin, new bytes, which is
 *  exactly what a deploy is. */
let DIR = null;
function host(port) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/the-codex\/?/, '');
    const file = join(DIR, p || 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) {
      if (p.startsWith('assets/') || /\.[a-z0-9]+$/i.test(p)) {   // a file, and it is not there
        res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
        return res.end('404');
      }
      return send(join(DIR, 'index.html'));                        // a route: SPA fallback
    }
    send(file);
    function send(f) {
      res.writeHead(200, {
        'content-type': MIME[extname(f)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(readFileSync(f));
    }
  });
  return new Promise(r => srv.listen(port, () => r({
    url: `http://localhost:${port}/the-codex/`,
    close: () => new Promise(rr => srv.close(rr)),
  })));
}

/** A copy of dist/ that is a different deploy: a visible marker in the body and
 *  a different BUILD_ID, which is what a real rebuild produces. */
function deploy(label, { breakIt = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'codex-deploy-'));
  cpSync(DIST, dir, { recursive: true });
  let html = readFileSync(join(dir, 'index.html'), 'utf8');
  html = html.replace('<div id="root"></div>',
    `<div id="root"></div><div id="deploy-marker" style="position:fixed;bottom:0;left:0;font-size:9px;opacity:.6">DEPLOY-${label}</div>`);
  if (breakIt) html = html.replace(/assets\/index-[^."]+\.js/, 'assets/index-BROKEN0.js');
  writeFileSync(join(dir, 'index.html'), html);
  const sw = readFileSync(join(dir, 'sw.js'), 'utf8')
    .replace(/const BUILD_ID = "[0-9a-f]+"/, `const BUILD_ID = "deploy${label.toLowerCase()}"`);
  writeFileSync(join(dir, 'sw.js'), sw);
  return dir;
}

const state = page => page.evaluate(async () => {
  const names = await caches.keys();
  const root = location.origin + location.pathname.replace(/[^/]*$/, '');
  const lkg = names.includes('codex-shell-lkg') ? await caches.open('codex-shell-lkg') : null;
  const stampRes = lkg && await lkg.match(root + '__lkg-build');
  const idxRes = lkg && await lkg.match(root);
  const idx = idxRes ? await idxRes.text() : '';
  return {
    names, stamp: stampRes ? await stampRes.text() : null,
    lkgMarker: (idx.match(/DEPLOY-([A-Z]+)/) || [])[1] || null,
  };
});
const marker = page => page.evaluate(() => {
  const el = document.getElementById('deploy-marker');
  return el ? el.textContent : null;
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
let srv = null, base = '';
console.log('\n\x1b[1mN-4 — the parachute must not become a straitjacket\x1b[0m\n');

/** A cold start: the previous client is gone, so a waiting worker can activate. */
async function coldBoot(waitMs = 3500, wait = 'networkidle') {
  const p = await ctx.newPage();
  watch(p);
  await p.goto(base, { waitUntil: wait }).catch(() => {});
  await p.waitForTimeout(waitMs);
  return p;
}

try {
  DIR = deploy('ALPHA');
  srv = await host(PORT);
  base = srv.url;

  /* ── ALPHA ─────────────────────────────────────────────────────────────── */
  let p = await ctx.newPage();
  watch(p);
  await p.goto(base, { waitUntil: 'networkidle' });
  await importFile(p, realCopy('full'));
  await settle(p);
  await p.waitForTimeout(4000);
  await p.close();
  p = await coldBoot();
  let s = await state(p);
  console.log(`  ALPHA  caches=${JSON.stringify(s.names)}  stamp=${s.stamp}  lkg=${s.lkgMarker}`);
  check('ALPHA is on screen and in the parachute',
    await marker(p) === 'DEPLOY-ALPHA' && s.lkgMarker === 'ALPHA', `screen=${await marker(p)} lkg=${s.lkgMarker}`);
  check('ALPHA booted clean', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
  await p.close();

  /* ── BRAVO: a genuine new deploy on the same origin ────────────────────── */
  DIR = deploy('BRAVO');
  p = await coldBoot();
  check('BRAVO lands online on the very first load after the deploy',
    await marker(p) === 'DEPLOY-BRAVO', `saw ${await marker(p)}`);
  await p.close();
  p = await coldBoot();                                   // the worker takes over here
  await p.close();
  p = await coldBoot();
  s = await state(p);
  console.log(`  BRAVO  caches=${JSON.stringify(s.names)}  stamp=${s.stamp}  lkg=${s.lkgMarker}`);
  check('the old versioned shell was swept, the parachute was not',
    s.names.includes('codex-shell-lkg') &&
    s.names.filter(n => n.startsWith('codex-shell-')).length === 2 &&
    !s.names.includes('codex-shell-deployalpha'), JSON.stringify(s.names));
  check('the parachute FOLLOWED the deploy — it holds BRAVO now, not ALPHA',
    s.lkgMarker === 'BRAVO' && s.stamp === 'deploybravo', `lkg=${s.lkgMarker} stamp=${s.stamp}`);
  check('no errors across the ALPHA→BRAVO upgrade', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
  await p.close();

  /* ── CHARLIE: a broken deploy ──────────────────────────────────────────── */
  DIR = deploy('CHARLIE', { breakIt: true });
  // Errors here are the CONDITION, not the defect: CHARLIE genuinely is broken.
  for (let i = 0; i < 3; i++) { const q = await coldBoot(4000, 'domcontentloaded'); await q.close(); }
  const pc = await coldBoot(3000, 'domcontentloaded');
  s = await state(pc);
  console.log(`  CHARLIE (broken)  caches=${JSON.stringify(s.names)}  stamp=${s.stamp}  lkg=${s.lkgMarker}`);
  check('the broken deploy is live — this probe is not testing a deploy that failed to land',
    await marker(pc) === null || (await pc.evaluate(() => document.body.innerText)).trim().length < 40,
    `body=${(await pc.evaluate(() => document.body.innerText)).trim().slice(0, 60)}`);
  check('a broken deploy is NOT promoted — the parachute still holds BRAVO',
    s.lkgMarker === 'BRAVO' && s.stamp === 'deploybravo', `lkg=${s.lkgMarker} stamp=${s.stamp}`);
  await pc.close();

  /* ── the origin dies while CHARLIE is what the device has ──────────────── */
  await srv.close();
  srv = null;
  console.log('\n  \x1b[33mHTTP server closed on top of the broken deploy.\x1b[0m');
  const p2 = await coldBoot(4000, 'domcontentloaded');
  const text = await p2.evaluate(() => document.body.innerText);
  console.log(`  offline cold boot: ${text.trim().length} chars, marker=${await marker(p2)}`);
  check('offline, the device rolls back to the last deploy that worked',
    await marker(p2) === 'DEPLOY-BRAVO', `saw ${await marker(p2)}`);
  check('and it is the real app, with his character', /Nix/.test(text), text.slice(0, 80));
  check('no errors on the rollback boot', p2.errs.length === 0, p2.errs.slice(0, 3).join(' | '));
  await p2.close();
} catch (e) {
  check('the probe ran to completion', false, String(e).slice(0, 300));
} finally {
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  if (srv) await srv.close().catch(() => {});
}

console.log(`\n\x1b[1m${fails.length ? `\x1b[31m${fails.length} FAILED` : '\x1b[32mALL GREEN'}\x1b[0m`);
for (const f of fails) console.log(`  \x1b[31m×\x1b[0m ${f}`);
process.exit(fails.length ? 1 : 0);
