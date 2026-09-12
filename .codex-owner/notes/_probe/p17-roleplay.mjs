import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const say = s => console.log('\n\n===== ' + s + ' =====');
const body = () => page.evaluate(() => document.body.innerText);

async function waitGrow(pre, ms = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(1000);
    const now = await body();
    const err = now.match(/[^\n]*(could not reach|did not answer|unreachable|failed to fetch)[^\n]*/i);
    if (err) return { k: 'ERROR', ms: Date.now() - t0, s: err[0] };
    if (now.length > pre.length + 80) {
      // let stream settle
      let last = now;
      for (let i = 0; i < 90; i++) { await page.waitForTimeout(1500); const n2 = await body(); if (n2 === last) break; last = n2; }
      const preL = pre.split('\n');
      return { k: 'ANSWER', ms: Date.now() - t0, s: last.split('\n').filter(l => !preL.includes(l)).join(' ').replace(/\s+/g, ' ') };
    }
  }
  return { k: 'TIMEOUT', ms: Date.now() - t0, s: '' };
}

say('PLAY / Roleplay cockpit');
await goTab(page, 'session', 'Roleplay');
await shot(page, 'play-roleplay-cockpit-390');
console.log(await txt(page, 2200));
await btns(page, 'roleplay');

for (const b of ['Start the scene', 'Start scene', 'Begin the scene']) {
  if (await tap(page, b)) { await page.waitForTimeout(1200); break; }
}
await shot(page, 'play-roleplay-scene-started-390');
console.log('\n--- after start ---\n' + await txt(page, 1800));
await btns(page, 'after-start');

for (const label of ['Give me a beat', 'React', 'Raise the stakes', 'Land the moment', 'Pull someone in']) {
  const pre = await body();
  const hit = await tap(page, '^' + label);
  if (!hit) { console.log('SKIP (absent/disabled):', label); continue; }
  const r = await waitGrow(pre);
  console.log(`\n[${label}] ${r.k} in ${r.ms}ms :: ${JSON.stringify(r.s.slice(0, 420))}`);
  await shot(page, 'play-roleplay-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

say('Roleplay sub-panels');
for (const t of ['^The table', '^Perform', '^Impulse', '^Recall', '^Engage', '^Session Timeline', '^Timeline']) {
  if (await tap(page, t)) {
    await page.waitForTimeout(900);
    await shot(page, 'play-roleplay-' + t.slice(1).toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
    console.log('\n--- ' + t + ' ---\n' + (await txt(page, 1100)));
  }
}

say('End Session');
if (await tap(page, '^End Session')) { await page.waitForTimeout(900); await shot(page, 'play-roleplay-end-session-390'); console.log(await txt(page, 1200)); }

await ctx.close();
await browser.close();
