// Slice 11 proof — THE AI MAY NEVER BLOCK COMBAT.
//
// The unit suite proves the transport: clocks, the fallback switch, the key in
// a header. Twenty-six tests, and not one of them can make the claim the slice
// was actually taken for, which is a claim about a table —
//
//   The desktop running the model is asleep. Marcus taps Combat Advisor, asks
//   "surrounded by 3 goblins", and the panel disables its own input and five
//   buttons on `loading`. Before this slice, `loading` had no way to become
//   false: there was no clock and no cancel, so the AI panel sat there with a
//   spinner claiming to think until the OS gave up on the socket — minutes.
//
// Four things are only provable here, in a real browser, against a real build,
// and every one of them passes `vitest` in its broken state:
//
//   * the STOP button exists and works. A test can prove `cancel()` aborts a
//     controller; it cannot prove there is anything on the screen to press.
//   * the rest of the app keeps working WHILE the AI hangs. This is the actual
//     sentence — "never blocks combat" — and it is read off the bytes in
//     localStorage, not off a screenshot, because a screen that looks alive and
//     a screen that is alive are different claims.
//   * the clock ends it on its own, in the shipped default, with words a person
//     can act on. Not the 60ms the unit tests use. The real eight seconds.
//   * no credential and no LAN address in any URL, anywhere, across the whole
//     run — including the ones the app builds itself at runtime, which is where
//     `?key=` lived and which no source grep can rule out.
//
// Run from the repo root, against a real build:
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/prove-slice11.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const ID = NIX.id;
const BASE = 'http://localhost:4173/the-codex/';
const KEY = 'proof-key-do-not-log-me';

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); failures++; }
};

/* ── 0. the bundle, before a browser is involved ───────────────────────────
   The address that used to be compiled in cannot be proved absent by reading
   ai.ts, because it was in three files and two of them were components. This
   reads the shipped JavaScript. */
console.log('\n-- 0. nothing site-specific survives into the build --');
const bundle = readdirSync('dist/assets')
  .filter(f => f.endsWith('.js'))
  .map(f => readFileSync(`dist/assets/${f}`, 'utf8'))
  .join('\n');
check('no LAN address is compiled into the bundle', /192\.168\.\d+\.\d+/.test(bundle), false);
check('nothing builds a Gemini URL with the key in it', /[?&]key=/.test(bundle), false);

/* ── the browser ─────────────────────────────────────────────────────────── */
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });

await ctx.addInitScript(([id, seed, key]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  // The worker is Slice 10's subject and would only add a variable here.
  localStorage.setItem('codex-sw-off', '1');
  // SEED ONCE. Section 6 switches provider and reloads; an init script that
  // re-seeded would put the config back to Ollama and the section would prove
  // nothing while reporting nothing.
  if (localStorage.getItem('codex-ai-config')) return;
  localStorage.setItem('codex-ai-config', JSON.stringify({
    provider: 'ollama',
    // Same origin on purpose: this is the shape getDefaultOllamaUrl() produces
    // everywhere that is not the desktop, and it is the one Marcus's iPad uses.
    ollamaUrl: window.location.origin + '/ollama',
    ollamaModel: 'proof-model',
    geminiApiKey: key,
    geminiModel: 'gemini-2.0-flash',
    // OFF. The switch that did not switch. If the fallback fires anyway, the
    // Gemini route below will see a request and section 3 will say so.
    fallbackEnabled: false,
  }));
}, [ID, JSON.stringify(NIX), KEY]);

/** Every URL the page asks for, for the whole run. */
const urls = [];
ctx.on('request', r => urls.push(r.url()));

/** The dead host. Not a refusal — a refusal is instant and the old code
 *  survived it. This is the failure that hurt: the connection is accepted and
 *  then nothing ever comes back. The handler never fulfils. */
let ollamaHits = 0;
await ctx.route('**/ollama/**', () => { ollamaHits++; });

const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const COMBAT = () => p.evaluate(id => JSON.parse(localStorage.getItem('codex-combat-' + id) || 'null'), ID);
/** The sheet, not the encounter. Spell slots live on the character — the pips
 *  in the combat tracker spend Nix's actual slots, which is why this proof
 *  reads them from there and not from `codex-combat-*`. */
const SHEET = () => p.evaluate(id => JSON.parse(localStorage.getItem('codex-character-' + id) || 'null'), ID);
const askBox = () => p.getByPlaceholder('Surrounded by 3 goblins');
const stopBtn = () => p.getByRole('button', { name: 'Stop the advisor' });
const sendBtn = () => p.getByRole('button', { name: 'Send combat question' });
const banner = () => p.locator('.text-red-300');

/** The advisor lives in a collapsible whose open/closed state survives a
 *  reload, so a blind click on the header shuts it half the time. Ask what the
 *  screen is actually showing. */
const openAdvisor = async () => {
  if (await askBox().count() === 0) {
    await p.getByRole('button', { name: 'Combat Advisor', exact: true }).click();
  }
  await askBox().waitFor({ state: 'visible', timeout: 5000 });
};

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Start Combat' }).click();
await p.waitForTimeout(300);
await openAdvisor();

// ---------------------------------------------------------------------------
console.log('\n-- 1. the panel offers a way out while it waits --');
check('the advisor input is there before anything is asked', await askBox().isEnabled(), true);
check('  ...and there is no Stop button yet', await stopBtn().count(), 0);

await askBox().fill('surrounded by 3 goblins, what should I do?');
await sendBtn().click();
await p.waitForTimeout(400);

check('the host has been asked', ollamaHits > 0, true);
check('the panel says it is thinking', await p.getByText('Analyzing the battlefield').count() > 0, true);
check('THE STOP BUTTON IS THERE', await stopBtn().count(), 1);
check('  ...and the Send button has stepped aside for it', await sendBtn().count(), 0);

// ---------------------------------------------------------------------------
console.log('\n-- 2. combat keeps working while the AI hangs --');
// The whole slice in one assertion. Read off the persisted encounter, because
// a button that visibly depresses and a button that changed the fight are not
// the same thing, and only one of them survives the iPad going to sleep.
const before = await COMBAT();
const sheetBefore = await SHEET();
check('the Action is unspent to begin with', before?.turnActions?.action, false);

await p.getByRole('button', { name: 'Action: available' }).click();
await p.waitForTimeout(250);
const during = await COMBAT();
check('SPENDING THE ACTION WORKS WITH THE AI STILL HANGING', during?.turnActions?.action, true);

await p.getByRole('button', { name: '1st slot 1: expend' }).click();
await p.waitForTimeout(250);
const sheetDuring = await SHEET();
check('  ...so does burning a 1st-level slot off the sheet',
  sheetDuring?.spellSlots?.[1]?.current, sheetBefore.spellSlots[1].current - 1);

check('  ...and the AI is still waiting, so none of that was after the fact',
  await stopBtn().count(), 1);

// Every defect in Slices 6c, 7 and 10 that a test missed was caught by LOOKING.
// This is the one frame that matters: a hung advisor with a live fight above
// it. Scrolled to the panel deliberately — the first version of this shot was
// of the top of the page, which is a screenshot of nothing being tested.
await p.getByText('Analyzing the battlefield').scrollIntoViewIfNeeded();
await p.waitForTimeout(200);
await p.screenshot({ path: 'docs/plans/codex-v1/reference/baseline/slice11-hung-advisor.png' });

// ---------------------------------------------------------------------------
console.log('\n-- 3. Stop stops it, instantly, and quietly --');
// A proof must be able to go red on a line, not die on a stack trace. If the
// Stop button is gone, clicking it throws and the run ends with no FAIL and no
// verdict — so the missing button is a RESULT here, and the panel is then left
// to free itself on the clock so the sections below still get to run.
const t0 = Date.now();
const hadStop = await stopBtn().count() > 0;
if (hadStop) await stopBtn().click();
await sendBtn().waitFor({ state: 'visible', timeout: hadStop ? 2000 : 20000 }).catch(() => {});
const elapsed = Date.now() - t0;

check('the panel is usable again', await askBox().isEnabled(), true);
check('  ...in well under a second, not when the socket notices', elapsed < 1000, true);
check('  ...the spinner is gone', await p.getByText('Analyzing the battlefield').count(), 0);
// Changing your mind is not an error. A red banner here would train Marcus to
// ignore the red banner.
check('  ...and NOTHING went red', await banner().count(), 0);

// ---------------------------------------------------------------------------
console.log('\n-- 4. left alone, the shipped clock ends it — in plain words --');
// Not the 60ms the unit tests use. The real default, on the real build.
// Same defence: a panel that never freed itself must not turn the rest of the
// run into an exception about a disabled input.
if (!await askBox().isEnabled()) {
  check('SKIPPED — the panel never came back, so the clock cannot be tested', false, true);
}
await askBox().fill('and now if I do nothing at all', { force: true }).catch(() => {});
await sendBtn().click({ force: true }).catch(() => {});
const t1 = Date.now();
await banner().first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
const waited = Date.now() - t1;

const said = (await banner().first().textContent().catch(() => '')) ?? '';
check('the wait ended on its own', await banner().count() > 0, true);
check('  ...inside one bound, not two', waited < 15000, true);
check('  ...it took a real clock to do it, not an instant refusal', waited > 4000, true);
check('  ...and it says combat is unaffected', said.includes('Combat is unaffected'), true);
check('  ...and names the thing to go and fix', said.includes('Settings'), true);
check('the panel is usable again afterwards', await askBox().isEnabled(), true);

// ---------------------------------------------------------------------------
console.log('\n-- 5. the switch that did not switch --');
// fallbackEnabled is false in the seeded config. Two dead requests have now
// happened. If the precedence bug were back, Google would have been called.
check('NOTHING was sent to Gemini with fallback off',
  urls.filter(u => u.includes('generativelanguage')).length, 0);

// ---------------------------------------------------------------------------
console.log('\n-- 6. the key travels in a header, and the address is never invented --');
let geminiUrl = null, geminiAuth = null;
await ctx.route('**generativelanguage.googleapis.com/**', async route => {
  geminiUrl = route.request().url();
  geminiAuth = route.request().headers()['x-goog-api-key'] ?? null;
  // The advisor streams, so the canned answer has to be real SSE — a JSON blob
  // here would be parsed by nothing and the panel would show "No response
  // generated", which is a green-looking way to test the wrong thing.
  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Step out of reach and Smite.' }] } }] }) + '\n\n',
  });
});
await p.evaluate(k => {
  const cfg = JSON.parse(localStorage.getItem('codex-ai-config'));
  localStorage.setItem('codex-ai-config', JSON.stringify({ ...cfg, provider: 'gemini', geminiApiKey: k }));
}, KEY);
await p.reload({ waitUntil: 'networkidle' });
await openAdvisor();
await askBox().fill('what does the paladin do');
await sendBtn().click();
await p.getByText('Step out of reach').first().waitFor({ timeout: 15000 }).catch(() => {});

check('Gemini answered', await p.getByText('Step out of reach').count() > 0, true);
check('THE KEY IS IN THE HEADER', geminiAuth, KEY);
check('  ...and not in the URL', (geminiUrl ?? '').includes('key='), false);
check('  ...not anywhere in the URL, under any name', (geminiUrl ?? '').includes(KEY), false);

// ---------------------------------------------------------------------------
console.log('\n-- 7. across the whole run --');
// Browser history, proxy logs, a Referer header and a screenshot of a network
// tab all record URLs. None of them may have recorded the key.
check('no URL requested all session contained the key', urls.filter(u => u.includes(KEY)).length, 0);
check('no URL requested all session was a LAN address', urls.filter(u => /192\.168\./.test(u)).length, 0);
check('every request went to this origin or to Google', urls.every(u =>
  u.startsWith('http://localhost:4173/') || u.includes('generativelanguage.googleapis.com')), true);
check('the console stayed clean', errors, []);

await b.close();
console.log(failures ? `\n${failures} FAILED` : '\nall good');
process.exit(failures ? 1 : 0);
