/* ===========================================================================
   THROWAWAY. Delete after slice 6 (🟡 ASK-FIRST — listed in 00-status.md).

   Slice 6 added eight unit tests and all eight have only ever been seen GREEN.
   A test that has only ever agreed with you is not a test. So this breaks the
   content, checks that the NAMED test goes red, and puts the content back.

   TWO THINGS DIFFER FROM `probe-slice5-tests.mjs`, and both are honest about
   what these particular tests are.

   FIRST, A MUTATION MAY CARRY SEVERAL EDITS. Slice 5's tests each guarded one
   literal, so one edit could kill one test. Slice 6's do not: five of the six
   plays name TWO licensed things — Rysanna in a phrase and `changeling` in a
   tag — so removing one leaves the other, and `gives every play something
   licensed to be about` stays correctly green. Pretending otherwise would mean
   writing a weaker test to make a probe easier, which is backwards.

   SECOND, IT PRINTS EVERY TEST THAT WENT RED, not just the named one. These
   tests are deliberately nested claims: "the names are present" and "every play
   has one" overlap, so a mutation aimed at the second often trips the first as
   well. That overlap is a property of the tests and is better shown than
   hidden — a mutation that killed FIVE tests would mean the suite is one test
   wearing five titles, and this is how you would see it.

   Restores the file in a `finally`, and prints the hash before and after so a
   crash mid-run is visible rather than silent.
   ========================================================================= */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'

const PERSONA = 'src/lib/toybox-seed/packs/hearth-7-r2.persona.ts'

const hash = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12)
const before = hash(PERSONA)

/* Each mutation names the test it must kill. `kills` is a fragment of the test
   title as vitest prints it. `edits` is applied in order. */
const MUTATIONS = [
  {
    what: 'take one of the six names off the only card that carries it',
    kills: 'names the six the licence was granted for',
    edits: [{
      from: "      'Half-elf thing. Runs in the family. Rysanna had them and I did not much '",
      to: "      'Half-elf thing. Runs in the family. She had them and I did not much '",
    }],
  },
  {
    what: 'stop naming the changeling trait round one refused to spend',
    kills: 'spends the changeling round one deliberately left alone',
    edits: [{
      from: "      'Shape-Shifter is an ACTION, not a Bonus Action, and it can only make you '",
      to: "      'The trait is an ACTION, not a Bonus Action, and it can only make you '",
    }],
  },
  {
    what: 'strip a whole play back to something any paladin could have been given',
    kills: 'gives every play something licensed to be about',
    /* TWO EDITS, and the second is the point. "The Eyes You Never Change" is
       licensed twice over — by Rysanna in a key phrase and by the `changeling`
       tag — so one edit leaves it correctly passing. Both together leave a card
       about a stranger's silver eyes, which is exactly round one's content. */
    edits: [
      {
        from: "      'Half-elf thing. Runs in the family. Rysanna had them and I did not much '",
        to: "      'Half-elf thing. Runs in the family. She had them and I did not much '",
      },
      {
        from: "    tags: ['roleplay', 'changeling', 'deception', 'secret'],",
        to: "    tags: ['roleplay', 'social', 'deception', 'secret'],",
      },
    ],
  },
  {
    what: 're-key one play, the way a rename does when somebody renames the key too',
    kills: 'paints the six in the order they were approved',
    edits: [{
      from: "    id: 'seed:hearth-7-r2:ask-scar',",
      to: "    id: 'seed:hearth-7-r2:ask-scar-moved',",
    }],
  },
  {
    what: 'let a skill-check badge grow past the width the header can hold',
    kills: 'keeps skillCheck to 24 characters',
    edits: [{
      from: "    skillCheck: 'Persuasion, adv.',",
      to: "    skillCheck: 'Persuasion, with advantage',",
    }],
  },
  {
    what: 'take a badge away, leaving one header short a row',
    kills: 'gives every play a skillCheck',
    edits: [{ from: "    skillCheck: 'Persuasion',\n", to: '' }],
  },
  {
    what: 'let a key phrase bring its own quotes, which the component then doubles',
    kills: 'puts no quotation mark inside a keyPhrase',
    edits: [{
      from: "      'You can look. Everyone looks. It is the only interesting thing about a '",
      to: "      'You can look. \"Everyone looks.\" It is the only interesting thing about a '",
    }],
  },
  {
    what: 'risk a whole play on a party token, in the one field that drops the play',
    kills: 'keeps party tokens out of every load-bearing field',
    edits: [{
      from: "      'Fate is a wildfire spirit that came out of Selis’s burning pendant, and '",
      to: "      'Fate is a spirit {{bard}} has met, out of Selis’s burning pendant, and '",
    }],
  },
  {
    what: 'leave a play with no note — no rule to check and no warning',
    kills: 'gives every play at least one annotation',
    edits: [{
      from: "    skillCheck: 'No roll — ask Scar',\n    annotations: [",
      to: "    skillCheck: 'No roll — ask Scar',\n    annotationsRemoved: [",
    }],
  },
]

/** Every failing test title vitest printed, in order. */
const redTests = out => {
  const names = []
  for (const line of out.split('\n')) {
    const m = /FAIL.*?>\s*(.+?)\s*$/.exec(line.replace(/\[[0-9;]*m/g, ''))
    if (m && !m[1].endsWith('.ts')) names.push(m[1])
  }
  return [...new Set(names)]
}

const run = () => {
  try {
    execSync('npx vitest run src/lib/toybox-seed --reporter=basic', { encoding: 'utf8', stdio: 'pipe' })
    return ''
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

let ok = 0

try {
  for (const m of MUTATIONS) {
    const original = readFileSync(PERSONA, 'utf8')
    let mutated = original
    let stale = null
    for (const e of m.edits) {
      if (!mutated.includes(e.from)) { stale = e.from; break }
      mutated = mutated.replace(e.from, e.to)
    }
    if (stale) {
      console.log(`\n✗ ${m.what}\n  THE LITERAL IS NOT IN THE FILE — probe is stale, not the code\n  ${stale.trim().slice(0, 70)}`)
      continue
    }

    writeFileSync(PERSONA, mutated)
    const out = run()
    writeFileSync(PERSONA, original)

    const red = out.length > 0
    const named = out.includes(m.kills)
    const also = redTests(out).filter(t => !t.includes(m.kills))

    if (red && named) {
      ok++
      console.log(`\n✓ ${m.what}\n  → killed "${m.kills}"`)
      if (also.length) console.log(`    and took with it: ${also.join(' · ')}`)
    } else if (red) {
      console.log(`\n✗ ${m.what}\n  → something went red, but NOT "${m.kills}" — the wrong test is guarding this`)
      console.log(`    red: ${redTests(out).join(' · ') || '(could not parse)'}`)
    } else {
      console.log(`\n✗ ${m.what}\n  → EVERYTHING STAYED GREEN. "${m.kills}" cannot fail.`)
    }
  }
} finally {
  console.log(`\nfile hash — persona ${before} → ${hash(PERSONA)}`)
  console.log(`${hash(PERSONA) === before ? 'restored' : 'NOT RESTORED — check git diff'}`)
}

console.log(`\n${ok} of ${MUTATIONS.length} mutations killed the test named for them`)
process.exit(ok === MUTATIONS.length ? 0 : 1)
