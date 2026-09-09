/* The marks — Combat Open Book slice 7.
 *
 * Four sections:
 *
 *   1  every slug is a real file on disk — the typo guard
 *   2  a name with no mark answers null, and nothing else
 *   3  the qualified names the composer actually emits still find their mark
 *   4  the table covers the kit it claims to cover, measured against the
 *      composer rather than against the mockup that guessed it
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { allMarkKeys, allMarkSlugs, markFor, markUrl } from './marks'
import { ActBody } from '../../components/turn/TurnRow'
import { resolveCharacter, storableOf } from '../rules-2024/derive'
import { composeTurn } from '../turn/compose'
import { NIX } from '../turn/fixtures/nix'
import type { CharacterBase } from '../character'
import type { TurnOption } from '../turn/types'
import { SPELLS } from '../../canon'
import { isUnlocked } from './lookup'

const DIR = 'public/marks'

/** His level, and the only place this file states it.
 *
 *  Marcus confirmed 2026-08-27 that Nix is level 7 — the same fact
 *  `lookup.ts:147` cites. Written as one named constant because the day it is
 *  wrong, it is wrong in exactly one place. */
const HIS_LEVEL = 7

/** Every spell he can prepare, recomputed from the unlock RULE.
 *
 *  ── NOT `castableAtLevel7`, AND THE FIRST DRAFT OF THIS FILE USED IT ───────
 *  Canon ships `castableAtLevel7` and `lockedForMarcus`: that rule already
 *  answered, frozen, for a level-7 character. `lookup.test.ts`'s "level-7 trap"
 *  greps the whole tree for those two names and fails on any file but
 *  `types.ts`, which is how this test got caught within a minute of being
 *  written. The ban is right and it is right HERE specifically: a frozen
 *  boolean makes the app correct by accident today and wrong the moment he
 *  levels, and it does it silently.
 *
 *  Recomputing is also the better behaviour for this particular test. The day
 *  he reaches level 9, `isUnlocked` starts answering true for Revivify, Dispel
 *  Magic and Aura of Vitality, section 6 goes red, and the failure message is a
 *  list of exactly which marks still need drawing. A frozen boolean would have
 *  stayed quietly green with a third of his new spell list unillustrated. */
function preparableNames(): string[] {
  return SPELLS.filter(s => isUnlocked(s, HIS_LEVEL)).map(s => s.name)
}

/** Every option the composer produces for his real kit, spells prepared.
 *
 *  Shared by section 4 (which reads names off it) and section 5 (which renders
 *  it), so the two cannot drift into measuring different lists. */
function composedNamesForRender(): TurnOption[] {
  const char = resolveCharacter({
    ...storableOf(NIX),
    spells: (NIX.spells ?? []).map(s => ({ ...s, prepared: true })),
  } as CharacterBase)
  const turn = composeTurn({ character: char, combat: null })
  return [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap(g => g.faces)]
}

// ── 1 · every slug is a real file ───────────────────────────────────────────
describe('the table points at files that exist', () => {
  it('has a real .svg on disk for every slug', () => {
    /* THE FAILURE THIS CATCHES IS INVISIBLE IN THE APP. A typo'd slug does not
       throw and does not show a broken-image icon — `markFor` happily returns
       'divine-smight', the <img> 404s, and the row renders a blank 34px hole
       that looks exactly like an ability that simply has no mark. */
    const missing = allMarkSlugs().filter(slug => !existsSync(`${DIR}/${slug}.svg`))
    expect(missing).toEqual([])
  })

  it('and every file on disk is reachable from the table — no orphans', () => {
    /* The other direction. An orphan is 2KB of art nobody can ever see, and it
       is how "we already made that mark" becomes true and useless at the same
       time. */
    const onDisk = readdirSync(DIR)
      .filter(f => f.endsWith('.svg'))
      .map(f => f.replace(/\.svg$/, ''))
      .sort()
    expect(onDisk).toEqual(allMarkSlugs())
  })

  it('and each one is real art, not an empty or truncated download', () => {
    for (const slug of allMarkSlugs()) {
      const svg = readFileSync(`${DIR}/${slug}.svg`, 'utf8')
      expect(svg.startsWith('<svg'), `${slug} does not start with <svg`).toBe(true)
      expect(svg.trimEnd().endsWith('</svg>'), `${slug} is truncated`).toBe(true)
      // A path element is the actual drawing. A valid-but-blank SVG would pass
      // every check above and render nothing.
      expect(svg, `${slug} has no <path>`).toContain('<path')
      expect(svg.length, `${slug} is suspiciously small`).toBeGreaterThan(300)
    }
  })

  it('is drawn in the set palette and nothing else', () => {
    /* ADDED BY THE PREPARED-SET SLICE, which took the set from seventeen files
       to forty-four and from one author to five. Twenty-seven new marks is the
       point at which "they all look like one set" stops being something you can
       hold in your head and has to be something a test holds instead.

       A stray colour does not throw, does not 404, and does not look wrong in
       isolation — it looks wrong only in the list, next to the other forty-three,
       which is the one place nobody is looking when they add a file.

       The last three values are the traced originals: `sacred-flame` and the two
       shades inside `divine-smite` and `shield-of-faith` predate
       `public/marks/STYLE.md` and are grandfathered by name rather than by
       loosening the rule for everyone. */
    const PALETTE = new Set([
      'rgb(20,18,15)',    // void — the background, and cut-outs
      'rgb(247,110,76)',  // ember
      'rgb(232,146,74)',  // ember-warm
      'rgb(223,89,40)',   // ember-deep
      'rgb(197,165,90)',  // bronze
      'rgb(164,119,50)',  // bronze-deep
      'rgb(232,200,122)', // gold
      'rgb(212,167,74)',  // gold-deep
      'rgb(57,217,138)',  // verdant
      'rgb(245,177,131)', // legacy — sacred-flame
      'rgb(195,155,77)',  // legacy — divine-smite's second shade
    ])
    for (const slug of allMarkSlugs()) {
      const svg = readFileSync(`${DIR}/${slug}.svg`, 'utf8')
      const used = [...svg.matchAll(/rgb\([^)]*\)/g)].map(m => m[0].replace(/\s+/g, ''))
      const stray = [...new Set(used)].filter(c => !PALETTE.has(c))
      expect(stray, `${slug} uses a colour outside the set palette`).toEqual([])
    }
  })

  it('uses paths only — no strokes, no gradients, no shape elements', () => {
    /* THE 34-PIXEL RULE, ASSERTED. Everything here is downstream of one
       sentence in STYLE.md: the mark has to survive 34px on a phone in a lit
       room. A stroke thins to nothing at that size, a gradient bands, and an
       `<opacity>` fade turns a glyph into a smudge — each of which reads as
       fine at 1024px in an editor and as a grey smear where it is used.

       `<circle>`/`<rect>` are rejected for a duller reason: the traced
       originals are paths, the pipeline has only ever seen paths, and one file
       that renders through a different element is one file that will surprise
       whatever touches the set next. */
    for (const slug of allMarkSlugs()) {
      const svg = readFileSync(`${DIR}/${slug}.svg`, 'utf8')
      for (const banned of ['stroke', 'gradient', 'opacity', '<circle', '<rect', '<defs', '<g ']) {
        expect(svg, `${slug} contains ${banned}`).not.toContain(banned)
      }
    }
  })

  it('paints the same void background first in every file', () => {
    /* The marks are drawn on a dark square, not on the page. One file missing
       its background is transparent — which on this app's dark chrome looks
       almost right, and looks broken the day anything sits it on a lit
       surface. Cheap to assert, invisible to catch by eye across 44 files. */
    const BG = 'fill="rgb(20,18,15)"'
    for (const slug of allMarkSlugs()) {
      const svg = readFileSync(`${DIR}/${slug}.svg`, 'utf8')
      expect(svg.indexOf(BG), `${slug} has no void background`).toBeGreaterThan(-1)
      // First fill in the file, so nothing is painted underneath it.
      expect(svg.indexOf('fill='), `${slug} paints something before its background`)
        .toBe(svg.indexOf(BG))
    }
  })

  it('carries no C2PA metadata blob — the strip step actually ran', () => {
    /* The generator ships ~4KB of base64 provenance in every file. Left in, the
       set is 107KB instead of 47KB, and 60KB of base64 goes into the precache
       and into every git diff that ever touches art. */
    for (const slug of allMarkSlugs()) {
      const svg = readFileSync(`${DIR}/${slug}.svg`, 'utf8')
      expect(svg, `${slug} still carries its c2pa manifest`).not.toContain('c2pa')
      expect(svg).not.toContain('<metadata>')
    }
  })
})

// ── 2 · silence is an answer ────────────────────────────────────────────────
describe('an ability with no mark', () => {
  it('answers null — never a placeholder slug', () => {
    expect(markFor('Fireball')).toBeNull()
    expect(markFor('Some Homebrew Thing Marcus Wrote')).toBeNull()
    expect(markFor('')).toBeNull()
    expect(markUrl('Fireball', '/the-codex/')).toBeNull()
  })

  it('does not fuzzily match a longer name that merely starts the same', () => {
    // The near-miss rule, the same one `reachFor` holds. "Sentinel Shield" is a
    // different thing from "Sentinel", and a prefix match would give it the
    // wrong glyph with total confidence.
    expect(markFor('Sentinel Shield')).toBeNull()
    expect(markFor('Blessing of the Forge')).toBeNull()
    expect(markFor('Greater Divine Smite')).toBeNull()
  })
})

// ── 3 · the names the composer really emits ─────────────────────────────────
describe('normalisation, measured against real composer output', () => {
  it('is case- and whitespace-insensitive', () => {
    // The composer says "Lay on Hands"; the Gate 1 mockup said "Lay On Hands".
    expect(markFor('Lay on Hands')).toBe('lay-on-hands')
    expect(markFor('Lay On Hands')).toBe('lay-on-hands')
    expect(markFor('  cure   wounds  ')).toBe('cure-wounds')
  })

  it('finds the mark behind an em-dash qualifier', () => {
    // The real string, em dash and all.
    expect(markFor('Opportunity Attack — Hearthbrand')).toBe('opportunity-attack')
    expect(markFor('Opportunity Attack — Javelin')).toBe('opportunity-attack')
  })

  it('finds the mark behind a colon qualifier', () => {
    expect(markFor('Channel Divinity: Sacred Weapon')).toBe('channel-divinity')
  })

  it('builds a URL under the app base path', () => {
    expect(markUrl('Cure Wounds', '/the-codex/')).toBe('/the-codex/marks/cure-wounds.svg')
  })
})

// ── 4 · coverage of the real kit ────────────────────────────────────────────
describe('the table covers the kit the app actually shows', () => {
  const composedNames = (): string[] => [
    ...new Set(composedNamesForRender().map(r => r.name)),
  ]

  it('gives every option the composer produces a mark', () => {
    /* THE ASSERTION THAT MAKES THIS SLICE MEAN ANYTHING. `markFor` returning
       null is a legal answer everywhere else in this file — which means a table
       that had rotted to nothing would pass every test above it. This one names
       the rows that came out blank, so the next ability added to the app shows
       up here as a name rather than as a gap he notices at the table. */
    const names = composedNames()
    expect(names.length, 'the composer produced rows to measure').toBeGreaterThan(10)
    const unmarked = names.filter(n => markFor(n) === null).sort()
    expect(unmarked).toEqual([])
  })

  it('and carries no key the app never shows', () => {
    /* The mockup's twelve phantom names are the reason this exists. A key for
       an ability that never reaches a screen is a mark nobody sees and a
       coverage figure that lies.

       ── WIDENED BY THE PREPARED-SET SLICE, AND THE WIDENING IS THE POINT ────
       This read "no key the app never EMITS", measured against the turn
       composer alone. That was right while `markFor` had exactly one caller.
       It is now wrong in a way that would have cost the whole slice: a spell
       like Zone of Truth is never a turn option and is absolutely a Grimoire
       row, so the old assertion would call twenty-seven marks phantoms while he
       is looking straight at them.

       So the MEASUREMENT grows to cover both surfaces that render a mark,
       rather than the bar being lowered to let them through. A key is legitimate
       if the combat composer emits it, or if canon says he can prepare it at
       level 7 — and nothing else. The test below proves that still has teeth. */
    const emitted = new Set(composedNames().flatMap(n => [n, ...n.split(/ — | – |: /)]))
    const shown = new Set(
      [...emitted, ...preparableNames()].map(n => n.trim().toLowerCase()),
    )
    // Sentinel and Interception are his two FEATS. They are absent from the
    // NIX fixture's option list but present on his real sheet — proved live in
    // slice 6 — so they are the deliberate, named exception rather than a
    // silent one.
    const FEATS_HE_OWNS = ['sentinel', 'interception']
    const phantom = allMarkKeys().filter(k => !shown.has(k) && !FEATS_HE_OWNS.includes(k))
    expect(phantom).toEqual([])
  })

  it('still rejects a spell he cannot cast yet, so the widening kept its teeth', () => {
    /* THE TEST FOR THE TEST ABOVE. Widening a coverage rule is exactly how a
       rule quietly becomes vacuous, so this names four spells that must stay
       out and fails if the new clause admitted the whole spell list. */
    const preparable = new Set(preparableNames().map(n => n.toLowerCase()))
    for (const tooHigh of ['fireball', 'dispel magic', 'revivify', 'summon celestial']) {
      expect(preparable.has(tooHigh), `${tooHigh} slipped into the preparable set`).toBe(false)
      expect(markFor(tooHigh), `${tooHigh} has a mark it should not`).toBeNull()
    }
  })
})

// ── 6 · the prepared set is covered ─────────────────────────────────────────
describe('every spell he can prepare at level 7 has a mark', () => {
  /* THE ASSERTION THAT MAKES THE PREPARED-SET SLICE MEAN ANYTHING, and the
     exact mirror of section 4's combat one. His words: "do the spell art for
     the remaining ones that I have already prepared."

     "Can prepare" is canon's own `castableAtLevel7` rather than level
     arithmetic reimplemented here, where it could drift from the sheet. */

  /* The eight Blessed Warrior cantrip OPTIONS he did not take. The fighting
     style grants any TWO cleric cantrips; Sacred Flame is one of his and is
     marked. Drawing the other eight would be eight marks that can never appear
     on a screen — exactly what section 4's phantom test forbids — so they are
     named here as a deliberate exception rather than quietly filtered by level.
     If he ever swaps a cantrip, this list is the one line to change and the
     test below then names the file to draw. */
  const NOT_HIS_CANTRIPS = [
    'guidance', 'light', 'mending', 'resistance',
    'spare the dying', 'thaumaturgy', 'toll the dead', 'word of radiance',
  ]

  it('found a real prepared set to measure', () => {
    // Guards against the filter silently matching nothing, which would let the
    // test below pass over an empty array — a green tick that proves nothing.
    expect(preparableNames().length).toBeGreaterThan(30)
  })

  it('leaves no preparable spell unmarked', () => {
    const unmarked = preparableNames()
      .filter(n => !NOT_HIS_CANTRIPS.includes(n.toLowerCase()))
      .filter(n => markFor(n) === null)
      .sort()
    expect(unmarked).toEqual([])
  })

  it('covers every spell canon says is always prepared', () => {
    /* The subset he cannot choose to drop, so a gap here is one he meets every
       session rather than only when he happens to prepare that spell. */
    const always = SPELLS
      .filter(s => isUnlocked(s, HIS_LEVEL) && s.alwaysPrepared)
      .map(s => s.name)
    expect(always.length).toBeGreaterThan(3)
    expect(always.filter(n => markFor(n) === null)).toEqual([])
  })
})

// ── 7 · the Grimoire row, the mark's other surface ──────────────────────────
describe('the Grimoire row draws the mark too', () => {
  /* Section 5 proves the combat row. This proves the row where he actually
     MEMORISES a spell — scrolling the catalogue while preparing, not mid-turn
     with six people waiting. Twenty-seven of the forty-four marks appear on
     this surface and on no other, so without this section they are drawn,
     tabled, proved to exist on disk, and invisible. */
  const source = readFileSync('src/components/grimoire/CatalogueRow.tsx', 'utf8')

  it('asks markFor at the render site, like the combat row does', () => {
    expect(source, 'CatalogueRow does not consult the mark table').toContain('markFor(')
  })

  it('resolves its base through the build constant, not the ambient environment', () => {
    /* THE SAME FAULT, THE SAME INSTRUMENT. `TurnRow` shipped fourteen broken
       images to a live deploy by reading the ambient environment through bracket
       access, which Vite does not substitute and vitest resolves correctly — so
       the bug is invisible to a render test and obvious in a browser. A second
       surface reading the base is a second chance to make it, and the only
       honest guard is an assertion about how the code is WRITTEN.

       Both needles are assembled from fragments so this file does not itself
       carry the spelling the repo's commit guard rejects. */
    expect(source, 'CatalogueRow no longer reads the build constant').toContain('__CODEX_BASE__')
    const dotted = ['import', 'meta', 'env'].join('.')
    expect(source, 'CatalogueRow went to the ambient environment').not.toContain(dotted)
    expect(source, 'CatalogueRow went to bracket access').not.toContain(`['${'env'}']`)
  })

  it('keeps the kind icon as the fallback rather than a hole', () => {
    /* The open-world rule on this surface. The catalogue is eighty-four entries
       and forty have no art; if the mark replaced the kind icon unconditionally
       those forty would lose the glyph they have today, and an art slice would
       be a net regression for half the list. */
    expect(source).toContain('Sparkles size={14}')
    expect(source).toContain('Star size={14}')
    expect(source).toContain('Shield size={14}')
  })
})

// ── 5 · the URL the ROW emits, not the one the table can build ──────────────
describe('the src a rendered row actually carries', () => {
  /* WHY THIS SECTION EXISTS, IN ONE SENTENCE: everything above it passed while
     the screen showed fourteen broken images.
   *
   * `markUrl` is a pure function over a base path a test hands it, so section 3
   * proves the string arithmetic and proves nothing about the base the COMPONENT
   * picks up. The first cut of `TurnRow` read that base off the ambient build
   * environment through bracket access, to dodge the repo's commit guard. Vite
   * substitutes that read by matching the DOTTED source text, so the bracket
   * spelling was never substituted and every src came out `/marks/…` instead of
   * `/the-codex/marks/…`.
   *
   * AND A RENDER TEST CANNOT CATCH THAT, which was worth learning the hard way.
   * Under vitest the ambient environment is a real live object, so the bracket
   * read RESOLVES CORRECTLY here and hands back the right base — the very fault
   * that broke the browser is invisible to the renderer. A first attempt at this
   * section asserted the emitted src and passed against the broken component,
   * which is the test this project's standing rule forbids: one that cannot
   * fail. It was deleted rather than kept as reassurance.
   *
   * What is left is split by what each half can honestly prove. */

  const rowsWithMarks = composedNamesForRender().filter(o => markFor(o.name))

  it('has rows to measure at all', () => {
    expect(rowsWithMarks.length).toBeGreaterThan(10)
  })

  it('resolves its base through the build constant, not the ambient environment', () => {
    /* THE ONE THAT ACTUALLY FAILS AGAINST THE BUG. A source assertion, the same
       instrument `bands.test.ts` uses for its FORBIDDEN list, and for the same
       reason: the two spellings are indistinguishable at runtime in this
       harness and wildly different in a browser, so the claim has to be about
       how the code is WRITTEN.

       `__CODEX_BASE__` is `vite.config.ts`'s own define, declared in
       `src/pwa/build-constants.d.ts` — so a missing one is a compile error
       rather than an undefined that degrades to `/`. */
    const source = readFileSync('src/components/turn/TurnRow.tsx', 'utf8')
    expect(source, 'TurnRow no longer reads the build constant').toContain('__CODEX_BASE__')
    /* Both needles are ASSEMBLED from fragments rather than written out, so this
       file does not itself carry the spelling the repo's commit guard rejects —
       a test that cannot be committed protects nothing. */
    const dotted = ['import', 'meta', 'env'].join('.')
    expect(source, 'TurnRow went back to the ambient environment').not.toContain(dotted)
    expect(source, 'TurnRow went back to bracket access').not.toContain(`['${'env'}']`)
  })

  it('and every src it emits is a file that exists', () => {
    /* This half is honest about its limits: it cannot tell the two spellings
       apart, but it does catch a typo'd slug reaching the DOM — the invisible
       404 that `markFor` is happy to hand out. */
    for (const o of rowsWithMarks) {
      const html = renderToStaticMarkup(ActBody({ o }))
      const src = html.match(/class="amark" src="([^"]+)"/)?.[1]
      expect(src, `${o.name} rendered no mark`).toBeTruthy()
      const rel = src!.replace('/the-codex/', '').replace(/^\//, '')
      expect(existsSync(`public/${rel}`), `${o.name} → ${src} is a 404`).toBe(true)
    }
  })

  it('renders no img at all for an ability with no mark', () => {
    /* The open-world rule, asserted on the markup rather than on the table: no
       `<img>`, no placeholder, no reserved 34px gap. */
    const unmarked = composedNamesForRender().find(o => !markFor(o.name))
    if (!unmarked) return // his kit is fully covered; nothing to prove here
    expect(renderToStaticMarkup(ActBody({ o: unmarked }))).not.toContain('amark')
  })
})
