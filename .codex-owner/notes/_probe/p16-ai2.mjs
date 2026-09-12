import { chromium, shot } from './_pw.mjs';
import { boot, txt, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'gemma3-27b-abliterated:latest',
  fallbackEnabled: false,
});

const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const net = [];
page.on('request', r => { if (!r.url().includes('localhost:5191')) net.push(r.method() + ' ' + r.url().slice(0, 90)); });

await tap(page, '^COMBAT ADVISOR');
await page.waitForTimeout(900);

const body = () => page.evaluate(() => document.body.innerText);
const before = await body();
console.log('--- BEFORE (advisor region) ---');
console.log(before.split('\n').filter(l => l.trim()).slice(0, 4).join(' | '));
console.log('clear btn before send:', await page.getByRole('button', { name: /Clear AI response/i }).count());

const box = page.getByPlaceholder(/Surrounded by 3 goblins/i);

for (let i = 1; i <= 3; i++) {
  const pre = await body();
  await box.fill('Surrounded by 3 goblins, what should I do?');
  const t0 = Date.now();
  await page.getByRole('button', { name: /Send combat question/i }).click();
  let outcome = 'TIMEOUT', extra = '';
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(1000);
    const now = await body();
    const stop = await page.getByRole('button', { name: /Stop the advisor/i }).count().catch(() => 0);
    const err = now.match(/[^\n]*(did not answer|unreachable|could not reach|no response|failed|check the address)[^\n]*/i);
    if (err) { outcome = 'ERROR'; extra = err[0]; break; }
    if (stop === 0 && now.length > pre.length + 60) { outcome = 'ANSWER'; extra = now; break; }
  }
  const ms = Date.now() - t0;
  if (outcome === 'ANSWER') {
    const pre2 = pre.split('\n');
    const added = extra.split('\n').filter(l => !pre2.includes(l)).join(' ').replace(/\s+/g, ' ');
    console.log(`trial ${i}: ANSWER in ${ms}ms | len=${added.length} | ${JSON.stringify(added.slice(0, 500))}`);
  } else {
    console.log(`trial ${i}: ${outcome} in ${ms}ms | ${extra.slice(0, 200)}`);
  }
  if (i === 1) await shot(page, 'play-combat-advisor-answer-390');
  await tap(page, 'Clear AI response');
  await page.waitForTimeout(500);
}

console.log('\n=== off-origin requests ===');
console.log([...new Set(net)].join('\n') || '(none)');

// ---- now offline behaviour ----
console.log('\n\n===== AI OFFLINE TEST =====');
await ctx.setOffline(true);
const t1 = Date.now();
await box.fill('Surrounded by 3 goblins, what should I do?');
await page.getByRole('button', { name: /Send combat question/i }).click();
let off = 'NO VISIBLE ERROR';
while (Date.now() - t1 < 70000) {
  await page.waitForTimeout(1000);
  const now = await body();
  const m = now.match(/[^\n]*(did not answer|unreachable|could not|no response|failed|check the address|offline|error)[^\n]*/i);
  if (m) { off = m[0]; break; }
}
console.log('offline result after', Date.now() - t1, 'ms:', off);
await shot(page, 'play-combat-advisor-offline-390');
await ctx.setOffline(false);

await ctx.close();
await browser.close();
