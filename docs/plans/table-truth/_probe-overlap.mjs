// Occlusion probe — kept, not throwaway.
//
// Written during slice 2 to answer "what is painted over the vitals flag text?"
// The answer turned out to be a PRE-EXISTING app-wide overlay (the fixed
// "Open dice roller" FAB, 56x56 at right-4, anchored above the TurnDeck), not
// anything this phase added. Keeping the probe because that class of bug —
// a fixed element silently eating words behind it — is invisible to both the
// test suite and a screenshot glance, and every later slice adds content to
// the same scroll surface.
//
//   node docs/plans/table-truth/_probe-overlap.mjs http://localhost:PORT/the-codex/
//
// Reports: the element chain at a probe point, every painted fixed/sticky
// element with its rect, and the Combat Helper's top-level children in order.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const searchPaths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const mod = await import(pathToFileURL(req.resolve('playwright', { paths: searchPaths })).href);
const chromium = mod.chromium ?? mod.default?.chromium;

const BASE = process.argv[2];
const NIX = await loadNix();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
await ctx.addInitScript(([id, seed]) => {
  localStorage.setItem('codex-character-' + id, seed);
  localStorage.setItem('codex-active-id', id);
  localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth', level: 7, updatedAt: '2026-08-16T00:00:00.000Z' }]));
}, ['probe', JSON.stringify(NIX)]);
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const out = {};
  // What is painted at the point where the dice button appeared (≈ 268, 355)?
  const hit = document.elementFromPoint(268, 355);
  const chain = [];
  for (let el = hit; el && chain.length < 6; el = el.parentElement) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 90),
      aria: el.getAttribute('aria-label'),
      position: cs.position, zIndex: cs.zIndex,
      rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(el.getBoundingClientRect()),
    });
  }
  out.atPoint = chain;

  // Every fixed/sticky element that is actually painted, with its rect.
  out.floating = [...document.querySelectorAll('*')]
    .map((el) => ({ el, cs: getComputedStyle(el) }))
    .filter(({ cs }) => (cs.position === 'fixed' || cs.position === 'sticky') &&
                        cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0')
    .map(({ el, cs }) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), position: cs.position, z: cs.zIndex,
               aria: el.getAttribute('aria-label'),
               cls: (el.className || '').toString().slice(0, 70),
               rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
               text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) };
    })
    .filter((f) => f.rect.w > 0 && f.rect.h > 0 && f.rect.w < 200 && f.rect.h < 200);

  // Where is the HP card?
  const hp = [...document.querySelectorAll('*')].find((e) => /HIT POINTS/i.test(e.textContent || '') && e.children.length < 6);
  out.hpCard = hp
    ? { tag: hp.tagName.toLowerCase(), cls: (hp.className || '').toString().slice(0, 90),
        rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(hp.getBoundingClientRect()) }
    : null;

  // Top-level children of the Combat Helper section, in order, with heights.
  const section = document.querySelector('section[aria-label="Combat Helper"]');
  out.children = section ? [...section.children].map((c) => {
    const r = c.getBoundingClientRect();
    return { cls: (c.className || '').toString().slice(0, 60), y: Math.round(r.y), h: Math.round(r.height),
             text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 45) };
  }) : null;
  return out;
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
