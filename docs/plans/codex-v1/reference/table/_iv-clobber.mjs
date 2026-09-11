/* INDEPENDENT VERIFIER — the ORIGINAL bug, on the write paths that do not go
   through the hook. `saveCharacter(updated)` with no `readAt` is called
   directly by EngageCard (add/delete a custom roleplay hook) and by
   CampaignEditor (auto-create a campaign on mount). Those writes are
   unconditional by construction. Two tabs, and the stale one takes one of
   those actions. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-d4/dist';
const FULL = realCopy('full');
const b = await chromium.launch();
const say = (k, v) => console.log('    ' + String(k).padEnd(34) + v);
const pool = p => p.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  return JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current;
});
const alertOf = p => p.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const heal5 = p => p.getByRole('button', { name: /^Heal 5$/i }).first();

async function scenario(name, dir, port, staleAction) {
  console.log(`\n═══ ${name} ═══`);
  const srv = await serveDist(dir, port);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p1 = await ctx.newPage(); watch(p1);
  await p1.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(p1, FULL);
  const p2 = await ctx.newPage(); watch(p2);           // tab two reads 35
  await p2.goto(srv.url, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1400);
  say('start', await pool(p1));
  await p1.bringToFront();
  for (let i = 0; i < 2; i++) { await heal5(p1).click(); await p1.waitForTimeout(650); }
  say('after tab1 spends 5 twice', await pool(p1));
  await p2.bringToFront();
  await staleAction(p2);
  await p2.waitForTimeout(1600);
  const after = await pool(p2);
  say('after stale tab2 acts', after + '   [25 = tab1 held · 35 = tab1 CLOBBERED]');
  say('tab2 alert', JSON.stringify((await alertOf(p2)).slice(0, 60)));
  await p1.bringToFront(); await p1.waitForTimeout(400);
  say('tab1 faults', (await judge(p1)).faults.join(' | ') || 'none');
  say('tab2 faults', (await judge(p2)).faults.join(' | ') || 'none');
  await ctx.close(); await srv.close();
  return after;
}

const addHook = async p => {
  await p.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add Hook');
    if (el) el.click();
  });
  await p.waitForTimeout(700);
  await p.locator('input[placeholder="Type your hook..."]').first().fill('stale tab hook', { force: true }).catch(() => {});
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add' && !e.disabled);
    if (el) el.click();
  });
};

const openSettings = async p => {
  await p.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
  await p.waitForTimeout(1800);
};

await scenario('HEAD e4a8035 — stale tab adds a custom roleplay hook', DIST, 4310, addHook);
await scenario('HEAD e4a8035 — stale tab opens Settings (CampaignEditor)', DIST, 4311, openSettings);
await scenario('PREV c2aa5bb — stale tab adds a custom roleplay hook', PREV, 4312, addHook);

await b.close();
console.log('');
