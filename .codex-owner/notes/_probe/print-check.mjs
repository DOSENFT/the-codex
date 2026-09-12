import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const page = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(pathToFileURL(page).href, { waitUntil: 'load' });
await p.emulateMedia({ media: 'print' });
await p.waitForTimeout(400);

// Worst case on paper: Chrome's default is "background graphics: off", so every
// element is judged against plain white, not against whatever panel sits behind it.
const out = await p.evaluate(() => {
  const lum = c => {
    const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const ratio = (f, bg) => { const a = lum(f) + 0.05, c = lum(bg) + 0.05; return +(Math.max(a, c) / Math.min(a, c)).toFixed(2); };
  const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const pseudo = ['::before', '::marker'].map(q => getComputedStyle(el, q).content).some(c => c && c !== 'none' && c !== 'normal');
    if (!txt && !pseudo) continue;
    const cs = getComputedStyle(el);
    const size = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    const weight = +cs.fontWeight;
    const r = ratio(parse(cs.color), [255, 255, 255]);
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
    const key = `${cs.color}|${size}|${weight}`;
    const rec = seen.get(key) || { ratio: r, need, size, weight, color: cs.color, n: 0, sel: `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 44) };
    rec.n++; seen.set(key, rec);
  }
  const rows = [...seen.values()].sort((a, b) => a.ratio - b.ratio);
  return { total: rows.length, fail: rows.filter(r => r.ratio < r.need), worst: rows.slice(0, 6) };
});
console.log('print combos:', out.total, 'failing against white:', out.fail.length);
for (const r of out.fail) console.log('  FAIL', r.ratio, 'need', r.need, r.color, r.size + 'px/' + r.weight, r.sel, 'x' + r.n);
for (const r of out.worst) console.log('  worst', r.ratio, 'need', r.need, r.color, r.size + 'px/' + r.weight, r.sel, 'x' + r.n);
await b.close();
