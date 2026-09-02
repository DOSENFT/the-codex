import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EntryDetailPanel } from './EntryDetailPanel'
import { CatalogueRow } from './CatalogueRow'
import { entryDetail, type EntryDetail } from '../../lib/catalogue/detail'
import { buildCatalogue } from '../../lib/catalogue/build'
import { normalizeName } from '../../lib/canon/lookup'
import type { CatalogueEntry } from '../../lib/catalogue/types'
import type { Character } from '../../lib/character'

/* ===========================================================================
   THE PANEL — Open Book slice 3.

   No jsdom in this repo, so these render to a static string. THAT LIMITS WHAT
   THEY MAY CLAIM: finding Q says reading text proves the model, not the screen.
   So nothing here asserts that something is VISIBLE — visibility is checks C
   and F, in a real browser at 390×844, and those are the phase's proof. What
   these tests own is the one thing a browser check is bad at: that a fact the
   layout has never heard of is still emitted at all.

   THE TEST THIS FILE EXISTS FOR is `an invented label lands in the grid`. Every
   other assertion here is scaffolding around it.
   ========================================================================= */

const paint = (node: React.ReactElement): string => renderToStaticMarkup(node)

/** A hand-built detail. Deliberately NOT derived from canon: the point of the
 *  fall-through test is a label canon does not contain, and a fixture that can
 *  only produce canon's labels could never express it. */
function detailOf(over: Partial<EntryDetail> = {}): EntryDetail {
  return {
    title: 'Test Entry',
    subtitle: 'Level 1 Evocation · Paladin',
    tags: [],
    lock: null,
    bands: {
      provenance: 'canon',
      facts: [{ label: 'Range', value: 'Self' }],
      whatItDoes: 'It does the thing.',
      tactics: [],
      errata: [],
      featureFacts: [],
      ...(over.bands ?? {}),
    },
    cost: null,
    hero: null,
    higherLevel: null,
    source: null,
    consumed: [],
    ...over,
  }
}

describe('EntryDetailPanel — the fall-through rule', () => {
  it('AN INVENTED LABEL LANDS IN THE GRID, because falling through is the default', () => {
    /* THE MICRO-REVERT FOR THIS SLICE. Make the grid ask "do I recognise this
     * label" instead of "did the model say it was taken", and this goes red.
     *
     * The label below is not in canon, not in the sheet schema and not in any
     * branch of the panel. It is what a canon revision, a homebrew field or a
     * feature nobody has written yet looks like from in here. Marcus's own
     * words: "The documents just have SO much golden information that i want
     * access to" — a screen that silently drops what it does not recognise is
     * exactly how that information goes missing again. */
    const html = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'canon',
            facts: [
              { label: 'Range', value: 'Self' },
              { label: 'Sympathetic Resonance', value: 'Hums when a Fey is within 60 feet' },
            ],
            whatItDoes: 'It does the thing.',
            tactics: [],
            errata: [],
            featureFacts: [],
          },
        })}
      />,
    )
    expect(html).toContain('Sympathetic Resonance')
    expect(html).toContain('Hums when a Fey is within 60 feet')
    expect(html).toContain('data-fact="Sympathetic Resonance"')
  })

  it('a fact with no label at all is still drawn, and spans the grid', () => {
    // Canon states some details without naming them. A layout keyed on labels
    // is exactly where those disappear.
    const html = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'canon',
            facts: [{ label: null, value: 'Only while you hold the shield.' }],
            whatItDoes: 'x',
            tactics: [],
            errata: [],
            featureFacts: [],
          },
        })}
      />,
    )
    expect(html).toContain('Only while you hold the shield.')
    expect(html).toContain('col-span-2')
  })

  it('a promoted fact is drawn ONCE — declared consumed, so the grid skips it', () => {
    const detail = detailOf({
      bands: {
        provenance: 'canon',
        facts: [
          { label: 'Damage', value: '2d8 Radiant' },
          { label: 'Range', value: 'Self' },
        ],
        whatItDoes: 'x',
        tactics: [],
        errata: [],
        featureFacts: [],
      },
      hero: { dice: '2d8', note: 'Radiant', tone: 'damage' },
      consumed: ['Damage'],
    })
    const html = paint(<EntryDetailPanel detail={detail} />)
    expect(html).not.toContain('data-fact="Damage"')
    expect(html).toContain('data-hero-dice="damage"')
    // Once, as the numeral — not twice, and not zero times.
    expect(html.match(/2d8/g)).toHaveLength(1)
  })

  it('a label the model did NOT declare consumed is drawn even if it looks promotable', () => {
    // The inverse of the test above, and the reason `consumed` is computed
    // rather than assumed: a `Damage` row that no numeral took must still print.
    const html = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'canon',
            facts: [{ label: 'Damage', value: 'as the weapon' }],
            whatItDoes: 'x',
            tactics: [],
            errata: [],
            featureFacts: [],
          },
        })}
      />,
    )
    expect(html).toContain('data-fact="Damage"')
    expect(html).toContain('as the weapon')
  })
})

describe('EntryDetailPanel — the bands, and whose words they are', () => {
  it('a cost canon priced in minutes is not painted in a slot colour', () => {
    const action = paint(<EntryDetailPanel detail={detailOf({ cost: { word: 'Action', when: null, tone: 'action' } })} />)
    const timed = paint(<EntryDetailPanel detail={detailOf({ cost: { word: '10 minutes', when: null, tone: 'time' } })} />)
    expect(action).toContain('text-arcane-lit')
    expect(timed).toContain('data-cost="time"')
    // The three slot colours are a promise the thing is reachable on a turn.
    expect(timed).not.toContain('text-arcane-lit')
    expect(timed).not.toContain('text-ember-lit')
    expect(timed).not.toContain('text-eldritch-lit')
  })

  it("homebrew says the words are the player's, rather than passing them off as canon", () => {
    const html = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'sheet',
            facts: [{ label: 'Source', value: 'Your sheet' }],
            whatItDoes: 'A kettle appears.',
            tactics: [],
            errata: [],
            featureFacts: [],
          },
        })}
      />,
    )
    expect(html).toContain('data-provenance="sheet"')
    expect(html).toContain('canon has no record of this')
  })

  it('band 3 puts the space back after a dashed heading, and only then', () => {
    const dashed = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'canon', facts: [], whatItDoes: 'x', errata: [], featureFacts: [],
            tactics: [{ lead: 'IT IGNORES COVER', body: '— that is the point.' }],
          },
        })}
      />,
    )
    const colon = paint(
      <EntryDetailPanel
        detail={detailOf({
          bands: {
            provenance: 'canon', facts: [], whatItDoes: 'x', errata: [], featureFacts: [],
            tactics: [{ lead: 'HONEST MATH', body: ': it is 2d6.' }],
          },
        })}
      />,
    )
    expect(dashed).toContain('> — that is the point.')
    expect(colon).toContain('>: it is 2d6.')
  })

  it('no band 3 at all when canon has no advice — empty is honest, invented is not', () => {
    const html = paint(<EntryDetailPanel detail={detailOf()} />)
    expect(html).not.toContain('data-band="3"')
    expect(html).not.toContain('How to use it')
  })
})

/* ── Against his real sheet ─────────────────────────────────────────────── */

const NIX_EXPORT = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'

function nixOrNull(): Character | null {
  try {
    return JSON.parse(readFileSync(NIX_EXPORT, 'utf8')) as Character
  } catch {
    return null
  }
}

const nix = nixOrNull()
const catalogue = nix ? buildCatalogue(nix) : []
const find = (name: string): CatalogueEntry => {
  const key = normalizeName(name)
  const entry = catalogue.find(e => e.key === key)
  if (!entry) throw new Error(`${name} is not in the catalogue`)
  return entry
}

describe.skipIf(!nix)('CatalogueRow — a locked row opens to everything', () => {
  const row = (entry: CatalogueEntry, expanded: boolean) =>
    paint(
      <CatalogueRow
        entry={entry}
        detail={entryDetail(entry, nix!)}
        expanded={expanded}
        mode="session"
        onToggleExpand={() => {}}
        onRollDice={() => {}}
      />,
    )

  it('the lock chip survives with the attribute check B counts', () => {
    // Renaming it would turn a passing browser proof into a vacuous one.
    expect(row(find('Aura of Vitality'), false)).toContain('data-lock-chip="9"')
  })

  it('opened, a locked entry gets all three bands and the whole paragraph', () => {
    /* Marcus: "locked from being prepared, and visually locked, but still
     * provide me the ability to see them and their details". This is the
     * assertion that no branch withholds a band on a lock. */
    const html = row(find('Aura of Vitality'), true)
    expect(html).toContain('data-band="1"')
    expect(html).toContain('data-band="2"')
    expect(html).toContain('data-band="3"')
    expect(html).toContain('data-lock-strip="9"')
    expect(html).toContain("can&#x27;t prepare")
  })

  it('and the paragraph is canon\'s, entire', () => {
    const entry = find('Aura of Vitality')
    const html = row(entry, true)
    const summary = entry.canonSpell!.summary
    expect(summary.length, 'the fixture actually holds a paragraph').toBeGreaterThan(120)
    // Every paragraph of it, joined back — nothing sliced off the end.
    for (const part of summary.split(/\n+/).map(s => s.trim()).filter(Boolean)) {
      expect(html).toContain(part.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/</g, '&lt;'))
    }
  })

  it('a feat opens to canon rather than to one row saying "Feat"', () => {
    // Slice 3 widened `bands.ts` for feats. Before it, Sentinel's band 1 was
    // the caller's fallback and its band 3 was empty.
    const html = row(find('Sentinel'), true)
    expect(html).toContain('data-band="1"')
    expect(html).toContain('data-band="3"')
  })

  it('closed, it is a line — the bands are not in the document at all', () => {
    const html = row(find('Searing Smite'), false)
    expect(html).not.toContain('data-band="1"')
    expect(html).toContain('Searing Smite')
  })
})
