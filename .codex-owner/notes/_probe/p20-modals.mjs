import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const AI_CFG = JSON.stringify({ provider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma3-27b-abliterated:latest', fallbackEnabled: false });
const browser = await chromium.launch({ downloadsPath: 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/.codex-owner/notes/_probe/dl' });
const { ctx, page } = await boot(browser, { extra: { 'codex-ai-config': AI_CFG } });
const say = s => console.log('\n\n===== ' + s + ' =====');
const body = () => page.evaluate(() => document.body.innerText);

page.on('download', async d => { console.log('  *** DOWNLOAD:', d.suggestedFilename()); const p = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/.codex-owner/notes/_probe/dl/' + d.suggestedFilename(); await d.saveAs(p).catch(e => console.log('   save err', String(e).slice(0, 60))); });

await goTab(page, 'prep', 'Character');
await page.waitForTimeout(600);

for (const label of ['Add Weapon', 'Add Feat', 'New pool', 'New condition', 'Export Character']) {
  const pre = await body();
  if (!(await tap(page, label))) { console.log('MISSING:', label); continue; }
  await page.waitForTimeout(1200);
  const post = await body();
  const preL = pre.split('\n');
  const added = post.split('\n').filter(l => l.trim() && !preL.includes(l));
  console.log(`\n-- ${label} -- new UI (${added.length} lines):`);
  console.log('   ' + added.join(' | ').slice(0, 900));
  console.log('   inputs:', await page.evaluate(() => [...document.querySelectorAll('input,textarea,select')].map(i => i.placeholder || i.ariaLabel || i.name || i.type).slice(-14).join(' ~ ')));
  await shot(page, 'prep-character-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '-390');
  // close
  for (const c of ['Cancel', 'Close', 'Done', '^Back']) if (await tap(page, c)) break;
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

say('Skill cycling: tap Acrobatics bonus 3x');
const sk = page.getByRole('button', { name: /^Acrobatics: /i }).first();
for (let i = 0; i < 3; i++) {
  await sk.click().catch(() => {});
  await page.waitForTimeout(500);
  console.log('  now:', await page.getByRole('button', { name: /^Acrobatics: /i }).first().getAttribute('aria-label'));
}
await shot(page, 'prep-character-skill-cycled-390');
console.log('  persisted:', await page.evaluate(() => { const id = localStorage.getItem('codex-active-id'); const c = JSON.parse(localStorage.getItem('codex-character-' + id) || '{}'); return JSON.stringify({ prof: c.skillProficiencies, exp: c.skillExpertise }); }));

say('Study Strength / study a skill');
if (await tap(page, 'Study Strength')) { await page.waitForTimeout(900); await shot(page, 'prep-character-study-strength-390'); const t = await body(); console.log(t.slice(t.indexOf('Strength'), t.indexOf('Strength') + 700)); }

await ctx.close();
await browser.close();
