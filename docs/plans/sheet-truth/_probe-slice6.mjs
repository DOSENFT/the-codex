/* SHEET TRUTH slice 6 — the remaining six advice strings, proved on glass.
 *
 *     node docs/plans/sheet-truth/_probe-slice6.mjs http://localhost:4223/the-codex/
 *
 * Slice 5 proved the mechanism on Bless. This proves the STRINGS: six more
 * pieces of canon that were each telling Marcus a false number about his own
 * character. The measurement machinery is slice 5's, unchanged in substance —
 * a Range around the candidate, rects with area, inside the sheet's own box,
 * topmost at the centre (findings Q and BL) — generalised to open any spell's
 * sheet rather than only Bless's.
 *
 * TWO THINGS THIS PROBE HAD TO SOLVE THAT SLICE 5'S DID NOT:
 *
 *   REACH. Dispel Magic is a level 3 spell and Aura of Purity a level 4 one. A
 *   level 7 Paladin cannot cast either, so neither has a row on his Play tab and
 *   neither can be photographed at his real level. Case B therefore runs at
 *   level 13, which is both the level that reaches them AND a level where every
 *   number moves — so it does double duty as the finding BG guard.
 *
 *   PRESENCE. The seed fixture knows eight spells and none of these six. They
 *   are added from canon itself rather than hand-typed here, so the probe cannot
 *   quietly measure a spell whose real definition says something else.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })(),
];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = (process.argv[2] || 'http://localhost:4223/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();

const CANON = JSON.parse(readFileSync(new URL('../../../src/canon/spells.json', import.meta.url), 'utf8'));
const CANON_LIST = CANON.spells ?? CANON;
const PROGRESSION = JSON.parse(readFileSync(new URL('../../../src/canon/paladin-progression.json', import.meta.url), 'utf8'));

const UNDER_TEST = ['Command', 'Heroism', 'Resistance', 'Scorching Ray', 'Dispel Magic', 'Aura of Purity'];

const IN_COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 }, 3: { used: 0, max: 3 }, 4: { used: 0, max: 2 } },
  concentrating: null,
};

/** Marcus's real ability line, plus the six spells PREPARED — an unprepared
 *  spell is not an option, so the sheets this slice is about would never open.
 *  Each entry is built from the canon record, so the probe is looking at the
 *  same definition the app is. */
function seedFor(level) {
  const have = new Set((NIX.spells ?? []).map(s => s.name));
  const added = UNDER_TEST.filter(n => !have.has(n)).map(name => {
    const c = CANON_LIST.find(s => s.name === name);
    if (!c) throw new Error(`canon has no spell named ${name} — probing the wrong build`);
    /* `tactics` is STRIPPED, deliberately. `detail.ts:107` resolves advice with
       `spellByName` out of the build's own bundled canon, not out of the
       character — and the before-measurement is taken against a build compiled
       BEFORE this slice. Seeding today's prose into localStorage would let the
       new strings walk into the old build and quietly make the "before" column
       agree with the "after" one. */
    const { tactics, ...rest } = c;
    void tactics;
    return { ...rest, prepared: true };
  });
  const seed = {
    ...NIX,
    level,
    abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
    spells: [...(NIX.spells ?? []).map(s => ({ ...s, prepared: true })), ...added],
    spellSlots: slotsAt(level),
  };
  delete seed.paladinResources;
  return seed;
}

/* THE SLOT MAP IS PART OF THE SEED, and finding out why cost a run.
 *
 * `options.ts:253` drops a prepared spell whose tier is absent from
 * `character.spellSlots` — a Paladin 8 has no 3rd-level slot and no business
 * seeing 3rd-level spells in his turn list. The fixture ships a level 8 Nix
 * whose stored map holds tiers 1 and 2 only, and that map survives raising
 * `level`. So the probe's first run found no row for Dispel Magic (3) or Aura of
 * Purity (4) even at level 13 — which looked like a slice-6 failure and was
 * really the seed telling the truth about a level 8 character. The tiers are
 * therefore taken from canon's own progression table for the case's level. */
function slotsAt(level) {
  const rows = PROGRESSION.levels ?? PROGRESSION.progression ?? Object.values(PROGRESSION).find(Array.isArray);
  const row = rows.find(r => r.level === level);
  if (!row) throw new Error(`canon's Paladin table has no level ${level}`);
  const out = {};
  for (const [tier, max] of Object.entries(row.spellSlots)) {
    if (max > 0) out[tier] = { max, current: max };
  }
  return out;
}

const browser = await chromium.launch();

async function openApp(level) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const errors = [];
  await ctx.addInitScript(
    ([id, seedJson, combatJson]) => {
      localStorage.setItem('codex-character-' + id, seedJson);
      localStorage.setItem('codex-combat-' + id, combatJson);
      localStorage.setItem('codex-active-id', id);
      const seed = JSON.parse(seedJson);
      localStorage.setItem('codex-roster', JSON.stringify([
        { id, name: seed.name, class: seed.class, subclass: seed.subclass, level: seed.level,
          updatedAt: '2026-08-26T00:00:00.000Z' },
      ]));
      localStorage.setItem('codex-character', seedJson);
    },
    [NIX.id, JSON.stringify(seedFor(level)), JSON.stringify(IN_COMBAT)],
  );
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

/** Open one spell's detail sheet and unfold "How to use it".
 *
 *  Most of these are slot spenders and live in the collapsed "Everything else
 *  you could do" section rather than the six ranked rows on the first screen —
 *  skipping that fold is why slice 5's probe first reported no Bless at all. */
async function openSpell(page, name) {
  const more = page.locator('button[aria-expanded="false"]').filter({ hasText: 'Everything else' }).first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(500); }
  const row = page.locator(`button[aria-label="${name} — details"]`).first();
  if ((await row.count()) === 0) return { opened: false, reason: `no "${name} — details" row on the Play tab` };
  await row.scrollIntoViewIfNeeded();
  await row.click();
  try {
    await page.waitForSelector(`div[role="dialog"][aria-label="${name}"]`, { timeout: 4000 });
  } catch {
    return { opened: false, reason: `row tapped but no sheet labelled "${name}" appeared` };
  }
  await page.waitForTimeout(350);
  const toggle = page.locator(`div[role="dialog"][aria-label="${name}"] button:has-text("How to use it")`).first();
  if ((await toggle.count()) === 0) return { opened: true, unfolded: false, reason: 'sheet has no "How to use it" band' };
  await toggle.click();
  await page.waitForTimeout(300);
  return { opened: true, unfolded: true };
}

async function closeSheet(page, name) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator(`div[role="dialog"][aria-label="${name}"]`).first().waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
}

/** Read the paint inside one named sheet. Slice 5's `painted`, verbatim in
 *  substance: geometry, not textContent. */
const readSheet = (page, name, needles) => page.evaluate(([name, needles]) => {
  const panel = [...document.querySelectorAll('div[role="dialog"][aria-modal="true"]')]
    .find(d => d.getAttribute('aria-label') === name);
  if (!panel) return { found: false };

  const toggle = [...panel.querySelectorAll('button')]
    .find(b => /How to use it/i.test((b.textContent || '').trim()));
  const ul = toggle?.parentElement?.querySelector('ul') ?? null;

  function painted(root, needle) {
    if (!root) return 0;
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue || '';
      for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) found.push([node, at]);
    }
    let hits = 0;
    for (const [node, at] of found) {
      node.parentElement?.scrollIntoView({ block: 'center' });
      const box = panel.getBoundingClientRect();
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      for (const r of range.getClientRects()) {
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.top < box.top - 1 || r.bottom > box.bottom + 1) continue;
        if (r.left < box.left - 1 || r.right > box.right + 1) continue;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!hit || !panel.contains(hit)) continue;
        hits++;
        break;
      }
    }
    return hits;
  }

  const clipped = [];
  for (const el of (ul?.querySelectorAll('*') ?? [])) {
    const cs = getComputedStyle(el);
    const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    if (clamp && clamp !== 'none') clipped.push(`line-clamp:${clamp}`);
    if (cs.textOverflow === 'ellipsis') clipped.push('text-overflow:ellipsis');
    if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1) clipped.push('overflow-y clipped');
  }

  const out = {};
  for (const needle of needles) out[needle] = painted(ul, needle);
  return {
    found: true,
    bullets: [...(ul?.querySelectorAll('li') ?? [])].length,
    painted: out,
    braceInSheet: painted(panel, '{'),
    ellipsis: painted(ul, '…') + painted(ul, '...'),
    clipped,
  };
}, [name, needles]);

/* ── the claims ────────────────────────────────────────────────────────────
 * `want` maps a substring to 1 (must be painted at least once) or 0 (must not
 * be painted at all). Every 0 is a sentence that was on his screen before this
 * slice; every 1 is what canon now says to him instead. */
const AT_7 = {
  'Command': {
    'At level 7 with Charisma 16 your DC is 14': 1,
    'Charisma 18': 0, 'your DC is 15': 0,
  },
  'Heroism': {
    'At Charisma 16 that is 3 temp HP': 1,
    'Charisma 18': 0, '40 points': 0, 'Four refreshing temp HP': 0,
  },
  'Resistance': {
    '+3 at Charisma 16, permanently': 1,
    'Charisma 18': 0, '+4 at Charisma 18': 0,
  },
  'Scorching Ray': {
    'At level 7 with Charisma 16 that is +6.': 1,
    'Charisma 18': 0, 'that is +7.': 0,
  },
};
const AT_13 = {
  'Command': {
    'At level 13 with Charisma 16 your DC is 16': 1,
    'Charisma 18': 0, 'At level 7': 0,
  },
  'Heroism': {
    'At Charisma 16 that is 3 temp HP': 1,
    'Charisma 18': 0, '40 points': 0,
  },
  'Resistance': {
    '+3 at Charisma 16, permanently': 1,
    'Charisma 18': 0,
  },
  'Scorching Ray': {
    'At level 13 with Charisma 16 that is +8.': 1,
    'Charisma 18': 0, 'At level 7': 0, 'that is +6.': 0,
  },
  'Dispel Magic': {
    'at Charisma 16 you have +3': 1,
    'Charisma 18': 0, 'you succeed 50': 0,
  },
  'Aura of Purity': {
    'At Charisma 16 that is Advantage plus +3': 1,
    'Charisma 18': 0, 'at level 7+': 0, 'roughly 85': 0,
  },
};

const CASES = [
  { name: 'A — Nix as he really is: level 7, Charisma 16', level: 7, claims: AT_7 },
  { name: 'B — level 13: every number moves, and the two high-level spells become reachable', level: 13, claims: AT_13 },
];

let failures = 0;
let measured = 0;
console.log(`\n  ${BASE}\n`);

for (const c of CASES) {
  const { ctx, page, errors } = await openApp(c.level);
  console.log(c.name);
  for (const [spell, want] of Object.entries(c.claims)) {
    const opened = await openSpell(page, spell);
    if (!opened.opened || !opened.unfolded) {
      console.log(`  ${spell}\n    COULD NOT MEASURE — ${opened.reason}`);
      failures++;
      continue;
    }
    const got = await readSheet(page, spell, Object.keys(want));
    if (!got.found) { console.log(`  ${spell}\n    COULD NOT MEASURE — sheet vanished`); failures++; continue; }
    console.log(`  ${spell} · ${got.bullets} bullets`);
    for (const [needle, expect] of Object.entries(want)) {
      const hit = got.painted[needle];
      const ok = expect === 0 ? hit === 0 : hit >= 1;
      if (!ok) failures++; else measured++;
      console.log(`    ${ok ? 'ok  ' : 'FAIL'}  «${needle}» painted ${hit}× · want ${expect === 0 ? 'none' : 'at least one'}`);
    }
    for (const [label, ok, why] of [
      ['no placeholder left in the sheet', got.braceInSheet === 0, `painted ${got.braceInSheet}×`],
      ['no ellipsis', got.ellipsis === 0, `painted ${got.ellipsis}×`],
      ['not clipped', got.clipped.length === 0, got.clipped.join(', ')],
    ]) {
      if (!ok) failures++; else measured++;
      console.log(`    ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : ` — ${why}`}`);
    }
    await closeSheet(page, spell);
  }
  /* A leaked placeholder would leak ANYWHERE, not only into the sheet that was
     open when it happened — so the whole document is asked once per case. */
  const braceInDocument = await page.evaluate(() => (document.body.innerText || '').includes('{'));
  for (const [label, ok, why] of [
    ['no placeholder anywhere on the page', braceInDocument === false, 'a "{" is in the document text'],
    ['no page errors', errors.length === 0, errors.join(' | ')],
  ]) {
    if (!ok) failures++; else measured++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : ` — ${why}`}`);
  }
  await ctx.close();
  console.log('');
}

await browser.close();
console.log(`  ${measured} claims satisfied, ${failures} not\n`);
process.exit(failures === 0 ? 0 : 1);
