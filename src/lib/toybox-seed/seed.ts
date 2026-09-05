import type { Character } from '../character'
import type { ToyboxCombo, ToyboxData } from '../toybox'
import type { SeedPack } from './types'
import { buildProfile } from './profile'
import { resolveCombo, resolveTactic, resolvePersonaPlay } from './template'
import { HEARTH_7 } from './packs/hearth-7'
import { HEARTH_7_R2 } from './packs/hearth-7-r2'

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

   ROUND TWO — ONE PACK BECAME MANY, AND `force` STOPPED BEING A BOOLEAN.

   The reason a second pack exists at all is this module's own memory. Round
   two's 24 entries could not be added to `hearth-7`, because `seededPacks`
   already contains `hearth-7` for the one character that matters and a marked
   pack is skipped forever. New content reaches an already-seeded Toybox only
   as a new pack id. So a character now collects EVERY pack whose gate it
   satisfies, each delivered once, each marked on its own.

   And `force` had to change shape with it. It used to mean "re-apply the pack",
   which was unambiguous when there was one. With two, a boolean cannot say
   which one is missing — and forcing both would append a `~2` duplicate of the
   one still on the screen, which reads as a rendering bug rather than as the
   double delivery it is. `force` is now the list of pack ids to re-apply, so
   the UI states which pack it means and the duplicate is unrepresentable
   rather than merely avoided by discipline.
   ========================================================================== */

/* ORDER IS CARD ORDER. Entries are appended pack by pack in this order, so
   round one's 31 keep the top of the list and round two lands beneath them —
   which is also the order a character seeded from scratch today would get. */
const PACKS: readonly SeedPack[] = [HEARTH_7, HEARTH_7_R2]

const isPresent = <T,>(x: T | null): x is T => x !== null

/** Every pack for this character, in `PACKS` order — and empty is a normal
 *  answer, meaning exactly what the old `findPack`'s `null` meant.
 *
 *  Matching is exact on class and subclass and inclusive on the level bounds.
 *  There is no "close enough": a Paladin of a different oath gets nothing,
 *  because content written for the Hearth's cloak is wrong for an oath that
 *  has no cloak, and wrong content is worse than an empty tab. */
export function findPacks(character: Character): SeedPack[] {
  return PACKS.filter(
    pack =>
      pack.gate.class === character.class
      && pack.gate.subclass === character.subclass
      && character.level >= pack.gate.minLevel
      && character.level <= pack.gate.maxLevel,
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
  /** True only when `data` differs from what came in — that is, when at least
   *  one pack contributed at least one entry. The caller writes to storage on
   *  true and does not on false, so a mount that seeds nothing costs no write. */
  changed: boolean
  /** Every pack that MATCHED, whether or not it was applied. Was `packId`
   *  singular; the meaning is unchanged, only the arity. */
  packIds: string[]
}

/** Copy every matching pack's entries into `data`, skipping the ones already
 *  delivered.
 *
 *  Seeded entries are APPENDED, never prepended and never merged, so anything
 *  Marcus wrote himself keeps its place at the top of the list — and packs are
 *  applied in `PACKS` order, so round two lands beneath round one rather than
 *  interleaved with it. */
export function seedToybox(
  data: ToyboxData,
  character: Character,
  createdAt: number,
  /** Pack ids to apply AGAIN despite their marker. See the header. */
  opts?: { force?: string[] },
): SeedResult {
  const packs = findPacks(character)
  if (packs.length === 0) return { data, changed: false, packIds: [] }

  const packIds = packs.map(p => p.id)
  const force = opts?.force ?? []

  /* Every string in a pack is a template, and `buildProfile` is the only thing
     that knows what the numbers are. An entry whose text cannot be resolved —
     no melee weapon to name, no wizard to call out to — or whose `needs` the
     character does not meet is DROPPED rather than rendered vague. See the
     header of `template.ts`. Built ONCE and shared by every pack: it is a pure
     function of the character, and rebuilding it per pack would be the same
     answer at a cost. */
  const profile = buildProfile(character)

  /* Ids already spoken for. Built from the Toybox as it stands, and added to as
     each entry is placed — so an id clash BETWEEN two packs is impossible by
     construction rather than by naming convention, and two forced re-seeds in a
     row do not both land on `~2`. */
  const taken = new Set<string>([
    ...data.combos.map(c => c.id),
    ...data.tactics.map(t => t.id),
    ...data.personaPlays.map(p => p.id),
  ])
  const claim = <T extends { id: string }>(entry: T): T => {
    taken.add(entry.id)
    return entry
  }

  /* Accumulated across packs, then written once. `seededPacks` grows only for
     packs that actually delivered something — see the guard in the loop. */
  let combos = data.combos
  let tactics = data.tactics
  let personaPlays = data.personaPlays
  const seededPacks = [...(data.seededPacks ?? [])]
  let changed = false

  for (const pack of packs) {
    const already = seededPacks.includes(pack.id)
    if (already && !force.includes(pack.id)) continue

    const fresh = {
      combos: pack.combos
        .map(c => resolveCombo(c, profile, createdAt))
        .filter(isPresent)
        .map(c => claim(readdressCombo(c, taken))),
      tactics: pack.tactics
        .map(t => resolveTactic(t, profile, createdAt))
        .filter(isPresent)
        .map(t => claim({ ...t, id: freshId(t.id, taken) })),
      personaPlays: pack.personaPlays
        .map(p => resolvePersonaPlay(p, profile, createdAt))
        .filter(isPresent)
        .map(p => claim({ ...p, id: freshId(p.id, taken) })),
    }

    // A pack every one of whose entries was dropped is not a seed. Marking it
    // would record a delivery that never happened, after which the marker would
    // keep the real delivery from ever happening.
    //
    // SLICE 9 COVERED THIS, having carried it since slice 5 as unreachable. It
    // is unreachable with the packs that exist today — `hearth-7` always
    // delivers something, because "The Reaction Is Only One" spends no token and
    // survives every sheet. `seed-empty.test.ts` substitutes a pack whose every
    // entry names an absent party member and runs the real everything else.
    //
    // ROUND TWO MADE THE `continue` LOAD-BEARING. With one pack this was a
    // return, and a return and a skip are the same thing when there is nothing
    // after you. There is now: an empty pack must not abort the packs behind it
    // in the list, and `seed-empty.test.ts` asserts the pack after an empty one
    // still seeds.
    if (
      fresh.combos.length === 0
      && fresh.tactics.length === 0
      && fresh.personaPlays.length === 0
    ) continue

    combos = [...combos, ...fresh.combos]
    tactics = [...tactics, ...fresh.tactics]
    personaPlays = [...personaPlays, ...fresh.personaPlays]
    if (!already) seededPacks.push(pack.id)
    changed = true
  }

  if (!changed) return { data, changed: false, packIds }

  return {
    data: { ...data, combos, tactics, personaPlays, seededPacks },
    changed: true,
    packIds,
  }
}
