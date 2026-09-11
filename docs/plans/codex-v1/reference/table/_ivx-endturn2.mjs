import { up, newPage, importFile, realCopy, settle, bodyText, rejections } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;
const { ctx, page } = await newPage(env);
await importFile(page, file);

const combat = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-combat-'));
  return k ? JSON.parse(localStorage.getItem(k)) : null;
});
L('combat store after import: ' + JSON.stringify(await combat()));

await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); await settle(page);
L('combat store on turn screen: ' + JSON.stringify(await combat()));

const et = () => page.getByRole('button', { name: /^End turn$/ }).first();
const round = async () => ((await bodyText(page)).match(/Round \d+/) || [])[0];
const state = async () => {
  const b = await et().evaluate(e => ({ dis: e.disabled, box: e.getBoundingClientRect().toJSON(), txt: e.textContent }));
  return `dis=${b.dis} y=${Math.round(b.box.y)} h=${Math.round(b.box.height)}`;
};

await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first().click();
await page.waitForTimeout(900);
L('\nafter cast: ' + await round() + ' | combat=' + JSON.stringify(await combat()));

for (let i = 1; i <= 4; i++) {
  L(`\nEnd turn press ${i}: button ${await state()}`);
  const r = await et().click({ timeout: 5000 }).then(() => 'ok').catch(e => 'ERR ' + String(e).split('\n')[0].slice(0, 90));
  await page.waitForTimeout(1300); await settle(page);
  L(`  click=${r} -> ${await round()} | enabled Action controls=` +
    await page.locator('button:not([disabled])').filter({ hasText: /Action · / }).count() +
    ' | combat=' + JSON.stringify(await combat()));
}

// ── the classic screen's own economy, for comparison
await page.goto(env.srv.url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
const t = await bodyText(page);
L('\nclassic ACTION ECONOMY line: ' + JSON.stringify((t.match(/ACTION ECONOMY[^]{0,60}/) || [])[0]));
const pips = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => /^(Action|Bonus|Reaction|Move)$/.test(b.textContent.trim()))
  .map(b => ({ n: b.textContent.trim(), pressed: b.getAttribute('aria-pressed'), cls: String(b.className).slice(0, 50) })));
L('classic economy pips: ' + JSON.stringify(pips));
L('\nerrors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
