// VERIFIER probe 11 — N-2 (is the black-hole ever even hit?), N-4 and D-7 with a
// genuinely dead origin rather than ctx.setOffline, D-6 driven for real, R-9 door hunt.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile, storedChars } from './rig.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const tmp = mkdtempSync(join(tmpdir(), 'vfy11-'));
const b = await chromium.launch();
const E = [];
const arm = (page, tag) => {
  page.on('pageerror', e => E.push(`[${tag}] PAGEERROR ` + String(e).split('\n')[0].slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') E.push(`[${tag}] CONSOLE.ERROR ` + m.text().slice(0, 200)); });
};

console.log('=== N-2 — the harness black-holes /11434|ollama|generativelanguage|googleapis/. Is it EVER hit? ===');
{
  const srv = await serveDist(DIST, 5421);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  let hits = 0; const hitUrls = new Set();
  await ctx.route(/11434|ollama|generativelanguage|googleapis/i, async r => { hits++; hitUrls.add(r.request().url().slice(0, 90)); await new Promise(x => setTimeout(x, 60000)); });
  const page = await ctx.newPage(); arm(page, 'N2');
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  const t0 = Date.now();
  await page.getByRole('button', { name: /Heal 5/i }).first().click().catch(() => { });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  console.log(`   the harness's exact sequence: spend took ${Date.now() - t0}ms · black-holed requests intercepted so far = ${hits}`);
  // now try to actually MAKE the app talk to the AI, on every screen
  for (const s of SCREENS) {
    await goScreen(page, s); await settle(page);
    for (const re of [/Ask|Suggest|Coach|Generate|Advis|Analy|AI|Oracle|Whisper|Think/i]) {
      const btns = page.getByRole('button', { name: re });
      const n = Math.min(await btns.count(), 4);
      for (let i = 0; i < n; i++) await btns.nth(i).click({ timeout: 1500 }).catch(() => { });
    }
    await page.waitForTimeout(600);
  }
  console.log(`   after clicking every AI-shaped control on all 7 screens: intercepted = ${hits}  ${[...hitUrls].join(', ')}`);
  const spinner = await page.evaluate(() => [...document.querySelectorAll('[role="status"],[aria-busy="true"],.animate-spin')].length);
  console.log(`   >>> if intercepted = 0, N-2 black-holed nothing and graded a normal spend. spinners now on screen: ${spinner}`);
  await ctx.close(); await srv.close();
}

console.log('\n=== N-4 — poisoned shell cache with a TRULY dead origin (not ctx.setOffline) ===');
{
  const srv = await serveDist(DIST, 5422);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  const page = await ctx.newPage(); arm(page, 'N4');
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(4000);
  const poisoned = await page.evaluate(async base => {
    const shell = (await caches.keys()).find(n => n.startsWith('codex-shell'));
    if (!shell) return 'no shell cache';
    const c = await caches.open(shell);
    await c.put(base, new Response('<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>', { headers: { 'content-type': 'text/html' } }));
    return shell;
  }, srv.url);
  await srv.close();                       // the wifi is really gone
  await page.waitForTimeout(400);
  E.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
  await page.waitForTimeout(2000);
  const t1 = (await page.evaluate(() => document.body.innerText)).trim();
  console.log(`   cache=${poisoned} · after poisoning + dead origin, body is ${t1.length} chars: "${t1.slice(0, 70).replace(/\s+/g, ' ')}"`);
  console.log(`   BRICKED WHILE OFFLINE = ${t1.length < 40}`);
  // ?sw=off with the origin still dead — the recovery he'd actually attempt at the table
  await page.goto(srv.url + '?sw=off', { waitUntil: 'domcontentloaded' }).catch(() => { });
  await page.waitForTimeout(2000);
  const t2 = (await page.evaluate(() => document.body.innerText)).trim();
  console.log(`   ?sw=off WHILE THE ORIGIN IS STILL DEAD → ${t2.length} chars · recovered=${/Nix|Import Character/.test(t2)}`);
  console.log(`   >>> the harness only tries ?sw=off after putting the network BACK, which is a different repair.`);
  const srv2 = await serveDist(DIST, 5422);
  await page.goto(srv2.url + '?sw=off', { waitUntil: 'networkidle' }).catch(() => { });
  await page.waitForTimeout(2500);
  await page.goto(srv2.url, { waitUntil: 'networkidle' }).catch(() => { });
  await page.waitForTimeout(1500);
  const t3 = (await page.evaluate(() => document.body.innerText)).trim();
  console.log(`   with the network back, ?sw=off then reload → recovered=${/Nix|Import Character/.test(t3)}`);
  await ctx.close(); await srv2.close();
}

console.log('\n=== D-7 — export offline, counted in taps, and checked DEEP-EQUAL not just key-present ===');
{
  const srv = await serveDist(DIST, 5423);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3, acceptDownloads: true });
  const page = await ctx.newPage(); arm(page, 'D7');
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  await page.waitForTimeout(4000);
  await srv.close();                        // really offline
  await page.waitForTimeout(300); E.length = 0;
  let taps = 0;
  await page.getByRole('button', { name: /Switch to prep mode/i }).click().catch(() => { }); taps++;
  await page.waitForTimeout(500);
  let btn = page.getByRole('button', { name: /Export Character/i }).first();
  let viaSettings = false;
  if (!(await btn.count())) {
    await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { }); taps++;
    await page.waitForTimeout(700);
    btn = page.getByRole('button', { name: /Export Character/i }).first(); viaSettings = true;
  }
  const needScroll = await btn.count() ? await btn.evaluate(el => { const r = el.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight; }).catch(() => null) : null;
  console.log(`   Export button found=${await btn.count() > 0} viaSettings=${viaSettings} offscreen-before-scroll=${needScroll}`);
  const dl = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await btn.scrollIntoViewIfNeeded().catch(() => { });
  await btn.click().catch(() => { }); taps++;
  const d = await dl;
  console.log(`   taps to export (mode switch + any settings hop + the button) = ${taps}  (≤3)`);
  if (d) {
    const p = join(tmp, 'exp.json'); await d.saveAs(p);
    const out = JSON.parse(readFileSync(p, 'utf8')), src = JSON.parse(readFileSync(FULL, 'utf8'));
    const missing = [], changed = [];
    const eq = (a, z) => JSON.stringify(a) === JSON.stringify(z);
    for (const k of Object.keys(src)) { if (k === 'updatedAt') continue; if (!(k in out)) missing.push(k); else if (!eq(src[k], out[k])) changed.push(k); }
    console.log(`   D-1-grade check on the exported file: ${Object.keys(src).length} source keys · missing=${JSON.stringify(missing)} · NOT deep-equal=${JSON.stringify(changed)}`);
    console.log(`   >>> the harness only checks key PRESENCE here, never the value.`);
  } else console.log('   no download fired');
  await ctx.close();
}

console.log('\n=== D-6 — actually press each destructive control and read what it asks ===');
{
  const srv = await serveDist(DIST, 5424);
  for (const name of ['Reset action economy', 'Long Rest', 'New Character', 'Delete Character']) {
    const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
    await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
    const page = await ctx.newPage(); arm(page, 'D6');
    await page.goto(srv.url, { waitUntil: 'networkidle' });
    await importFile(page, FULL);
    const before = await storedChars(page);
    const beforeTxt = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { });
    await page.waitForTimeout(800);
    const el = page.getByRole('button', { name: new RegExp('^' + name, 'i') }).first();
    if (!(await el.count())) { console.log(`   «${name}» not found`); await ctx.close(); continue; }
    const preCancel = await page.getByRole('button', { name: /^(Cancel|Never ?mind|Keep)/i }).count();
    await el.click().catch(() => { });
    await page.waitForTimeout(900);
    const txt = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const postCancel = await page.getByRole('button', { name: /^(Cancel|Never ?mind|Keep)/i }).count();
    const dialog = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 200)));
    const namesWhatIsLost = /Nix/.test(dialog.join(' ')) || /\bNix\b[\s\S]{0,60}(delete|lost|remove|replac)/i.test(txt);
    const after = await storedChars(page);
    console.log(`   «${name}»  cancel-buttons ${preCancel}→${postCancel} · dialog=${dialog.length ? JSON.stringify(dialog[0].slice(0, 130)) : 'NONE'}`);
    console.log(`        names what is lost (mentions "Nix") = ${namesWhatIsLost} · stored characters ${before}→${after} ${after < before ? '  <<< DESTROYED WITHOUT A CONFIRM' : ''}`);
    if (after === before && postCancel === 0 && dialog.length === 0) {
      const changed = txt !== beforeTxt;
      console.log(`        no dialog, no cancel, nothing deleted — screen text changed = ${changed}${changed ? '  <<< ACTED IMMEDIATELY, NO CONFIRM' : ''}`);
    }
    await ctx.close();
  }
  await srv.close();
}

console.log('\n=== R-9 — is there ANY door to import a second time? ===');
{
  const srv = await serveDist(DIST, 5425);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage(); arm(page, 'R9');
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, FULL);
  const found = [];
  for (const s of SCREENS) {
    await goScreen(page, s); await settle(page);
    if (await page.getByRole('button', { name: /Import/i }).count()) found.push(s.id + ' (on screen)');
  }
  await page.getByRole('button', { name: /Open settings/i }).first().click().catch(() => { });
  await page.waitForTimeout(800);
  if (await page.getByRole('button', { name: /Import/i }).count()) found.push('settings');
  const nc = page.getByRole('button', { name: /^New Character/i }).first();
  if (await nc.count()) {
    await nc.click().catch(() => { }); await page.waitForTimeout(1000);
    const conf = page.getByRole('button', { name: /^(Yes|Confirm|Continue|New Character|Start)/i }).first();
    if (await conf.count()) { await conf.click().catch(() => { }); await page.waitForTimeout(1200); }
    if (await page.getByRole('button', { name: /Import Character/i }).count()) found.push('settings > New Character (destroys the current one first)');
  }
  console.log(`   import doors reachable after one import: ${found.length ? found.join(' · ') : 'NONE'}`);
  console.log(`   >>> the harness's R-9 is "if (await again.count()) { ... }" — with no door, it asserts nothing and prints PASS.`);
  await ctx.close(); await srv.close();
}

console.log('\n=== errors ==='); console.log(E.length ? [...new Set(E)].join('\n') : '  (none)');
await b.close();
