/* SHEET TRUTH slice 5 — the prose seam, proved on one string.
 *
 *     node docs/plans/sheet-truth/_probe-tactics.mjs http://localhost:4221/the-codex/
 *
 * The claim of this slice is about WORDS ON GLASS: Bless's advice must stop
 * saying "Charisma 18" to a man whose Charisma is 16. Three lessons from
 * earlier slices shape how that is measured.
 *
 *   FINDING Q — a proof that reads `textContent` is a proof of the MODEL. So
 *   every claim below is made with a Range around the candidate substring and
 *   `getClientRects()` on it: the question asked is "were these characters
 *   painted, inside the sheet, with area", not "is this string in the DOM".
 *
 *   FINDING BL — both ends of a geometric claim need a box. The rects are
 *   checked for area AND for lying inside the open sheet's own rectangle, so a
 *   permanently-mounted off-screen twin of this panel cannot answer for it.
 *
 *   FINDING BG — a number that passes by standing still proves nothing. Canon
 *   writes "At level 7" literally, and Nix is level 7, so `{level}` would look
 *   correct on his sheet whether it resolved or not. Case B therefore runs the
 *   SAME spell for a level 9 Paladin, where canon's own text is wrong and only
 *   a resolved placeholder can be right.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
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

const BASE = (process.argv[2] || 'http://localhost:4221/the-codex/').replace(/\/?$/, '/');
const NIX = await loadNix();

const IN_COMBAT = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 }, 3: { used: 0, max: 2 } },
  concentrating: null,
};

/** Marcus's real ability line, and Bless PREPARED — the fixture ships it known
 *  but unprepared, and an unprepared spell is not an option, so the sheet this
 *  slice is about would never open. */
function seedFor(level) {
  const seed = {
    ...NIX,
    level,
    abilityScores: { STR: 18, DEX: 12, CON: 14, INT: 9, WIS: 13, CHA: 16 },
    spells: (NIX.spells ?? []).map(s => (s.name === 'Bless' ? { ...s, prepared: true } : s)),
  };
  delete seed.paladinResources;
  return seed;
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

/** Open Bless's detail sheet wherever the Play tab keeps it, and unfold band 4.
 *
 *  Bless is a slot spender, so it lives in the collapsed "Everything else you
 *  could do" section rather than in the ranked turn list — the six rows on the
 *  first screen are the only ones reachable without opening it. Skipping this
 *  is why the probe's first run reported no Bless row at all. */
async function openBless(page) {
  const more = page.locator('button[aria-expanded="false"]').filter({ hasText: 'Everything else' }).first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(600); }
  const row = page.locator('button[aria-label="Bless — details"]').first();
  if ((await row.count()) === 0) return { opened: false, reason: 'no "Bless — details" row on the Play tab' };
  await row.scrollIntoViewIfNeeded();
  await row.click();
  try {
    await page.waitForSelector('div[role="dialog"][aria-label="Bless"]', { timeout: 4000 });
  } catch {
    return { opened: false, reason: 'row tapped but no sheet labelled "Bless" appeared' };
  }
  await page.waitForTimeout(400);
  const toggle = page.locator('div[role="dialog"][aria-label="Bless"] button:has-text("How to use it")').first();
  if ((await toggle.count()) === 0) return { opened: true, unfolded: false, reason: 'sheet has no "How to use it" band' };
  await toggle.click();
  await page.waitForTimeout(350);
  return { opened: true, unfolded: true };
}

/** Everything this slice claims, read off the paint inside Bless's own sheet. */
const readTactics = page => page.evaluate(() => {
  const panel = [...document.querySelectorAll('div[role="dialog"][aria-modal="true"]')]
    .find(d => d.getAttribute('aria-label') === 'Bless');
  if (!panel) return { found: false };
  // frame is re-read per candidate inside painted(), after the scroll.

  const toggle = [...panel.querySelectorAll('button')]
    .find(b => /How to use it/i.test((b.textContent || '').trim()));
  const ul = toggle?.parentElement?.querySelector('ul') ?? null;

  /* FINDING Q, made geometric. A substring counts as PAINTED only when a Range
     drawn around it reports a rect with area, that rect sits inside the sheet's
     own box (FINDING BL — the anchor gets a box check too), and the topmost
     element at its centre belongs to the sheet, so text painted underneath
     something else does not count.

     THE SCROLL IS PART OF THE MEASUREMENT, not a convenience. Band 4 is the
     last of four bands in a scrolling panel and starts below the fold, so the
     first run of this probe reported canon's own "Charisma 18" as unpainted on
     a build that was plainly showing it. Each candidate is therefore scrolled
     to itself before it is asked; a run that could not bring it into the frame
     still counts as not painted. */
  function painted(root, needle) {
    if (!root) return 0;
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue || '';
      for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) {
        found.push([node, at]);
      }
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

  const bullets = [...(ul?.querySelectorAll('li') ?? [])].map(li => ({
    lead: (li.querySelector('b')?.textContent || '').trim() || null,
    text: (li.textContent || '').replace(/\s+/g, ' ').trim(),
  }));

  /* The clip test from phase 1, kept: band 4 saying the right words in a box
     two lines tall would still be the "…" this app already killed once. */
  const clipped = [];
  for (const el of (ul?.querySelectorAll('*') ?? [])) {
    const cs = getComputedStyle(el);
    const clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    if (clamp && clamp !== 'none') clipped.push(`line-clamp:${clamp}`);
    if (cs.textOverflow === 'ellipsis') clipped.push('text-overflow:ellipsis');
    if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1) clipped.push('overflow-y clipped');
  }

  return {
    found: true,
    expanded: toggle?.getAttribute('aria-expanded') ?? null,
    bulletCount: bullets.length,
    leads: bullets.map(b => b.lead),
    painted: {
      'Charisma 18': painted(ul, 'Charisma 18'),
      'Charisma 16': painted(ul, 'Charisma 16'),
      '+1d4 and +4': painted(ul, '+1d4 and +4'),
      '+1d4 and +3': painted(ul, '+1d4 and +3'),
      'At level 7': painted(ul, 'At level 7'),
      'At level 9': painted(ul, 'At level 9'),
    },
    /* A leaked placeholder is this slice's own failure mode, and it would leak
       ANYWHERE on the page, not only into this sheet — so the whole document
       is asked, not just band 4. */
    braceInSheet: painted(panel, '{'),
    braceInDocument: (document.body.innerText || '').includes('{'),
    ellipsis: painted(ul, '…') + painted(ul, '...'),
    clipped,
  };
});

const CASES = [
  {
    name: 'A — Nix as he really is: level 7, Charisma 16',
    level: 7,
    want: {
      'Charisma 18': 0, 'Charisma 16': 1,
      '+1d4 and +4': 0, '+1d4 and +3': 1,
      'At level 7': 1, 'At level 9': 0,
    },
  },
  {
    name: 'B — the same spell at level 9, where canon\'s own "level 7" is wrong',
    level: 9,
    want: {
      'Charisma 18': 0, 'Charisma 16': 1,
      '+1d4 and +4': 0, '+1d4 and +3': 1,
      'At level 7': 0, 'At level 9': 1,
    },
  },
];

let failures = 0;
console.log(`\n  ${BASE}\n`);
for (const c of CASES) {
  const { ctx, page, errors } = await openApp(c.level);
  const opened = await openBless(page);
  if (!opened.opened || !opened.unfolded) {
    console.log(`${c.name}\n    COULD NOT MEASURE — ${opened.reason}`);
    failures++;
    await ctx.close();
    continue;
  }
  const got = await readTactics(page);
  console.log(c.name);
  if (!got.found) { console.log('    COULD NOT MEASURE — sheet vanished'); failures++; await ctx.close(); continue; }
  console.log(`    band 4: ${got.bulletCount} bullets, leads ${JSON.stringify(got.leads)}, expanded=${got.expanded}`);
  for (const [needle, want] of Object.entries(c.want)) {
    const hit = got.painted[needle];
    const ok = want === 0 ? hit === 0 : hit >= 1;
    if (!ok) failures++;
    console.log(`    ${ok ? 'ok  ' : 'FAIL'}  «${needle}» painted ${hit}× · want ${want === 0 ? 'none' : 'at least one'}`);
  }
  const extras = [
    ['no placeholder left in the sheet', got.braceInSheet === 0, `painted ${got.braceInSheet}×`],
    ['no placeholder anywhere on the page', got.braceInDocument === false, 'a "{" is in the document text'],
    ['no ellipsis in band 4', got.ellipsis === 0, `painted ${got.ellipsis}×`],
    ['band 4 is not clipped', got.clipped.length === 0, got.clipped.join(', ')],
    ['canon\'s headings survive', JSON.stringify(got.leads).includes('POSITIONING') && JSON.stringify(got.leads).includes('STACKING') && JSON.stringify(got.leads).includes('RISK'), JSON.stringify(got.leads)],
    ['no page errors', errors.length === 0, errors.join(' | ')],
  ];
  for (const [label, ok, why] of extras) {
    if (!ok) failures++;
    console.log(`    ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : ` — ${why}`}`);
  }
  const stack = (got.bulletCount ? null : null);
  void stack;
  await ctx.close();
  console.log('');
}

await browser.close();
console.log(failures === 0 ? '  ALL CLAIMS HOLD\n' : `  ${failures} claim(s) not satisfied\n`);
process.exit(failures === 0 ? 0 : 1);
