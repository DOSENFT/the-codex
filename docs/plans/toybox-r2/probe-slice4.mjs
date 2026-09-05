/* ===========================================================================
   CAN SLICE 4'S NEW TESTS FAIL? — a throwaway, run once, then deleted.

   Same harness and same reason as `probe-slice3.mjs`. The playbook's rule is
   "never write a test that passes against the pre-change code", and slice 4's
   five assertions were all written AFTER the card they check — the situation
   where a test is most likely to be quietly vacuous.

   Two of them proved they could fail during the slice without any help: the
   ten-id order list went red the moment "The Caster Killer" was added, and the
   Concentration-attribution check went red on its FIRST run against a false
   positive of its own making (it split the card's text on sentence punctuation,
   and tags carry no full stop, so they glued onto the front of the first
   warning). The other three had never been seen red. This breaks the content on
   purpose, one mutation at a time, and requires the NAMED test to go red.

   It edits a real file and puts it back. If it dies halfway, `git diff` on the
   combos pack is the repair.
   ========================================================================= */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const COMBOS = 'src/lib/toybox-seed/packs/hearth-7-r2.combos.ts'

/** Each: a literal to replace, what to replace it with, and the test name that
 *  MUST go red. A mutation that leaves everything green is a test that was not
 *  testing anything. */
const MUTATIONS = [
  {
    what: 'send the enemy against HIS save DC instead of the flat 10',
    from: "'THE CONCENTRATION SAVE IS A FLAT DC 10, NOT YOUR {{saveDC}}. It is 10, '",
    to: "'THE CONCENTRATION SAVE IS DC {{saveDC}}, THE SAME AS YOUR SPELLS. It is 10, '",
    expect: 'says the Concentration save is a flat 10',
  },
  {
    what: 'state the Concentration denial as the app’s own claim',
    from: "+ 'IT. WARFARE-DOCTRINE.md line 97 says it is not, and that is the same '\n          + 'file that gets Prone backwards, so it is not enough on its own. This '",
    to: "+ 'IT. Searing Smite is not Concentration, so it costs you nothing. This '",
    expect: 'leaves the Searing Smite Concentration question open, and attributed',
  },
  {
    what: 'stop handing the open question to his DM',
    from: "+ 'take threatens to put your own fire out. Ask your DM once, before you '\n          + 'build a round on it.',",
    to: "+ 'take threatens to put your own fire out.',",
    expect: 'leaves the Searing Smite Concentration question open, and attributed',
  },
  {
    what: 'swap the Bonus Action back to the obvious Divine Smite',
    from: "        sourceName: 'Searing Smite',\n        notes:\n          'Cast it the instant a swing HITS.",
    to: "        sourceName: 'Divine Smite',\n        notes:\n          'Cast it the instant a swing HITS.",
    expect: 'rejects Divine Smite by name, which is the surprise',
  },
  {
    what: 'gate the tenth card on a weapon property, so his sheet loses it',
    from: "    id: 'seed:hearth-7-r2:the-caster-killer',\n    name: 'The Caster Killer',",
    to: "    id: 'seed:hearth-7-r2:the-caster-killer',\n    name: 'The Caster Killer',\n    needs: { weaponProperties: ['Ammunition'] },",
    expect: 'is on his sheet at all',
  },
  {
    what: 'move the last card above Drop the Glaive',
    from: "    id: 'seed:hearth-7-r2:the-caster-killer',",
    to: "    id: 'seed:hearth-7-r2:zzz-the-caster-killer',",
    expect: 'paints all ten, round two’s own order',
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

const before = readFileSync(COMBOS, 'utf8')

let survived = 0
for (const m of MUTATIONS) {
  if (!before.includes(m.from)) {
    console.log(`⚠  ${m.what}: the anchor text is not in ${COMBOS} — mutation not applied`)
    survived++
    continue
  }
  writeFileSync(COMBOS, before.replace(m.from, m.to))
  const out = run()
  writeFileSync(COMBOS, before)

  const red = out.includes(m.expect)
  console.log(`${red ? '✓' : '✗'}  ${m.what}`)
  console.log(`     expected red: "${m.expect}"`)
  if (!red) {
    survived++
    const fails = [...out.matchAll(/FAIL[^\n]*>\s*([^\n]+)/g)].map(x => x[1].trim())
    console.log(`     WENT GREEN, or the wrong test caught it. Red instead: ${fails.join(' | ') || 'nothing'}`)
  }
}

writeFileSync(COMBOS, before)

console.log(`\n${MUTATIONS.length - survived} of ${MUTATIONS.length} mutations were caught by the test named for them.`)
if (survived) {
  console.log('A surviving mutation is a test that does not test what it says.')
  process.exit(1)
}
