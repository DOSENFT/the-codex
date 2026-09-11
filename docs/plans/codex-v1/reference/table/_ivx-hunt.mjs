import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;

/* ── A. turn screen: action economy vs a second cast ─────────────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); await settle(page);
  const slots = async () => (await charBlob(page))?.val?.spellSlots;
  const s = async () => JSON.stringify(await slots());
  L('=== A. two Action-cost casts in one turn ===');
  L('slots ' + await s());
  const first = page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first();
  L('click 1: ' + JSON.stringify((await first.textContent()).slice(0, 22)));
  await first.click(); await page.waitForTimeout(900);
  L('slots ' + await s());
  const rest = page.locator('button').filter({ hasText: /Action · 1st-level slot/ });
  const n = await rest.count();
  L('remaining 1st-level Action controls: ' + n);
  if (n) {
    const b = rest.first();
    const lab = (await b.textContent()).replace(/\s+/g, ' ').slice(0, 40);
    const dis = await b.evaluate(e => ({ disabled: e.disabled, aria: e.getAttribute('aria-disabled'), pe: getComputedStyle(e).pointerEvents, op: getComputedStyle(e).opacity }));
    L('2nd control ' + JSON.stringify(lab) + ' state ' + JSON.stringify(dis));
    await b.click({ force: true, timeout: 4000 }).catch(e => L('   click blocked: ' + String(e).slice(0, 70)));
    await page.waitForTimeout(1000);
    L('slots after 2nd click ' + await s());
    const t = await bodyText(page);
    L('screen econ line: ' + JSON.stringify((t.match(/Action Bonus Reaction Move/) || [])[0]));
    L('screen slot line: ' + JSON.stringify((t.match(/Level 1 \d+\/\d+ Level 2 \d+\/\d+/) || [])[0]));
    L('undo controls: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^Undo/.test(t)))));
  }
  L('errors ' + JSON.stringify(page.__all));
  await ctx.close();
}

/* ── B. drain 1st-level slots to zero from the turn screen ───────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); await settle(page);
  const s1 = async () => (await charBlob(page))?.val?.spellSlots?.['1']?.current;
  L('\n=== B. drain 1st-level slots ===');
  for (let i = 0; i < 6; i++) {
    const b = page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first();
    if (!(await b.count())) { L('round ' + i + ': no 1st-level Action control left. slot1=' + await s1()); break; }
    const lab = (await b.textContent()).replace(/\s+/g, ' ').slice(0, 18);
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    // end turn to refresh the action economy
    await page.getByRole('button', { name: /^End turn$/ }).first().click().catch(() => {});
    await page.waitForTimeout(900);
    L('round ' + i + ': cast ' + JSON.stringify(lab) + ' -> slot1=' + await s1());
  }
  const t = await bodyText(page);
  L('final slot line: ' + JSON.stringify((t.match(/Level 1 [^L]*Level 2 \d+\/\d+/) || [])[0]));
  L('1st-level controls still offered: ' + await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).count());
  L('errors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
  await ctx.close();
}

/* ── C. lay on hands overspend + HP floor, classic screen ────────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await settle(page);
  const loh = async () => (await charBlob(page))?.val?.paladinResources?.layOnHands?.current;
  const hp = async () => (await charBlob(page))?.val?.hitPoints;
  L('\n=== C. overspend / HP floor ===');
  for (let i = 0; i < 8; i++) { await page.getByRole('button', { name: /^Heal 5$/ }).first().click().catch(() => {}); await page.waitForTimeout(420); }
  L('after 8x Heal 5 (40 from a 35 pool): loh=' + await loh());
  const t = await bodyText(page);
  L('screen: ' + JSON.stringify((t.match(/LAY ON HANDS \d+\/\d+/) || [])[0]));
  L('Heal 5 disabled? ' + JSON.stringify(await page.getByRole('button', { name: /^Heal 5$/ }).first().evaluate(e => ({ disabled: e.disabled, aria: e.getAttribute('aria-disabled') }))));
  L('hp ' + JSON.stringify(await hp()));
  L('errors ' + JSON.stringify(page.__all));
  await ctx.close();
}

/* ── D. reload persistence ───────────────────────────────────────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await settle(page);
  await page.getByRole('button', { name: /^Heal 10$/ }).first().click();
  await page.waitForTimeout(900);
  const t1 = ((await bodyText(page)).match(/LAY ON HANDS \d+\/\d+/) || [])[0];
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const t2 = ((await bodyText(page)).match(/LAY ON HANDS \d+\/\d+/) || [])[0];
  L('\n=== D. reload ===\nbefore ' + t1 + ' | after reload ' + t2);
  await ctx.close();
}

await env.browser.close(); await env.srv.close();
