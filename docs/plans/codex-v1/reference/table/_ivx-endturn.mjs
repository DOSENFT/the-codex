import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;
const { ctx, page } = await newPage(env);
await importFile(page, file);
await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); await settle(page);

const s1 = async () => (await charBlob(page))?.val?.spellSlots?.['1']?.current;
const snap = async tag => {
  const t = await bodyText(page);
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => /Action · \d/.test(b.textContent) || /At will/.test(b.textContent))
    .map(b => ({ n: b.textContent.replace(/\s+/g, ' ').slice(0, 26), dis: b.disabled, op: +getComputedStyle(b).opacity.slice(0, 4) })));
  L(`\n--- ${tag} --- round=${(t.match(/Round \d+/) || [])[0]}  slot1=${await s1()}  slots-line=${JSON.stringify((t.match(/Level 1 \d+\/\d+/) || [])[0])}`);
  L('   spent-marker on screen: ' + JSON.stringify((t.match(/Your action is spent/) || [])[0] || null));
  for (const b of btns) L(`   ${b.dis ? 'DISABLED' : 'enabled '} op=${b.op} "${b.n}"`);
};

await snap('fresh');
await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first().click();
await page.waitForTimeout(900);
await snap('after casting Bless');

await page.getByRole('button', { name: /^End turn$/ }).first().click();
await page.waitForTimeout(1400); await settle(page);
await snap('after End turn #1');

// try to cast again
const b2 = page.locator('button:not([disabled])').filter({ hasText: /Action · 1st-level slot/ }).first();
L('\nenabled 1st-level Action controls after End turn: ' + await page.locator('button:not([disabled])').filter({ hasText: /Action · 1st-level slot/ }).count());
if (await b2.count()) {
  L('clicking ' + JSON.stringify((await b2.textContent()).slice(0, 24)));
  await b2.click(); await page.waitForTimeout(1000);
  await snap('after 2nd cast');
} else {
  L('>>> NO enabled 1st-level Action control exists in round 2.');
}

// end turn a few more times
for (let i = 2; i <= 4; i++) {
  await page.getByRole('button', { name: /^End turn$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
}
await snap('after End turn x4');
L('\nreloading the turn screen…');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500); await settle(page);
await snap('after reload');

L('\nerrors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
