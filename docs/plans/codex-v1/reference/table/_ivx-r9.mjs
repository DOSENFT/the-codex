import { up, newPage, importFile, realCopy, settle, bodyText, rejections } from './_ivx-lib.mjs';

const env = await up();
const file = realCopy('full');
const { ctx, page } = await newPage(env);
await importFile(page, file);
await settle(page);

const keys = () => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')));
console.log('after 1st import, char keys:', JSON.stringify(await keys()));
console.log('ALL ls keys:', JSON.stringify(await page.evaluate(() => Object.keys(localStorage))));

// find the settings entry point
const top = await page.evaluate(() =>
  [...document.querySelectorAll('button,[role="button"]')].map(b => ({
    label: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    vis: b.getBoundingClientRect().width > 0,
  })).filter(x => x.vis));
console.log('visible top-level controls:', JSON.stringify(top.map(x => x.label)));

// open Settings
const settingsBtn = page.getByRole('button', { name: /settings/i }).first();
console.log('settings control count:', await page.getByRole('button', { name: /settings/i }).count());
await settingsBtn.click();
await page.waitForTimeout(800);
await settle(page);

const sTextBefore = await bodyText(page);
console.log('\n=== SETTINGS TEXT ===\n' + sTextBefore);

const sButtons = await page.evaluate(() =>
  [...document.querySelectorAll('button,[role="button"],label,input[type=file]')].map(b => ({
    tag: b.tagName.toLowerCase(),
    label: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    vis: b.getBoundingClientRect().width > 0 && getComputedStyle(b).visibility !== 'hidden',
  })));
console.log('\n=== SETTINGS CONTROLS ===');
for (const b of sButtons) console.log(`${b.vis ? 'V' : '.'} ${b.tag.padEnd(7)} "${b.label}"`);

// Exact-label test
const exactImport = await page.getByRole('button', { name: 'Import', exact: true }).count();
const importChar = await page.getByRole('button', { name: 'Import Character', exact: true }).count();
console.log('\nexact "Import" count =', exactImport, '| exact "Import Character" count =', importChar);

// 2nd import through it
await importFile(page, file, { via: /^Import$/ });
await page.waitForTimeout(1500);
const k2 = await keys();
console.log('after 2nd import, char keys:', JSON.stringify(k2), 'n =', k2.length);
console.log('ERRORS', JSON.stringify(page.__all));
console.log('rejections', JSON.stringify(await rejections(page)));
await ctx.close(); await env.browser.close(); await env.srv.close();
