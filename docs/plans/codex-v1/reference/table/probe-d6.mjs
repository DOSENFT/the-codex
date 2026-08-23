// D-6 "passed" with 4 controls driven and 0 asked first. A pass where nothing
// happened is the same failure as a check that only asks whether the page is
// blank. Find out what those four controls actually are.
import { chromium, freshCtx, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';
const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: 'http://localhost:4173/the-codex/', viewport: { width: 390, height: 844 } });
await importFile(page, realCopy('full'));
const gear = page.getByRole('button', { name: /Open settings/i }).first();
console.log('gear count:', await gear.count());
await gear.click().catch(e => console.log('gear click threw', String(e).slice(0,80)));
await page.waitForTimeout(900);
const danger = page.getByRole('button', { name: /^(Reset|Delete|Clear|Wipe|Remove|Start Over|New Character|Long Rest)/i });
const n = await danger.count();
console.log('danger count:', n);
for (let i = 0; i < n; i++) {
  const el = danger.nth(i);
  console.log(` [${i}] "${(await el.textContent() || '').trim().replace(/\s+/g,' ').slice(0,40)}" visible=${await el.isVisible().catch(()=>'ERR')} enabled=${await el.isEnabled().catch(()=>'ERR')} box=${JSON.stringify(await el.boundingBox().catch(()=>null))}`);
}
console.log('\nbody has "Delete Character":', /Delete Character/.test(await page.evaluate(() => document.body.innerText)));
// drive the delete
const del = page.getByRole('button', { name: /^Delete Character/i }).first();
if (await del.count()) {
  await del.scrollIntoViewIfNeeded().catch(()=>{});
  await del.click().catch(e => console.log('del click threw', String(e).slice(0,120)));
  await page.waitForTimeout(700);
  const t = await page.evaluate(() => document.body.innerText);
  console.log('after Delete Character tap — confirm shown:', /Delete this character\?/i.test(t));
  console.log('  cancel present:', await page.getByRole('button', { name: /^Cancel$/ }).count());
}
await ctx.close(); await b.close();
