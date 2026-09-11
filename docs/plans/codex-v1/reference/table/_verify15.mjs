// VERIFIER probe 15 — THE LIVE URL. The build Marcus's phone actually loads.
// The most recent successful Pages deploy is headSha 73c45d8 — the harness's own
// BROKEN_SHA negative control. This opens it and applies the full error floor.
import { chromium, PHONE, TABLET, goScreen, settle, SCREENS, importFile } from './rig.mjs';
const LIVE = 'https://dosenft.github.io/the-codex/';
const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const THIN = 'C:/Users/marcu/Downloads/codex-nix-lvl7.json';
const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;
const CHROME = {
  'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i], 'play/Grimoire': [/Grimoire/i],
  'play/Roleplay': [/Perform|Catchphrase|Dialogue/i], 'prep/Character': [/Ability Scores/i],
  'prep/Grimoire': [/Session Status|Lock & Load/i], 'prep/Persona': [/Persona Engine|Identity/i],
  'prep/Academy': [/ROLEPLAY COACH|Training/i],
};
const b = await chromium.launch();

console.log(`=== the live build's own fingerprint ===`);
{
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(LIVE, { waitUntil: 'networkidle' });
  const assets = await page.evaluate(() => [...document.querySelectorAll('script[src],link[href]')].map(e => e.src || e.href).filter(u => /assets\//.test(u)).map(u => u.split('/').pop()));
  console.log('   ' + assets.join('  '));
  await ctx.close();
}

for (const [label, file] of [['FULL real export (F-1)', FULL], ['THIN real export (F-2)', THIN]]) {
  for (const [vp, vname, dpr] of [[PHONE, 'phone', 3], [TABLET, 'tablet', 2]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).split('\n')[0].slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text().slice(0, 200)); });
    await page.addInitScript(() => { window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0, 200))); });
    await page.goto(LIVE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' });
    console.log(`\n=== LIVE · ${label} · ${vname} ===`);
    try { await importFile(page, file); } catch (e) { console.log('   import threw: ' + String(e).split('\n')[0].slice(0, 120)); }
    await page.waitForTimeout(1200);
    const problems = [];
    for (const s of SCREENS) {
      await goScreen(page, s); await settle(page);
      const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
      const row = [];
      if (t.length < 40) row.push('BLANK');
      if (BOUNDARY.test(t)) row.push(`BOUNDARIED "${t.match(BOUNDARY)[0].slice(0, 90)}"`);
      const miss = (CHROME[s.id] || []).filter(re => !re.test(t));
      if (miss.length) row.push(`HOLLOW(${miss.join(',')})`);
      console.log(`   ${s.id.padEnd(16)} ${row.length ? row.join(' · ') : 'ok'}`);
      if (row.length) problems.push(s.id);
    }
    const rej = await page.evaluate(() => window.__rej || []).catch(() => []);
    const all = [...new Set([...errs, ...rej.map(r => 'REJECTION: ' + r)])];
    console.log(`   errors: ${all.length ? '\n     ' + all.join('\n     ') : 'none'}`);
    console.log(`   >>> dead screens: ${problems.length}/7`);
    await ctx.close();
  }
}
await b.close();
