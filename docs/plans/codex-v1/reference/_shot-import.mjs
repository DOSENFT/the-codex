import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const p = await ctx.newPage();
await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });

const chooser = p.waitForEvent('filechooser');
await p.getByRole('button', { name: /Import Character/i }).click();
await (await chooser).setFiles('C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json');
await p.waitForTimeout(1200);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/_gate.png' });

await p.getByRole('button', { name: /^Import anyway$/ }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: 'docs/plans/codex-v1/_shots-app/_nix-in.png' });
await b.close();
