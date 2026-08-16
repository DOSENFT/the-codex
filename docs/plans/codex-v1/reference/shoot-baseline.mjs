// Capture V0.9 as it actually is. Reference material, not a test.
// Usage: node docs/plans/codex-v1/reference/shoot-baseline.mjs
// Playwright is deliberately NOT a dependency of the trunk — this is a reference-capture
// tool, not app code. Resolve it from wherever it already exists on the machine.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync } from 'node:fs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try {
      return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`);
    } catch {
      return [];
    }
  })(),
];
let chromium;
try {
  const entry = req.resolve('playwright', { paths: searchPaths });
  const mod = await import(pathToFileURL(entry).href);
  // playwright ships CJS — the named export lands on `default` through the ESM bridge.
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

import { seedEntries } from './seed-character.mjs';

const BASE = 'http://localhost:5173/the-codex/';
const OUT = 'docs/plans/codex-v1/reference/baseline';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, dsf: 3, mobile: true },
  { name: 'ipad-portrait', width: 1024, height: 1366, dsf: 2, mobile: true },
  { name: 'ipad-landscape', width: 1366, height: 1024, dsf: 2, mobile: true },
];

// Real tab vocabulary, from Layout.tsx:38-46 — six destinations across two modes.
const MODES = {
  session: ['Combat', 'Grimoire', 'Roleplay'],
  prep: ['Character', 'Grimoire', 'Persona', 'Academy'],
};

const browser = await chromium.launch();
const notes = [];

for (const vp of VIEWPORTS) {
  for (const [mode, tabs] of Object.entries(MODES)) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });

    // Seed before any app code runs, so the app boots into a live campaign.
    await ctx.addInitScript((entries) => {
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    }, seedEntries(mode));

    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);

    const shot = async (label) => {
      await page.screenshot({ path: `${OUT}/${vp.name}--${mode}--${label}.png` });
    };
    await shot('00-boot');

    const seen = [];
    for (const name of tabs) {
      const el = page
        .locator(`button:has-text("${name}"), [role="tab"]:has-text("${name}")`)
        .first();
      if (!(await el.count())) { seen.push(`${name}: NOT FOUND`); continue; }
      try {
        await el.click({ timeout: 4000 });
        await page.waitForTimeout(1100);
        await shot(name.toLowerCase());
        // Capture the full scroll height too — these are long, dense surfaces.
        const h = await page.evaluate(() => document.body.scrollHeight);
        if (h > vp.height * 1.25) {
          await page.screenshot({ path: `${OUT}/${vp.name}--${mode}--${name.toLowerCase()}-full.png`, fullPage: true });
        }
        seen.push(`${name}: ok (scrollHeight ${h})`);
      } catch (e) {
        seen.push(`${name}: FAILED ${String(e).slice(0, 80)}`);
      }
    }

    notes.push({ viewport: vp.name, mode, tabs: seen, errors: [...new Set(errors)].slice(0, 10) });
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(notes, null, 2));
