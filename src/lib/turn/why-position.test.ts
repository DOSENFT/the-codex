// SLICE R8 — the row's one line explains WHERE THE ROW SITS.
//
// `rank.ts` states the rule itself: "the row speaks only when it has something
// non-obvious to say", and the line it picks is meant to answer "why is this
// here" — including, in as many words, "why is this so far down".
//
// Measured on Marcus's own export 2026-09-05 (`_diag-rank3.ts`), it did the
// opposite. His homebrew `Hearthfire Manifest` is a REACTION whose authored
// prose says the cloak "grants you Temporary Hit Points equal to your Paladin
// level…". Two phrased factors therefore fire at once:
//
//     healing, hurt   +47   "You are bloodied"
//     reaction        −40   "Not on your turn"
//
// `scoreOption`'s last loop takes whichever moved the score furthest, so the
// heal phrase won. The row then sat **11th of 14** on his turn, saying a
// sentence that reads as *do this now* — about a reaction he cannot take until
// somebody hits him. `TurnRow.tsx:47` paints `why` on every row, so that is
// what he saw at 3 hit points.
//
// THE HEAL FACTOR IS NOT THE BUG, AND MUST NOT BE "FIXED". It fired on
// "Temporary Hit Points" in prose its author wrote, which is the open-world
// guarantee working exactly as this file's header promises. The score is right.
// Only the SENTENCE was wrong. So these tests pin the score as hard as they pin
// the phrase — a change that quietened the row by dropping the factor would
// break the ordering and pass a test that only looked at the words.
//
// THE RULE: a phrase explaining that an option is not legal THIS TURN outranks
// a phrase explaining the situation, whatever the magnitudes. Structure first,
// because a row that cannot be chosen has nothing else to say.
//
// His ruling, 2026-09-05: "Structure wins the line."
import { describe, it, expect } from 'vitest'
import { scoreOption, type RankContext } from './rank'
import type { TurnOption } from './types'

const HEALTHY: RankContext = { hpFraction: 1, bloodied: false, concentratingOn: null }
const DYING: RankContext = { hpFraction: 0.1, bloodied: true, concentratingOn: null }
const MOMENT: RankContext = { ...HEALTHY, yourTurn: false }

let seq = 0
function opt(over: Partial<TurnOption> = {}): TurnOption {
  seq += 1
  const { cost, ...rest } = over
  return {
    id: `o${seq}`,
    name: `Option ${seq}`,
    kind: 'attack',
    detail: 'does a thing',
    available: true,
    score: 0,
    ...rest,
    cost: { slot: 'action', label: 'Action', ...cost },
  }
}

/** HIS ACTUAL FEATURE, and his actual words.
 *
 *  Copied out of `codex-nix-lvl7 (2) (1).json` rather than paraphrased, because
 *  the whole finding turns on which substring the heal rule matched — measured
 *  as "Temporary Hit Points" at offset 311, alternative-by-alternative, in
 *  `_diag-rank3.ts`. A paraphrase that happened to drop those two words would
 *  make this file pass while the screen stayed wrong. */
const HEARTHFIRE_PROSE =
  'As a Reaction, you can expend one use of your Channel Divinity and issue a ' +
  'command word, causing the Essence of the Hearth to transform into a flaming ' +
  'cloak. The cloak immediately grants you Temporary Hit Points equal to your ' +
  'Paladin level plus your spellcasting ability modifier. This effect lasts ' +
  'until the Temporary Hit Points are depleted.'

const hearthfire = () =>
  opt({
    name: 'Hearthfire Manifest',
    kind: 'feature',
    detail: 'When you are hit by a melee attack, the creature takes 1d10 Fire damage in retaliation.',
    cost: { slot: 'reaction', label: 'Reaction' },
  })

const HINTS = { prose: HEARTHFIRE_PROSE }

describe('slice R8 — structure wins the line', () => {
  it('a reaction that also reads as a heal says «Not on your turn», not «You are bloodied»', () => {
    /* THE SLICE. Red against R7: the +47 heal phrase beat the −40 reaction
       phrase and this returned "You are bloodied". */
    expect(scoreOption(hearthfire(), DYING, HINTS).why).toBe('Not on your turn')
  })

  it('and its SCORE does not move — the sentence changed, the ordering did not', () => {
    /* The guard against fixing the words by deleting the factor. The heal
       bonus is correct: at 10% hp a reaction that grants temp HP really is
       worth more than one that does not, and off-turn that is what lifts it. */
    const r = scoreOption(hearthfire(), DYING, HINTS)
    expect(r.score).toBe(5)
    expect(r.factors.map(f => f.name).sort()).toEqual(['healing, hurt', 'reaction'])
    expect(r.factors.find(f => f.name === 'healing, hurt')?.delta).toBe(45)
    expect(r.factors.find(f => f.name === 'reaction')?.delta).toBe(-40)
  })

  it('stays BELOW a plain action on his turn, which is the position it is explaining', () => {
    const plain = scoreOption(opt(), DYING, {}).score
    expect(scoreOption(hearthfire(), DYING, HINTS).score).toBeLessThan(plain)
  })

  it('does NOT gag the row during the moment — off-turn the heal line is the right one', () => {
    /* THIS TEST WAS WRITTEN BACKWARDS THE FIRST TIME and the run corrected it.
       The draft asserted `undefined`, reasoning that the structural phrase
       vanishes off-turn and nothing should take its place. That is wrong, and
       wrong in the direction that matters: off-turn this reaction is the only
       legal thing on the screen, and "You are bloodied" is precisely the
       sentence a bleeding paladin needs on a row that hands him temporary hit
       points. R8 must not reach into the moment.

       The expectation was changed rather than the code, because the code was
       already right — and the draft is recorded instead of quietly deleted,
       because a test that was aimed at the wrong claim is worth knowing about. */
    expect(scoreOption(hearthfire(), { ...DYING, yourTurn: false }, HINTS).why)
      .toBe('You are bloodied')
    /* And it is at the TOP off-turn, which is the position that sentence now
       explains: `reactionNow` (+40) and the heal bonus both pull the same way. */
    expect(scoreOption(hearthfire(), { ...DYING, yourTurn: false }, HINTS).score)
      .toBeGreaterThan(scoreOption(opt(), { ...DYING, yourTurn: false }, {}).score)
  })

  it('stays quiet off-turn when the situation has nothing to add either', () => {
    /* The original intent of the draft above, kept where it IS true: at full
       health the reaction phrase is gone and no situational phrase fires that
       is worth saying about position. `MOMENT` is full health, so this is the
       "silent during the moment" claim `rank.ts`'s header argues for. */
    const plainReaction = opt({ cost: { slot: 'reaction', label: 'Reaction' } })
    expect(scoreOption(plainReaction, MOMENT, {}).why).toBeUndefined()
  })

  it('beats a concentration clash too — structure is not just louder, it is first', () => {
    /* −45 is the biggest phrased weight in the file and it still loses. If this
       rule were implemented by nudging weights rather than by ordering the
       phrases, this is the case that would catch it. */
    const clashing = opt({
      name: 'Wardfire Answer',
      detail: 'as a reaction, requires concentration',
      cost: { slot: 'reaction', label: 'Reaction' },
    })
    expect(scoreOption(clashing, { ...DYING, concentratingOn: 'Bless' }, {}).why)
      .toBe('Not on your turn')
  })

  it('does NOT reach past reactions — a heal you can actually cast still says why it climbed', () => {
    /* The over-reach guard. An action is legal this turn, so it has no
       structural reason to give, and the situational phrase is the whole point
       of the shortlist. Green today, and it must stay that way. */
    const cure = opt({ name: 'Cure Wounds', kind: 'spell', detail: 'heal 2d8+4 · Touch' })
    expect(scoreOption(cure, DYING, {}).why).toBe('You are bloodied')
  })

  it('leaves a silent option silent — this adds no line that was not there', () => {
    const alien = opt({
      name: 'Wyrdling Gambit',
      detail: 'the DM decides what happens',
      cost: { slot: 'reaction', label: 'Reaction' },
    })
    /* A reaction on your turn HAS a structural phrase, so this one does speak —
       and said "Not on your turn" before this slice too. The claim is only that
       R8 invented nothing: same sentence, same score. */
    const r = scoreOption(alien, HEALTHY, {})
    expect(r.why).toBe('Not on your turn')
    expect(r.score).toBe(-40)
  })
})
