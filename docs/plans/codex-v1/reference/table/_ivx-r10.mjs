import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const { ctx, page } = await newPage(env);

const loh = async () => (await charBlob(page))?.val?.paladinResources?.layOnHands?.current;

await importFile(page, file);
await settle(page);
console.log('LoH after import        =', await loh());

// is "Import" reachable WITHOUT opening Settings?
const importVisibleClosed = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Import');
  if (!b) return 'no such button';
  const r = b.getBoundingClientRect();
  const inDialog = !!b.closest('[role="dialog"],[aria-modal="true"]');
  // walk for a hidden ancestor
  let hidden = '';
  for (let n = b; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) { hidden = n.tagName + '.' + String(n.className).slice(0, 40); break; }
  }
  return { rect: [Math.round(r.width), Math.round(r.height)], inDialog, hiddenBy: hidden,
           ancestorIds: (() => { const a = []; for (let n = b; n && a.length < 12; n = n.parentElement) a.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/)[0] : '')); return a; })() };
});
console.log('"Import" while Settings CLOSED:', JSON.stringify(importVisibleClosed));

// spend 5 on play/Combat
await page.getByRole('button', { name: /^Heal 5$/ }).first().click();
await page.waitForTimeout(900);
await settle(page);
const spent = await loh();
console.log('LoH after Heal 5        =', spent);
const combatText = await bodyText(page);
console.log('screen shows LAY ON HANDS:', (combatText.match(/LAY ON HANDS \d+\/\d+/) || [])[0]);

// open Settings, capture BEFORE with settings ALREADY OPEN
await page.getByRole('button', { name: /open settings/i }).first().click();
await page.waitForTimeout(900);
await settle(page);
const before = await bodyText(page);
console.log('BEFORE word count =', before.split(/\s+/).length);

// re-import the SAME file through Settings > Import
await importFile(page, file, { via: /^Import$/ });
await page.waitForTimeout(1200);
await settle(page);
const after0 = await bodyText(page);
const lohAfter = await loh();
console.log('LoH after re-import     =', lohAfter);
console.log('AFTER word count =', after0.split(/\s+/).length);

// added text = multiset(after) - multiset(before)
const bag = s => { const m = new Map(); for (const w of s.split(/\s+/).filter(Boolean)) m.set(w, (m.get(w) || 0) + 1); return m; };
const B = bag(before), A = bag(after0);
const added = [];
for (const [w, n] of A) { const d = n - (B.get(w) || 0); for (let i = 0; i < d; i++) added.push(w); }
const removed = [];
for (const [w, n] of B) { const d = n - (A.get(w) || 0); for (let i = 0; i < d; i++) removed.push(w); }
console.log('\nADDED WORDS (' + added.length + '):', JSON.stringify(added));
console.log('REMOVED WORDS (' + removed.length + '):', JSON.stringify(removed.slice(0, 80)));

// also: any transient toast within the first 3s?
console.log('\n--- polling for transient text for 4s ---');
const seen = new Set();
for (let i = 0; i < 20; i++) {
  const t = await bodyText(page);
  const a = bag(t), plus = [];
  for (const [w, n] of a) { const d = n - (B.get(w) || 0); for (let j = 0; j < d; j++) plus.push(w); }
  const k = plus.join(' ');
  if (k && !seen.has(k)) { seen.add(k); console.log('  t+' + (i * 200) + 'ms added:', JSON.stringify(plus)); }
  await page.waitForTimeout(200);
}

// did anything alert/notify?
console.log('\nERRORS', JSON.stringify(page.__all));
console.log('rejections', JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
