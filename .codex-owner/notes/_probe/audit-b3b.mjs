import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const target = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await p.goto(pathToFileURL(target).href);
await p.evaluate(() => document.fonts.ready);

const aria = await p.locator('body').ariaSnapshot();
console.log('ARIA HEADINGS + IMG NAMES:');
for (const line of aria.split(/\r?\n/)) {
  if (/- (heading|img|image)/.test(line)) console.log('  ' + line.trim());
}

const figs = await p.evaluate(() => Array.from(document.querySelectorAll('figure')).map(f => ({
  cls: f.className,
  imgs: Array.from(f.querySelectorAll('img')).map(i => ({
    src: i.getAttribute('src'), alt: i.getAttribute('alt'),
    linked: !!i.closest('a'), href: i.closest('a')?.getAttribute('href') || null,
  })),
  cap: (f.querySelector('figcaption')?.textContent || '').trim().replace(/\s+/g, ' '),
})));
console.log('FIGURES:');
console.log(JSON.stringify(figs, null, 1));

const extra = await p.evaluate(() => ({
  headings: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => h.tagName + ' :: ' + h.textContent.trim().replace(/\s+/g, ' ')),
  imgNoAlt: Array.from(document.images).filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src')),
  imgEmptyAlt: Array.from(document.images).filter(i => i.getAttribute('alt') === '').map(i => i.getAttribute('src')),
  styleBlocks: document.querySelectorAll('style').length,
  scripts: document.querySelectorAll('script').length,
  inlineStyleAttrs: document.querySelectorAll('[style]').length,
  fontFaceCount: (document.querySelector('style')?.textContent.match(/@font-face/g) || []).length,
  preloads: document.querySelectorAll('link[rel=preload]').length,
  mediaQueries: (document.querySelector('style')?.textContent.match(/@media[^{]+/g) || []).map(s => s.trim()),
  fontSizesDeclared: Array.from(new Set((document.querySelector('style')?.textContent.match(/font-size:\s*[^;}]+/g) || []).map(s => s.trim()))),
  scrollAffordanceText: /scroll|swipe|drag sideways/i.test(document.body.innerText),
}));
console.log('EXTRA:');
console.log(JSON.stringify(extra, null, 1));

await b.close();
