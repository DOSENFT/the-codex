/* WHERE DOES THE HEAL SIT, AND ON WHOSE SHEET?  Instrument for the open ruling.
 *
 * The claim carried since R6 is: "on the NIX fixture (41/76) a heal outranks a
 * weapon at the head of the shortlist — it affects the fixture, NOT his real
 * export." The second half of that sentence was reasoned, not measured, and
 * this phase has now twice been wrong in exactly that way (`.rbtn.end`, the
 * dice-roller tab). So: measure both sheets, across the whole HP range, and let
 * the ruling be made on numbers.
 *
 * It prints the shortlist head — what he reads FIRST — at each HP band, with
 * the score and the `why` line, for:
 *
 *   · the NIX fixture (the sheet the tests use)
 *   · his real export     (the sheet he plays)
 *
 * Run:  npx vite-node docs/plans/your-turn/_diag-rank.ts
 */
import { readFileSync } from 'node:fs'
import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import type { Character } from '../../../src/lib/character'
import type { CombatState } from '../../../src/lib/combat-state'

const SHEET: Character = JSON.parse(
  readFileSync('C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json', 'utf8'),
)

const FIGHTING: CombatState = {
  inCombat: true,
  round: 3,
  yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {},
  concentrating: null,
}

const at = (c: Character, current: number): Character => ({
  ...c,
  hitPoints: { ...(c.hitPoints ?? { max: 0, current: 0 }), current },
})

function report(label: string, base: Character) {
  const max = base.hitPoints?.max ?? 0
  console.log(`\n${'='.repeat(72)}\n${label}  —  max ${max} hp\n${'='.repeat(72)}`)
  /* Full, a scratch, just above and just below the bloodied line, and nearly
     down. The bloodied line is max/2 rounded, so 50% is the interesting edge. */
  const bands = [max, Math.round(max * 0.75), Math.round(max * 0.55), Math.round(max * 0.45), Math.round(max * 0.1)]
  for (const hp of bands) {
    const turn = composeTurn({ character: at(base, hp), combat: FIGHTING })
    const pct = Math.round((hp / max) * 100)
    console.log(`\n  ${String(hp).padStart(3)}/${max}  (${String(pct).padStart(3)}%)${turn.vitals?.bloodied ? '  BLOODIED' : ''}`)
    for (const [i, o] of turn.ranked.entries()) {
      const head = i === 0 ? '>' : ' '
      console.log(
        `   ${head} ${String(o.score).padStart(6)}  ${o.name.slice(0, 30).padEnd(30)} ` +
          `${(o.cost?.slot ?? '—').padEnd(12)} ${o.why ?? ''}`,
      )
    }
  }
}

report('NIX FIXTURE (src/lib/turn/fixtures/nix.ts)', NIX)
report('HIS REAL EXPORT (codex-nix-lvl7)', SHEET)
