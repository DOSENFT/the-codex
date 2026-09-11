// Independent verifier — shared helpers. Nothing here filters anything.
import { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS } from './rig.mjs';
import { realCopy } from './families.mjs';

export { chromium, serveDist, DIST, PHONE, importFile, settle, goScreen, SCREENS, realCopy };

let port = 5900;
export async function up({ sw = false, viewport = PHONE } = {}) {
  const srv = await serveDist(DIST, port++);
  const browser = await chromium.launch();
  return { srv, browser, viewport, sw };
}

/** My own listeners. NOTHING is filtered. */
export function spy(page) {
  page.__all = [];
  page.on('pageerror', e => page.__all.push({ kind: 'pageerror', text: String(e).split('\n')[0] }));
  page.on('console', m => {
    if (m.type() === 'error') page.__all.push({ kind: 'console.error', text: m.text() });
    if (m.type() === 'warning') page.__all.push({ kind: 'console.warn', text: m.text() });
  });
  page.on('requestfailed', r => page.__all.push({ kind: 'requestfailed', text: r.url().slice(0, 160) + ' :: ' + (r.failure()?.errorText || '') }));
  return page;
}

export async function newPage(env, { url, initScript } = {}) {
  const ctx = await env.browser.newContext({ viewport: env.viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    localStorage.setItem('codex-sw-off', '1');
    window.__rej = [];
    window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason)));
  });
  if (initScript) await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  spy(page);
  await page.goto(url || env.srv.url, { waitUntil: 'networkidle' });
  return { ctx, page };
}

export async function rejections(page) {
  return page.evaluate(() => (window.__rej || []).slice()).catch(() => []);
}

export const bodyText = page =>
  page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

export const ls = (page, pred) =>
  page.evaluate(p => {
    const out = {};
    for (const k of Object.keys(localStorage)) out[k] = localStorage.getItem(k);
    return out;
  });

export const charBlob = page =>
  page.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return k ? { key: k, val: JSON.parse(localStorage.getItem(k)) } : null;
  });
