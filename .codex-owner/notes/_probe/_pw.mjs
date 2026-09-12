import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
export const chromium = pw.chromium ?? pw.default?.chromium;

export const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
export const CAP = ROOT + '/docs/owner-plan/captures';
export const URL_BASE = 'http://localhost:5191/the-codex/';
mkdirSync(CAP, { recursive: true });

export async function newCtx(browser, wide = false) {
  const ctx = await browser.newContext(
    wide
      ? { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  );
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  return ctx;
}

export async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${CAP}/${name}.png` });
  console.log('  shot:', name + '.png');
}

export function wireLogs(page, tag = '') {
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console.error${tag}]`, m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log(`  [pageerror${tag}]`, String(e).slice(0, 300)));
}
