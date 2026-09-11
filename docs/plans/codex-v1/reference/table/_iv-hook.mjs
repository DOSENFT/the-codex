/* IV — the EngageCard Add-Hook path: saveCharacter() direct, then setCharacter(). */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';
const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-d4/dist';
const FULL = realCopy('full');
const b = await chromium.launch();
const say = (k, v) => console.log('    ' + String(k).padEnd(30) + v);

async function run(label, dir, port) {
  console.log(`\n═══ ${label} ═══`);
  const srv = await serveDist(dir, port);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage(); watch(p);
  await p.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(p, FULL);
  await p.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  const btn = p.getByRole('button', { name: /^Add Hook$/ }).first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(400);
  const clicked = await p.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add Hook');
    if (!el) return 'no Add Hook button in DOM';
    el.click(); return 'dispatched .click() on the real element';
  });
  say('AddHook', clicked);
  await p.waitForTimeout(800);
  const n = await p.locator('input[placeholder="Type your hook..."]').count();
  say('hook input present', n);
  if (n) {
    await p.locator('input[placeholder="Type your hook..."]').first().fill('IV added this hook', { timeout: 8000, force: true }).catch(e => say('fill', e.message.split('\n')[0]));
    await p.waitForTimeout(300);
    say('Add click', await p.evaluate(() => {
      const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add' && !e.disabled);
      if (!el) return 'no enabled Add button';
      el.click(); return 'dispatched';
    }));
    await p.waitForTimeout(1500);
  }
  const hooks = await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
    return (JSON.parse(localStorage.getItem(k)).customHooks || []).map(h => h.text);
  });
  say('customHooks on disk', JSON.stringify(hooks));
  say('alert', JSON.stringify((await p.evaluate(() => {
    const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
  })).slice(0, 130)));
  say('faults', (await judge(p)).faults.join(' | ') || 'none');
  await ctx.close(); await srv.close();
}
await run('PREV c2aa5bb', PREV, 4301);
await run('HEAD e4a8035', DIST, 4302);
await b.close();
console.log('');
