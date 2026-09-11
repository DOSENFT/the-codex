import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const NIX = await loadNix();
const b = await (pw.chromium ?? pw.default?.chromium).launch();
const CHECK = () => {
  const out = { docOverflow: null, clipped: [] };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.docOverflow = { scroll: de.scrollWidth, client: de.clientWidth };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!own) continue;
    // Text cut off by its own box: ellipsis or hard clip, not a wrap.
    const clips = cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
    if (clips && el.scrollWidth > el.clientWidth + 1) {
      out.clipped.push({ text: own.slice(0, 34), w: el.clientWidth, need: el.scrollWidth,
                         cls: (typeof el.className === 'string' ? el.className : '').slice(0, 56) });
    }
  }
  return out;
};
const surfaces = [
  ['prep Character', p => p.getByRole('button',{name:'Switch to prep mode'}).click().then(()=>p.getByRole('tab',{name:'Character'}).click())],
  ['prep Grimoire', p => p.getByRole('button',{name:'Switch to prep mode'}).click().then(()=>p.getByRole('tab',{name:'Grimoire'}).click())],
  ['session Combat', p => p.getByRole('tab',{name:'Combat'}).click()],
  ['session Grimoire', p => p.getByRole('tab',{name:'Grimoire'}).click()],
  ['character sheet', p => p.getByRole('button',{name:'Open character sheet'}).click()],
  ['dice roller', p => p.getByRole('button',{name:'Open dice roller'}).click()],
];
let total = 0;
for (const [vn, viewport] of [['phone',{width:390,height:844}],['iPad',{width:1024,height:1366}]]) {
  for (const [name, prep] of surfaces) {
    const ctx = await b.newContext({ viewport });
    await ctx.addInitScript(([id,seed])=>{localStorage.setItem('codex-character-'+id,seed);localStorage.setItem('codex-active-id',id);localStorage.setItem('codex-sw-off','1');},[NIX.id,JSON.stringify(NIX)]);
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/the-codex/', { waitUntil:'networkidle' });
    await prep(p); await p.waitForTimeout(350);
    const r = await p.evaluate(CHECK);
    total += r.clipped.length + (r.docOverflow ? 1 : 0);
    if (r.docOverflow || r.clipped.length) {
      console.log(`  ${vn} · ${name}${r.docOverflow ? `  DOC OVERFLOWS ${r.docOverflow.scroll}>${r.docOverflow.client}` : ''}`);
      for (const c of r.clipped.slice(0,6)) console.log(`      clipped ${c.w}<${c.need}px  ${JSON.stringify(c.text)}  ${c.cls}`);
    } else console.log(`  ${vn} · ${name}  clean`);
    await ctx.close();
  }
}
console.log(`\n  ${total} overflow/clipping issues`);
await b.close();
