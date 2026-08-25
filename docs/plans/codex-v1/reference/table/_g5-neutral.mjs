/* G-5 — the sixth row of Badge.tsx, which A-35 did not compute.
   -----------------------------------------------------------------------------
   The run of record failed V-2 on three nodes:

       prep/Persona «14» 12px 4.15:1
       prep/Persona «21» 12px 4.17:1
       prep/Persona «4»  12px 4.17:1

   They are `<Badge variant="neutral">{count}</Badge>` at IdentityPage.tsx:162 —
   the section-header counts on the Persona accordion.

   This is the third layer of the same defect. A-23 reasoned about the whole
   variant table and lit one row. A-35 computed five rows and lit two more. Both
   passes modelled only the ACCENT variants, because the accent tint was the
   mechanism they had in hand — and `neutral` is not an accent, so it fell out of
   the model silently. It is also the ONLY row in that table that renders a bare
   number in this app, which is precisely the row a numeral floor exists for.

   The lesson is not "check neutral too". It is that a model which covers five of
   six rows and never prints the sixth cannot tell you it is incomplete. So this
   prints EVERY row of the real table, reading the tokens out of index.css rather
   than restating them, and it fails loudly if a variant in Badge.tsx has no row
   here.                                                                       */
import { readFileSync } from 'node:fs';

const CSS = readFileSync('../../../../../src/index.css', 'utf8');
const TSX = readFileSync('../../../../../src/components/ui/Badge.tsx', 'utf8');

const tok = name => {
  const m = CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`index.css has no --color-${name}`);
  return m[1];
};

const HEX = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));

/* The two grounds a Badge really lands on in this app. */
const GROUNDS = [['void-0', HEX(tok('void-0'))], ['void-1', HEX(tok('void-1'))]];

/* Parsed out of the component's own table, so a row added there and not here is
   an error rather than an omission. `bg-X/N` -> fill+alpha, `text-Y` -> ink. */
const table = [...TSX.matchAll(/^\s*(\w+):\s*'([^']+)'/gm)].map(([, variant, cls]) => {
  const bg = cls.match(/bg-([\w-]+?)(?:\/(\[?[\d.]+\]?))?(?:\s|$)/);
  const ink = cls.match(/text-([\w-]+)/);
  const rawA = bg[2] ? bg[2].replace(/[[\]]/g, '') : '100';
  return { variant, fill: bg[1], alpha: (rawA.includes('.') ? +rawA : +rawA / 100), ink: ink[1] };
});
if (!table.length) { console.log('!! could not parse Badge.tsx variant table'); process.exit(1); }

console.log('variant    ink         fill              ground   ratio   V-2 4.5  V-3 7.0');
console.log('─'.repeat(76));
const fails = [];
for (const r of table) {
  for (const [gname, ground] of GROUNDS) {
    const tint = over(HEX(tok(r.fill)), r.alpha, ground);
    const v = ratio(HEX(tok(r.ink)), tint);
    const bad2 = v < 4.5, bad3 = v < 7;
    console.log(
      `${r.variant.padEnd(10)} ${r.ink.padEnd(11)} ${(r.fill + '/' + r.alpha).padEnd(17)} ${gname.padEnd(8)} ` +
      `${v.toFixed(2).padStart(5)}   ${bad2 ? '\x1b[31mFAIL\x1b[0m' : 'ok  '}     ${bad3 ? '\x1b[31mFAIL\x1b[0m' : 'ok  '}`);
    if (bad2) fails.push(`${r.variant} on ${gname} ${v.toFixed(2)}:1`);
  }
}

/* Candidate inks for any row that fails, so the fix is chosen from what already
   exists rather than by inventing a colour — the stopping rule A-35 set on gold. */
if (fails.length) {
  console.log(`\n\x1b[31m${fails.length} row(s) below the 4.5:1 floor:\x1b[0m ${fails.join(' · ')}`);
  console.log('\ncandidate inks that already exist in index.css, worst of the two grounds:');
  const bad = table.filter(r => GROUNDS.some(([, g]) => ratio(HEX(tok(r.ink)), over(HEX(tok(r.fill)), r.alpha, g)) < 4.5));
  for (const r of bad) {
    for (const cand of ['forge-0', 'forge-1', 'forge-2', 'bronze']) {
      const worst = Math.min(...GROUNDS.map(([, g]) => ratio(HEX(tok(cand)), over(HEX(tok(r.fill)), r.alpha, g))));
      console.log(`  ${r.variant} + ${cand.padEnd(8)} ${tok(cand)}  ${worst.toFixed(2)}:1  ` +
        `${worst >= 7 ? '\x1b[32mclears V-2 and V-3\x1b[0m' : worst >= 4.5 ? '\x1b[33mclears V-2 only\x1b[0m' : 'still fails'}`);
    }
  }
} else console.log('\n\x1b[32mevery row clears 4.5:1\x1b[0m');
