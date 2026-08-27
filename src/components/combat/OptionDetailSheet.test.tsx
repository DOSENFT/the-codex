import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OptionDetailBody } from './OptionDetailSheet'
import { optionDetail } from '../../lib/turn/detail'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { EconomyState, TurnOption } from '../../lib/turn/types'
import { setRuling, type ErratumRulings } from '../../lib/errata-rulings'

/* ============================================================================
   THE SHEET, PAINTED — Table Truth slice 7.

   Rendered through `renderToStaticMarkup` in the node environment, so these are
   claims about the MODEL reaching the markup. They are not claims about paint:
   Finding Q stands — CSS-clipped text still reports in full to a string
   renderer, so "no ellipsis in the markup" does not prove "no ellipsis on
   screen". prove-slice7.mjs makes the geometric claim in a real browser.

   What these DO prove, and what no browser prover proves as cheaply, is that
   every band is wired to its source and that the fallbacks fill the same shape.
   ========================================================================= */

const FRESH: EconomyState = {
  action: true,
  bonusAction: true,
  reaction: true,
  movement: true,
  spellSlotUsedThisTurn: false,
}

const turn = composeTurn({ character: NIX, combat: null })
const everyOption: TurnOption[] = [
  ...turn.ranked,
  ...turn.rest,
  ...turn.mutex.flatMap(g => g.faces),
]
const byName = (name: string) => {
  const found = everyOption.find(o => o.name === name)
  if (!found) throw new Error(`fixture has no option named ${name}`)
  return found
}

const paint = (option: TurnOption, economy: EconomyState = FRESH, tacticsOpen = false) =>
  renderToStaticMarkup(
    <OptionDetailBody
      detail={optionDetail(option, NIX, economy)}
      onClose={() => {}}
      onRoll={() => {}}
      onSpend={() => {}}
      tacticsOpen={tacticsOpen}
    />
  )

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

describe('OptionDetailBody — the four bands, always four, always in order', () => {
  it('paints the bands in the fixed order, whatever the option', () => {
    /* The order IS the feature. A player mid-turn is looking, not reading, and
       a layout that reorders itself per option is unusable at speed. */
    const html = paint(byName('Divine Smite'))
    const at = (needle: string) => html.indexOf(needle)
    expect(at('What it does')).toBeGreaterThan(-1)
    expect(at('Roll from here')).toBeGreaterThan(at('What it does'))
    expect(at('How to use it')).toBeGreaterThan(at('Roll from here'))
  })

  it('paints canon’s WHOLE paragraph — the 80-char cut is gone', () => {
    const option = byName('Sacred Flame')
    const detail = optionDetail(option, NIX, FRESH)
    const seen = text(paint(option))

    expect(detail.whatItDoes.length).toBeGreaterThan(80)
    // The whole string, not its first 80 characters.
    expect(seen).toContain(detail.whatItDoes.slice(0, 200))
    expect(seen).toContain(detail.whatItDoes.slice(-60))
  })

  it('emits NO ellipsis for ANY option on the fixture', () => {
    /* Model-side only — see the header. The browser prover owns the paint. */
    const guilty: string[] = []
    for (const option of everyOption) {
      const seen = text(paint(option, FRESH, true))
      if (seen.includes('…') || /\S\.\.\./.test(seen)) guilty.push(option.name)
    }
    expect(guilty).toEqual([])
  })
})

describe('OptionDetailBody — band 3, the rolls', () => {
  it('paints a roll button per offer, with its notation and its label', () => {
    const seen = text(paint(byName('Opportunity Attack — Hearthbrand')))
    expect(seen).toContain('1d20+7')
    expect(seen).toContain('to hit')
    expect(seen).toContain('1d8+4')
    expect(seen).toContain('on a crit')
  })

  it('paints NO d20 for Shield of Faith — the option.dice fiction stays out', () => {
    /* The end-to-end form of rolls.test.ts's headline. A button offering an
       attack roll for Shield of Faith would teach a rule that does not exist,
       at a table, mid-fight. */
    const html = paint(byName('Shield of Faith'))
    expect(html).not.toContain('1d20')
    expect(text(html)).not.toContain('to hit')
  })

  it('renders notations as inert text when there is no dice roller', () => {
    /* A notation is worth reading even when it cannot be tapped — Marcus can
       pick up the dice himself. So the button degrades to a fact rather than
       disappearing. */
    const buttons = (html: string) => (html.match(/<button/g) ?? []).length

    const withRoller = paint(byName('Sacred Flame'))
    const without = renderToStaticMarkup(
      <OptionDetailBody
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onClose={() => {}}
      />
    )

    // The notation survives either way — that is the claim.
    expect(text(without)).toContain('2d8')
    expect(text(without)).toContain('roll Radiant')
    // …but it is no longer a control. Stated as a difference so the assertion
    // cannot pass by the button never having been there.
    expect(buttons(withRoller)).toBeGreaterThan(buttons(without))
  })
})

describe('OptionDetailBody — the live rule box', () => {
  const levelled = () => everyOption.find(o => (o.cost.spellSlotLevel ?? 0) >= 1)!

  it('reads THIS turn — the same option says different things', () => {
    const before = text(paint(levelled(), FRESH))
    const after = text(paint(levelled(), { ...FRESH, spellSlotUsedThisTurn: true }))

    expect(before).toContain('One slot per turn')
    expect(after).toContain('Not this turn')
    expect(after).toContain('already spent')
    expect(before).not.toBe(after)
  })

  it('says nothing about slots beside a cantrip', () => {
    const seen = text(paint(byName('Sacred Flame')))
    expect(seen).not.toContain('One slot per turn')
    expect(seen).not.toContain('Not this turn')
  })
})

describe('OptionDetailBody — band 4 is folded by default', () => {
  it('hides the advice until asked, but keeps the heading visible', () => {
    /* Canon's tactics run to 2,462 characters. Open by default they push the
       roll buttons off the bottom of the screen, and the rolls are what you
       opened the sheet for. */
    const folded = paint(byName('Divine Smite'), FRESH, false)
    const open = paint(byName('Divine Smite'), FRESH, true)

    expect(text(folded)).toContain('How to use it')
    expect(folded.length).toBeLessThan(open.length)
    expect(text(folded)).not.toContain('SMITE AFTER YOU SEE THE ROLL')
    expect(text(open)).toContain('SMITE AFTER YOU SEE THE ROLL')
  })

  it('does not glue a dash separator onto the heading', () => {
    /* MEASURED OFF THE SCREENSHOT, not off the model. Canon writes
       «IT IGNORES COVER — that is Sacred Flame's unique selling point».
       `splitTactics` gives the separator to the body and trims its leading
       whitespace, which is correct for a colon (it attaches to the word before
       it) and wrong for a dash (it does not) — so band 4 painted
       «IT IGNORES COVER— that is».

       ASSERTED ON THE RAW MARKUP ON PURPOSE. The `text()` helper replaces every
       tag with a space, so it manufactures the very gap this test is about and
       would pass against the glued render. Adjacency of two elements is a claim
       about the markup, so it is read there. */
    const html = paint(byName('Sacred Flame'), FRESH, true)
    expect(html).toContain('IT IGNORES COVER')
    expect(html).not.toMatch(/<\/b>[—–]/)
    expect(html).toMatch(/<\/b>\s[—–]/)
  })

  it('keeps a colon separator tight against the heading', () => {
    // The other half of the rule, so a fix that adds a space everywhere fails.
    const html = paint(byName('Sacred Flame'), FRESH, true)
    expect(html).toMatch(/RADIANT IS EXCELLENT<\/b>:/)
  })

  it('keeps canon’s capitals — the headings are not retitled', () => {
    /* The capitals are canon's own emphasis. Sentence-casing them would be the
       app editing the book to suit its typography. */
    expect(text(paint(byName('Divine Smite'), FRESH, true))).toContain(
      'CRITICAL HITS DOUBLE THE SMITE DICE'
    )
  })
})

describe('OptionDetailBody — homebrew is a first-class citizen', () => {
  const HOMEBREW: TurnOption = {
    id: 'hb-1',
    name: 'Emberwright Stance',
    kind: 'feature',
    detail: '+2 AC · 1d6 Fire retaliation · until the end of your next turn',
    cost: { slot: 'bonusAction', label: '1 Hearth point', resourcePoolId: 'hearth' },
    available: true,
    score: 0,
    source: "Marcus's own",
    homebrew: true,
  }

  it('paints every band it can, in the option’s own words', () => {
    const seen = text(paint(HOMEBREW))
    expect(seen).toContain('Emberwright Stance')
    expect(seen).toContain('+2 AC')
    expect(seen).toContain('1d6')
    expect(seen).toContain('1 Hearth point')
  })

  it('says whose words these are, without demoting them', () => {
    /* Not a warning and not a downgrade — a provenance mark. Marcus is
       entitled to know which he is about to quote at a DM. */
    expect(text(paint(HOMEBREW))).toContain('your own')
    expect(text(paint(byName('Sacred Flame')))).not.toContain('your own')
  })
})

/* ============================================================================
   THE ERRATA BAND, AND WHAT THE TABLE DECIDED — Table Truth slice 8.

   Before this slice the band read `id + problem` and stopped. The upgrade is
   deliberately NOT more canon: the full record lives in the Rules flags band,
   which is its home. What arrives here is the operative rule — how the table
   answered — because mid-combat that is the only part of the record that
   changes what happens next.

   MEASURED WHILE WRITING THESE: of the fourteen options `composeTurn` builds
   for Nix, exactly ONE reaches any erratum — Hearthfire Manifest, which reaches
   four. Not Flaming Cloak, which is the Channel Divinity option slice 6 taught
   the lookup to resolve, and not Aura of Solace, which composes no option at
   all. Two of the six live errata therefore have no route through this sheet
   whatsoever. That is the whole argument for the band being the home and this
   being the shortcut, and it is measured here rather than assumed.
   ========================================================================= */
describe('the errata band', () => {
  const HFM = () => byName('Hearthfire Manifest')

  const withRulings = (rulings: ErratumRulings) =>
    renderToStaticMarkup(
      <OptionDetailBody
        detail={optionDetail(HFM(), NIX, FRESH)}
        onClose={() => {}}
        rulings={rulings}
      />
    )

  it('is reached by exactly one of Nix’s options, which is why the band exists', () => {
    const reaching = everyOption.filter(o => optionDetail(o, NIX, FRESH).errata.length > 0)
    expect(reaching.map(o => o.name)).toEqual(['Hearthfire Manifest'])
  })

  it('prints all four faults whole', () => {
    const seen = text(paint(HFM()))
    for (const e of optionDetail(HFM(), NIX, FRESH).errata) {
      expect(seen, e.id).toContain(e.problem.replace(/\s+/g, ' ').trim())
    }
  })

  it('says an unanswered flag is unanswered, rather than staying quiet about it', () => {
    /* "We never asked" is a fact worth having at the moment the feature comes
       up — it is the difference between a settled rule and an argument waiting
       to happen. */
    const seen = text(withRulings({}))
    expect(seen.match(/not ruled on yet/g)).toHaveLength(4)
  })

  it('reports canon’s fix as the rule once the table has taken it', () => {
    const rulings = setRuling({}, 'HEARTH-04', 'canon', undefined, new Date('2026-08-27'))
    const seen = text(withRulings(rulings))
    expect(seen).toContain("Your table follows canon's fix")
    const h04 = optionDetail(HFM(), NIX, FRESH).errata.find(e => e.id === 'HEARTH-04')!
    expect(seen).toContain(h04.recommendedFix!.replace(/\s+/g, ' ').trim())
    expect(seen.match(/not ruled on yet/g)).toHaveLength(3)   // the other three
  })

  it('quotes the DM, because the DM’s words outrank canon at this table', () => {
    const rulings = setRuling({}, 'HEARTH-03', 'dm', 'the cloak fires once per round', new Date('2026-08-27'))
    const seen = text(withRulings(rulings))
    expect(seen).toContain('Your DM ruled — the cloak fires once per round')
  })

  it('says a ruling exists even when nobody wrote down its wording', () => {
    /* `setRuling` refuses to store an empty string as a ruling, so this state
       is reachable: tapped "My DM ruled", typed nothing. A bare heading over
       nothing would read as a rendering bug. */
    const rulings = setRuling({}, 'HEARTH-03', 'dm', '', new Date('2026-08-27'))
    expect(text(withRulings(rulings))).toContain('Your DM ruled — wording not recorded')
  })

  it('still renders exactly as it did in slice 7 for a caller with no rulings', () => {
    /* `rulings` is optional, so every pre-slice-8 call site keeps working. The
       only difference is the honest "not ruled on yet". */
    expect(text(paint(HFM()))).toContain('Canon lists 4 errata on this feature')
  })
})

describe('band ③ — the spend path reaches the glass (slice 10c)', () => {
  /* Slice 7 built the Spend button and slice 10b made the state it would spend
     single-owned. Neither wired the two together: `OptionDetailSheetLive` never
     passed `onSpend`, so on the real Play tab the button was never painted at
     all. These are the model-side half of that wiring; `prove-slice10c.mjs`
     makes the claim about the running app. */

  const withRefusal = (option: TurnOption, refusal: string | null) =>
    renderToStaticMarkup(
      <OptionDetailBody
        detail={optionDetail(option, NIX, FRESH)}
        onClose={() => {}}
        onRoll={() => {}}
        onSpend={() => {}}
        refusal={refusal}
      />
    )

  it('paints a Spend button on a cantrip, whose only cost is the Action', () => {
    // Fails on every build before 10c: `spendFor` returned null for anything
    // that burned neither a slot nor a pool, so `detail.spend && onSpend` was
    // false and the button was skipped.
    const html = paint(byName('Sacred Flame'))
    expect(text(html)).toContain('Spend')
    expect(text(html)).toContain(byName('Sacred Flame').cost.label)
  })

  it('paints NO Spend button when the caller cannot spend', () => {
    /* The prop's own law, held: a caller with no `onSpend` — the reactions
       band's read-only preview, any test — gets a sheet with no button rather
       than a dead one. A roll notation degrades to an inert fact because the
       NOTATION is useful; a Spend control does not, because it is not. */
    const html = renderToStaticMarkup(
      <OptionDetailBody detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)} onClose={() => {}} />
    )
    expect(text(html)).not.toContain('Spend')
  })

  it('paints the reducer’s refusal, in the reducer’s own words, under the button', () => {
    const html = withRefusal(byName('Sacred Flame'), 'You have already taken your Action.')
    expect(text(html)).toContain('Not spent')
    expect(text(html)).toContain('You have already taken your Action.')
    // Announced, not merely drawn: the button does not change on a refusal, so
    // a screen that looks identical after a press is the failure mode here.
    expect(html).toContain('role="alert"')
  })

  it('says nothing at all when nothing was refused', () => {
    /* The counterweight. A band that is always present is a band that is never
       read, and "Not spent" sitting under an unpressed button would be the app
       reporting a refusal that never happened. */
    const html = withRefusal(byName('Sacred Flame'), null)
    expect(text(html)).not.toContain('Not spent')
    expect(html).not.toContain('role="alert"')
  })

  it('keeps the refusal inside band ③, beside the button that caused it', () => {
    /* Position is the claim, not decoration: the sentence answers a specific
       tap. Asserted by ordering — the refusal must fall after "Roll from here"
       and before the bands that follow it. */
    const html = withRefusal(byName('Sacred Flame'), 'Nope.')
    const t = text(html)
    const rolls = t.indexOf('Roll from here')
    const refused = t.indexOf('Nope.')
    const nextBand = t.indexOf('How to use it')
    expect(rolls).toBeGreaterThan(-1)
    expect(nextBand).toBeGreaterThan(-1)
    expect(refused).toBeGreaterThan(rolls)
    expect(refused).toBeLessThan(nextBand)
  })
})
