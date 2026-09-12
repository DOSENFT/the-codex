import { chromium, shot } from './_pw.mjs';
import { boot } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = s => console.log('\n===== ' + s + ' =====');
const st = () => page.evaluate(() => {
  const id = localStorage.getItem('codex-active-id');
  const c = JSON.parse(localStorage.getItem('codex-character-' + id) || '{}');
  return JSON.stringify({
    hp: c.hitPoints,
    cd: c.paladinResources && c.paladinResources.channelDivinity,
    pools: (c.resourcePools || []).map(p => `${p.name}:${p.current}/${p.max}:${p.recharge}`),
    feats: (c.features || []).filter(f => f.usesPerRest).map(f => `${f.name}:${f.usesCurrent}/${f.usesMax}:${f.usesPerRest}`),
  });
});

say('baseline');
console.log(await st());

// burn a Channel Divinity use first so a restore is observable
say('spend Channel Divinity (set current to 0 via UI if possible; else observe)');
await page.getByRole('button', { name: /Open settings/i }).click();
await page.waitForTimeout(900);

say('Short Rest -> Confirm Short Rest');
const sr = page.getByRole('button', { name: /^Short Rest$/i }).first();
await sr.scrollIntoViewIfNeeded();
await sr.click();
await page.waitForTimeout(900);
await shot(page, 'chrome-settings-short-rest-confirm-390');
const names = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => { const r = b.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; })
  .map(b => b.getAttribute('aria-label') || b.innerText.replace(/\s+/g, ' ').slice(0, 40)).join(' ~ '));
console.log('visible buttons after first click:', names);

const cf = page.getByRole('button', { name: /Confirm Short Rest/i }).first();
if (await cf.count()) {
  await cf.scrollIntoViewIfNeeded();
  await cf.click();
  console.log('clicked Confirm Short Rest');
} else {
  console.log('NO Confirm Short Rest button found');
}
await page.waitForTimeout(1500);
await shot(page, 'chrome-settings-after-short-rest-390');
console.log('after Short Rest:', await st());

await ctx.close();
await browser.close();
