import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;
const { ctx, page } = await newPage(env);
await importFile(page, file);
await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); await settle(page);

const s1 = async () => (await charBlob(page))?.val?.spellSlots?.['1']?.current;
const round = async () => ((await bodyText(page)).match(/Round \d+/) || [])[0];

for (let turn = 1; turn <= 6; turn++) {
  const b = page.locator('button:not([disabled])').filter({ hasText: /Action · 1st-level slot/ }).first();
  const n = await page.locator('button:not([disabled])').filter({ hasText: /Action · 1st-level slot/ }).count();
  if (!n) {
    const t = await bodyText(page);
    L(`turn ${turn}: NO enabled 1st-level control. slot1=${await s1()} ${await round()}`);
    L('   reasons on screen: ' + JSON.stringify([...new Set((t.match(/(No slots? left|no 1st-level|It is not your turn|Your action is spent|Would drop [A-Za-z]+)/g) || []))]));
    L('   1st-level rows still listed: ' + await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).count());
    break;
  }
  const lab = (await b.textContent()).replace(/\s+/g, ' ').slice(0, 16);
  await b.click(); await page.waitForTimeout(800);
  L(`turn ${turn}: cast ${JSON.stringify(lab)} -> slot1=${await s1()} ${await round()}`);
  await page.getByRole('button', { name: /^End turn$/ }).first().click().catch(e => L('   end turn err'));
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /^My turn begins$/ }).first().click().catch(e => L('   my-turn err'));
  await page.waitForTimeout(1000); await settle(page);
}

const t = await bodyText(page);
L('\nfinal slot line: ' + JSON.stringify((t.match(/Level 1 [^\n]{0,30}Level 2 \d+\/\d+/) || [])[0]));
L('final round: ' + await round() + ' | ls slot1=' + await s1());
L('\n=== screen tail ===\n' + t.slice(-900));
L('\nerrors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
