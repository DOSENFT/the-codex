import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const say = s => console.log('\n\n===== ' + s + ' =====');

// ---------- dice roller, detailed ----------
{
  const { ctx, page } = await boot(browser);
  const body = () => page.evaluate(() => document.body.innerText);
  say('Dice roller / Roll Capture detail');
  await page.getByRole('button', { name: /Open dice roller/i }).first().click();
  await page.waitForTimeout(800);
  const vis = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.top < window.innerHeight && r.bottom > 0; }).map(b => b.getAttribute('aria-label') || b.innerText.replace(/\s+/g, ' ').slice(0, 40)).join(' ~ '));
  console.log('visible buttons:', vis);
  await shot(page, 'chrome-dice-roller-390');
  await page.getByRole('button', { name: /^Set up d20$/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Advantage$/i }).click().catch(() => {});
  await page.waitForTimeout(400);
  console.log('inputs now:', await page.evaluate(() => [...document.querySelectorAll('input,textarea')].filter(i => { const r = i.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0; }).map(i => (i.placeholder || i.ariaLabel || i.type)).join(' ~ ')));
  const numIn = page.locator('input[type=number], input[inputmode=numeric]').first();
  await numIn.fill('17').catch(e => console.log('numfill err', String(e).slice(0, 70)));
  await page.waitForTimeout(500);
  await shot(page, 'chrome-dice-roller-filled-390');
  const t = await body();
  console.log('capture region:', t.slice(t.indexOf('YOUR ROLL'), t.indexOf('YOUR ROLL') + 500).replace(/\n/g, ' | '));
  const log = page.getByRole('button', { name: /Write this roll down|Log it/i }).first();
  console.log('Log it enabled:', await log.isEnabled().catch(() => 'n/a'));
  await log.click({ timeout: 5000 }).catch(e => console.log('logit err', String(e).slice(0, 60)));
  await page.waitForTimeout(900);
  await shot(page, 'chrome-dice-logged-390');
  const t2 = await body();
  console.log('after log:', t2.slice(t2.indexOf('YOUR ROLL'), t2.indexOf('YOUR ROLL') + 500).replace(/\n/g, ' | '));

  say('Character switcher');
  const nix = page.getByRole('button', { name: /Open character sheet for/i }).first();
  console.log('switcher label:', await nix.getAttribute('aria-label'), '|', (await nix.innerText().catch(() => '')).slice(0, 40));
  await nix.click().catch(e => console.log('err', String(e).slice(0, 50)));
  await page.waitForTimeout(1000);
  await shot(page, 'chrome-character-switcher-390');
  console.log(await txt(page, 900));
  await ctx.close();
}

// ---------- wide captures ----------
{
  const { ctx, page } = await boot(browser, { wide: true });
  say('WIDE 1280x800');
  const shots = [
    ['session', 'Combat', 'play-turn-1280'],
    ['session', 'Grimoire', 'play-grimoire-1280'],
    ['session', 'Roleplay', 'play-roleplay-1280'],
    ['prep', 'Character', 'prep-character-1280'],
    ['prep', 'Grimoire', 'prep-grimoire-1280'],
    ['prep', 'Persona', 'prep-persona-1280'],
    ['prep', 'Academy', 'prep-academy-1280'],
  ];
  for (const [mode, tab, name] of shots) {
    await goTab(page, mode, tab);
    await page.waitForTimeout(1100);
    await shot(page, name);
  }
  say('WIDE: character record / print sheet');
  await ctx.close();
}

await browser.close();
