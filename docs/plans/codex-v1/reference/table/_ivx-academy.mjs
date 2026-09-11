import { up, newPage, importFile, realCopy, settle, bodyText, rejections, goScreen, SCREENS } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const { ctx, page } = await newPage(env);
let where = 'boot';
const log = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${where}] console.${m.type()}: ${m.text()}`); });
page.on('pageerror', e => log.push(`[${where}] PAGEERROR: ${String(e).split('\n')[0]}`));
page.on('response', r => { if (r.status() >= 400) log.push(`[${where}] HTTP ${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`); });
page.on('requestfailed', r => log.push(`[${where}] REQFAIL ${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`));

where = 'import';
await importFile(page, file);
await settle(page);

where = 'prep/Academy-mount';
await goScreen(page, SCREENS.find(s => s.id === 'prep/Academy'));
await settle(page);
await page.waitForTimeout(2500);
console.log('after MOUNT only, events:', log.length ? '\n  ' + log.join('\n  ') : 'none');

const t = await bodyText(page);
console.log('\n=== prep/Academy TEXT ===\n' + t.slice(0, 1600));

const btns = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map(b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)));
console.log('\n=== Academy buttons ===\n' + JSON.stringify(btns, null, 0));

// click each candidate ONE at a time and report exactly what it produces
for (const re of [/Quiz/i, /Coach/i, /Drill/i, /Practice/i, /Generate/i, /Scene/i]) {
  const b = page.getByRole('button', { name: re }).first();
  if (!(await b.count())) { console.log(`\n-- ${re}: no such control`); continue; }
  const label = (await b.textContent()).replace(/\s+/g, ' ').trim().slice(0, 50);
  const n0 = log.length;
  where = 'click:' + label;
  await b.click({ timeout: 4000 }).catch(e => console.log('   click failed', String(e).slice(0, 90)));
  await page.waitForTimeout(6000);
  const now = await bodyText(page);
  console.log(`\n-- clicked "${label}" -> ${log.length - n0} new event(s)`);
  log.slice(n0).forEach(l => console.log('   ' + l));
  const err = now.match(/(fail|error|unreach|could not|unable|offline|try again)[^]{0,140}/i);
  console.log('   on-screen msg:', JSON.stringify(err ? err[0].slice(0, 160) : null));
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);
}
console.log('\nrejections:', JSON.stringify(await rejections(page)));
console.log('\nTOTAL EVENTS:\n  ' + log.join('\n  '));
await ctx.close(); await env.browser.close(); await env.srv.close();
