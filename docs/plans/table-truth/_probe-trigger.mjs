// Slice 8b design probe. Can canon's SUGGESTED trigger be found by shape?
//
// `trigger.ts` refuses to read prose, and rightly: Hearthfire Manifest's body
// contains "When you are hit by a melee attack..." which is the retaliation's
// trigger, not the cloak's. A scraper would lift it and send Marcus to a table
// believing he can only cloak up after already being hit.
//
// But canon's HEARTH-03 appAction ends: Default suggestion: 'when you take
// damage'. That is a QUOTED clause opening with "when" — the same grammar
// `TRIGGER_LEAD` already recognises. The question this probe answers is whether
// that shape is UNAMBIGUOUS across all twelve errata, or whether it happens to
// work on one record by luck. If more than one clause per erratum matches, the
// shape is not a handle and the design has to change.
import { readFileSync } from 'node:fs';

const CANON = JSON.parse(readFileSync('src/canon/oath-of-the-hearth.json', 'utf8'));
const TRIGGER_LEAD = /^(?:when|if)\b/i;
const FIELDS = ['recommendedFix', 'narrowerAlternative', 'appAction'];

/* Quoted spans, straight or curly. Canon writes both. */
const QUOTED = /['‘“"]([^'’”"]{4,240})['’”"]/g;

let total = 0;
for (const e of CANON.errata) {
  const hits = [];
  for (const field of FIELDS) {
    const text = e[field];
    if (typeof text !== 'string') continue;
    for (const m of text.matchAll(QUOTED)) {
      const clause = m[1].trim();
      hits.push({ field, clause, isTrigger: TRIGGER_LEAD.test(clause) });
    }
  }
  const triggers = hits.filter((h) => h.isTrigger);
  total += triggers.length;
  if (!hits.length) continue;
  console.log(`${e.id}  quoted=${hits.length}  trigger-shaped=${triggers.length}`);
  for (const h of hits) {
    console.log(`   ${h.isTrigger ? '→' : ' '} [${h.field}] «${h.clause.slice(0, 96)}»`);
  }
  console.log();
}
console.log(`trigger-shaped quoted clauses across all twelve errata: ${total}`);
