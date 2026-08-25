/* G-4 · eldritch ink — A-23's fix, applied to the pattern instead of to one file.
   -----------------------------------------------------------------------------
   A-23 already found this defect and already wrote the reasoning down, in
   src/components/ui/Badge.tsx:

     «`eldritch` printed `text-eldritch` (#8b5cf6) on its own `bg-eldritch/15`.
      The tint lifts the ground under the word, so the pill measured 3.67–3.90:1
      in situ — below the 4.5:1 floor — while the raw colour on pure void reads
      4.68:1 and looks fine in a swatch.»

   It then changed exactly one line, in the shared Badge component, and stopped.
   Every hand-rolled copy of the same pill — and there are twenty-one — kept the
   bug. That is why the swept grader found it again today, at 3.96:1 on the Dice
   Roller's quick-roll chips and 4.13:1 on the Mechanics Reference category
   chips, on all seven screens. A fix applied to an instance and not to the rule
   is a fix that comes back.

   THE RULE, stated so it can be checked: where eldritch ink sits on an
   eldritch-TINTED ground, the ink goes to `--color-eldritch-lit` (#b39cff,
   8.60:1) and the tint, the border and the glow do not move. index.css already
   defines that ramp and already annotates it for exactly this. The colour
   coding is unchanged — same hue, same role — only the glyphs are lit.

   MEASURED, then repaired: DiceRoller:899 and MechanicsDrawer:101/105 are the
   three the pixel grader actually caught. The other eighteen are the same
   pairing in states or screens the seven-screen sweep does not enter — an
   ACTIVE condition chip, an open Toybox, a rolling die. They are repaired by
   the rule, and this comment is the record that they were repaired by rule and
   not by measurement, so nobody later reads their green as evidence.

   DELIBERATELY NOT TOUCHED
     · ActionMenu's `iconColor="text-eldritch"` (3 sites) and every other
       `<Icon className="text-eldritch">`. V-2 is a criterion about text; an
       icon is not text, and the same exclusion was taken in _g4-forge2-alpha.
     · `text-eldritch` on an untinted ground — a bare label on void. That reads
       4.68:1, which is above the floor, and lighting it would flatten a
       hierarchy the criterion is not asking me to touch.                      */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';

/* file -> lines. Each was read and confirmed to pair `text-eldritch` with an
   eldritch tint on the same element, either on the line itself or, for the
   object-literal styles, on an adjacent key of the same style object. */
const SITES = {
  'src/components/combat/ConditionsGrid.tsx': [54],
  'src/components/combat/QuickLookup.tsx': [150],
  'src/components/combat/TurnSummary.tsx': [269, 545, 936],
  'src/components/ConversationDrill.tsx': [96],
  'src/components/DiceAnimation.tsx': [49, 59],
  'src/components/DiceRoller.tsx': [513, 519, 899],
  'src/components/grimoire/GrimoireCard.tsx': [436],
  'src/components/MechanicsDrawer.tsx': [101, 105],
  'src/components/RoleplayCoach.tsx': [685],
  'src/components/Spellbook.tsx': [911, 1087],
  'src/components/ToyboxPanel.tsx': [895],
  'src/components/ui/HexFrame.tsx': [17],
  'src/components/session/ActionCard.tsx': [57],
  'src/components/session/SessionTimeline.tsx': [45],
  'src/components/session/EngageCard.tsx': [845],
};

let changed = 0, skipped = 0;
for (const [rel, lines] of Object.entries(SITES)) {
  const path = join(ROOT, rel);
  const src = readFileSync(path, 'utf8').split('\n');
  for (const ln of lines) {
    const i = ln - 1;
    const before = src[i];
    if (before === undefined) { console.log(`  !! ${rel}:${ln} does not exist`); skipped++; continue; }
    /* guard: only rewrite a line that really carries un-lit eldritch ink, so a
       line that moved since the list was built is skipped loudly rather than
       mangled silently. */
    if (!/text-eldritch(?!-lit)/.test(before)) { console.log(`  -- ${rel}:${ln} no bare text-eldritch — SKIPPED\n     ${before.trim().slice(0, 90)}`); skipped++; continue; }
    /* `text-eldritch/70` is alpha ON the ink, which is the same defect the
       forge-2 pass removed 28 of: it dims a colour that is already at the
       floor. The alpha goes with it; the sub-label's rank is carried by
       text-xs beside a text-sm sibling, which is where it should have been. */
    const after = before.replace(/text-eldritch(?!-lit)(\/\[?[\d.]+\]?)?/g, 'text-eldritch-lit');
    if (after === before) { skipped++; continue; }
    src[i] = after;
    changed++;
    console.log(`  ok ${rel}:${ln}\n     - ${before.trim().slice(0, 96)}\n     + ${after.trim().slice(0, 96)}`);
  }
  writeFileSync(path, src.join('\n'), 'utf8');
}
console.log(`\n${changed} sites rewritten, ${skipped} skipped, across ${Object.keys(SITES).length} files.`);
