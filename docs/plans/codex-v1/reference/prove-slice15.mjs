// Slice 15 proof — THE RELEASE GATE.
//
// Fourteen slices each proved one property. This one proves the only property
// that matters on the night: the thing installs on the iPad, opens every screen
// without throwing, keeps the character across a reload, and is legal to hand
// to another person.
//
// Four claims, and each one is a way the release specifically can fail:
//
//   1. EVERY SURFACE OPENS. The unit suite is 323 tests of pure logic and
//      cannot render a screen. A crash in one tab of seven is invisible to it
//      and total at the table. Every tab in both modes, every overlay, and the
//      ?d=1 engine screen are opened in one session and the console is read.
//
//   2. THE LICENCE IS ON THE PAGE. SRD 5.2.1 is CC BY 4.0, which asks for
//      exactly one thing — credit where a reader can find it. This checks the
//      credit is rendered, names the document, links the licence, and says
//      which content is NOT covered by it. It also checks the version label,
//      because an About box that lies about the version is the one place a
//      reader will notice first.
//
//   3. IT INSTALLS. Phone and iPad are the delivery target. A manifest that
//      404s, a scope that does not match the Pages path, or a missing maskable
//      icon all fail silently — you just never get an install prompt.
//
//   4. THE CHARACTER SURVIVES. Reload mid-combat is the single failure that
//      ends a session. Character, combat state and campaign are compared
//      across a hard reload.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice15.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = 'http://localhost:4173/the-codex/';
const NIX = await loadNix();
const ID = NIX.id;

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); }
};

const b = await chromium.launch();
const errors = [];

/* One context for the whole run on purpose. A per-check context would hide the
   class of bug this proof exists to catch: state left behind by screen A that
   breaks screen B. The table opens one app and moves around inside it. */
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
/* Seed ONLY IF ABSENT, and that condition is the whole of check 4.
   addInitScript runs on every navigation, reload included — so the obvious
   unconditional version of this re-wrote Nix at full health on the way back in
   and reported that damage did not survive a reload. The instrument was the
   thing erasing it. Seeding once is what makes the reload a real reload. */
await ctx.addInitScript(([id, seed]) => {
  if (!localStorage.getItem('codex-character-' + id)) {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
  }
  localStorage.setItem('codex-sw-off', '1');
}, [ID, JSON.stringify(NIX)]);

const p = await ctx.newPage();
/* Attributed to the surface that was open when it fired, because "something
   threw" is not actionable and "the Academy threw" is. */
let where = 'boot';
const note = t => errors.push(`[${where}] ${t}`);
p.on('pageerror', e => note(String(e)));
p.on('console', m => { if (m.type() === 'error') note(m.text()); });

await p.goto(BASE, { waitUntil: 'networkidle' });

// ===========================================================================
console.log('\n-- 1. every surface opens --');

/** Open a surface, let it settle, and report what is actually on screen.
 *  Returns the rendered text length: a tab that mounts an empty error boundary
 *  throws nothing and shows nothing, and only the length catches it. */
const surface = async (name, act) => {
  where = name;
  await act();
  await p.waitForTimeout(350);
  const len = await p.evaluate(() => (document.querySelector('main')?.innerText ?? document.body.innerText).trim().length);
  check(`${name} renders`, len > 40, true);
};

const tab = label => surface(label, () => p.getByRole('tab', { name: label }).first().click());

// Session mode — the three tabs used at the table.
await p.getByRole('button', { name: 'Switch to session mode' }).click();
await tab('Combat');
await tab('Grimoire');
await tab('Roleplay');

// Prep mode — the four tabs used between sessions.
await p.getByRole('button', { name: 'Switch to prep mode' }).click();
await tab('Character');
await tab('Grimoire');
await tab('Persona');
await tab('Academy');

/* The overlays. Each is a separate mount, each can break on its own — and each
   is checked here for the SAME two things, because they are a set and a set is
   where inconsistency hides. Running this the first time found that the three
   surfaces built on the shared `Sheet` primitive (Settings, character sheet,
   quick lookup) declared `aria-modal="true"` and then ignored Escape entirely,
   leaving a drawer that could only be closed by hitting its × — while the four
   hand-rolled drawers all closed. Fixed centrally in ui/Sheet.tsx. */
/* "Closed" has two meanings in this app and the check has to accept both. The
   Sheet-based surfaces UNMOUNT (AnimatePresence). The three hand-rolled drawers
   stay mounted and slide off the bottom of the viewport, which is why the first
   version of this check reported them as still open — Playwright counts a
   translated element as visible, because it still has a box. Off-screen is a
   legitimate way to be shut; on-screen-but-transparent is not, so the geometry
   is measured rather than trusted. */
const shut = async label => p.evaluate(l => {
  const d = [...document.querySelectorAll('[role=dialog]')]
    .find(e => new RegExp(l, 'i').test(e.getAttribute('aria-label') ?? ''));
  if (!d) return true;                                     // unmounted
  const r = d.getBoundingClientRect();
  return r.top >= innerHeight || r.bottom <= 0 || r.left >= innerWidth || r.right <= 0;
}, label);

const overlay = async (name, opener, label) => {
  await surface(name, () => p.getByRole('button', { name: opener }).click());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  check(`${name} closes on Escape`, await shut(label), true);
};

await overlay('Settings', 'Open settings', 'Settings');
await overlay('Mechanics drawer', 'Open mechanics reference', 'mechanics');
await overlay('Character sheet', 'Open character sheet', 'character sheet');
await overlay('Dice roller', 'Open dice roller', 'dice');

/* And the other half of what a closed drawer owes: a panel that is merely
   off-screen still has focusable controls in the tab order and still tells a
   screen reader it is an open modal. Three drawers, 68 controls between them,
   were doing exactly that until `inert` was added. */
where = 'closed drawers';
check('no closed dialog leaves controls in the tab order', await p.evaluate(() =>
  [...document.querySelectorAll('[role=dialog]')]
    .filter(d => !d.hasAttribute('inert'))
    .map(d => d.getAttribute('aria-label'))), []);

// The engine screen. Reachable only by URL, and therefore the one nobody opens
// by accident — which is exactly why it has to be opened here.
where = 'turn screen (?d=1)';
await p.goto(BASE + '?d=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
check('the ?d=1 turn screen renders', await p.evaluate(() => document.body.innerText.trim().length > 40), true);

check('no surface threw', [...new Set(errors)], []);

// ===========================================================================
console.log('\n-- 2. the licence is on the page --');
{
  where = 'about';
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Open settings' }).click();
  await p.waitForTimeout(300);
  const about = await p.evaluate(() => {
    const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'About');
    const card = h?.closest('div')?.parentElement;
    const links = [...(card?.querySelectorAll('a') ?? [])].map(a => ({ href: a.href, rel: a.rel, target: a.target }));
    return { text: card?.innerText ?? '', links };
  });
  check('the SRD is credited by name', /System Reference Document 5\.2\.1/.test(about.text), true);
  check('Wizards of the Coast is named as the author', /Wizards of the Coast/.test(about.text), true);
  check('the licence is named', /Creative Commons Attribution 4\.0/.test(about.text), true);
  check('the licence is linked, not just named',
    about.links.some(l => /creativecommons\.org\/licenses\/by\/4\.0/.test(l.href)), true);
  check('the SRD itself is linked', about.links.some(l => /dndbeyond\.com\/srd/.test(l.href)), true);
  /* An outbound link from a local-first app must not hand the opener a window
     handle back into a page holding the character. */
  check('every outbound link is opener-safe',
    about.links.filter(l => l.target === '_blank').every(l => /noopener/.test(l.rel)), true);
  check('homebrew is excluded from the licence', /not covered by that licence/.test(about.text), true);
  /* The About box said v2.0 through fourteen slices of V1.0 work. */
  check('the version label is V1.0', /The Codex V1\.0/.test(about.text), true);
  check('the version label does not still say v2.0', /v2\.0/i.test(about.text), false);
}

// ===========================================================================
console.log('\n-- 3. it installs on a phone and an iPad --');
{
  where = 'manifest';
  const href = await p.evaluate(() => document.querySelector('link[rel=manifest]')?.href ?? null);
  check('a manifest is linked', href, BASE + 'manifest.webmanifest');
  const res = await p.request.get(href);
  check('the manifest is served, not 404', res.status(), 200);
  const m = await res.json();
  /* Scope and start_url must match where Pages actually serves the app. Get
     these wrong and Chrome offers no install at all, with no error anywhere. */
  check('start_url matches the deploy path', m.start_url, '/the-codex/');
  check('scope matches the deploy path', m.scope, '/the-codex/');
  check('it opens without browser chrome', m.display, 'standalone');
  const icons = Object.fromEntries((m.icons ?? []).map(i => [`${i.sizes}:${i.purpose}`, i.src]));
  check('it has a 192 icon', !!icons['192x192:any'], true);
  check('it has a 512 icon', !!icons['512x512:any'], true);
  /* Android crops a non-maskable icon into a circle and eats the border. */
  check('it has a maskable icon', !!icons['512x512:maskable'], true);
  /* Status alone is not enough here, and the mutation run is what proved it:
     pointing an icon at a filename that does not exist SURVIVED, because the
     preview server answers an unknown path with index.html and a cheerful 200.
     A PWA icon has to actually be an image, so the content type is what gets
     asserted. GitHub Pages 404s properly, which is worse: the same mutation
     would ship a blank home-screen tile and never fail a check. */
  const iconOk = [];
  for (const src of new Set(Object.values(icons))) {
    const r = await p.request.get(new URL(src, href).href);
    iconOk.push([src, r.status(), (r.headers()['content-type'] ?? '').split(';')[0]]);
  }
  check('every declared icon is actually served, as an image',
    iconOk.filter(([, s, type]) => s !== 200 || !type.startsWith('image/')), []);
  /* iOS ignores the manifest for Add to Home Screen and reads this instead. */
  const touch = await p.evaluate(() => document.querySelector('link[rel=apple-touch-icon]')?.href ?? null);
  check('an apple-touch-icon is linked for the iPad', !!touch, true);
  check('the apple-touch-icon is served', (await p.request.get(touch)).status(), 200);
  const sw = await p.request.get(BASE + 'sw.js');
  check('the service worker is served at the app scope', sw.status(), 200);
}

// ===========================================================================
console.log('\n-- 4. the character survives a reload --');
{
  where = 'persistence';
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Switch to session mode' }).click();
  await p.getByRole('tab', { name: 'Combat' }).first().click();
  await p.waitForTimeout(400);
  const before = await p.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
    }
    return out;
  });
  check('a character is stored', !!before['codex-character-' + ID], true);

  /* And now a change the APP made, not one the test seeded. The first version
     of this check reloaded a seeded character and declared persistence proved —
     which it is not: it proves localStorage works. Taking 7 damage through the
     real HP control and finding it after the reload is the actual claim, and
     the mutation run confirms it: disabling every character write leaves the
     seeded version of this check green. */
  const HP0 = NIX.hitPoints.current;
  await p.getByRole('button', { name: 'Apply damage' }).click();
  // A number input is a spinbutton, not a textbox.
  await p.getByRole('spinbutton', { name: /damage amount/i }).fill('7');
  await p.getByRole('button', { name: 'Apply', exact: true }).click();
  await p.waitForTimeout(500);
  const hpNow = await p.evaluate(id =>
    JSON.parse(localStorage.getItem('codex-character-' + id)).hitPoints.current, ID);
  check('7 damage through the real control reaches storage', hpNow, HP0 - 7);

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
    }
    return out;
  });
  check('the damage is still there after the reload',
    JSON.parse(after['codex-character-' + ID]).hitPoints.current, HP0 - 7);
  check('nothing stored was dropped by the reload',
    Object.keys(before).filter(k => !(k in after)), []);
  /* The name on screen, not just the bytes in storage — a store that survives
     a reload the app then fails to read is the same outage to the player. */
  check('the character is on screen after reload',
    await p.evaluate(n => document.body.innerText.includes(n), NIX.name), true);
}

// ===========================================================================
console.log('\n-- 5. nothing threw across the whole session --');
check('no console or page errors', [...new Set(errors)], []);

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
