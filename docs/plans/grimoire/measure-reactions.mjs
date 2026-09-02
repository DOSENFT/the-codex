/* Which of his three reactions does the turn engine actually produce?
 *
 * Marcus, item 8: "in the combat tab, it doesnt seem to have all of my
 * available reactions available. I should have the hearthfire manifest,
 * sentinal, and interception."
 *
 * Slice 6 was scoped as "Interception is missing because he has never picked a
 * Fighting Style". Before building that, this asks the engine what it produces
 * today — because "Sentinel is there" is an assumption, and `featReactionOptions`
 * reads `feat.effects` first, and his stored Sentinel's `effects` array holds
 * three audience bullets rather than three effects.
 *
 * Run: npx vite-node docs/plans/grimoire/measure-reactions.mjs
 */

import { readFileSync } from 'node:fs'
import { featReactionOptions, effectSentencesOf, isReactionShaped } from '../../../src/lib/turn/feats.ts'
import { featByName } from '../../../src/lib/canon/lookup.ts'

const nix = JSON.parse(readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'))

console.log('=== featReactionOptions(nix) ===')
const rows = featReactionOptions(nix)
console.log(rows.length, 'rows')
for (const r of rows) console.log('  -', r.name, '::', r.mechanicsLine, '||', r.effectsLine)

console.log('\n=== per feat, why ===')
for (const feat of nix.feats ?? []) {
  const canon = featByName(feat.name)
  // Held Reaction slice 2 gave this `{sentences, from}`; kept running.
  const { sentences, from } = effectSentencesOf(feat, canon)
  console.log(`\n${feat.name}  (canon known: ${!!canon}, words from ${from})`)
  console.log(`  own effects: ${(feat.effects ?? []).length} | canon effects: ${(canon?.effects ?? []).length}`)
  for (const s of sentences) {
    console.log(`   [${isReactionShaped(s) ? 'REACTION' : '        '}] ${s.slice(0, 100)}`)
  }
}

console.log('\n=== what canon says Sentinel does ===')
for (const e of featByName('Sentinel')?.effects ?? []) {
  console.log(`  [${isReactionShaped(e) ? 'REACTION' : '        '}] ${e}`)
}
