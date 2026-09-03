import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TacticCard } from './TacticCard'
import type { ToyboxTactic } from '../../lib/toybox'

/* ============================================================================
   A REQUIREMENT IS NOT A TAG — slice 4.

   This card rendered `requirements` and `tags` as two adjacent rows of
   `<Badge variant="neutral">`. Same shape, same tint, same size, stacked. One
   of those rows is a search keyword; the other is the answer to "can I even
   run this today", and is the field tomorrow's prepared-spell list is meant to
   be read backwards out of.

   THE FIRST TEST BELOW CANNOT PASS AGAINST THE PRE-CHANGE COMPONENT, and it is
   built that way on purpose: it hands the card a requirement and a tag with
   THE SAME TEXT and then requires the markup to tell them apart. Before this
   slice the two were byte-identical, so no assertion about their text could
   have separated them — the only thing that can is the shape they are painted
   in, which is what is counted.
   ========================================================================== */

const noop = () => {}

const BASE: ToyboxTactic = {
  id: 't1',
  name: 'The Reaction Is Only One',
  trigger: 'an enemy turn is starting and three things want your reaction',
  actions: ['Decide before their turn begins.'],
  priority: 'normal',
  tags: [],
  favorite: false,
  createdAt: 1,
}

const paint = (tactic: ToyboxTactic) =>
  renderToStaticMarkup(
    <TacticCard
      tactic={tactic}
      expanded
      onToggleExpand={noop}
      onToggleFavorite={noop}
      onEdit={noop}
      onDelete={noop}
    />,
  )

/** How many `<Badge>` pills the card painted. That class pair is emitted by
 *  `ui/Badge.tsx` and by nothing else in this tree, which is what makes
 *  counting them a claim about SHAPE rather than about text. */
const pills = (markup: string) => markup.match(/rounded-full border px-2\.5 py-0\.5/g)?.length ?? 0

describe('requirements, told apart from tags', () => {
  it('does not paint a requirement as a pill, even when it says the same words as a tag', () => {
    const collision: ToyboxTactic = {
      ...BASE,
      requirements: ['Channel Divinity'],
      tags: ['Channel Divinity'],
    }
    const markup = paint(collision)

    expect(markup.match(/Channel Divinity/g), 'both are still on screen').toHaveLength(2)
    /* Two pills: the priority badge and the tag. A third means `requirements`
       is back to rendering as a Badge, which is the whole defect. */
    expect(pills(markup), 'the requirement is rendering as a Badge again').toBe(2)
    expect(markup, 'and it is labelled, so its row reads as a different kind of thing')
      .toContain('REQ')
  })

  it('states several requirements as one line rather than a row of chips', () => {
    const markup = paint({ ...BASE, requirements: ['Hearthfire Manifest', 'Channel Divinity'] })
    expect(markup).toContain('Hearthfire Manifest · Channel Divinity')
  })

  it('says nothing at all when there are no requirements', () => {
    /* The guarantee to everything Marcus wrote by hand: none of his tactics
       carry this field, and none of them grow an empty labelled row. */
    const markup = paint({ ...BASE, tags: ['reaction'] })
    expect(markup).not.toContain('REQ')
  })
})

describe('annotations', () => {
  it('paints one row per note, each with its own kind named', () => {
    const markup = paint({
      ...BASE,
      annotations: [
        { kind: 'positioning', text: 'Stand behind the front, not in it.' },
        { kind: 'party', text: 'Tell Ponzi before you cast.' },
        { kind: 'warning', text: 'Interception is not in your source files.' },
      ],
    })

    expect(markup).toContain('Stand behind the front, not in it.')
    expect(markup).toContain('Tell Ponzi before you cast.')
    expect(markup).toContain('Interception is not in your source files.')

    /* A marker that is only a colour is invisible to a colour-blind reader and
       to a screen reader both. Each kind names itself. */
    expect(markup).toContain('Positioning')
    expect(markup).toContain('Party')
    expect(markup).toContain('Heads up')
  })

  it('does not turn an annotation into a pill either', () => {
    const markup = paint({
      ...BASE,
      annotations: [{ kind: 'warning', text: 'Temporary hit points never stack.' }],
    })
    expect(pills(markup), 'only the priority badge').toBe(1)
  })

  it('renders no marker rows for a tactic that has none', () => {
    const markup = paint(BASE)
    expect(markup).not.toContain('Positioning')
    expect(markup).not.toContain('Heads up')
  })
})

/* ============================================================================
   THREE PRIORITIES, THREE COLOURS — slice 9.

   `PRIORITY_BADGE_VARIANT` mapped BOTH `critical` and `high` to `ember`, so a
   tab scrolled at arm's length showed two tints for three tiers and the
   distinction survived only in the four letters of the label. The pack leans on
   it: twelve tactics are filed across all three priorities precisely so the
   urgent ones surface, and a tier you can only tell apart by reading is not a
   tier you can scan.

   THE FIRST TEST BELOW CANNOT PASS AGAINST THE PRE-CHANGE COMPONENT. It does
   not name a colour — naming one would pin today's palette and fail the day
   somebody re-themes — it requires the three tints to be PAIRWISE DISTINCT,
   which is the actual claim and was false by inspection before the fix.

   The second test is the constraint the fix had to respect. `ui/Badge.tsx`
   carries a long comment about contrast: `gold` reads 6.28:1, which clears the
   V-2 text floor and misses the V-3 numeral floor, and its own note says the
   first gold badge to carry a NUMBER needs a `--color-gold-lit` token before it
   ships. HIGH is a word. So the test pins that these labels stay non-numeric —
   if somebody ever changes them to "1/2/3", this fails and points at the token
   that has to exist first, rather than shipping a numeral at 6.28:1.
   ========================================================================== */

/** The tint class the pill was painted with. Emitted only by `ui/Badge.tsx`'s
 *  variant table, so reading it is a claim about which VARIANT was chosen
 *  rather than about any particular hex value. */
const priorityTint = (markup: string): string | null =>
  markup.match(/class="[^"]*\s(bg-[a-z0-9-]+\/\d+)[^"]*"[^>]*>(?:CRITICAL|HIGH|NORMAL)</)?.[1]
  ?? null

describe('the three priorities are three tiers, not two', () => {
  const tint = (priority: ToyboxTactic['priority']) =>
    priorityTint(paint({ ...BASE, priority }))

  it('paints critical, high and normal in three different tints', () => {
    const critical = tint('critical')
    const high = tint('high')
    const normal = tint('normal')

    for (const [name, value] of [['critical', critical], ['high', high], ['normal', normal]] as const)
      expect(value, `no priority tint found for ${name}`).not.toBeNull()

    expect(new Set([critical, high, normal]).size,
      `critical=${critical} high=${high} normal=${normal} — two tiers share a tint`)
      .toBe(3)
  })

  it('keeps the priority labels words, because one of the three tints is gold', () => {
    for (const priority of ['critical', 'high', 'normal'] as const) {
      const label = paint({ ...BASE, priority })
        .match(/>(CRITICAL|HIGH|NORMAL)</)?.[1] ?? ''
      expect(label, `no label painted for ${priority}`).not.toBe('')
      expect(label, `${label} contains a numeral; see ui/Badge.tsx on gold and V-3`)
        .not.toMatch(/[0-9]/)
    }
  })
})
