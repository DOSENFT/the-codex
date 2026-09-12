import { chromium, newCtx, shot, wireLogs, URL_BASE } from './_pw.mjs';
import { txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
wireLogs(page);
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await tap(page, 'Create New Character');

await page.locator('input[placeholder*="Thalindra"]').fill('Probe Wizard');
await page.waitForTimeout(300);
await shot(page, 'setup-create-step1-name-390');

for (let step = 1; step <= 12; step++) {
  const heading = await page.evaluate(() => document.body.innerText.split('\n').slice(0, 8).join(' | '));
  console.log(`\n>>> STEP ${step}: ${heading}`);
  // record controls
  const sels = await page.locator('select').all();
  for (const s of sels) {
    const opts = await s.locator('option').allTextContents();
    console.log('   select ->', opts.slice(0, 14).join(' | '), opts.length > 14 ? `(+${opts.length - 14})` : '');
  }
  const inputs = await page.locator('input').all();
  for (const i of inputs) console.log('   input:', JSON.stringify((await i.getAttribute('aria-label')) || (await i.getAttribute('placeholder')) || ''), await i.getAttribute('type'));
  const bs = await btns(page, 'step' + step);
  await shot(page, `setup-create-s${step}-390`);
  console.log((await txt(page, 900)));

  // pick Wizard on the class step
  if (sels.length && bs.length) {
    for (const s of sels) {
      const opts = await s.locator('option').allTextContents();
      if (opts.includes('Wizard')) { await s.selectOption('Wizard'); console.log('   -> selected Wizard'); await page.waitForTimeout(400); }
    }
  }
  const next = page.getByRole('button', { name: /^(Next|Create Character|Begin|Finish|Skip|Continue)/i }).first();
  if (!(await next.count())) { console.log('   NO NEXT BUTTON — stopping'); break; }
  const label = (await next.innerText()).trim();
  if (!(await next.isEnabled())) { console.log('   NEXT DISABLED at step', step, '->', label); break; }
  console.log('   clicking:', label);
  await next.click();
  await page.waitForTimeout(900);
  if (/create|begin|finish/i.test(label)) { await page.waitForTimeout(1500); break; }
}

await shot(page, 'setup-create-final-390');
console.log('\n=== FINAL ===');
console.log(await txt(page, 1800));
const saved = await page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = id && JSON.parse(localStorage.getItem('codex-character-' + id) || 'null');
  return c ? JSON.stringify({ name: c.name, class: c.class, subclass: c.subclass, level: c.level, spells: c.spells?.length, feats: c.features?.length, hp: c.hitPoints, slots: c.spellSlots }) : 'NO CHARACTER SAVED';
});
console.log('saved:', saved);
await ctx.close();
await browser.close();
