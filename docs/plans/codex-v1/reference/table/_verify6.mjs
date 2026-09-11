// VERIFIER probe 6 — pure-pixel confirmation of the worst V-2 readings.
// No computed style used for either side: ink and background both come from
// the painted PNG. Saves crops so a human can look at them.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile } from './rig.mjs';
import { writeFileSync } from 'node:fs';
const PORT = 5416;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const OUT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/plans/codex-v1/reference/table';

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(()=>localStorage.setItem('codex-sw-off','1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil:'networkidle' });
await importFile(page, FULL);
const scratch = await ctx.newPage(); await scratch.goto('data:text/html,<canvas id=c></canvas>');

const srgb = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
const lum = ([r,g,bb]) => 0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(bb);
const ratio = (a,z) => { const [x,y]=[lum(a),lum(z)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

async function inkVsBg(clip) {
  const buf = await page.screenshot({ clip });
  const r = await scratch.evaluate(async b64 => {
    const bin = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin],{type:'image/png'}));
    const cv = document.getElementById('c'); cv.width=bmp.width; cv.height=bmp.height;
    const g = cv.getContext('2d'); g.drawImage(bmp,0,0);
    const d = g.getImageData(0,0,cv.width,cv.height).data;
    const h = new Map();
    for (let i=0;i<d.length;i+=4){ const k=`${d[i]},${d[i+1]},${d[i+2]}`; h.set(k,(h.get(k)||0)+1); }
    const s = [...h.entries()].sort((a,b)=>b[1]-a[1]);
    return { total: d.length/4, top: s.slice(0,40).map(([k,c])=>({rgb:k.split(',').map(Number), c})) };
  }, buf.toString('base64'));
  return { r, buf };
}

const TARGETS = [
  ['play/Combat','Paralyzed'], ['play/Combat','Damage'], ['play/Combat','No active conditions'],
  ['play/Combat','Charmed'], ['play/Combat','35'], ['prep/Character','67'],
  ['prep/Persona','abandonment'], ['prep/Academy','due'],
];
console.log('=== PURE-PIXEL ink-vs-background. Both sides read off the PNG. ===\n');
for (const [sid, needle] of TARGETS) {
  const s = SCREENS.find(x=>x.id===sid);
  await goScreen(page, s); await settle(page);
  // find it anywhere in the document, scroll it into view, re-measure
  const found = await page.evaluate(n => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node=w.nextNode(); node; node=w.nextNode()) {
      if (node.nodeValue.trim() !== n) continue;
      const el = node.parentElement; if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display==='none'||cs.visibility==='hidden') continue;
      el.scrollIntoView({block:'center'});
      return true;
    }
    return false;
  }, needle);
  if (!found) { console.log(`  ${sid} «${needle}» — not found`); continue; }
  await page.waitForTimeout(500); await settle(page);
  const geo = await page.evaluate(n => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node=w.nextNode(); node; node=w.nextNode()) {
      if (node.nodeValue.trim() !== n) continue;
      const el = node.parentElement; const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.top<0||r.bottom>innerHeight) continue;
      // effective opacity: multiply every ancestor's
      let op = 1; for (let x=el; x && x!==document.documentElement; x=x.parentElement) op *= parseFloat(getComputedStyle(x).opacity)||1;
      return { x:r.left, y:r.top, w:r.width, h:r.height, color:cs.color, size:parseFloat(cs.fontSize),
               ownOpacity: cs.opacity, effOpacity: Math.round(op*1000)/1000, cls:String(el.className).slice(0,60) };
    }
    return null;
  }, needle);
  if (!geo) { console.log(`  ${sid} «${needle}» — could not bring into viewport`); continue; }
  const { r, buf } = await inkVsBg({ x:geo.x, y:geo.y, width:Math.max(2,geo.w), height:Math.max(2,geo.h) });
  const bg = r.top[0].rgb;
  const bgL = lum(bg);
  // the ink is the pixel family furthest in luminance from the background that
  // still occupies a plausible share of the glyph area
  const ink = r.top.slice(1).filter(p => p.c/r.total > 0.005)
                 .sort((a,z)=>Math.abs(lum(z.rgb)-bgL)-Math.abs(lum(a.rgb)-bgL))[0];
  const file = `${OUT}/_verify-crop-${sid.replace('/','-')}-${needle.replace(/\W/g,'_').slice(0,16)}.png`;
  writeFileSync(file, buf);
  console.log(`  ${sid.padEnd(15)} «${needle}»  ${geo.size}px  css-colour=${geo.color}  own-opacity=${geo.ownOpacity} effective-opacity=${geo.effOpacity}`);
  console.log(`      painted bg  rgb(${bg})  ${(100*r.top[0].c/r.total).toFixed(0)}% of box`);
  console.log(`      painted ink rgb(${ink?ink.rgb:'—'})  ${ink?(100*ink.c/r.total).toFixed(1):0}% of box`);
  console.log(`      >>> PURE-PIXEL CONTRAST = ${ink ? ratio(ink.rgb, bg).toFixed(2) : 'n/a'}:1`);
  console.log(`      crop: ${file.split('/').pop()}\n`);
}
await b.close(); await srv.close();
