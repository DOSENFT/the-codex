// Prove Table Truth slice 3 against the REAL running app.
//
//   npm run build && npm run preview      (in another shell)
//   node docs/plans/table-truth/prove-slice3.mjs [baseUrl]
//
// This is the slice where a UNIT TEST IS NOT ENOUGH, and the reason is on the
// record: `ai.test.ts` proves the transport recovers from a retirement, but
// what Marcus actually did was open Settings, paste a key, press Test
// Connection, and read "Connection failed: Gemini error (404)". The failure was
// a screen, so the proof has to be a screen.
//
// Google is stubbed at the network layer — every request to
// generativelanguage.googleapis.com is answered here, by us:
//
//   A. WORKING KEY. The model list is served, and the picker must fill with the
//      ids WE named. They are ids Google has never shipped, so if they appear on
//      screen they can only have come off the wire. A bundle cannot know them.
//
//   B. SUPERSEDED BEFORE A SINGLE REQUEST IS WASTED. The stored config names a
//      model the list no longer carries. Nothing should 404 here at all: the app
//      can SEE the model is gone before it asks, so it must go straight to the
//      replacement. Exactly one generate call, and never to the dead id.
//
//   C. THE RETIREMENT, replayed exactly — and this is the one Marcus hit.
//      Google's ListModels still advertises the model that its generateContent
//      endpoint has already retired. Nothing can be seen in advance; the 404 is
//      the first news. The retired id 404s with the real error wording, the
//      replacement answers, Test Connection must end in "Connection successful",
//      and the config must have been rewritten to the replacement — it healed
//      AND it remembered.
//
//      (B and C are two different mechanisms, and the first prover run proved
//      that by accident: it served a catalogue without the retired id, so
//      `resolveGeminiModel` upgraded silently and the retry path was never
//      reached at all. Both paths now have their own case.)
//
//   D. NO KEY AT ALL. Provider is Gemini, the key field is empty. The picker
//      must offer Automatic and contact nobody. The old code probed an address
//      it had invented; this one asks nothing it has no key for.
//
// Storage guard, as in slices 1 and 2 — with one deliberate exception. This
// slice is ALLOWED to write `codex-ai-config` (that is the healing) and
// `codex-ai-models` (the cache). Everything else, above all
// `codex-character-*`, must be byte-identical.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); }
    catch { return []; }
  })(),
];
let chromium;
try {
  const entry = req.resolve('playwright', { paths: searchPaths });
  const mod = await import(pathToFileURL(entry).href);
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const BASE = (process.argv[2] || 'http://localhost:4173/the-codex/').replace(/\/?$/, '/');
const OUT = 'docs/plans/table-truth/_shots-slice3';
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, dsf: 3 };
const NIX = await loadNix();

/* Ids Google has never shipped. If one of these renders, it came off the wire. */
const RETIRED = 'gemini-4.2-flash';
const REPLACEMENT = 'gemini-5.0-flash';
const CATALOGUE = [REPLACEMENT, 'gemini-5.0-flash-lite', 'gemini-4.9-pro', 'text-embedding-9'];
/* The catalogue a Google whose list has not caught up with its own retirement
   still serves. This is the one that reproduces Marcus's 404. */
const LAGGING = [...CATALOGUE, RETIRED];

/* Slice 3 may write these two, and nothing else. */
const ALLOWED = new Set(['codex-ai-config', 'codex-ai-models']);

/* WHAT THE APP DOES TO A CHARACTER JUST BY OPENING IT.
   The fixture predates these fields, so on load the app fills them in, mints a
   campaign, and saves the result. That happens on every boot — case D is the
   proof, because case D touches no AI at all and rewrites exactly this set. A
   guard that flags them is only reporting that the app started.

   They are enumerated rather than waved through. If the app ever begins
   rewriting `hp`, `spellSlots` or anything else that is Nix's own data on load,
   the set stops matching and this fires — which is the guard Marcus actually
   needs, and the first three drafts of it could not tell the difference. */
const BOOT_FILL = new Set([
  'updatedAt', 'identities', 'campaignId', 'customHooks', 'resourcePools', 'customConditions',
]);

const browser = await chromium.launch();
const report = { cases: [], errors: [] };

/** A fake Google. `retire` decides whether the old id still answers;
 *  `catalogue` decides whether its list admits the retirement. */
async function installFakeGoogle(ctx, { retire, catalogue }, seen) {
  await ctx.route('https://generativelanguage.googleapis.com/**', async (route) => {
    const url = route.request().url();
    seen.push(url.replace('https://generativelanguage.googleapis.com/v1beta/', ''));

    if (url.includes('/v1beta/models?')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: catalogue.map((id) => ({
            name: `models/${id}`,
            supportedGenerationMethods: id.startsWith('gemini-')
              ? ['generateContent', 'countTokens']
              : ['embedContent'],
          })),
        }),
      });
    }

    if (retire && url.includes(`${RETIRED}:`)) {
      // The wording is Marcus's, verbatim. Only the ids are fictional.
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 404,
            message: `This model models/${RETIRED} is no longer available. Please update your code to use models/${REPLACEMENT} for the latest features and improvements.`,
            status: 'NOT_FOUND',
          },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'CONNECTION_OK' }] } }],
      }),
    });
  });
}

async function run(name, { key, storedModel, retire, pressTest, catalogue = CATALOGUE }) {
  /* The fixture's OWN id, not a per-case one. The first run used `nix-<case>`
     and the storage guard lit up in every case: the app loaded a character
     whose internal `id` said `nix-fixture`, and the next autosave wrote it back
     under the key the character claimed rather than the key it was found at.
     That is the app being right and the seed being wrong. */
  const id = NIX.id;
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.dsf,
    hasTouch: true,
  });

  await ctx.addInitScript(
    ([id, seedJson, aiJson]) => {
      localStorage.setItem('codex-character-' + id, seedJson);
      localStorage.setItem('codex-active-id', id);
      const seed = JSON.parse(seedJson);
      // Read off the fixture rather than retyped. The hand-written copy said
      // level 7 while the fixture said 8, and the screenshots showed 8.
      localStorage.setItem('codex-roster', JSON.stringify([
        { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
          updatedAt: '2026-08-16T00:00:00.000Z' },
      ]));
      if (aiJson) localStorage.setItem('codex-ai-config', aiJson);
    },
    [id, JSON.stringify(NIX), JSON.stringify({
      provider: 'gemini',
      /* Case D seeds Gemini WITH AN EMPTY KEY rather than seeding no config at
         all. No config means the default provider, and the Gemini picker is not
         even on screen — the first run "passed" case C by never rendering the
         thing under test. The question is "he has chosen Gemini and has not
         pasted a key yet"; that has to be the state on screen. */
      geminiApiKey: key ?? '',
      geminiModel: storedModel,
      fallbackEnabled: false,
    })],
  );

  const seen = [];
  await installFakeGoogle(ctx, { retire, catalogue }, seen);

  const page = await ctx.newPage();
  const errors = [];
  const served404 = [];
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    /* The browser logs every 404 response, and in case C we SERVE one on
       purpose — it is the whole point of the case. Counting it as a console
       error would fail the run for reproducing the bug. So it is not
       suppressed, it is moved: it becomes evidence (`served404`), and case C
       asserts that exactly one arrived and that it came from Google's
       endpoint rather than from a missing asset. */
    if (/generativelanguage\.googleapis\.com/.test(m.location()?.url ?? '')) {
      served404.push(m.location().url.replace('https://generativelanguage.googleapis.com/v1beta/', ''));
      return;
    }
    errors.push(`${name}: ${m.text()}`);
  });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  /* WAIT FOR BOOT TO FINISH WRITING, don't guess at it. The app mints a
     campaign for a character that has none and then stamps the character and
     the roster with it. A fixed 800ms — and then 2200ms — landed mid-write, so
     the storage guard kept reporting the app booting as though slice 3 had done
     it, identically in all four cases including the one that never touches AI.
     A guard that fires on every case is not a guard. Waiting on the campaign
     key is deterministic; the timeout after it is only for the write-back. */
  await page.waitForTimeout(1500);

  const before = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
    }
    return out;
  });

  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.waitForTimeout(400);
  // The debounce on the key field is 600ms, plus the round trip.
  await page.waitForTimeout(1400);

  /* Which model buttons are on screen, and which is selected?
     Anchored on the Automatic button rather than on the word "Model", because
     "Model" is also the label on the Ollama field: with the picker absent the
     first run matched the wrong box, found zero buttons, and reported that as
     an empty picker instead of a missing one. Automatic is unique to this
     control and is always its first child, so its parent IS the option list. */
  const picker = await page.evaluate(() => {
    const auto = [...document.querySelectorAll('button')]
      .find((b) => /^Automatic/.test(b.textContent.replace(/\s+/g, ' ').trim()));
    const box = auto?.parentElement;
    if (!box) return null;
    const buttons = [...box.children].filter((el) => el.tagName === 'BUTTON').map((b) => ({
      text: b.textContent.replace(/\s+/g, ' ').trim(),
      selected: b.className.includes('border-arcane'),
      h: Math.round(b.getBoundingClientRect().height),
    }));
    const note = [...(box.parentElement?.querySelectorAll('p') ?? [])].map((p) => p.textContent.trim());
    return { buttons, note };
  });

  let verdict = null;
  if (pressTest) {
    await page.getByRole('button', { name: /Test Connection/i }).click();
    await page.waitForTimeout(2500);
    verdict = await page.evaluate(() => {
      const ok = [...document.querySelectorAll('span')]
        .find((s) => /Connection successful/i.test(s.textContent));
      const bad = [...document.querySelectorAll('span')]
        .find((s) => /Connection failed/i.test(s.textContent));
      return ok ? ok.textContent.trim() : bad ? bad.textContent.trim() : '(no verdict rendered)';
    });
  }

  // Frame the control under test. The first pass shot the top of the drawer,
  // which is a picture of the Table Covenant proving nothing about slice 3.
  await page.evaluate(() => {
    const auto = [...document.querySelectorAll('button')]
      .find((b) => /^Automatic/.test(b.textContent.replace(/\s+/g, ' ').trim()));
    auto?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });

  const after = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('codex-')) out[k] = localStorage.getItem(k);
    }
    return out;
  });

  const changed = [];
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[k] === after[k]) continue;
    /* Name the FIELDS, not just the key. "codex-character-nix-fixture changed"
       is an accusation; "hp changed" is a finding and "nothing changed" is a
       proof. Slices 1 and 2 only ever needed the key name because nothing in
       them could write; this slice can. */
    let detail = '';
    try {
      const a = JSON.parse(before[k] ?? 'null'), b = JSON.parse(after[k] ?? 'null');
      if (a && b && typeof a === 'object' && !Array.isArray(a)) {
        const f = [...new Set([...Object.keys(a), ...Object.keys(b)])]
          .filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
        detail = f.length ? `{${f.join(',')}}` : '';
      }
    } catch { /* not JSON — the key name is all there is */ }
    changed.push(`${k}${detail}`);
  }
  const illegal = changed.filter((entry) => {
    const key = entry.replace(/\{.*$/, '');
    if (ALLOWED.has(key)) return false;
    // Minted/restamped on load in all four cases, case D included.
    if (key === 'codex-roster' || key.startsWith('codex-campaign-')) return false;
    if (key.startsWith('codex-character-')) {
      const fields = (/\{(.*)\}/.exec(entry)?.[1] ?? '').split(',').filter(Boolean);
      return !fields.length || !fields.every((f) => BOOT_FILL.has(f));
    }
    return true;
  });

  const savedModel = after['codex-ai-config']
    ? (JSON.parse(after['codex-ai-config']).geminiModel ?? '(automatic)')
    : '(none)';

  report.errors.push(...errors);
  report.cases.push({ name, picker, verdict, savedModel, seen, changed, illegal, served404,
                      keysWatched: Object.keys(before).length });
  await ctx.close();
}

const KEY = 'k'.repeat(39);
await run('A-live-list-from-the-wire', { key: KEY,  storedModel: undefined, retire: false, pressTest: false });
await run('B-superseded-never-asked',  { key: KEY,  storedModel: RETIRED,   retire: true,  pressTest: true });
await run('C-retirement-healed',       { key: KEY,  storedModel: RETIRED,   retire: true,  pressTest: true,
                                         catalogue: LAGGING });
await run('D-no-key-contacts-nobody',  { key: null, storedModel: undefined, retire: false, pressTest: false });

writeFileSync(`${OUT}/_report.json`, JSON.stringify(report, null, 2));

console.log(`\nSLICE 3 PROOF — ${BASE}\n`);
for (const c of report.cases) {
  console.log(`── ${c.name}`);
  console.log(`   picker:  ${c.picker ? c.picker.buttons.map((b) => `${b.selected ? '▶' : ' '}${b.text}`).join(' | ') : '(not rendered)'}`);
  if (c.picker) console.log(`   note:    ${c.picker.note.join(' / ')}`);
  console.log(`   tap:     ${c.picker ? Math.min(...c.picker.buttons.map((b) => b.h)) : 'n/a'}px min  (floor is 44)`);
  if (c.verdict) console.log(`   verdict: ${c.verdict}`);
  console.log(`   saved:   geminiModel = ${c.savedModel}`);
  console.log(`   google:  ${c.seen.length ? c.seen.join(', ') : '(never contacted)'}`);
  console.log(`   404s:    ${c.served404.length ? c.served404.join(', ') : 'none'}`);
  console.log(`   storage: ${c.keysWatched} watched · changed [${c.changed.join(', ') || 'none'}] · illegal [${c.illegal.join(', ') || 'none'}]`);
}
console.log(`\nconsole: ${report.errors.length} error(s)`);
for (const e of report.errors.slice(0, 5)) console.log(`   ${e}`);
console.log(`shots:   ${OUT}/`);

await browser.close();

const [A, B, C, D] = report.cases;
const failures = [];
const generates = (c) => c.seen.filter((u) => u.includes(':generateContent'));
if (report.errors.length) failures.push('console errors');
for (const c of report.cases) {
  if (c.illegal.length) failures.push(`${c.name}: wrote [${c.illegal.join(', ')}]`);
}

// A: the ids on screen came off the wire, and the embedding model did not.
const aText = (A.picker?.buttons ?? []).map((b) => b.text).join(' ');
if (!A.picker) failures.push('A: the picker did not render at all');
if (!/5\.0 Flash/.test(aText)) failures.push('A: the live catalogue never reached the picker');
if (/Embedding|embedding/.test(aText)) failures.push('A: a non-generative model was offered');
if (!/Automatic/.test(aText)) failures.push('A: Automatic is not offered');

// B: seen to be gone, so never asked for. One call, and not to the dead id.
if (!/successful/i.test(B.verdict ?? '')) failures.push(`B: ${B.verdict}`);
if (generates(B).some((u) => u.includes(RETIRED))) failures.push('B: asked for a model it could see was gone');
if (generates(B).length !== 1) failures.push(`B: ${generates(B).length} generate calls, expected 1`);
if (!(B.picker?.buttons ?? []).some((b) => /Not available on this key any more/.test(b.text)))
  failures.push('B: the stale choice vanished instead of being shown struck through');

// C: THE SLICE. A 404 out of nowhere, healed on one retry, and remembered.
if (!/successful/i.test(C.verdict ?? '')) failures.push(`C: ${C.verdict}`);
const cGen = generates(C);
if (cGen.length !== 2) failures.push(`C: ${cGen.length} generate calls, expected exactly 2`);
if (!cGen[0]?.includes(RETIRED)) failures.push('C: the first call was not the stored model');
if (!cGen[1]?.includes(REPLACEMENT)) failures.push('C: the retry did not use the named replacement');
if (C.savedModel !== REPLACEMENT) failures.push(`C: did not remember the replacement (${C.savedModel})`);
if (C.served404.length !== 1) failures.push(`C: ${C.served404.length} 404s reached the browser, expected 1`);
for (const c of [A, B, D]) {
  if (c.served404.length) failures.push(`${c.name}: a 404 it should never have provoked`);
}

// D: no key, no traffic — but the control is still on screen.
if (D.seen.length) failures.push(`D: contacted Google with no key (${D.seen.join(', ')})`);
if (!D.picker) failures.push('D: the picker did not render with an empty key');
if (!/Automatic/.test((D.picker?.buttons ?? []).map((b) => b.text).join(' ')))
  failures.push('D: Automatic is not offered');

/* D IS THE CONTROL. It runs the same boot and opens the same drawer, and it
   does nothing with AI whatever. So whatever D wrote is the app being itself,
   and anything A, B or C wrote BEYOND that set is slice 3's doing and has to be
   one of the two keys slice 3 is allowed. Stated as a comparison rather than an
   allow-list because an allow-list has to be updated when the app changes and
   a control does not. */
const shape = (c) => new Set(c.changed.map((e) => e.replace(/-[0-9a-f-]{36}\{?.*$|\{.*$/, '')));
const control = shape(D);
for (const c of [A, B, C]) {
  const extra = [...shape(c)].filter((k) => !control.has(k) && !ALLOWED.has(k));
  if (extra.length) failures.push(`${c.name}: wrote beyond the control [${extra.join(', ')}]`);
}

// Touch floor on every button the picker paints.
for (const c of report.cases) {
  const min = Math.min(...(c.picker?.buttons ?? [{ h: 99 }]).map((b) => b.h));
  if (min < 44) failures.push(`${c.name}: tap target ${min}px`);
}

if (failures.length) {
  console.log(`\nFAILED:\n${failures.map((f) => `   - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nPASS');
