import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const target = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/docs/owner-plan/index.html';
const out = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/.codex-owner/notes/_probe/out-b';
mkdirSync(out, { recursive: true });

const FN = () => {
  const parse = (s) => { const m = (s||'').match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1 }; };
  const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const lum=(c)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
  const hex=c=>'#'+[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const backdrop=(el)=>{let L=[],n=el;while(n){const cs=getComputedStyle(n);const bc=parse(cs.backgroundColor);
    if(bc&&bc.a>0){L.push(bc);if(bc.a===1)break;}n=n.parentElement;}
    let base={r:255,g:255,b:255,a:1};for(let i=L.length-1;i>=0;i--)base=over(L[i],base);return base;};
  const rows=[];const seen=new Set();
  for(const el of document.querySelectorAll('body *')){
    let t='';for(const n of el.childNodes) if(n.nodeType===3) t+=n.nodeValue;
    if(!t.trim())continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')continue;
    const bg=backdrop(el);let fg=parse(cs.color);if(!fg)continue;if(fg.a<1)fg=over(fg,bg);
    const px=parseFloat(cs.fontSize),w=parseInt(cs.fontWeight,10)||400;
    const large=px>=24||(px>=18.66&&w>=700);const need=large?3:4.5;
    const ra=ratio(fg,bg);
    const sel=el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/).join('.'):'');
    const key=hex(fg)+'|'+hex(bg)+'|'+px+'|'+w;
    if(seen.has(key))continue;seen.add(key);
    rows.push({sel,fg:hex(fg),bg:hex(bg),px,w,ratio:Math.round(ra*100)/100,need,pass:ra>=need,
      sample:t.trim().replace(/\s+/g,' ').slice(0,60)});
  }
  return rows.sort((a,b)=>a.ratio-b.ratio);
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:800}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto(pathToFileURL(target).href, { waitUntil:'load' });
await p.evaluate(()=>document.fonts.ready);
await p.waitForTimeout(400);

// ---- gradient-aware: sample actual painted pixels behind top-of-page text ----
const grad = await p.evaluate(() => {
  const out = [];
  for (const sel of ['.eyebrow','h1','.standfirst','.meta span','.meta .flag','nav.toc p','nav.toc a','section#s1 h2','.lede']) {
    const el = document.querySelector(sel); if (!el) continue;
    const r = el.getBoundingClientRect();
    out.push({ sel, top: Math.round(r.top), left: Math.round(r.left), h: Math.round(r.height),
               color: getComputedStyle(el).color, fontSize: getComputedStyle(el).fontSize, fontWeight: getComputedStyle(el).fontWeight });
  }
  return out;
});
// screenshot the top region and read actual backdrop pixels
const shot = await p.screenshot({ clip: { x:0, y:0, width:1280, height:800 } });
// decode the PNG inside the browser and read real painted backdrop pixels
const pixelBg = await p.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const at = (x, y) => { const d = g.getImageData(x, y, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
  const hexOf = (x,y)=>({at:`${x},${y}`, color: at(x,y)});
  return [hexOf(640,2), hexOf(640,40), hexOf(8,2), hexOf(8,150), hexOf(8,400), hexOf(8,799),
          hexOf(1270,2), hexOf(1270,400), hexOf(200,120), hexOf(200,300)];
}, shot.toString('base64'));

const printRows = await (async () => { await p.emulateMedia({ media:'print' }); await p.waitForTimeout(300);
  const r = await p.evaluate(FN); return r; })();
await p.emulateMedia({ media:'screen' });
const screenRows = await p.evaluate(FN);

// focus visibility check
const focus = await p.evaluate(async () => {
  const a = document.querySelector('main a[href^="http"]') || document.querySelector('a');
  a.focus();
  const cs = getComputedStyle(a);
  return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow };
});

// print page-count estimate via PDF
await p.pdf({ path: `${out}/print.pdf`, format: 'Letter', printBackground: true }).catch(e=>console.error('pdf:', e.message));

await b.close();
console.log('GRADIENT-REGION ELEMENTS:'); console.log(JSON.stringify(grad, null, 1));
console.log('SAMPLED BACKDROP PIXELS @1280:'); console.log(JSON.stringify(pixelBg));
console.log('PRINT CONTRAST ROWS:'); console.log(JSON.stringify(printRows, null, 1));
console.log('FOCUS RING:', JSON.stringify(focus));
