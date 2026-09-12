import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch();
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const body = () => page.evaluate(() => document.body.innerText);
const say = s => console.log('\n\n===== ' + s + ' =====');

// ---------- A. React / Land the moment, equality-based ----------
say('A. Roleplay React + Land the moment (equality check)');
await goTab(page, 'session', 'Roleplay');
await tap(page, 'Start the scene');
await page.waitForTimeout(700);
await page.getByPlaceholder(/Around the campfire/i).fill('A crowded riverside tavern, rain outside');
await page.getByPlaceholder(/still being polite/i).fill('Tense. Scar is watching the door.');
await (await tap(page, "That’s the scene"));
const beatBtn = page.getByRole('button', { name: /^Give me a beat$/ }).first();
const idle = async (ms = 240000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await beatBtn.isEnabled().catch(() => 0)) return Date.now() - t0; await page.waitForTimeout(800); } return -1; };
await idle();
for (const label of ['React', 'Land the moment']) {
  const pre = await body();
  await tap(page, '^' + label);
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  const took = await idle();
  await page.waitForTimeout(1200);
  const post = await body();
  console.log(`[${label}] loadingDone=${took}ms changed=${post !== pre} deltaLen=${post.length - pre.length}`);
  const preL = pre.split('\n');
  console.log('  new lines:', JSON.stringify(post.split('\n').filter(l => l.trim() && !preL.includes(l)).join(' ').replace(/\s+/g, ' ').slice(0, 300)));
  await shot(page, 'play-roleplay-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
}

say('A2. Session Timeline + End Session');
console.log(await txt(page, 900));
await tap(page, '^End Session');
await page.waitForTimeout(1200);
await shot(page, 'play-roleplay-end-session-390');
console.log('--- after End Session ---\n' + await txt(page, 1000));

// ---------- B. Grimoire ----------
say('B. PLAY / Grimoire interactions');
await goTab(page, 'session', 'Grimoire');
await shot(page, 'play-grimoire-list-390');
console.log(await txt(page, 1600));
const gb = await btns(page, 'grimoire');
for (const t of ['^Level', '^Source', '^Turn cost', '^Ready', '^Filters', '^The rules']) {
  if (await tap(page, t)) { await page.waitForTimeout(700); await shot(page, 'play-grimoire-' + t.slice(1).toLowerCase().replace(/[^a-z]+/g, '-') + '-390'); console.log('\n-- ' + t + ' --\n' + await txt(page, 700)); }
}
say('B2. spell detail');
for (const s of ['^Bless', '^Cure Wounds', '^Shield of Faith']) {
  if (await tap(page, s)) { await page.waitForTimeout(800); await shot(page, 'play-grimoire-spell-detail-390'); console.log('\n-- ' + s + ' --\n' + await txt(page, 1400)); break; }
}

// ---------- C. PREP / Character ----------
say('C. PREP / Character interactions');
await goTab(page, 'prep', 'Character');
await shot(page, 'prep-character-full-390');
console.log(await txt(page, 2000));
await btns(page, 'prep-character');
for (const t of ['Add Weapon', 'Add Feat', 'New pool', 'New condition', 'Export Character', 'Character Insight', 'Campaign Editor']) {
  if (await tap(page, t)) { await page.waitForTimeout(900); await shot(page, 'prep-character-' + t.toLowerCase().replace(/[^a-z]+/g, '-') + '-390'); console.log('\n-- ' + t + ' --\n' + await txt(page, 900)); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(400); }
}

await ctx.close();
await browser.close();
