/* PROBE — with no AI key, what can he actually study?
   ---------------------------------------------------------------------------
   Marcus's stated reason for shipping is "so I can fully prep my character and
   study". The Academy is the studying. This walks every Academy segment with
   NO provider configured — the state every fresh install is in — presses the
   control that starts the exercise, and records whether anything usable
   appeared or whether the segment is a dead end.

   This is a probe, not a control: it measures, it does not grade. Its output
   becomes the § 9.12 write-up. Nothing here is a criterion. */
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

const srv = await serveDist(DIST, 4296);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));

/* Every console error and rejection, unfiltered — rig.mjs's watch() drops the
   AI-provider classes, which is exactly what this probe is about. */
const errs = [];
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 140)));
page.on('requestfailed', r => errs.push('netfail: ' + r.url().slice(0, 90)));
page.on('response', r => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url().slice(0, 90)}`); });

await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await settle(page);

/* Confirm the fresh-install state: no key anywhere. */
const cfg = await page.evaluate(() => {
  const out = {};
  for (const k of Object.keys(localStorage)) if (/ai|config|key|provider/i.test(k)) out[k] = localStorage.getItem(k).slice(0, 160);
  return out;
});
console.log('\n\x1b[1mPROBE — the Academy with no AI key\x1b[0m\n');
console.log('  stored AI config:', JSON.stringify(cfg));

await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
await settle(page);

/* A22 recorded that the Academy's segment controls carry a count in their text
   — `textContent` is "Quizzes21", not "Quizzes" — so an anchored regex misses
   them. Print what is actually on this screen before assuming any name. */
const found = await page.evaluate(() => [...document.querySelectorAll('button,[role="tab"]')]
  .map(e => (e.textContent || '').trim().replace(/\s+/g, ' '))
  .filter(t => t && t.length < 40));
console.log('  controls on prep/Academy:', JSON.stringify(found.slice(0, 24)));

/* The real segment names, read off the screen above rather than copied out of
   `TrainingHub`'s internal MODES list — which is what the first version of this
   probe did, and it reported five "not found" while the screen had five other
   segments sitting right there.

   Each segment names the ONE control that starts its exercise, by exact text.
   The first version used a `/generate|start|next|roll/i` sweep and pressed
   «Dice Rolls» for Quizzes and «Beginner» for Accent — then printed "nothing
   happened", which was true of the button it pressed and false of the segment.
   A probe that guesses which button it pressed is not measuring the thing it
   names. If a starter is not found, that is reported as NOT MEASURED.

   The Academy has TWO levels and the first version of this list flattened
   them. `Study` and `In-Session` are sub-tabs *inside* Training, not siblings
   of it — which is why pressing them appeared to change nothing: the panel was
   already the one they belong to. The top level is Training / Quizzes / Accent. */
const SEGMENTS = [
  { seg: 'Training', start: /^Generate Scene$/i },
  { seg: 'Training', start: /^Random Catchphrase$/i },
  { seg: 'Training', start: /^Improv Drills$/i },
  { seg: 'Quizzes',  start: /^Generate Question$/i },
  { seg: 'Quizzes',  start: /^Start Drill$/i },
  { seg: 'Accent',   start: /^Train$/i },
];

const seen = new Set();
for (const { seg, start } of SEGMENTS) {
  const tag = `${seg} · ${String(start).slice(2, -3)}`;
  errs.length = 0;
  /* Re-enter the Academy each time: the segment strip is not guaranteed to
     survive being inside a segment, and a locator that silently resolves to
     nothing is how the previous version reported two segments as absent while
     they were on screen. Matched on `textContent`, not accessible name — A-22
     recorded that these read "Quizzes21", count and all. */
  await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
  await settle(page);
  const tab = page.locator('button,[role="tab"]')
    .filter({ hasText: new RegExp('^\\s*' + seg, 'i') }).first();
  if (!(await tab.count())) { console.log(`\n  ${seg.padEnd(16)} \x1b[33msegment control not found\x1b[0m`); continue; }
  await tab.click().catch(() => {});
  await settle(page);

  const inSeg = await page.evaluate(() => [...document.querySelectorAll('button,[role="tab"]')]
    .map(e => (e.textContent || '').trim().replace(/\s+/g, ' ')).filter(t => t && t.length < 34));
  if (!seen.has(seg)) { seen.add(seg); console.log(`\n  \x1b[2m${seg} offers: ${JSON.stringify(inSeg.slice(6, 26))}\x1b[0m`); }
  const before = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').length);
  const btn = page.getByRole('button', { name: start }).first();
  let pressed = '';
  if (await btn.count()) {
    pressed = ((await btn.textContent()) || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    await btn.click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({
    len: document.body.innerText.replace(/\s+/g, ' ').length,
    alert: [...document.querySelectorAll('[role="alert"]')].map(e => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 90)),
    spinner: !!document.querySelector('[class*="animate-spin"]'),
  }));

  const grew = after.len - before;
  const verdict = !pressed ? `\x1b[33mNOT MEASURED — starter control not on this segment\x1b[0m`
    : after.alert.length ? `\x1b[31mrefused\x1b[0m`
    : grew > 40 ? `\x1b[32mcontent appeared (+${grew} chars)\x1b[0m`
    : `\x1b[33mnothing happened (${grew >= 0 ? '+' : ''}${grew} chars)\x1b[0m`;
  console.log(`  ${tag.padEnd(30)} ${verdict}`);
  if (after.spinner) console.log(`      \x1b[31mspinner still turning after 2.5s\x1b[0m`);
  for (const a of after.alert) console.log(`      told           "${a}"`);
  for (const e of [...new Set(errs)].slice(0, 4)) console.log(`      \x1b[31m${e}\x1b[0m`);
}

console.log('');
await ctx.close(); await b.close(); await srv.close();
