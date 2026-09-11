// VERIFIER probe 9 — MY OWN hostile-but-legal shapes only (probe 4's second half),
// re-run to completion after probe 4 was cut short.
import { chromium, serveDist, DIST, PHONE, goScreen, settle, SCREENS, importFile } from './rig.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PORT = 5419;
const tmp = mkdtempSync(join(tmpdir(), 'vfy9-'));
const wr = (n, o) => { const p = join(tmp, n); writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o)); return p; };

const SKELETON = { name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 } };

const MINE = {
  'null in features array': { features: [null] },
  'spell level = null': { spells: [{ name: 'Bless', level: null }] },
  'spell level = string': { spells: [{ name: 'Bless', level: '1st' }] },
  'equipment = strings': { equipment: ['Rope', 'Torch'] },
  'hitPoints = number': { hitPoints: 67 },
  'hitPoints null members': { hitPoints: { max: null, current: null } },
  'abilityScores = strings': { abilityScores: { STR: '18', DEX: '10' } },
  'persona = null': { persona: null },
  'weapon.properties = string': { weapons: [{ name: 'Sword', properties: 'finesse' }] },
  'spell.description = object': { spells: [{ name: 'Bless', level: 1, description: { text: 'x' } }] },
  'identity.traits = null': { identities: [{ name: 'Ash', traits: null }] },
  'empty object in customConditions': { customConditions: [{}] },
  'level = 0': { level: 0 },
  'negative current HP': { hitPoints: { max: 67, current: -12 } },
  'null in weapons array': { weapons: [null] },
  'null in identities array': { identities: [null] },
};

const BOUNDARY = /(\bstopped\b[\s\S]{0,80}rest of the app is still running)|something went wrong|try again/i;
const CHROME = {
  'play/Combat': [/ACTION ECONOMY/i, /HIT POINTS/i], 'play/Grimoire': [/Grimoire/i],
  'play/Roleplay': [/Perform|Catchphrase|Dialogue/i], 'prep/Character': [/Ability Scores/i],
  'prep/Grimoire': [/Session Status|Lock & Load/i], 'prep/Persona': [/Persona Engine|Identity/i],
  'prep/Academy': [/ROLEPLAY COACH|Training/i],
};

const srv = await serveDist(DIST, PORT);
const b = await chromium.launch();

async function run(label, obj) {
  const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).split('\n')[0].slice(0,180)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text().slice(0,180)); });
  await page.addInitScript(() => { window.__rej = [];
    addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason).slice(0,180))); });
  await page.goto(srv.url, { waitUntil: 'networkidle' });
  const f = wr(label.replace(/\W/g,'_') + '.json', { ...SKELETON, ...obj });
  await importFile(page, f);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const problems = [];
  for (const s of SCREENS) {
    await goScreen(page, s);
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g,' ').trim();
    if (t.length < 40) problems.push(`${s.id}: BLANK`);
    if (BOUNDARY.test(t)) problems.push(`${s.id}: BOUNDARIED "${t.match(BOUNDARY)[0].slice(0,80)}"`);
    const miss = (CHROME[s.id]||[]).filter(re => !re.test(t));
    if (miss.length) problems.push(`${s.id}: HOLLOW(${miss.join(',')})`);
  }
  const rej = await page.evaluate(() => { const r = window.__rej || []; window.__rej = []; return r; }).catch(()=>[]);
  errs.push(...rej.map(r => 'REJECTION: ' + r));
  await ctx.close();
  return { problems, errs };
}

let badM = 0;
console.log('=== MY OWN hostile-but-legal shapes (probe 4 continued) ===');
for (const [k, v] of Object.entries(MINE)) {
  const { problems, errs } = await run(k, v);
  const bad = problems.length || errs.length;
  if (bad) badM++;
  console.log(`  ${bad ? 'FAULT' : '  ok '}  ${k}`);
  [...problems, ...errs].forEach(x => console.log('          ' + x));
}
console.log(`\nSUMMARY: mine ${Object.keys(MINE).length} → ${badM} faulted.`);
await b.close(); await srv.close();
