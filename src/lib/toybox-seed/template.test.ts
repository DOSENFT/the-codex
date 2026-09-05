/* ============================================================================
   TOKENS — slice 2.

   The load-bearing claim is negative: `resolveText` never returns a string
   with braces in it. A pack is prose, prose gets typos, and a typo that ships
   as `{{auraBonis}}` on the glass is the single most embarrassing way this
   feature could fail. It fails as a dropped entry instead.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { NIX } from '../turn/fixtures/nix'
import type { Character } from '../character'
import { resolveCharacter } from '../rules-2024/derive'
import { buildProfile } from './profile'
import {
  resolveText, resolveCombo, resolveNotes, resolveTactic, resolvePersonaPlay, meetsNeeds,
} from './template'
import type { SeedCombo, SeedTactic, SeedPersonaPlay } from './types'

const marcus: Character = resolveCharacter({
  ...NIX,
  level: 7,
  abilityScores: { ...NIX.abilityScores, STR: 18, CHA: 16 },
  backstory: {
    origin: '', keyMemories: [], unresolvedThreads: [], personalitySeeds: [],
    relationships: [
      { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet.', status: 'alive' },
    ],
  },
})
const p = buildProfile(marcus)

const AT = 1_700_000_000_000

describe('resolving', () => {
  it('writes a modifier the way the game writes it', () => {
    expect(resolveText('aura {{auraBonus}}', p)).toBe('aura +3')
    expect(resolveText('prof {{prof}}', p)).toBe('prof +3')
    expect(resolveText('attack {{spellAttack}}', p)).toBe('attack +6')
  })

  it('writes a count as a bare number', () => {
    expect(resolveText('{{cloakTempHp}} temp HP', p)).toBe('10 temp HP')
    expect(resolveText('DC {{saveDC}}', p)).toBe('DC 14')
    expect(resolveText('{{auraRadius}} ft', p)).toBe('10 ft')
  })

  it('signs a negative modifier with a minus, not a plus', () => {
    const dumped = buildProfile(resolveCharacter({ ...NIX, abilityScores: { ...NIX.abilityScores, CHA: 8 } }))
    expect(resolveText('{{chaMod}}', dumped)).toBe('-1')
  })

  it('replaces every occurrence, not just the first', () => {
    expect(resolveText('{{level}} and {{level}}', p)).toBe('7 and 7')
  })

  it('leaves text with no tokens exactly as it was', () => {
    const plain = 'Stand where the aura pays.'
    expect(resolveText(plain, p)).toBe(plain)
  })

  it('names a party member by role', () => {
    expect(resolveText('call it out to {{wizard}}', p)).toBe('call it out to Rune Willow')
  })
})

describe('refusing', () => {
  it('returns null for a token that does not exist — never raw braces', () => {
    /* The typo case. `{{auraBonis}}` is not in the table, and the string it is
       in is unusable rather than partly rendered. */
    expect(resolveText('aura {{auraBonis}}', p)).toBeNull()
  })

  it('returns null when a role nobody fills is named', () => {
    /* Marcus's party has no cleric. "Ask your cleric to top you up" would be
       advice about a person who is not at the table. */
    expect(resolveText('ask {{cleric}}', p)).toBeNull()
  })

  it('returns null when the character has no weapon to name', () => {
    const archer = buildProfile({ ...marcus, weapons: [] })
    expect(resolveText('swing {{weapon}}', archer)).toBeNull()
  })

  it('fails the whole string when only one of several tokens is bad', () => {
    expect(resolveText('{{level}} then {{nonsense}}', p)).toBeNull()
  })

  it('never, under any input, returns a string containing braces', () => {
    const attempts = [
      'plain', '{{level}}', '{{nope}}', '{{cleric}}', '{{level}} {{nope}}',
      '{{{level}}}', '{{ level }}', '{{}}', '{{level}}{{level}}',
    ]
    for (const attempt of attempts) {
      const out = resolveText(attempt, p)
      if (out !== null) expect(out, `"${attempt}" leaked braces`).not.toContain('{{')
    }
  })
})

describe('an entry survives or it does not', () => {
  const base: SeedCombo = {
    id: 'seed:test:x',
    name: 'Test',
    blocks: [{ id: 'seed:test:x:1', type: 'action', label: 'Swing {{weapon}}', source: 'weapon' }],
    tags: ['t'],
  }

  it('resolves through the blocks, not just the top level', () => {
    const out = resolveCombo(base, p, AT)
    expect(out?.blocks[0].label).toBe('Swing Hearthbrand')
  })

  it('is dropped when a BLOCK LABEL cannot resolve, though the name could', () => {
    /* The whole point of load-bearing: a combo whose name is fine and whose
       second step is unspeakable is not a usable combo. */
    const broken: SeedCombo = {
      ...base,
      blocks: [{ ...base.blocks[0], label: 'Swing {{nonsense}}' }],
    }
    expect(resolveCombo(broken, p, AT)).toBeNull()
  })

  it('is dropped when a REQUIREMENT cannot resolve', () => {
    /* A requirement that cannot be stated cannot be checked, and the prep
       index is the reason requirements exist at all. */
    expect(resolveCombo({ ...base, requirements: ['{{cleric}} nearby'] }, p, AT)).toBeNull()
  })

  it('stamps favorite and createdAt, which a pack cannot express', () => {
    const out = resolveCombo(base, p, AT)
    expect(out?.favorite).toBe(false)
    expect(out?.createdAt).toBe(AT)
  })

  it('leaves an absent optional absent rather than inventing an empty string', () => {
    const out = resolveCombo(base, p, AT)
    expect(out?.description).toBeUndefined()
    expect(out?.requirements).toBeUndefined()
    expect(out?.annotations).toBeUndefined()
  })

  it('SURVIVES an unresolvable annotation, having died for a block label', () => {
    /* The load-bearing split, asserted in one place against one profile so the
       two halves cannot drift apart. Marcus's party has no cleric. A combo
       whose second step names one is not runnable; a combo whose *advice*
       names one is runnable advice minus one line. */
    const withBadNote: SeedCombo = {
      ...base,
      annotations: [
        { kind: 'party', text: 'call it out to {{cleric}}' },
        { kind: 'warning', text: 'temp HP never stack' },
      ],
    }
    const out = resolveCombo(withBadNote, p, AT)
    expect(out, 'a dropped annotation must never take the combo with it').not.toBeNull()
    expect(out?.annotations).toEqual([{ kind: 'warning', text: 'temp HP never stack' }])
  })
})

/* ---------------------------------------------------------------------------
   `needs` — THE SECOND WAY AN ENTRY CAN BE WRONG. Round two.

   Round one had exactly one: the text cannot be written, so the entry drops.
   That catches everything a token can see, and tokens cannot see the two facts
   round two's content is built on. "The Sentinel Gate" is a lie for a paladin
   without Sentinel — and there is no token for a feat. Worse, `{{weaponReach}}`
   RESOLVES to 5 for a short sword, so a combo about holding a ten-foot lane
   would render perfectly and read as a strange card rather than an absent one.
   Silent wrongness on the glass is the failure this whole feature exists to
   avoid, so `needs` is a gate that runs BEFORE any text is written.

   The last test in this block is the one that keeps `needs` out of storage.
   ------------------------------------------------------------------------- */

describe('needs, which is checked before a single character is written', () => {
  const sentineled = buildProfile({
    ...marcus,
    feats: [{ name: 'Sentinel', description: '', isHomebrew: false, effects: [] }],
    weapons: marcus.weapons.map(w =>
      w.attackType === 'melee' ? { ...w, properties: ['Reach', 'Two-Handed'] } : w),
  })

  const gated: SeedCombo = {
    id: 'seed:test:gated',
    name: 'Gated',
    needs: { feats: ['Sentinel'], weaponProperties: ['Reach'] },
    blocks: [{ id: 'seed:test:gated:1', type: 'action', label: 'Swing {{weapon}}', source: 'weapon' }],
    tags: ['t'],
  }

  it('lets the entry through when the sheet has everything it names', () => {
    expect(resolveCombo(gated, sentineled, AT)).not.toBeNull()
  })

  it('drops the entry for a paladin without the feat', () => {
    /* `marcus` is the real sheet minus its feats — and this is not hypothetical:
       every paladin who is not Marcus reads this pack too. */
    expect(resolveCombo(gated, p, AT)).toBeNull()
  })

  it('drops the entry for a five-foot weapon, which NO TOKEN COULD CATCH', () => {
    /* The reason `needs` exists at all. Give this character the feat but leave
       the sword short: every token still resolves, `{{weaponReach}}` cheerfully
       writes "5", and round one's machinery sees nothing wrong. */
    const shortSword = buildProfile({
      ...marcus,
      feats: [{ name: 'Sentinel', description: '', isHomebrew: false, effects: [] }],
      weapons: marcus.weapons.map(w =>
        w.attackType === 'melee' ? { ...w, properties: ['Versatile'] } : w),
    })
    expect(resolveText('reach {{weaponReach}} ft', shortSword), 'the text writes fine')
      .toBe('reach 5 ft')
    expect(resolveCombo(gated, shortSword, AT), 'and the entry drops anyway').toBeNull()
  })

  it('drops a weapon requirement for a character carrying no melee weapon', () => {
    const archer = buildProfile({
      ...marcus,
      feats: [{ name: 'Sentinel', description: '', isHomebrew: false, effects: [] }],
      weapons: marcus.weapons.filter(w => w.attackType === 'ranged'),
    })
    expect(meetsNeeds({ weaponProperties: ['Reach'] }, archer)).toBe(false)
  })

  it('ignores case and stray spaces, because packs are hand-written prose', () => {
    expect(meetsNeeds({ feats: ['  sENTINEL '] }, sentineled)).toBe(true)
    expect(meetsNeeds({ weaponProperties: ['REACH'] }, sentineled)).toBe(true)
  })

  it('lets an entry with no needs through, and one with empty needs too', () => {
    expect(meetsNeeds(undefined, p)).toBe(true)
    expect(meetsNeeds({}, p)).toBe(true)
    expect(meetsNeeds({ feats: [], weaponProperties: [] }, p)).toBe(true)
  })

  it('requires ALL of them, not any', () => {
    expect(meetsNeeds({ feats: ['Sentinel', 'Great Weapon Master'] }, sentineled)).toBe(false)
  })

  it('NEVER lets `needs` reach the resolved entry, for any of the three kinds', () => {
    /* THE ONE THAT MATTERS MOST. A resolved entry goes to localStorage and
       stays there. `needs` is authoring metadata about a decision that has
       already been made by the time the entry exists — carrying it forward
       would put a dead field on Marcus's phone forever, and the editor would
       eventually have to render or strip it. */
    const tactic: SeedTactic = {
      id: 'seed:test:gated-t',
      name: 'Gated Tactic',
      trigger: 'it applies',
      actions: ['Hold the lane.'],
      priority: 'normal',
      tags: ['t'],
      needs: { feats: ['Sentinel'] },
    }
    const play: SeedPersonaPlay = {
      id: 'seed:test:gated-p',
      name: 'Gated Play',
      situation: 'someone asks',
      approach: 'Say less.',
      keyPhrases: ['Not tonight.'],
      tags: ['t'],
      needs: { feats: ['Sentinel'] },
    }

    const outCombo = resolveCombo(gated, sentineled, AT)
    const outTactic = resolveTactic(tactic, sentineled, AT)
    const outPlay = resolvePersonaPlay(play, sentineled, AT)

    expect(outCombo, 'all three had to survive, or this asserts nothing').not.toBeNull()
    expect(outTactic).not.toBeNull()
    expect(outPlay).not.toBeNull()

    expect('needs' in outCombo!).toBe(false)
    expect('needs' in outTactic!).toBe(false)
    expect('needs' in outPlay!).toBe(false)
  })
})

describe('annotations, which are advice and not requirements', () => {
  it('drops only the note it cannot write, and keeps its siblings', () => {
    expect(resolveNotes([
      { kind: 'positioning', text: 'aura is {{auraRadius}} ft' },
      { kind: 'party', text: 'ask {{cleric}}' },
      { kind: 'warning', text: 'one slot per turn' },
    ], p)).toEqual([
      { kind: 'positioning', text: 'aura is 10 ft' },
      { kind: 'warning', text: 'one slot per turn' },
    ])
  })

  it('reports nothing as undefined rather than an empty list', () => {
    /* The cards render on presence. `[]` would paint a container with a gap
       in it and no content, which is the one visual outcome nobody authored. */
    expect(resolveNotes(undefined, p)).toBeUndefined()
    expect(resolveNotes([], p)).toBeUndefined()
    expect(resolveNotes([{ kind: 'party', text: 'ask {{cleric}}' }], p)).toBeUndefined()
  })

  it('keeps the kind it was given while rewriting the text', () => {
    expect(resolveNotes([{ kind: 'warning', text: 'DC {{saveDC}}' }], p))
      .toEqual([{ kind: 'warning', text: 'DC 14' }])
  })
})
