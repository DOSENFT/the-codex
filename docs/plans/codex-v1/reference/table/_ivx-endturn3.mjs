import { up, newPage, importFile, realCopy, settle, bodyText, rejections } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;
const { ctx, page } = await newPage(env);
await importFile(page, file);

const keys = () => page.evaluate(() => Object.keys(localStorage).sort());
const combatKeys = () => page.evaluate(() => Object.fromEntries(
  Object.keys(localStorage).filter(k => /combat|turn|round/i.test(k)).map(k => [k, localStorage.getItem(k).slice(0, 220)])));

L('keys after import: ' + JSON.stringify(await keys()));
L('combat-ish: ' + JSON.stringify(await combatKeys(), null, 1));

await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); await settle(page);
await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first().click();
await page.waitForTimeout(900);
L('\nkeys after 1 cast: ' + JSON.stringify(await keys()));
L('combat-ish: ' + JSON.stringify(await combatKeys(), null, 1));

await page.getByRole('button', { name: /^End turn$/ }).first().click();
await page.waitForTimeout(1500); await settle(page);
const t = await bodyText(page);
L('\n=== SCREEN AFTER "End turn" ===\n' + t);
L('\nvisible buttons: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map(b => ({ n: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 34), dis: b.disabled })))));
L('\ncombat-ish after end turn: ' + JSON.stringify(await combatKeys(), null, 1));

// does the CLASSIC screen still work after the turn screen wrote?
await page.goto(env.srv.url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const c = await bodyText(page);
L('\n=== classic screen after the turn screen ran ===');
L('SPELL SLOTS: ' + JSON.stringify((c.match(/SPELL SLOTS[^]{0,40}/) || [])[0]));
L('ACTION ECONOMY: ' + JSON.stringify((c.match(/ACTION ECONOMY[^]{0,50}/) || [])[0]));
L('CONCENTRATION: ' + JSON.stringify((c.match(/CONCENTRATION[^]{0,60}/) || [])[0]));
L('body len ' + c.length + ' | boundary text: ' + JSON.stringify((c.match(/something went wrong|still running|Try again/i) || [])[0] || null));
L('errors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
