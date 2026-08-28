// SLICE 3 PROOF — what is actually in the browser's storage.
//
//   node docs/plans/sheet-truth/_probe-disk.mjs [url] [tag]
//
// Slice 3's visible change is nothing, deliberately, and that is a problem for
// a phase whose standing rule is "prove it on the screen". `_probe-follow.mjs`
// already shows the right numbers being painted — but it showed that after
// slice 2 as well, and it would keep showing it if slice 3 had never happened.
// A probe that cannot tell slice 2 from slice 3 is not a proof of slice 3.
//
// So this one looks where the change actually is. `storable.test.ts` makes the
// same claim against a fake localStorage in Node; this makes it against the real
// one, in a real Chrome, after a real edit through the real UI — because the
// interesting failure mode is a write path nobody remembered, and a unit test
// only ever checks the paths it calls.
//
// THE CLAIM: after Marcus edits his Charisma in Prep, the record in
// localStorage contains none of `spellSaveDC`, `spellAttackBonus`,
// `proficiencyBonus`, `maxPreparedSpells` — and does contain the demoted
// `spellSaveDCOverride`, because the number he had is kept, just no longer
// believed.
//
// KEYS, NEVER SUBSTRINGS. `"spellSaveDC"` is a prefix of
// `"spellSaveDCOverride"`, so a `.includes()` over the serialised text reports a
// failure that is not there — which is finding Q, in the measuring tool again.
// The first draft of the unit test did exactly that. Parse, then look at keys.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4220/the-codex/').replace(/\/?$/, '/');
const TAG = process.argv[3] || 'slice3';
const OUT = `${dirname(fileURLToPath(import.meta.url))}/shots`;
const NIX = await loadNix();

const DERIVED = ['spellSaveDC', 'spellAttackBonus', 'proficiencyBonus', 'maxPreparedSpells'];

/* Marcus's sheet exactly as an older build left it: Charisma 16 sitting beside
 * the Charisma-18 answers. This is the file that produced the bug report. */
const STALE = {
  ...NIX, level: 7, armorClass: 18, hitPoints: { max: 67, current: 67 },
  tempHP: 0, tempHPSource: null, proficiencyBonus: 3,
  spellSaveDC: 15, spellAttackBonus: 7, maxPreparedSpells: 5,
  abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
  skillProficiencies: ['Athletics', 'Persuasion'],
  paladinResources: { layOnHands: { max: 35, current: 35 }, channelDivinity: { max: 2, current: 2 }, auraRange: 10 },
};

/** Every stored character record, as parsed objects. */
const readDisk = () => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('codex-character-')) continue;
    try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { out[k] = null; }
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  hasTouch: true, reducedMotion: 'reduce',
});
// Seed once — `addInitScript` runs before every document, and re-seeding on the
// reload would overwrite the very thing being measured.
await ctx.addInitScript(seed => {
  if (localStorage.getItem('probe-seeded')) return;
  localStorage.setItem('probe-seeded', '1');
  localStorage.setItem('codex-character', seed);
}, JSON.stringify(STALE));
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

/* ── after boot: the legacy record has been migrated into a per-id one ── */
const afterBoot = await page.evaluate(readDisk);

/* ── an edit through the real UI, which is what triggers a save ───────── */
// Attribute selectors, not getByRole — see finding BH in 00-status.md: two
// permanently-mounted `aria-modal` dialogs take the tab bar out of the
// accessibility tree.
const tap = sel => page.locator(sel).first().click();
await tap('button[aria-label="Switch to prep mode"]');
await page.waitForTimeout(400);
await tap('button[aria-label="Character"]');
await page.waitForTimeout(500);

const tagged = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if (b.getAttribute('aria-label')) continue;
    const first = b.firstElementChild;
    if (first && first.children.length === 0 && (first.textContent || '').trim() === 'CHA') {
      b.setAttribute('data-probe', 'cha-tile');
      return true;
    }
  }
  return false;
});
if (!tagged) { console.error('FAILED: no CHA tile found in Prep'); await browser.close(); process.exit(1); }
await page.click('[data-probe="cha-tile"]');
await page.waitForTimeout(300);
const input = page.locator('[data-probe="cha-tile"] input[type="number"]');
await input.waitFor({ state: 'visible', timeout: 3000 });
await input.fill('16');
await input.press('Enter');
await page.waitForTimeout(600);

const afterEdit = await page.evaluate(readDisk);
await page.screenshot({ path: `${OUT}/slice3-prep-after-edit-${TAG}.png` });

await tap('button[aria-label="Switch to session mode"]');
await page.waitForTimeout(400);
await tap('button[aria-label="Combat"]');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/slice3-combat-${TAG}.png` });

/* ── verdict ──────────────────────────────────────────────────────────── */
let failures = 0;
const report = (label, disk) => {
  console.log(`\n=== ${label} ===`);
  const records = Object.entries(disk);
  if (!records.length) { console.log('  (no character records)'); failures++; return; }
  for (const [key, rec] of records) {
    if (!rec) { console.log(`  ${key}: UNREADABLE`); failures++; continue; }
    const present = DERIVED.filter(d => Object.prototype.hasOwnProperty.call(rec, d));
    const overrides = Object.keys(rec).filter(k => k.endsWith('Override'));
    console.log(`  ${key}`);
    console.log(`    derived keys present : ${present.length ? present.join(', ') : '(none)'}`);
    console.log(`    overrides kept       : ${overrides.length ? overrides.map(o => `${o}=${rec[o]}`).join(', ') : '(none)'}`);
    console.log(`    CHA on the file      : ${rec.abilityScores?.CHA}`);
    if (present.length) failures += present.length;
  }
};

report('AFTER BOOT — the legacy record, migrated', afterBoot);
report('AFTER THE EDIT — Charisma set to 16 in Prep', afterEdit);

console.log(`\nDERIVED KEYS ON DISK: ${failures}   (target: 0)`);
console.log('A key that does not exist cannot be stale. That is the whole slice.');
await browser.close();
process.exit(failures === 0 ? 0 : 1);
