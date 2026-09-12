import { chromium, shot } from './_pw.mjs';
import { boot, goTab, txt, btns } from './_boot.mjs';

const browser = await chromium.launch();
const { ctx, page } = await boot(browser);

const TABS = [
  ['session', 'Grimoire', 'play-grimoire-390'],
  ['session', 'Roleplay', 'play-roleplay-390'],
  ['prep', 'Character', 'prep-character-390'],
  ['prep', 'Grimoire', 'prep-grimoire-390'],
  ['prep', 'Persona', 'prep-persona-390'],
  ['prep', 'Academy', 'prep-academy-390'],
];

for (const [mode, tab, name] of TABS) {
  console.log('\n================ ' + mode + ' / ' + tab + ' ================');
  await goTab(page, mode, tab);
  await shot(page, name);
  console.log(await txt(page, 2200));
  await btns(page);
}

await ctx.close();
await browser.close();
