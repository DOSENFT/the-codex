/* ===========================================================================
   THROWAWAY. Delete after slice 5 (🟡 ASK-FIRST — listed in 00-status.md).

   Slice 5 added seven tests. All seven have only ever been seen GREEN, and a
   test that has only ever agreed with you is not a test. So this breaks the
   content, one literal at a time, and checks that the NAMED test — not merely
   "some test" — goes red, then puts the literal back.

   Same harness as `probe-slice3.mjs` and `probe-slice4.mjs`. It restores the
   file in a `finally`, and prints the file's hash before and after so a crash
   mid-run is visible rather than silent.
   ========================================================================= */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'

const TACTICS = 'src/lib/toybox-seed/packs/hearth-7-r2.tactics.ts'
const COMBOS = 'src/lib/toybox-seed/packs/hearth-7-r2.combos.ts'

const hash = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12)
const before = { [TACTICS]: hash(TACTICS), [COMBOS]: hash(COMBOS) }

/* Each mutation names the test it must kill. `expect` is a fragment of the test
   title as vitest prints it. */
const MUTATIONS = [
  {
    file: TACTICS,
    what: 'number a step, the way a combo numbers a turn',
    from: "      'Find the Prepared Spells column on the Paladin table — seven at levels 7 '",
    to: "      '1. Find the Prepared Spells column on the Paladin table — seven at levels 7 '",
    kills: 'never numbers its steps',
  },
  {
    file: TACTICS,
    what: 'open a step by spending the action economy',
    from: "      'Find the Prepared Spells column on the Paladin table — seven at levels 7 '",
    to: "      'Action: Find the Prepared Spells column on the Paladin table — at levels 7 '",
    kills: 'never opens a step by spending the action economy',
  },
  {
    file: TACTICS,
    what: 'take a category away',
    from: "    category: 'control',",
    to: '',
    kills: 'gives every tactic a requirement and a category',
  },
  {
    file: TACTICS,
    what: 'un-gate the Sentinel tactic, so an unarmed paladin gets a Reaction card',
    from: "    needs: { feats: ['Sentinel'] },",
    to: '',
    kills: 'gates the two tactics that are wrong for a different paladin',
  },
  {
    file: TACTICS,
    what: 'stop naming the document the doctrine card overrules',
    from: "      + 'WARFARE-DOCTRINE.md line 57 is where the Action-spell-plus-Bonus-'",
    to: "      + 'Somewhere in your notes is where the Action-spell-plus-Bonus-'",
    kills: 'names WARFARE-DOCTRINE.md',
  },
  {
    file: TACTICS,
    what: 'stop naming the class table on the saving-throw card',
    from: "      + 'paladin_1.txt line 12, the 2024 Paladin class table: \"Saving Throw '",
    to: "      + 'the class table somewhere: \"Saving Throw '",
    kills: 'names the class table and the empty field',
  },
  {
    file: TACTICS,
    what: 'drop one of the Radiant Swing fragments the DM card must quote',
    from: "      '\"Skip 1 attack = light\" — skip which attack, and do I still get the other '",
    to: "      '\"That one line about attacks\" — which attack, and do I still get the other '",
    kills: 'asks about Radiant Swing rather than answering it',
  },
]

let ok = 0

const run = () => {
  try {
    execSync('npx vitest run src/lib/toybox-seed --reporter=basic', { encoding: 'utf8', stdio: 'pipe' })
    return ''
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

try {
  for (const m of MUTATIONS) {
    const original = readFileSync(m.file, 'utf8')
    if (!original.includes(m.from)) {
      console.log(`\n✗ ${m.what}\n  THE LITERAL IS NOT IN THE FILE — probe is stale, not the code`)
      continue
    }
    writeFileSync(m.file, original.replace(m.from, m.to))
    const out = run()
    writeFileSync(m.file, original)

    const red = out.length > 0
    const named = out.includes(m.kills)
    if (red && named) {
      ok++
      console.log(`\n✓ ${m.what}\n  → killed "${m.kills}"`)
    } else if (red) {
      console.log(`\n✗ ${m.what}\n  → something went red, but NOT "${m.kills}" — the wrong test is guarding this`)
    } else {
      console.log(`\n✗ ${m.what}\n  → EVERYTHING STAYED GREEN. "${m.kills}" cannot fail.`)
    }
  }
} finally {
  console.log(`\nfile hashes — tactics ${before[TACTICS]} → ${hash(TACTICS)}, combos ${before[COMBOS]} → ${hash(COMBOS)}`)
  console.log(`${hash(TACTICS) === before[TACTICS] && hash(COMBOS) === before[COMBOS] ? 'restored' : 'NOT RESTORED — check git diff'}`)
}

console.log(`\n${ok} of ${MUTATIONS.length} mutations killed the test named for them`)
process.exit(ok === MUTATIONS.length ? 0 : 1)
