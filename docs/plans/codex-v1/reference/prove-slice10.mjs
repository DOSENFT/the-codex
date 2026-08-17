// Slice 10 proof — the app at a table with no internet.
//
// Every other slice could be proved by a unit test plus a screenshot. This one
// cannot, because everything it claims is a claim about the NETWORK, and the
// unit suite has no network. All 282 tests pass with a render-blocking <link>
// to fonts.googleapis.com in index.html and no service worker at all — which
// was the state of this repo before today, and which means the basement game
// with one bar of signal opened to a Times New Roman app or to nothing.
//
// So the six things below are only true if they are true in a real browser
// against a real build, and three of them are only true with the network
// physically switched off:
//
//   1. NO CDN, EVER. A single request to fonts.gstatic.com is the whole failure
//      — it is invisible on Marcus's desk and fatal at the table, and it is the
//      exact bug this slice was opened to close. `src/fonts/fonts.css` claimed
//      to be self-hosted, was imported by nothing, and pointed at Google.
//   2. The three faces actually RENDER. "No CDN" is trivially satisfiable by
//      shipping no fonts, so the absence of the requests is worthless without
//      the presence of the glyphs.
//   3. The worker installs and precaches the shell, and precaches only it —
//      not the 88MB of art, which would make the first launch a phone-melting
//      download dressed up as offline support.
//   4. OFFLINE, IT OPENS. Turn screen, right faces, Nix's fight intact, at
//      round 3 where he left it.
//   5. THE KILL SWITCH IS PULLED. `main` is a live public deploy and a bad
//      service worker survives every deploy you can push at it. An off switch
//      nobody has tested is an off switch nobody knows is broken.
//   6. The console is clean — with one documented exception, measured below.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice10.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const ID = NIX.id;
const ORIGIN = 'http://localhost:4173';
const BASE = ORIGIN + '/the-codex/';
const TURN = BASE + '?d=1';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

/** The three faces, read the way the renderer reads them rather than the way
 *  the stylesheet asks for them. `document.fonts.check` is false for a family
 *  that is declared but whose file never arrived, which is precisely the
 *  Google-CDN failure at a table — so this is the assertion that would have
 *  caught the old index.html on a plane. */
const FACES = () => {
  const loaded = f => [...document.fonts].filter(x => x.family === f && x.status === 'loaded').length;
  // Width against an explicit fallback. If Cinzel silently fell through to
  // Georgia these two numbers would be equal, and `check()` alone would not
  // necessarily say so on every engine.
  const width = family => {
    const s = document.createElement('span');
    s.textContent = 'Hearthbrand 1d8+4';
    s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:40px;font-family:${family}`;
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return Math.round(w);
  };
  // Weight by weight, and satisfied by ANY of them. `check('700 20px Cinzel')`
  // is false when only the 600 face has been pulled in — the font matching
  // algorithm picks the declared-but-unloaded 700 and reports it missing, which
  // is correct and is not the question being asked. The question is whether the
  // family arrived at all, so the loosest honest form of it is used here and
  // the strict form is `loaded`/`distinct` below.
  const any = (family, weights) => weights.some(w => document.fonts.check(`${w} 20px ${family}`));
  return {
    check: {
      cinzel: any('Cinzel', [400, 600, 700]),
      plex: any('"IBM Plex Sans"', [400, 500, 600]),
      mono: any('"JetBrains Mono"', [400, 500, 600]),
    },
    loaded: { cinzel: loaded('Cinzel') > 0, plex: loaded('IBM Plex Sans') > 0, mono: loaded('JetBrains Mono') > 0 },
    distinct: {
      cinzel: width('Cinzel') !== width('Georgia'),
      plex: width('"IBM Plex Sans"') !== width('system-ui'),
      mono: width('"JetBrains Mono"') !== width('monospace'),
    },
  };
};

/** What the worker is actually holding, by cache and by URL. */
const CACHES = async () => {
  const names = await caches.keys();
  const out = {};
  for (const n of names) out[n] = (await (await caches.open(n)).keys()).map(r => r.url);
  return out;
};

const b = await chromium.launch();

// ===========================================================================
// A fresh profile, seeded once, exactly as Slice 7 does it — the point of the
// seed here is not the sheet, it is that the sheet SURVIVES a slice that
// installs a service worker. Nix's real character lives in this same storage
// on Marcus's iPad; a worker that quietly nuked it would be the worst outcome
// this slice could have.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
await ctx.addInitScript(([id, seed]) => {
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-combat-' + id, JSON.stringify({
      inCombat: true, round: 3,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
      concentrating: null, yourTurn: true,
    }));
  }
  localStorage.setItem('codex-active-id', id);
}, [ID, JSON.stringify(NIX)]);

const p = await ctx.newPage();
const errors = [];
const requests = [];
p.on('request', r => requests.push(r.url()));
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// ---------------------------------------------------------------------------
console.log('\n-- 1. nothing is fetched from anybody else ----------------------');
await p.goto(TURN, { waitUntil: 'networkidle' });
await p.waitForSelector('.act', { timeout: 10000 });
await p.evaluate(() => document.fonts.ready);

const foreign = [...new Set(requests.filter(u => !u.startsWith(ORIGIN) && !u.startsWith('data:')))];
check('zero requests to any other origin', foreign, []);
check('  ...google fonts in particular', foreign.filter(u => /gstatic|googleapis/.test(u)), []);
// The faces come from the bundle, therefore from `assets/`, therefore from the
// precache. A font served out of `public/` would be invisible to the shell
// cache and would fail offline while passing every check above it.
const fontReqs = requests.filter(u => /\.woff2?(\?|$)/.test(u));
check('every font request is a hashed bundle asset',
  fontReqs.every(u => u.startsWith(BASE + 'assets/')), true);
check('  ...and none of them is the legacy .woff',
  fontReqs.filter(u => /\.woff(\?|$)/.test(u)), []);

// ---------------------------------------------------------------------------
console.log('\n-- 2. and the three faces are really on the screen --------------');
let faces = await p.evaluate(FACES);
check('Cinzel is loaded and is not Georgia', [faces.check.cinzel, faces.loaded.cinzel, faces.distinct.cinzel], [true, true, true]);
check('IBM Plex Sans is loaded and is not system-ui', [faces.check.plex, faces.loaded.plex, faces.distinct.plex], [true, true, true]);
check('JetBrains Mono is loaded and is not monospace', [faces.check.mono, faces.loaded.mono, faces.distinct.mono], [true, true, true]);
// All three, on the one screen that matters, through the tokens rather than
// through a hard-coded stack: display on the name, body on the shell, mono on
// the resource numerals.
check('the turn screen is actually set in all three',
  await p.evaluate(() => {
    const f = s => getComputedStyle(document.querySelector(s)).fontFamily;
    return [
      f('.dturn .who .nm').includes('Cinzel'),
      f('.dturn').includes('IBM Plex Sans'),
      f('.dturn .rgrp .v').includes('JetBrains Mono'),
    ];
  }), [true, true, true]);

// ---------------------------------------------------------------------------
console.log('\n-- 3. the manifest and the four marks ---------------------------');
const manifest = await p.evaluate(async base => {
  const r = await fetch(base + 'manifest.webmanifest');
  return { status: r.status, json: await r.json() };
}, BASE);
check('the manifest is served', manifest.status, 200);
check('  ...scoped to the deploy path', [manifest.json.scope, manifest.json.start_url, manifest.json.id],
  ['/the-codex/', '/the-codex/', '/the-codex/']);
check('  ...standalone, on the ground colour', [manifest.json.display, manifest.json.background_color], ['standalone', '#0a0a08']);
check('  ...and declares a maskable icon, which Android requires',
  manifest.json.icons.some(i => i.purpose === 'maskable'), true);

const marks = await p.evaluate(async (args) => {
  const [base, icons] = args;
  const out = {};
  for (const src of icons) {
    const r = await fetch(new URL(src, base).href);
    out[src] = { status: r.status, type: r.headers.get('content-type'), bytes: (await r.blob()).size };
  }
  return out;
}, [BASE, [...manifest.json.icons.map(i => i.src), 'icons/apple-touch-icon.png']]);
for (const [src, m] of Object.entries(marks)) {
  // A 0-byte or 200-byte PNG is a served file and a broken icon. The real ones
  // are several KB; anything under 1KB is a placeholder that got shipped.
  check(`${src} is a real png`, [m.status, m.type, m.bytes > 1024], [200, 'image/png', true]);
}
check('iOS is pointed at its own mark, which it will not read from the manifest',
  await p.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')),
  '/the-codex/icons/apple-touch-icon.png');

// ---------------------------------------------------------------------------
console.log('\n-- 4. the worker installs, and holds the shell and only the shell -');
await p.evaluate(() => navigator.serviceWorker.ready);
const sw = await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations();
  return { count: rs.length, scope: rs[0]?.scope, active: !!rs[0]?.active, url: rs[0]?.active?.scriptURL };
});
check('exactly one worker, at the app scope', [sw.count, sw.scope, sw.active], [1, BASE, true]);
check('  ...and it is ours', sw.url, BASE + 'sw.js');

const held = await p.evaluate(CACHES);
const shellName = Object.keys(held).find(n => n.startsWith('codex-shell-'));
check('there is a build-versioned shell cache', /^codex-shell-[0-9a-f]{12}$/.test(shellName ?? ''), true);
const shell = held[shellName] ?? [];
check('  ...holding the document itself, keyed on the scope root', shell.includes(BASE), true);
check('  ...every javascript chunk', shell.filter(u => u.endsWith('.js')).length >= 4, true);
check('  ...the stylesheet', shell.filter(u => u.endsWith('.css')).length, 1);
check('  ...all nine woff2', shell.filter(u => u.endsWith('.woff2')).length, 9);
check('  ...and NOT the legacy woff, which is 201KB nothing will ask for',
  shell.filter(u => u.endsWith('.woff')), []);
// The whole argument of the precache/runtime split, asserted rather than
// asserted-in-a-comment: if a background ever appears in the shell cache, the
// first launch has quietly become a 90MB download.
check('no art in the shell cache — that is the runtime cache\'s job',
  shell.filter(u => /\.(png|jpe?g|webp|avif|gif)$/i.test(u)), []);
check('  ...nothing from asset-inbox either', shell.filter(u => u.includes('asset-inbox')), []);

// ---------------------------------------------------------------------------
console.log('\n-- 5. THE NETWORK GOES AWAY ------------------------------------');
// Everything above is comfort. This is the slice.
const before = await p.evaluate(id => localStorage.getItem('codex-combat-' + id), ID);

// THE SECOND VISIT, NOT THE FIRST. `clients.claim()` makes the installing
// worker take over the page that installed it, but that page's subresources
// were already fetched from the network before any worker existed — the
// protection begins on the NEXT load. Cutting the cable in the gap between
// `ready` resolving and the claim landing produced a document served from the
// cache whose scripts all went to the network and failed: a page that looks
// alive in the tab strip and is white on the screen. That is a race in the
// TEST, not in the app — Marcus's iPad is never in that gap, because by the
// time there is no Wi-Fi he opened the app days ago — but it is exactly the
// shape of bug this proof exists to keep out, so the state is now waited for
// explicitly rather than assumed.
await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
await p.reload({ waitUntil: 'networkidle' });
check('the page is under the worker before the cable is cut',
  await p.evaluate(() => !!navigator.serviceWorker.controller), true);

await ctx.setOffline(true);
const offlineErrors = [];
p.on('console', m => { if (m.type() === 'error') offlineErrors.push(m.text()); });

/** Offline, "the page did not load" and "the page loaded empty" are different
 *  failures and both are white screens at the table, so neither is allowed to
 *  end this script with a stack trace where a red line belongs. Returns what
 *  the navigation did rather than throwing it. */
const openOffline = async url => {
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.act', { timeout: 8000 });
    return 'open';
  } catch (e) {
    return String(e).split('\n')[0].slice(0, 90);
  }
};

check('the turn screen renders with no network at all', await openOffline(TURN), 'open');
await p.evaluate(() => document.fonts.ready);
check('  ...and it is really the turn screen',
  await p.evaluate(() => !!document.querySelector('.dturn')), true);
faces = await p.evaluate(FACES);
check('  ...in the right three faces', [faces.check.cinzel, faces.check.plex, faces.check.mono], [true, true, true]);
check('  ...with the actions on it',
  await p.evaluate(() => document.querySelectorAll('.colB .act').length > 3), true);
check('  ...at round 3, where he left it',
  await p.evaluate(() => document.querySelector('.chrome .round')?.textContent?.includes('3')), true);
check('  ...and his character is untouched by any of this',
  await p.evaluate(id => localStorage.getItem('codex-combat-' + id), ID), before);
check('  ...and the sheet still parses to Nix',
  await p.evaluate(id => JSON.parse(localStorage.getItem('codex-character-' + id)).name, ID), NIX.name);

// A deep link, offline, is the same document — the shell answers it even
// though that exact URL was never cached under its own key.
check('an offline deep link still gets the shell rather than a browser error',
  await openOffline(BASE + 'nothing-here-at-all?d=1'), 'open');

await ctx.setOffline(false);

// ---------------------------------------------------------------------------
console.log('\n-- 6. the kill switch, pulled ----------------------------------');
// A separate profile: `?sw=off` writes to localStorage on purpose (it has to
// survive the reload that follows it), so testing it in the seeded context
// would leave the switch flipped for every later run.
const ctx2 = await b.newContext({ serviceWorkers: 'allow' });
const k = await ctx2.newPage();
k.on('pageerror', e => errors.push('kill: ' + String(e)));

await k.goto(BASE, { waitUntil: 'networkidle' });
await k.evaluate(() => navigator.serviceWorker.ready);
const on1 = await k.evaluate(async () => ({
  regs: (await navigator.serviceWorker.getRegistrations()).length,
  caches: (await caches.keys()).filter(n => n.startsWith('codex-')).length,
}));
check('it is on to begin with', on1.regs >= 1 && on1.caches >= 1, true);

await k.goto(BASE + '?sw=off', { waitUntil: 'networkidle' });
await k.waitForTimeout(600);
const off = await k.evaluate(async () => ({
  regs: (await navigator.serviceWorker.getRegistrations()).length,
  caches: (await caches.keys()).filter(n => n.startsWith('codex-')).length,
  flag: localStorage.getItem('codex-sw-off'),
}));
check('?sw=off unregisters every worker', off.regs, 0);
check('  ...and deletes every cache it made', off.caches, 0);
check('  ...and remembers, so the next load does not re-register', off.flag, '1');

await k.goto(BASE, { waitUntil: 'networkidle' });
await k.waitForTimeout(400);
check('a plain load with the switch off stays off',
  await k.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
check('  ...and the app still works, because it never needed the worker',
  await k.evaluate(() => document.querySelector('#root')?.children.length > 0), true);

await k.goto(BASE + '?sw=on', { waitUntil: 'networkidle' });
await k.evaluate(() => navigator.serviceWorker.ready);
await k.waitForTimeout(400);
const back = await k.evaluate(async () => ({
  regs: (await navigator.serviceWorker.getRegistrations()).length,
  flag: localStorage.getItem('codex-sw-off'),
  caches: (await caches.keys()).filter(n => n.startsWith('codex-shell-')).length,
}));
check('?sw=on brings it back', [back.regs, back.flag, back.caches], [1, null, 1]);
await ctx2.close();

// ---------------------------------------------------------------------------
console.log('\n-- 7. the console ----------------------------------------------');
// Offline, art that was never visited answers 504 by design — a missing
// background is a dark panel and this design is already dark panels, and there
// is not one <img> in the whole app for a broken-image glyph to appear in. Any
// OTHER error offline, and every error online, is a real failure.
const artOnly = offlineErrors.filter(t => !/\.(png|jpe?g|webp|avif|gif)/i.test(t));
check('nothing threw', errors.filter(t => !offlineErrors.includes(t)), []);
check('nothing threw offline either, beyond uncached art', artOnly, []);
console.log(`       (${offlineErrors.length - artOnly.length} offline art 504s, by design)`);

// ---------------------------------------------------------------------------
// For the eye: the installed app, offline, on both devices.
await ctx.setOffline(true);
for (const [label, width, height] of [['phone', 390, 844], ['ipad', 1366, 1024]]) {
  const s = await ctx.newPage();
  await s.setViewportSize({ width, height });
  await s.goto(TURN, { waitUntil: 'domcontentloaded' });
  await s.waitForSelector('.act', { timeout: 10000 });
  await s.evaluate(() => document.fonts.ready);
  await s.waitForTimeout(250);
  await s.screenshot({ path: `_shots-app/slice10-offline-${label}.png` });
  await s.close();
}
console.log('\n  shots: _shots-app/slice10-offline-{phone,ipad}.png');

await b.close();
console.log(failures === 0 ? '\nALL CHECKS PASS\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
