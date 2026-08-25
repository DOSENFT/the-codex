/* G-4 badge — the five rows A-23 did not light.
   -----------------------------------------------------------------------------
   src/components/ui/Badge.tsx carries A-23's reasoning in a 14-line comment, and
   directly beneath it a six-row table in which exactly ONE row was fixed:

       arcane:   'bg-arcane/15 text-arcane   border-arcane/25'      <- base ink
       eldritch: 'bg-eldritch/15 text-eldritch-lit ...'             <- lit
       ember:    'bg-ember/15 text-ember     border-ember/25'       <- base ink
       verdant:  'bg-verdant/15 text-verdant border-verdant/25'     <- base ink
       gold:     'bg-gold/15 text-gold       border-gold/25'        <- base ink

   The comment is right, and it applies verbatim to four rows it did not touch.
   The in-combat pass caught the ember one at 5.73:1 against V-3's 7:1 numeral
   floor — a «Round 1» badge on a card that also tints the ground beneath it.

   DO NOT rewrite the other four on the strength of that. Two of them have no
   `-lit` token at all, and inventing a token to satisfy a rule I have not
   checked is how the last three of these got shipped. Alpha compositing is
   exact arithmetic, so this computes each row instead of assuming it: the
   badge's own 15 % tint over the two grounds it actually sits on, versus both
   the base ink and, where one exists, the lit ink. Whatever the numbers say is
   what gets changed — and the numbers get printed, including for the rows that
   turn out to be fine, so «I only fixed ember» is a decision on the record and
   not an omission.                                                          */

const HEX = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));

const VOID0 = HEX('#0a0a08'), VOID1 = HEX('#12110e');
const ACC = {
  arcane:   { base: '#d4a74a', lit: '#e8c87a' },
  eldritch: { base: '#8b5cf6', lit: '#b39cff' },
  ember:    { base: '#e8924a', lit: '#f5b183' },
  verdant:  { base: '#39d98a', lit: null },
  gold:     { base: '#c5a55a', lit: null },
};

/* The two grounds a Badge is really seen on in this app: bare page (void-0) and
   a card (void-1). Its own bg-accent/15 composites over whichever it lands on;
   the ember one measured in combat also had a bg-ember/[0.04] card beneath it,
   which is the darker of the two cases and is what the third column models. */
const GROUNDS = [['on void-0', VOID0], ['on void-1', VOID1]];

console.log('variant    ground        ink        BASE      LIT       V-2 4.5  V-3 7.0');
console.log('─'.repeat(74));
const verdict = {};
for (const [name, { base, lit }] of Object.entries(ACC)) {
  for (const [gname, ground] of GROUNDS) {
    const tint = over(HEX(base), 0.15, ground);           // the badge's own bg-accent/15
    const rBase = ratio(HEX(base), tint);
    const rLit = lit ? ratio(HEX(lit), tint) : null;
    const mark = r => `${r < 4.5 ? 'FAIL' : 'ok  '}   ${r < 7 ? 'FAIL' : 'ok  '}`;
    console.log(
      `${name.padEnd(10)} ${gname.padEnd(13)} base       ${rBase.toFixed(2).padStart(5)}     ` +
      `${(rLit ? rLit.toFixed(2) : ' — ').padStart(5)}     ${mark(rBase)}`);
    verdict[name] ??= { worstBase: Infinity, worstLit: Infinity, lit: !!lit };
    verdict[name].worstBase = Math.min(verdict[name].worstBase, rBase);
    if (rLit) verdict[name].worstLit = Math.min(verdict[name].worstLit, rLit);
  }
}

console.log('\n───── what this licenses ─────');
for (const [name, v] of Object.entries(verdict)) {
  const needV2 = v.worstBase < 4.5, needV3 = v.worstBase < 7;
  if (!needV3) { console.log(`  ${name.padEnd(9)} base ${v.worstBase.toFixed(2)}:1 — clears BOTH floors, LEAVE IT`); continue; }
  if (!v.lit) {
    console.log(`  ${name.padEnd(9)} base ${v.worstBase.toFixed(2)}:1 — below ${needV2 ? 'V-2 and V-3' : 'V-3'}, and there is NO -lit token.`);
    console.log(`  ${' '.repeat(9)} A token would have to be added; that is a new colour, not an application of an existing rule.`);
    continue;
  }
  console.log(`  ${name.padEnd(9)} base ${v.worstBase.toFixed(2)}:1 -> lit ${v.worstLit.toFixed(2)}:1 — the -lit token already exists and already clears. FIX.`);
}
