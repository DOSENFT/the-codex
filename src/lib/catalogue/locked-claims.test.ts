/* ============================================================================
   A LOCKED SPELL MUST NOT CLAIM TO BE READY.

   Canon marks Fireball `alwaysPrepared: true` and `unlocksAtPaladinLevel: 9`.
   Both are facts, and they are facts about DIFFERENT YEARS. Rendered in the
   present tense next to each other they produced a row reading

       Fireball   [🔒 Level 9]   [ALWAYS]

   where `ALWAYS` is the same gold chip the app uses on Divine Smite to mean
   "this is live, right now, no preparation needed". The pair says something
   neither half says alone, and it says it on the one screen whose entire job is
   answering "what can I do".

   THIS WAS NEVER ABOUT FIREBALL. Fireball is only where it was noticed. The
   fixture below holds SIX locked always-prepared spells — Beacon of Hope,
   Fireball, Fire Shield, Wall of Fire, Flame Strike, Hallow — spanning levels
   9, 13 and 17, and every one of them carried the contradiction. That is why
   the assertions here sweep the whole catalogue instead of naming a spell: a
   test that checked Fireball would have passed while five others stayed wrong,
   and would go vacuous the day canon re-homes that one entry.

   `group.ts:148` found this exact trap first and guarded the GROUPING against
   it — "a locked entry can also read as prepared, `alwaysPrepared` is a
   property of the spell, not of his level". The chips and the row badge were
   the rest of that same bug, left standing for the same reason bugs usually
   are: the guard was written where the author was looking.

   ── WHY THE CHECKED-IN FIXTURE ──────────────────────────────────────────────
   `detail.test.ts` and `EntryDetailPanel.test.tsx` both hang off a JSON export
   in `C:/Users/marcu/Downloads`, behind `describe.skipIf(!nix)`. That is fine
   for what they assert and wrong for a regression: the day that file is tidied
   away, those suites go green by vanishing. This one uses `turn/fixtures/nix`,
   which is in the repo, so it cannot skip. If it is ever green, it ran.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import { buildCatalogue } from './build'
import { entryDetail } from './detail'
import type { CatalogueEntry } from './types'
import type { Character } from '../character'

const CHAR = NIX as Character
const CATALOGUE = buildCatalogue(CHAR)

const tagsOf = (e: CatalogueEntry) => entryDetail(e, CHAR).tags
const locked = CATALOGUE.filter(e => e.lockedUntil !== null)
const lockedAlways = locked.filter(e => e.alwaysPrepared)
const openAlways = CATALOGUE.filter(e => e.lockedUntil === null && e.alwaysPrepared)

describe('the fixture actually exercises the bug', () => {
  /* Scaffolding, but load-bearing. Every assertion below is a `for` over a
     filtered list, and a `for` over an empty list is a test that passes by
     doing nothing. These two are the difference between "no locked spell lies"
     and "no locked spell exists". */
  it('holds locked always-prepared spells, at more than one lock level', () => {
    expect(lockedAlways.length).toBeGreaterThanOrEqual(2)
    expect(new Set(lockedAlways.map(e => e.lockedUntil)).size).toBeGreaterThan(1)
  })

  it('also holds unlocked always-prepared spells, so the fix can be shown to be narrow', () => {
    expect(openAlways.length).toBeGreaterThan(0)
  })
})

describe('a locked entry never claims the present tense', () => {
  /* THE ONE THAT MATTERS. */
  it('no locked entry carries a bare "Always prepared"', () => {
    for (const e of lockedAlways) {
      expect(tagsOf(e).map(t => t.label), e.name).not.toContain('Always prepared')
    }
  })

  it('no locked entry carries a bare "Prepared" either', () => {
    /* Belt and braces on a different mechanism: this one is held by
       `build.ts:252` forcing `prepared: false` under a lock, not by the tag
       code. Asserted here so that if that line is ever relaxed, the failure
       lands next to the reasoning that depends on it rather than three files
       away. */
    for (const e of locked) {
      expect(tagsOf(e).map(t => t.label), e.name).not.toContain('Prepared')
    }
  })

  it('says instead when it arrives, naming the same level as the lock chip', () => {
    for (const e of lockedAlways) {
      expect(tagsOf(e).map(t => t.label), e.name).toContain(`Always prepared at ${e.lockedUntil}`)
    }
  })

  it('and wears the lock colour, so nothing gold sits on a spell he cannot cast', () => {
    /* The tense fixes the SENTENCE; the tone fixes the GLANCE. `always` is the
       arcane chip — the palette the app spends on live abilities. A locked row
       that reads correctly but still flashes arcane has only moved the
       contradiction from the words into the colour. */
    for (const e of lockedAlways) {
      const tag = tagsOf(e).find(t => t.label.startsWith('Always prepared'))
      expect(tag?.tone, e.name).toBe('locked')
    }
  })

  it('leads with the lock chip regardless', () => {
    for (const e of locked) {
      expect(tagsOf(e)[0], e.name).toEqual({ label: `Level ${e.lockedUntil}`, tone: 'locked' })
    }
  })
})

describe('the unlocked case is untouched', () => {
  /* A fix that quietly re-tensed Divine Smite would be a worse bug than the one
     it replaced: six spells he genuinely casts without preparing would start
     hedging about it. */
  it('still says "Always prepared", flat, in the arcane tone', () => {
    for (const e of openAlways) {
      const labels = tagsOf(e).map(t => t.label)
      expect(labels, e.name).toContain('Always prepared')
      expect(labels.some(l => /Always prepared at/.test(l)), e.name).toBe(false)
      expect(tagsOf(e).find(t => t.label === 'Always prepared')?.tone, e.name).toBe('always')
    }
  })

  it('never doubles up "Always prepared" and "Prepared" on one entry', () => {
    /* The original `if/else` guaranteed this and the rewrite has to keep
       guaranteeing it — they are two answers to one question. */
    for (const e of CATALOGUE) {
      const labels = tagsOf(e).map(t => t.label)
      const claims = labels.filter(l => l === 'Prepared' || l.startsWith('Always prepared'))
      expect(claims.length, `${e.name}: ${claims.join(' + ')}`).toBeLessThanOrEqual(1)
    }
  })
})
