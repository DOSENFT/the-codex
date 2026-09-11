// Does Marcus's actual DATA survive the import — and does a RELOAD survive it?
//
// `_import-repro.mjs` proved the app renders after import. That is not the same
// claim as "Nix arrived". A normaliser that defaulted every field would render a
// perfectly healthy level-1 Nix with 10s across the board and no spells, and the
// screen would look fine. So this reads the file off disk, reads what the app
// wrote to localStorage, and compares them field by field.
//
// It also reloads. The white screen of 2026-08-17 happened AFTER the character
// was saved, which means the welcome screen was gone too — the only route back
// is boot. If boot re-breaks on the same file, the import is not fixed.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const DL = 'C:/Users/marcu/Downloads/';
const FILES = ['codex-nix-lvl7 (1).json', 'codex-nix-lvl7.json'];

let fails = 0;
const check = (what, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`    ${ok ? 'ok  ' : 'FAIL'}  ${what}${ok ? '' : `\n            got  ${JSON.stringify(got)}\n            want ${JSON.stringify(want)}`}`);
};

const b = await chromium.launch();
for (const f of FILES) {
  const disk = JSON.parse(readFileSync(DL + f, 'utf8'));
  console.log(`\n=== ${f}  (${Object.keys(disk).length} fields on disk)`);

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('THREW: ' + String(e).split('\n')[0]));
  await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });

  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import Character/i }).click();
  await (await chooser).setFiles(DL + f);
  await p.waitForTimeout(1200);

  // A thin export is now held at a gate that names what's missing rather than
  // arriving silently defaulted. Read the gate, then accept it.
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) {
    const notice = (await p.locator('[role="alert"]').last().innerText()).replace(/\s+/g, ' ').trim();
    console.log(`    gate   : ${notice}`);
    await gate.click();
    await p.waitForTimeout(800);
  }

  const stored = await p.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return k ? JSON.parse(localStorage.getItem(k)) : null;
  });
  if (!stored) { console.log('    FAIL  nothing was stored at all'); fails++; await ctx.close(); continue; }

  // -- the identity of the character, as he would recognise it at the table --
  check('name', stored.name, disk.name);
  check('level', stored.level, disk.level);
  check('class', stored.class, disk.class);
  check('subclass', stored.subclass, disk.subclass);
  check('hit points', stored.hitPoints, disk.hitPoints);
  check('armour class', stored.armorClass, disk.armorClass);
  check('ability scores', stored.abilityScores, disk.abilityScores ?? stored.abilityScores);
  check('spell count', stored.spells?.length, disk.spells?.length ?? 0);
  check('feature count', stored.features?.length, disk.features?.length ?? 0);
  check('spell slots', stored.spellSlots, disk.spellSlots);
  check('spell save DC', stored.spellSaveDC, disk.spellSaveDC);
  // The persona and the homebrew notes are the parts that are HIS writing, not
  // the rules'. Losing a spell is annoying; losing 1800 words of backstory is
  // the thing you cannot rebuild from a rulebook.
  check('persona keys', Object.keys(stored.persona ?? {}).length, Object.keys(disk.persona ?? {}).length);
  check('homebrew notes length', (stored.homebrewNotes ?? '').length, (disk.homebrewNotes ?? '').length);
  // Every key on disk must still be on the character. Normalising ADDS defaults;
  // it must never silently DROP a field it didn't know about.
  const lost = Object.keys(disk).filter(k => !(k in stored));
  check('no field dropped', lost, []);

  // -- and now the part that actually broke: booting on the saved character --
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const body = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
  check('reload does not white-screen', body.length > 40, true);
  check('reload shows his name', body.includes(disk.name), true);
  check('no errors thrown', errors, []);
  console.log(`    screen after reload: ${body.slice(0, 110) || '(empty)'}`);
  await ctx.close();
}
await b.close();
console.log(fails === 0 ? '\nALL GREEN' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
