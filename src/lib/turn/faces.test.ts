/* Gate 3's `faces.test.ts` — canon prose → separately-priced abilities.
 *
 * The subject is a refusal as much as a split. Half of these cases assert that
 * `facesOf` returns NOTHING, because the failure this phase exists to remove is
 * an answer that cannot be told apart from a real one — and a splitter that
 * half-succeeds on a record it did not understand produces exactly that.
 *
 * Held Reaction slice 1. */

import { describe, it, expect } from 'vitest'

import { facesOf, sentencesOf, costsNamedIn } from './faces'
import { featureByName } from '../canon/lookup'
import type { CanonFeature } from '../canon/types'

const HEARTHFIRE = featureByName('Hearthfire Manifest')

/** A canon-shaped record built for a case, so a synthetic assertion is not also
 *  an assertion about the shipped JSON. */
function feature(rawText: string, name = 'Test Feature'): CanonFeature {
  return { level: 1, name, rawText }
}

describe('facesOf — his actual feature', () => {
  it('finds the record at all', () => {
    // If this fails every other case below is vacuous.
    expect(HEARTHFIRE?.name).toBe('Hearthfire Manifest')
  })

  it('splits Hearthfire Manifest into exactly two faces', () => {
    const faces = facesOf(HEARTHFIRE)
    expect(faces).toHaveLength(2)
    expect(faces.map(f => f.economy)).toEqual(['bonusAction', 'reaction'])
  })

  it('the cloak face carries the retaliation sentence', () => {
    const cloak = facesOf(HEARTHFIRE).find(f => f.economy === 'reaction')
    expect(cloak?.text).toContain('1d10 Fire')
    expect(cloak?.text).toContain('Temporary Hit Points')
    // The opener is what becomes the row's "WHEN" line, so it must be canon's
    // own priced sentence and not the paragraph that follows it.
    expect(cloak?.opener).toMatch(/^As a Reaction,/)
  })

  it('the summon face carries neither the die nor the temp HP', () => {
    const summon = facesOf(HEARTHFIRE).find(f => f.economy === 'bonusAction')
    expect(summon?.text).not.toContain('1d10')
    expect(summon?.text).not.toContain('Temporary Hit Points')
    expect(summon?.text).toContain('summoned or dismissed')
  })

  it('leading flavour belongs to no face', () => {
    // The light radius and the leash state no price, and they arrive before the
    // first face opens. They stay on the feature's own option, which is the row
    // Marcus can already see today.
    for (const face of facesOf(HEARTHFIRE)) {
      expect(face.text).not.toContain('sheds Bright Light')
      expect(face.text).not.toContain('extinguished')
    }
  })

  it('a one-cost feature yields nothing, so the existing refile still owns it', () => {
    // Aura of Solace states no price in prose. `economyFromFeature` files it,
    // and two mechanisms answering one question is how they come to disagree.
    expect(facesOf(featureByName('Aura of Solace'))).toEqual([])
  })
})

describe('facesOf — what it refuses', () => {
  it('refuses when there is no feature', () => {
    expect(facesOf(undefined)).toEqual([])
  })

  it('refuses a record with no prose', () => {
    expect(facesOf(feature('   '))).toEqual([])
  })

  it('refuses a sentence that names two costs', () => {
    const two = feature(
      'You gain a flickering ward. You may raise it as a Bonus Action or as a Reaction, whichever you have left. It lasts one minute.',
    )
    // There is no honest cut, so there is no cut — and no half-answer either.
    expect(facesOf(two)).toEqual([])
  })

  it('refuses rather than returning one face', () => {
    const one = feature('You gain a ward. You may raise it as a Reaction. It lasts one minute.')
    expect(facesOf(one)).toEqual([])
  })

  it('does not fire on a cost word that prices nothing of yours', () => {
    // "can't take a Reaction" and "the Attack action" both name a cost word
    // while pricing nothing. Two of these plus one real price must still be one
    // face, and one face is a refusal.
    const decoys = feature(
      'The target can\'t take a Reaction until the start of its next turn. When you take the Attack action, you may push it. You may end this as a Bonus Action.',
    )
    expect(facesOf(decoys)).toEqual([])
    expect(costsNamedIn("The target can't take a Reaction until the start of its next turn.")).toEqual([])
    expect(costsNamedIn('When you take the Attack action, you may push it.')).toEqual([])
  })
})

describe('facesOf — shape, never name', () => {
  it('splits a homebrew feature with two costs identically', () => {
    const homebrew = feature(
      'A tide answers you. You may call it as a Bonus Action. It rises for one minute. As a Reaction, you may turn a blow aside, and the attacker takes 2d6 Cold damage.',
      'Wavecaller\'s Answer',
    )
    const faces = facesOf(homebrew)
    expect(faces.map(f => f.economy)).toEqual(['bonusAction', 'reaction'])
    expect(faces[0].text).toContain('It rises for one minute.')
    expect(faces[1].text).toContain('2d6 Cold')
    expect(faces[0].text).not.toContain('A tide answers you.')
  })

  it('reads "as a Magic action" as an Action', () => {
    const magic = feature(
      'You may cast it as a Magic action. As a Bonus Action, you may dismiss it.',
    )
    expect(facesOf(magic).map(f => f.economy)).toEqual(['action', 'bonusAction'])
  })
})

describe('sentencesOf', () => {
  it('adds no words and drops none', () => {
    const raw = HEARTHFIRE?.rawText ?? ''
    expect(raw.length).toBeGreaterThan(0)
    expect(sentencesOf(raw).join(' ')).toBe(raw.replace(/\s+/g, ' ').trim())
  })

  it('splits his feature into the sentences canon wrote', () => {
    expect(sentencesOf(HEARTHFIRE?.rawText ?? '')).toHaveLength(9)
  })
})

describe('costsNamedIn', () => {
  it('reports each distinct cost once', () => {
    expect(costsNamedIn('As a Reaction you do it, and as a Reaction you undo it.')).toEqual([
      'reaction',
    ])
  })

  it('reports both when a sentence really does name two', () => {
    expect(costsNamedIn('Raise it as a Bonus Action or as a Reaction.').sort()).toEqual([
      'bonusAction',
      'reaction',
    ])
  })
})
