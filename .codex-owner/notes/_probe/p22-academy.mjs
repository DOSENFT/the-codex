import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const say = s => console.log('\n\n===== ' + s + ' =====');
const body = () => page.evaluate(() => document.body.innerText);
const diff = (pre, post, n = 900) => { const p = pre.split('\n'); return post.split('\n').filter(l => l.trim() && !p.includes(l)).join(' | ').slice(0, n); };
async function ai(pre, ms = 200000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(1500);
    const now = await body();
    const e = now.match(/[^\n]*(could not reach|did not answer|failed to fetch|unreachable|written offline)[^\n]*/i);
    if (e) return { ms: Date.now() - t0, k: 'ERROR/FALLBACK', s: e[0] };
    if (now.length > pre.length + 60) { let last = now; for (let i = 0; i < 60; i++) { await page.waitForTimeout(1500); const n = await body(); if (n === last) break; last = n; } return { ms: Date.now() - t0, k: 'ANSWER', s: diff(pre, last, 500) }; }
  }
  return { ms: Date.now() - t0, k: 'TIMEOUT', s: '' };
}

say('AI-2 Persona: AI Suggest Traits');
await goTab(page, 'prep', 'Persona');
await page.waitForTimeout(700);
let pre = await body();
if (await tap(page, 'AI Suggest Traits')) { const r = await ai(pre); console.log(`[AI Suggest Traits] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`); await shot(page, 'prep-persona-ai-traits-390'); }

say('AI-3 Persona: AI Suggest (combat) dialogue');
pre = await body();
if (await tap(page, 'AI Suggest \\(combat\\)')) { const r = await ai(pre); console.log(`[AI Suggest combat] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`); await shot(page, 'prep-persona-ai-dialogue-390'); }

say('PREP / Academy');
await goTab(page, 'prep', 'Academy');
await page.waitForTimeout(900);
await shot(page, 'prep-academy-top-390');
console.log(await txt(page, 2000));
await btns(page, 'academy');

for (const t of ['^Training', '^Quizzes', '^Accent', '^Study', '^In-Session', '^Apprentice', '^Journeyman', '^Master', '^Conversation']) {
  const p0 = await body();
  if (!(await tap(page, t))) continue;
  await page.waitForTimeout(1000);
  console.log(`\n-- ${t} --\n   ${diff(p0, await body())}`);
  await shot(page, 'prep-academy-' + t.slice(1).toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

say('AI-4 Academy generators');
for (const t of ['Generate Scene', 'Generate Question', 'Start Drill', 'Start One-Shot Adventure', 'Generate Scenario']) {
  const p0 = await body();
  if (!(await tap(page, t))) { console.log('MISSING:', t); continue; }
  const r = await ai(p0);
  console.log(`[${t}] ${r.k} ${r.ms}ms :: ${JSON.stringify(r.s)}`);
  await shot(page, 'prep-academy-' + t.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

await ctx.close();
await browser.close();
