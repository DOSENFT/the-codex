import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob, spy } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const line = s => console.log(s);

/* ── 1. R-10 verbatim added sentence ───────────────────────────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await settle(page);
  await page.getByRole('button', { name: /^Heal 5$/ }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /open settings/i }).first().click();
  await page.waitForTimeout(800);
  const before = await bodyText(page);
  await importFile(page, file, { via: /^Import$/ });
  await page.waitForTimeout(1400);
  const after = await bodyText(page);
  // longest contiguous run in `after` that is not in `before`
  const i = after.indexOf('Imported');
  line('\n=== R-10 verbatim added notice ===');
  line(JSON.stringify(after.slice(i, i + 220)));
  line('role=alert / status nodes:');
  line(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role="alert"],[role="status"],[aria-live]')]
    .map(n => n.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)))));
  line('contains any of discard/lost/reset/reverted/overwrote/session: ' +
    /discard|lost|reset|revert|overwrote|overwritten|session state|unsaved/i.test(after.slice(i, i + 400)));
  await ctx.close();
}

/* ── 2. D-4 reverse direction: is the FIRST tab protected too? ──────────── */
{
  const pool = p => p.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return k ? JSON.parse(localStorage.getItem(k)).paladinResources.layOnHands.current : null;
  });
  const shown = async p => ((await bodyText(p)).match(/LAY ON HANDS \d+\/\d+/) || [])[0];
  const { ctx, page: A } = await newPage(env);
  await importFile(A, file);
  await settle(A);
  const B = await ctx.newPage(); spy(B);
  await B.goto(env.srv.url, { waitUntil: 'networkidle' });
  await B.waitForTimeout(1400);

  line('\n=== D-4 reverse: B moves first, A is the stale one ===');
  line('start pool ' + await pool(A));
  await B.bringToFront();
  await B.getByRole('button', { name: /^Heal 10$/ }).first().click();   // 35 -> 25
  await B.waitForTimeout(900);
  line('B spends 10 -> pool ' + await pool(B) + ' | B screen ' + await shown(B));
  line('A (stale, never told) screen ' + await shown(A));
  await A.bringToFront();
  await A.waitForTimeout(1000);
  line('A screen after focus/visibilitychange ' + await shown(A) +
    ' | A alert ' + JSON.stringify(await A.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : ''; })));
  await A.getByRole('button', { name: /^Heal 5$/ }).first().click();
  await A.waitForTimeout(1200);
  const p = await pool(A);
  line('A spends 5 -> pool ' + p + '   [clobber(35-5)=30 | refuse=25 | honest(25-5)=20]');
  line('A screen ' + await shown(A) + ' | A alert ' +
    JSON.stringify(await A.evaluate(() => { const a = document.querySelector('[role="alert"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : ''; })));
  await ctx.close();
}

/* ── 3. ?d=1 spend ↔ main app agreement, and Undo ───────────────────────── */
{
  const { ctx, page } = await newPage(env);
  await importFile(page, file);
  await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await settle(page);
  const slot1 = async () => (await charBlob(page))?.val?.spellSlots?.['1']?.current;
  line('\n=== ?d=1 spend / undo / crossover ===');
  line('slot1 ' + await slot1());
  await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first().click();
  await page.waitForTimeout(900);
  line('after cast slot1 ' + await slot1() + ' | screen ' + ((await bodyText(page)).match(/Level 1 \d+\/\d+/) || [])[0]);
  const undo = page.getByRole('button', { name: /^Undo/ }).first();
  line('undo label ' + JSON.stringify(await undo.textContent()));
  await undo.click();
  await page.waitForTimeout(1000);
  line('after undo slot1 ' + await slot1() + ' | screen ' + ((await bodyText(page)).match(/Level 1 \d+\/\d+/) || [])[0]);
  // spend again then cross to the classic app
  await page.locator('button').filter({ hasText: /Action · 1st-level slot/ }).first().click();
  await page.waitForTimeout(900);
  const spent = await slot1();
  await page.goto(env.srv.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const t = await bodyText(page);
  line('classic app SPELL SLOTS line: ' + JSON.stringify((t.match(/SPELL SLOTS[^]{0,40}/) || [])[0]) + ' (ls slot1=' + spent + ')');
  // End turn
  await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const et = page.getByRole('button', { name: /^End turn$/ }).first();
  await et.click();
  await page.waitForTimeout(1200);
  const t2 = await bodyText(page);
  line('after End turn: round=' + JSON.stringify((t2.match(/Round \d+/) || [])[0]) +
       ' econ=' + JSON.stringify((t2.match(/Action Bonus Reaction Move/) || [])[0]) +
       ' slot1=' + await slot1());
  line('errors ' + JSON.stringify(page.__all) + ' rej ' + JSON.stringify(await rejections(page)));
  await ctx.close();
}

await env.browser.close(); await env.srv.close();
