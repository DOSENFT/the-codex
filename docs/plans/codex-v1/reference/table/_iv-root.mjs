/* INDEPENDENT VERIFIER — root cause of the one-tab refusals, + the notice.
   Runs the SAME sequence against HEAD (e4a8035) and PREV (c2aa5bb). */
import { chromium, serveDist, DIST, PHONE, watch, importFile, judge, settle, audit } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-d4/dist';
const FULL = realCopy('full');
const b = await chromium.launch();

const dump = page => page.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
  const c = JSON.parse(localStorage.getItem(k));
  return { pool: c?.paladinResources?.layOnHands?.current, at: c?.updatedAt };
});
const heal5 = p => p.getByRole('button', { name: /^Heal 5$/i }).first();
const alertOf = p => p.evaluate(() => {
  const a = document.querySelector('[role="alert"]');
  return a ? a.innerText.replace(/\s+/g, ' ').trim() : '';
});
const screenPool = async p => {
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const m = t.match(/(\d+)\s*\/\s*35/); return m ? Number(m[1]) : null;
};
const say = (k, v) => console.log('    ' + String(k).padEnd(36) + v);

async function run(label, dir, port) {
  console.log(`\n═══ ${label} ═══  ${dir}`);
  const srv = await serveDist(dir, port);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage(); watch(p);
  await p.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(p, FULL);
  say('after import (disk)', JSON.stringify(await dump(p)));

  await p.getByRole('button', { name: /Open settings/i }).first().click().catch(() => {});
  await p.waitForTimeout(1600);
  say('after OPENING settings (disk)', JSON.stringify(await dump(p)));
  const closeBtn = p.getByRole('button', { name: /^(Close settings|×|Close)$/i }).first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => {}); else await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(900);
  await p.getByRole('tab', { name: 'Combat', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(800);

  await heal5(p).click().catch(e => say('heal click error', e.message.slice(0, 90)));
  await p.waitForTimeout(1200);
  const after = await dump(p);
  say('after ONE Heal 5 (disk)', JSON.stringify(after) + '   want pool 30');
  say('screen shows', await screenPool(p));
  const al = await alertOf(p);
  say('alert', JSON.stringify(al.slice(0, 200)));
  say('THIS IS A SINGLE TAB', 'no other window exists in this context');

  /* the notice: what does it cover? */
  if (al) {
    await settle(p);
    const a = await audit(p);
    const covered = a.touch.filter(t => t.occludedBy && /alert|Not saved|I understand/i.test(t.occludedBy + t.label));
    const box = await p.evaluate(() => {
      const e = document.querySelector('[role="alert"]');
      if (!e) return null; const r = e.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vh: window.innerHeight };
    });
    say('alert box', JSON.stringify(box));
    const under = await p.evaluate(() => {
      const e = document.querySelector('[role="alert"]');
      const r = e.getBoundingClientRect();
      const hits = [];
      for (const el of document.querySelectorAll('button,[role="tab"],input')) {
        const b2 = el.getBoundingClientRect();
        if (b2.width < 1 || b2.height < 1) continue;
        const cx = b2.left + b2.width / 2, cy = b2.top + b2.height / 2;
        if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
        if (cy < r.top || cy > r.bottom || cx < r.left || cx > r.right) continue;
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== el && !el.contains(top) && e.contains(top))
          hits.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40));
      }
      return hits;
    });
    say('controls the notice covers', under.length ? under.join(' | ') : 'none');

    // dismiss, does it stay gone?
    await p.getByRole('button', { name: /^I understand$/i }).first().click().catch(() => {});
    await p.waitForTimeout(600);
    say('alert after dismiss', JSON.stringify((await alertOf(p)).slice(0, 60)));
    await heal5(p).click().catch(() => {});
    await p.waitForTimeout(1200);
    say('spend again after dismiss (disk)', JSON.stringify(await dump(p)));
    say('alert after that spend', JSON.stringify((await alertOf(p)).slice(0, 60)));
  }
  say('faults', (await judge(p)).faults.join(' | ') || 'none');
  await ctx.close(); await srv.close();
}

await run('PREV c2aa5bb (no guard)', PREV, 4296);
await run('HEAD e4a8035 (refuse-and-reconcile)', DIST, 4297);

/* ── the roleplay Add Hook path, properly this time ── */
console.log('\n═══ Add a custom roleplay hook — HEAD, one tab ═══');
{
  const srv = await serveDist(DIST, 4298);
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage(); watch(p);
  await p.goto(srv.url, { waitUntil: 'networkidle' });
  await importFile(p, FULL);
  await p.getByRole('tab', { name: 'Roleplay', exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /^Add Hook$/i }).first().click().catch(() => {});
  await p.waitForTimeout(600);
  const box = p.locator('input[placeholder="Type your hook..."]').first();
  await box.fill('IV added this hook').catch(e => say('fill error', e.message.slice(0, 80)));
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: /^Add$/ }).first().click().catch(e => say('add click error', e.message.slice(0, 80)));
  await p.waitForTimeout(1400);
  const hooks = await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => x.startsWith('codex-character-'));
    return (JSON.parse(localStorage.getItem(k)).customHooks || []).map(h => h.text);
  });
  say('customHooks on disk', JSON.stringify(hooks));
  say('alert', JSON.stringify((await alertOf(p)).slice(0, 140)));
  say('faults', (await judge(p)).faults.join(' | ') || 'none');
  await ctx.close(); await srv.close();
}

await b.close();
console.log('');
