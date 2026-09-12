import { readFileSync } from 'node:fs';
import { newCtx, wireLogs, URL_BASE, ROOT } from './_pw.mjs';

const SEED = JSON.parse(readFileSync(ROOT + '/.codex-owner/notes/_probe/ls-seed.json', 'utf8'));

/** Boot a page with Nix already in the roster (same bytes the UI import wrote). */
export async function boot(browser, { wide = false, extra = {} } = {}) {
  const ctx = await newCtx(browser, wide);
  await ctx.addInitScript(([seed, extra]) => {
    localStorage.setItem('codex-sw-off', '1');
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, [SEED, extra]);
  const page = await ctx.newPage();
  wireLogs(page);
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return { ctx, page };
}

export async function goTab(page, mode, tab) {
  await page.getByRole('button', { name: mode === 'prep' ? 'Switch to prep mode' : 'Switch to session mode' }).click();
  await page.waitForTimeout(350);
  await page.locator('nav[aria-label="Main navigation"] button').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first().click();
  await page.waitForTimeout(700);
}

export async function txt(page, n = 3000) {
  return (await page.locator('body').innerText()).replace(/\n{2,}/g, '\n').slice(0, n);
}

/** Buttons whose box is inside the visible page box (drawers park off-screen). */
export async function btns(page, label = 'buttons') {
  const vw = page.viewportSize();
  const out = [];
  for (const b of await page.locator('button').all()) {
    const box = await b.boundingBox().catch(() => null);
    if (!box) continue;
    if (box.x + box.width < 0 || box.x > vw.width) continue;
    if (box.y + box.height < -20) continue;
    const t = ((await b.innerText().catch(() => '')) || (await b.getAttribute('aria-label').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (t) out.push(t.slice(0, 80));
  }
  console.log(`--- ${label} (${out.length}) ---`);
  console.log(out.map(t => '  btn: ' + JSON.stringify(t)).join('\n'));
  return out;
}

/** Click a button by exact-ish name, only if it is on-screen. */
export async function tap(page, name, { exact = false } = {}) {
  const re = exact ? new RegExp(`^${name}$`) : new RegExp(name, 'i');
  const all = await page.getByRole('button', { name: re }).all();
  const vw = page.viewportSize();
  for (const b of all) {
    const box = await b.boundingBox().catch(() => null);
    if (!box) continue;
    if (box.x + box.width < 0 || box.x > vw.width) continue;
    if (!(await b.isEnabled().catch(() => true))) { console.log('  DISABLED:', name); return false; }
    await b.scrollIntoViewIfNeeded().catch(() => {});
    const ok = await b.click({ timeout: 8000 }).then(() => true).catch(e => { console.log('  CLICK FAILED:', name, String(e).slice(0, 120)); return false; });
    if (!ok) return false;
    await page.waitForTimeout(500);
    console.log('  tapped:', name);
    return true;
  }
  console.log('  NOT FOUND/offscreen:', name);
  return false;
}
