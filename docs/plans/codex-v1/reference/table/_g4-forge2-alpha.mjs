/* G-4 — forge-2 has no headroom, so every alpha on it is a V-2 failure.
   -----------------------------------------------------------------------------
   The independent verifier found ONE text node below 4.5:1 that the harness had
   missed: play/Combat's «No active conditions», 12px, 2.36:1. The class is
   `text-forge-2/60`.

   That is not one node. `--color-forge-2` is #8b8578 and its own comment in
   index.css records why that value was chosen: it measures **4.85:1** on the
   glass-card surface, which clears V-2's 4.5:1 floor by 0.35. There is no
   headroom. Multiply it by ANY alpha and it goes under — /60 lands at 2.36:1,
   and every other fraction in the codebase lands somewhere between.

   So the fix is the A-28 shape again: the defect is one decision, applied at 28
   call sites, and it is repaired by deleting the alpha rather than by inventing
   a token. `text-forge-2` is already the dim label colour; `/60` was somebody
   dimming the dim colour.

   Why the harness could not see the other 27. rig.mjs:325 parses colours with
   /rgba?\(([^)]+)\)/ and Tailwind 4 emits oklch(), so only 20.3% of text nodes
   are ever pixel-read. The one that WAS caught was caught by a probe that read
   painted pixels. The other 27 are the same class, found by reading the source
   rather than the screen, and they are fixed on that basis and said to be fixed
   on that basis.

   DELIBERATELY NOT TOUCHED, and listed so the exclusion is auditable:
     · icons          — V-2 grades text; a 24px aria-hidden glyph is not text
     · line-through   — DiceRoller:328, TurnSummary:263. The dimming IS the
                        message ("this slot is spent"). Changing it would be a
                        behaviour change wearing a colour, which the seal
                        forbids and which V-2 does not ask for.
     · icon buttons   — TurnSummary:813/843, favourite stars. Same reason.
   ONE site changes token rather than losing an alpha: TurnSummary:471 is
   `{slot.current}/{slot.max}` — a NUMERAL, so V-3's 7:1 applies, not V-2's
   4.5:1. forge-2 at full is 5.40:1 and still fails. It becomes forge-1
   (9.75:1), which index.css's own comment already instructs: "A numeral is
   never forge-2 … the VALUE is forge-1 or brighter."                        */
import { readFileSync, writeFileSync } from 'node:fs';

/* file -> 1-based line numbers whose forge-2 alpha is real text */
const SITES = {
  'src/components/CharacterPage.tsx': [972],
  'src/components/ActionMenu.tsx': [475],
  'src/components/CharacterSheet.tsx': [187, 274, 290, 299, 326, 333, 380, 403],
  'src/components/CharacterSetup.tsx': [482, 713, 1000],
  'src/components/HPTracker.tsx': [484],
  'src/components/combat/TurnSummary.tsx': [339, 380, 778, 870, 880, 911],
  'src/components/accent-forge/AIScenePartner.tsx': [798, 816],
  'src/components/accent-forge/AccentTraining.tsx': [366],
  'src/components/RoleplayCoach.tsx': [448, 474],
  'src/components/toybox/ComboCard.tsx': [111, 201],
};
/* the numeral: alpha removal is not enough, the token itself is wrong */
const NUMERAL = { 'src/components/combat/TurnSummary.tsx': [471] };

let total = 0;
for (const [rel, nums] of Object.entries(SITES)) {
  const lines = readFileSync(rel, 'utf8').split('\n');
  let touched = 0;
  for (const n of nums) {
    const i = n - 1;
    const before = lines[i];
    if (before === undefined) { console.log(`  !! ${rel}:${n} out of range — SKIPPED`); continue; }
    if (!/text-forge-2\/\d/.test(before)) { console.log(`  !! ${rel}:${n} no text-forge-2/N — SKIPPED\n     ${before.trim()}`); continue; }
    if (/line-through/.test(before)) { console.log(`  !! ${rel}:${n} line-through on this line — SKIPPED by rule`); continue; }
    lines[i] = before.replace(/text-forge-2\/\d+/g, 'text-forge-2');
    console.log(`  ${rel}:${n}\n    - ${before.trim()}\n    + ${lines[i].trim()}`);
    touched++; total++;
  }
  const nums2 = NUMERAL[rel] || [];
  for (const n of nums2) {
    const i = n - 1;
    const before = lines[i];
    if (!/text-forge-2\/\d/.test(before)) { console.log(`  !! ${rel}:${n} numeral site not as expected — SKIPPED`); continue; }
    lines[i] = before.replace(/text-forge-2\/\d+/g, 'text-forge-1');
    console.log(`  ${rel}:${n}  [NUMERAL -> forge-1]\n    - ${before.trim()}\n    + ${lines[i].trim()}`);
    touched++; total++;
  }
  if (touched) writeFileSync(rel, lines.join('\n'));
  console.log(`${rel}: ${touched} site(s)\n`);
}
console.log(`${total} sites rewritten`);
