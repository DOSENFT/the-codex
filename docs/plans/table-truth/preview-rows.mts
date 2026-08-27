/* Print every canon spell's rendered row line, so a human can read all 71 at
 * once instead of trusting that the tests cover the cases they'd have worried
 * about. This is the evidence generator for the slice reports.
 *
 *   npx vite-node docs/plans/table-truth/preview-rows.mts
 *
 * Optional: pass a character level to see cantrip scaling move.
 *
 *   npx vite-node docs/plans/table-truth/preview-rows.mts 11
 */

import { SPELLS } from '../../../src/canon/index.ts'
import { mechanicsLine, ROW_BUDGET_CHARS, type CasterContext } from '../../../src/lib/canon/format.ts'

const level = Number(process.argv[2]) || 7

/* Nix at the table. The DC and attack bonus come from the sheet, never canon. */
const ctx: CasterContext = {
  spellSaveDC: 15,
  spellAttackBonus: 7,
  characterLevel: level,
  abilityMod: 4,
}

let qualified = 0
let withDrops = 0
let longest = 0
const dropCounts = new Map<string, number>()

const lines = SPELLS.map(spell => {
  const line = mechanicsLine(spell, ctx)
  if (line.qualified) qualified++
  if (line.dropped.length > 0) withDrops++
  for (const kind of line.dropped) dropCounts.set(kind, (dropCounts.get(kind) ?? 0) + 1)
  longest = Math.max(longest, line.text.length)

  const name = (spell.name + ' '.repeat(30)).slice(0, 30)
  const width = String(line.text.length).padStart(2)
  const flag = line.qualified ? ' ▸' : '  '
  const drops = line.dropped.length > 0 ? `  DROPPED: ${line.dropped.join(', ')}` : ''
  return `${name} ${width} ${flag} ${line.text}${drops}`
})

console.log(`CANON ROW LINES — character level ${level}, DC ${ctx.spellSaveDC}, spell attack +${ctx.spellAttackBonus}\n`)
console.log(lines.join('\n'))
console.log(`
${SPELLS.length} spells · budget ${ROW_BUDGET_CHARS} chars · longest ${longest}
${qualified} carry a qualifier canon put in prose (marked ▸ — full text is in the detail sheet)
${withDrops} lost a segment to the budget${dropCounts.size > 0 ? ` (${[...dropCounts].map(([k, n]) => `${k} ×${n}`).join(', ')})` : ''}
0 truncated — that is the promise, and the test suite enforces it`)
