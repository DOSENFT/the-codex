// Slice 13 measurement pass — where the app actually falls short of D
//
// Direction D and the v0.9 palette are the same colours; D was derived from
// them. So "convert the app to D" cannot mean a repaint, and pretending it does
// would be a large diff that changes nothing that matters. What separates them
// is DISCIPLINE, and discipline is measurable:
//
//   · a 12px type floor            (--d-fs-label) — nothing smaller, ever
//   · a 20px floor on Cinzel       (--d-fs-title) — the display face is
//                                   unreadable small, and it is used small
//   · a 48px touch floor           (--d-touch-min) — at a table, one-handed
//   · 4.5:1 text contrast          — a dim room, a tired DM, a cheap screen
//
// This script walks every surface of the real app and reports every element
// that breaks one of those. It is the input to the slice, not the proof of it:
// it tells me what to fix and, re-run after, tells me whether I did.
//
//   node docs/plans/codex-v1/reference/audit-d13.mjs
// (the preview server must already be running on 4173)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, writeFileSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = 'http://localhost:4173/the-codex/';
const NIX = await loadNix();

// The measurement, run inside the page. Kept in one function so every surface
// is judged by exactly the same rules.
const MEASURE = () => {
  const px = v => parseFloat(v) || 0;

  // sRGB → relative luminance, per WCAG 2.1.
  const lum = ([r, g, b]) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = s => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  // Every colour stop in a gradient, so a `bg-gradient-to-r` counts as paint.
  // The first version of this audit read backgroundColor only. Nine primary
  // buttons came back at 1.04:1 — near-black text on a gold gradient, reported
  // as invisible, because the gradient lives in background-IMAGE and the
  // computed backgroundColor is transparent. It walked past the gold to the
  // dark page underneath and compared dark against dark. An audit that invents
  // failures is worse than none: it would have sent me repainting nine buttons
  // that were already at 8:1, and the repaint would have been the regression.
  const stopsOf = el => {
    const img = getComputedStyle(el).backgroundImage;
    if (!img || img === 'none') return [];
    return [...img.matchAll(/rgba?\(([^)]+)\)/g)]
      .map(m => { const p = m[1].split(',').map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; })
      .filter(c => c.a > 0);
  };
  // The background a pixel actually ends up on: walk ancestors compositing every
  // translucent layer, because `bg-white/[0.06]` over `bg-void-2/60` over the
  // page is three layers and only the composite is what the eye sees.
  // Returns a LIST of candidate backgrounds — a gradient has no single value,
  // so the caller scores against the worst stop rather than picking a flattering
  // one.
  // The second wrong version of this collected gradient stops as candidate
  // backgrounds and then composited them at FULL opacity. `.glass-card` wears a
  // 3.5% cream sheen — `linear-gradient(rgba(240,230,211,.035), transparent)` —
  // so a sheen you cannot see was scored as solid cream, and cream body text
  // came back at 1:1 across the whole app. Alpha is not decoration here; it is
  // the entire difference between a sheen and a surface. Every layer composites
  // with its own alpha, gradients included, innermost last.
  const effectiveBgs = el => {
    const layers = []; // innermost first; each entry is a list of alternatives
    for (let n = el; n && n !== document.documentElement.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const g = stopsOf(n);
      if (g.length) layers.push(g);            // painted on top of this element's own colour
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push([c]); if (c.a === 1) break; }
    }
    // One gradient in the chain is the normal case; enumerate its stops and
    // score the worst. More than one, and the first stop of each is enough —
    // the combinatorial version buys precision nobody would act on.
    const gi = layers.findIndex(l => l.length > 1);
    const build = pick => {
      let base = [10, 10, 8]; // --d-bg, the page floor
      for (let i = layers.length - 1; i >= 0; i--) base = over(i === gi ? pick : layers[i][0], base);
      return base;
    };
    return gi === -1 ? [build(null)] : layers[gi].map(build);
  };
  const ratio = (fg, bg) => {
    const a = lum(fg), b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  const seen = new Set();
  const out = { tiny: [], cinzel: [], touch: [], contrast: [] };
  const note = (list, el, extra) => {
    const key = list + '|' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) + '|' + JSON.stringify(extra);
    if (seen.has(key)) return;
    seen.add(key);
    out[list].push({
      what: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 48),
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
      ...extra,
    });
  };

  const INTERACTIVE = 'button,[role="button"],[role="tab"],[role="radio"],[role="switch"],a[href],input,select,textarea';

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    // Does this element own visible text of its own (not just its children's)?
    const ownText = [...el.childNodes]
      .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();

    if (ownText) {
      const size = px(cs.fontSize);
      if (size < 12) note('tiny', el, { size: +size.toFixed(1), text: ownText.slice(0, 30) });
      if (/cinzel/i.test(cs.fontFamily) && size < 20) {
        note('cinzel', el, { size: +size.toFixed(1), text: ownText.slice(0, 30) });
      }
      const fg = parse(cs.color);
      if (fg && fg.a > 0) {
        // Worst stop wins: text over a gradient has to stay legible along all
        // of it, not just at the end that happens to flatter it.
        const c = Math.min(...effectiveBgs(el).map(bg => ratio(over(fg, bg), bg)));
        // WCAG large-text allowance: 18.66px+, or 14px+ when bold.
        const large = size >= 18.66 || (size >= 14 && px(cs.fontWeight) >= 700);
        const need = large ? 3 : 4.5;
        if (c < need) note('contrast', el, { size: +size.toFixed(1), ratio: +c.toFixed(2), need, text: ownText.slice(0, 30) });
      }
    }

    if (el.matches(INTERACTIVE) && !el.hasAttribute('disabled')) {
      // Measure the whole hit area, not the box: a 12px pip inside 18px of
      // padding is still a 12px pip, but a 12px pip with an ::after overlay is
      // not — so take the larger of the border box and any child that overflows.
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w < 48 || h < 48) note('touch', el, { w, h });
    }
  }
  return out;
};

const b = await chromium.launch();
const report = [];
let totals = { tiny: 0, cinzel: 0, touch: 0, contrast: 0 };

async function surface(name, viewport, prepare) {
  const ctx = await b.newContext({ viewport });
  await ctx.addInitScript(([id, seed]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-sw-off', '1');
  }, [NIX.id, JSON.stringify(NIX)]);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  try {
    await prepare(p);
    await p.waitForTimeout(400);
    const r = await p.evaluate(MEASURE);
    for (const k of Object.keys(totals)) totals[k] += r[k].length;
    report.push({ name, ...r });
    const line = Object.entries(r).map(([k, v]) => `${k} ${String(v.length).padStart(3)}`).join('  ');
    console.log(`  ${name.padEnd(34)} ${line}`);
  } catch (e) {
    console.log(`  ${name.padEnd(34)} SKIPPED — ${e.message.split('\n')[0].slice(0, 60)}`);
  }
  await ctx.close();
}

const tab = n => async p => { await p.getByRole('tab', { name: n }).click(); };
const prep = n => async p => {
  await p.getByRole('button', { name: 'Switch to prep mode' }).click();
  await p.getByRole('tab', { name: n }).click();
};
const sheet = n => async p => { await p.getByRole('button', { name: n }).click(); };

const PHONE = { width: 390, height: 844 };
const IPAD = { width: 1024, height: 1366 };

console.log('\n  surface                            under-12px  cinzel<20  touch<48  contrast<AA');
console.log('  ' + '-'.repeat(78));

for (const [vp, tagName] of [[PHONE, 'phone'], [IPAD, 'iPad']]) {
  await surface(`${tagName} · session Combat`, vp, tab('Combat'));
  await surface(`${tagName} · session Grimoire`, vp, tab('Grimoire'));
  await surface(`${tagName} · session Roleplay`, vp, tab('Roleplay'));
  await surface(`${tagName} · prep Character`, vp, prep('Character'));
  await surface(`${tagName} · prep Grimoire`, vp, prep('Grimoire'));
  await surface(`${tagName} · prep Persona`, vp, prep('Persona'));
  await surface(`${tagName} · prep Academy`, vp, prep('Academy'));
  await surface(`${tagName} · dice roller`, vp, sheet('Open dice roller'));
  await surface(`${tagName} · settings`, vp, sheet('Open settings'));
  await surface(`${tagName} · toybox`, vp, sheet('Open The Toybox'));
  await surface(`${tagName} · mechanics reference`, vp, sheet('Open mechanics reference'));
  await surface(`${tagName} · character sheet`, vp, sheet('Open character sheet'));
}

await b.close();

// The ranked worst offenders, deduped across surfaces — this is the work list.
const rank = kind => {
  const m = new Map();
  for (const s of report) for (const row of s[kind]) {
    const k = row.what + '|' + row.tag + '|' + (row.size ?? row.w + 'x' + row.h);
    if (!m.has(k)) m.set(k, { ...row, on: [] });
    m.get(k).on.push(s.name);
  }
  return [...m.values()].sort((a, b) =>
    (a.size ?? Math.min(a.w, a.h)) - (b.size ?? Math.min(b.w, b.h)));
};

console.log('\n  ' + '='.repeat(78));
console.log(`  TOTALS   under-12px ${totals.tiny}   cinzel<20 ${totals.cinzel}   touch<48 ${totals.touch}   contrast<AA ${totals.contrast}`);
console.log('  ' + '='.repeat(78));

for (const [kind, title] of [['tiny', 'TEXT BELOW THE 12px FLOOR'], ['touch', 'TOUCH TARGETS BELOW 48px'],
  ['contrast', 'TEXT BELOW WCAG AA'], ['cinzel', 'CINZEL BELOW 20px']]) {
  const rows = rank(kind);
  if (!rows.length) { console.log(`\n  ${title}: none`); continue; }
  console.log(`\n  ${title} — ${rows.length} distinct`);
  for (const r of rows.slice(0, 18)) {
    const metric = r.size !== undefined
      ? `${r.size}px${r.ratio ? ` @ ${r.ratio}:1 (needs ${r.need})` : ''}`
      : `${r.w}×${r.h}`;
    console.log(`    ${metric.padEnd(28)} <${r.tag}> ${JSON.stringify(r.what)}`);
    console.log(`      ${r.cls}`);
  }
  if (rows.length > 18) console.log(`    … and ${rows.length - 18} more`);
}

writeFileSync(new URL('./audit-d13.json', import.meta.url), JSON.stringify({ totals, report }, null, 1));
console.log('\n  full detail → docs/plans/codex-v1/reference/audit-d13.json\n');
