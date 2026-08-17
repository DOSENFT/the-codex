// Slice 14 artefacts — the page itself, and the sheet that used to come out.
//
// The print half of this slice cannot be judged from a number. It is a piece of
// paper; Marcus has to look at it. So this produces three things:
//
//   nix-record.pdf          what actually comes out of the printer
//   print-record.png        the same page as an image, for reading in chat
//   print-before.png        what Ctrl+P produced BEFORE this slice — the dark
//                           character sheet, clipped to whichever tab was open
//
//   node docs/plans/codex-v1/reference/shots-d14.mjs
// (the preview server must already be running on 4173)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const BASE = 'http://localhost:4173/the-codex/';
const NIX = await loadNix();

const DIR = new URL('./_shots-d14/', import.meta.url).pathname.slice(1);
mkdirSync(DIR, { recursive: true });

const b = await chromium.launch();
const open = async (viewport = { width: 794, height: 1123 }) => {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-sw-off', '1');
  }, [NIX.id, JSON.stringify(NIX)]);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, p };
};

// ---- the real artefact -----------------------------------------------------
// 794x1123 is A4 at 96dpi, so the on-screen render and the PDF agree.
{
  const { ctx, p } = await open();
  await p.pdf({ path: DIR + 'nix-record.pdf', format: 'A4', printBackground: true });
  await p.emulateMedia({ media: 'print' });
  await p.locator('[data-testid="print-record"]').screenshot({ path: DIR + 'print-record.png' });
  const h = await p.locator('[data-testid="print-record"]').evaluate(el => el.getBoundingClientRect().height);
  console.log(`print-record.png — ${Math.round(h)}px tall at A4 width ≈ ${(h / 1123).toFixed(2)} pages`);
  await ctx.close();
}

// ---- what it replaces ------------------------------------------------------
// The character sheet, open on the Stats tab, printed. One tab of five, inside
// a 92dvh scroll container, in ink-black. This is the "before".
{
  const { ctx, p } = await open();
  await p.getByRole('button', { name: 'Open character sheet' }).click();
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    // Reveal the sheet to the printer the only way the old code allowed: undo
    // the stylesheet's "hide the shell" rule. Everything else about the shot —
    // the clipping, the tab, the colour — is what Ctrl+P really did.
    const s = document.createElement('style');
    s.textContent = '@media print { #root > *:not(.print-record) { display: block !important } .print-record { display: none !important } }';
    document.head.appendChild(s);
  });
  await p.emulateMedia({ media: 'print' });
  await p.screenshot({ path: DIR + 'print-before.png', fullPage: false });
  await ctx.close();
}

await b.close();
console.log('wrote ' + DIR);
