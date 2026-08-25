/* G-2 — finish A-30 at the eighteen sites it missed.
   -----------------------------------------------------------------------------
   A-30 removed `disabled:pointer-events-none` from ui/Button.tsx and explained
   why: a disabled button carrying that class is transparent to touch, so the
   press falls THROUGH to whatever is underneath. The independent verifier
   demonstrated the consequence on prep/Character — a tap on the greyed-out
   "Add equipment" reached the dice-roller FAB and opened the dice tray.

   Eighteen other buttons still carry it, and three of them are in TurnDeck:
   `Heal {amount}`, `Spend`, and `Cure Poison (5)`, disabled exactly when the
   Lay on Hands pool runs low — which is mid-turn, in a fight, at the moment he
   is most likely to jab at them.

   The rewrite is A-30's, verbatim in shape:
     · `disabled:pointer-events-none`  ->  `disabled:cursor-not-allowed`
     · every `hover:` / `active:` on the SAME element gated behind `enabled:`
       so the rules that were unreachable while disabled stay unreachable.
   A native <button disabled> already refuses click, focus and activation, so
   nothing is un-guarded and nothing on screen moves.

   Scope is bounded to the cn(...) block that owns each hit — this walks back to
   the opening `cn(` and edits nothing above it. `group-hover:` and
   `focus-visible:` are left alone. */
import { readFileSync, writeFileSync } from 'node:fs';

const SITES = [
  'src/components/ActionMenu.tsx',
  'src/components/brass/BrassButton.tsx',
  'src/components/CharacterPage.tsx',
  'src/components/combat/StatsBar.tsx',
  'src/components/combat/TurnSummary.tsx',
  'src/components/CombatHelper.tsx',
  'src/components/DiceRoller.tsx',
  'src/components/TurnDeck.tsx',
];

let total = 0;
for (const rel of SITES) {
  const lines = readFileSync(rel, 'utf8').split('\n');
  let touched = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('disabled:pointer-events-none')) continue;
    // walk back to the cn( that opens this class list
    let start = i;
    while (start > 0 && !/\bcn\($/.test(lines[start].trim())) start--;
    if (start === 0) { console.log(`  !! ${rel}:${i + 1} no cn( found — SKIPPED`); continue; }
    for (let j = start; j <= i; j++) {
      const before = lines[j];
      lines[j] = lines[j]
        .replace(/disabled:pointer-events-none/g, 'disabled:cursor-not-allowed')
        .replace(/(^|[\s'"`])hover:/g, '$1enabled:hover:')
        .replace(/(^|[\s'"`])active:/g, '$1enabled:active:');
      if (lines[j] !== before) console.log(`  ${rel}:${j + 1}\n    - ${before.trim()}\n    + ${lines[j].trim()}`);
    }
    touched++; total++;
  }
  if (touched) writeFileSync(rel, lines.join('\n'));
  console.log(`${rel}: ${touched} site(s)`);
}
console.log(`\n${total} sites rewritten`);
