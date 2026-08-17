// Slice 12 proof — A ONE-PRESS VEIL, ALWAYS AVAILABLE, THAT CANNOT BE SWITCHED OFF.
//
// The unit suite proves the covenant's data rules — never drop a line, a failed
// write is not a save, this is not a log. Fifteen tests, and not one of them can
// make the claim the slice was actually taken for, because that claim is about
// PRESENCE:
//
//   Something lands badly at the table. Marcus reaches for the iPad. Whatever
//   screen it happens to be on — mid-combat, in the grimoire, on the setup
//   screen because he was making a new character, behind ?d=1 — there is one
//   press that stops the scene. Not two. Not "after you close this sheet".
//
// Five things are only provable here, against a real build in a real browser,
// and every one of them passes `vitest` in its broken state:
//
//   * the control is on EVERY surface, including the three where App returns
//     early and Layout never renders. This is the check that fails the moment
//     anyone moves the mount inside the app, which is the obvious tidy-up and
//     the one that breaks the promise.
//   * ONE press raises it. Counted as presses, not as intent.
//   * it cannot be switched off. Proved by seeding every "off" shape a future
//     settings toggle would plausibly read, and finding the button anyway.
//   * the table underneath goes inert — a tap where a combat control was does
//     not change combat state. Read off localStorage, because a screen that
//     looks covered and a screen that is covered are different claims.
//   * nothing is recorded. Storage is compared byte-for-byte across a full
//     raise-and-lower cycle. The absence of a log is the feature; an absence
//     is exactly the kind of thing a source review misses and a diff catches.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice12.mjs
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
const BASE = 'http://localhost:4173/the-codex/';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

const b = await chromium.launch();

/* Two contexts, because one of the surfaces that must carry the veil is the one
   you only see when there is NO character — and seeding a character to test the
   other eight makes that screen unreachable. */
const seeded = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seeded.addInitScript(([id, seed]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-sw-off', '1');
}, [ID, JSON.stringify(NIX)]);

const p = await seeded.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const veilBtn = () => p.getByRole('button', { name: 'Veil this scene' });
const scene = () => p.getByRole('dialog', { name: 'The scene is veiled' });
const backBtn = () => p.getByRole('button', { name: 'Return to the table' });
const COMBAT = () => p.evaluate(id => JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null'), ID);

/** Every key and value in localStorage, so an added log line cannot hide. */
const STORAGE = () => p.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    out[k] = localStorage.getItem(k);
  }
  return out;
});

/* ── 1. every surface, including the three that are not the app proper ─────── */
console.log('\n-- 1. the control is on every screen there is --');

await p.goto(BASE, { waitUntil: 'networkidle' });
await veilBtn().waitFor({ state: 'visible', timeout: 15000 });

const SESSION_TABS = ['Combat', 'Grimoire', 'Roleplay'];
for (const tab of SESSION_TABS) {
  await p.getByRole('tab', { name: tab, exact: true }).click();
  await p.waitForTimeout(250);
  check(`session · ${tab}`, await veilBtn().isVisible(), true);
}

await p.getByRole('button', { name: 'Switch to prep mode' }).click();
await p.waitForTimeout(250);
for (const tab of ['Character', 'Grimoire', 'Persona', 'Academy']) {
  await p.getByRole('tab', { name: tab, exact: true }).click();
  await p.waitForTimeout(250);
  check(`prep · ${tab}`, await veilBtn().isVisible(), true);
}

// A sheet over the app is the case people forget: the veil must be reachable
// from on top of a modal, not behind it.
await p.getByRole('button', { name: 'Open settings' }).click();
await p.waitForTimeout(400);
check('with the Settings sheet open on top', await veilBtn().isVisible(), true);
await p.getByRole('button', { name: 'Close settings' }).click();
await p.waitForTimeout(300);

// ?d=1 replaces the whole of App with the new turn view. Layout never renders.
await p.goto(BASE + '?d=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
check('the ?d=1 turn screen, where Layout never renders', await veilBtn().isVisible(), true);

/* The setup screen — no character at all. This is the surface where somebody is
   describing a character out loud to the table, which is exactly when a line
   gets crossed, and it is the surface a Layout-mounted veil misses entirely. */
const fresh = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await fresh.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const fp = await fresh.newPage();
await fp.goto(BASE, { waitUntil: 'networkidle' });
await fp.waitForTimeout(600);
check('character setup, with no character at all',
  await fp.getByRole('button', { name: 'Veil this scene' }).isVisible(), true);
await fresh.close();

/* ── 1b. it is always there, so it must never be in the way ────────────────── */
console.log('\n-- 1b. always present, never overlapping --');

await p.goto(BASE, { waitUntil: 'networkidle' });
await veilBtn().waitFor({ state: 'visible', timeout: 15000 });
await p.getByRole('button', { name: 'Switch to session mode' }).click();
await p.waitForTimeout(350);

const overlaps = (a, c) =>
  a && c && a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height;

for (const [w, h, name] of [[390, 844, 'phone'], [1024, 768, 'iPad']]) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(400);

  const veil = await veilBtn().boundingBox();
  const dice = await p.getByRole('button', { name: 'Open dice roller' }).boundingBox();
  /* Every navigation TAB, not the tablist's outer box. The first version of
     this check measured the region and went red on the iPad — where the tab bar
     becomes a full-height left rail and the veil deliberately takes the foot of
     it, below the last tab, covering nothing. The region test was asking the
     wrong question: what must never happen is the veil sitting on top of
     something you can press, and that is what this asks instead. */
  const tabs = await p.getByRole('tab').all();
  const tabBoxes = (await Promise.all(tabs.map(t => t.boundingBox()))).filter(Boolean);

  check(`${name} · the veil control is on screen`, veil !== null, true);
  check(`${name} · there are navigation tabs to test against`, tabBoxes.length > 0, true);
  check(`${name} · it does not sit on the dice button`, overlaps(veil, dice), false);
  check(`${name} · it covers none of the ${tabBoxes.length} navigation tabs`,
    tabBoxes.some(t => overlaps(veil, t)), false);
  // 48px is the iPad-at-arm's-length floor the design language sets, and this
  // is the one control that gets reached for in a hurry.
  check(`${name} · it meets the 48px touch floor`,
    veil !== null && veil.width >= 48 && veil.height >= 48, true);

  await p.screenshot({ path: `docs/plans/codex-v1/reference/baseline/slice12-control-${name}.png` });
}
await p.setViewportSize({ width: 390, height: 844 });

/* ── 2. one press, and no way to switch it off ─────────────────────────────── */
console.log('\n-- 2. one press up, and nothing turns it off --');

await p.goto(BASE, { waitUntil: 'networkidle' });
await veilBtn().waitFor({ state: 'visible', timeout: 15000 });

check('the scene is not veiled to begin with', await scene().count(), 0);
await veilBtn().click();                       // ← press number one
await scene().waitFor({ state: 'visible', timeout: 3000 });
check('one press raised it', await scene().isVisible(), true);
check('and the button it replaced is gone', await veilBtn().count(), 0);
await backBtn().click();
await p.waitForTimeout(300);
check('the explicit button lowers it', await scene().count(), 0);

/* Seed every "off" a settings toggle would plausibly read. None of these keys
   exist in the app — that is the point. If somebody later adds the switch this
   slice forbids, whichever name they choose, this goes red. */
await p.evaluate(() => {
  for (const k of ['codex-veil-off', 'codex-safety-off', 'codex-safety', 'codex-veil-enabled']) {
    localStorage.setItem(k, 'false');
  }
  localStorage.setItem('codex-covenant', JSON.stringify({
    entries: [], note: '', updatedAt: null, enabled: false, veilEnabled: false, showVeil: false,
  }));
});
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(500);
check('every plausible "off" seeded, and it is still there', await veilBtn().isVisible(), true);

// An empty covenant must not hide it either — the veil does not depend on
// anybody having written anything down.
await p.evaluate(() => localStorage.removeItem('codex-covenant'));
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(500);
check('no covenant written at all, and it is still there', await veilBtn().isVisible(), true);

/* ── 3. a stray press does not lift it ─────────────────────────────────────── */
console.log('\n-- 3. it does not come down by accident --');

await veilBtn().click();
await scene().waitFor({ state: 'visible', timeout: 3000 });

await p.keyboard.press('Escape');
await p.waitForTimeout(250);
check('Escape does not lift the veil', await scene().isVisible(), true);

await p.mouse.click(20, 20);                   // the far corner: backdrop, not the button
await p.waitForTimeout(250);
check('a tap on the backdrop does not lift it', await scene().isVisible(), true);

/* Focus containment. The first run of this proof found the real defect here:
   the backdrop tap above blurred the button, and Tab then walked into the app
   underneath — the scene covering the fight visually while a keyboard carried
   on through it. `aria-modal` is a promise to assistive tech, not a mechanism. */
// Named, not dumped: `document.activeElement.textContent` on <body> is the
// entire application, and a failure line nobody can read is a failure nobody
// acts on.
const focusedText = () => p.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return 'the page body — focus escaped the veil';
  return (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 60);
});
check('focus came back after the backdrop tap', await focusedText(), 'Return to the table');
await p.keyboard.press('Tab');
await p.waitForTimeout(150);
check('Tab cannot walk out of the veiled scene', await focusedText(), 'Return to the table');

await p.keyboard.press('Enter');               // focus is on "Return to the table"
await p.waitForTimeout(300);
check('the focused button still works from the keyboard', await scene().count(), 0);

/* ── 4. the table underneath is inert ──────────────────────────────────────── */
console.log('\n-- 4. the scene covers the table, it does not float over it --');

// Section 1 left the app in prep mode, and prep mode has no Combat tab at all
// — `codex-app-mode` survives the reloads in between.
await p.getByRole('button', { name: 'Switch to session mode' }).click();
await p.waitForTimeout(350);
await p.getByRole('tab', { name: 'Combat', exact: true }).click();
await p.waitForTimeout(300);
const startBtn = p.getByRole('button', { name: 'Start Combat' });
if (await startBtn.count() > 0) { await startBtn.click(); await p.waitForTimeout(400); }

const actionToggle = p.getByRole('button', { name: 'Action: available' });
const box = await actionToggle.boundingBox();
check('an economy control was found to aim at', box !== null, true);
const before = await COMBAT();

await veilBtn().click();
await scene().waitFor({ state: 'visible', timeout: 3000 });

/* OPAQUE THE INSTANT IT IS UP — measured with no settle wait on purpose.
   This check exists because the first screenshot of the veil showed the fight:
   the scene was up and Playwright called it visible, but it was two frames into
   a 220ms fade and still see-through. `isVisible()` is true at opacity 0, so
   nothing else in this proof could have caught it. The fade is gone; this is
   what keeps it gone. */
const sceneOpacity = await p.evaluate(() => {
  const el = document.querySelector('.veil-scene');
  const cs = el && getComputedStyle(el);
  return cs ? { opacity: cs.opacity, animation: cs.animationName } : null;
});
check('opaque the instant it is raised, with nothing animating in', sceneOpacity,
  { opacity: '1', animation: 'none' });

await p.screenshot({ path: 'docs/plans/codex-v1/reference/baseline/slice12-veiled.png' });

if (box) {
  // Exactly where the Action toggle is. Under the veil, this must reach nothing.
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(300);
}
check('a tap where a combat control was changes nothing', await COMBAT(), before);
check('and the veil is still up after being tapped through', await scene().isVisible(), true);

/* ── 5. nothing was written down ───────────────────────────────────────────── */
console.log('\n-- 5. it is not a log --');

const storageBefore = await STORAGE();
await backBtn().click();
await p.waitForTimeout(300);
await veilBtn().click();
await scene().waitFor({ state: 'visible', timeout: 3000 });
await backBtn().click();
await p.waitForTimeout(400);
const storageAfter = await STORAGE();

check('a full raise-and-lower cycle changed nothing in storage', storageAfter, storageBefore);
const dump = JSON.stringify(storageAfter).toLowerCase();
for (const word of ['veiled', 'veil-raised', 'safetyevent']) {
  check(`nothing anywhere recorded "${word}"`, dump.includes(word), false);
}

/* ── 6. the covenant is captured once and survives ─────────────────────────── */
console.log('\n-- 6. lines and veils, written once --');

await p.getByRole('button', { name: 'Open settings' }).click();
await p.waitForTimeout(500);
const draft = p.getByLabel('A new line or veil');
await draft.waitFor({ state: 'visible', timeout: 5000 });

await draft.fill('Harm to children');
await p.getByRole('button', { name: 'Add to the covenant' }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Veil — happens off-screen' }).click();
await draft.fill('Torture, in detail');
await p.getByRole('button', { name: 'Add to the covenant' }).click();
await p.waitForTimeout(400);

const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('codex-covenant') || 'null'));
const written = await stored();
check('both boundaries reached storage', (written?.entries ?? []).map(e => [e.kind, e.text]), [
  ['line', 'Harm to children'],
  ['veil', 'Torture, in detail'],
]);

// A blank one must be refused, not added as an empty row.
await draft.fill('   ');
const addDisabled = await p.getByRole('button', { name: 'Add to the covenant' }).isDisabled();
check('a blank boundary cannot be added', addDisabled, true);
await draft.fill('');

await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const survived = await stored();
check('and survived a reload', (survived?.entries ?? []).length, 2);

/* Safety notes are not campaign data. They must not travel in a file that gets
   handed to a DM or posted in a chat. */
const exportPayload = await p.evaluate(id =>
  localStorage.getItem('codex-character-' + id) || '', ID);
check('the covenant is not inside the character record',
  /Harm to children|Torture, in detail/.test(exportPayload), false);

/* ── 7. clean run ──────────────────────────────────────────────────────────── */
console.log('\n-- 7. clean --');
check('no console errors or page errors', errors, []);

await b.close();
console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
