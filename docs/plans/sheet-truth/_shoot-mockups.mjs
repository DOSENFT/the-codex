// Render the Gate 1 mockups to PNG so they can be looked at on a phone.
//   node docs/plans/sheet-truth/_shoot-mockups.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const dir = path.resolve('docs/plans/sheet-truth/mockups');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 })).newPage();
for (const f of readdirSync(dir).filter(f => f.endsWith('.html'))) {
  await page.goto(pathToFileURL(path.join(dir, f)).href, { waitUntil: 'load' });
  const out = path.join(dir, f.replace(/\.html$/, '.png'));
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
}
await browser.close();
