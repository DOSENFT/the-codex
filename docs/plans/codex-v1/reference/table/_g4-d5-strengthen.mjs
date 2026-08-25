/* G-4 - D-5's grader could print PASS over a boundaried screen.
   ---------------------------------------------------------------------------
   families.mjs:480 called judge(page) and destructured only `text`, throwing
   away `faults` - the BLANK / BOUNDARIED / HOLLOW verdicts and page.errs that
   judge() exists to produce. Line 486 then put page.errs into the DETAIL
   STRING rather than the pass condition:

       R.check('D-5', '...', intact && told,
               `intact=${intact} userWasTold=${told}` +
               (page.errs.length ? ' errs=' + page.errs.join('|') : ''))

   So a run in which the quota fault threw the app into an error boundary, and
   said so on screen, still evaluated `intact && told` and could print PASS with
   the errors printed politely beside the word PASS. D-4, eight lines above,
   already does it correctly: `if (faults.length) bad.push(faults.join(' | '))`.
   D-5 is the only member of the family that does not.

   This matters more than one check. The document's section 5 claims "the error
   floor is a floor under all of them", and for D-5 that sentence was false.

   The fix is D-4's shape, applied to D-5. It can only ever turn PASS into FAIL:
   nothing is removed from the pass condition, `intact && told` still has to
   hold, and the faults are added on top. That is the freeze rule's required
   direction - criteria may be added, never softened.

   Written as a byte-exact patch rather than an editor edit on purpose:
   families.mjs is read as latin1 everywhere in this harness, so it is read and
   written as latin1 here and the replacement text is pure ASCII. The rest of
   the file's bytes round-trip untouched.                                     */
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'families.mjs';
const src = readFileSync(PATH, 'latin1');

const OLD = `    const { text } = await judge(page);
    const told = /could not save|save failed|storage|full|out of space/i.test(text);
    await page.evaluate(() => { Object.getPrototypeOf(localStorage).setItem = window.__realSet; });
    const after = await storedChar(page);
    const intact = after === before;
    R.check('D-5', 'a full disk does not eat the character (told, and prior save intact)',
      intact && told, \`intact=\${intact} userWasTold=\${told}\` + (page.errs.length ? ' errs=' + page.errs.join('|') : ''));`;

const NEW = `    const { text, faults } = await judge(page);
    const told = /could not save|save failed|storage|full|out of space/i.test(text);
    await page.evaluate(() => { Object.getPrototypeOf(localStorage).setItem = window.__realSet; });
    const after = await storedChar(page);
    const intact = after === before;
    // The faults judge() returns are part of the verdict, not decoration beside
    // it. Before this, a quota fault that boundaried the screen could still
    // print PASS as long as the character survived and a message appeared -
    // and the boundary would be reported in the detail string, next to the
    // word PASS. This is D-4's shape (line 458), applied to the one member of
    // the family that did not have it. It can only turn PASS into FAIL.
    const bad = [];
    if (!intact) bad.push('the prior save did not survive the full disk');
    if (!told) bad.push('the player was never told the save failed');
    if (faults.length) bad.push(faults.join(' | '));
    R.check('D-5', 'a full disk does not eat the character (told, and prior save intact)',
      bad.length === 0, bad.length ? bad.join('; ') : \`intact=\${intact} userWasTold=\${told}\`);`;

/* families.mjs is CRLF. The first run of this patch failed its own guard on
   that and refused to write, which is the guard working: a blind replace would
   have matched nothing and reported success. Both sides are converted rather
   than the file normalised, so the file's line endings are left as they are. */
const crlf = t => t.replace(/\n/g, '\r\n');
const OLD_CRLF = crlf(OLD), NEW_CRLF = crlf(NEW);

if (!src.includes(OLD_CRLF)) {
  console.log('!! D-5 block not found verbatim - NOT patching. The file moved; re-read it.');
  process.exit(1);
}
writeFileSync(PATH, src.replace(OLD_CRLF, NEW_CRLF), 'latin1');
console.log('ok  families.mjs D-5 now fails on judge() faults and on page errors.');
console.log('    next: run it and see what colour it comes out. Do not assume green.');
