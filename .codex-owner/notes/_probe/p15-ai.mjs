import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'gemma3-27b-abliterated:latest',
  fallbackEnabled: false,
});

const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const say = (s) => console.log('\n\n===== ' + s + ' =====');

async function waitFor(pred, ms = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await pred();
    if (r) return { ok: true, ms: Date.now() - t0, r };
    await page.waitForTimeout(1000);
  }
  return { ok: false, ms: Date.now() - t0 };
}

// ---- 1. Combat Advisor ----
say('AI-1 Combat Advisor (3 trials)');
await tap(page, '^COMBAT ADVISOR');
await page.waitForTimeout(900);
console.log('inputs on page:', await page.evaluate(() => [...document.querySelectorAll('input,textarea')].map(i => i.placeholder || i.ariaLabel || i.type).join(' ~ ')));
await shot(page, 'play-combat-advisor-390');
await btns(page, 'advisor open');
const box = page.getByPlaceholder(/Surrounded by 3 goblins/i);
console.log('advisor input present:', await box.count());
for (let i = 1; i <= 3; i++) {
  await box.fill('Surrounded by 3 goblins, what should I do?');
  await page.getByRole('button', { name: /Send combat question/i }).click();
  const res = await waitFor(async () => {
    const t = await page.evaluate(() => document.body.innerText);
    if (/did not answer|could not|error|failed|unreachable/i.test(t)) return 'ERR:' + t.match(/[^\n]*(did not answer|could not|error|failed|unreachable)[^\n]*/i)[0];
    const clear = await page.getByRole('button', { name: /Clear AI response/i }).count().catch(() => 0);
    return clear > 0 ? true : false;
  }, 180000);
  console.log(`  trial ${i}: ok=${res.ok} in ${res.ms}ms ${typeof res.r === 'string' ? res.r : ''}`);
  if (i === 1) { await shot(page, 'play-combat-advisor-answer-390'); }
  const answer = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find(x => /Combat Advisor/i.test(x.textContent));
    return h?.closest('div')?.parentElement?.innerText?.slice(0, 700) || '';
  });
  console.log('  answer:', JSON.stringify(answer.replace(/\s+/g, ' ').slice(0, 420)));
  await tap(page, 'Clear AI response');
}

await ctx.close();
await browser.close();
