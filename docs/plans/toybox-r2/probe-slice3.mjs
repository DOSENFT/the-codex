/* ===========================================================================
   CAN SLICE 3'S NEW TESTS FAIL? — a throwaway, run once, then deleted.

   The playbook's rule is "never write a test that passes against the
   pre-change code", and four of slice 3's assertions were written AFTER the
   content they check, which is exactly the situation where a test can be
   quietly vacuous. Three of them proved they could fail on their own during
   the slice — the two counts went red the moment the combos landed, and the
   shopping-list check went red on "flask" vs "flasks". The rest had never been
   seen red, so this breaks the content on purpose, one mutation at a time,
   and requires the NAMED test to go red for each.

   It edits real files and puts them back. If it dies halfway, `git diff` on
   the two pack files is the repair.
   ========================================================================= */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const COMBOS = 'src/lib/toybox-seed/packs/hearth-7-r2.combos.ts'
const TACTICS = 'src/lib/toybox-seed/packs/hearth-7-r2.tactics.ts'

/** Each: the file, a literal to replace, what to replace it with, and the
 *  test name that MUST go red. A mutation that leaves everything green is a
 *  test that was not testing anything. */
const MUTATIONS = [
  {
    what: 'un-gate Drop the Glaive',
    file: COMBOS,
    from: "    needs: { weaponProperties: ['Two-Handed'] },",
    to: '',
    expect: 'drops Drop the Glaive for a one-handed Paladin',
  },
  {
    what: 'gate Bearings on owning the bearings',
    file: COMBOS,
    from: "    category: 'utility',\n    blocks: [\n      {\n        id: 'seed:hearth-7-r2:bearings-and-the-backward-walk:1',",
    to: "    category: 'utility',\n    needs: { weaponProperties: ['Ball bearings'] },\n    blocks: [\n      {\n        id: 'seed:hearth-7-r2:bearings-and-the-backward-walk:1',",
    expect: 'never gates a combo on the gear',
  },
  {
    what: 'delete the Compelled Duel correction from the card',
    file: COMBOS,
    from: "'than 30 feet from you. It does NOT drag it toward you — it makes '",
    to: "'than 30 feet from you. It is the only real taunt in the game — it makes '",
    expect: 'prints the denial on the card',
  },
  {
    what: 'reintroduce the drag as a fact',
    file: COMBOS,
    from: "label: 'Compelled Duel — you are the only target',",
    to: "label: 'Compelled Duel drags it across the bearings.',",
    expect: 'never states the drag as a fact',
  },
  {
    what: 'let the card keep his files’ backwards Prone rule',
    file: COMBOS,
    from: "+ 'says Advantage only if you are within 5 FEET; from farther away it '",
    to: "+ 'says Advantage whenever it is down, wherever you stand, so it '",
    expect: 'tells him Prone at reach is a penalty',
  },
  {
    what: 'take the gear out of a combo’s requirements',
    file: COMBOS,
    from: "'A bag of ball bearings — 2 gp, and you own none',",
    to: "'Two gold, spent in advance',",
    expect: 'states the gear in `requirements`',
  },
  {
    what: 'ship the equipment combos with no shopping list',
    file: TACTICS,
    from: "export const HEARTH_7_R2_TACTICS: SeedTactic[] = [",
    to: "export const HEARTH_7_R2_TACTICS: SeedTactic[] = []\nconst _PARKED: SeedTactic[] = [",
    expect: 'ships a card that tells him to buy every one of them',
  },
  /* BOTH warnings, not one. The first attempt flipped only the price warning
     and everything stayed green — correctly, because the card still carried
     its second warning and the assertion is "warned", not "warned twice". The
     probe was the weak half, not the test. */
  {
    what: 'drop every warning from the shopping list',
    file: TACTICS,
    from: "        kind: 'warning',",
    to: "        kind: 'positioning',",
    all: true,
    expect: 'carries a warning wherever it states a number',
  },
  {
    what: 'leave the shopping list with no trigger',
    file: TACTICS,
    from: "    trigger:\n      'You are in a town, between sessions, or anywhere with a shop — and your '\n      + 'supplies list on this app is completely empty.',",
    to: "    trigger: '',",
    expect: 'answers WHEN with a trigger',
  },
  {
    what: 'name the rogue in a load-bearing tactic field',
    file: TACTICS,
    from: "      'Total under 20 gp. Then open the supplies list in this app and type them '",
    to: "      'Total under 20 gp. Ponzi will want to know. Open the supplies list and type them '",
    expect: 'keeps party names out of a tactic’s load-bearing fields',
  },
]

const run = () => {
  try {
    execSync('npx vitest run src/lib/toybox-seed --reporter=basic', {
      encoding: 'utf8', stdio: 'pipe',
    })
    return ''
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

const originals = new Map()
for (const f of [COMBOS, TACTICS]) originals.set(f, readFileSync(f, 'utf8'))

let survived = 0
for (const m of MUTATIONS) {
  const before = originals.get(m.file)
  if (!before.includes(m.from)) {
    console.log(`⚠  ${m.what}: the anchor text is not in ${m.file} — mutation not applied`)
    survived++
    continue
  }
  writeFileSync(m.file, m.all ? before.split(m.from).join(m.to) : before.replace(m.from, m.to))
  const out = run()
  writeFileSync(m.file, before)

  const red = out.includes(m.expect)
  console.log(`${red ? '✓' : '✗'}  ${m.what}`)
  console.log(`     expected red: "${m.expect}"`)
  if (!red) {
    survived++
    const fails = [...out.matchAll(/FAIL[^\n]*>\s*([^\n]+)/g)].map(x => x[1].trim())
    console.log(`     WENT GREEN, or the wrong test caught it. Red instead: ${fails.join(' | ') || 'nothing'}`)
  }
}

for (const [f, s] of originals) writeFileSync(f, s)

console.log(`\n${MUTATIONS.length - survived} of ${MUTATIONS.length} mutations were caught by the test named for them.`)
if (survived) {
  console.log('A surviving mutation is a test that does not test what it says.')
  process.exit(1)
}
