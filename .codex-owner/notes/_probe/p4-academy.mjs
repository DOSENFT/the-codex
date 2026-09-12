import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);
await goTab(page, 'prep', 'Academy');
await shot(page, 'prep-academy-390');
console.log(await txt(page, 4000));
const bs = await btns(page);

// Drill into each academy sub-tab
for (const name of ['Quiz', 'Flashcards', 'Conditions', 'Drills', 'Improv', 'Conversation', 'One-Shot', 'Progress', 'Coach']) {
  const b = page.getByRole('button', { name: new RegExp('^' + name, 'i') }).first();
  if (await b.count() && await b.isVisible().catch(() => false)) {
    console.log('\n>>> clicking ' + name);
    await b.click();
    await page.waitForTimeout(800);
    await shot(page, 'prep-academy-' + name.toLowerCase().replace(/[^a-z]/g, '') + '-390');
    console.log(await txt(page, 1600));
  } else {
    console.log('\n>>> no button: ' + name);
  }
}
await ctx.close();
await browser.close();
