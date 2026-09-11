// Weapon.properties was one landmine. Is it the only one? Same question, asked
// of every nested shape an old export can arrive thin: a persona with a key
// missing, a spell with only a name, a feature with only a name, an equipment
// line with only a name. Each is imported alone, then reloaded, then every
// screen is visited — because the crash of 2026-08-17 was on a screen, not on
// import.
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

const dir = mkdtempSync(join(tmpdir(), 'codex-nested-'));
const base = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};
const CASES = {
  'bare weapon': { weapons: [{ name: 'Longsword' }] },
  'bare spell': { spells: [{ name: 'Bless' }] },
  'bare feature': { features: [{ name: 'Lay on Hands' }] },
  'bare equipment': { equipment: [{ name: 'Rope' }] },
  'empty persona': { persona: {} },
  'partial persona': { persona: { voice: 'warm', mannerisms: undefined } },
  'bare feat': { feats: [{ name: 'Sentinel' }] },
  'bare pool': { resourcePools: [{ name: 'Hearth Embers' }] },
  'bare identity': { identities: [{ name: 'The Ashen Knight' }] },
  'bare condition': { customConditions: [{ name: 'Emberburn' }] },
  'bare hook': { customHooks: [{ name: 'A debt unpaid' }] },
  'bare supply': { supplies: [{ name: 'Rations' }] },
};

const b = await chromium.launch();
for (const [label, extra] of Object.entries(CASES)) {
  const file = join(dir, `case-${label.replace(/\W/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ ...base, ...extra }));

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto('http://localhost:4173/the-codex/', { waitUntil: 'networkidle' });

  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: /Import Character/i }).click();
  await (await chooser).setFiles(file);
  await p.waitForTimeout(700);
  const gate = p.getByRole('button', { name: /^Import anyway$/ });
  if (await gate.count()) { await gate.click(); await p.waitForTimeout(600); }
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  // Walk the app. A thin shape usually kills the screen that renders it, not boot.
  const visited = [];
  const visit = async (label, go) => {
    await go().catch(() => {});
    await p.waitForTimeout(350);
    const t = (await p.evaluate(() => document.body.innerText)).trim();
    visited.push(`${label}${t.length < 40 ? ':BLANK' : ''}`);
  };
  const tab = name => () => p.getByRole('tab', { name, exact: true }).click();
  for (const t of ['Combat', 'Grimoire', 'Roleplay']) await visit(`play/${t}`, tab(t));
  await p.getByRole('button', { name: 'Switch to prep mode' }).click().catch(() => {});
  await p.waitForTimeout(300);
  for (const t of ['Character', 'Grimoire', 'Persona', 'Academy']) await visit(`prep/${t}`, tab(t));
  const blank = visited.filter(v => v.endsWith(':BLANK'));
  const bad = errs.length || blank.length;
  console.log(`${bad ? 'CRASH' : 'ok   '}  ${label.padEnd(18)} ${bad ? `${errs[0] ?? ''} ${blank.join(',')}` : `(${visited.length} screens clean)`}`);
  await ctx.close();
}
await b.close();
