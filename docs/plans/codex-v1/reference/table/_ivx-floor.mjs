import { up, newPage, importFile, realCopy, settle, bodyText, rejections, goScreen, SCREENS } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const { ctx, page } = await newPage(env);

// count console messages of EVERY type, unfiltered, tagged with the screen we were on
let where = 'boot';
page.__log = [];
page.on('console', m => page.__log.push({ where, type: m.type(), text: m.text(), loc: m.location()?.url?.slice(-60) }));
page.on('pageerror', e => page.__log.push({ where, type: 'PAGEERROR', text: String(e).split('\n').slice(0, 3).join(' / ') }));
page.on('requestfailed', r => page.__log.push({ where, type: 'REQFAIL', text: r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '') }));
page.on('crash', () => page.__log.push({ where, type: 'CRASH', text: 'page crashed' }));

where = 'import';
await importFile(page, file);
await settle(page);

const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again|error boundary/i;
const rows = [];
for (const s of SCREENS) {
  where = s.id;
  await goScreen(page, s);
  await settle(page);
  await page.waitForTimeout(500);
  const t = await bodyText(page);
  rows.push({ id: s.id, len: t.length, boundary: BOUNDARY.test(t) ? (t.match(BOUNDARY) || [])[0] : '', head: t.slice(0, 110) });
  // scroll to the bottom to force any lazy subtree to mount
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await settle(page);
  const t2 = await bodyText(page);
  if (BOUNDARY.test(t2) && !rows.at(-1).boundary) rows.at(-1).boundary = 'AFTER SCROLL: ' + (t2.match(BOUNDARY) || [])[0];
  await page.evaluate(() => window.scrollTo(0, 0));
}
where = 'end';
await page.waitForTimeout(1500);

console.log('\n=== SCREEN STATE ===');
for (const r of rows) console.log(`${r.id.padEnd(16)} len=${String(r.len).padEnd(6)} boundary=${r.boundary || 'none'}`);

const rej = await rejections(page);
console.log('\n=== UNHANDLED REJECTIONS (' + rej.length + ') ===');
rej.forEach(r => console.log('  ' + r));

console.log('\n=== EVERY CONSOLE / PAGE EVENT, UNFILTERED (' + page.__log.length + ') ===');
const byType = {};
for (const l of page.__log) byType[l.type] = (byType[l.type] || 0) + 1;
console.log('counts:', JSON.stringify(byType));
for (const l of page.__log) {
  if (l.type === 'log' || l.type === 'debug') continue;
  console.log(`[${l.where}] ${l.type.toUpperCase()}: ${l.text.replace(/\s+/g, ' ').slice(0, 260)}`);
}
console.log('\n--- and the plain logs, for completeness ---');
for (const l of page.__log) if (l.type === 'log' || l.type === 'debug') console.log(`[${l.where}] ${l.type}: ${l.text.replace(/\s+/g, ' ').slice(0, 200)}`);

await ctx.close(); await env.browser.close(); await env.srv.close();
