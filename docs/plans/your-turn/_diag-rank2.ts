/* WHY DOES HIS SHORTLIST NOT MOVE WHEN HE IS DYING?
 *
 * `_diag-rank.ts` measured it: on his real export the top five are byte-
 * identical at 67/67 and at 7/67. The hurt factor (`hurtMax: 50`, the largest
 * situational weight in `rank.ts`) does nothing at all on the sheet he plays.
 * This asks where the heals went — are they absent, unavailable, or present and
 * simply not matching?
 *
 *   npx vite-node docs/plans/your-turn/_diag-rank2.ts
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
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}

/* The SAME regex `rank.ts` uses. Copied literally rather than imported so that
   a change to the rule shows up here as a disagreement instead of moving both
   sides at once. */
const HEALS = /\bheal(s|ing)?\b|\bhit points?\b|\brestores?\b|\btemp(orary)? hp\b/i

function look(label: string, base: Character, hp: number) {
  const c: Character = { ...base, hitPoints: { ...(base.hitPoints ?? { max: 0, current: 0 }), current: hp } }
  const turn = composeTurn({ character: c, combat: FIGHTING })
  const every = [...turn.ranked, ...turn.rest]
  console.log(`\n${'='.repeat(72)}\n${label} at ${hp}/${base.hitPoints?.max}` +
    `  —  ${turn.ranked.length} in shortlist, ${turn.rest.length} below, ${every.length} total\n${'='.repeat(72)}`)

  const healy = every.filter(o => HEALS.test(`${o.name} ${o.detail ?? ''}`))
  console.log(`\n  MATCHES THE HEAL RULE on name+detail: ${healy.length}`)
  for (const o of healy) {
    const where = turn.ranked.includes(o) ? 'SHORTLIST' : 'below'
    console.log(`    ${String(o.score).padStart(6)}  ${o.name.padEnd(28)} ${(o.cost?.slot ?? '—').padEnd(12)} ` +
      `avail=${String(o.available).padEnd(5)} ${where.padEnd(10)} why="${o.why ?? ''}"`)
    console.log(`            detail: ${(o.detail ?? '').slice(0, 90)}`)
  }

  /* The heal factor reads the composer's HINTS (full authored prose), not the
     rendered detail — so an option can score as a heal while failing the check
     above. Ask the score instead of the text: at 10% hp a heal must carry a
     large positive `healing, hurt`, and that shows up as a `why`. */
  const said = every.filter(o => o.why === 'You are bloodied' || o.why === 'You are hurt')
  console.log(`\n  SCORED AS A HEAL (carries the hurt phrase): ${said.length}`)
  for (const o of said)
    console.log(`    ${String(o.score).padStart(6)}  ${o.name.padEnd(28)} avail=${o.available} ` +
      `${turn.ranked.includes(o) ? 'SHORTLIST' : 'below'}`)

  console.log(`\n  UNAVAILABLE options (cannot reach the shortlist at all): ${every.filter(o => !o.available).length}`)
  for (const o of every.filter(o => !o.available).slice(0, 12))
    console.log(`    ${o.name.padEnd(28)} ${(o.cost?.label ?? '').slice(0, 40).padEnd(40)} ${o.blockedReason ?? ''}`)
}

look('HIS REAL EXPORT', SHEET, 7)
look('NIX FIXTURE', NIX, 8)

/* And the raw sheet: what does he actually own that says "heal"? */
console.log(`\n${'='.repeat(72)}\nRAW SHEET — anything whose authored text mentions healing\n${'='.repeat(72)}`)
for (const key of ['spells', 'features', 'weapons', 'items'] as const) {
  const list = (SHEET as unknown as Record<string, unknown>)[key]
  if (!Array.isArray(list)) { console.log(`  ${key}: absent`); continue }
  const hits = list.filter(e => HEALS.test(JSON.stringify(e)))
  console.log(`  ${key}: ${list.length} entries, ${hits.length} mention healing`)
  for (const h of hits.slice(0, 10)) {
    const e = h as Record<string, unknown>
    console.log(`     · ${String(e.name)}  prepared=${String(e.prepared)} level=${String(e.level)} uses=${String(e.usesCurrent)}/${String(e.usesMax)}`)
  }
}
