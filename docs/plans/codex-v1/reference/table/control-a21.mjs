/* CONTROL for A-21 — the app may not probe a URL it invented about itself.
   ---------------------------------------------------------------------------
   Measured on the live site on 2026-08-22: opening Settings on
   https://dosenft.github.io/the-codex/ fires

       GET https://dosenft.github.io/ollama/api/tags   →  404

   and a 404 on a subresource is a console error, on every visit. The address
   was not configured by anyone — `getDefaultOllamaUrl()` built it out of
   `window.location.origin` on the assumption that something would proxy it.
   GitHub Pages is static hosting. Nothing proxies it. Nothing ever will.

     want    0 requests to any /ollama path, 0 console errors, and a sentence
             on screen saying why Ollama is not on offer here
     before  1 request, 1 console error, and a button offering the 404

   TWO THINGS THIS CONTROL DOES DIFFERENTLY, both load-bearing:

   1. IT DOES NOT USE `watch()` FROM THE RIG. That helper deliberately drops
      console errors matching /11434|ollama|generativelanguage/ — correct for
      the N-2 family, where a black-holed AI endpoint is the CONDITION of the
      test. Here it is the DEFECT, so this file attaches its own listeners and
      filters nothing at all. A control that inherited the rig's filter would
      have printed PASS against the broken build. That is worth saying out
      loud, because it is the exact shape of the failure TABLE-READY exists to
      stop: an instrument that cannot see the thing it is pointed at.

   2. THE ORIGIN IS REAL, NOT SIMULATED. `serveDist` serves on localhost, and
      localhost is the one origin where the old behaviour was correct — a
      control run there measures nothing. So the built dist is served to the
      browser AS `https://dosenft.github.io/the-codex/`, through a route
      handler that mirrors GitHub Pages: paths under /the-codex/ come from
      dist, and everything else 404s exactly the way Pages 404s /ollama. The
      app sees an https page on a foreign host, which is the whole condition.

   Phase 2 then serves the same build from a genuine localhost through the
   rig's own `serveDist`, and checks the desktop did not pay for the phone's
   fix: Ollama must still be the default there, still pointed at :11434.

   `--prev` runs it against a pre-A-21 dist. A fix that cannot be watched
   failing here is not proven. Build first: `npm run build`. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium, serveDist, DIST, PHONE, importFile, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-a21/dist';
const prev = process.argv.includes('--prev');
const dir = prev ? PREV : DIST;
const label = prev ? 'PREV (origin/ollama invented)' : 'HEAD (no address invented)';

if (!existsSync(join(dir, 'index.html'))) {
  console.log(`\n\x1b[31mno build at ${dir}\x1b[0m — run \`npm run build\`${prev ? ' into that dir' : ''} first\n`);
  process.exit(1);
}

const LIVE_ORIGIN = 'https://dosenft.github.io';
const LIVE_URL = `${LIVE_ORIGIN}/the-codex/`;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg',
};

/** GitHub Pages, faithfully: /the-codex/* is the site, everything else is a
 *  404. The fidelity of that second clause is the entire point — a handler
 *  that SPA-fell-back /ollama/api/tags to index.html with a 200 would have
 *  swallowed the console error and reported the broken build as clean. */
const pagesHandler = root => async route => {
  const u = new URL(route.request().url());
  if (!u.pathname.startsWith('/the-codex')) {
    return route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>404</h1>' });
  }
  const rel = decodeURIComponent(u.pathname).replace(/^\/the-codex\/?/, '');
  let file = join(root, rel || 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  return route.fulfill({
    status: 200,
    contentType: MIME[extname(file)] || 'application/octet-stream',
    body: readFileSync(file),
  });
};

/** Unfiltered. Every console error, every uncaught throw, every dead promise,
 *  and every request the page attempts. Nothing here is allowed an exemption. */
function listen(page) {
  page.errs = [];
  page.reqs = [];
  page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text().slice(0, 220)); });
  page.on('pageerror', e => page.errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 220)));
  page.on('request', r => page.reqs.push(r.url()));
  return page;
}
const drainRejections = async page => {
  const r = await page.evaluate(() => { const o = window.__rej || []; window.__rej = []; return o; }).catch(() => []);
  page.errs.push(...r.map(x => 'rejection: ' + x));
};

/** The requests that are the defect: anything at an /ollama path, or at the
 *  Ollama port, wherever it was aimed. */
const ollamaReqs = page => page.reqs.filter(u => /\/ollama(\/|$)|:11434/.test(u));

const openSettings = async page => {
  await page.getByRole('button', { name: /Open settings/i }).first().click({ timeout: 10000 });
  // The model probe is debounced 400ms and then has a request to make. Waiting
  // well past both is what makes "no request" a measurement rather than a race.
  await page.waitForTimeout(2600);
  await settle(page);
};

console.log(`\n\x1b[1mA-21 does opening Settings probe an address the app made up — ${label}\x1b[0m  ${dir}\n`);

const b = await chromium.launch();
let fails = 0;
/* Detail prints on FAILURE only. The first version printed it always, and two
   hundred characters of body text under every green line is how a reader stops
   reading the green lines. */
const check = (ok, what, detail = '') => {
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'} ${what}`);
  if (!ok) { if (detail) console.log('         ' + String(detail).slice(0, 500)); fails++; }
};

/* ── Phase 1 — the deployed origin, which is where the defect lives ──────── */
console.log('\x1b[1m── phase 1: served as https://dosenft.github.io/the-codex/ ─────────\x1b[0m');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => {
    localStorage.setItem('codex-sw-off', '1');
    window.addEventListener('unhandledrejection', e => { (window.__rej ||= []).push(String(e.reason).slice(0, 200)); });
  });
  await ctx.route(`${LIVE_ORIGIN}/**`, pagesHandler(dir));
  const page = listen(await ctx.newPage());
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

  const origin = await page.evaluate(() => location.origin + ' (' + location.protocol + ')');
  console.log(`         the page believes it is at ${origin}`);

  await importFile(page, realCopy('full'));
  await openSettings(page);
  await drainRejections(page);

  const hits = ollamaReqs(page);
  check(hits.length === 0, 'no request to any /ollama path or :11434', hits.join('\n         '));
  check(page.errs.length === 0, 'no console error, uncaught throw or dead promise', page.errs.join('\n         '));

  /* The default must be the provider that can actually answer here.
     THE FIRST VERSION OF THIS CHECK WAS `/API Key/i.test(text)` AND IT PASSED
     AGAINST THE BROKEN BUILD. With provider 'ollama' the panel still renders
     the fallback-Gemini box, whose warning reads "Add a Gemini API key below"
     — so the regex matched a screen that was sitting on Ollama. A check that
     cannot tell the two states apart is not a check, and it was the only green
     line in a phase that was otherwise correctly red.

     These two discriminate. "Each model has its own free quota" is rendered
     only inside the `provider === 'gemini'` branch, and the "Ollama URL" field
     is rendered only when Ollama is selected OR when it is offered as the
     fallback — both of which are now suppressed on an origin that cannot
     reach it. Pre-change, both of these are the other way round. */
  const text = await page.evaluate(() => document.body.innerText);
  check(/Each model has its own free quota/i.test(text),
    'Settings opens on Gemini — the provider that works here',
    'gemini model list not rendered; panel reads: ' + text.replace(/\s+/g, ' ').slice(0, 200));
  check(!/Ollama URL/i.test(text),
    'no Ollama address field is offered on an origin that cannot reach one',
    'an "Ollama URL" input was on screen');

  // And selecting Ollama must explain itself rather than offer a dead control.
  const ollamaBtn = page.getByRole('button', { name: /^Ollama/ }).first();
  if (await ollamaBtn.count()) {
    await ollamaBtn.click().catch(() => {});
    await page.waitForTimeout(2600);
    await settle(page);
    const t2 = await page.evaluate(() => document.body.innerText);
    check(/served over https/i.test(t2) && /your own machine/i.test(t2),
      'choosing Ollama says why it cannot work here, in a plain sentence',
      (t2.match(/This page is served[^\n]*/) || ['<no sentence found>'])[0]);
    check(!/mixed content/i.test(t2), 'the sentence never says "mixed content"');
    const after = ollamaReqs(page);
    check(after.length === 0, 'still no probe even with Ollama selected', after.join('\n         '));
    await drainRejections(page);
    check(page.errs.length === 0, 'still no console error after selecting Ollama', page.errs.join('\n         '));
  } else {
    check(false, 'an Ollama provider button exists to select');
  }

  await ctx.close();
}

/* ── Phase 3 — an AI feature pressed with no provider at all ─────────────── */
/* The 404 is the reported defect, but it is not the whole of the requirement.
   With nothing configured, an AI-dependent screen must fail CALMLY: no error
   boundary, no uncaught throw, no dead promise, and above all no spinner still
   turning after the failure — a spinner that never stops is the one failure
   mode that looks exactly like patience.

   Quizzes is the right surface to press. Every question QuizArena has ever
   shown came from a model — there is no static bank behind it — so with no
   provider this is the most AI-dependent screen in the app, and whatever it
   does here is the floor for everything else. */
console.log('\n\x1b[1m── phase 3: pressing an AI feature with nothing configured ─────────\x1b[0m');
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => {
    localStorage.setItem('codex-sw-off', '1');
    window.addEventListener('unhandledrejection', e => { (window.__rej ||= []).push(String(e.reason).slice(0, 200)); });
  });
  await ctx.route(`${LIVE_ORIGIN}/**`, pagesHandler(dir));
  const page = listen(await ctx.newPage());
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
  await importFile(page, realCopy('full'));

  await page.getByRole('button', { name: /Switch to prep mode/i }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('tab', { name: 'Academy', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Quizzes/ }).first().click().catch(() => {});
  await settle(page);

  const gen = page.getByRole('button', { name: /^Generate Question$/ }).first();
  if (!(await gen.count())) {
    check(false, 'the Quizzes screen offers a Generate Question button');
  } else {
    await gen.click().catch(() => {});
    await page.waitForTimeout(3000);            // well past any bounded clock
    await settle(page);
    await drainRejections(page);

    const text = await page.evaluate(() => document.body.innerText);
    const spinning = await page.evaluate(() =>
      document.querySelectorAll('.animate-spin').length);

    check(page.errs.length === 0, 'pressing it logs no console error and throws nothing',
      page.errs.join('\n         '));
    check(!/rest of the app is still running|something went wrong/i.test(text),
      'no React error boundary caught anything');
    check(spinning === 0, 'no spinner is left turning after the failure',
      `${spinning} element(s) still spinning`);
    check(/Gemini API key/i.test(text),
      'it says, in words he can act on, what is missing',
      'expected the missing-key sentence; screen reads: ' + text.replace(/\s+/g, ' ').slice(-260));
  }
  await ctx.close();
}

/* ── Phase 2 — the desktop must not pay for the phone's fix ──────────────── */
console.log('\n\x1b[1m── phase 2: served from a real localhost ───────────────────────────\x1b[0m');
{
  const srv = await serveDist(dir, prev ? 4296 : 4297);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = listen(await ctx.newPage());
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(page, realCopy('full'));
  await openSettings(page);

  const text = await page.evaluate(() => document.body.innerText);
  const urlField = await page.evaluate(() =>
    [...document.querySelectorAll('input')].map(i => i.value).join(' | '));
  check(/Ollama/.test(text) && /11434/.test(urlField),
    'localhost still defaults to Ollama at :11434 — the desk is unchanged',
    `provider panel: ${text.slice(0, 120)}\n         inputs: ${urlField.slice(0, 160)}`);
  check(!/served over https/i.test(text),
    'and it is NOT told Ollama is unavailable, because here it is not');

  /* A probe to :11434 is CORRECT here, so it is reported rather than graded.
     Whether it succeeds depends on whether Ollama happens to be running on
     this machine right now, which is not this control's business. */
  const probes = ollamaReqs(page);
  console.log(`         localhost probes (expected, not graded): ${probes.length ? probes.join(', ') : 'none'}`);
  const notOllama = page.errs.filter(e => !/11434|ollama/i.test(e));
  check(notOllama.length === 0, 'no console error unrelated to reaching the local model', notOllama.join('\n         '));

  await ctx.close();
  await srv.close();
}

await b.close();
console.log(`\n  ${fails === 0 ? '\x1b[32mA-21 PASSES\x1b[0m' : '\x1b[31mA-21 FAILS\x1b[0m'} — ${fails} failed check(s)\n`);
process.exit(fails === 0 ? 0 : 1);
