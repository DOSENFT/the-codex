import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob, spy } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');

const pool = p => p.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
  return k ? JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current : null;
});
const shownLoH = async p => ((await bodyText(p)).match(/LAY ON HANDS \d+\/\d+/) || [])[0];
const heal5 = p => p.getByRole('button', { name: /^Heal 5$/i }).first();

const { ctx, page: A } = await newPage(env);
await importFile(A, file);
await settle(A);

const B = await ctx.newPage(); spy(B);
await B.goto(env.srv.url, { waitUntil: 'networkidle' });
await B.waitForTimeout(1400);

const start = await pool(A);
console.log('start pool                 =', start, '| A screen', await shownLoH(A), '| B screen', await shownLoH(B));

await A.bringToFront();
for (let i = 0; i < 2; i++) { await heal5(A).click(); await A.waitForTimeout(700); }
const afterA = await pool(A);
console.log('A spends 5 twice -> pool   =', afterA, '(expect', start - 10, ') | A screen', await shownLoH(A));
console.log('B (stale) still shows      =', await shownLoH(B));

await B.bringToFront();
await heal5(B).click();
await B.waitForTimeout(1200);
const afterB = await pool(B);
console.log('stale B spends 5 -> pool   =', afterB,
  '  [clobber=' + (start - 5) + ' | refuse=' + (afterA) + ' | honest-apply=' + (afterA - 5) + ']');
console.log('B screen now               =', await shownLoH(B));

const alert = await B.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
console.log('B [role=alert]             =', JSON.stringify(alert));
const bText = await bodyText(B);
console.log('B mentions "another window":', /another window/i.test(bText));

// dismiss and use again
const und = B.getByRole('button', { name: /^I understand$/i });
console.log('"I understand" present     =', await und.count());
await und.first().click().catch(() => {});
await B.waitForTimeout(600);
await heal5(B).click().catch(() => {});
await B.waitForTimeout(1000);
const afterB2 = await pool(B);
console.log('B spends again -> pool     =', afterB2, '(expect', afterA - 5, ')');
console.log('B screen                   =', await shownLoH(B));
console.log('A screen (unrefreshed)     =', await shownLoH(A));

// does A ever learn?
await A.bringToFront();
await A.waitForTimeout(1200);
console.log('A screen after focus       =', await shownLoH(A), '| A alert:',
  JSON.stringify(await A.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : ''; })));
await heal5(A).click().catch(() => {});
await A.waitForTimeout(1000);
console.log('A spends after B -> pool   =', await pool(A), '| A screen', await shownLoH(A));

console.log('\nA errors', JSON.stringify(A.__all));
console.log('B errors', JSON.stringify(B.__all));
console.log('A rej', JSON.stringify(await rejections(A)), '| B rej', JSON.stringify(await rejections(B)));
await ctx.close(); await env.browser.close(); await env.srv.close();
