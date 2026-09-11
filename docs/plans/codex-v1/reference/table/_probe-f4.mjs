/* throwaway: what does ?d=1 actually render, so F-4 can be graded on it */
import { chromium, LOCAL, PHONE, importFile } from './rig.mjs';
import { realCopy } from './families.mjs';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(LOCAL, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));
await page.goto(LOCAL + '?d=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const cap = [...document.querySelectorAll('.list .cap')].map(c => c.innerText.replace(/\s+/g, ' '));
  const acts = [...document.querySelectorAll('.list .act')].map(a => ({
    tag: a.tagName, disabled: a.disabled === true,
    name: a.querySelector('.anm')?.innerText || '',
    cost: a.querySelector('.cost')?.innerText || '',
  }));
  const res = [...document.querySelectorAll('.res .rgrp, .res *')].slice(0, 0);
  const resText = document.querySelector('.res')?.innerText.replace(/\s+/g, ' ') || '(no .res)';
  return { cap, acts, resText, buttons: document.querySelectorAll('button').length };
});
console.log(JSON.stringify(info, null, 1));
await ctx.close(); await b.close();
