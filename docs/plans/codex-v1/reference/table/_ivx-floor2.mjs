import { up, newPage, importFile, realCopy, settle, bodyText, rejections, goScreen, SCREENS } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const { ctx, page } = await newPage(env);
let where = 'boot';
const log = [];
page.on('console', m => log.push({ where, type: m.type(), text: m.text() }));
page.on('pageerror', e => log.push({ where, type: 'PAGEERROR', text: String(e).split('\n').slice(0, 2).join(' / ') }));
page.on('requestfailed', r => log.push({ where, type: 'REQFAIL', text: r.url().slice(0, 110) + ' :: ' + (r.failure()?.errorText || '') }));

/* ─── NEGATIVE CONTROL: prove my own listeners fire ─── */
where = 'selftest';
await page.evaluate(() => {
  console.error('IV-SELFTEST-console-error');
  console.warn('IV-SELFTEST-console-warn');
  Promise.reject(new Error('IV-SELFTEST-rejection'));
  setTimeout(() => { throw new Error('IV-SELFTEST-uncaught'); }, 10);
  fetch('http://127.0.0.1:1/iv-selftest').catch(() => {});
});
await page.waitForTimeout(1200);
console.log('SELFTEST caught:', JSON.stringify(log.map(l => l.type + ':' + l.text.slice(0, 40))));
console.log('SELFTEST rejections:', JSON.stringify(await rejections(page)));
await page.evaluate(() => { window.__rej = []; });
log.length = 0;

where = 'import';
await importFile(page, file);
await settle(page);

/* ─── walk + poke ─── */
const POKE = {
  'play/Combat': [/^Combat Advisor$/i, /^Damage Log$/i, /^Actions Reference$/i, /^Rest Management$/i, /^Character Persona$/i, /^Start Combat$/i],
  'play/Grimoire': [/^Cast$/i],
  'play/Roleplay': [/Perform/i, /Dialogue/i, /Catchphrase/i],
  'prep/Character': [],
  'prep/Grimoire': [/Lock & Load/i],
  'prep/Persona': [],
  'prep/Academy': [/Quiz/i, /Coach/i, /Start/i, /Drill/i],
};
const seen = {};
for (const s of SCREENS) {
  where = s.id;
  await goScreen(page, s);
  await settle(page);
  const t = await bodyText(page);
  seen[s.id] = { len: t.length, has: {
    nix: /Nix/.test(t), loh: /35\/35|LAY ON HANDS/i.test(t), ac18: /AC 18|18/.test(t),
  } };
  for (const re of POKE[s.id] || []) {
    const b = page.getByRole('button', { name: re }).first();
    if (await b.count()) {
      await b.click({ timeout: 4000 }).catch(e => log.push({ where, type: 'CLICKFAIL', text: String(re) + ' ' + String(e).slice(0, 80) }));
      await page.waitForTimeout(1200);
      // close whatever opened
      for (const c of [/^Close/i, /^×$/, /^Back$/i]) {
        const x = page.getByRole('button', { name: c }).first();
        if (await x.count()) { await x.click({ timeout: 2000 }).catch(() => {}); break; }
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);
    }
  }
}

/* ─── the AI path, which is what watch() filters ─── */
where = 'settings/ai';
await page.getByRole('button', { name: /open settings/i }).first().click();
await page.waitForTimeout(700);
const tc = page.getByRole('button', { name: /^Test Connection$/i }).first();
if (await tc.count()) { await tc.click(); await page.waitForTimeout(6000); }
console.log('\nAI test-connection screen says:', JSON.stringify(((await bodyText(page)).match(/Test Connection[^]{0,160}/) || [])[0]));

await page.waitForTimeout(1500);
console.log('\n=== SCREEN CONTENT SANITY ===');
for (const [k, v] of Object.entries(seen)) console.log(k.padEnd(16), JSON.stringify(v));
console.log('\n=== UNHANDLED REJECTIONS (' + (await rejections(page)).length + ') ===');
(await rejections(page)).forEach(r => console.log('  ' + r));
const noisy = log.filter(l => l.type !== 'log' && l.type !== 'debug' && l.type !== 'info');
console.log('\n=== ALL NON-LOG EVENTS, UNFILTERED (' + noisy.length + ') ===');
for (const l of noisy) console.log(`[${l.where}] ${l.type.toUpperCase()}: ${l.text.replace(/\s+/g, ' ').slice(0, 240)}`);
console.log('\n=== info/log (' + (log.length - noisy.length) + ') ===');
for (const l of log) if (!noisy.includes(l)) console.log(`[${l.where}] ${l.type}: ${l.text.replace(/\s+/g, ' ').slice(0, 200)}`);

await ctx.close(); await env.browser.close(); await env.srv.close();
