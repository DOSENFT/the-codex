/* MUTATION CHECK — slice R8.  Does the new test file actually hold the rule?
 *
 * Green is not evidence on its own: the tests were written before the code, but
 * a rule implemented in three small pieces can have any one piece removed and
 * still look right somewhere else. So break each piece separately and demand a
 * named failure.
 *
 *   A  the structural pool is ignored  -> back to pure magnitude (the R7 bug)
 *   B  the reaction phrase loses its `structural` mark -> pool is never non-empty
 *   C  structure wins EVERYWHERE, including off-turn   -> over-reach
 *
 * C is the one worth having. A and B are the same defect from two directions;
 * C asks whether the tests notice if the rule reaches past the case it was
 * built for and gags the moment.
 *
 *   node docs/plans/your-turn/_mutate-r8.mjs <A|B|C|restore>
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'

const FILE = 'src/lib/turn/rank.ts'
const BAK = 'docs/plans/your-turn/_rank.r8.bak'

const which = process.argv[2]
if (!which) { console.error('need A|B|C|restore'); process.exit(2) }

if (!existsSync(BAK)) copyFileSync(FILE, BAK)

if (which === 'restore') {
  copyFileSync(BAK, FILE)
  console.log('restored', FILE, 'from', BAK)
  process.exit(0)
}

let s = readFileSync(BAK, 'utf8')
const before = s

if (which === 'A') {
  s = s.replace(
    'const pool = phrased.some(f => f.structural) ? phrased.filter(f => f.structural) : phrased',
    'const pool = phrased',
  )
} else if (which === 'B') {
  s = s.replace(
    "add('reaction', W.reaction, 'Not on your turn', true)",
    "add('reaction', W.reaction, 'Not on your turn')",
  )
} else if (which === 'C') {
  /* Structure applied off-turn too: the phrase is added in the `reactionNow`
     branch as well, so the moment goes structural and "You are bloodied" is
     swallowed on the only legal row on the screen. */
  s = s.replace(
    "if (ctx.yourTurn === false) add('reaction', W.reactionNow)",
    "if (ctx.yourTurn === false) add('reaction', W.reactionNow, 'This is the moment', true)",
  )
} else { console.error('unknown mutation', which); process.exit(2) }

if (s === before) { console.error('MUTATION DID NOT APPLY —', which); process.exit(3) }
writeFileSync(FILE, s)
console.log('applied mutation', which, 'to', FILE)
