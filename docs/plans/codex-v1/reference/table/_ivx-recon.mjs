import { up, newPage, importFile, realCopy, settle, bodyText, rejections, charBlob } from './_ivx-lib.mjs';
import { readFileSync } from 'node:fs';

const env = await up();
const file = realCopy('full');
const disk = JSON.parse(readFileSync(file, 'utf8'));
console.log('DISK: level', disk.level, '| class', disk.class, '| hpMax', disk.hitPoints.max,
  '| AC', disk.armorClass, '| LoH', disk.paladinResources.layOnHands.current + '/' + disk.paladinResources.layOnHands.max,
  '| slot1', disk.spellSlots['1'].current + '/' + disk.spellSlots['1'].max);

const { ctx, page } = await newPage(env);
await importFile(page, file);
await settle(page);

console.log('\n=== BASE (no ?d=1) first 600 chars ===');
console.log((await bodyText(page)).slice(0, 600));

await page.goto(env.srv.url + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await settle(page);

const t = await bodyText(page);
console.log('\n=== ?d=1 FULL TEXT (' + t.length + ' chars) ===');
console.log(t);

const controls = await page.evaluate(() => {
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  return [...document.querySelectorAll(SEL)].map(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 120),
      tag: el.tagName.toLowerCase(),
      vis: !(s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || r.width < 1 || r.height < 1),
      w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top),
      cls: String(el.className || '').slice(0, 70),
    };
  });
});
console.log('\n=== CONTROLS on ?d=1 (' + controls.length + ') ===');
for (const c of controls) console.log(`${c.vis ? 'V' : '.'} ${c.tag.padEnd(8)} ${String(c.w)}x${c.h} y=${c.y}  "${c.label}"  [${c.cls}]`);

console.log('\n=== LS char (slots + LoH) ===');
const cb = await charBlob(page);
console.log(JSON.stringify({ key: cb?.key, slots: cb?.val?.spellSlots, loh: cb?.val?.paladinResources?.layOnHands, level: cb?.val?.level, hp: cb?.val?.hitPoints, ac: cb?.val?.armorClass }, null, 1));

console.log('\n=== ERRORS ===');
console.log(JSON.stringify(page.__all, null, 1));
console.log('rejections', JSON.stringify(await rejections(page)));

await ctx.close(); await env.browser.close(); await env.srv.close();
