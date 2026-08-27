import { describe, expect, it } from 'vitest'
import { composeTurn } from './compose'
import { optionDetail } from './detail'
import { NIX } from './fixtures/nix'
import { BASIC_ACTIONS, PALADIN_ACTIONS } from '../dnd-data'
import type { EconomyState, TurnOption } from './types'

/* ============================================================================
   WHAT THE COMPETING MENUS DO — pinned BEFORE any of them is retired.
   Table Truth slice 9.

   The slice's binding rule is that nothing gets deleted until its unique
   capabilities are enumerated and pinned as tests, and that anything which
   turns out NOT to be subsumed survives. The prime law forbids reducing
   capability, so this file is allowed to end with something surviving — and
   two of the groups below say out loud that something does.

   THE THREE SURFACES, AND WHAT EACH ONE UNIQUELY OFFERED

     "Actions Reference"  (SmartActionsPanel, CombatHelper.tsx:369)
        · Class Actions — Divine Smite / Lay on Hands / Channel Divinity, each
          with a LIVE resource count and disabled when the pool is empty
        · Prepared Spells grouped by casting time, each carrying level, range,
          concentration, damage dice + type, and the save DC or attack bonus
        · Basic Actions — the 14 rules-of-the-game actions, collapsed
        · every button asks the AI advisor; NOTHING here spends anything

     the top "Action" slide-up  (ActionMenu.tsx, 697 lines)
        · see the browser prover: it cannot be opened, and has not been able to
          be opened for as long as `openActionMenu` has had no caller

     the deck's chips  (TurnDeck.tsx)
        · spend/unspend the four economy slots; they filter nothing today

   Each `it` below is one fact one of those surfaces states. If the sheet
   states it too, the surface's claim to that fact is retired. If the sheet
   does not, the surface keeps it and this file records why.
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
  if (!found) throw new Error(`the composed turn has no option named ${name}`)
  return found
}
const sheet = (name: string) => optionDetail(byName(name), NIX, FRESH)
const factValue = (name: string, label: string) =>
  sheet(name).facts.find(f => f.label === label)?.value ?? ''

describe('slice 9 — what "Actions Reference" states about a spell, the sheet states too', () => {
  it('states the level, the way the badge did', () => {
    // The panel painted a Badge reading "Cantrip" or "Lvl 1".
    expect(factValue('Sacred Flame', 'Level')).toContain('cantrip')
    expect(factValue('Divine Smite', 'Level')).toContain('Level 1')
  })

  it('states the range, the way the mono column did', () => {
    expect(factValue('Sacred Flame', 'Range')).toBe('60 feet')
    expect(factValue('Cure Wounds', 'Range')).toBe('Touch')
  })

  it('states concentration, the way the ember dot did', () => {
    /* The panel marked it with an unlabelled 2px dot and a `title` attribute —
       which is to say, with nothing at all on a touch screen. */
    expect(factValue('Shield of Faith', 'Concentration')).toContain('Yes')
    expect(sheet('Sacred Flame').facts.some(f => f.label === 'Concentration')).toBe(false)
  })

  it('states the damage dice AND the damage type', () => {
    expect(factValue('Divine Smite', 'Damage')).toContain('2d8')
    expect(factValue('Divine Smite', 'Damage')).toContain('Radiant')
  })

  it('states the casting time, the way the BA / Rx badges did', () => {
    expect(factValue('Divine Smite', 'Casting Time')).toContain('Bonus Action')
    expect(factValue('Cure Wounds', 'Casting Time')).toContain('Action')
  })

  it('states the SAVE DC as a number, not just which save it is', () => {
    /* THE ONE THE PANEL DID BETTER, until this slice.
       "Actions Reference" painted «DC 16 Dexterity» — the DC included, because
       a DC is the number you say out loud to a DM. `statBlock` is pure over
       the spell and cannot know the caster, so it painted «Dexterity —
       negates» and left the number to a band at the top of the tab.

       Marcus's opening ask names spell save DC as vital at the table. Reading
       it off a different card and carrying it to this one is exactly the
       hunting the whole plan exists to kill, so the DC belongs on the option.

       The DC is character-derived, so it is joined in `detail.ts`. `format.ts`
       stays a pure canon formatter — it has no character and must not grow
       one. */
    const save = factValue('Sacred Flame', 'Save')
    expect(save).toContain(String(NIX.spellSaveDC))
    expect(save).toContain('Dexterity')
    // …and the effect canon states is still there. The DC is added, not swapped.
    expect(save).toContain('negates')
  })

  it('leaves the DC out of a spell that has no save', () => {
    // The other half of the rule, so "print the DC everywhere" also fails.
    for (const label of ['Level', 'Range', 'Duration', 'Casting Time']) {
      expect(factValue('Cure Wounds', label)).not.toContain(`DC ${NIX.spellSaveDC}`)
    }
    expect(sheet('Cure Wounds').facts.some(f => f.label === 'Save')).toBe(false)
  })
})

describe('slice 9 — the panel’s live resource counts survive on the row', () => {
  it('prices each class action from the real pool, as the panel’s badge did', () => {
    /* The panel hardcoded three names and read three pools by `if`. The
       composed option carries its own price, so this is the same fact without
       the name-matching — and it works for a class the panel never heard of. */
    expect(sheet('Lay on Hands').subtitle).toContain('15/40 points')
    expect(sheet('Channel Divinity: Sacred Weapon').subtitle).toContain('1/2 uses')
    expect(sheet('Divine Smite').subtitle).toContain('1st-level slot')
  })

  it('names every class action the panel hardcoded', () => {
    /* PALADIN_ACTIONS is a list of three names; the engine composes from the
       sheet. "Channel Divinity" is on the turn under the name of the option it
       actually is, which is more use at a table than the category. */
    const names = everyOption.map(o => o.name).join(' | ')
    expect(names).toContain('Divine Smite')
    expect(names).toContain('Lay on Hands')
    expect(names).toMatch(/Channel Divinity/)
    expect(PALADIN_ACTIONS.map(a => a.name)).toHaveLength(3)
  })
})

describe('slice 9 — the Basic Actions are NOT subsumed, and that is why the panel lives', () => {
  /* THIS BLOCK EXISTS TO STOP A DELETION, and it is phrased so that closing
     the gap is what makes it fail.

     `composeTurn` builds the turn out of the character sheet: weapons, spells,
     features, class resources. Dash, Dodge, Disengage, Help, Hide and Ready
     are on nobody's sheet — they are rules of the game, and the engine has no
     source for them. So retiring "Actions Reference" wholesale would take the
     only place on the Play tab where Marcus can read what Dodge does, and the
     prime law forbids that.

     If a later slice gives the engine a basic-actions layer, this test goes
     red. That is correct: the assertion below is the reason the panel is
     still mounted, and when the reason stops being true the panel should go
     with it. Do not weaken it — re-scope the retirement. */
  const composedNames = new Set(everyOption.map(o => o.name))

  it('has no Dash, Dodge, Disengage, Help, Hide or Ready anywhere on the turn', () => {
    const missing = BASIC_ACTIONS.map(a => a.name).filter(n => !composedNames.has(n))
    expect(missing).toContain('Dash')
    expect(missing).toContain('Dodge')
    expect(missing).toContain('Disengage')
    expect(missing).toContain('Help')
    expect(missing).toContain('Hide')
    expect(missing).toContain('Ready')
  })

  it('still ships all 14 of them, with a description each', () => {
    // What survives has to be worth surviving: every entry must say something.
    expect(BASIC_ACTIONS).toHaveLength(14)
    for (const action of BASIC_ACTIONS) {
      expect(action.description.length).toBeGreaterThan(20)
      expect(action.description).not.toContain('…')
    }
  })
})

describe('slice 9 — the reachability census, which may only go up', () => {
  it('counts every option the turn composes, and how many a row can open', () => {
    /* The headline of slice 7 (finding AB) and the reason Marcus put this
       slice first: the Play tab renders `ranked` and the reactions band, and
       renders `mutex` NOWHERE — it only counts it in a footer. Seven options,
       including every levelled spell Nix owns, have no row to tap.

       Pinned as an inequality so the numbers can only improve. */
    const inMutex = turn.mutex.flatMap(g => g.faces).length
    expect(everyOption.length).toBeGreaterThanOrEqual(14)
    expect(inMutex).toBe(7)
  })
})
