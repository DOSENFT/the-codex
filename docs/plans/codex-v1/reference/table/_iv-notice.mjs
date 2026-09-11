/* IV — (3) THE NOTICE. Raise it with one tab (open Settings, then spend), then
   try to use the controls it sits on top of. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge, settle } from './rig.mjs';
import { realCopy } from './families.mjs';
const FULL = realCopy('full');
const b = await chromium.launch();
const say = (k, v) => console.log('    ' + String(k).padEnd(32) + v);
const srv = await serveDist(DIST, 4320);
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p = await ctx.newPage(); watch(p);
await p.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(p, FULL);
await p.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
await p.waitForTimeout(1600);
const x = p.getByRole('button', { name: /^(Close settings|×|Close)$/i }).first();
if (await x.count()) await x.click().catch(() => {}); else await p.keyboard.press('Escape').catch(() => {});
await p.waitForTimeout(900);
await p.getByRole('tab', { name: 'Combat', exact: true }).first().click().catch(() => {});
await p.waitForTimeout(800);
await p.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
await p.waitForTimeout(1400);
await settle(p);

say('notice up?', (await p.evaluate(() => !!document.querySelector('[role="alert"]'))) ? 'yes' : 'NO');
say('full notice text', JSON.stringify(await p.evaluate(() => {
  const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
})));
say('notice geometry', JSON.stringify(await p.evaluate(() => {
  const r = document.querySelector('[role="alert"]').getBoundingClientRect();
  return { top: Math.round(r.top), h: Math.round(r.height), vh: innerHeight, pctOfScreen: Math.round(r.height / innerHeight * 100) };
})));

/* can the covered controls still be used? */
for (const name of ['Grimoire', 'Roleplay']) {
  const before = await p.evaluate(() => document.body.innerText.slice(0, 120));
  const err = await p.getByRole('tab', { name, exact: true }).first()
    .click({ timeout: 4000 }).then(() => null).catch(e => e.message.split('\n')[0]);
  await p.waitForTimeout(900);
  const after = await p.evaluate(() => document.body.innerText.slice(0, 120));
  say(`click the ${name} tab`, err ? 'BLOCKED — ' + err.slice(0, 90) : (before === after ? 'clicked but screen did not change' : 'worked'));
}
const veil = await p.getByRole('button', { name: /Veil this scene/i }).first()
  .click({ timeout: 4000 }).then(() => null).catch(e => e.message.split('\n')[0]);
say('click the Veil control', veil ? 'BLOCKED — ' + veil.slice(0, 90) : 'worked');

/* dismiss, then check it stays dismissed across navigation */
await p.getByRole('button', { name: /^I understand$/i }).first().click().catch(() => {});
await p.waitForTimeout(500);
say('after dismiss', (await p.evaluate(() => !!document.querySelector('[role="alert"]'))) ? 'STILL THERE' : 'gone');
await p.getByRole('tab', { name: 'Grimoire', exact: true }).first().click().catch(() => {});
await p.waitForTimeout(900);
say('after switching tab', (await p.evaluate(() => !!document.querySelector('[role="alert"]'))) ? 'CAME BACK' : 'still gone');
await p.getByRole('tab', { name: 'Combat', exact: true }).first().click().catch(() => {});
await p.waitForTimeout(900);
await p.getByRole('button', { name: /^Heal 5$/i }).first().click().catch(() => {});
await p.waitForTimeout(1200);
say('spend after dismiss → disk', await p.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  return JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current;
}));
say('faults', (await judge(p)).faults.join(' | ') || 'none');
await ctx.close(); await srv.close(); await b.close();
console.log('');
