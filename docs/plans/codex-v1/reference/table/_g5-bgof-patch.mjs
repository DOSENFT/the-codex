/* G-5 — apply the compositor correction to rig.mjs, byte-exactly.
   -----------------------------------------------------------------------------
   The evidence is in `_g5-bgof.mjs`, which ran BOTH formulas over the same walk
   on all seven screens: 2627 node-readings, 815 of them moved, and exactly 5
   verdicts changed — the three prep/Persona count badges, twice over at two
   scroll positions. 0 nodes went from passing to failing. 0 nodes disagreed
   with the painted-pixel arbiter. New computed 8.57/8.74 against pixels
   8.65/8.82.

   That "815 moved, 5 changed" pair is the honest summary of the blast radius:
   the error was everywhere a translucent layer sat behind another translucent
   layer, and it was decisive in three places. Both halves get reported.

   rig.mjs is CRLF, like families.mjs, so both sides of the match are converted
   rather than the file normalised — the D-5 patch failed its own guard on
   exactly this and refused to write, which is the guard working.            */
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'rig.mjs';
const src = readFileSync(PATH, 'latin1');

const OLD = `      if (c && c.a > 0) {
        acc = acc === null ? { rgb: c.rgb, a: c.a } : { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) };
        if (acc.a >= 0.995) return { rgb: acc.rgb.map(Math.round), img };
      }`;

const NEW = `      if (c && c.a > 0) {
        /* A-36 — source-over, premultiplied. This line used to read:
             acc = { rgb: over(acc.rgb, c.rgb, acc.a), a: acc.a + c.a * (1 - acc.a) }
           which weights the BACK layer by (1 - acc.a) and never multiplies it by
           that layer's OWN alpha, so a ground painted at 4 % was composited as if
           it were opaque. The alpha channel on the very same line accumulates
           correctly — the formula knew the layer was 4 % for alpha and forgot it
           for colour, which is why it read as plausible for this long.

           It is wrong ONLY when a translucent layer sits behind another
           translucent layer. Most of this app is ink on one tint on an opaque
           ground, where c.a is 1 and the two forms are algebraically identical.
           Measured blast radius over 7 screens x 2 scroll positions: 2627 node
           readings, 815 moved, 5 verdicts changed, 0 pass -> fail.

           What it cost: prep/Persona's accordion counts (bg-void-2/60 inside a
           bg-white/[0.04] button on bg-void-0) came out on rgb(78,77,74) instead
           of rgb(27,26,22), and the run of record failed V-2 on «14» 4.15:1,
           «21» 4.17:1 and «4» 4.17:1. The painted-pixel reader — which shares no
           code with this function — read the same three at 8.65-8.82:1, and
           arithmetic outside the browser at 8.86:1. This form now agrees with
           both to within 0.1. No criterion's text, threshold or selector moved. */
        acc = acc === null ? { rgb: c.rgb, a: c.a } : (() => {
          const na = acc.a + c.a * (1 - acc.a);
          return { rgb: acc.rgb.map((v, i) => (v * acc.a + c.rgb[i] * c.a * (1 - acc.a)) / na), a: na };
        })();
        if (acc.a >= 0.995) return { rgb: acc.rgb.map(Math.round), img };
      }`;

const crlf = t => t.replace(/\n/g, '\r\n');
const OLD_CRLF = crlf(OLD), NEW_CRLF = crlf(NEW);

if (src.split(OLD_CRLF).length !== 2) {
  console.log(`!! the compositor block is not present exactly once (${src.split(OLD_CRLF).length - 1} match(es)) — NOT patching.`);
  process.exit(1);
}
writeFileSync(PATH, src.replace(OLD_CRLF, NEW_CRLF), 'latin1');
console.log('ok  rig.mjs bgOf() now composites translucent grounds with premultiplied source-over.');
console.log('    next: --only V, and _g5-selftest.mjs. Do not assume green.');
