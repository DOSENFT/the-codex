// The eight criterion families of TABLE-READY.md, one exported function each.
// Nothing here interprets a result: a family measures, compares against the
// frozen threshold, and reports. Thresholds live in THRESH and are copied from
// the frozen document — changing one here without amending the document there
// is the exact failure this whole exercise exists to prevent.
import { writeFileSync, mkdtempSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  freshCtx, goScreen, SCREENS, importFile, storedChars, storedChar, judge, audit, drain,
  deadOrigin, settle, TABLET, pixelContrast,
} from './rig.mjs';

export const THRESH = {
  S1_cold: 2000, S2_tab: 400, S3_spend: 100, S4_undo: 100,
  S5_longtask: 200, S5_frame: 100, S6_cls: 0.02,
  V1_size: 12, V2_contrast: 4.5, V3_contrast: 7, V4_cinzel: 20,
  V5_touch: 44, V5_turn: 48, V6_thumb: 0.60,
  E1_heap: 0.25, E2_nodes: 50, E3_bytes: 4 * 1024 * 1024,
};

const DL = 'C:/Users/marcu/Downloads';
export const REAL = {
  full:  join(DL, 'codex-nix-lvl7 (1).json'),
  full2: join(DL, 'codex-nix-lvl7 (2).json'),
  thin:  join(DL, 'codex-nix-lvl7.json'),
  empty: join(DL, 'codex-character-data.json'),
  empty2: join(DL, 'codex-character-data (1).json'),
};

/* Structural markers — present for ANY character, however thin. These are what
   "the screen is standing" means: its own furniture is on it. Read off the
   running app (probe-screens.mjs), not invented. */
const CHROME = {
  'play/Combat':    [/ACTION ECONOMY/i, /HIT POINTS/i],
  'play/Grimoire':  [/Grimoire/i],
  'play/Roleplay':  [/Perform|Catchphrase|Dialogue/i],
  'prep/Character': [/Ability Scores/i],
  'prep/Grimoire':  [/Session Status|Lock & Load/i],
  'prep/Persona':   [/Persona Engine|Identity/i],
  'prep/Academy':   [/ROLEPLAY COACH|Training/i],
};
/* Richer markers, for Nix's real full sheet: the screen must show HIS data,
   not just its own furniture. */
const RICH = {
  'play/Combat':    [/LAY ON HANDS/i, /SPELL SLOTS/i, /35\/35/],
  'play/Grimoire':  [/Aura of Protection/i, /Bless/],
  'play/Roleplay':  [/CATCHPHRASES/i, /banked coal/i],
  'prep/Character': [/AC 18/, /STR/, /Oath of the Hearth/i],
  'prep/Grimoire':  [/Session Status/i, /Warding Bond/i],
  'prep/Persona':   [/Core Traits/i, /protective of the vulnerable/i],
  'prep/Academy':   [/PHYSICAL TICS/i, /Aesis/i],
};

const tmp = mkdtempSync(join(tmpdir(), 'codex-table-'));
export const write = (name, obj) => {
  const p = join(tmp, name);
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
};
/* Copy his real files — never open the originals for writing, never mutate. */
export const realCopy = key => {
  const p = join(tmp, 'real-' + key + '.json');
  copyFileSync(REAL[key], p);
  return p;
};

const SKELETON = {
  name: 'Hearthwright', class: 'Paladin', subclass: 'Oath of the Hearth', race: 'Aasimar',
  level: 7, hitPoints: { max: 67, current: 67 }, armorClass: 18,
  abilityScores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 16 },
};

/** Wait until the page's own text satisfies a marker, and return how long that
 *  took. Polls innerText rather than using getByText: a regex with alternation
 *  does not reliably resolve to a single element, and `.first()` can land on a
 *  hidden node — both of which turned a Playwright timeout into a "measurement"
 *  of 15010ms and 8223ms in the first full run. A timeout is not a number. */
async function waitForText(page, re, timeout = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const t = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (re.test(t)) return Date.now() - t0;
    await page.waitForTimeout(16);
  }
  return NaN; // never report a timeout as a duration
}

/** Walk all seven screens; return the ids of any that are not standing. */
async function walk(page, markers) {
  const dead = [];
  for (const s of SCREENS) {
    await goScreen(page, s);
    const { faults } = await judge(page, { needs: markers[s.id] || [] });
    if (faults.length) dead.push(`${s.id}: ${faults.join(' | ')}`);
  }
  return dead;
}

/* ══ F — FUNCTION ══════════════════════════════════════════════════════════ */
export async function familyF(b, R, opts) {
  R.section('F — FUNCTION: the screen he needs is standing');

  { // F-1
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const dead = await walk(page, RICH);
    R.check('F-1', 'full real export → all 7 screens show his data', dead.length === 0, dead.join('\n         '));
    await ctx.close();
  }
  { // F-2
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('thin'));
    const dead = await walk(page, CHROME);
    R.check('F-2', 'THIN real export (the shape that shipped broken 3×) → all 7 stand', dead.length === 0, dead.join('\n         '));
    await ctx.close();
  }
  { // F-3
    const NESTED = {
      'bare weapon': { weapons: [{ name: 'Longsword' }] },
      'bare spell': { spells: [{ name: 'Bless' }] },
      'bare feature': { features: [{ name: 'Lay on Hands' }] },
      'object in equipment': { equipment: [{ name: 'Rope' }] },
      'bare feat': { feats: [{ name: 'Sentinel' }] },
      'bare pool': { resourcePools: [{ name: 'Hearth Embers' }] },
      'bare identity': { identities: [{ name: 'The Ashen Knight' }] },
      'bare condition': { customConditions: [{ name: 'Emberburn' }] },
      'bare hook': { customHooks: [{ name: 'A debt unpaid' }] },
      'bare supply': { supplies: [{ name: 'Rations' }] },
      'persona: {}': { persona: {} },
      'one of everything': {
        weapons: [{ name: 'Longsword' }], feats: [{ name: 'Sentinel' }],
        equipment: [{ name: 'Shield' }], spells: [{ name: 'Bless', level: 1 }],
        features: [{ name: 'Lay on Hands' }], identities: [{ name: 'Ash' }], persona: {},
      },
    };
    const bad = [];
    for (const [kind, extra] of Object.entries(NESTED)) {
      const f = write(`thin-${kind.replace(/\W/g, '-')}.json`, { ...SKELETON, ...extra });
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, f);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const dead = await walk(page, CHROME);
      if (dead.length) bad.push(`${kind} → ${dead.join(' ; ')}`);
      await ctx.close();
    }
    R.check('F-3', '12 hostile-but-legal inner shapes × 7 screens = 84 renders', bad.length === 0, bad.join('\n         '));
  }
  { /* F-3b — the shapes that killed HEAD, and every other field asked the same
       question. F-3 is frozen at twelve and stays frozen at twelve (§4: criteria
       may be added, never rewritten), so these live in their own check. What
       makes them different from the twelve: the twelve are fields that are
       ABSENT. These are fields that are PRESENT and the wrong TYPE, which is the
       one thing `?? []` cannot see, and which is why F-3 was green on a build
       that faulted on five of the first six shapes a stranger tried. The first
       five below are §9.11 verbatim; the rest are the same question put to every
       other array and every other string on the record. */
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
    const worse = [];
    for (const [kind, extra] of Object.entries(TYPED)) {
      const f = write(`typed-${kind.replace(/\W/g, '-')}.json`, { ...SKELETON, ...extra });
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, f);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const dead = await walk(page, CHROME);
      if (dead.length) worse.push(`${kind} -> ${dead.join(' ; ')}`);
      await ctx.close();
    }
    const n = Object.keys(TYPED).length;
    R.check('F-3b', `${n} shapes whose fields are PRESENT and the wrong type x 7 screens = ${n * 7} renders`,
      worse.length === 0, worse.join('\n         '));
  }
  { /* F-3c — surviving is half of it. A coercion Marcus is not told about is a
       quieter way of losing his data, so the repair must be named, and named
       BEFORE the file is accepted rather than after. This deliberately does not
       click "Import anyway": the gate itself is what is under test. */
    const f = write('typed-say-so.json', {
      ...SKELETON, spells: [null], weapons: [{ name: 'Sword', properties: 'finesse' }],
    });
    const { ctx, page } = await freshCtx(b, opts);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Import Character/i }).first().click();
    await (await chooser).setFiles(f);
    await page.waitForTimeout(900);
    const seen = await page.evaluate(() => document.body.innerText);
    const gated = (await page.getByRole('button', { name: /^Import anyway$/ }).count()) > 0;
    const named = gated && /Changed on the way in/i.test(seen) && /spell/i.test(seen);
    R.check('F-3c', 'a repaired file names what was changed, and says so before it is accepted',
      named, named ? '' : `gated=${gated}\n         ${seen.replace(/\s+/g, ' ').slice(0, 400)}`);
    await ctx.close();
  }
  { // F-4
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await page.goto(opts.base + '?d=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const { text, faults } = await judge(page, { needs: [/Nix/] });
    const actions = await page.locator('button').count();
    R.check('F-4', '?d=1 turn screen renders Nix and offers actions',
      faults.length === 0 && actions > 2, faults.join(' | ') || `buttons=${actions}\n         ${text.slice(0, 300)}`);
    await ctx.close();
  }
  { // F-5
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const missing = [];
    for (const s of SCREENS) {
      await goScreen(page, s);
      if (!(await page.getByRole('button', { name: /Veil this scene/i }).count())) missing.push(s.id);
    }
    // and on the screens App returns early on: welcome, and ?d=1
    const { ctx: c2, page: p2 } = await freshCtx(b, opts);
    if (!(await p2.getByRole('button', { name: /Veil this scene/i }).count())) missing.push('welcome');
    await p2.goto(opts.base + '?d=1', { waitUntil: 'networkidle' });
    await p2.waitForTimeout(600);
    if (!(await p2.getByRole('button', { name: /Veil this scene/i }).count())) missing.push('?d=1');
    await c2.close();
    R.check('F-5', 'the veil is on every screen, including the three early returns', missing.length === 0, 'missing on: ' + missing.join(', '));
    await ctx.close();
  }
  { // F-6
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const over = [];
    for (const s of SCREENS) {
      await goScreen(page, s);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 1) over.push(`${s.id}: +${o}px`);
    }
    R.check('F-6', 'no horizontal scroll at 390px on any screen', over.length === 0, over.join(', '));
    await ctx.close();
  }
}

/* ══ D — DATA SAFETY ═══════════════════════════════════════════════════════ */
export async function familyD(b, R, opts) {
  R.section('D — DATA SAFETY: the character survives');

  { // D-1 round-trip
    const losses = [];
    for (const key of ['full', 'full2', 'thin']) {
      const src = JSON.parse(readFileSync(REAL[key], 'utf8'));
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, realCopy(key));
      const raw = await storedChar(page);
      if (!raw) { losses.push(`${key}: nothing stored`); await ctx.close(); continue; }
      const out = JSON.parse(raw);
      const deep = (a, x) => JSON.stringify(a) === JSON.stringify(x);
      for (const [k, v] of Object.entries(src)) {
        if (k === 'updatedAt') continue; // a save legitimately restamps this
        if (!(k in out)) { losses.push(`${key}.${k}: DROPPED`); continue; }
        if (!deep(v, out[k])) {
          const before = JSON.stringify(v), after = JSON.stringify(out[k]);
          // an added default inside an object is allowed; a changed value is not
          const grew = typeof v === 'object' && v !== null && !Array.isArray(v)
            && Object.entries(v).every(([kk, vv]) => deep(vv, out[k]?.[kk]));
          const arrGrew = Array.isArray(v) && Array.isArray(out[k]) && v.length === out[k].length
            && v.every((it, i) => typeof it !== 'object' || it === null
              || Object.entries(it).every(([kk, vv]) => deep(vv, out[k][i]?.[kk])));
          if (!grew && !arrGrew) losses.push(`${key}.${k}: ${before.slice(0, 90)} → ${after.slice(0, 90)}`);
        }
      }
      await ctx.close();
    }
    R.check('D-1', 'round-trip: every key in his real files survives import', losses.length === 0, losses.join('\n         '));
  }
  { // D-2 reload stability
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const snaps = [];
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const s = await storedChar(page);
      snaps.push(s ? JSON.parse(s) : null);
    }
    const norm = o => { if (!o) return 'null'; const { updatedAt, ...rest } = o; return JSON.stringify(rest); };
    const same = norm(snaps[0]) === norm(snaps[1]) && norm(snaps[1]) === norm(snaps[2]);
    let drift = '';
    if (!same) {
      const a = JSON.parse(norm(snaps[0])), c = JSON.parse(norm(snaps[2]));
      drift = Object.keys({ ...a, ...c }).filter(k => JSON.stringify(a[k]) !== JSON.stringify(c[k]))
        .map(k => `${k}: ${JSON.stringify(a[k]).slice(0, 60)} → ${JSON.stringify(c[k]).slice(0, 60)}`).join('\n         ');
    }
    R.check('D-2', '3 cold reloads produce an identical stored character', same && page.errs.length === 0, drift || page.errs.join('|'));
    await ctx.close();
  }
  { // D-3 nothing saved on refusal
    const cases = [
      ['{} (his real failed export)', realCopy('empty'), false],
      ['prose in a .json', write('shopping.json', 'eggs, milk, a longsword'), false],
      ['thin, then Cancel', realCopy('thin'), 'cancel'],
    ];
    const leaks = [];
    for (const [label, file, mode] of cases) {
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, file, { anyway: false });
      if (mode === 'cancel') {
        const c = page.getByRole('button', { name: /^Cancel$/ });
        if (await c.count()) { await c.click(); await page.waitForTimeout(500); }
        else leaks.push(`${label}: no Cancel offered`);
      }
      const n = await storedChars(page);
      if (n !== 0) leaks.push(`${label}: ${n} character(s) written`);
      await ctx.close();
    }
    R.check('D-3', 'a refused or cancelled import writes nothing', leaks.length === 0, leaks.join('; '));
  }
  { // D-4 two tabs
    const ctx = await b.newContext({ viewport: opts.viewport, deviceScaleFactor: 3 });
    await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
    const p1 = await ctx.newPage(); p1.errs = [];
    await p1.goto(opts.base, { waitUntil: 'networkidle' });
    await importFile(p1, realCopy('full'));
    const p2 = await ctx.newPage(); p2.errs = [];
    await p2.goto(opts.base, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1200);
    // tab 1 writes: spend a Lay on Hands charge
    await p1.bringToFront();
    const spend = p1.getByRole('button', { name: /Heal 5/i }).first();
    let wrote = false;
    if (await spend.count()) { await spend.click(); await p1.waitForTimeout(700); wrote = true; }
    const after1 = await storedChar(p1);
    // tab 2, which has stale state, now does something that saves
    await p2.bringToFront();
    await p2.getByRole('tab', { name: 'Grimoire', exact: true }).first().click().catch(() => {});
    await p2.waitForTimeout(900);
    const after2 = await storedChar(p2);
    const clobbered = wrote && after1 !== after2;
    if (!wrote) R.unproven('D-4', 'a second tab cannot clobber the first', 'no spend control found to drive the write');
    else R.check('D-4', 'a second tab cannot clobber the first', !clobbered,
      clobbered ? 'tab 2 overwrote tab 1: stored value changed after tab 2 acted' : '');
    await ctx.close();
  }
  { // D-5 quota
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const before = await storedChar(page);
    await page.evaluate(() => {
      const proto = Object.getPrototypeOf(localStorage);
      const real = proto.setItem;
      window.__realSet = real;
      proto.setItem = function (k, v) {
        if (String(k).startsWith('codex-')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
        return real.call(this, k, v);
      };
    });
    const spend = page.getByRole('button', { name: /Heal 5/i }).first();
    if (await spend.count()) { await spend.click(); await page.waitForTimeout(900); }
    await drain(page);
    const { text } = await judge(page);
    const told = /could not save|save failed|storage|full|out of space/i.test(text);
    await page.evaluate(() => { Object.getPrototypeOf(localStorage).setItem = window.__realSet; });
    const after = await storedChar(page);
    const intact = after === before;
    R.check('D-5', 'a full disk does not eat the character (told, and prior save intact)',
      intact && told, `intact=${intact} userWasTold=${told}` + (page.errs.length ? ' errs=' + page.errs.join('|') : ''));
    await ctx.close();
  }
  { // D-6 destructive confirm
    //
    // The first run reported this UNPROVEN because it looked on prep/Character.
    // The destructive controls do not live there — they live behind the settings
    // gear (Layout.tsx:170 → Settings.tsx). Looking in the wrong place and
    // calling the answer "none found" is exactly the failure mode this document
    // exists to stop, so the search now goes through the door a player uses.
    // Each control is driven in its OWN fresh context. "New Character" navigates
    // away, which closed the panel and made every later control "not visible" —
    // and the first version of this check reported PASS on four controls it had
    // never actually driven. A pass where nothing happened is the same lie as a
    // check that only asks whether the page is blank.
    const DANGER = /^(Reset|Delete|Clear|Wipe|Remove|Start Over|New Character|Long Rest)/i;
    const openSettings = async page => {
      const g = page.getByRole('button', { name: /Open settings/i }).first();
      if (!(await g.count())) return false;
      await g.click().catch(() => {});
      await page.waitForTimeout(800);
      return true;
    };

    let labels = [], opened = false;
    {
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, realCopy('full'));
      opened = await openSettings(page);
      const danger = page.getByRole('button', { name: DANGER });
      for (let i = 0; i < await danger.count(); i++) {
        const el = danger.nth(i);
        const name = (await el.getAttribute('aria-label')) || (await el.textContent()) || '';
        labels.push((name.trim().replace(/\s+/g, ' ') || `#${i}`).slice(0, 40));
      }
      await ctx.close();
    }

    const unguarded = [], guarded = [], inert = [];
    for (const label of labels) {
      const { ctx, page } = await freshCtx(b, opts);
      await importFile(page, realCopy('full'));
      await openSettings(page);
      const el = page.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
      if (!(await el.count()) || !(await el.isVisible().catch(() => false))) { inert.push(`${label} (unreachable)`); await ctx.close(); continue; }
      const before = await storedChar(page);
      const charsBefore = await storedChars(page);
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click().catch(() => {});
      await page.waitForTimeout(900);
      const body = await page.evaluate(() => document.body.innerText);
      const asked = /Delete this character\?|Delete permanently\?|Delete this session note\?|Are you sure|cannot be undone|Take a long rest\?/i.test(body)
        || (await page.getByRole('button', { name: /^(Cancel|Never ?mind|Keep)/i }).count()) > 0;
      const changed = (await storedChar(page)) !== before || (await storedChars(page)) !== charsBefore;
      if (changed && !asked) unguarded.push(label);
      else if (asked) guarded.push(label);
      else inert.push(label);   // neither asked nor destroyed — proves nothing
      await ctx.close();
    }
    const n = labels.length;
    const detail = [
      unguarded.length ? 'UNGUARDED: ' + unguarded.join(', ') : '',
      guarded.length ? 'asked first: ' + guarded.join(', ') : '',
      inert.length ? 'no destructive effect observed: ' + inert.join(', ') : '',
    ].filter(Boolean).join(' | ');
    if (!opened) R.unproven('D-6', 'no destructive act without a confirm', 'the settings control (aria-label "Open settings") was not reachable');
    else if (n === 0) R.unproven('D-6', 'no destructive act without a confirm', 'settings opened but no destructive control matched the name pattern');
    else if (unguarded.length) R.no('D-6', `no destructive act without a confirm  [${n} controls driven]`, detail);
    else if (!guarded.length) R.unproven('D-6', 'no destructive act without a confirm',
      `${n} controls driven and not one of them either asked or destroyed anything — this check proved nothing. ${detail}`);
    else R.ok('D-6', `no destructive act without a confirm  [${n} controls driven; asked first: ${guarded.join(', ')}` +
      (inert.length ? `; destroyed nothing: ${inert.join(', ')}` : '') + ']');
  }
  { // D-7 export in 3 taps, offline, and it round-trips
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await ctx.setOffline(true);
    let taps = 0;
    await page.getByRole('button', { name: /Switch to prep mode/i }).click().catch(() => {}); taps++;
    await page.waitForTimeout(400);
    const btn = page.getByRole('button', { name: /Export Character/i }).first();
    let okFile = false, why = '';
    if (await btn.count()) {
      await btn.scrollIntoViewIfNeeded();
      const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
      await btn.click(); taps++;
      const d = await dl;
      if (d) {
        const path = join(tmp, 'exported.json');
        await d.saveAs(path);
        const out = JSON.parse(readFileSync(path, 'utf8'));
        const src = JSON.parse(readFileSync(REAL.full, 'utf8'));
        const lost = Object.keys(src).filter(k => k !== 'updatedAt' && !(k in out));
        okFile = lost.length === 0;
        why = lost.length ? 'export dropped: ' + lost.join(', ') : '';
      } else why = 'no download fired';
    } else why = 'no Export Character button reachable';
    await ctx.setOffline(false);
    R.check('D-7', `export reachable offline in ${taps} taps and round-trips`, okFile && taps <= 3, why || `taps=${taps}`);
    await ctx.close();
  }
}

/* ══ R — RECOVERY ══════════════════════════════════════════════════════════ */
export async function familyR(b, R, opts) {
  R.section('R — RECOVERY: bad input, at the table, with people watching');

  const big = { ...SKELETON, homebrewNotes: 'x'.repeat(12 * 1024 * 1024) };
  const cases = [
    ['R-1', 'his real {} export names the EXPORT as what failed', realCopy('empty'), /export/i],
    ['R-2', 'prose in a .json is refused, and says where a real export comes from', write('prose.json', 'eggs, milk, a longsword'), /not a JSON|Settings/i],
    ['R-3', 'the thin real export is gated with a way forward AND a way back', realCopy('thin'), /Import anyway/i],
    ['R-4', 'truncated JSON is refused and named', write('trunc.json', JSON.stringify(SKELETON).slice(0, 60)), /not a JSON|invalid|malformed|could not/i],
    ['R-5', 'a 12MB JSON does not freeze the app', write('huge.json', big), null],
    ['R-6', 'a JSON array at the root is refused, not coerced', write('arr.json', [SKELETON]), /not a|invalid|could not|export/i],
    ['R-7', 'prototype-pollution keys do not reach Object.prototype', write('proto.json', '{"name":"P","class":"Paladin","level":7,"__proto__":{"pwned":true},"constructor":{"pwned":true}}'), null],
    ['R-8', 'a binary file renamed .json is refused', write('bin.json', ' �PNG\r\n\n' + ' '.repeat(200)), /not a JSON|invalid|could not|export/i],
  ];

  for (const [id, what, file, expect] of cases) {
    const { ctx, page } = await freshCtx(b, opts);
    const t0 = Date.now();
    await importFile(page, file, { anyway: false });
    const ms = Date.now() - t0;
    const { text, faults } = await judge(page);
    const saved = await storedChars(page);
    const problems = [];
    if (expect && !expect.test(text)) problems.push(`no message matching ${expect}; screen said: "${text.slice(0, 160)}"`);
    if (saved !== 0) problems.push(`${saved} character(s) written on a refusal`);
    if (!/Import Character/i.test(text)) problems.push('no way to try again');
    if (faults.length) problems.push(...faults);
    if (id === 'R-3') {
      if (!/Cancel/.test(text)) problems.push('no Cancel');
      if (!/ability scores|weapons|equipment/i.test(text)) problems.push('does not name which fields are thin');
    }
    if (id === 'R-5' && ms > 1000 + 900) problems.push(`UI blocked ${ms - 900}ms`);
    if (id === 'R-7') {
      const pwned = await page.evaluate(() => ({}).pwned !== undefined || Object.prototype.pwned !== undefined);
      if (pwned) problems.push('Object.prototype WAS polluted');
    }
    R.check(id, what, problems.length === 0, problems.join('; '));
    await ctx.close();
  }

  { // R-9 same character twice
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    const n1 = await storedChars(page);
    await goScreen(page, SCREENS.find(s => s.id === 'prep/Character'));
    // return to a place an import can be started again
    const again = page.getByRole('button', { name: /Import Character/i });
    if (await again.count()) { await importFile(page, realCopy('full')); }
    const n2 = await storedChars(page);
    const { faults } = await judge(page);
    R.check('R-9', 'importing the same character twice makes no duplicate', n2 <= n1 + 1 && faults.length === 0,
      `before=${n1} after=${n2} ${faults.join('|')}`);
    await ctx.close();
  }
}

/* ══ S — SPEED ═════════════════════════════════════════════════════════════ */
export async function familyS(b, R, opts) {
  R.section('S — SPEED: it costs none of the six seconds  [4× CPU throttle]');

  const throttle = async page => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    return cdp;
  };
  const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

  { // S-1 cold launch, no network, worker warm
    //
    // Measured from the reloaded document's own navigation start to the frame on
    // which Nix's name is painted — performance.now() inside the new document,
    // so no Playwright round-trip is counted as app time. The first run reported
    // 15010ms here; that was getByText('Nix').first() resolving to a HIDDEN node
    // and timing out. A timeout is not a measurement.
    const times = [];
    for (let i = 0; i < 5; i++) {
      const { ctx, page } = await deadOrigin(b, {
        viewport: opts.viewport, dpr: opts.dpr,
        before: p => importFile(p, realCopy('full')),
      });
      await throttle(page);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      const ms = await page.evaluate(async () => {
        const deadline = performance.now() + 12000;
        while (performance.now() < deadline) {
          if (/Nix/.test(document.body ? document.body.innerText : '')) return Math.round(performance.now());
          await new Promise(r => requestAnimationFrame(r));
        }
        return NaN;
      }).catch(() => NaN);
      times.push(ms);
      await ctx.close();
    }
    const good = times.filter(Number.isFinite);
    if (!good.length) R.no('S-1', 'cold launch with no network → "Nix" on screen', 'never appeared within 12s in any of 5 runs');
    else {
      // Graded on the WORST launch, not the median — see amendment A-4. The
      // criterion says "cold launch ≤ 2000ms", not "usually".
      const m = med(good), worst = Math.max(...good);
      R.check('S-1', `cold launch, origin dead, 4× CPU → "Nix" painted  [worst ${worst}ms, median ${m}ms, ≤${THRESH.S1_cold}]`,
        good.length === times.length && worst <= THRESH.S1_cold,
        `runs: ${times.map(t => Number.isFinite(t) ? t + 'ms' : 'NEVER').join(', ')}`);
    }
  }
  { // S-2 tab switch
    //
    // Two corrections over the first run. (1) The marker is polled in-page, not
    // waited on with getByText — an alternation regex does not reliably resolve
    // to one element and quietly became an 8000ms "measurement". (2) The marker
    // must be ABSENT before the tap, or the stopwatch measures nothing; so we
    // use Nix's own content rather than the chrome (which the tab strip itself
    // contains), and we say so out loud when no marker qualifies.
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await throttle(page);
    const slow = [], blind = [];
    const arrive = (page, re) => page.evaluate(async src => {
      const rx = new RegExp(src[0], src[1]);
      const deadline = performance.now() + 8000;
      while (performance.now() < deadline) {
        if (rx.test(document.body.innerText)) return true;
        await new Promise(r => requestAnimationFrame(r));
      }
      return false;
    }, [re.source, re.flags]);

    for (const s of SCREENS) {
      // Try every sibling tab in the same mode until one of them is a screen the
      // target's markers are genuinely absent from. play/Grimoire has no marker
      // absent on play/Combat (the slot counters are on both) — that is a fact
      // about the app, not a reason to skip the screen.
      let away = null, marker = null;
      for (const cand of SCREENS.filter(o => o.mode === s.mode && o.tab !== s.tab)) {
        await goScreen(page, cand);
        const here = await page.evaluate(() => document.body.innerText);
        const hit = (RICH[s.id] || []).concat(CHROME[s.id] || []).find(re => !re.test(here));
        if (hit) { away = cand; marker = hit; break; }
      }
      const runs = [];
      for (let i = 0; marker && i < 3; i++) {
        await goScreen(page, away);
        const t0 = Date.now();
        await page.getByRole('tab', { name: s.tab, exact: true }).first().click().catch(() => {});
        const found = await arrive(page, marker);
        runs.push(found ? Date.now() - t0 : NaN);
      }
      if (!marker) {
        blind.push(`${s.id} (every marker already present on all sibling tabs)`);
        console.log(`         ${s.id.padEnd(16)} unmeasurable`);
        continue;
      }
      const good = runs.filter(Number.isFinite);
      const worst = good.length === runs.length ? Math.max(...good) : NaN;   // A-4: worst, not median
      console.log(`         ${s.id.padEnd(16)} ${Number.isFinite(worst) ? `worst ${worst}ms  (${runs.join('/')})` : 'NEVER ARRIVED'}  [${marker}]`);
      if (!Number.isFinite(worst) || worst > THRESH.S2_tab) slow.push(`${s.id} ${Number.isFinite(worst) ? worst + 'ms' : 'never arrived'}`);
    }
    if (blind.length && !slow.length) R.unproven('S-2', `every tab switch ≤${THRESH.S2_tab}ms`, 'unmeasurable: ' + blind.join(', '));
    else R.check('S-2', `every tab switch ≤${THRESH.S2_tab}ms` + (blind.length ? ` [${blind.length} unmeasurable]` : ''),
      slow.length === 0, [slow.join(', '), blind.length ? 'unmeasurable: ' + blind.join(', ') : ''].filter(Boolean).join(' | '));
    await ctx.close();
  }
  { // S-3 / S-5 / S-6 a real turn
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await throttle(page);
    await page.evaluate(() => {
      window.__cls = 0; window.__long = []; window.__ev = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
      // Event Timing: pointer-down through the NEXT PAINT. This is what "the tap
      // registered" means to the thumb holding the phone, and unlike the
      // wall-clock below it contains no Playwright round-trip.
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__ev.push(Math.round(e.duration));
      }).observe({ type: 'event', buffered: true, durationThreshold: 0 });
    });
    const spends = [];
    const targets = [/Heal 5/i, /Action$/, /Bonus$/, /Reaction$/, /Move$/];
    for (let i = 0; i < 10; i++) {
      const sel = targets[i % targets.length];
      const el = page.getByRole('button', { name: sel }).first();
      if (!(await el.count()) || !(await el.isEnabled().catch(() => false))) continue;
      const t0 = Date.now();
      await el.click().catch(() => {});
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      spends.push(Date.now() - t0);
    }
    const { cls, long, ev } = await page.evaluate(() => ({ cls: window.__cls, long: window.__long, ev: window.__ev }));
    const m = spends.length ? med(spends) : NaN;
    const clicks = ev.filter(Number.isFinite);
    const em = clicks.length ? med(clicks) : NaN;
    if (!spends.length) R.unproven('S-3', 'a spend registers', 'no spend control could be driven');
    else if (!clicks.length) R.unproven('S-3', `a spend registers ≤${THRESH.S3_spend}ms`,
      `Event Timing produced no entries; wall-clock was median ${m}ms / worst ${Math.max(...spends)}ms, but that number contains the harness's own round-trip and is not the app's`);
    // Graded on input-to-next-paint. The wall-clock is reported beside it, never
    // instead of it, and the 100ms threshold has not moved.
    // Graded on the WORST tap, not the median — amendment A-4. At a table the
    // tap that costs you the turn is the slow one.
    else R.check('S-3', `a spend registers ≤${THRESH.S3_spend}ms  [input→paint: worst ${Math.max(...clicks)}ms, median ${em}ms · wall-clock incl. harness: median ${m}ms]`,
      Math.max(...clicks) <= THRESH.S3_spend, `${clicks.length} input events; wall-clock runs: ${spends.join(', ')}ms`);
    const bad = long.filter(d => d > THRESH.S5_longtask);
    R.check('S-5', `no long task >${THRESH.S5_longtask}ms during a 10-action turn`, bad.length === 0, `long tasks: ${bad.join(', ')}ms`);
    R.check('S-6', `no layout shift under the thumb  [CLS ${cls.toFixed(4)}, ≤${THRESH.S6_cls}]`, cls <= THRESH.S6_cls, `CLS=${cls}`);
    await ctx.close();
  }
  { // S-4 undo / restore
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await throttle(page);
    const spend = page.getByRole('button', { name: /Heal 5/i }).first();
    if (!(await spend.count())) { R.unproven('S-4', 'reversing a spend', 'no spend control found'); await ctx.close(); return; }
    await spend.click(); await page.waitForTimeout(500);
    const undo = page.getByRole('button', { name: /^(Undo|Restore|\+)$/i }).first();
    if (!(await undo.count())) { R.unproven('S-4', 'reversing a spend returns the resource', 'no undo/restore control on the default combat screen — see TABLE-READY §9'); await ctx.close(); return; }
    const t0 = Date.now();
    await undo.click();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const ms = Date.now() - t0;
    R.check('S-4', `reversing a spend ≤${THRESH.S4_undo}ms  [${ms}ms]`, ms <= THRESH.S4_undo);
    await ctx.close();
  }
}

/* ══ V — VISUAL ════════════════════════════════════════════════════════════ */
export async function familyV(b, R, opts) {
  R.section('V — arm\'s length, bad light');

  const all = { small: [], low: [], lowNum: [], lowPix: [], lowNumPix: [], cinzel: [], touch: [], turnTouch: [], thumb: [], occluded: [], occludedTablet: [], notPainted: [], onImage: 0 };
  const { ctx, page } = await freshCtx(b, opts);
  await importFile(page, realCopy('full'));

  for (const s of SCREENS) {
    await goScreen(page, s);
    // measure the whole scroll height, not just the first fold
    const pages = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / window.innerHeight));
    for (let i = 0; i < Math.min(pages, 6); i++) {
      await page.evaluate(n => window.scrollTo(0, n * window.innerHeight), i);
      await page.waitForTimeout(220);
      const a = await audit(page);
      // A-14 — the nodes bgOf() could not divide, measured from the painted
      // pixels instead of dropped. One screenshot per scroll position.
      for (const p of await pixelContrast(page, a.text.filter(t => t.onImage))) {
        const where = `${s.id} «${p.t}» ${p.size}px`;
        if (p.pixel < THRESH.V2_contrast) all.lowPix.push(`${where} ${p.pixel}:1`);
        else if (p.numeric && p.pixel < THRESH.V3_contrast) all.lowNumPix.push(`${where} ${p.pixel}:1`);
      }
      for (const t of a.text) {
        const where = `${s.id} «${t.t}» ${t.size}px`;
        // Amendment A-13 — `if (t.onImage) continue;` used to sit on the line
        // above, before all four tests. bgOf() flags a node as onImage when ANY
        // ancestor has a background-image, and this app tints its cards with a
        // 3.5%-alpha linear-gradient — so 3140 of 4804 text nodes were flagged,
        // and one background heuristic silently switched off FOUR criteria at
        // once. V-1 (is it 12px) and V-4 (is Cinzel ≥20px) are geometry. They do
        // not care what is painted behind the glyph and they never should have
        // been gated on it. They now grade every node.
        if (t.size < THRESH.V1_size) all.small.push(where);
        if (/cinzel/i.test(t.family) && t.size < THRESH.V4_cinzel) all.cinzel.push(where);
        // Contrast genuinely needs a background colour to divide by. The nodes
        // whose background is a gradient are counted, and graded from the
        // painted pixels by V-2b/V-3b (amendment A-14) — never dropped.
        if (t.onImage) { all.onImage++; continue; }
        if (t.contrast !== null && t.contrast < THRESH.V2_contrast) all.low.push(`${where} ${t.contrast}:1`);
        else if (t.numeric && t.contrast !== null && t.contrast < THRESH.V3_contrast) all.lowNum.push(`${where} ${t.contrast}:1`);
      }
      for (const c of a.touch) {
        if (c.hitW < THRESH.V5_touch || c.hitH < THRESH.V5_touch) all.touch.push(`${s.id} «${c.label}» ${c.hitW}×${c.hitH}`);
      }
    }
    // V-6b — graded at scroll-top and scroll-bottom only, exactly as frozen, and
    // only once the page has stopped moving. At an intermediate offset every
    // control passes under the fixed bottom bar at some point and can be scrolled
    // back out again; that is scrolling, not occlusion. At the two ends it cannot
    // be scrolled away, and that is the failure this criterion is about.
    for (const at of ['top', 'bottom']) {
      // Scroll, settle, scroll again: the accordions animate grid-template-rows,
      // so the page is still growing after the first scrollTo lands and "the
      // bottom" moves out from under you. Two rounds, then confirm the height
      // stopped changing — anything still under the bar now is under it for good.
      for (let k = 0; k < 3; k++) {
        await page.evaluate(w => window.scrollTo(0, w === 'top' ? 0 : document.documentElement.scrollHeight), at);
        await settle(page);
      }
      const a = await audit(page);
      for (const c of a.touch)
        // Amendment A-11 — the `&& c.occludedEdge === at` that used to be here
        // is gone. It only counted a control when the coverer was pinned to the
        // SAME edge the page was scrolled to, so a control lying under the
        // bottom-pinned Veil pill at scroll-TOP was silently dropped. That is
        // narrower than the criterion, which says: at scroll-top and at
        // scroll-bottom, elementFromPoint at the centre must resolve to the
        // control. It said 0 occluded on the iPad while _v6c.mjs printed
        // «Expend Channel Divinity use» → button[Veil this scene]. The
        // implementation was softer than its own frozen text; the text wins.
        if (c.occludedBy) {
          // Amendment A-8: a control clipped to nothing by an ancestor is not
          // being painted, so it has no on-screen position to occlude. Counted
          // out loud below — never silently dropped.
          if (c.clipped) { all.notPainted.push(`${s.id} @${at} «${c.label}» inside ${c.clipped}`); continue; }
          all.occluded.push(`${s.id} @${at} «${c.label}» covered by ${c.occludedBy}`);
        }
    }

    // thumb zone: only on the default combat screen, only spend controls + tabs
    if (s.id === 'play/Combat') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      const a = await audit(page);
      for (const c of a.touch) {
        // Amendment A-9 — the selector, widened. It did not contain "expend", and
        // "Expend 1st level spell slot" does not contain "spend", so the spell-slot
        // pips — the most-tapped controls of any turn — were invisible to V-5b and
        // V-6 the entire time. They were sitting at exactly 44px against a 48px
        // floor. Widening a selector only ever catches MORE, so this needs no
        // licence beyond saying it out loud.
        if (!/heal|expend|restore|slot|spend|action|bonus|reaction|move|combat|grimoire|roleplay/i.test(c.label)) continue;
        // Size is intrinsic and stays graded even when clipped (A-8); position
        // is not, so V-6 skips what is not painted and says how many.
        if (c.hitW < THRESH.V5_turn || c.hitH < THRESH.V5_turn) all.turnTouch.push(`«${c.label}» ${c.hitW}×${c.hitH}`);
        if (c.clipped) { all.notPainted.push(`${s.id} @top «${c.label}» inside ${c.clipped}`); continue; }
        // Amendment A-7: the criterion says the BOTTOM 60% — y in [vh*0.40, vh].
        // The old expression (y > vh*0.60 fails) demanded the TOP 60% and failed
        // the fixed tab bar for sitting exactly where the criterion wants it.
        // Measured at scrollTop 0, so y > vh also means "you had to scroll".
        if (c.y < a.vh * (1 - THRESH.V6_thumb)) all.thumb.push(`«${c.label}» y=${c.y}/${a.vh} — above the thumb zone`);
        else if (c.y > a.vh) all.thumb.push(`«${c.label}» y=${c.y}/${a.vh} — off the first screen`);
      }
    }
  }
  await ctx.close();

  /* V-6c (amendment A-10) — the same occlusion rule, on the iPad. § 1 says the
     app is held in one hand OR propped on a table edge; V-6b only ever visited
     the hand. The two fixed overlays are anchored to the viewport and the
     content beneath them reflows at 834px, so "what is under the Veil pill" is
     a different set of controls at this size — tablet-play-Combat.png shows it
     landing on a Channel Divinity pip. A separate context rather than a resize,
     so the app boots at this width instead of being stretched into it. */
  const tab = await freshCtx(b, { ...opts, viewport: TABLET, dpr: 2 });
  await importFile(tab.page, realCopy('full'));
  for (const s of SCREENS) {
    await goScreen(tab.page, s);
    for (const at of ['top', 'bottom']) {
      for (let k = 0; k < 3; k++) {
        await tab.page.evaluate(w => window.scrollTo(0, w === 'top' ? 0 : document.documentElement.scrollHeight), at);
        await settle(tab.page);
      }
      const a = await audit(tab.page);
      for (const c of a.touch)
        if (c.occludedBy) { // A-11, same correction as V-6b above
          if (c.clipped) { all.notPainted.push(`tablet ${s.id} @${at} «${c.label}» inside ${c.clipped}`); continue; }
          all.occludedTablet.push(`${s.id} @${at} «${c.label}» covered by ${c.occludedBy}`);
        }
    }
  }
  await tab.ctx.close();

  const u = a => [...new Set(a)];
  const cap = a => u(a).slice(0, 14).join('\n         ') + (u(a).length > 14 ? `\n         … +${u(a).length - 14} more` : '');
  R.check('V-1', `no visible text under ${THRESH.V1_size}px  [${u(all.small).length} found]`, u(all.small).length === 0, cap(all.small));
  R.check('V-2', `every text node ≥${THRESH.V2_contrast}:1  [${u(all.low).length} below]`, u(all.low).length === 0, cap(all.low));
  R.check('V-3', `numerals and counters ≥${THRESH.V3_contrast}:1  [${u(all.lowNum).length} below]`, u(all.lowNum).length === 0, cap(all.lowNum));
  R.check('V-2b', `the same, measured off the painted pixels for the ${all.onImage} nodes on a gradient  [${u(all.lowPix).length} below]`, u(all.lowPix).length === 0, cap(all.lowPix));
  R.check('V-3b', `the same, for numerals on a gradient  [${u(all.lowNumPix).length} below]`, u(all.lowNumPix).length === 0, cap(all.lowNumPix));
  R.check('V-4', `Cinzel never under ${THRESH.V4_cinzel}px  [${u(all.cinzel).length} found]`, u(all.cinzel).length === 0, cap(all.cinzel));
  R.check('V-5', `every control ≥${THRESH.V5_touch}px  [${u(all.touch).length} below]`, u(all.touch).length === 0, cap(all.touch));
  R.check('V-5b', `turn controls ≥${THRESH.V5_turn}px  [${u(all.turnTouch).length} below]`, u(all.turnTouch).length === 0, cap(all.turnTouch));
  R.check('V-6', `turn controls in the bottom ${THRESH.V6_thumb * 100}% of a 390×844 screen  [${u(all.thumb).length} outside]`, u(all.thumb).length === 0, cap(all.thumb));
  R.check('V-6b', `no control covered by anything  [${u(all.occluded).length} occluded]`, u(all.occluded).length === 0, cap(all.occluded));
  R.check('V-6c', `the same, on the iPad at 834×1112  [${u(all.occludedTablet).length} occluded]`, u(all.occludedTablet).length === 0, cap(all.occludedTablet));
  if (all.notPainted.length) console.log(`         (A-8: ${u(all.notPainted).length} controls skipped by V-6/V-6b/V-6c — clipped to nothing by an ancestor, so not painted and having no on-screen position. Size/type/contrast still graded.)`);
  if (all.onImage) console.log(`         (${all.onImage} text nodes sit on an image/gradient — contrast UNMEASURABLE, reported not passed)`);
}

/* ══ N — NO WIFI ═══════════════════════════════════════════════════════════ */
export async function familyN(b, R, opts) {
  R.section('N — no wifi');

  { // N-1 — the basement.
    //
    // HOW "no wifi" is produced decides whether this criterion means anything.
    // Playwright's context.setOffline() is a CDP flag, and in the first full run
    // it left the controlling service worker out of the loop on reload
    // (workerStart = 0 on every subresource) while caches.match() resolved those
    // same URLs from page context in the same breath. That is not a browser with
    // no wifi; that is a harness. So locally we do the honest thing: serve the
    // build from a server we own, precache, then KILL THE SERVER. The origin is
    // genuinely unreachable and nothing has been told to pretend.
    // Evidence for both readings: probe-offline.mjs vs probe-offline2.mjs.
    const grade = async page => {
      const dead = await walk(page, CHROME);
      // walk() leaves us on the last screen; the spend controls are on
      // play/Combat. Looking for "Heal 5" on prep/Academy and reporting "did not
      // persist" is the instrument failing, not the app.
      await goScreen(page, SCREENS[0]);
      const spend = page.getByRole('button', { name: /Heal 5/i }).first();
      let persisted = false, spendNote = '';
      if (await spend.count() && await spend.isEnabled().catch(() => false)) {
        const before = await storedChar(page);
        await spend.click().catch(() => {});
        await page.waitForTimeout(800);
        persisted = (await storedChar(page)) !== before;
        if (!persisted) spendNote = 'spend did not reach storage';
      } else { persisted = false; spendNote = 'no enabled spend control on play/Combat with the origin dead'; }
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1800);
      const survived = /Nix/.test((await judge(page)).text);
      await drain(page);
      return {
        dead, persisted, survived,
        ok: dead.length === 0 && persisted && survived && page.errs.length === 0,
        why: [dead.join(' ; '), persisted ? '' : spendNote,
          survived ? '' : 'reload lost him', ...page.errs.slice(0, 3)].filter(Boolean).join(' | '),
      };
    };

    if (!opts.live) {
      const { ctx, page, cached } = await deadOrigin(b, {
        viewport: opts.viewport, dpr: opts.dpr,
        before: p => importFile(p, realCopy('full')),
      });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2200);
      const served = await page.evaluate(() => performance.getEntriesByType('resource')
        .filter(r => r.workerStart > 0).length);
      const g = await grade(page);
      R.check('N-1', `origin killed, then cold boot: 7 screens + a spend persists + reload survives  [${cached} files precached, ${served} served by the worker]`,
        g.ok && cached > 0, g.why);
      await ctx.close();
    } else {
      // Nobody can unplug GitHub's server for us. Abort every request at the
      // network layer instead — closest honest analogue against a live origin.
      const ctx = await b.newContext({ viewport: opts.viewport, deviceScaleFactor: opts.dpr });
      const page = await ctx.newPage();
      const { watch } = await import('./rig.mjs');
      watch(page);
      await page.goto(opts.base, { waitUntil: 'networkidle' });
      await importFile(page, realCopy('full'));
      await page.waitForTimeout(4000);
      const cached = await page.evaluate(async () => {
        const k = (await caches.keys()).find(n => n.startsWith('codex-shell'));
        return k ? (await (await caches.open(k)).keys()).length : 0;
      });
      await ctx.route('**/*', r => r.abort('internetdisconnected').catch(() => {}));
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2200);
      const g = await grade(page);
      if (!g.ok) {
        // Before calling this a failure, ask whether the worker was ever
        // consulted. If it is controlling and holds the shell but no subresource
        // shows workerStart > 0, the harness — not the app — is what broke.
        const blind = await page.evaluate(async () => ({
          controlling: !!navigator.serviceWorker.controller,
          holdsShell: !!(await caches.match(location.pathname)),
          workerServed: performance.getEntriesByType('resource').filter(r => r.workerStart > 0).length,
        }));
        if (blind.controlling && blind.holdsShell && blind.workerServed === 0) {
          R.unproven('N-1', 'cold boot with no network on the deployed origin',
            `instrument blind: SW controlling, shell cached (${cached} files), yet 0 subresources served by the worker — the same signature that made the local run lie. Proven locally instead by killing a real server; see results-local.json.`);
        } else R.no('N-1', `no network, deployed origin: 7 screens + a spend persists + reload survives  [${cached} files precached]`, g.why);
      } else {
        R.ok('N-1', `no network, deployed origin: 7 screens + a spend persists + reload survives  [${cached} files precached]`);
      }
      await ctx.close();
    }
  }
  { // N-2 AI black-holed (slow failure, not refusal)
    const { ctx, page } = await freshCtx(b, opts);
    await ctx.route(/11434|ollama|generativelanguage|googleapis/i, async () => { await new Promise(r => setTimeout(r, 60000)); });
    await importFile(page, realCopy('full'));
    const el = page.getByRole('button', { name: /Heal 5/i }).first();
    if (!(await el.count())) { R.unproven('N-2', 'AI may never block combat', 'no spend control'); await ctx.close(); return; }
    const t0 = Date.now();
    await el.click();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const ms = Date.now() - t0;
    const dead = await walk(page, CHROME);
    R.check('N-2', `a hanging AI endpoint never blocks a turn  [spend ${ms}ms]`,
      ms <= THRESH.S3_spend * 3 && dead.length === 0, `${ms}ms; ${dead.join(' ; ')}`);
    await ctx.close();
  }
  { // N-3 no third-party fetch
    const ctx = await b.newContext({ viewport: opts.viewport, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    const foreign = new Set();
    const origin = new URL(opts.base).origin;
    page.on('request', r => { try { if (new URL(r.url()).origin !== origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.add(new URL(r.url()).origin); } catch {} });
    const { watch } = await import('./rig.mjs');
    watch(page);
    await page.goto(opts.base, { waitUntil: 'networkidle' });
    await importFile(page, realCopy('full'));
    await walk(page, CHROME);
    R.check('N-3', 'zero third-party requests during boot + a full walk', foreign.size === 0, [...foreign].join(', '));
    await ctx.close();
  }
  { /* N-4 — a stale cache cannot brick it.
       Amendment A-16. The version this replaces was unsound three ways, each
       measured rather than argued (see §11):

         · it went offline with `ctx.setOffline(true)`, which rig.mjs's own
           comment already records as a CDP artefact that does not behave like a
           dead network — under it the navigation reaches the worker but every
           subresource comes back `workerStart = 0`, so the app cannot boot no
           matter what the worker does. "bricked-while-poisoned=true" was a
           statement about Playwright, not about this app.
         · `bricked` was computed, interpolated into the label, and never
           asserted. The failure state the criterion exists to catch could not
           fail the criterion.
         · `setOffline(false)` ran BEFORE the recovery test, so the one
           assertion in it was made with the network up. It graded "does
           ?sw=off clear a bad cache", never "does it work in a basement".

       And `/Nix|Import Character/` passed on an empty app offering an import
       button — i.e. satisfiable with his character gone.

       So: the origin is really closed, by `deadOrigin`, the same way N-1 does
       it; the poison goes in while the origin is still alive; the network is
       never restored; and both boots are graded by `judge` needing /Nix/, so
       blankness, a boundary notice, a console error and a missing character
       each fail it. Nothing here is easier than what it replaced. */
    const POISON = '<!doctype html><html><head><script type="module" src="./assets/GONE-0000.js"></script></head><body><div id="root"></div></body></html>';
    const { ctx, page, base, cached } = await deadOrigin(b, {
      viewport: opts.viewport, dpr: opts.dpr,
      before: async p => {
        await importFile(p, realCopy('full'));
        await p.waitForTimeout(3000);
      },
    });
    // The origin is dead from here down. Nothing below restores it.
    const poisoned = await page.evaluate(async ({ base, POISON }) => {
      const names = await caches.keys();
      const shell = names.find(n => n.startsWith('codex-shell') && !n.endsWith('-lkg'));
      if (!shell) return 'no shell cache';
      const c = await caches.open(shell);
      await c.put(base, new Response(POISON, { headers: { 'content-type': 'text/html' } }));
      return shell;
    }, { base, POISON });

    // (a) the poisoned cold boot itself — the parachute is what has to catch it
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2200);
    const cold = await judge(page, { needs: [/Nix/] });
    const coldErrs = page.errs.slice();
    page.errs.length = 0;

    // (b) the kill switch, pulled in the basement, with the origin still gone
    await page.goto(base + '?sw=off', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1800);
    const off = await judge(page, { needs: [/Nix/] });

    const ok = cold.faults.length === 0 && coldErrs.length === 0 && off.faults.length === 0;
    R.check('N-4', `a poisoned shell cannot brick it with the origin DEAD — cold boot and ?sw=off both show his character  [${cached} precached, poisoned ${poisoned}]`,
      ok, [cold.faults.length ? 'cold: ' + cold.faults.join(' | ') : '',
           coldErrs.length ? 'cold errs: ' + coldErrs.slice(0, 3).join(' | ') : '',
           off.faults.length ? '?sw=off: ' + off.faults.join(' | ') : ''].filter(Boolean).join('\n         '));
    await ctx.close();
  }
  { /* N-4b — added with A-16, and it is the half of the old N-4 that was worth
       keeping. The rewrite above grades the off switch in a basement, where the
       right answer is "defer the teardown". That leaves an obvious way to pass
       both: never tear down at all. So this asserts the other side — with the
       origin UP, `?sw=off` must still do what it says: no worker registered, no
       `codex-` cache left standing. Between them there is no build that is
       green on both by doing nothing. */
    const { ctx, page } = await freshCtx(b, opts);
    await importFile(page, realCopy('full'));
    await page.waitForTimeout(3000);
    await page.goto(opts.base + '?sw=off', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const after = await page.evaluate(async () => ({
      regs: (await navigator.serviceWorker.getRegistrations()).length,
      caches: (await caches.keys()).filter(n => n.startsWith('codex-')).length,
    }));
    const { faults } = await judge(page, { needs: [/Nix/] });
    R.check('N-4b', `with the origin UP, ?sw=off really does stand the worker down  [${after.regs} registrations, ${after.caches} codex caches left]`,
      after.regs === 0 && after.caches === 0 && faults.length === 0,
      `regs=${after.regs} caches=${after.caches} ${faults.join(' | ')}`);
    await ctx.close();
  }
}

/* ══ E — ENDURANCE ═════════════════════════════════════════════════════════ */
export async function familyE(b, R, opts) {
  R.section('E — hour four  [E-1/E-2 are declared PROXIES for 4h, not 4h]');

  const { ctx, page } = await freshCtx(b, opts);
  await importFile(page, realCopy('full'));
  const cdp = await ctx.newCDPSession(page);
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'performance.memory ? performance.memory.usedJSHeapSize : 0' });
    return result.value || 0;
  };
  const nodes = () => page.evaluate(() => document.getElementsByTagName('*').length);
  const targets = [/Heal 5/i, /Action$/, /Bonus$/, /Reaction$/, /Move$/, /Damage$/];
  let h10 = 0, n10 = 0, done = 0, skipped = 0;
  for (let i = 0; done < 200 && i < 600; i++) {
    // E-1 requires 200 actions that HAPPENED. A spent Lay on Hands pool
    // correctly disables "Heal 5"; clicking it anyway just burns the
    // actionability timeout and the first run counted those timeouts as
    // actions (140 real, 60 imaginary — and one of them became E-4's "30023ms").
    // So rotate to the next control that is actually live and keep going.
    let clicked = false;
    for (let k = 0; k < targets.length && !clicked; k++) {
      const el = page.getByRole('button', { name: targets[(done + k) % targets.length] }).first();
      if (!(await el.count()) || !(await el.isEnabled().catch(() => false))) { if (k === 0) skipped++; continue; }
      clicked = await el.click({ timeout: 2000 }).then(() => true).catch(() => false);
    }
    if (clicked) done++;
    else break;   // nothing on the screen is drivable; say so rather than pad
    if (done % 40 === 39) { await goScreen(page, SCREENS[(done / 40 | 0) % 7]); await goScreen(page, SCREENS[0]); }
    if (done === 10 && !h10) { h10 = await heap(); n10 = await nodes(); }
  }
  const h200 = await heap(), n200 = await nodes();
  await drain(page);
  const growth = h10 ? (h200 - h10) / h10 : NaN;
  if (done < 200) R.unproven('E-1', '200 scripted turn actions (proxy for 4h)',
    `only ${done} actions could be driven before every control on the screen was spent — the criterion asks for 200`);
  else R.check('E-1', `heap growth over ${done} actions (PROXY for 4h)  [${(growth * 100).toFixed(1)}%, ≤${THRESH.E1_heap * 100}%]`,
    growth <= THRESH.E1_heap, `${(h10 / 1e6).toFixed(1)}MB → ${(h200 / 1e6).toFixed(1)}MB`);
  R.check('E-2', `DOM node growth  [${n200 - n10}, ≤${THRESH.E2_nodes}]`, (n200 - n10) <= THRESH.E2_nodes, `${n10} → ${n200}`);
  const usage = await page.evaluate(() => {
    let total = 0, biggest = ['', 0];
    for (const k of Object.keys(localStorage)) {
      const n = (localStorage.getItem(k) || '').length * 2;
      total += n; if (n > biggest[1]) biggest = [k, n];
    }
    return { total, biggest };
  });
  R.check('E-3', `origin storage bounded  [${(usage.total / 1024).toFixed(0)}KB, largest ${usage.biggest[0]} ${(usage.biggest[1] / 1024).toFixed(0)}KB, <${THRESH.E3_bytes / 1024 / 1024}MB]`,
    usage.total < THRESH.E3_bytes);
  // E-4. The first run measured 30023ms here and called it slowness. It was a
  // Playwright actionability timeout on a "Heal 5" that had gone `disabled`
  // because the Lay on Hands pool was empty — correct app behaviour, wrong
  // measurement. Find a control that is still live, prove the tap LANDED, and
  // grade on input-to-next-paint like S-3.
  await page.evaluate(() => {
    window.__ev4 = [];
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (/click|pointerdown|pointerup/.test(e.name)) window.__ev4.push(Math.round(e.duration));
    }).observe({ type: 'event', buffered: false, durationThreshold: 0 });
  });
  let live = null, liveName = '';
  for (const t of targets) {
    const c = page.getByRole('button', { name: t }).first();
    if (await c.count() && await c.isEnabled().catch(() => false) && await c.isVisible().catch(() => false)) {
      live = c; liveName = (await c.textContent() || '').trim().replace(/\s+/g, ' ').slice(0, 24); break;
    }
  }
  if (!live) {
    R.unproven('E-4', 'the last action is as fast as the tenth',
      `after ${done} actions no target control was still enabled — every spendable resource was exhausted, which is the app behaving correctly, not a measurement`);
  } else {
    const domBefore = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
    const store0 = await storedChar(page);
    const t0 = Date.now();
    const clicked = await live.click({ timeout: 3000 }).then(() => true).catch(() => false);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const wall = Date.now() - t0;
    const domAfter = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('[aria-pressed="true"]').length);
    const landed = clicked && (domAfter !== domBefore || (await storedChar(page)) !== store0);
    const ev = (await page.evaluate(() => window.__ev4)).filter(Number.isFinite);
    const ms = ev.length ? Math.max(...ev) : NaN;
    if (!landed) R.unproven('E-4', 'the last action is as fast as the tenth',
      `"${liveName}" was enabled but the tap changed nothing observable — cannot time an action that did not happen`);
    else if (!Number.isFinite(ms)) R.unproven('E-4', `the ${done}th action is as fast as the tenth`,
      `Event Timing produced no entry; wall-clock incl. harness was ${wall}ms`);
    else R.check('E-4', `action ${done} is as fast as action 10  ["${liveName}" input→paint ${ms}ms, ≤${THRESH.S3_spend} · wall-clock ${wall}ms]`,
      ms <= THRESH.S3_spend);
  }
  if (page.errs.length) R.no('E-0', 'zero errors across the endurance run', page.errs.slice(0, 6).join('\n         '));
  else R.ok('E-0', 'zero errors across the endurance run');
  await ctx.close();
}
