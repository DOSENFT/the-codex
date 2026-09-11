import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const L = console.log;
const { ctx, page } = await newPage(env);
await importFile(page, file);
await settle(page);

const dump = async tag => {
  const d = await page.evaluate(() => {
    const g = p => { const k = Object.keys(localStorage).find(k => k.startsWith(p)); return k ? JSON.parse(localStorage.getItem(k)) : null; };
    const c = g('codex-character-'), cb = g('codex-combat-');
    return {
      roster: (JSON.parse(localStorage.getItem('codex-roster') || '[]') || []).length,
      charKeys: Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length,
      hp: c?.hitPoints, loh: c?.paladinResources?.layOnHands?.current,
      cd: c?.paladinResources?.channelDivinity?.current,
      conditions: c?.conditions, tempHP: c?.tempHP, slots: c?.spellSlots,
      combatRound: cb?.round, turnActions: cb?.turnActions, concentrating: cb?.concentrating,
      combatSlots: cb?.spellSlots,
    };
  });
  L('\n[' + tag + '] ' + JSON.stringify(d));
};

// build up real session state
await page.getByRole('button', { name: /^Heal 5$/ }).first().click(); await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Expend 1st level spell slot$/ }).first().click(); await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Expend Channel Divinity use$/ }).first().click(); await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Charmed/ }).first().click(); await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Bless$/ }).first().click().catch(() => {}); await page.waitForTimeout(600);
await dump('session state built');
L('screen: ' + JSON.stringify(((await bodyText(page)).match(/LAY ON HANDS[^]{0,20}/) || [])[0]));

await page.getByRole('button', { name: /open settings/i }).first().click();
await page.waitForTimeout(800);
await importFile(page, file, { via: /^Import$/ });
await page.waitForTimeout(1500);
await dump('after re-import of the SAME file');

const after = await bodyText(page);
L('\nnotice shown: ' + JSON.stringify((after.match(/Imported[^]{0,180}/) || [])[0] || null));
L('any word of discard? ' + /discard|lost|reset|revert|overwr|wiped|cleared|session/i.test((after.match(/Imported[^]{0,300}/) || [''])[0]));
L('\nerrors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
