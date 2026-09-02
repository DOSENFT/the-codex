/* ============================================================================
   "WHAT GRANTED THIS?" — Held Reaction slice 4.

   ── WHAT THIS SLICE IS ABOUT, AND WHY BOTH HALVES ARE TESTED ────────────────
   Slice 3 proved the ENGINE road: take the cloak from its reaction row and the
   grant arms the retaliation. This is the road Marcus actually walks — he rolls
   physical dice at the table (item 9, his words) and types the number in by
   hand — and down that road the app has an amount and no source.

   His ruling at Gate 2 was ASK, NEVER INFER, given explicitly for the case where
   there is exactly one candidate. So the interesting assertion here is not that
   picking the cloak arms the retaliation. It is that leaving "Don't know"
   selected does NOT. That is the half that proves the app is not guessing, and
   it is the half that would still pass if this slice had been written as "one
   candidate, so fill it in" — which is why it is written down.

   Rendered with `renderToStaticMarkup`: the repo has no jsdom. That renders once
   and cannot tap, so the choosing is driven for real by
   docs/plans/reactions/prove-slice4.mjs — checks F and G.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../../lib/turn/fixtures/nix'
import { setTempHP, type Character } from '../../lib/character'
import { tempHPGrantors, grantedTempHP } from '../../lib/rules-2024/temp-hp'
import { featureContextOf } from '../../lib/turn/overlay'
import { activeRetaliation } from '../../lib/turn/retaliation'
import { featureByName } from '../../lib/canon/lookup'
import { TempHPSource, DONT_KNOW } from './TempHPSource'

const domText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const noop = () => {}

/* HIS SHAPE, not the fixture's. Slice 1's law, which has now bitten twice: a
   fixture that models the sheet AFTER the repair cannot show the fault. `nix.ts`
   carries a hand-split "Flaming Cloak" with its own uses; his export carries
   Hearthfire Manifest as ONE undeclared feature and `resourcePools: []`. The
   picker has to work off THAT. */
const HIS_HEARTHFIRE = {
  name: 'Hearthfire Manifest',
  level: 3,
  description:
    'A manifestation (floating ember, dancing flame, or spirit) sheds bright light 10ft, dim light 10ft more. Range 30ft or extinguished. Summon/dismiss as Bonus Action. As a Reaction, expend one Channel Divinity use to transform it into a flaming cloak: gain Temporary HP equal to Paladin level + spellcasting ability modifier. While active, creatures hitting you with melee attacks take 1d10 Fire damage. Lasts until temp HP is depleted.',
}

const HIS_SHAPE: Character = {
  ...NIX,
  level: 7,
  abilityScores: { ...NIX.abilityScores, CHA: 16 },
  resourcePools: [],
  features: [
    ...(NIX.features ?? []).filter(f => !/hearthfire|flaming cloak/i.test(f.name)),
    HIS_HEARTHFIRE,
  ],
} as Character

const ctx = () => featureContextOf(HIS_SHAPE)

describe('tempHPGrantors — what the question is allowed to offer', () => {
  it('offers Hearthfire Manifest off his UNDECLARED sheet feature', () => {
    expect(tempHPGrantors(HIS_SHAPE, ctx())).toEqual(['Hearthfire Manifest'])
  })

  it('offers only what canon states a temp-HP number for, not every feature he has', () => {
    const offered = tempHPGrantors(HIS_SHAPE, ctx())
    // He has many features. A list that grew with the sheet would be a free-text
    // field with extra steps, and every extra entry is a wrong answer waiting to
    // be tapped at a table.
    expect((HIS_SHAPE.features ?? []).length).toBeGreaterThan(offered.length)
    for (const name of offered) {
      expect(grantedTempHP(featureByName(name), ctx())).toBeGreaterThan(0)
    }
  })

  it('every name it offers survives the round trip back through canon', () => {
    // This is the whole reason the list is derived rather than typed. The string
    // handed to `setTempHP` is the string `activeRetaliation` feeds straight back
    // into `featureByName`; a name that did not resolve would be a question whose
    // answer silently does nothing.
    for (const name of tempHPGrantors(HIS_SHAPE, ctx())) {
      expect(featureByName(name)).toBeDefined()
    }
  })

  it('a character canon knows nothing about is asked nothing', () => {
    const stranger = {
      ...HIS_SHAPE,
      features: [{ name: 'Zzyzx Gambit', level: 1, description: 'Homebrew.' }],
    } as Character
    expect(tempHPGrantors(stranger, featureContextOf(stranger))).toEqual([])
  })

  it('names the same feature once, however many times the sheet lists it', () => {
    const doubled = {
      ...HIS_SHAPE,
      features: [...(HIS_SHAPE.features ?? []), { ...HIS_HEARTHFIRE }],
    } as Character
    expect(tempHPGrantors(doubled, featureContextOf(doubled))).toEqual(['Hearthfire Manifest'])
  })
})

describe('the two halves — and the second one is the point', () => {
  it("picking the cloak on a HAND-TYPED number arms the retaliation", () => {
    const source = tempHPGrantors(HIS_SHAPE, ctx())[0]
    // 7, not 10: a number he typed, deliberately NOT the number canon computes,
    // so nothing below can be satisfied by the engine road having run.
    const after = setTempHP(HIS_SHAPE, 7, source)
    expect(after.tempHP).toBe(7)
    expect(after.tempHPSource).toBe('Hearthfire Manifest')

    const armed = activeRetaliation(after, featureContextOf(after))
    expect(armed).not.toBeNull()
    expect(armed?.notation).toBe('1d10')
    expect(armed?.damageType).toBe('Fire')
  })

  it('leaving "Don\'t know" selected does NOT arm it', () => {
    const after = setTempHP(HIS_SHAPE, 7, null)
    expect(after.tempHP).toBe(7)
    expect(after.tempHPSource).toBeNull()
    expect(activeRetaliation(after, featureContextOf(after))).toBeNull()
  })

  it('the pool dying takes the arming with it, whoever set the source', () => {
    const up = setTempHP(HIS_SHAPE, 7, 'Hearthfire Manifest')
    const down = setTempHP(up, 0)
    expect(down.tempHPSource).toBeNull()
    expect(activeRetaliation(down, featureContextOf(down))).toBeNull()
  })
})

describe('the control, as painted', () => {
  const sources = ['Hearthfire Manifest']

  it('asks in words, and offers "Don\'t know" plus every source', () => {
    const html = renderToStaticMarkup(
      <TempHPSource sources={sources} value={null} onChange={noop} />,
    )
    const text = domText(html)
    expect(text).toContain('granted by')
    expect(text).toContain(DONT_KNOW)
    expect(text).toContain('Hearthfire Manifest')
  })

  it('starts with "Don\'t know" CHOSEN, not merely present', () => {
    const html = renderToStaticMarkup(
      <TempHPSource sources={sources} value={null} onChange={noop} />,
    )
    // Read off the pressed state rather than off the styling: a default that is
    // only a colour is a default a screen reader never hears, and a default that
    // is only an absence is the app declining to ask again.
    const pressed = [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(
      // `domText` and not `m[1]` raw: React escapes the apostrophe in "Don't"
      // to `&#x27;`, and an assertion that matched the escape would be pinned to
      // React's escaping rather than to the word on the screen.
      m => domText(m[1]),
    )
    expect(pressed).toEqual([DONT_KNOW])
  })

  it('moves the pressed state to the source he picks', () => {
    const html = renderToStaticMarkup(
      <TempHPSource sources={sources} value="Hearthfire Manifest" onChange={noop} />,
    )
    const pressed = [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(
      // `domText` and not `m[1]` raw: React escapes the apostrophe in "Don't"
      // to `&#x27;`, and an assertion that matched the escape would be pinned to
      // React's escaping rather than to the word on the screen.
      m => domText(m[1]),
    )
    expect(pressed).toEqual(['Hearthfire Manifest'])
  })

  it('renders NOTHING when there is nothing to ask about', () => {
    // Not an empty box, not a disabled control, not "no sources". A question with
    // no answers in it is worse than silence.
    expect(renderToStaticMarkup(<TempHPSource sources={[]} value={null} onChange={noop} />)).toBe(
      '',
    )
  })
})
