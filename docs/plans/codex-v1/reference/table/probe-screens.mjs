// Read the seven screens off the running app with Nix's real sheet loaded, so
// the "hollow screen" markers in rig.mjs are read from reality rather than
// invented. Scratch tool; re-run whenever a screen's content changes.
import { chromium, freshCtx, goScreen, SCREENS, importFile, LOCAL, LIVE } from './rig.mjs';

const BASE = process.argv.includes('--live') ? LIVE : LOCAL;
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

const b = await chromium.launch();
const { ctx, page } = await freshCtx(b, { base: BASE });
await importFile(page, FULL);
console.log('after import:', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300));

for (const s of SCREENS) {
  await goScreen(page, s);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  console.log(`\n════ ${s.id}  (${t.length} chars) ════\n${t.slice(0, 1400)}`);
}
console.log('\n=== errors ===', page.errs);
await ctx.close(); await b.close();
