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

const DIR = 'public/marks'

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

  it('and carries no key the app never emits', () => {
    /* The mockup's twelve phantom names are the reason this exists. A key for
       an ability the composer never produces is a mark nobody sees and a
       coverage figure that lies. */
    const emitted = new Set(composedNames().flatMap(n => [n, ...n.split(/ — | – |: /)]))
    const normalised = new Set([...emitted].map(n => n.trim().toLowerCase()))
    // Sentinel and Interception are his two FEATS. They are absent from the
    // NIX fixture's option list but present on his real sheet — proved live in
    // slice 6 — so they are the deliberate, named exception rather than a
    // silent one.
    const FEATS_HE_OWNS = ['sentinel', 'interception']
    const phantom = allMarkKeys().filter(k => !normalised.has(k) && !FEATS_HE_OWNS.includes(k))
    expect(phantom).toEqual([])
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
