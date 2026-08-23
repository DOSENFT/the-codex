// Scratch: what does the known-broken build actually do, and with which file?
// P-0.1 said the harness passed it. Either the harness is blind or the build is
// not broken for that input. Find out which, by looking.
import { freshCtx, goScreen, SCREENS, importFile, judge } from './rig.mjs';
import { serveDist, BROKEN_DIST } from './selftest.mjs';
import { realCopy, write } from './families.mjs';

const SKELETON = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};
const CASES = {
  'real thin': realCopy('thin'),
  'real full': realCopy('full'),
  'bare weapon': write('b-weapon.json', { ...SKELETON, weapons: [{ name: 'Longsword' }] }),
  'bare spell': write('b-spell.json', { ...SKELETON, spells: [{ name: 'Bless' }] }),
  'bare feature': write('b-feature.json', { ...SKELETON, features: [{ name: 'Lay on Hands' }] }),
  'persona {}': write('b-persona.json', { ...SKELETON, persona: {} }),
  'bare identity': write('b-identity.json', { ...SKELETON, identities: [{ name: 'Ash' }] }),
  'one of everything': write('b-all.json', {
    ...SKELETON, weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }],
    equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }],
    features: [{ name: 'Lay on Hands' }], identities: [{ name: 'Ash' }], persona: {},
  }),
};

const CHROME = {
  'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i],
  'play/Grimoire': [/Grimoire/i],
  'play/Roleplay': [/Perform|Catchphrase|Dialogue/i],
  'prep/Character': [/Ability Scores/i],
  'prep/Grimoire': [/Session Status|Lock & Load/i],
  'prep/Persona': [/Persona Engine|Identity/i],
  'prep/Academy': [/ROLEPLAY COACH|Training/i],
};

const which = process.argv.includes('--head') ? 'HEAD' : 'BROKEN';
const srv = which === 'BROKEN' ? await serveDist(BROKEN_DIST, 4199) : null;
const base = srv ? srv.url : 'http://localhost:4173/the-codex/';
const { chromium } = await import('./rig.mjs');
const b = await chromium.launch();

for (const [label, file] of Object.entries(CASES)) {
  const { ctx, page } = await freshCtx(b, { base });
  let note = '';
  try {
    await importFile(page, file);
    const rows = [];
    for (const s of SCREENS) {
      await goScreen(page, s);
      const { text, faults } = await judge(page, { needs: CHROME[s.id] || [] });
      rows.push(`${s.id.padEnd(16)} ${String(text.length).padStart(5)}ch ${faults.length ? '\x1b[31m' + faults.join(' | ').slice(0, 150) + '\x1b[0m' : ''}`);
    }
    note = '\n    ' + rows.join('\n    ');
  } catch (e) { note = ' HARNESS: ' + String(e).slice(0, 200); }
  console.log(`\n\x1b[1m[${which}] ${label}\x1b[0m${note}`);
  await ctx.close();
}
await b.close();
if (srv) await srv.close();
