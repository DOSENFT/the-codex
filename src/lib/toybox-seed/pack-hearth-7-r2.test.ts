/* ============================================================================
   ROUND TWO'S CONTENT — the rules the round exists to enforce.

   `pack-hearth-7.test.ts` is round one's equivalent and is deliberately left
   alone; this is a second file rather than a second `describe` in that one,
   because the two packs are now judged by DIFFERENT rules. Round one is a
   shareable starter pack written for a KIND of character. Round two is written
   for Marcus, may name his backstory, and must obey a line round one never had.

   THE LINE, from Gate 1 and quoted here because it is the reason this file
   exists at all:

     A COMBO IS ONE TURN. It has numbered action-economy steps and a Deploy
     button because it is a thing you press while the table waits for you. If
     it does not fit in one Action + one Bonus Action + one Reaction + your
     movement, IT IS NOT A COMBO.

   Round one drifted across that line — "cast a spell, then attack twice" is
   not a combo, it is the rules — and the drift is invisible from the glass,
   because `ComboCard` will happily paint four ACTION pills in a row and look
   handsome doing it. A person reading the card at the table finds out it is
   impossible only when they try to run it.

   SLICE 2 IS THE FIRST SLICE WHERE THE RULE CAN ACTUALLY BE BROKEN. Slice 1
   shipped one combo with one Action; you cannot violate an action-economy rule
   with a single entry that does not push against it. Four entries is where a
   sequence starts wanting a second Bonus Action, so the test lands with them
   rather than earlier, where it would have been a test that could not fail.

   THE OTHER HALF, `not-one-turn` for tactics, lands in slice 5 with the eight
   tactics — same reason, and it is named in `04-slices.md` so it cannot be
   quietly skipped.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { resolveCharacter } from '../rules-2024/derive'
import { buildProfile } from './profile'
import { resolveCombo, resolveTactic, resolvePersonaPlay } from './template'
import { HEARTH_7_R2 } from './packs/hearth-7-r2'

const AT = 1_700_000_000_000

const PARTY = [
  { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet, inquisitive.', status: 'alive' as const },
  { name: 'Ponzi', relation: 'Party member (Rogue) — observant, reserved.', status: 'alive' as const },
  { name: 'Ketza', relation: 'Party member (Ranger) — young wood elf.', status: 'alive' as const },
  { name: 'Talon', relation: 'Party member (Bard) — rock gnome tinker.', status: 'alive' as const },
]

const feat = (name: string) => ({ name, description: '', isHomebrew: false, effects: [] })

/** THE DAWN GUARDIAN, transcribed from `codex-nix-lvl7 (2) (1).json`. The
 *  properties are the load-bearing part: round two gates three entries on
 *  `Reach` and `Graze`, and `Graze` is a real string on his real sheet rather
 *  than something this test invented to make its own assertions pass. */
const DAWN_GUARDIAN = {
  ...NIX.weapons[0],
  name: 'The Dawn Guardian',
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach', 'Graze'],
  range: '10 ft',
  magical: true,
}

const sheet = (over: {
  level: number
  CHA: number
  feats: string[]
  weapon: typeof DAWN_GUARDIAN | null
}): Character =>
  resolveCharacter({
    ...NIX,
    level: over.level,
    abilityScores: { ...NIX.abilityScores, STR: 18, CHA: over.CHA },
    feats: over.feats.map(feat),
    weapons: over.weapon ? [over.weapon] : [],
    backstory: {
      origin: '', keyMemories: [], unresolvedThreads: [], personalitySeeds: [],
      relationships: PARTY,
    },
  })

/** Marcus, as the sheet actually reads. */
const MARCUS = sheet({ level: 7, CHA: 16, feats: ['Sentinel', 'Lucky'], weapon: DAWN_GUARDIAN })

/** A different Paladin of the same oath: no feats, and a plain sword. Every
 *  gated entry must be absent for him, and every ungated one present. */
const PLAIN = sheet({
  level: 8, CHA: 18, feats: [],
  weapon: { ...DAWN_GUARDIAN, name: 'Hearthbrand', damageDice: '1d8', properties: ['Versatile (1d10)'], range: '5 ft' },
})

function resolvePack(character: Character) {
  const p = buildProfile(character)
  return {
    combos: HEARTH_7_R2.combos.map(c => resolveCombo(c, p, AT)),
    tactics: HEARTH_7_R2.tactics.map(t => resolveTactic(t, p, AT)),
    personaPlays: HEARTH_7_R2.personaPlays.map(x => resolvePersonaPlay(x, p, AT)),
  }
}

/** Every string anywhere inside a value, at any depth. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

/* ---------------------------------------------------------------------------
   THE RULE OF THE ROUND
   ------------------------------------------------------------------------- */

describe('a combo is ONE TURN', () => {
  const pack = resolvePack(MARCUS)

  it('spends at most one Action, one Bonus Action and one Reaction', () => {
    /* MOVEMENT and FREE are deliberately uncapped, and that is not laziness.
       A turn genuinely contains one Action, one Bonus Action and one Reaction,
       but movement is a pool you can split around them and speaking is free as
       often as you like — so capping those two would forbid correct turns.
       The three that are capped are capped at the number the rules give. */
    for (const combo of pack.combos) {
      const count = (t: string) => combo!.blocks.filter(b => b.type === t).length
      expect(count('action'), `${combo!.id} spends the Action twice`).toBeLessThanOrEqual(1)
      expect(count('bonus'), `${combo!.id} spends the Bonus Action twice`).toBeLessThanOrEqual(1)
      expect(count('reaction'), `${combo!.id} spends the Reaction twice`).toBeLessThanOrEqual(1)
    }
  })

  it('actually spends something — a combo with no typed block is a tactic', () => {
    /* The other half of the line. An entry made entirely of FREE and MOVEMENT
       is a standing decision wearing a Deploy button, which is precisely the
       confusion Marcus asked to have cleared up. */
    for (const combo of pack.combos) {
      const spends = combo!.blocks.some(b => ['action', 'bonus', 'reaction'].includes(b.type))
      expect(spends, `${combo!.id} spends no Action, Bonus Action or Reaction`).toBe(true)
    }
  })

  it('has at least two blocks, because one step is not a combination', () => {
    for (const combo of pack.combos) {
      expect(combo!.blocks.length, `${combo!.id} is a single step`).toBeGreaterThanOrEqual(2)
    }
  })

  it('numbers its block ids in the order they are performed', () => {
    /* The ids are `<entry>:1`, `:2`, `:3`. Nothing reads them as an ordering —
       the array is the ordering — but a mismatch between the two is how a
       later edit reorders the steps of a turn without anybody noticing. */
    for (const combo of pack.combos) {
      combo!.blocks.forEach((b, i) => {
        expect(b.id, `${combo!.id} block ${i}`).toBe(`${combo!.id}:${i + 1}`)
      })
    }
  })
})

/* ---------------------------------------------------------------------------
   THE STRUCTURAL FLOOR — round one's, restated for this pack
   ------------------------------------------------------------------------- */

describe('the pack resolves for the character it was written for', () => {
  const pack = resolvePack(MARCUS)

  it('drops nothing — every authored entry reaches his Toybox', () => {
    expect(pack.combos, 'a combo was dropped').not.toContain(null)
    expect(pack.tactics, 'a tactic was dropped').not.toContain(null)
    expect(pack.personaPlays, 'a persona play was dropped').not.toContain(null)
    /* Raised deliberately, one slice at a time, exactly as round one did it.
       Slice 1 set this at 1. Slice 2 is 5. Slice 3 takes it to 9 and ships the
       first tactic with them; slice 4 takes the combos to 10, slice 5 fills the
       remaining seven tactics and slice 6 the persona plays. */
    expect(pack.combos).toHaveLength(10)
    expect(pack.tactics).toHaveLength(8)
    expect(pack.personaPlays).toHaveLength(6)
  })

  it('never paints a brace', () => {
    for (const text of strings(pack)) {
      expect(text, `braces survived into: ${text}`).not.toContain('{{')
      expect(text).not.toContain('}}')
    }
  })

  it('gives every entry a namespaced id, and no id twice', () => {
    const ids = [
      ...pack.combos.map(c => c!.id),
      ...pack.combos.flatMap(c => c!.blocks.map(b => b.id)),
    ]
    for (const id of ids) expect(id, id).toMatch(/^seed:hearth-7-r2:/)
    expect(new Set(ids).size, 'an id is used twice').toBe(ids.length)
  })

  it('does not collide with a single id from round one', () => {
    /* Both packs land in the same three arrays on the same phone. `seed.ts`
       re-addresses a collision rather than dropping it, so a clash would show
       up as a card with a `~2` in its id and nobody would ever see it — which
       is why it is asserted here, at the source, instead of trusted downstream. */
    for (const c of HEARTH_7_R2.combos) {
      expect(c.id.startsWith('seed:hearth-7:'), c.id).toBe(false)
    }
  })

  it('gives every combo at least one requirement', () => {
    for (const combo of pack.combos) {
      expect(combo!.requirements ?? [], `${combo!.id} states no requirement`)
        .not.toHaveLength(0)
    }
  })

  it('files every combo under a category the tab can filter', () => {
    const CATEGORIES = ['burst', 'sustained', 'defensive', 'utility', 'aoe']
    for (const combo of pack.combos) expect(CATEGORIES, combo!.id).toContain(combo!.category)
  })

  it('keeps party names out of every load-bearing field', () => {
    /* The constraint round one proved on the glass, restated because round two
       leans harder on party call-outs. A party name in a block label costs the
       whole card for anybody playing alone; in an annotation it costs one line. */
    const loadBearing = pack.combos.flatMap(c => [
      c!.name, c!.description ?? '',
      ...c!.blocks.flatMap(b => [b.label, b.sourceName ?? '', b.notes ?? '']),
      ...(c!.requirements ?? []),
    ]).join('\n')
    for (const name of PARTY.map(p => p.name)) {
      expect(loadBearing, `${name} is named in a field that must survive an empty party`)
        .not.toContain(name)
    }
  })
})

/* ---------------------------------------------------------------------------
   `needs` AS CONTENT, NOT AS MACHINERY

   `template.test.ts` proves `meetsNeeds` works. This proves the RIGHT ENTRIES
   are gated — which is a content claim and would survive a perfect
   implementation gating the wrong four cards.
   ------------------------------------------------------------------------- */

describe('the gated entries are absent for a Paladin who cannot run them', () => {
  /* `.filter(Boolean)` ON BOTH SIDES, and on Marcus's side it is not
     defensive noise. It used to be `.map(c => c!.id)` for him, because nothing
     is supposed to be dropped for him — and the day something was, the `!`
     threw inside the `describe` body and vitest reported "Failed Suites: no
     tests", which names no card and points at no assertion. `drops nothing —
     every authored entry reaches his Toybox` is the test that is supposed to
     catch that, and it could not run. Found by `probe-slice3.mjs`. */
  const mine = resolvePack(MARCUS).combos.filter(Boolean).map(c => c!.id)
  const theirs = resolvePack(PLAIN).combos.filter(Boolean).map(c => c!.id)

  it('drops The Sentinel Gate and The Second Swing for no feats and a plain sword', () => {
    expect(mine).toContain('seed:hearth-7-r2:the-sentinel-gate')
    expect(mine).toContain('seed:hearth-7-r2:the-second-swing')
    expect(theirs).not.toContain('seed:hearth-7-r2:the-sentinel-gate')
    expect(theirs).not.toContain('seed:hearth-7-r2:the-second-swing')
  })

  it('drops Drop the Glaive for a one-handed Paladin, who has a free hand already', () => {
    /* The clearest `needs` in the pack, and the one most likely to be argued
       away later. The card's premise is giving up a two-handed weapon to free a
       hand; a paladin holding a versatile sword can already grapple without
       dropping anything, so for them the whole turn is nonsense rather than
       merely suboptimal. `PLAIN` carries `Versatile (1d10)` and no `Two-Handed`. */
    expect(mine).toContain('seed:hearth-7-r2:drop-the-glaive')
    expect(theirs).not.toContain('seed:hearth-7-r2:drop-the-glaive')
  })

  it('keeps the seven that need nothing but the class itself', () => {
    /* Aid, Paladin's Smite and Channel Divinity are things every Paladin this
       pack reaches simply HAS. Gating them would be the opposite failure:
       content withheld from the people it was written for. Slice 3 added three
       more of the same kind — the two equipment turns and the shield turn need
       gear, and gear is `requirements`, never `needs`.

       SLICE 4 ADDED THE SEVENTH, and it is the one that had a real argument for
       a gate. The Caster Killer leans on Graze in an annotation and on reach in
       its notes, and neither is a fact about the class. Both were left ungated
       on purpose: annotations are not load-bearing, and the card's actual
       requirement — hit something in melee, then spend a Bonus Action — is
       something every Paladin in this window can do. What it DOES require is a
       weapon, and that is enforced the honest way: `{{weapon}}` is load-bearing
       in the Action block, so a weaponless Paladin loses the card to token
       resolution rather than to a gate somebody guessed at. */
    expect(theirs).toEqual([
      'seed:hearth-7-r2:three-people-stand-up',
      'seed:hearth-7-r2:the-free-crit',
      'seed:hearth-7-r2:through-the-door',
      'seed:hearth-7-r2:bearings-and-the-backward-walk',
      'seed:hearth-7-r2:one-silver-piece-of-fire',
      'seed:hearth-7-r2:the-shield-round',
      'seed:hearth-7-r2:the-caster-killer',
    ])
  })

  it('gates only on permanent facts — never on gear, spells or preparation', () => {
    /* The `types.ts` ruling, enforced. `needs` drops a card FOREVER for a
       character; anything he could fix by shopping or by preparing differently
       belongs in `requirements`, where it is advice he can act on, not a
       silent deletion. Slice 3 ships four combos requiring gear he does not
       own, and this is the assertion that stops them being gated away. */
    for (const c of HEARTH_7_R2.combos) {
      const keys = Object.keys(c.needs ?? {})
      for (const k of keys) expect(['feats', 'weaponProperties'], c.id).toContain(k)
    }
  })
})

/* ---------------------------------------------------------------------------
   NUMBERS
   ------------------------------------------------------------------------- */

describe('his numbers are resolved, not typed', () => {
  it('says nothing that is true only of Marcus when resolved for someone else', () => {
    /* Round one's sharpest test, carried over. The same pack resolved for a
       Charisma 18 Paladin 8 must not contain the Charisma 16 level 7 numbers
       anywhere — if it does, somebody wrote a figure down instead of spending
       a token, and the card will be quietly wrong on every other sheet. */
    const other = strings(resolvePack(PLAIN)).join('\n')
    expect(other).not.toContain('10 temporary hit points')
    expect(other).not.toContain('level 7')
    expect(other).not.toContain('1d10 + 4')
  })

  it('spends a token for the level, which is the only figure that moves in 5–8', () => {
    /* Two Channel Divinity uses is stated as a flat "two" in Through the Door
       and that is CORRECT rather than sloppy: `paladin_1.txt:112` gives the
       third use at level 11, and this pack's gate stops at 8. The level itself
       does move inside the window, so it is tokenised — and this asserts the
       token actually resolved rather than being quietly absent. */
    const mine = strings(resolvePack(MARCUS)).join('\n')
    expect(mine).toContain('At level 7 you have two Channel Divinity')
    const other = strings(resolvePack(PLAIN)).join('\n')
    expect(other).toContain('At level 8 you have two Channel Divinity')
  })
})

/* ---------------------------------------------------------------------------
   SLICE 3 — THE GEAR HE DOES NOT OWN

   Slice 3 is the first slice whose content depends on things absent from his
   sheet: his `supplies` array is empty, and four of the nine combos now assume
   ball bearings, a flask of oil, or a shield. That is allowed — `needs` is for
   permanent facts and gear is not one — but it creates a failure mode that no
   earlier slice could have: cards that quietly require shopping, with nothing
   anywhere telling him to shop. His own guardrails name that as "half-built
   features running as if done", which is why these assertions exist.
   ------------------------------------------------------------------------- */

/** The gear slice 3 introduced, and the card that must sell it to him.
 *
 *  PATTERNS RATHER THAN STRINGS, because a combo asks for "a flask of oil" and
 *  the shopping list sells "five flasks of oil" — the same object, named the way
 *  each sentence needs it. Matching the literal singular would have forced one
 *  of the two cards to read badly to keep a test green, which is the tail
 *  wagging the dog. The claim being made is unchanged: this gear is named on
 *  the combo that needs it AND on the card that tells him to buy it. */
const GEAR: Array<[string, RegExp]> = [
  ['ball bearings', /ball bearings/i],
  ['a flask of oil', /flasks? of oil/i],
  ['a shield', /shield/i],
]

describe('the gear is asked for on the card, not assumed', () => {
  const pack = resolvePack(MARCUS)

  it('states the gear in `requirements`, where he can read it before he presses Deploy', () => {
    /* `requirements` is the field the card prints as its "you need" list. A
       combo that mentions ball bearings only in a step note is a card that
       looks runnable and is not. Matched case-insensitively against the
       requirement lines alone — deliberately NOT against the whole card, which
       would go green on any passing mention. */
    const asks = (id: string, gear: string) => {
      const [, pattern] = GEAR.find(([label]) => label === gear)!
      const combo = pack.combos.find(c => c?.id === `seed:hearth-7-r2:${id}`)
      expect(combo, `${id} is missing from the pack`).toBeTruthy()
      const reqs = (combo!.requirements ?? []).join('\n')
      expect(reqs, `${id} never states it needs ${gear}`).toMatch(pattern)
    }
    asks('bearings-and-the-backward-walk', 'ball bearings')
    asks('one-silver-piece-of-fire', 'a flask of oil')
    asks('the-shield-round', 'a shield')
  })

  it('ships a card that tells him to buy every one of them', () => {
    /* THE REASON THE SHOPPING LIST SHIPPED IN SLICE 3 rather than slice 5 with
       its seven siblings. Three combos requiring gear he does not own, with no
       card naming the shop, is the failure his guardrails name — so the tactic
       is not scheduling, it is the other half of these combos, and this is the
       assertion that keeps them together if anybody ever reorders the slices. */
    const list = pack.tactics.find(t => t?.id === 'seed:hearth-7-r2:the-shopping-list')
    expect(list, 'the shopping list is not in the pack').toBeTruthy()
    const text = strings(list).join('\n')
    for (const [gear, pattern] of GEAR) {
      expect(text, `the shopping list never mentions ${gear}`).toMatch(pattern)
    }
  })

  it('never gates a combo on the gear, only on what he permanently is', () => {
    /* The companion to the assertion above and the reason it is safe to write
       cards about gear at all. `needs` deletes a card forever; if the bearings
       were a `need`, the shopping list would be advice about cards he could
       not see until after he had taken it. */
    const gated = HEARTH_7_R2.combos.filter(c => c.needs)
    const text = gated.flatMap(c => Object.values(c.needs!).flat()).join('\n')
    for (const [gear, pattern] of GEAR) {
      expect(text, `${gear} is a gate`).not.toMatch(pattern)
    }
  })
})

describe('the corrections slice 3 made are held down', () => {
  const all = strings(resolvePack(MARCUS)).join('\n')

  it('prints the denial on the card, where Marcus reads it', () => {
    /* GATE 1 GOT THIS WRONG and the wrong version is the intuitive one, so it
       will be re-invented — by the next person to touch the card, or by Marcus
       at the table — unless the card itself says otherwise. `01-product.md`
       row 3 said the spell "drags the boss across" the bearings. It moves the
       creature nowhere: it imposes Disadvantage on attacks against anyone but
       you, and forbids it willingly moving MORE than 30 feet away.

       ASSERTED AS A POSITIVE, deliberately. The first draft of this test only
       forbade the word "drag" in sentences naming the spell, and that is a
       guard against one spelling of the mistake rather than against the
       mistake: a rewrite that dropped the correction entirely would have gone
       green while the card silently stopped teaching him the thing slice 3
       existed to teach. What must survive is the denial. */
    const combo = resolvePack(MARCUS).combos
      .find(c => c?.id === 'seed:hearth-7-r2:bearings-and-the-backward-walk')
    expect(combo, 'the Compelled Duel card is gone').toBeTruthy()
    const text = strings(combo).join('\n')
    expect(text, 'the card no longer denies that the spell drags')
      .toMatch(/does NOT drag/)
    expect(text, 'and it must still say what the spell does instead')
      .toMatch(/Disadvantage/)
  })

  it('never states the drag as a fact, in any card, in any spelling', () => {
    /* The negative half, kept because the two catch different edits. This one
       catches a NEW positive claim; the one above catches the denial being
       deleted. Scoped to sentences naming the spell so that "It does NOT drag
       it toward you" — the correction itself — is not the thing it trips on. */
    const sentences = all.split(/(?<=[.!?])\s+/)
    const duel = sentences.filter(s => /compelled duel/i.test(s))
    expect(duel.length, 'no card mentions Compelled Duel at all').toBeGreaterThan(0)
    for (const s of duel) {
      expect(s, `claims Compelled Duel moves the target: ${s}`)
        .not.toMatch(/\b(drags?|dragging|pulls?|yanks?|hauls?)\b/i)
    }
  })

  it('tells him Prone at reach is a penalty, contradicting his own two files', () => {
    /* `HEARTH-ERRATA.md:85` and `WARFARE-DOCTRINE.md:105` both tell him a prone
       target means Advantage. The 2024 condition gives Advantage only within 5
       FEET and Disadvantage beyond it, which for a 10 ft glaive is backwards —
       and knocking things prone is exactly what the ball bearings do. The card
       must say so, and must say WHICH of his files is wrong, or he will trust
       the file over the card. */
    expect(all).toMatch(/within 5 FEET/)
    expect(all).toContain('HEARTH-ERRATA.md')
    expect(all).toContain('WARFARE-DOCTRINE.md')
  })

  it('carries a warning wherever it states a number no file of his contains', () => {
    /* Round one's sourcing rule, extended to slice 3's new unsourced surface.
       Not one document Marcus supplied contains an equipment table, so every
       price, every square and every save DC for gear is read from general
       knowledge — and every entry that states one says so on itself, rather
       than in a comment only a developer will ever read. */
    const entries = [...pack3Combos(), ...pack3Tactics()]
    for (const e of entries) {
      const body = strings({ ...e, annotations: [] }).join('\n')
      if (!GEAR.some(([, p]) => p.test(body)) && !/caltrop/i.test(body)) continue
      const warned = (e.annotations ?? []).some(a => a.kind === 'warning')
      expect(warned, `${e.id} states unsourced equipment with no warning`).toBe(true)
    }
  })

  function pack3Combos() {
    return resolvePack(MARCUS).combos.map(c => c!)
  }
  function pack3Tactics() {
    return resolvePack(MARCUS).tactics.map(t => t!)
  }
})

describe('a tactic is NOT a combo, which is the distinction he asked for', () => {
  const pack = resolvePack(MARCUS)

  it('answers WHEN with a trigger, and ranks itself', () => {
    /* The two fields a combo does not have. A tactic with an empty trigger is a
       standing rule with no moment attached, which is the shape Marcus said he
       could not tell apart from a combo. */
    for (const t of pack.tactics) {
      expect(t!.trigger.trim(), `${t!.id} has no trigger`).not.toBe('')
      expect(['critical', 'high', 'normal'], t!.id).toContain(t!.priority)
    }
  })

  it('is a list of decisions, not a sequence of one turn’s steps', () => {
    /* A tactic's `actions` are untyped on purpose — no ACTION/BONUS pills, no
       Deploy. Two or more of them, because a one-item list is a sentence and
       belongs on a combo's card instead. */
    for (const t of pack.tactics) {
      expect(t!.actions.length, `${t!.id} is a single line`).toBeGreaterThanOrEqual(2)
      for (const a of t!.actions) expect(a.trim(), t!.id).not.toBe('')
    }
  })

  it('keeps party names out of a tactic’s load-bearing fields too', () => {
    /* `actions` kills the whole tactic if a token in it cannot resolve, exactly
       as a block label does for a combo. The combo version of this assertion
       has existed since slice 2; the tactic version could not exist until there
       was a tactic. */
    const loadBearing = pack.tactics.flatMap(t => [
      t!.name, t!.trigger, ...t!.actions, ...(t!.requirements ?? []),
    ]).join('\n')
    for (const name of PARTY.map(p => p.name)) {
      expect(loadBearing, `${name} is named in a field that must survive an empty party`)
        .not.toContain(name)
    }
  })

  /* -------------------------------------------------------------------------
     SLICE 5 — THE NOT-ONE-TURN TEST

     Named in `04-slices.md` so it could not be quietly skipped, and it is the
     other half of `a combo is ONE TURN`. Those two tests together ARE the
     ruling Marcus asked for: a combo is a turn, a tactic is everything that is
     not one. Until this slice there was a single tactic in the pack and the
     test would have been a claim about one card; at eight it is a claim about
     the shape of the tab.

     WHAT IT ACTUALLY GUARDS. The failure mode is not someone writing the word
     "Action" — several of these cards must say it, because the whole point of
     "Your Doctrine's Best Trick Does Not Work" is which action a thing costs.
     The failure is a tactic whose `actions` are a NUMBERED SEQUENCE of one
     turn's steps, which is a combo that lost its pills and its Deploy button
     on the way to the wrong tab. That is what is asserted: no step numbering,
     and no step that opens by spending a slice of the action economy.
     ----------------------------------------------------------------------- */

  it('never numbers its steps, because a numbered sequence is a turn', () => {
    /* `1.`, `2)`, `Step 3`, `First,` — the four ways a sequence announces
       itself. A tactic's list is unordered advice; the moment it is numbered
       the reader is being told to perform it in order within one turn, which is
       the confusion this whole round exists to end. */
    const SEQUENCE = new RegExp(
      '^\\s*(?:'
      + 'step\\s*\\d'                                              // Step 3: …
      + '|\\d+\\s*[.):]'                                           // 1. …  2) …
      + '|(?:first|second|third|fourth|fifth|one|two|three|four|five)\\s*[,:]'
      + '|(?:then|next|finally|lastly)\\s*[,:]'
      + ')', 'i',
    )
    for (const t of pack.tactics) {
      t!.actions.forEach((a, i) => {
        expect(a, `${t!.id} action ${i + 1} is written as a numbered step: ${a}`)
          .not.toMatch(SEQUENCE)
      })
    }
    /* And the guard can see what it is guarding against. A pattern that matches
       nothing is a test that cannot fail, so every shape it claims to catch is
       checked against a specimen rather than against hope. Word-numbering is in
       there because "Ask Your DM These Five Questions" is the card most likely
       to acquire "One:", "Two:", "Three:" — and a numbered list of questions is
       still a numbered list. The card enumerates by being a list. */
    for (const specimen of [
      '1. Swing', '2) Move', 'Step 3: cast', 'First, attack', 'Two: then move',
      'Finally, disengage',
    ]) {
      expect(specimen, `the sequence guard cannot recognise: ${specimen}`)
        .toMatch(SEQUENCE)
    }
  })

  it('never opens a step by spending the action economy', () => {
    /* The subtler shape of the same mistake: unnumbered prose that is still a
       turn, because every line begins by spending something. "Action: cast
       Bless." "Bonus Action: Smite." A tactic may discuss the action economy at
       length — card 2 is entirely about it — but a step that OPENS by spending
       a slice of a turn is a block, and blocks belong on a combo. */
    const SPENDS = /^\s*(?:action|bonus(?: action)?|reaction|movement|free)\s*[:—-]/i
    for (const t of pack.tactics) {
      for (const a of t!.actions) {
        expect(a, `${t!.id} has a step that is really a combo block: ${a}`)
          .not.toMatch(SPENDS)
      }
    }
    expect('Bonus Action: Divine Smite.', 'the block guard cannot recognise a block')
      .toMatch(SPENDS)
  })

  it('gives every tactic a requirement and a category the tab can filter', () => {
    /* The tactic half of two assertions the combos have had since slice 1. The
       category list is `ToyboxTactic`'s own and differs from the combos' — it
       has `control` and `core`, and no `aoe` — which is exactly the kind of
       thing that gets copied wrong from the file above it. */
    const CATEGORIES = ['core', 'survival', 'burst', 'control', 'support']
    for (const t of pack.tactics) {
      expect(t!.requirements ?? [], `${t!.id} states no requirement`).not.toHaveLength(0)
      expect(CATEGORIES, t!.id).toContain(t!.category)
      expect(t!.tags.length, `${t!.id} carries no tags`).toBeGreaterThan(0)
    }
  })

  it('gates the two tactics that are wrong for a different paladin', () => {
    /* THE REASON A TACTIC NEEDS `needs` AT ALL, which was not obvious until
       this slice. Six of the eight are true of any Paladin of the Hearth in
       the window. Two are not: "You Are a Glaive" is an argument for a
       Two-Handed weapon and "Sentinel Is a Prison" is an argument about a feat,
       and each of them reads as perfectly true to somebody who has neither.
       `PLAIN` carries a versatile sword and no feats, so both must be absent —
       and the six must still be there, or the gate is a delete. */
    const mine = resolvePack(MARCUS).tactics.filter(Boolean).map(t => t!.id)
    const theirs = resolvePack(PLAIN).tactics.filter(Boolean).map(t => t!.id)

    expect(mine).toContain('seed:hearth-7-r2:glaive-not-sword-and-board')
    expect(mine).toContain('seed:hearth-7-r2:sentinel-is-a-prison')
    expect(theirs).not.toContain('seed:hearth-7-r2:glaive-not-sword-and-board')
    expect(theirs).not.toContain('seed:hearth-7-r2:sentinel-is-a-prison')
    expect(theirs, 'the six that need nothing but the class itself').toEqual([
      'seed:hearth-7-r2:four-prepared-spells',
      'seed:hearth-7-r2:the-doctrine-trick',
      'seed:hearth-7-r2:the-shopping-list',
      'seed:hearth-7-r2:no-save-proficiencies',
      'seed:hearth-7-r2:ask-your-dm',
      'seed:hearth-7-r2:plate-and-the-face',
    ])
  })
})

/* ---------------------------------------------------------------------------
   SLICE 5 — THE THREE TACTICS THAT CONTRADICT ONE OF HIS OWN FILES

   Three of the seven exist only because something Marcus supplied is wrong: a
   line in `WARFARE-DOCTRINE.md`, an empty array on his character sheet, and a
   feature nobody can define. Each of those is a claim that becomes dangerous
   the moment its attribution is edited out, so each gets an assertion that the
   attribution is still there.
   ------------------------------------------------------------------------- */

describe('a card that overrules one of his own documents says which one', () => {
  const pack = resolvePack(MARCUS)
  const find = (id: string) => pack.tactics.find(t => t?.id === `seed:hearth-7-r2:${id}`)

  it('names WARFARE-DOCTRINE.md when it tells him his doctrine is wrong', () => {
    /* Without the filename this card is the app asserting that a thing he
       wrote down is false, with no way for him to go and check. With it, it is
       one document against another and he can settle it in a minute. The same
       standard "The Caster Killer" is held to. */
    const trick = find('the-doctrine-trick')
    expect(trick, 'the doctrine card was dropped').toBeTruthy()
    const text = strings(trick).join('\n')
    expect(text, 'the card no longer says where the bad line came from')
      .toMatch(/WARFARE-DOCTRINE\.md/)
    expect(text, 'and no longer says which file overrules it')
      .toMatch(/CORRECTIONS\.md/)
    /* THE ACTUAL REASON THE TRICK FAILS, which is the surprise and the whole
       value of the card. It is NOT the one-slot-per-turn rule — that rule
       permits the turn — it is Divine Smite's casting time. A rewrite that
       "simplifies" this into "you can only spend one slot" would be confidently
       wrong and would read as more authoritative, not less. */
    expect(text, 'the card has lost the casting-time argument').toMatch(/casting time/i)
    expect(text, 'the card no longer explains that the slot rule ALLOWS it')
      .toMatch(/expend only one spell slot/i)
  })

  it('names the class table and the empty field on the saving-throw card', () => {
    /* A CRITICAL card that tells him to edit his own sheet. It must say where
       the claim comes from — the class table — and it must not have quietly
       turned into generic advice about saves. */
    const saves = find('no-save-proficiencies')
    expect(saves, 'the saving-throw card was dropped').toBeTruthy()
    const text = strings(saves).join('\n')
    expect(text, 'the source file is no longer named').toMatch(/paladin_1\.txt/)
    expect(text, 'the two saves are no longer named').toMatch(/Wisdom and Charisma/i)
    expect(text, 'it no longer says the field is empty').toMatch(/savingThrowProficiencies/)
  })

  it('asks about Radiant Swing rather than answering it', () => {
    /* HE SAID "I'M NOT SURE" AND THAT ANSWER IS LOAD-BEARING. The failure mode
       here is a later edit that helpfully invents a ruling — at which point the
       app is teaching him a feature that may not exist. The card must contain
       question marks and must not contain an instruction to use it. */
    const ask = find('ask-your-dm')
    expect(ask, 'the questions card was dropped').toBeTruthy()
    expect(ask!.actions.filter(a => a.includes('?')).length,
      'the card has stopped asking questions').toBeGreaterThanOrEqual(5)
    const text = strings(ask).join('\n')
    expect(text, 'the fragments off his sheet are gone').toMatch(/Skip 1 attack/)
    expect(text, 'the fragments off his sheet are gone').toMatch(/Miss = half damage/)
    /* And no combo may be built on it — the Gate 1 ruling, asserted where it
       can actually be broken. */
    const combos = strings(pack.combos).join('\n')
    expect(combos, 'a combo was built on a feature nobody can define')
      .not.toMatch(/radiant swing/i)
  })
})

/* ---------------------------------------------------------------------------
   SLICE 4 — THE CASTER KILLER, AND THE SLATE CLOSED

   The tenth combo is the worst-sourced card in the pack and the one whose whole
   value is a single counter-intuitive number. Both of those are failure modes
   with a shape, so both get an assertion.
   ------------------------------------------------------------------------- */

describe('the last combo keeps the fact that makes it worth having', () => {
  const killer = resolvePack(MARCUS).combos
    .find(c => c?.id === 'seed:hearth-7-r2:the-caster-killer')
  const text = strings(killer).join('\n')

  it('is on his sheet at all', () => {
    /* It names {{weapon}} and {{weaponReach}} in load-bearing fields on purpose,
       which means a resolution failure would silently drop the whole card and
       every assertion below it would pass against `undefined`. This one runs
       first so the rest cannot be vacuous. */
    expect(killer, 'The Caster Killer was dropped for the character it was written for')
      .toBeTruthy()
  })

  it('says the Concentration save is a flat 10, not his own spell save DC', () => {
    /* THE CARD IS WORTHLESS WITHOUT THIS NUMBER. The entire argument — that many
       small hits beat one big one — only holds because the enemy's Concentration
       save is a flat DC 10 that damage barely moves. A reader who assumes the
       enemy rolls against his own {{saveDC}} draws the OPPOSITE conclusion from
       the same card and hits harder instead of more often.
       The negative half looks for the resolved value, `DC 14`, not the token:
       by the time this test sees the card the braces are gone, so a test that
       searched for the token would miss exactly the edit it exists to catch. */
    expect(text, 'the flat DC is gone from the card').toMatch(/flat DC 10/i)
    expect(text, 'the card now sends the enemy against HIS save DC')
      .not.toMatch(/DC 14/)
  })

  it('leaves the Searing Smite Concentration question open, and attributed', () => {
    /* Gate 1 open question 2 is still open. The card must ASK, must say what
       changes if the answer is yes, and must name the file the denial came from
       — WARFARE-DOCTRINE.md, which is the same file that gets Prone backwards.
       Deleting the attribution turns reported speech into the app's own claim,
       which is how an unverified rule quietly becomes a rule.

       This is checked per FIELD, not per sentence. The first attempt split the
       whole card's text on sentence punctuation, but tags and requirements carry
       no full stop, so they glued themselves onto the front of the first warning
       and produced a "sentence" that mentioned concentration and `not` while
       denying nothing. Sentence boundaries are not real here; field boundaries
       are. */
    const fields = strings(killer)
    const question = fields.find(s => /IS SEARING SMITE CONCENTRATION\?/i.test(s))
    expect(question, 'the card no longer raises the question at all').toBeTruthy()
    expect(question!, 'the question is raised and never handed to his DM')
      .toMatch(/ask your DM/i)
    expect(question!, 'and no longer says what changes if the answer is yes')
      .toMatch(/if the spell DOES take your Concentration/i)
    expect(question!, 'the denial is stated without naming the file it came from')
      .toMatch(/WARFARE-DOCTRINE\.md/)

    /* And nowhere else on the card may flatly assert the denial unattributed.
       Nothing matches this today, so the pattern is proved against a specimen
       first — a guard whose regex cannot recognise the thing it guards against
       is a test that cannot fail. */
    const DENIAL =
      /(?:is|are|it['’]s)? ?not(?: a)? concentration\b|does(?: not|n['’]t) (?:take|require|need)[^.]{0,24}concentration/i
    expect('Searing Smite is not Concentration.', 'the guard cannot detect a denial')
      .toMatch(DENIAL)
    for (const s of fields) {
      if (!DENIAL.test(s)) continue
      expect(s, `denies the Concentration without saying who said so: ${s}`)
        .toMatch(/WARFARE-DOCTRINE\.md/)
    }
  })

  it('rejects Divine Smite by name, which is the surprise', () => {
    /* Without the rejection the card collapses into "attack twice and smite",
       which Gate 1 named as the exact thing that does not clear the quality bar.
       The second half pins the Bonus Action to the spell that replaces it — an
       edit that swapped Searing Smite back out for Divine Smite would leave the
       prose intact and the turn wrong. */
    expect(text, 'Divine Smite is not mentioned, so nothing is being inverted')
      .toContain('Divine Smite')
    const bonus = killer!.blocks.find(b => b.type === 'bonus')
    expect(bonus?.sourceName, 'the Bonus Action is no longer Searing Smite')
      .toBe('Searing Smite')
  })
})

describe('the slate is closed at ten, in the order he will read them', () => {
  it('paints all ten, round two’s own order, nothing dropped and nothing twice', () => {
    /* Written out in full rather than counted. A length of ten cannot tell a
       re-ordering from a replacement, and the array's order IS the order of the
       cards on his screen — so the order is part of what was approved. */
    const ids = resolvePack(MARCUS).combos.filter(Boolean).map(c => c!.id)
    expect(ids).toEqual([
      'seed:hearth-7-r2:the-sentinel-gate',
      'seed:hearth-7-r2:three-people-stand-up',
      'seed:hearth-7-r2:the-free-crit',
      'seed:hearth-7-r2:the-second-swing',
      'seed:hearth-7-r2:through-the-door',
      'seed:hearth-7-r2:bearings-and-the-backward-walk',
      'seed:hearth-7-r2:one-silver-piece-of-fire',
      'seed:hearth-7-r2:the-shield-round',
      'seed:hearth-7-r2:drop-the-glaive',
      'seed:hearth-7-r2:the-caster-killer',
    ])
  })
})

/* ---------------------------------------------------------------------------
   SLICE 6 — THE SCOPED EXCEPTION, ASSERTED IN THE DIRECTION THAT CAN ROT
   ------------------------------------------------------------------------- */

describe('the backstory is named on purpose', () => {
  /* THE EXACT INVERSE OF ROUND ONE'S `names nobody from his backstory`, and the
     inversion is the whole point. Round one is authored for a KIND of character,
     so a proper noun there is a defect and its test forbids one. Marcus lifted
     that ruling for THIS pack on 2026-09-04 — "Use all of it" — and the licence
     is written up in `types.ts` beside the ruling it excepts.

     A licence on its own does not survive. A future author opens round one's
     persona file, reads a test that forbids these names, takes it for the house
     style, and edits round two back into anonymity — and every test in this
     repo stays green while the thing Marcus actually asked for disappears. So
     the assertion is that the names are USED, not that they are allowed. Strip
     the licence and this file goes red, which is the only kind of documentation
     that lasts.

     CHECKED ON LOAD-BEARING TEXT ONLY. `resolveNotes` drops an annotation whose
     tokens will not resolve, silently and one at a time, so an annotation is the
     wrong place to keep a claim about what the pack says. Name, situation,
     approach, keyPhrases and tags either all survive or the play does not. */
  const plays = resolvePack(MARCUS).personaPlays
  const spokenOf = (p: (typeof plays)[number]) =>
    [p!.name, p!.situation, p!.approach, ...p!.keyPhrases, ...p!.tags].join('\n')
  const spoken = plays.map(spokenOf).join('\n')

  it('names the six the licence was granted for', () => {
    /* The same list round one forbids, minus Nix — these plays speak to him in
       the second person and never say his name, which is a style choice and not
       a claim worth pinning. Everything else on that list is here. */
    for (const name of ['Selis', 'Rysanna', 'Scar', 'Fate', 'Khaonn']) {
      expect(spoken, `no persona play names ${name}`).toContain(name)
    }
    expect(spoken, 'the Hidden Kingdom is his only long game and is unnamed')
      .toContain('Hidden Kingdom')
  })

  it('spends the changeling round one deliberately left alone', () => {
    /* `pack-hearth-7.test.ts` has `still spends no part of the changeling` —
       round one names the absence in a warning and then honours it. The same
       licence that opened the backstory opened this, and a round two that still
       would not touch it would have taken the permission and used none of it. */
    expect(spoken).toMatch(/changeling/i)
    expect(spoken).toMatch(/shape-shifter/i)
  })

  it('gives every play something licensed to be about', () => {
    /* Per play, not per pack. Five proper nouns concentrated in two cards and
       four generic ones would pass the test above and fail Marcus's request,
       which was for plays HE would favourite. The changeling counts alongside
       the names because it is licensed by the same sentence and is just as
       much his. */
    const LICENSED = /Selis|Rysanna|Scar|Fate|Khaonn|Hidden Kingdom|changeling|shape-shifter/i
    for (const play of plays) {
      expect(spokenOf(play), `${play!.id} could have been written for anybody`)
        .toMatch(LICENSED)
    }
  })

  it('paints the six in the order they were approved', () => {
    /* Spelled out rather than counted, for the reason the combo slate is: a
       length cannot tell a re-ordering from a replacement, and the array's
       order is the order of the cards on his phone. */
    expect(plays.map(p => p!.id)).toEqual([
      'seed:hearth-7-r2:fate-wants-something-stupid',
      'seed:hearth-7-r2:ask-scar',
      'seed:hearth-7-r2:the-eyes-you-never-change',
      'seed:hearth-7-r2:while-the-nations-war',
      'seed:hearth-7-r2:when-they-ask-about-the-fire',
      'seed:hearth-7-r2:the-face-that-opens-the-door',
    ])
  })
})

describe('the two constraints round one found on the glass', () => {
  const plays = resolvePack(MARCUS).personaPlays

  it('keeps skillCheck to 24 characters, because it is a badge', () => {
    /* `ToyboxPanel` paints it as `<Badge variant="eldritch">` in the collapsed
       header, next to a 44px star, the play's name and a chevron, on a 390px
       phone — and it does NOT truncate. Every character over the line is taken
       from the name beside it. 24 is measured, not guessed; round one found it
       by putting a long one on the glass and looking. Anything that needs more
       words has `approach`, which has room. */
    for (const play of plays) {
      const badge = play!.skillCheck ?? ''
      expect(badge.length, `${play!.id} skillCheck is ${badge.length} chars: ${badge}`)
        .toBeLessThanOrEqual(24)
    }
  })

  it('gives every play a skillCheck, so no header paints half a row', () => {
    /* Optional in the type and not optional here. Five badges and one gap is a
       layout that looks broken rather than one that looks sparse — and "No roll
       — play it" is a real answer to the question the badge asks. */
    for (const play of plays) {
      expect(play!.skillCheck, `${play!.id} has no skillCheck`).toBeTruthy()
    }
  })

  it('puts no quotation mark inside a keyPhrase', () => {
    /* `ToyboxPanel` wraps each phrase in `&ldquo;…&rdquo;` itself. A phrase that
       carries its own quotes paints as ““like this””, which round one shipped
       once and had to fix on the glass. Curly and straight both, because the
       editor that introduced them the first time produced curly. */
    for (const play of plays) {
      for (const phrase of play!.keyPhrases) {
        expect(phrase, `${play!.id} quotes itself: ${phrase}`).not.toMatch(/["“”]/)
      }
    }
  })
})

describe('the persona plays keep the pack’s own rules', () => {
  it('keeps party tokens out of every load-bearing field', () => {
    /* THE RULE THAT COSTS A WHOLE CARD WHEN IT IS BROKEN. `{{wizard}}` and its
       three siblings resolve off `backstory.relationships`, which is a field a
       real character sheet can simply not have filled in. In an annotation an
       unresolved token costs that one note; in `approach` it costs the play.
       Checked on the AUTHORED pack, not the resolved one — by the time it is
       resolved the token is either a name or the play is already gone. */
    for (const play of HEARTH_7_R2.personaPlays) {
      const loadBearing = [play.name, play.situation, play.approach, ...play.keyPhrases, ...play.tags]
      for (const text of loadBearing) {
        expect(text, `${play.id} risks the whole play on a party token: ${text}`)
          .not.toMatch(/\{\{(wizard|rogue|ranger|bard)\}\}/)
      }
    }
  })

  it('gives every play at least one annotation', () => {
    /* Not decoration. Each of the six carries at least one note that is either a
       rule he can check (§15 makes him Fey; Shape-Shifter is an Action) or a
       table-manners warning (Fate has no stat block; the twenty-minute version
       of the grief costs the table). A play with no note is a mood, and Marcus
       asked for plays he would favourite. */
    for (const play of resolvePack(MARCUS).personaPlays) {
      expect(play!.annotations?.length ?? 0, `${play!.id} carries no note`)
        .toBeGreaterThan(0)
    }
  })
})
