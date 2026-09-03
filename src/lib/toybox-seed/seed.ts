import type { Character } from '../character'
import type { ToyboxCombo, ToyboxData } from '../toybox'
import type { SeedPack } from './types'
import { buildProfile } from './profile'
import { resolveCombo, resolveTactic, resolvePersonaPlay } from './template'
import { HEARTH_7 } from './packs/hearth-7'

/* ==========================================================================
   TOYBOX SEED — choosing a pack, and applying it once

   THIS MODULE IS PURE, AND THAT IS A DESIGN REQUIREMENT RATHER THAN A STYLE
   PREFERENCE. It reads no storage, calls no clock, generates no ids, and does
   not mutate its input. `createdAt` arrives as an argument. Ids are authored
   into the pack. Both choices exist so the seeder can be tested by value —
   the alternative is stubbing `Date.now` and `crypto.randomUUID` in every test
   of a function whose whole job is to be predictable.

   SLICE 3 — HOW "ONCE" IS DECIDED, FINALLY. Slice 1 asked whether the Toybox
   was EMPTY, which is the same question again the moment you delete the last
   seeded entry — so a deletion undid itself on the next mount. That is gone.
   `data.seededPacks` now records that the delivery happened, and a delivery
   that happened stays happened no matter what became of its contents. Deleting
   a seeded combo is permanent, which is what deleting means.

   `force` is the one door back in, and it is not a way of asking the same
   question twice: it says "I know it was seeded, do it again anyway." Because
   the entries already present may still be there, the forced copies are given
   ids that cannot collide with them — see `readdressCombo`. The button that
   calls it is offered only when nothing from the pack survives, so in practice
   the collision path is a safety net rather than a road, and it is tested as
   one.
   ========================================================================== */

const PACKS: readonly SeedPack[] = [HEARTH_7]

const isPresent = <T,>(x: T | null): x is T => x !== null

/** The pack for this character, or null — and null is a normal answer.
 *
 *  Matching is exact on class and subclass and inclusive on the level bounds.
 *  There is no "close enough": a Paladin of a different oath gets nothing,
 *  because content written for the Hearth's cloak is wrong for an oath that
 *  has no cloak, and wrong content is worse than an empty tab. */
export function findPack(character: Character): SeedPack | null {
  return (
    PACKS.find(
      pack =>
        pack.gate.class === character.class
        && pack.gate.subclass === character.subclass
        && character.level >= pack.gate.minLevel
        && character.level <= pack.gate.maxLevel,
    ) ?? null
  )
}

/** Is anything from this pack still in the Toybox?
 *
 *  Asked by the UI, not by the seeder, and the distinction matters: the seeder
 *  decides on the MARKER, which survives deletion; the button decides on the
 *  CONTENTS, because "put them back" is only a sensible offer when they are
 *  gone. Matching is on the id prefix every seeded entry carries, so an entry
 *  Marcus renamed or rewrote still counts as present — he edited it, he did
 *  not lose it. */
export function packPresent(data: ToyboxData, packId: string): boolean {
  const prefix = `seed:${packId}:`
  return (
    data.combos.some(c => c.id.startsWith(prefix))
    || data.tactics.some(t => t.id.startsWith(prefix))
    || data.personaPlays.some(p => p.id.startsWith(prefix))
  )
}

/** An id that is not already taken, and the same id when it is free.
 *
 *  Deterministic rather than random because this module is pure — a `crypto`
 *  call here would make every test of it a test of a mock. */
function freshId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) return id
  let n = 2
  while (taken.has(`${id}~${n}`)) n += 1
  return `${id}~${n}`
}

/** A combo carries ids INSIDE it — one per block, used as React keys — so
 *  re-addressing the combo without re-addressing its blocks would produce two
 *  cards sharing block keys, which React renders as one card's steps leaking
 *  into the other's. The blocks are namespaced under the combo id by
 *  convention (`seed:pack:combo:1`), so moving the prefix moves them all;
 *  anything not following that convention is nested under the new id instead
 *  of being trusted to be unique on its own. */
function readdressCombo(combo: ToyboxCombo, taken: Set<string>): ToyboxCombo {
  const id = freshId(combo.id, taken)
  if (id === combo.id) return combo
  return {
    ...combo,
    id,
    blocks: combo.blocks.map(b => ({
      ...b,
      id: b.id.startsWith(combo.id) ? id + b.id.slice(combo.id.length) : `${id}:${b.id}`,
    })),
  }
}

export interface SeedResult {
  data: ToyboxData
  /** True only when `data` differs from what came in. The caller writes to
   *  storage on true and does not on false, so a mount that seeds nothing
   *  costs no write. */
  changed: boolean
  /** The pack that MATCHED, whether or not it was applied. The empty state
   *  needs this to know whether to offer its button at all. */
  packId: string | null
}

/** Copy the matching pack's entries into `data`, if it has not been done.
 *
 *  Seeded entries are APPENDED, never prepended and never merged, so anything
 *  Marcus wrote himself keeps its place at the top of the list. */
export function seedToybox(
  data: ToyboxData,
  character: Character,
  createdAt: number,
  opts?: { force?: boolean },
): SeedResult {
  const pack = findPack(character)
  if (!pack) return { data, changed: false, packId: null }

  const seededPacks = data.seededPacks ?? []
  const already = seededPacks.includes(pack.id)
  if (already && !opts?.force) return { data, changed: false, packId: pack.id }

  /* Every string in the pack is a template, and `buildProfile` is the only
     thing that knows what the numbers are. An entry whose text cannot be
     resolved — no melee weapon to name, no wizard to call out to — is DROPPED
     rather than rendered vague. See the header of `template.ts`. */
  const profile = buildProfile(character)

  /* Ids already spoken for. Built from the Toybox as it stands, and added to
     as each entry is placed, so two forced re-seeds in a row do not both land
     on `~2`. */
  const taken = new Set<string>([
    ...data.combos.map(c => c.id),
    ...data.tactics.map(t => t.id),
    ...data.personaPlays.map(p => p.id),
  ])
  const claim = <T extends { id: string }>(entry: T): T => {
    taken.add(entry.id)
    return entry
  }

  const combos = pack.combos
    .map(c => resolveCombo(c, profile, createdAt))
    .filter(isPresent)
    .map(c => claim(readdressCombo(c, taken)))
  const tactics = pack.tactics
    .map(t => resolveTactic(t, profile, createdAt))
    .filter(isPresent)
    .map(t => claim({ ...t, id: freshId(t.id, taken) }))
  const personaPlays = pack.personaPlays
    .map(p => resolvePersonaPlay(p, profile, createdAt))
    .filter(isPresent)
    .map(p => claim({ ...p, id: freshId(p.id, taken) }))

  // A pack every one of whose entries was dropped is not a seed. Reporting
  // `changed: true` here would write an unchanged Toybox to storage AND record
  // a marker saying content had been delivered that never was — after which
  // the marker would keep the real delivery from ever happening.
  //
  // SLICE 9 COVERED THIS, having carried it since slice 5 as unreachable. It is
  // unreachable only with the one pack that exists today — `hearth-7` always
  // delivers something, because "The Reaction Is Only One" spends no token and
  // survives every sheet. `seed-empty.test.ts` substitutes a pack whose every
  // entry names an absent party member and runs the real everything else;
  // deleting these three lines turns three of its six tests red, one of them
  // reporting `seededPacks: ['hearth-7']` on a Toybox that received nothing.
  if (combos.length === 0 && tactics.length === 0 && personaPlays.length === 0) {
    return { data, changed: false, packId: pack.id }
  }

  return {
    data: {
      ...data,
      combos: [...data.combos, ...combos],
      tactics: [...data.tactics, ...tactics],
      personaPlays: [...data.personaPlays, ...personaPlays],
      seededPacks: already ? seededPacks : [...seededPacks, pack.id],
    },
    changed: true,
    packId: pack.id,
  }
}
