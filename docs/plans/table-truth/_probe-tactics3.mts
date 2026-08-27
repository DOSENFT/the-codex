/* Throwaway: which options actually get a "How to use it" band? */
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import { composeTurn } from '../../../src/lib/turn/compose'
import { optionDetail } from '../../../src/lib/turn/detail'
const t = composeTurn({ character: NIX, combat: { inCombat: true, round: 3, yourTurn: true, turnActions: { action: false, bonusAction: false, reaction: false, movement: false }, spellSlots: { 1: { used: 0, max: 4 }, 2: { used: 0, max: 3 } }, concentrating: null } as never })
const all = [...t.ranked, ...t.mutex.flatMap(g => g.faces), ...t.rest]
for (const o of all) {
  const d = optionDetail(o, NIX, t.economy)
  console.log(String(d.tactics?.length ?? 0).padStart(2), '·', o.name)
}
