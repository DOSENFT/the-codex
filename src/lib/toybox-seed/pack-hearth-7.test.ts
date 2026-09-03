/* ============================================================================
   THE CONTENT ITSELF — slice 5.

   Every other test file in this folder tests a function. This one tests
   PROSE, and it exists because prose is the part of the feature no compiler
   reads. A misspelled token, an id typed twice, a requirement nobody wrote, a
   number typed in by hand instead of tokenised — none of those break the
   build, and every one of them ships to the table.

   THE SHARPEST TEST HERE IS `numbers are not written down`. A pack that
   hardcoded "10 temp HP (level 7 + Charisma +3)" passes every other assertion
   in this file. It fails that one, because the same pack is resolved a second
   time against a Charisma 18 Paladin 8 and required to say 12, +4, and level
   8 — and required not to say the level-7 numbers anywhere at all.

   A DELIBERATE SHARPENING OF THE GATE 3 PLAN. The design doc asks that the
   CHA-18 resolution "does not contain `+3`". That assertion is unsound:
   proficiency is +3 at level 7 AND at level 8, so a correct pack that writes
   `{{prof}}` fails it. The claim it was reaching for is that no NIX-SPECIFIC
   number survives, so that is what is asserted — "10 temp HP", "level 7" and
   the Charisma 16 aura, by the strings they actually appear in.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { resolveCharacter } from '../rules-2024/derive'
import { fightingStyles, recordFightingStyle } from '../prepare/fighting-style'
import { buildProfile } from './profile'
import { resolveCombo, resolveTactic, resolvePersonaPlay } from './template'
import { HEARTH_7 } from './packs/hearth-7'

const AT = 1_700_000_000_000

/* Marcus's four, transcribed from `codex-nix-lvl7 (2) (1).json`. Scar is here
   on purpose — his relation contains the word "party", and a party parse that
   went soft would put him in the line of battle. */
const PARTY = [
  { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet, inquisitive.', status: 'alive' as const },
  { name: 'Ponzi', relation: 'Party member (Rogue) — observant, reserved.', status: 'alive' as const },
  { name: 'Ketza', relation: 'Party member (Ranger) — young wood elf.', status: 'alive' as const },
  { name: 'Talon', relation: 'Party member (Bard) — rock gnome tinker.', status: 'alive' as const },
  { name: 'Scar', relation: 'Goliath. Partner, moral compass. Knows Nix is a changeling.', status: 'alive' as const },
]

const sheet = (
  over: { level: number; CHA: number; relationships: typeof PARTY | [] },
): Character =>
  resolveCharacter({
    ...NIX,
    level: over.level,
    abilityScores: { ...NIX.abilityScores, STR: 18, CHA: over.CHA },
    backstory: {
      origin: '', keyMemories: [], unresolvedThreads: [], personalitySeeds: [],
      relationships: over.relationships,
    },
  })

const MARCUS = sheet({ level: 7, CHA: 16, relationships: PARTY })
const OTHER = sheet({ level: 8, CHA: 18, relationships: PARTY })
const ORPHAN = sheet({ level: 7, CHA: 16, relationships: [] })

interface Resolved {
  id: string
  annotations?: { kind: string; text: string }[]
  requirements?: string[]
}

/** The whole pack, resolved for one sheet. Nulls are kept, not filtered — a
 *  dropped entry is a failure this file has to be able to see. */
function resolvePack(character: Character) {
  const p = buildProfile(character)
  return {
    combos: HEARTH_7.combos.map(c => resolveCombo(c, p, AT)),
    tactics: HEARTH_7.tactics.map(t => resolveTactic(t, p, AT)),
    personaPlays: HEARTH_7.personaPlays.map(x => resolvePersonaPlay(x, p, AT)),
  }
}

const allEntries = (pack: ReturnType<typeof resolvePack>) =>
  [...pack.combos, ...pack.tactics, ...pack.personaPlays].filter(Boolean) as unknown as Resolved[]

/** Every string anywhere inside a value, at any depth. Block notes and
 *  annotation texts are two and three levels down; an assertion that only
 *  read the top level would miss the places tokens actually live. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

const textOf = (value: unknown) => strings(value).join('\n')

describe('the pack resolves for the character it was written for', () => {
  const pack = resolvePack(MARCUS)

  it('drops nothing — every authored entry reaches the Toybox', () => {
    /* If a token is misspelled anywhere in a load-bearing field, the entry it
       is in returns null and vanishes silently at seed time. This is the only
       place that silence is audible. */
    expect(pack.combos, 'a combo was dropped').not.toContain(null)
    expect(pack.tactics, 'a tactic was dropped').not.toContain(null)
    expect(pack.personaPlays, 'a persona play was dropped').not.toContain(null)
    /* Counted, not compared against the pack's own length — `toHaveLength(
       HEARTH_7.combos.length)` is a sentence that cannot be false. Slice 5 set
       these at 3 / 3 / 1 and said slices 6 to 8 would raise them deliberately
       rather than by accident. Slice 6 is that deliberate act: 3 → 14 combos,
       one edit to this number and eleven new cards behind it. Slice 7 is the
       next one: 3 → 12 tactics. Slice 8 is the third and last: 1 → 5 persona
       plays, one per tenet plus two. */
    expect(pack.combos).toHaveLength(14)
    expect(pack.tactics).toHaveLength(12)
    expect(pack.personaPlays).toHaveLength(5)
  })

  it('never paints a brace', () => {
    for (const text of strings(pack)) {
      expect(text, `braces survived into: ${text}`).not.toContain('{{')
      expect(text).not.toContain('}}')
    }
  })

  it('gives every entry a namespaced id, and no id twice', () => {
    const ids = [
      ...allEntries(pack).map(e => e.id),
      ...pack.combos.flatMap(c => c?.blocks.map(b => b.id) ?? []),
    ]
    for (const id of ids) expect(id, id).toMatch(/^seed:hearth-7:/)
    expect(new Set(ids).size, 'an id is used twice').toBe(ids.length)
  })

  it('gives every combo and every tactic at least one requirement', () => {
    /* The prep-index promise, enforced rather than hoped for. "Preparing for
       Tomorrow" tells him to read these lines backwards into tomorrow's seven,
       and that instruction is a lie the moment one card has nothing to read. */
    for (const entry of [...pack.combos, ...pack.tactics]) {
      expect(entry?.requirements ?? [], `${entry?.id} states no requirement`)
        .not.toHaveLength(0)
    }
  })

  it('files everything under a category and a priority the tabs can filter', () => {
    const COMBO_CATEGORIES = ['burst', 'sustained', 'defensive', 'utility', 'aoe']
    const TACTIC_CATEGORIES = ['core', 'survival', 'burst', 'control', 'support']
    const PRIORITIES = ['critical', 'high', 'normal']
    for (const combo of pack.combos) {
      expect(COMBO_CATEGORIES, combo?.id).toContain(combo?.category)
    }
    for (const tactic of pack.tactics) {
      expect(TACTIC_CATEGORIES, tactic?.id).toContain(tactic?.category)
      expect(PRIORITIES, tactic?.id).toContain(tactic?.priority)
    }
  })
})

describe('slice 6 — the spell list Marcus asked for is actually on the cards', () => {
  /* HIS SCOPE, IN HIS WORDS: "executable for the spells that are unlocked for
     me now, all level 1 and level 2 spells, even if I do not have them
     prepared. This will help me know how to prepare for each day if I know
     what kind of combos and tactics require what abilities and spells."

     That is a coverage promise, and a coverage promise is exactly the kind of
     claim that rots quietly. A card renamed, a spell dropped in a refactor, a
     typo in `sourceName` — none of them break the build, and all of them
     shrink the scope back toward the three cards slice 5 shipped. So the
     promise is written down here as a list, and the list is checked. */
  const combos = resolvePack(MARCUS).combos
  const anywhere = textOf(combos)
  /* THE BLOCKS ONLY — and that distinction is what makes this test worth
     writing. Slice 5's three combos already SAID "Bless", "Shield of Faith"
     and "Lay on Hands", in warnings about what a smite costs you. A coverage
     test that searched the whole card would have counted those passing
     mentions as coverage and reported nine of these already done. A spell is
     covered when it is a STEP of a turn: a block's label, source or note. */
  const inABlock = textOf(combos.map(c => c?.blocks))

  /** Word-boundary, case-sensitive: a spell name is a proper noun, and a bare
   *  substring would let the "aid" in "afraid" stand in for Aid. */
  const missingFrom = (haystack: string, list: string[]) =>
    list.filter(n => !new RegExp(`\\b${n.replace(/ /g, '\\s')}\\b`).test(haystack))

  const HEADLINED = [
    /* 1st level */
    'Bless', 'Burning Hands', 'Compelled Duel', 'Divine Favor', 'Divine Smite',
    'Faerie Fire', 'Shield of Faith',
    /* 2nd level */
    'Lesser Restoration', 'Magic Weapon', 'Scorching Ray', 'Warding Bond',
    /* class features that make a turn of their own */
    'Lay on Hands', 'Hearthfire Manifest',
  ]

  /* Covered as the ALTERNATIVE inside another card rather than as a card of
     their own, which is a deliberate content decision and not an oversight:
     Command is Compelled Duel's cheaper cousin, Protection from Evil and Good
     is Shield of Faith's swap against a Fiend, Aid and Cure Wounds are the two
     comparisons that make Lay on Hands the right answer, and Heroism is on the
     card that tells him NOT to take it while cloaked. Listing them separately
     is the point — it says which spells got a turn and which got a sentence. */
  const IN_A_NOTE = [
    'Command', 'Protection from Evil and Good', 'Heroism', 'Aid', 'Cure Wounds',
  ]

  it('gives every headlined spell a step in an actual turn', () => {
    const missing = missingFrom(inABlock, HEADLINED)
    expect(missing, `no block on any card performs: ${missing.join(', ')}`)
      .toHaveLength(0)
  })

  it('still covers the five that are advice on somebody else’s card', () => {
    const missing = missingFrom(anywhere, IN_A_NOTE)
    expect(missing, `nothing in the combos tab mentions: ${missing.join(', ')}`)
      .toHaveLength(0)
  })

  it('names all four alternative smites where he reads requirements', () => {
    /* The four share one card, because they are one decision. The card is only
       honest about that if its REQ line — the line "Preparing for Tomorrow"
       tells him to read backwards into tomorrow's seven — names all four. */
    const smites = combos.find(c => c?.id === 'seed:hearth-7:the-smites-that-are-not-damage')
    const req = (smites?.requirements ?? []).join('\n')
    for (const s of ['Thunderous', 'Wrathful', 'Searing', 'Shining']) {
      expect(req, `${s} Smite is on the card but not in what it asks you to prepare`)
        .toContain(s)
    }
  })

  /* THE OTHER HALF OF THE PROMISE, AND THE HONEST PART. Nine 1st- and
     2nd-level spells plus Find Steed make no turn — four rituals, two social
     or search spells, an out-of-combat heal, a narrow ward, a rite, and a
     mount. `00-status.md` records that slice 7's preparation tactic owns them.
     Pinned here so that disclosure cannot silently become false: if a later
     edit slips one of them onto a combo card, the deferral it was excused by
     is no longer true and this goes red. */
  const DEFERRED_TO_TACTICS = [
    'Detect Magic', 'Detect Poison and Disease', 'Gentle Repose',
    'Purify Food and Drink', 'Zone of Truth', 'Locate Object',
    'Prayer of Healing', 'Protection from Poison', 'Ceremony', 'Find Steed',
  ]

  it('keeps the spells that make no turn off the combo cards', () => {
    const strays = DEFERRED_TO_TACTICS.filter(n => !missingFrom(anywhere, [n]).length)
    expect(strays, `a combo now covers ${strays.join(', ')} — either it is a
      turn after all, or slice 7 has been quietly duplicated here`)
      .toHaveLength(0)
  })

  it('spreads the fourteen across every category the tab can filter', () => {
    /* A tab filter with five buttons and one populated category is a filter
       that does nothing. Two claims: every category is reachable, and no
       single one swallows the pack. */
    const CATEGORIES = ['burst', 'sustained', 'defensive', 'utility', 'aoe']
    const count = (c: string) =>
      resolvePack(MARCUS).combos.filter(x => x?.category === c).length
    for (const c of CATEGORIES) {
      expect(count(c), `nothing is filed under ${c} — its filter shows an empty tab`)
        .toBeGreaterThan(0)
    }
    for (const c of CATEGORIES) {
      expect(count(c), `${c} holds more than half the pack`).toBeLessThanOrEqual(7)
    }
  })

  it('gives every combo something to say beyond its steps', () => {
    /* The blocks are the turn; the annotations are why. A card with no
       warning, party note or positioning note is a list of buttons, and there
       are already three other places in the app that show him buttons. */
    for (const combo of resolvePack(MARCUS).combos) {
      expect(combo?.annotations ?? [], `${combo?.id} carries no annotation`)
        .not.toHaveLength(0)
    }
  })
})

describe('slice 7 — the tactics tab pays off what the combos tab deferred', () => {
  /* Slice 6 closed with a disclosure: ten spells make no turn, so no combo
     card covers them, and slice 7's tactics would. That disclosure is a
     promise, and the test above it (`keeps the spells that make no turn off
     the combo cards`) only enforces the half that is easy — that they stay
     OFF the combos. Enforced alone, the cheapest way to keep it green forever
     is to never write them anywhere at all. This is the other half. */
  const tactics = resolvePack(MARCUS).tactics
  const anywhere = textOf(tactics)

  const missingFrom = (haystack: string, list: string[]) =>
    list.filter(n => !new RegExp(`\\b${n.replace(/ /g, '\\s')}\\b`).test(haystack))

  /* The same ten, spelled the same way, deliberately duplicated rather than
     exported from the block above. Two lists that must agree is the point: if
     a spell is quietly dropped from one, the pair stops matching and one of
     the two tests says so. A shared constant would let a single edit move a
     spell out of scope on both sides at once. */
  const DEFERRED = [
    'Detect Magic', 'Detect Poison and Disease', 'Gentle Repose',
    'Purify Food and Drink', 'Zone of Truth', 'Locate Object',
    'Prayer of Healing', 'Protection from Poison', 'Ceremony', 'Find Steed',
  ]

  it('covers all ten spells the combo cards handed it', () => {
    const missing = missingFrom(anywhere, DEFERRED)
    expect(missing, `slice 6 deferred these to the tactics tab and nothing
      here mentions them: ${missing.join(', ')}`).toHaveLength(0)
  })

  /* THE TWO FACTS THAT CAME OFF HIS ACTUAL SHEET AND OUT OF NO GUIDE. Lucky
     is a feat nothing in the pack knew about until slice 7 read the JSON, and
     Graze is the mastery printed on his weapon where every page of his own
     doctrine recommends Topple. Both are the kind of content that gets
     written once and refactored away later by someone who does not know why
     it was there. */
  it('names the feat his sheet has and his guides never mention', () => {
    expect(anywhere, 'nothing tells him to spend his Luck Points').toContain('Lucky')
    expect(anywhere).toContain('Luck Point')
  })

  it('says out loud that he has Graze where the doctrine assumes Topple', () => {
    const card = tactics.find(
      t => t?.id === 'seed:hearth-7:the-mastery-you-have-is-not-the-one-you-were-told',
    )
    expect(card, 'the correction card is gone').toBeTruthy()
    const text = textOf(card)
    expect(text).toContain('Graze')
    expect(text, 'the card is only worth having if it names what it contradicts')
      .toContain('Topple')
  })

  it('spreads the twelve across every category the tab can filter', () => {
    /* Same claim as the combos, for the other tab: five filter buttons, and a
       filter that shows an empty tab is a broken button. */
    const CATEGORIES = ['core', 'survival', 'burst', 'control', 'support']
    const count = (c: string) => tactics.filter(t => t?.category === c).length
    for (const c of CATEGORIES) {
      expect(count(c), `nothing is filed under ${c} — its filter shows an empty tab`)
        .toBeGreaterThan(0)
    }
    for (const c of CATEGORIES) {
      expect(count(c), `${c} holds more than half the tab`).toBeLessThanOrEqual(6)
    }
  })

  it('does not badge everything critical', () => {
    /* Slice 5 demoted "Preparing for Tomorrow" to `high` on the argument that
       a badge shared by everything means nothing. At twelve that argument is
       load-bearing, so it is a test: the `critical` badge belongs to the
       cards that fire mid-fight and to no more than a third of the tab. */
    const critical = tactics.filter(t => t?.priority === 'critical').length
    expect(critical, 'every tactic is critical, so none of them are')
      .toBeLessThanOrEqual(4)
    expect(critical, 'nothing is critical — the badge has stopped being used')
      .toBeGreaterThan(0)
  })

  it('gives every tactic something to say beyond its steps', () => {
    for (const tactic of tactics) {
      expect(tactic?.annotations ?? [], `${tactic?.id} carries no annotation`)
        .not.toHaveLength(0)
    }
  })
})

describe('honesty about what is not in his books', () => {
  /* Gate 2's sourcing requirement, as a test. Interception's rules text,
     Sentinel's, and the Graze mastery definition are named in Marcus's files
     and defined in none of them — grep of all four paladin files, recorded in
     `00-status.md`. Content that leans on them is written from training data,
     and it says so on the card or it does not ship. */
  const UNSOURCED = /interception|sentinel|graze/i

  it('labels every entry that leans on the three undefined rules', () => {
    const pack = resolvePack(MARCUS)
    let labelled = 0
    for (const entry of allEntries(pack)) {
      if (!UNSOURCED.test(textOf(entry))) continue
      const warnings = (entry.annotations ?? []).filter(a => a.kind === 'warning')
      expect(warnings.some(w => UNSOURCED.test(w.text)), `${entry.id} names one of the
        three undefined rules and carries no warning that says where it came from`)
        .toBe(true)
      labelled += 1
    }
    // Guards the guard: a pack that stopped mentioning them entirely would pass
    // the loop above by never entering it.
    expect(labelled, 'nothing in the pack names them — has the content changed?')
      .toBeGreaterThan(0)
  })
})

describe('numbers are not written down', () => {
  const mine = textOf(resolvePack(MARCUS))
  const theirs = textOf(resolvePack(OTHER))

  it('states MY numbers for me', () => {
    expect(mine).toContain('10 temp HP (level 7 + Charisma +3)')
    expect(mine).toContain('10-foot radius')
    expect(mine).toContain('+3 to every saving throw')
  })

  it('states THEIR numbers for a Charisma 18 Paladin 8 — same pack, same file', () => {
    expect(theirs).toContain('12 temp HP (level 8 + Charisma +4)')
    expect(theirs).toContain('+4 to every saving throw')
  })

  it('leaks none of my numbers into their copy', () => {
    /* The assertion a hardcoded pack dies on. Note what is NOT claimed: not
       "contains no +3" — proficiency is +3 at level 7 and at level 8 alike,
       and `{{prof}}` is correct in both. Only the numbers that are mine. */
    expect(theirs).not.toContain('10 temp HP')
    expect(theirs).not.toContain('level 7')
    expect(theirs).not.toContain('+3 to every saving throw')
  })
})

describe('slice 8 — five voices, and none of them are Nix’s', () => {
  /* THE CONSTRAINT THIS TAB IS UNDER, AS A TEST. `types.ts` rules that a pack
     is authored for a KIND of character and not for a person, and this is the
     file where that ruling is hardest to keep: a voice is the thing most
     tempting to write off the sheet in front of you. Marcus's backstory is
     extraordinary — a dead friend, a wildfire spirit, a brand on his palm —
     and a play that named any of it would be dead content for every other
     paladin of this oath, and would put words about his dead friend on a card
     he did not write. So the source is the three tenets, which are shared. */
  const plays = resolvePack(MARCUS).personaPlays
  const anywhere = textOf(plays)

  it('is built on the oath’s own three tenets', () => {
    /* Tend / gather / guard, from `paladin_oath_of_the_hearth.txt` lines
       19-23. Checked by tag rather than by prose, because prose can say
       "gather" in passing and a tag is a claim the author made on purpose. */
    for (const tenet of ['tend', 'gather', 'guard']) {
      expect(plays.some(p => p?.tags.includes(tenet)),
        `no play is filed under the tenet "${tenet}"`).toBe(true)
    }
  })

  it('names nobody from his backstory', () => {
    /* Every proper noun from `backstory` on the real sheet. If one of these
       ever appears, this pack has stopped being authored for a kind of
       character and started being authored for him — at which point it should
       not be a seed pack at all. */
    for (const name of [
      'Selis', 'Rysanna', 'Scar', 'Fate', 'Khaonn', 'Nix', 'the Silent Druid',
    ]) {
      /* Scar is the exception that proves the rule: slice 5's warning names
         him, because the sentence it is making is that the secret belongs to
         him too. That is the only permitted mention and it is pinned below. */
      if (name === 'Scar') continue
      expect(anywhere, `a persona play names ${name}`).not.toContain(name)
    }
  })

  it('still spends no part of the changeling', () => {
    /* The absence slice 5 declared, now that there are five plays and four
       chances to forget. Note the shape: not "the word never appears" — it
       appears once, in the warning whose whole job is to say the absence is
       deliberate. The claim is that it appears NOWHERE ELSE. */
    const spoken = plays.flatMap(p => [
      p?.name, p?.situation, p?.approach, ...(p?.keyPhrases ?? []), ...(p?.tags ?? []),
    ])
    for (const text of spoken) {
      expect(text ?? '', `a play trades on the changeling: ${text}`)
        .not.toMatch(/changeling|shape.?shift|shift(ing)? (my|his|your) face/i)
    }
    const warnings = plays.flatMap(p => p?.annotations ?? [])
      .filter(a => /changeling/i.test(a.text))
    expect(warnings, 'the note that declares the absence is gone — so the '
      + 'absence now reads as an oversight').toHaveLength(1)
  })

  it('gives every play something to say beyond its phrases', () => {
    for (const play of plays) {
      expect(play?.annotations ?? [], `${play?.id} carries no annotation`)
        .not.toHaveLength(0)
    }
  })

  it('gives every play at least two things to actually say', () => {
    /* One phrase is a line; two is a play. The card renders them as a list,
       and a list of one is a quote nobody needed a card for. */
    for (const play of plays) {
      expect((play?.keyPhrases ?? []).length, `${play?.id} offers one phrase or none`)
        .toBeGreaterThanOrEqual(2)
    }
  })
})

describe('the persona play fits the card that renders it', () => {
  /* BOTH OF THESE WERE DEFECTS, FOUND ON THE GLASS BY `prove-slice5.mjs` AND
     PINNED HERE. The prover is run by hand at a slice boundary; the suite runs
     every time, and these two are content rules a future edit would otherwise
     break silently.

     `PersonaPlayCard` (in `ToyboxPanel.tsx`) renders `skillCheck` as a Badge
     in the collapsed header row and wraps every key phrase in `&ldquo;…&rdquo;`
     itself. The first version of this play wrote a 40-character skill check
     and quoted its own phrases; on a 390px viewport the badge took the whole
     row and the play's NAME painted at zero width, and the phrases opened
     with two quote marks.

     SLICE 8 WIDENED IT FROM ONE PLAY TO ALL FIVE, which is most of the reason
     it survived the slice. Written against `personaPlays[0]` these were two
     assertions about one authored object; four more plays were then written
     by hand, each with its own badge and its own phrases, and a rule that
     only guards the first entry guards nothing once there is a second. */
  const plays = HEARTH_7.personaPlays.map(
    p => resolvePersonaPlay(p, buildProfile(MARCUS), AT)!,
  )

  it('quotes no phrase itself — the card does that', () => {
    for (const play of plays) {
      for (const phrase of play.keyPhrases) {
        expect(phrase, `${phrase} carries its own quotes`).not.toMatch(/^["'“”]/)
        expect(phrase).not.toMatch(/["'“”]$/)
      }
    }
  })

  it('keeps every skill-check badge short enough to leave the name a row', () => {
    /* 24 characters is not arbitrary: the header holds a 44px star, the badge,
       a chevron and the name, in 390px. The measured failure was 251px of
       badge; ~24 characters is about 150px, which left the name 144px. */
    for (const play of plays) {
      expect((play.skillCheck ?? '').length, `${play.id}: "${play.skillCheck}"`)
        .toBeLessThanOrEqual(24)
    }
  })
})

describe('a character with no party still gets the pack', () => {
  const orphan = resolvePack(ORPHAN)

  it('keeps every entry', () => {
    expect(orphan.combos).not.toContain(null)
    expect(orphan.tactics).not.toContain(null)
    expect(orphan.personaPlays).not.toContain(null)
  })

  it('drops the call-outs, and only the call-outs', () => {
    const text = textOf(orphan)
    expect(text, 'a party member was named to someone with no party')
      .not.toContain('Rune Willow')
    expect(text).not.toContain('Ponzi')
    expect(text).not.toContain('Talon')
    // Everything the party notes sat beside is untouched.
    expect(text).toContain('Temporary hit points never stack')
    expect(text).toContain('Faerie Fire is Concentration')
    expect(text).toContain('One swap per long rest')
  })

  it('leaves no entry with an empty annotation list', () => {
    /* `resolveNotes` reports "all dropped" as `undefined`, never `[]`, because
       the cards render on presence and `[]` paints a gap with nothing in it. */
    for (const entry of allEntries(orphan)) {
      expect(entry.annotations ?? undefined, entry.id).not.toHaveLength(0)
    }
  })
})

describe('the fighting-style line, which he has not answered yet', () => {
  const interception = fightingStyles().find(s => /interception/i.test(s.name))

  it('is absent while no style is recorded', () => {
    /* Marcus has not pressed the picker. The advice "your fighting style is X"
       has no X, so the note is dropped — and the tactic it belongs to survives,
       which is the entire reason it is an annotation and not a fourth step. */
    const text = textOf(resolvePack(MARCUS))
    expect(text).not.toContain('Your fighting style is')
    expect(text, 'the tactic went with it').toContain('The Reaction Is Only One')
  })

  it('appears the moment he records one', () => {
    expect(interception, 'canon no longer knows Interception').toBeDefined()
    const styled = resolveCharacter(recordFightingStyle(MARCUS, interception!))
    const text = textOf(resolvePack(styled))
    expect(text).toContain('Your fighting style is Interception')
  })
})
