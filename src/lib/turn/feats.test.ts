import { describe, it, expect } from 'vitest'
import {
  isReactionShaped,
  splitTrigger,
  effectSentencesOf,
  featReactionOptions,
} from './feats'
import { featByName } from '../canon/lookup'
import { FEAT_LIST } from '../../canon'
import { composeTurn } from './compose'
import { reactionRows } from './reactions'
import { NIX } from './fixtures/nix'
import type { Character, CharacterFeat } from '../character'

/* ============================================================================
   SLICE 10e — the reactions band tells the truth about every reaction he owns.

   Marcus, sending his real character sheet on 2026-08-27: "I have Sentinel and
   interception". The app showed neither. Measured, the cause was not ranking
   and not a missing row — `character.feats` was read by NOTHING across
   src/lib/turn/ and src/lib/canon/. A feat could not become an option no matter
   what its text said.

   Every test below is either that fault, or the rule the fix is built on:
   RECOGNISE SHAPE, NEVER A NAME. The four-line version of this feature matches
   the strings "Sentinel" and "Interception" and passes every test that names
   them. So the tests name the SHAPE wherever they can, and the two feats are
   used as witnesses rather than as the specification.
   ========================================================================= */

const feat = (over: Partial<CharacterFeat>): CharacterFeat => ({
  name: 'X',
  description: '',
  isHomebrew: false,
  effects: [],
  ...over,
})

const withFeats = (feats: CharacterFeat[]): Character => ({ ...NIX, feats })

/* Canon's own sentences, read from the corpus rather than retyped, so a canon
   package that rewords them fails these tests instead of quietly diverging. */
const SENTINEL = featByName('Sentinel')!
const INTERCEPTION = featByName('Interception')!

describe('the corpus these tests are about', () => {
  it('canon still ships both feats, with the effects the rest of this file reads', () => {
    expect(SENTINEL?.effects?.length).toBe(3)
    expect(INTERCEPTION?.effects?.length).toBe(1)
  })

  it('FEAT_LIST flattens all four categories — the list nothing used to read', () => {
    const categories = new Set(FEAT_LIST.map(f => f.category))
    expect(FEAT_LIST.length).toBeGreaterThan(70)
    /* Canon's own words for the category, off the RECORD — "General", "Fighting
       Style" — not the JSON keys the flattener walks ("general",
       "fightingStyle"). Pinned as canon writes them, because that is the string
       a screen would print. Sentinel is General and Interception is a Fighting
       Style: a flattener that took only the obvious bucket would find one of
       Marcus's two and look like it worked. */
    expect(categories.has('General')).toBe(true)
    expect(categories.has('Fighting Style')).toBe(true)
    expect(SENTINEL.category).toBe('General')
    expect(INTERCEPTION.category).toBe('Fighting Style')
    expect(FEAT_LIST.every(f => typeof f.name === 'string' && f.name.length > 0)).toBe(true)
  })

  it('featByName folds punctuation and case, and misses cleanly', () => {
    expect(featByName('  sentinel  ')?.name).toBe('Sentinel')
    expect(featByName('INTERCEPTION')?.name).toBe('Interception')
    // A miss is normal and is not an error — the sheet's own words take over.
    expect(featByName('Hearthbrand Adept')).toBeUndefined()
  })
})

describe('isReactionShaped — the cost phrase is the handle, not the feat name', () => {
  it('says yes to both of Sentinel\'s reactions and to Interception', () => {
    expect(isReactionShaped(SENTINEL.effects![0])).toBe(true) // "take an Opportunity Attack"
    expect(isReactionShaped(SENTINEL.effects![1])).toBe(true) // "take a Reaction"
    expect(isReactionShaped(INTERCEPTION.effects![0])).toBe(true)
  })

  it('says no to Sentinel\'s third effect — a rider costs nothing and is not a choice', () => {
    /* "When you hit a creature with an Opportunity Attack, that creature's
       Speed becomes 0…" mentions an Opportunity Attack and is NOT one. Offering
       it as a reaction would put a button on the screen for something that is
       not a thing you do. */
    expect(isReactionShaped(SENTINEL.effects![2])).toBe(false)
  })

  it('says no to a feat that has no mechanical cost at all', () => {
    expect(isReactionShaped('Increase your Strength score by 1, to a maximum of 20.')).toBe(false)
    expect(isReactionShaped('Add your Proficiency Bonus to your Initiative rolls.')).toBe(false)
    expect(isReactionShaped('')).toBe(false)
  })

  it('vetoes a sentence that TAKES a reaction away — the app must not offer it as one', () => {
    /* English puts the negation before the verb, so this matches the cost phrase
       on its tail. Without the veto the app invites Marcus to spend a reaction
       on denying reactions. */
    expect(isReactionShaped("The target can't take a Reaction until the end of its next turn.")).toBe(false)
    expect(isReactionShaped('The creature cannot take an Opportunity Attack against you.')).toBe(false)
    expect(isReactionShaped('This prevents the target from taking a Reaction this turn.')).toBe(false)
  })

  it('reads a shape it has never seen — homebrew, no canon record, no name match', () => {
    expect(
      isReactionShaped('When the kettle boils over, you can take a Reaction to smother it.')
    ).toBe(true)
    expect(isReactionShaped('As a Reaction, you swap places with a willing ally.')).toBe(true)
  })
})

describe('splitTrigger — cuts the sentence, never edits it', () => {
  const reactionSentences = FEAT_LIST.flatMap(f => f.effects ?? []).filter(isReactionShaped)

  it('has a real corpus to work on', () => {
    expect(reactionSentences.length).toBeGreaterThanOrEqual(5)
  })

  it('the two halves rejoin to the original — no word is added and none is lost', () => {
    /* THE ONE INVARIANT THAT MATTERS. A splitter that quietly eats a clause is a
       splitter that edits a rule, and it would do it silently on the sentence
       nobody thought to check. So the whole corpus is checked. */
    for (const sentence of reactionSentences) {
      const { trigger, effect } = splitTrigger(sentence)
      const rejoined = trigger ? `${trigger}, ${effect}` : effect
      expect(rejoined, sentence).toBe(sentence.trim())
    }
  })

  it('finds the trigger in every canon sentence that leads with one', () => {
    const leading = reactionSentences.filter(s => /^(?:when|if)\b/i.test(s))
    expect(leading.length).toBeGreaterThanOrEqual(4)
    for (const sentence of leading) {
      expect(splitTrigger(sentence).trigger, sentence).not.toBe('')
    }
  })

  it('cuts at the LAST comma before the cost, not the first', () => {
    /* A trigger carrying its own aside has three commas. Cutting at the first
       would leave "ally or enemy, moves past you" reading as the EFFECT — the
       row would tell Marcus to do something that is actually the condition. */
    const { trigger, effect } = splitTrigger(
      'When a creature, ally or enemy, moves past you, you can take a Reaction to trip it.'
    )
    expect(trigger).toBe('When a creature, ally or enemy, moves past you')
    expect(effect).toBe('you can take a Reaction to trip it.')
  })

  it('leaves a sentence that states no trigger whole, and says so with an empty trigger', () => {
    const text = 'As a Reaction, you can grant an ally Temporary Hit Points.'
    // It does not LEAD with when/if, so nothing is claimed. Downstream this
    // reads out as `unstated` rather than as an invented condition.
    expect(splitTrigger(text)).toEqual({ trigger: '', effect: text })
  })

  it('does not invent a split when the trigger clause has no comma', () => {
    const text = 'When hit you can take a Reaction to shove.'
    expect(splitTrigger(text).trigger).toBe('')
  })
})

describe('effectSentencesOf — the sheet wins when it has words', () => {
  it('uses the sheet\'s own effects and never reaches canon', () => {
    /* The open-world rule's other half. A homebrew feat named "Sentinel" that
       does something else must keep its own text, or the app hands Marcus the
       published feat's rules under his own feat's name — confident, and wrong. */
    const mine = feat({
      name: 'Sentinel',
      effects: ['When the fire gutters, you can take a Reaction to feed it.'],
    })
    expect(effectSentencesOf(mine, SENTINEL)).toEqual([
      'When the fire gutters, you can take a Reaction to feed it.',
    ])
  })

  it('falls through to canon when the sheet stored nothing — the common import case', () => {
    const thin = feat({ name: 'Sentinel', description: '', effects: [] })
    expect(effectSentencesOf(thin, SENTINEL)).toEqual(SENTINEL.effects)
  })

  it('splits a one-paragraph description into sentences when it carries a reaction', () => {
    const blob = feat({
      name: 'Kettlewarden',
      description:
        'You watch the pot. When it boils over, you can take a Reaction to smother it. You also smell smoke at 30 feet.',
    })
    const out = effectSentencesOf(blob, undefined)
    expect(out.length).toBe(3)
    expect(out.filter(isReactionShaped).length).toBe(1)
  })

  it('does not let a flavour paragraph shut canon out', () => {
    /* A description with no reaction in it is not an answer to the question this
       module asks, so canon still gets to speak. */
    const flavour = feat({ name: 'Sentinel', description: 'A gift of the watchful.' })
    expect(effectSentencesOf(flavour, SENTINEL)).toEqual(SENTINEL.effects)
  })

  it('returns nothing, rather than throwing, when nobody has words', () => {
    expect(effectSentencesOf(feat({ name: 'Nameless' }), undefined)).toEqual([])
  })
})

describe('featReactionOptions — one row per reaction, not one per feat', () => {
  const options = featReactionOptions(
    withFeats([
      feat({ name: 'Sentinel' }),
      feat({ name: 'Interception' }),
      feat({ name: 'Alert' }),
    ])
  )

  it('gives Sentinel TWO options and Interception one', () => {
    /* Sentinel's two reactions fire on two DIFFERENT triggers. Collapsing them
       into one row answers "when can I use it" with half the truth; dropping one
       loses a reaction he owns. */
    expect(options.filter(o => o.name === 'Sentinel').length).toBe(2)
    expect(options.filter(o => o.name === 'Interception').length).toBe(1)
  })

  it('gives Alert none — its effects cost nothing', () => {
    expect(options.filter(o => o.name === 'Alert')).toEqual([])
  })

  it('prices every one of them as a Reaction and files them as features', () => {
    expect(options.every(o => o.actionEconomy === 'reaction')).toBe(true)
    expect(options.every(o => o.type === 'feature')).toBe(true)
  })

  it('puts the trigger where triggerFor will find it — first, in mechanicsLine', () => {
    const sentinels = options.filter(o => o.name === 'Sentinel')
    expect(sentinels[0].mechanicsLine).toMatch(/^When a creature within 5 feet of you/)
    expect(sentinels[0].mechanicsLine).not.toBe(sentinels[1].mechanicsLine)
    expect(options.every(o => o.mechanicsLine.length > 0)).toBe(true)
  })

  it('never ellipsises — the thing this whole phase exists to kill', () => {
    for (const o of options) {
      expect(o.summary + o.mechanicsLine + o.effectsLine).not.toContain('…')
      expect(o.summary + o.mechanicsLine + o.effectsLine).not.toContain('...')
    }
  })

  it('produces nothing for a character with no feats — the fixture is untouched', () => {
    expect(featReactionOptions(NIX)).toEqual([])
  })
})

describe('the whole way through — Marcus\'s two feats reach the reactions band', () => {
  const marcus = withFeats([feat({ name: 'Sentinel' }), feat({ name: 'Interception' })])
  const turn = composeTurn({ character: marcus, combat: null })
  const rows = reactionRows(turn, marcus)

  /* Rows are selected by `option.name` throughout this block, not by the
     displayed `name`. Finding BJ's fix renames the HEADING of rows that would
     otherwise collide — «Sentinel · takes the Disengage action» — while leaving
     `option.name` untouched, because canon is matched by it. Selecting on the
     display name made these tests silently stop finding Sentinel at all: one
     went red, and the `when` test below went GREEN by checking nothing but
     Interception. Selecting on the invariant is what these tests actually
     meant, and it cannot rot the next time a heading is rewritten. */
  const named = (n: string) => rows.filter(r => r.option.name === n)

  it('shows Opportunity Attack, Flaming Cloak, AND the feats — nothing displaced', () => {
    const names = rows.map(r => r.name)
    expect(names).toContain('Opportunity Attack — Hearthbrand')
    expect(names).toContain('Flaming Cloak')
    expect(named('Sentinel').length).toBe(2)
    expect(named('Interception').length).toBe(1)
  })

  it('heads the two Sentinel rows differently, out of Sentinel\'s own trigger words', () => {
    /* Finding BJ: two rows both headed «Sentinel» read, at a glance, as the app
       stuttering, and named the same door twice to a screen reader. */
    const headings = named('Sentinel').map(r => r.name)
    expect(new Set(headings).size).toBe(2)
    for (const [i, h] of headings.entries()) {
      expect(h).toMatch(/^Sentinel · /)
      /* The suffix is lifted from the row's OWN trigger, never written down
         here — a hand-made label would fail this line. */
      expect(named('Sentinel')[i].when).toContain(h.replace('Sentinel · ', ''))
      expect(h).not.toContain('…')
      expect(h).not.toContain('...')
    }
  })

  it('gives every feat row a DECLARED when — canon states it, so the app does not guess', () => {
    const feats = [...named('Sentinel'), ...named('Interception')]
    expect(feats.length).toBe(3)
    for (const row of feats) {
      expect(row.whenSource, row.name).toBe('declared')
      expect(row.when, row.name).toBeTruthy()
      expect(row.when!, row.name).toMatch(/^When /)
    }
  })

  it('gives the two Sentinel rows DIFFERENT ids and different triggers', () => {
    /* The id is minted from type + name, and `reactionRows` dedupes by id. Before
       slice 10e taught compose.ts to break a collision, the second Sentinel was
       swallowed whole by the first and Marcus lost a reaction to a clash he could
       not see. */
    const sentinels = named('Sentinel')
    expect(new Set(sentinels.map(r => r.id)).size).toBe(2)
    expect(sentinels[0].when).not.toBe(sentinels[1].when)
  })

  it('leaves every OTHER id byte-identical to the no-feats turn', () => {
    const plain = composeTurn({ character: NIX, combat: null })
    const idsOf = (t: ReturnType<typeof composeTurn>) =>
      [...t.ranked, ...t.rest, ...t.mutex.flatMap(g => g.faces)]
        .filter(o => o.name !== 'Sentinel' && o.name !== 'Interception')
        .map(o => `${o.name}=${o.id}`)
        .sort()
    expect(idsOf(turn)).toEqual(idsOf(plain))
  })

  it('says what each one DOES, not just that he has it', () => {
    const interception = rows.find(r => r.name === 'Interception')!
    expect(interception.body).toMatch(/reduce that damage/i)
    expect(interception.body).not.toContain('…')
  })

  it('yields to the sheet: a hand-written Sentinel FEATURE keeps its own words', () => {
    /* If Marcus wrote Sentinel into his features by hand — which is exactly what
       a player does when the app never shows it — his row wins and canon's stays
       out. One Sentinel, and it is his. */
    const handWritten: Character = {
      ...marcus,
      features: [
        ...NIX.features,
        {
          name: 'Sentinel',
          level: 1,
          description: 'My own wording.',
          actionType: 'reaction',
          source: 'Homebrew',
        } as (typeof NIX.features)[number],
      ],
    }
    const mine = reactionRows(composeTurn({ character: handWritten, combat: null }), handWritten)
    expect(mine.filter(r => r.name === 'Sentinel').length).toBe(1)
    expect(mine.find(r => r.name === 'Sentinel')!.homebrew).toBe(true)
  })
})
