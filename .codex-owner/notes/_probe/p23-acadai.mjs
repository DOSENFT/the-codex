import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(() => document.body.innerText);
const diff = (pre, post, n = 700) => { const p = pre.split('\n'); return post.split('\n').filter(l => l.trim() && !p.includes(l)).join(' | ').slice(0, n); };

async function hardTap(name) {
  const b = page.getByRole('button', { name: new RegExp('^' + name + '$', 'i') }).first();
  if (!(await b.count())) { console.log('  MISSING', name); return false; }
  await b.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await b.isEnabled())) { console.log('  DISABLED', name); return false; }
  await b.click({ timeout: 8000 }).catch(e => console.log('  CLICKFAIL', name, String(e).slice(0, 50)));
  console.log('  tapped', name);
  return true;
}
async function ai(pre, ms = 220000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(1500);
    const now = await body();
    const e = now.match(/[^\n]*(could not reach|did not answer|failed to fetch|unreachable|written offline|not tailored)[^\n]*/i);
    if (e) return { ms: Date.now() - t0, k: 'ERROR/FALLBACK', s: e[0] };
    if (now.length > pre.length + 50) { let last = now; for (let i = 0; i < 80; i++) { await page.waitForTimeout(1500); const n = await body(); if (n === last) break; last = n; } return { ms: Date.now() - t0, k: 'ANSWER', s: diff(pre, last) }; }
  }
  return { ms: Date.now() - t0, k: 'TIMEOUT', s: '' };
}

await goTab(page, 'prep', 'Academy');
await page.waitForTimeout(800);

const jobs = [
  ['Training', 'Generate Scene', 'prep-academy-scene-coach-390'],
  ['Quizzes', 'Generate Question', 'prep-academy-quiz-question-390'],
  ['Training', 'Start Drill', 'prep-academy-improv-drill-390'],
  ['Training', 'Start One-Shot Adventure', 'prep-academy-oneshot-390'],
];
for (const [tabName, btn, capName] of jobs) {
  await hardTap(tabName);
  await page.waitForTimeout(900);
  const pre = await body();
  if (!(await hardTap(btn))) continue;
  const r = await ai(pre);
  console.log(`[${btn}] ${r.k} in ${r.ms}ms :: ${JSON.stringify(r.s)}\n`);
  await shot(page, capName);
}

console.log('\n===== Condition Drill =====');
await hardTap('Quizzes'); await page.waitForTimeout(700);
const p0 = await body();
for (const n of ['Start Drill', 'Start Condition Drill', 'Begin Drill', 'Start']) if (await hardTap(n)) break;
await page.waitForTimeout(2500);
console.log(diff(p0, await body()));
await shot(page, 'prep-academy-condition-drill-390');

await ctx.close();
await browser.close();
