/* Throwaway: which bucket does each option land in, and which of them can the
   Play tab actually open a detail sheet for today? */
import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'

const show = (label: string, turn: ReturnType<typeof composeTurn>) => {
  console.log(`\n=== ${label} · slotUsed=${turn.economy.spellSlotUsedThisTurn}`)
  console.log(' ranked:')
  for (const o of turn.ranked) console.log(`   ${o.name.padEnd(34)} slot=${o.cost.spellSlotLevel ?? '-'} avail=${o.available}`)
  console.log(' mutex:')
  for (const g of turn.mutex) for (const f of g.faces) console.log(`   ${f.name.padEnd(34)} slot=${f.cost.spellSlotLevel ?? '-'} avail=${f.available}`)
  console.log(' rest:')
  for (const o of turn.rest) console.log(`   ${o.name.padEnd(34)} slot=${o.cost.spellSlotLevel ?? '-'} avail=${o.available}`)
}

const fresh = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: null,
} as never

show('fresh turn', composeTurn({ character: NIX, combat: fresh }))
show('slot already spent', composeTurn({ character: NIX, combat: fresh, log: [{ round: 3, spellSlotLevel: 1 }] }))
