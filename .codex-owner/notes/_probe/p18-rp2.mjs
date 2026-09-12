import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(() => document.body.innerText);
const say = s => console.log('\n\n===== ' + s + ' =====');

async function settle(pre, ms = 200000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(1000);
    const now = await body();
    const err = now.match(/[^\n]*(could not reach|did not answer|unreachable|failed to fetch)[^\n]*/i);
    if (err) return { k: 'ERROR', ms: Date.now() - t0, s: err[0] };
    if (now.length > pre.length + 80) {
      let last = now;
      for (let i = 0; i < 120; i++) { await page.waitForTimeout(1500); const n = await body(); if (n === last) break; last = n; }
      const preL = pre.split('\n');
      return { k: 'ANSWER', ms: Date.now() - t0, s: last.split('\n').filter(l => !preL.includes(l)).join(' ').replace(/\s+/g, ' ') };
    }
  }
  return { k: 'TIMEOUT', ms: Date.now() - t0, s: '' };
}

await goTab(page, 'session', 'Roleplay');
await tap(page, 'Start the scene');
await page.waitForTimeout(800);
say('scene form inputs');
for (const i of await page.locator('input,textarea').all()) {
  const p = await i.getAttribute('placeholder'), a = await i.getAttribute('aria-label');
  if (p || a) console.log('  field:', JSON.stringify(p || a));
}
await page.getByPlaceholder(/Around the campfire/i).fill('A crowded riverside tavern, rain outside');
await page.getByPlaceholder(/still being polite/i).fill('Tense. Scar is watching the door.');
console.log('  filled both scene fields');
await shot(page, 'play-roleplay-scene-form-390');
await tap(page, "That’s the scene") || await tap(page, "That's the scene");
await page.waitForTimeout(1500);
await shot(page, 'play-roleplay-scene-live-390');
console.log('\n--- scene live ---\n' + await txt(page, 1200));

async function waitIdle(ms = 240000) {
  const t0 = Date.now();
  const b = page.getByRole('button', { name: /^Give me a beat$/ }).first();
  while (Date.now() - t0 < ms) {
    if (await b.isEnabled().catch(() => false)) return Date.now() - t0;
    await page.waitForTimeout(1000);
  }
  return -1;
}
console.log('opening beat generation took', await waitIdle(), 'ms');
await shot(page, 'play-roleplay-opening-beat-390');
console.log('\n--- opening beat ---\n' + await txt(page, 1600));

for (const label of ['Give me a beat', 'React', 'Raise the stakes', 'Land the moment', 'Pull someone in']) {
  await waitIdle();
  const pre = await body();
  if (!(await tap(page, '^' + label))) { console.log('SKIP:', label); continue; }
  const r = await settle(pre);
  console.log(`\n[${label}] ${r.k} in ${r.ms}ms len=${r.s.length} :: ${JSON.stringify(r.s.slice(0, 380))}`);
  await shot(page, 'play-roleplay-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

say('AskBar / what would I say');
for (const i of await page.locator('input,textarea').all()) {
  const p = await i.getAttribute('placeholder');
  if (p) console.log('  field now:', JSON.stringify(p));
}

say('Session Timeline / End Session');
await btns(page, 'rp-final');
await shot(page, 'play-roleplay-timeline-390');
console.log(await txt(page, 1400));

await ctx.close();
await browser.close();
