import { chromium, shot } from './_pw.mjs';
import { boot, txt, btns, tap } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
const say = (s) => console.log('\n\n===== ' + s + ' =====');

// collapse the four economy bands so the extras are reachable
say('errata band'); await tap(page, 'Your sheet and the 2024 rules disagree');
await shot(page, 'play-errata-band-390');
console.log(await txt(page, 1500));

const SECTIONS = ['DAMAGE LOG', 'COMBAT ADVISOR', 'BASIC ACTIONS', 'RULES FLAGS', 'REST MANAGEMENT', 'CHARACTER PERSONA'];
for (const s of SECTIONS) {
  say(s);
  const ok = await tap(page, '^' + s);
  if (!ok) continue;
  await page.waitForTimeout(600);
  const slug = s.toLowerCase().replace(/[^a-z]+/g, '-');
  // scroll the section header to the top so the capture shows the body
  await page.getByRole('button', { name: new RegExp('^' + s) }).first()
    .evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, 'play-extras-' + slug + '-390');
  const t = await page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim().startsWith(label));
    if (!b) return '(header not found)';
    // walk up to the section container then read its text
    let n = b.parentElement;
    for (let i = 0; i < 3 && n; i++) { if ((n.innerText || '').length > (b.innerText || '').length + 80) break; n = n.parentElement; }
    return (n?.innerText || '').replace(/\s*\n\s*/g, ' \n').slice(0, 2200);
  }, s);
  console.log(t);
  await tap(page, '^' + s); // collapse again
}

await ctx.close();
await browser.close();
