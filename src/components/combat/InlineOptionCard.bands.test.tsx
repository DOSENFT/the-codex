import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { InlineOptionCard } from './InlineOptionCard'
import { optionDetail } from '../../lib/turn/detail'
import { composeTurn } from '../../lib/turn/compose'
import { NIX } from '../../lib/turn/fixtures/nix'
import type { EconomyState, TurnOption } from '../../lib/turn/types'
import { setRuling, type ErratumRulings } from '../../lib/errata-rulings'

/* ============================================================================
   THE CARD, PAINTED — Table Truth slice 7, RE-POINTED at the inline card by
   Combat Open Book slice 8.

   ── WHY THIS FILE HAS A NEW NAME AND THE SAME ASSERTIONS ────────────────────
   It was `OptionDetailSheet.test.tsx`, and it measured `OptionDetailBody` —
   the bottom sheet Open Book slice 1 unmounted and slice 8 deletes. Every claim
   below is about a BEHAVIOUR the app still has, on a surface he still uses:
   canon's whole paragraph, the live one-slot-per-turn rule, the errata and how
   the table ruled on them, the Spend button, the refusal, and canon HEARTH-04's
   warning about a pool a spend would destroy. Deleting the tests along with the
   component would have deleted the only assertions on any of it — which is the
   one thing this plan said in as many words it would not do.

   So the subject changed and the claims did not. Where a claim was genuinely
   ABOUT THE SHEET rather than about the app, it is marked and restated for the
   card rather than quietly dropped:

     · BAND ORDER. The sheet ran What-it-does → Roll-from-here → How-to-use-it.
       The card runs ① At a glance → ② Full text → ③ How to use it → the rolls,
       because the first three are `EntryDetailPanel` — the SAME component the
       Grimoire paints, which is the whole feature — and the turn-specific half
       is appended after it. The assertion is still that the order is fixed and
       identical for every option; only the sequence it pins has moved.

     · THE FOLD. The sheet folded band 4 behind a tap and `tacticsOpen` said
       whether it was open. The card has no fold — the Grimoire has none, and
       parity with the Grimoire is what Marcus asked for. The two tests that
       existed to measure the fold's OPEN state survive as tests that the
       tactics are simply present; the one that measured the CLOSED state is
       gone with the thing it measured, and is named here rather than deleted
       in silence.

     · HEADINGS. "What it does" is the panel's "② Full text"; the errata line
       reads "Canon lists N errata on this" rather than "…on this feature".
       The words are the panel's, not this test's, and they are read off it.

   Rendered through `renderToStaticMarkup` in the node environment, so these are
   claims about the MODEL reaching the markup, not about paint — finding Q
   stands: CSS-clipped text still reports in full to a string renderer. The
   browser makes the geometric claim.
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

const paint = (option: TurnOption, economy: EconomyState = FRESH) =>
  renderToStaticMarkup(
    <InlineOptionCard
      detail={optionDetail(option, NIX, economy)}
      onRollDice={() => {}}
      onSpend={() => {}}
      onClose={() => {}}
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

describe('the card — the bands, always the same, always in order', () => {
  it('paints them in the fixed order, whatever the option', () => {
    /* The order IS the feature. A player mid-turn is looking, not reading, and
       a layout that reorders itself per option is unusable at speed. */
    const html = paint(byName('Divine Smite'))
    const at = (needle: string) => html.indexOf(needle)
    expect(at('At a glance')).toBeGreaterThan(-1)
    expect(at('Full text')).toBeGreaterThan(at('At a glance'))
    expect(at('How to use it')).toBeGreaterThan(at('Full text'))
    expect(at('Roll from here')).toBeGreaterThan(at('How to use it'))
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
      const seen = text(paint(option))
      if (seen.includes('…') || /\S\.\.\./.test(seen)) guilty.push(option.name)
    }
    expect(guilty).toEqual([])
  })
})

describe('the card — the rolls', () => {
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
       at a table, mid-fight.

       THE SECOND HALF IS READ OFF THE ROLLS BLOCK NOW, AND THE MOVE IS FORCED
       BY A REAL DIFFERENCE. On the sheet band 4 was folded by default, so a
       whole-document search for "to hit" was searching a document that did not
       contain canon's advice. This card never folds, and canon's advice for
       Shield of Faith contains the sentence "against a typical CR 7 attacker
       with +7 to hit" — canon's own prose, in band ③, which is exactly what
       Marcus asked to be shown. Asserting on the whole document would now fail
       for canon saying a true thing.

       So the claim is made where an offer would actually appear. That is the
       claim it always was: `1d20` is still forbidden anywhere in the markup,
       and the rolls block — the only place a pressable attack roll can be
       drawn — must not name one. */
    const html = paint(byName('Shield of Faith'))
    expect(html).not.toContain('1d20')
    const rollsBlock = text(html.slice(html.indexOf('Roll from here')))
    expect(rollsBlock).not.toContain('to hit')
  })

  it('renders notations as inert text when there is no dice roller', () => {
    /* A notation is worth reading even when it cannot be tapped — Marcus can
       pick up the dice himself. So the button degrades to a fact rather than
       disappearing. */
    const buttons = (html: string) => (html.match(/<button/g) ?? []).length

    const withRoller = paint(byName('Sacred Flame'))
    const without = renderToStaticMarkup(
      <InlineOptionCard
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

describe('the card — the live rule box', () => {
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

describe('the card — band ③, canon’s advice', () => {
  /* THE SHEET FOLDED THIS AND THE CARD DOES NOT, and that is the feature, not a
     regression: Marcus's ask was the Grimoire's card on the combat page, and the
     Grimoire has never folded it. The sheet's third test here — "hides the
     advice until asked, but keeps the heading visible" — measured the CLOSED
     state and is therefore gone with the fold itself. It is named in this
     file's header rather than removed quietly. */

  it('paints canon’s advice in full, unfolded, under its own heading', () => {
    const html = paint(byName('Divine Smite'))
    expect(text(html)).toContain('How to use it')
    expect(text(html)).toContain('SMITE AFTER YOU SEE THE ROLL')
  })

  it('does not glue a dash separator onto the heading', () => {
    /* MEASURED OFF THE SCREENSHOT, not off the model. Canon writes
       «IT IGNORES COVER — that is Sacred Flame's unique selling point».
       `splitTactics` gives the separator to the body and trims its leading
       whitespace, which is correct for a colon (it attaches to the word before
       it) and wrong for a dash (it does not) — so the band painted
       «IT IGNORES COVER— that is».

       ASSERTED ON THE RAW MARKUP ON PURPOSE. The `text()` helper replaces every
       tag with a space, so it manufactures the very gap this test is about and
       would pass against the glued render. In the panel the heading is its own
       element and the body is the `<p>` after it, so the claim is read at the
       start of that paragraph — `leadGap` is what puts the space there. */
    const html = paint(byName('Sacred Flame'))
    const after = html.slice(html.indexOf('IT IGNORES COVER'))
    const body = /<p[^>]*>([^<]{0,4})/.exec(after)?.[1]
    expect(body, 'no paragraph followed the heading').toBeDefined()
    expect(body!.startsWith(' —') || body!.startsWith(' –')).toBe(true)
  })

  it('keeps a colon separator tight against the heading', () => {
    // The other half of the rule, so a fix that adds a space everywhere fails.
    const html = paint(byName('Sacred Flame'))
    const after = html.slice(html.indexOf('RADIANT IS EXCELLENT'))
    const body = /<p[^>]*>([^<]{0,4})/.exec(after)?.[1]
    expect(body, 'no paragraph followed the heading').toBeDefined()
    expect(body!.startsWith(':')).toBe(true)
  })

  it('keeps canon’s capitals — the headings are not retitled', () => {
    /* The capitals are canon's own emphasis. Sentence-casing them would be the
       app editing the book to suit its typography. */
    expect(text(paint(byName('Divine Smite')))).toContain('CRITICAL HITS DOUBLE THE SMITE DICE')
  })
})

describe('the card — homebrew is a first-class citizen', () => {
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
    /* THE NAME IS NOT IN THE CARD'S TEXT, AND THAT IS A DIFFERENCE FROM THE
       SHEET RATHER THAN A LOSS. The sheet was a modal over the list, so it had
       to carry a title or he would not have known what he was reading. The card
       opens UNDER the row he tapped, and that row says the name in gold two
       lines up — repeating it would push canon's first paragraph further from
       the tap, on the one screen where that distance is the whole complaint.

       So the name is asserted where the card really carries it: the
       `data-entry-detail` attribute the panel stamps on its root, which is also
       what the browser prover keys on. The words are asserted as text. */
    const html = paint(HOMEBREW)
    expect(html).toContain('data-entry-detail="Emberwright Stance"')
    const seen = text(html)
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

   Before that slice the band read `id + problem` and stopped. The upgrade is
   deliberately NOT more canon: the full record lives in the Rules flags band,
   which is its home. What arrives here is the operative rule — how the table
   answered — because mid-combat that is the only part of the record that
   changes what happens next.

   MEASURED WHILE WRITING THESE: of the fourteen options `composeTurn` builds
   for Nix, exactly ONE reaches any erratum — Hearthfire Manifest, which reaches
   four. Not Flaming Cloak, and not Aura of Solace, which composes no option at
   all. Two of the six live errata therefore have no route through this card
   whatsoever. That is the whole argument for the band being the home and this
   being the shortcut, and it is measured here rather than assumed.
   ========================================================================= */
describe('the errata band', () => {
  const HFM = () => byName('Hearthfire Manifest')

  const withRulings = (rulings: ErratumRulings) =>
    renderToStaticMarkup(
      <InlineOptionCard
        detail={optionDetail(HFM(), NIX, FRESH)}
        rulings={rulings}
        onClose={() => {}}
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
    expect(seen.match(/not ruled on yet/g)).toHaveLength(3) // the other three
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

  it('still renders for a caller that passes no rulings at all', () => {
    /* `rulings` is optional, so every call site that predates the ruling store
       keeps working. The only difference is the honest "not ruled on yet". */
    expect(text(paint(HFM()))).toContain('Canon lists 4 errata on this')
  })
})

describe('the spend path reaches the glass', () => {
  /* Table Truth slice 7 built the Spend button and 10b made the state it would
     spend single-owned. Neither wired the two together: `OptionDetailSheetLive`
     never passed `onSpend`, so on the real Play tab the button was never painted
     at all. These are the model-side half of that wiring; the browser makes the
     claim about the running app. */

  const withRefusal = (option: TurnOption, refusal: string | null) =>
    renderToStaticMarkup(
      <InlineOptionCard
        detail={optionDetail(option, NIX, FRESH)}
        onRollDice={() => {}}
        onSpend={() => {}}
        refusal={refusal}
        onClose={() => {}}
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
    /* The prop's own law, held: a caller with no `onSpend` — any read-only
       preview, any test — gets a card with no button rather than a dead one. A
       roll notation degrades to an inert fact because the NOTATION is useful; a
       Spend control does not, because it is not. */
    const html = renderToStaticMarkup(
      <InlineOptionCard
        detail={optionDetail(byName('Sacred Flame'), NIX, FRESH)}
        onClose={() => {}}
      />
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

  it('keeps the refusal beside the button that caused it', () => {
    /* Position is the claim, not decoration: the sentence answers a specific
       tap. Asserted by ordering — the refusal must fall after the Spend control
       and inside the rolls block, not at the foot of the card. */
    const html = withRefusal(byName('Sacred Flame'), 'Nope.')
    const t = text(html)
    const rolls = t.indexOf('Roll from here')
    const spend = t.indexOf('Spend')
    const refused = t.indexOf('Nope.')
    const close = t.lastIndexOf('Close')
    expect(rolls).toBeGreaterThan(-1)
    expect(refused).toBeGreaterThan(spend)
    expect(refused).toBeLessThan(close)
  })
})

/* ============================================================================
   CANON HEARTH-04'S MANDATORY WARNING. Table Truth slice 10d.

   The erratum's exact words: "If the cloak is active and the player gains
   Temporary Hit Points from another source, the app must prompt." This card is
   one of the two surfaces that can gain him a pool, so it is one of the two
   that must ask. It asks with a sentence ABOVE the button — the refusal below
   answers a press that already happened; this one has to be read before the
   press that would destroy a pool.

   None of these can pass against slice 10c: `OptionDetail.spendWarning` did not
   exist, and neither did the grant it is computed from.
   ========================================================================= */
describe('the card — what spending would destroy', () => {
  const cloakedIn = (amount: number, source: string | null) => ({
    ...NIX,
    tempHP: amount,
    tempHPSource: source,
  })

  /** Composed against the SAME character the card is painted for, because the
   *  grant is computed per character and a card quoting another card's numbers
   *  is the bug this project keeps finding. */
  const paintFor = (character: typeof NIX, name: string) => {
    const t = composeTurn({ character, combat: null })
    const option = [...t.ranked, ...t.rest, ...t.mutex.flatMap(g => g.faces)].find(
      o => o.name === name
    )!
    return renderToStaticMarkup(
      <InlineOptionCard
        detail={optionDetail(option, character, FRESH)}
        onRollDice={() => {}}
        onSpend={() => {}}
        onClose={() => {}}
      />
    )
  }

  it('warns, and names the pool, when a live pool would be replaced', () => {
    const html = paintFor(cloakedIn(5, 'Heroism'), 'Flaming Cloak')
    const t = text(html)
    expect(t).toContain('Replaces')
    expect(t).toContain('your Heroism pool (5)')
    expect(t).toContain('do not stack')
  })

  it('says the honest thing about a pool the app cannot account for', () => {
    const html = paintFor(cloakedIn(5, null), 'Flaming Cloak')
    expect(text(html)).toContain('the 5 temporary hit points you already have')
  })

  it('says nothing when there is no pool to lose — the ordinary case', () => {
    expect(NIX.tempHP).toBe(0)
    expect(text(paintFor(NIX, 'Flaming Cloak'))).not.toContain('Replaces')
  })

  it('says nothing when the cloak would merely refresh itself', () => {
    /* Re-taking the thing that granted the pool you are standing in is not a
       decision between two pools, and a warning there would be the app crying
       wolf about itself. Level 8 + Charisma 18 is 12. */
    expect(text(paintFor(cloakedIn(12, 'Flaming Cloak'), 'Flaming Cloak'))).not.toContain('Replaces')
  })

  it('says nothing on an option that grants nothing, whatever the pool', () => {
    expect(text(paintFor(cloakedIn(11, 'Flaming Cloak'), 'Sacred Flame'))).not.toContain('Replaces')
  })

  it('puts the warning ABOVE the button, not below it', () => {
    /* Position is the whole claim. Underneath, it would be indistinguishable
       from the refusal — a report on a press that has already destroyed the
       pool. */
    const t = text(paintFor(cloakedIn(5, 'Heroism'), 'Flaming Cloak'))
    const warning = t.indexOf('Replaces')
    const button = t.indexOf('Spend')
    expect(warning).toBeGreaterThan(t.indexOf('Roll from here'))
    expect(button).toBeGreaterThan(warning)
  })
})
