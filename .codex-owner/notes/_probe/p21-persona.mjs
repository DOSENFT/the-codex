import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const say = s => console.log('\n\n===== ' + s + ' =====');
const body = () => page.evaluate(() => document.body.innerText);
const diff = (pre, post, n = 900) => { const p = pre.split('\n'); return post.split('\n').filter(l => l.trim() && !p.includes(l)).join(' | ').slice(0, n); };

say('PREP / Persona — top level');
await goTab(page, 'prep', 'Persona');
await page.waitForTimeout(800);
await shot(page, 'prep-persona-top-390');
console.log(await txt(page, 2200));
await btns(page, 'persona');

const subs = ['^Dialogue Bank', '^Library', '^Practice', '^Quick-Draw', '^Rehearsal', '^Warmup', '^Journal', '^Scene Responses', '^Story', '^Voice', '^Accent', '^Backstory'];
for (const s of subs) {
  const pre = await body();
  if (!(await tap(page, s))) continue;
  await page.waitForTimeout(1100);
  const post = await body();
  console.log(`\n-- ${s} --\n   ${diff(pre, post)}`);
  await shot(page, 'prep-persona-' + s.slice(1).toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

say('Persona AI buttons');
for (const s of ['AI Suggest Traits', 'AI Suggest', 'Suggest Traits', 'Generate']) {
  const pre = await body();
  if (!(await tap(page, s))) continue;
  const t0 = Date.now();
  let out = 'TIMEOUT';
  while (Date.now() - t0 < 200000) {
    await page.waitForTimeout(1500);
    const now = await body();
    const e = now.match(/[^\n]*(could not reach|did not answer|failed to fetch|unreachable)[^\n]*/i);
    if (e) { out = 'ERROR: ' + e[0]; break; }
    if (now !== pre && now.length > pre.length + 60) { let last = now; for (let i = 0; i < 60; i++) { await page.waitForTimeout(1500); const n = await body(); if (n === last) break; last = n; } out = 'ANSWER: ' + diff(pre, last, 500); break; }
  }
  console.log(`\n[${s}] ${Date.now() - t0}ms ${out}`);
  await shot(page, 'prep-persona-ai-' + s.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
  break;
}

await ctx.close();
await browser.close();
