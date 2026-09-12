import { chromium, newCtx, shot, wireLogs, URL_BASE } from './_pw.mjs';
import { txt, btns, tap, goTab } from './_boot.mjs';

const browser = await chromium.launch();
const ctx = await newCtx(browser);
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
wireLogs(page);
await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await tap(page, 'Create New Character');
await page.locator('input[placeholder*="Thalindra"]').fill('Probe Wizard');
for (let i = 0; i < 10; i++) {
  for (const s of await page.locator('select').all()) {
    const opts = await s.locator('option').allTextContents();
    if (opts.includes('Wizard')) await s.selectOption('Wizard');
  }
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.waitForTimeout(350);
}
await shot(page, 'setup-create-forge-390');
await tap(page, 'Forge Character');
await page.waitForTimeout(2500);
await shot(page, 'play-turn-wizard-390');
console.log('=== WIZARD, PLAY/Combat ===');
console.log(await txt(page, 2600));
const saved = await page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = id && JSON.parse(localStorage.getItem('codex-character-' + id) || 'null');
  return c ? JSON.stringify({ name: c.name, class: c.class, subclass: c.subclass, race: c.race, level: c.level, spells: c.spells?.length, features: c.features?.length, hp: c.hitPoints, slots: c.spellSlots, weapons: c.weapons?.length, abil: c.abilityScores }) : 'NONE';
});
console.log('\nsaved:', saved);

console.log('\n=== WIZARD, PREP/Grimoire ===');
await goTab(page, 'prep', 'Grimoire');
await shot(page, 'prep-grimoire-wizard-390');
console.log(await txt(page, 1400));

console.log('\n=== WIZARD, PREP/Character ===');
await goTab(page, 'prep', 'Character');
await shot(page, 'prep-character-wizard-390');
console.log(await txt(page, 1400));

console.log('\n=== reopen: reload the page, does it come back? ===');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await shot(page, 'reopen-after-reload-390');
console.log(await txt(page, 800));

console.log('\n=== roster / switch character ===');
await tap(page, '^Probe Wizard');
await page.waitForTimeout(400);
await shot(page, 'roster-switcher-390');
console.log(await txt(page, 900));
await btns(page, 'roster');

await ctx.close();
await browser.close();
