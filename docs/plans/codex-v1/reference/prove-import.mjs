// PROOF: a character file can get onto a device that has never seen this app.
//
// Written 2026-08-17, after the import shipped broken. Every other proof in this
// folder seeds a character straight into localStorage — which walks past the
// import path entirely, and the import path is the ONLY door onto a new phone.
// So the one thing Marcus had to do to play was the one thing nothing checked.
//
// The fixtures are written here, not read from disk: his real exports carry his
// persona and his backstory, and a proof that depends on a file in someone's
// Downloads folder is a proof that stops working. These reproduce the SHAPES
// that broke — an empty export, and a thin old one.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const dir = mkdtempSync(join(tmpdir(), 'codex-import-'));
const write = (name, obj) => {
  const p = join(dir, name);
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
};

/* what a failed export writes — he has two of these */
const EMPTY = write('codex-character-data.json', '{}');
/* a current export */
const FULL = write('codex-hearthwright-lvl7.json', {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18, spellSaveDC: 15,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
  weapons: [{ id: 'w1', name: 'Longsword', damage: '1d8', damageType: 'slashing' }],
  equipment: [{ id: 'e1', name: 'Shield', quantity: 1 }],
  spells: [{ id: 's1', name: 'Bless', level: 1, school: 'Enchantment' }],
  spellSlots: { 1: { max: 4, current: 4 }, 2: { max: 3, current: 3 } },
});
/* the same character, exported by an older build: valid, and thin */
const THIN = write('codex-hearthwright-old.json', {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
});
/* not a character at all */
const JUNK = write('shopping-list.json', 'eggs, milk, a longsword');

let pass = 0, fail = 0;
const check = (what, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}${ok ? '' : `  (got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)})`}`);
};

const b = await chromium.launch();
const fresh = async () => {
  // A device that has never seen this app: no character, no service worker.
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(String(e).split('\n')[0]));
  /* A React error that a boundary CATCHES never reaches `pageerror` — it goes
     to console.error. The first version of this file only asked "is the screen
     blank?", and so it passed a character whose bare spell had killed the whole
     combat panel: the boundary put up "Combat stopped. The rest of the app is
     still running", the page was full of text, and the check said ok. A caught
     error is not a handled error when the thing it kills is the reason he opens
     the app. It counts as a failure here. */
  p.on('console', m => { if (m.type() === 'error') p.errors.push('console: ' + m.text().slice(0, 120)); });
  await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });
  return [ctx, p];
};
const pick = async (p, file) => {
  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import Character/i }).click();
  await (await chooser).setFiles(file);
  await p.waitForTimeout(900);
};
const screen = async p => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
const saved = p => p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('codex-character-')).length);

// -- 1. the failed export is named as a failed export ------------------------
{
  const [ctx, p] = await fresh();
  await pick(p, EMPTY);
  const s = await screen(p);
  check('an empty file tells him the EXPORT failed, not the import', /export/i.test(s), true);
  check('and nothing was saved on the strength of it', await saved(p), 0);
  check('and the welcome screen is still there to try again', /Import Character/.test(s), true);
  await ctx.close();
}

// -- 2. junk is refused with somewhere to go ---------------------------------
{
  const [ctx, p] = await fresh();
  await pick(p, JUNK);
  check('a non-JSON file is refused', /not a JSON file/i.test(await screen(p)), true);
  check('and it says where a real export comes from', /Settings/.test(await screen(p)), true);
  await ctx.close();
}

// -- 3. a current export just works ------------------------------------------
{
  const [ctx, p] = await fresh();
  await pick(p, FULL);
  const s = await screen(p);
  // This is the whole point: the file goes in, the character comes out, at the
  // table, on a phone that had nothing on it a moment ago.
  check('his character is on screen', /Hearthwright/.test(s), true);
  check('with his hit points, not a default', /67\/67/.test(s), true);
  check('it was stored', await saved(p), 1);
  check('nothing threw', p.errors, []);
  // The failure of 2026-08-17 happened AFTER the save — so the app looked fine
  // and then died on the next boot, with the welcome screen gone too.
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const after = await screen(p);
  check('and it survives a reload rather than white-screening', after.length > 40, true);
  check('still him after the reload', /Hearthwright/.test(after), true);
  check('nothing threw on boot either', p.errors, []);
  await ctx.close();
}

// -- 4. a thin old export is accepted, but never silently ---------------------
{
  const [ctx, p] = await fresh();
  await pick(p, THIN);
  const s = await screen(p);
  // Refusing this would be wrong — an old character is still his character.
  // Accepting it silently would be worse: he'd meet a Paladin with 10s across
  // the board and think the app got him wrong.
  check('it is not refused', /Invalid|not a JSON/i.test(s), false);
  check('but it is not through yet either', await saved(p), 0);
  check('it says which fields are thin', /ability scores.*weapons.*equipment/i.test(s), true);
  check('and offers the way forward', /Import anyway/.test(s), true);
  check('and the way back', /Cancel/.test(s), true);

  await p.getByRole('button', { name: /^Cancel$/ }).click();
  await p.waitForTimeout(400);
  check('cancel really cancels', await saved(p), 0);

  await pick(p, THIN);
  await p.getByRole('button', { name: /^Import anyway$/ }).click();
  await p.waitForTimeout(900);
  const done = await screen(p);
  check('and choosing to go ahead brings him in', /Hearthwright/.test(done), true);
  check('with the level from the file', await p.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return JSON.parse(localStorage.getItem(k)).level;
  }), 7);
  check('and a defaulted ability score rather than a crash', await p.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('codex-character-'));
    return typeof JSON.parse(localStorage.getItem(k)).abilityScores?.DEX;
  }), 'number');
  check('nothing threw', p.errors, []);
  await ctx.close();
}

// -- 5. and no thin shape INSIDE the file kills a screen ---------------------
//
// `Weapon.properties` and `CharacterFeat.effects` are both required by the type,
// both arrive missing from older exports, and both are read without a guard —
// a spread of undefined ("not iterable") and a `.length` of undefined. Each was
// a white screen ABOVE every error boundary, and each hid from every check
// above, because a character with no weapons and no feats never touches them.
// Defaulting the character is not the same as defaulting what is inside it.
//
// So: one bare item of every kind an export can carry, imported alone, reloaded,
// and then walked across every screen — because these die where they RENDER,
// not on import.
const NESTED = {
  weapon: { weapons: [{ name: 'Longsword' }] },
  spell: { spells: [{ name: 'Bless' }] },
  feature: { features: [{ name: 'Lay on Hands' }] },
  equipment: { equipment: [{ name: 'Rope' }] },
  feat: { feats: [{ name: 'Sentinel' }] },
  pool: { resourcePools: [{ name: 'Hearth Embers' }] },
  identity: { identities: [{ name: 'The Ashen Knight' }] },
  condition: { customConditions: [{ name: 'Emberburn' }] },
  hook: { customHooks: [{ name: 'A debt unpaid' }] },
  supply: { supplies: [{ name: 'Rations' }] },
  'empty persona': { persona: {} },
  // What a real thin export actually looks like: several of the above at once.
  // This is the exact shape that got through to the live site on 2026-08-17.
  'export with one of everything': {
    weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }],
    equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }],
    features: [{ name: 'Lay on Hands' }],
  },
};
const SKELETON = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};
for (const [kind, extra] of Object.entries(NESTED)) {
  const file = write(`thin-${kind.replace(/\W/g, '-')}.json`, { ...SKELETON, ...extra });
  const [ctx, p] = await fresh();
  await pick(p, file);
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) { await gate.click(); await p.waitForTimeout(600); }
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  const blank = [];
  const visit = async (label, go) => {
    await go().catch(() => {});
    await p.waitForTimeout(320);
    const t = (await p.evaluate(() => document.body.innerText)).trim();
    // Blank OR boundaried. Both mean the screen is not usable.
    if (t.length < 40 || /stopped|something went wrong/i.test(t)) blank.push(label);
  };
  const tab = name => () => p.getByRole('tab', { name, exact: true }).click();
  for (const t of ['Combat', 'Grimoire', 'Roleplay']) await visit(`play/${t}`, tab(t));
  await p.getByRole('button', { name: 'Switch to prep mode' }).click().catch(() => {});
  await p.waitForTimeout(280);
  for (const t of ['Character', 'Grimoire', 'Persona', 'Academy']) await visit(`prep/${t}`, tab(t));

  check(`a bare ${kind} leaves every screen standing`, [blank, p.errors], [[], []]);
  await ctx.close();
}

await b.close();
console.log(`\n> ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
