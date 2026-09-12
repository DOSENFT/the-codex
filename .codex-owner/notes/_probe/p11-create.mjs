import { chromium, newCtx, shot, wireLogs, URL_BASE } from './_pw.mjs';
import { txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
wireLogs(page);
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
const say = (s) => console.log('\n\n===== ' + s + ' =====');

say('Create New Character — step 0');
await tap(page, 'Create New Character');
await shot(page, 'setup-create-step0-390');
console.log(await txt(page, 1400));
await btns(page, 'step0');
console.log('--- selects/inputs ---');
for (const s of await page.locator('select').all()) {
  const lbl = await s.getAttribute('aria-label') || await s.evaluate(e => e.previousElementSibling?.textContent || e.closest('label')?.textContent || '');
  const opts = await s.locator('option').allTextContents();
  console.log('  select:', JSON.stringify((lbl || '').trim().slice(0, 40)), '->', opts.slice(0, 18).join('|'));
}
for (const i of await page.locator('input').all()) {
  const lbl = await i.getAttribute('aria-label') || await i.getAttribute('placeholder') || '';
  console.log('  input:', JSON.stringify(lbl.slice(0, 60)), 'type=' + await i.getAttribute('type'));
}

// walk the wizard
for (let step = 0; step < 8; step++) {
  const next = page.getByRole('button', { name: /^(Next|Continue|Create|Finish|Done|Start)/i }).first();
  if (!(await next.count())) break;
  const label = (await next.innerText()).trim();
  console.log(`\n>>> step ${step}: clicking "${label}"`);
  await next.click().catch(e => console.log('  click err', String(e).slice(0, 80)));
  await page.waitForTimeout(800);
  await shot(page, `setup-create-step${step + 1}-390`);
  console.log(await txt(page, 1100));
  if (/create|finish|done/i.test(label)) break;
}
await shot(page, 'setup-create-final-390');
const ls = await page.evaluate(() => Object.keys(localStorage));
console.log('\nlocalStorage:', ls.join(', '));
await ctx.close();
await browser.close();
