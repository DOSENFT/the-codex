// Render the Gate-1 mockups at the real device sizes and check them against the
// guardrails they claim to hold. Same resolution trick as shoot-baseline.mjs:
// playwright is a reference tool, not a trunk dependency.
// Usage: node docs/plans/codex-v1/reference/shoot-mockups.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('resolved playwright but found no chromium export');
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium');
  process.exit(1);
}

const ROOT = 'docs/plans/codex-v1/mockups';
const OUT = 'docs/plans/codex-v1/mockups/_shots';
mkdirSync(OUT, { recursive: true });

const PHONE = { name: 'phone', width: 390, height: 844, dsf: 3 };
const IPAD = { name: 'ipad-landscape', width: 1366, height: 1024, dsf: 2 };

const TARGETS = [];
for (const dir of ['a-instrument', 'b-spread', 'c-hand', 'd-merged']) {
  TARGETS.push({ dir, file: '01-turn.html', vp: PHONE });
  TARGETS.push({ dir, file: '02-turn-spread.html', vp: IPAD });
}

const browser = await chromium.launch();
const report = [];

for (const t of TARGETS) {
  const ctx = await browser.newContext({
    viewport: { width: t.vp.width, height: t.vp.height },
    deviceScaleFactor: t.vp.dsf,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const url = pathToFileURL(resolve(`${ROOT}/${t.dir}/${t.file}`)).href;
  await page.goto(url, { waitUntil: 'load' });
  // Webfonts are remote here; the real build self-hosts. Give them a moment.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const label = `${t.dir}--${t.file.replace('.html', '')}--${t.vp.name}`;
  await page.screenshot({ path: `${OUT}/${label}.png` });

  // The guardrail checks. These are the claims the mockups make about themselves.
  const audit = await page.evaluate((vpH) => {
    const out = {};
    out.scrollHeight = document.documentElement.scrollHeight;
    out.overflowsViewport = document.documentElement.scrollHeight > vpH + 2;
    out.horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;

    // Every element that can be pressed must clear 48x48 CSS px.
    const tappable = [...document.querySelectorAll(
      'button,[role="button"],a,.obj,.act,.card,.tap,[data-tap]'
    )];
    const small = [];
    for (const el of tappable) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;          // hidden / offscreen
      if (r.width < 48 || r.height < 48) {
        small.push({
          cls: el.className || el.tagName,
          text: (el.textContent || '').trim().slice(0, 28),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    }
    out.underMinTouch = small.slice(0, 12);
    out.underMinTouchCount = small.length;

    // Cinzel never below 20px; nothing below 12px anywhere; body floor 16px.
    const cinzelSmall = [];
    const tiny = [];
    for (const el of document.querySelectorAll('*')) {
      const txt = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!txt) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const fam = cs.fontFamily.toLowerCase();
      const sample = el.textContent.trim().slice(0, 24);
      if (fam.includes('cinzel') && size < 20) cinzelSmall.push({ sample, size });
      if (size < 12) tiny.push({ sample, size });
    }
    out.cinzelUnder20 = cinzelSmall.slice(0, 12);
    out.cinzelUnder20Count = cinzelSmall.length;
    out.under12px = tiny.slice(0, 12);
    out.under12pxCount = tiny.length;

    // Anti-pattern 4: no texture / noise / vignette images anywhere.
    const textured = [...document.querySelectorAll('*')].filter((el) => {
      const bi = getComputedStyle(el).backgroundImage;
      return bi.includes('url(') || bi.includes('repeating-');
    }).length;
    out.texturedElements = textured;

    return out;
  }, t.vp.height);

  // Gold coverage, measured off the rendered pixels rather than guessed from the DOM.
  // The guardrail ("gold under ~20% or figure/ground inverts") is a claim about what the
  // eye receives, so count what the eye receives: pixels, once each, alpha already flattened.
  // Playwright returns a Buffer (unlike Puppeteer, it has no `encoding` option).
  const png = (await page.screenshot()).toString('base64');
  const ink = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    // Gold and ember are DIFFERENT signals and must be counted separately.
    // Lumping them was a measurement bug: ember rubric (#c06030) is warm and
    // chromatic, so it scored as "gold" and inflated the figure by ~20 points.
    // The guardrail is about GOLD causing figure/ground inversion. Ember is the
    // deliberate loud thing and is governed by its own budget (keep it small).
    // Separated by hue: gold/amber sit near 45deg, ember near 20deg.
    let gold = 0, ember = 0, lit = 0;
    const total = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
      if (max > 70) lit++;                       // not background-black
      if (max <= 90 || max - min <= 30) continue;  // too dark or too grey to be ink
      if (!(r >= gr && gr >= b)) continue;          // not a warm hue at all
      const chroma = max - min;
      // where the green sits between blue and red decides gold vs ember
      const hue = (gr - b) / chroma;              // ~0.55-0.75 gold, ~0.2-0.4 ember
      if (hue >= 0.45) gold++; else ember++;
    }
    return {
      goldPctOfScreen: +(100 * gold / total).toFixed(1),
      goldPctOfLitPixels: +(100 * gold / Math.max(lit, 1)).toFixed(1),
      emberPctOfLitPixels: +(100 * ember / Math.max(lit, 1)).toFixed(1),
    };
  }, png);

  report.push({ mockup: label, errors: [...new Set(errors)].slice(0, 5), ...audit, ...ink });
  await ctx.close();
}

await browser.close();
const json = JSON.stringify(report, null, 2);
writeFileSync(`${OUT}/_audit.json`, json);

// Terminal summary — the full detail lives in _audit.json.
for (const r of report) {
  console.log(`\n${r.mockup}`);
  console.log(`  errors            ${r.errors.length ? r.errors.join(' | ') : 'none'}`);
  console.log(`  fits viewport     ${r.overflowsViewport ? `NO (${r.scrollHeight}px)` : 'yes'}`
    + `${r.horizontalOverflow ? '  H-OVERFLOW' : ''}`);
  console.log(`  touch < 48px      ${r.underMinTouchCount}`);
  console.log(`  Cinzel < 20px     ${r.cinzelUnder20Count}`);
  console.log(`  any text < 12px   ${r.under12pxCount}`);
  console.log(`  gold of lit ink   ${r.goldPctOfLitPixels}%   (ember ${r.emberPctOfLitPixels}%)`);
  console.log(`  textured elements ${r.texturedElements}`);
}
