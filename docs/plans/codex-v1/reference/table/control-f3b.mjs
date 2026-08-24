/* NEGATIVE CONTROL for F-3b.
   A green check on this project means nothing until it has been shown to go
   red. Runs the same shapes against 3d9b351 — the commit immediately BEFORE the
   normaliser, not the ancient 73c45d8 — so what it measures is this fix and
   nothing else. `--now` runs the identical sweep against the current build.

   Deliberately does NOT use walk()/goScreen(): on the pre-fix build the app is
   blank or boundaried, so every Playwright lookup burns its full timeout and the
   sweep never finishes. It reads the landing screen straight after import, which
   is where all five §9.11 shapes were reported to fault, and grades the same
   three things judge() does: a page error, a console error, or a boundary
   notice. Anything red here is red on the criterion too. */
import { chromium, freshCtx, serveDist, DIST } from './rig.mjs';
import { write } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-prev/dist';
const now = process.argv.includes('--now');
const dir = now ? DIST : PREV;
const label = now ? 'HEAD (with the normaliser)' : 'PREV 3d9b351 (without it)';

const SKELETON = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};

const TYPED = {
  'null in spells':           { spells: [null] },
  'null in features':         { features: [null] },
  'properties as a string':   { weapons: [{ name: 'Sword', properties: 'finesse' }] },
  'description as an object': { spells: [{ name: 'Bless', level: 1, description: { text: 'x' } }] },
  'condition with no name':   { customConditions: [{}] },
  'null in weapons':          { weapons: [null] },
  'strings in identities':    { identities: ['Ash'] },
  'string dialogue line':     { identities: [{ name: 'Ash', dialogueLines: ['a line'] }] },
  'spells not a list':        { spells: { name: 'Bless' } },
  'equipment not a list':     { equipment: { name: 'Rope' } },
  'level as a string':        { spells: [{ name: 'Bless', level: '1' }] },
  'pool numbers as strings':  { resourcePools: [{ name: 'Embers', current: '3', max: '5' }] },
  'cascades as a string':     { customConditions: [{ name: 'Emberburn', cascades: 'Prone' }] },
  'name as a number':         { features: [{ name: 42 }] },
  'persona fields wrong':     { persona: { physicalTics: 'taps the coal', patron: { name: { n: 'Aesis' }, domains: 'hearth' } } },
  'nested object as text':    { features: [{ name: 'Lay on Hands', description: { long: 'x' } }] },
  'all of them at once':      {
    spells: [null], features: [null], customConditions: [{}], identities: ['Ash'],
    weapons: [{ name: 'S', properties: 'finesse' }], equipment: { name: 'Rope' },
  },
};

const BOUNDARY = /stopped|something went wrong|The rest of the app is still running/i;

const srv = await serveDist(dir, now ? 4244 : 4243);
const b = await chromium.launch();
let red = 0;
console.log(`\n\x1b[1mF-3b shapes against ${label}\x1b[0m\n${dir}\n`);

for (const [kind, extra] of Object.entries(TYPED)) {
  const f = write(`ctl-${kind.replace(/\W/g, '-')}.json`, { ...SKELETON, ...extra });
  const { ctx, page } = await freshCtx(b, { base: srv.url });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0]); });
  const why = [];
  try {
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await page.getByRole('button', { name: /Import Character/i }).first().click({ timeout: 10000 });
    await (await chooser).setFiles(f);
    await page.waitForTimeout(900);
    const gate = page.getByRole('button', { name: /^Import anyway$/ });
    if (await gate.count()) { await gate.click(); await page.waitForTimeout(800); }
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (body.trim().length < 40) why.push(`BLANK (${body.trim().length}ch)`);
    if (BOUNDARY.test(body)) why.push('BOUNDARY notice');
    if (errs.length) why.push(errs[0]);
  } catch (e) {
    why.push('THREW ' + String(e).split('\n')[0].slice(0, 70));
  }
  if (why.length) red++;
  console.log(`${why.length ? '\x1b[31mFAULT\x1b[0m' : ' ok  '} ${kind.padEnd(26)} ${why.join(' · ').slice(0, 130)}`);
  await ctx.close();
}
console.log(`\n\x1b[1m${red}/${Object.keys(TYPED).length} shapes fault on ${label}\x1b[0m`);
await b.close(); await srv.close();
