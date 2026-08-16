import type { Character } from '../character'
import type { CombatState } from '../combat-state'
import type { ComposedTurn } from './types'

/* ============================================================================
   composeTurn — SLICE 1: THE TRACER BULLET
   ----------------------------------------------------------------------------
   The signature below is the real one and will not change.  The BODY is a
   fixture: it returns Nix's exact mid-fight state and ignores its arguments.

   That is deliberate and it is the entire point of a tracer bullet.  The pipe
   is wired end to end — App passes the real character and the real persisted
   combat state, the real component renders the real type — before a single
   line of rules logic goes in it.  Slice 4 replaces this body with the
   composition logic lifted from TurnSummary.tsx:219-378, and Slice 2's
   characterization tests are what prove that swap changed no behaviour.

   Arguments are accepted and unused on purpose.  Do not "tidy" them away.
   ========================================================================== */

export interface ComposeInput {
  character: Character
  /** Null before the first `startCombat`, and that is a legal state. */
  combat: CombatState | null
  /** Initiative entries and their conditions.  Unread in Slice 1. */
  board?: unknown
}

/**
 * Compose everything the player can actually do this turn.
 *
 * PURE.  No storage reads, no clock, no randomness — same input, same output,
 * forever.  That is what makes the 15-second metric testable.
 */
export function composeTurn(input: ComposeInput): ComposedTurn {
  void input
  return NIX_SEED
}

/* ----------------------------------------------------------------------------
   THE FIXTURE — Nix, Oath of the Hearth, level 8, mid-fight.
   ----------------------------------------------------------------------------
   Marcus's actual character, not invented demo data.  The mockups used
   "Vaelin, Oath of Vengeance"; that was a placeholder and it is gone.  Seeding
   with Nix means the homebrew paths are exercised by default from Slice 1
   rather than being remembered about in Slice 6c.

   Subclass detail is real, taken from dnd-data.ts HOMEBREW_CONTENT
   ('Oath of the Hearth', 184-205): Hearthfire Manifest spends a Channel
   Divinity use as a REACTION for temp HP equal to paladin level + CHA mod,
   and melee attackers then take 1d10 fire.  Aura of Solace is online at 7.
   -------------------------------------------------------------------------- */

const NIX_SEED: ComposedTurn = {
  seeded: true,
  actor: {
    name: 'Nix',
    species: 'Changeling',
    className: 'Paladin',
    subclass: 'Oath of the Hearth',
    level: 8,
    homebrewSubclass: true,
  },
  round: 3,

  vitals: {
    hp: 41,
    maxHp: 76,
    tempHp: 0,
    ac: 19,
    // 41 > 38, so not bloodied — but close enough that the marker on the bar
    // is doing work.  A threshold you only see once you cross it is useless.
    bloodied: false,
    bloodiedAt: 38,
  },

  upon: [
    {
      name: 'Prone',
      known: true,
      text: 'The hobgoblin is prone — melee attacks against it have advantage.',
      side: 'target',
      tone: 'good',
    },
    {
      name: 'Aura of Solace',
      known: false,
      text: 'You and allies within 10 ft resist fire, cold and psychic damage.',
      side: 'you',
      tone: 'good',
    },
  ],

  economy: {
    action: true,
    bonusAction: true,
    reaction: true,
    movement: true,
    spellSlotUsedThisTurn: false,
  },

  ranked: [
    {
      id: 'attack-longsword',
      name: 'Longsword',
      kind: 'attack',
      detail: '+8 to hit · 1d8+5 slashing · advantage, the target is prone',
      dice: '1d8+5',
      cost: { slot: 'action', label: 'Action' },
      rider: {
        property: 'Sap',
        known: true,
        text: 'the target has disadvantage on its next attack roll',
        automatic: true,
        // Sap's window ends before the START of your next turn - verified
        // in Slice 3 against the printed text. NOT the same window as Vex.
        expires: 'startOfYourNextTurn',
      },
      available: true,
      score: 90,
      source: 'Longsword',
    },
    {
      id: 'feature-hearthfire-manifest',
      name: 'Hearthfire Manifest',
      kind: 'feature',
      detail: 'Summon the ember. Bright light 10 ft, dim 10 ft more, range 30 ft.',
      cost: { slot: 'bonusAction', label: 'Bonus action' },
      available: true,
      score: 62,
      source: 'Oath of the Hearth',
      homebrew: true,
    },
    {
      id: 'spell-sacred-flame',
      name: 'Sacred Flame',
      kind: 'spell',
      detail: 'DEX save DC 16 · 2d8 radiant · no cover allowed',
      dice: '2d8',
      cost: { slot: 'action', label: 'Action · no slot' },
      available: true,
      score: 40,
      source: 'Cantrip',
    },
  ],

  mutex: [
    {
      id: 'mutex-bonus',
      label: 'One of these — the bonus action',
      // Both, and this is the 2024 delta that reshaped the screen: Smite and
      // Lay on Hands became bonus actions, so with Misty Step there are three
      // things wanting one slot, and the one-spell-slot-per-turn rule then
      // excludes Smite-plus-Misty-Step a second time over.
      reason: 'both',
      faces: [
        {
          id: 'smite-divine',
          name: 'Divine Smite',
          kind: 'spell',
          detail: '+2d8 radiant · after a hit',
          dice: '2d8',
          cost: { slot: 'bonusAction', spellSlotLevel: 1, label: '1st-level slot' },
          available: true,
          score: 88,
          contended: true,
          source: 'Paladin',
        },
        {
          id: 'lay-on-hands',
          name: 'Lay on Hands',
          kind: 'resource',
          detail: 'Touch · restore hit points 1:1 from the pool',
          cost: {
            slot: 'bonusAction',
            resourcePoolId: 'lay-on-hands',
            label: '15 of 40 left',
          },
          available: true,
          score: 70,
          contended: true,
          source: 'Paladin',
        },
        {
          id: 'spell-misty-step',
          name: 'Misty Step',
          kind: 'spell',
          detail: 'Teleport 30 ft to a space you can see',
          cost: { slot: 'bonusAction', spellSlotLevel: 2, label: '2nd-level slot' },
          available: true,
          score: 55,
          contended: true,
          source: 'Oath spell',
        },
      ],
    },
  ],

  rest: [
    {
      id: 'reaction-hearthfire-cloak',
      name: 'Flaming Cloak',
      kind: 'feature',
      detail:
        'Reaction · spend Channel Divinity · 12 temp HP, and melee attackers take 1d10 fire',
      dice: '1d10',
      cost: { slot: 'reaction', resourcePoolId: 'channel-divinity', label: 'Channel Divinity' },
      available: true,
      score: 30,
      source: 'Oath of the Hearth',
      homebrew: true,
    },
    {
      id: 'spell-warding-bond',
      name: 'Warding Bond',
      kind: 'spell',
      detail: 'Halve an ally’s damage and take it yourself',
      cost: { slot: 'action', spellSlotLevel: 2, label: '2nd-level slot' },
      available: false,
      blockedReason: 'Already bonded to Scar',
      score: 10,
      source: 'Oath spell',
    },
  ],

  resources: [
    {
      id: 'lay-on-hands',
      name: 'Lay on hands',
      current: 15,
      max: 40,
      unit: 'points',
      recharge: 'longRest',
    },
    {
      id: 'channel-divinity',
      name: 'Channel Divinity',
      current: 1,
      max: 2,
      unit: 'uses',
      recharge: 'shortRest',
    },
  ],

  spellSlots: [
    { level: 1, current: 3, max: 4 },
    { level: 2, current: 2, max: 3 },
  ],
}
