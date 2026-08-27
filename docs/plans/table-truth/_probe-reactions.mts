/* What does the engine actually hold for Nix's reactions, on his turn and off it?
 *
 *   npx vite-node docs/plans/table-truth/_probe-reactions.mts
 *
 * Slice 6 fact-finding. Throwaway — it answers "what is there" before anything
 * is designed against an imagined shape.
 */

import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { featureByName, spellByName } from '../../../src/lib/canon/lookup.ts'

for (const yourTurn of [true, false]) {
  const turn = composeTurn({
    character: NIX,
    combat: {
      inCombat: true,
      round: 3,
      yourTurn,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
      spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
      concentrating: null,
      conditions: [],
    } as never,
  })

  const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
  const reactions = all.filter(o => o.cost.slot === 'reaction')

  console.log(`\n=== yourTurn=${yourTurn} · turn.yourTurn=${turn.yourTurn} ===`)
  console.log(`ranked ${turn.ranked.length} · rest ${turn.rest.length} · mutex faces ${turn.mutex.flatMap(g => g.faces).length}`)
  console.log(`reactions found: ${reactions.length}`)
  for (const r of reactions) {
    const where = turn.ranked.includes(r) ? 'ranked' : turn.rest.includes(r) ? 'rest' : 'mutex'
    console.log(
      `  [${where}] ${r.name}  (${r.kind}, ${r.available ? 'available' : 'BLOCKED: ' + r.blockedReason})`,
    )
    console.log(`      detail: ${r.detail}`)
    console.log(`      canon:  ${r.provenance ?? '(none)'} ${r.canonId ?? ''}`)
  }
}

console.log('\n=== the full shape of each reaction row ===')
{
  const t = composeTurn({ character: NIX, combat: null })
  const all = [...t.ranked, ...t.rest, ...t.mutex.flatMap(g => g.faces)]
  for (const o of all.filter(o => o.cost.slot === 'reaction')) {
    console.log(
      JSON.stringify(
        {
          id: o.id, name: o.name, kind: o.kind, cost: o.cost, detail: o.detail,
          source: o.source, homebrew: o.homebrew, synthetic: o.synthetic, dice: o.dice,
        },
        null, 1,
      ),
    )
  }
  console.log('actor:', JSON.stringify(t.actor))
  console.log('resources:', JSON.stringify(t.resources))
}

console.log('\n=== lookup probes slice 6 must fix ===')
for (const name of [
  'Flaming Cloak',
  'Hearthfire Manifest',
  'Channel Divinity',
  'Channel Divinity: Sacred Weapon',
  'Divine Sense',
  'Sacred Weapon',
]) {
  const f = featureByName(name)
  console.log(`  featureByName(${JSON.stringify(name)}) -> ${f ? f.name : 'MISS'}`)
}
console.log(`  spellByName("Shield") -> ${spellByName('Shield')?.name ?? 'MISS'}`)

console.log('\n=== the canon record the alias now reaches ===')
{
  const f = featureByName('Flaming Cloak')
  console.log(JSON.stringify(f, null, 1))
}

console.log('\n=== the row models the band will paint ===')
{
  const { reactionRows } = await import('../../../src/lib/turn/reactions.ts')
  for (const yourTurn of [true, false]) {
    const t = composeTurn({
      character: NIX,
      combat: {
        inCombat: true, round: 3, yourTurn,
        turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
        spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
        concentrating: null, conditions: [],
      } as never,
    })
    console.log(`-- yourTurn=${yourTurn}`)
    for (const r of reactionRows(t, NIX)) {
      console.log(`  ${r.name}  [${r.cost}]  ${r.provenance}${r.homebrew ? ' homebrew' : ''}`)
      console.log(`    WHEN(${r.whenSource}): ${r.when ?? '— none stated —'}`)
      console.log(`    BODY(${r.body.length}): ${r.body}`)
      console.log(`    errata: ${r.errataIds.join(', ') || '(none)'}`)
    }
  }
}

console.log('\n=== what the sheet declares as reactions ===')
for (const f of NIX.classFeatures ?? []) {
  if ((f as { actionType?: string }).actionType === 'reaction') {
    console.log(`  ${f.name}  :: ${(f as { description?: string }).description ?? ''}`)
  }
}
