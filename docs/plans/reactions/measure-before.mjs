/* What Marcus's REAL sheet produces today, measured — not reasoned about.
 *
 * Run: npx vite-node docs/plans/reactions/measure-before.mjs
 *
 * It must live inside the repo (vite-node cannot load a script from outside the
 * project root) and it takes his actual export, not the `nix.ts` fixture — the
 * fixture carries `feats: []`, so every claim about Sentinel measured against it
 * is a claim about an empty array. That mistake is what this file exists to
 * avoid making twice.
 */
import { createRequire } from 'node:module'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { reactionRows } from '../../../src/lib/turn/reactions.ts'
import { featReactionOptions, effectSentencesOf, isReactionShaped } from '../../../src/lib/turn/feats.ts'
import { activeRetaliation, retaliationOf } from '../../../src/lib/turn/retaliation.ts'
import { featureActionType, createCombatState } from '../../../src/lib/combat-state.ts'
import { featureByName, featByName } from '../../../src/lib/canon/lookup.ts'
import { featureContextOf } from '../../../src/lib/turn/overlay.ts'
import { resolveCharacter } from '../../../src/lib/rules-2024/derive.ts'

const require = createRequire(import.meta.url)
const raw = require('c:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json')
const character = resolveCharacter(raw)
const ctx = featureContextOf(character)
const combat = createCombatState(character)
const turn = composeTurn({ character, combat })

const line = (s) => console.log(s)
const hr = (t) => line('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)))

line(`sheet: ${character.name} · level ${character.level} · ${character.feats?.length ?? 0} feats · ${character.features?.length ?? 0} features`)

hr('1. What economy does the app give each of his features?')
for (const f of character.features ?? []) {
  const canon = featureByName(f.name)
  line(
    `  ${f.name.padEnd(22)} sheet.actionType=${String(f.actionType ?? null).padEnd(6)}` +
    ` → app says "${featureActionType(f)}"` +
    `   canon known: ${canon ? 'yes' : 'NO'}`,
  )
}

hr('2. The reactions band, as it paints today')
const rows = reactionRows(turn, character)
line(`  ${rows.length} row(s)`)
for (const r of rows) line(`   · ${r.name}  [${r.cost}]  when: ${r.when ?? 'UNSTATED'}`)

hr('3. Sentinel — why it produces nothing')
for (const feat of character.feats ?? []) {
  const canon = featByName(feat.name)
  const own = (feat.effects ?? []).filter(Boolean)
  const chosen = effectSentencesOf(feat, canon)
  line(`  ${feat.name}:`)
  line(`    sheet effects: ${own.length}, of which reaction-shaped: ${own.filter(isReactionShaped).length}`)
  line(`    canon effects: ${(canon?.effects ?? []).length}, of which reaction-shaped: ${(canon?.effects ?? []).filter(isReactionShaped).length}`)
  /* `from` is read off the RETURN VALUE now rather than recomputed here. The
     old line re-derived it as `own.length > 0 ? 'THE SHEET' : …`, which was a
     second copy of the very rule slice 2 changed — a measurement that would
     have gone on reporting the old answer after the code stopped giving it. */
  line(`    effectSentencesOf picked: ${chosen.sentences.length} sentence(s), from ${chosen.from.toUpperCase()}`)
  line(`      of which reaction-shaped: ${chosen.sentences.filter(isReactionShaped).length}`)
}
const featRows = featReactionOptions(character)
line(`  featReactionOptions → ${featRows.length} option(s)`)
for (const o of featRows) {
  line(`   · ${o.name}  [words from ${o.wordsFrom}]  when: ${o.mechanicsLine || 'UNSTATED'}`)
}

hr('4. Hearthfire retaliation — is the die reachable at all?')
const cloak = featureByName('Hearthfire Manifest')
line(`  canon feature found: ${cloak ? 'yes' : 'NO'}`)
line(`  retaliationOf(canon) → ${JSON.stringify(retaliationOf(cloak, ctx))}`)
line(`  his tempHP=${character.tempHP} tempHPSource=${JSON.stringify(character.tempHPSource)}`)
line(`  activeRetaliation(him) → ${JSON.stringify(activeRetaliation(character, ctx))}`)

hr('5. Where the cloak actually sits in his turn')
const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
for (const o of all.filter(o => /hearthfire|cloak/i.test(o.name))) {
  line(`   · ${o.name}  slot=${o.cost.slot}  label="${o.cost.label}"  grantsTempHP=${o.grantsTempHP ?? 'none'}`)
}
line(`  (turn has ${all.length} options; ${all.filter(o => o.cost.slot === 'reaction').length} cost a reaction)`)
