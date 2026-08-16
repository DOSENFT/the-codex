// Print the vertical budget of a fixed-viewport mockup: what each top-level zone
// consumes, and whether the flexible zone has room for what it contains.
// Guessing at pixel budgets is how the mutex got silently clipped once already.
// Usage: node docs/plans/codex-v1/reference/measure-zones.mjs <file> [w] [h]
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); }
              catch { return []; } })()];
const mod = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = mod.chromium ?? mod.default?.chromium;

const [file, w = 390, h = 844] = process.argv.slice(2);
if (!file) { console.error('usage: measure-zones.mjs <file> [w] [h]'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve(file)).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const r = await page.evaluate((vpH) => {
  const zones = [];
  let fixed = 0, flexName = null, flexHas = 0;
  for (const el of document.body.children) {
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const grows = cs.flexGrow !== '0';
    zones.push({ zone: el.className || el.tagName, h: Math.round(box.height), grows });
    if (grows) { flexName = el.className; flexHas = box.height; } else fixed += box.height;
  }
  // What does the flexible zone actually need for its children?
  let flexNeeds = 0, clipped = [];
  const flex = [...document.body.children].find((e) => getComputedStyle(e).flexGrow !== '0');
  if (flex) {
    const pad = parseFloat(getComputedStyle(flex).paddingTop)
              + parseFloat(getComputedStyle(flex).paddingBottom);
    flexNeeds = pad;
    const bottom = flex.getBoundingClientRect().bottom;
    for (const kid of flex.children) {
      const kb = kid.getBoundingClientRect();
      const mb = parseFloat(getComputedStyle(kid).marginBottom) || 0;
      flexNeeds += kb.height + mb;
      if (kb.bottom > bottom + 1) {
        clipped.push({ el: kid.className || kid.tagName,
          text: (kid.textContent || '').trim().slice(0, 34).replace(/\s+/g, ' '),
          overBy: Math.round(kb.bottom - bottom) });
      }
    }
  }
  return { zones, fixed: Math.round(fixed), vpH, flexName, flexHas: Math.round(flexHas),
           flexNeeds: Math.round(flexNeeds), clipped };
}, +h);

console.log(`viewport ${w}x${h}\n`);
for (const z of r.zones) console.log(`  ${String(z.h).padStart(4)}px  ${z.grows ? 'FLEX ' : '     '}${z.zone}`);
console.log(`\n  fixed zones total   ${r.fixed}px`);
console.log(`  flexible zone .${r.flexName}`);
console.log(`    has   ${r.flexHas}px`);
console.log(`    needs ${r.flexNeeds}px   ${r.flexNeeds > r.flexHas
  ? `>>> SHORT BY ${r.flexNeeds - r.flexHas}px` : 'fits'}`);
if (r.clipped.length) {
  console.log('\n  CLIPPED (rendered but invisible):');
  for (const c of r.clipped) console.log(`    ${c.el} — "${c.text}" over by ${c.overBy}px`);
} else console.log('\n  nothing clipped');

await browser.close();
