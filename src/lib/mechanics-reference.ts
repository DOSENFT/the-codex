// ---------------------------------------------------------------------------
// D&D 2024 Mechanics Quick-Reference Data
// ---------------------------------------------------------------------------
// Static reference entries for the MechanicsDrawer. Each entry answers a common
// player question with a short answer (for quick scanning) and a full explanation
// (for deeper learning). The contextTriggers array enables fuzzy matching from
// the search input and inline explainer components.
// ---------------------------------------------------------------------------

export type MechanicsCategory =
  | 'attack'
  | 'saving_throw'
  | 'ability_check'
  | 'damage'
  | 'conditions'
  | 'action_economy'
  | 'spellcasting'

export interface MechanicsEntry {
  id: string
  question: string
  shortAnswer: string
  fullExplanation: string
  category: MechanicsCategory
  contextTriggers: string[]
}

export const MECHANICS_CATEGORIES: { id: MechanicsCategory; label: string }[] = [
  { id: 'attack', label: 'Attack' },
  { id: 'saving_throw', label: 'Saving Throw' },
  { id: 'ability_check', label: 'Ability Check' },
  { id: 'damage', label: 'Damage' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'action_economy', label: 'Action Economy' },
  { id: 'spellcasting', label: 'Spellcasting' },
]

export const MECHANICS_REFERENCE: MechanicsEntry[] = [
  // ─── Attack ────────────────────────────────────────────────────────────────
  {
    id: 'attack-roll',
    question: 'How do I make an attack roll?',
    shortAnswer: 'Roll d20 + ability modifier + proficiency bonus (if proficient). Meet or beat the target\'s AC to hit.',
    fullExplanation: `To make an attack roll:

1. Roll a d20.
2. Add the relevant ability modifier:
   - Melee weapons: Strength (or Dexterity for Finesse weapons)
   - Ranged weapons: Dexterity
   - Spell attacks: Your spellcasting ability modifier
3. Add your proficiency bonus if you are proficient with the weapon or casting a spell.
4. Compare the total to the target's Armor Class (AC).
5. If your total equals or exceeds the AC, the attack hits.

Special cases:
- Natural 20: Always hits and is a critical hit (double damage dice).
- Natural 1: Always misses regardless of modifiers.`,
    category: 'attack',
    contextTriggers: ['attack roll', 'hit', 'AC', 'armor class', 'to hit', 'attack bonus', 'd20', 'melee', 'ranged'],
  },
  {
    id: 'critical-hits',
    question: 'How do critical hits work?',
    shortAnswer: 'On a natural 20, the attack hits automatically. Roll all damage dice twice, then add modifiers once.',
    fullExplanation: `Critical hits occur when you roll a natural 20 on the d20 for an attack roll.

Rules:
1. The attack automatically hits regardless of the target's AC.
2. Roll all of the attack's damage dice twice. For example, if you normally deal 2d6 + 4 damage, roll 4d6 + 4 on a crit.
3. Flat modifiers (ability mod, magic bonuses) are added only once, not doubled.
4. Additional dice from features (like Sneak Attack or Divine Smite) are also doubled.

2024 Rules Update: Only the weapon's or spell's base damage dice are doubled. Extra dice from class features may or may not be doubled depending on the specific feature's wording.

Note: Spells that require attack rolls can also crit. Spells that require saving throws cannot crit.`,
    category: 'attack',
    contextTriggers: ['critical hit', 'crit', 'natural 20', 'nat 20', 'double damage', 'critical'],
  },
  {
    id: 'multiattack',
    question: 'How does multiattack work?',
    shortAnswer: 'Extra Attack lets you attack multiple times when you take the Attack action. Each is a separate roll.',
    fullExplanation: `Multiattack (Extra Attack) allows martial characters to make multiple attacks as part of a single Attack action.

How it works:
1. When you take the Attack action on your turn, you can make additional attacks based on your class level.
2. Fighters get the most: 2 attacks at level 5, 3 at level 11, and 4 at level 20.
3. Most other martial classes (Paladin, Ranger, Barbarian, Monk) get 2 attacks at level 5.
4. Each attack is a separate roll with a separate target if desired.
5. You can move between attacks.
6. You can mix weapon attacks and special actions (like grapple or shove) between your attacks.

Important: Extra Attack only applies when you take the Attack action. It does not apply to opportunity attacks, bonus action attacks, or reaction attacks unless a feature specifically says so.`,
    category: 'attack',
    contextTriggers: ['multiattack', 'extra attack', 'multiple attacks', 'attack action', 'two attacks'],
  },
  {
    id: 'opportunity-attack',
    question: 'How does opportunity attack work?',
    shortAnswer: 'When an enemy leaves your reach without Disengaging, you can use your reaction to make one melee attack.',
    fullExplanation: `An opportunity attack is a reaction triggered when a creature you can see moves out of your melee reach.

Rules:
1. You must use your reaction (one per round, resets at the start of your turn).
2. You make one melee attack against the triggering creature.
3. The attack occurs just before the creature leaves your reach.
4. Only triggered by voluntary movement — forced movement (push, pull, teleportation) does not trigger it.

Ways to avoid opportunity attacks:
- Take the Disengage action (uses your action).
- Teleportation spells (Misty Step, Thunder Step).
- Being moved by another creature's ability.
- Some features grant immunity (Rogue's Mobile feat, etc.).

Note: You can only make one opportunity attack per round since it uses your reaction.`,
    category: 'attack',
    contextTriggers: ['opportunity attack', 'AoO', 'reaction attack', 'leave reach', 'disengage', 'provoke'],
  },

  // ─── Saving Throws ─────────────────────────────────────────────────────────
  {
    id: 'saving-throws',
    question: 'How do saving throws work?',
    shortAnswer: 'Roll d20 + ability modifier + proficiency bonus (if proficient). Meet or beat the DC to resist the effect.',
    fullExplanation: `A saving throw (save) represents your attempt to resist a spell, trap, poison, or other harmful effect.

How to make a saving throw:
1. Roll a d20.
2. Add the relevant ability modifier (the effect tells you which: STR, DEX, CON, INT, WIS, or CHA).
3. Add your proficiency bonus if you are proficient in that saving throw.
4. Compare the total to the Difficulty Class (DC) set by the effect.
5. If your total equals or exceeds the DC, you succeed (usually taking reduced or no effect).

Proficiency: Each class grants proficiency in two saving throw types at level 1. Some items, feats, or features grant additional proficiencies.

Common saving throws:
- DEX: Dodging area effects (Fireball, traps)
- CON: Resisting poison, maintaining concentration
- WIS: Resisting charm, fear, mental effects
- STR: Resisting being moved or restrained physically
- INT: Resisting psychic effects or illusions
- CHA: Resisting banishment or possession`,
    category: 'saving_throw',
    contextTriggers: ['saving throw', 'save', 'DC', 'difficulty class', 'resist', 'DEX save', 'CON save', 'WIS save'],
  },

  // ─── Ability Checks ────────────────────────────────────────────────────────
  {
    id: 'ability-check',
    question: 'What is an ability check?',
    shortAnswer: 'Roll d20 + ability modifier + proficiency bonus (if proficient in the relevant skill). Meet or beat the DC.',
    fullExplanation: `An ability check tests a character's talent and training to overcome a challenge.

How to make an ability check:
1. The DM determines which ability score applies (STR, DEX, CON, INT, WIS, or CHA).
2. The DM may also specify a relevant skill (e.g., Athletics for STR, Stealth for DEX).
3. Roll a d20.
4. Add the relevant ability modifier.
5. If you are proficient in the associated skill, add your proficiency bonus.
6. If you have expertise in the skill, add double your proficiency bonus.
7. Compare the total to the DC set by the DM.

Common DCs:
- 5: Very Easy
- 10: Easy
- 15: Medium
- 20: Hard
- 25: Very Hard
- 30: Nearly Impossible

Contests: When two creatures compete, both make ability checks and the higher total wins.`,
    category: 'ability_check',
    contextTriggers: ['ability check', 'skill check', 'skill roll', 'proficiency', 'expertise', 'DC', 'contest'],
  },
  {
    id: 'advantage-disadvantage',
    question: 'How does advantage/disadvantage work?',
    shortAnswer: 'Roll 2d20. With advantage, take the higher. With disadvantage, take the lower. They cancel each other out.',
    fullExplanation: `Advantage and disadvantage reflect favorable or unfavorable circumstances.

Advantage: Roll two d20s and use the higher result.
Disadvantage: Roll two d20s and use the lower result.

Key rules:
1. Multiple sources of advantage don't stack — you still only roll 2d20.
2. Multiple sources of disadvantage don't stack either.
3. If you have ANY source of advantage AND ANY source of disadvantage, they cancel out completely. You roll normally with a single d20, regardless of how many sources of each you have.
4. Advantage/disadvantage applies to the d20 roll itself, not to damage.

Common sources of advantage:
- Attacking an unseen target (Hidden condition)
- Help action from an ally
- Attacking a prone target with melee
- Reckless Attack (Barbarian)
- Faerie Fire spell

Common sources of disadvantage:
- Attacking a target you can't see
- Attacking a prone target with ranged
- Poisoned condition
- Restrained or prone attacker
- Long range on ranged weapons`,
    category: 'ability_check',
    contextTriggers: ['advantage', 'disadvantage', 'adv', 'disadv', 'two d20', 'cancel out'],
  },
  {
    id: 'proficiency-bonus',
    question: 'What is proficiency bonus?',
    shortAnswer: 'A bonus that scales with your total character level: +2 at levels 1-4, increasing to +6 at levels 17-20.',
    fullExplanation: `Your proficiency bonus reflects your training and experience as an adventurer.

Proficiency bonus by level:
- Levels 1-4: +2
- Levels 5-8: +3
- Levels 9-12: +4
- Levels 13-16: +5
- Levels 17-20: +6

When to add your proficiency bonus:
1. Attack rolls with weapons you are proficient in.
2. Attack rolls with spells.
3. Saving throws you are proficient in.
4. Ability checks using skills you are proficient in.
5. Ability checks with tools you are proficient with.
6. Spell save DC calculation (8 + proficiency + casting mod).

Important notes:
- You never add your proficiency bonus more than once to a single roll.
- Expertise doubles it for specific skills (Rogue, Bard, certain feats).
- Multiclassing: Proficiency bonus is based on total character level, not class level.`,
    category: 'ability_check',
    contextTriggers: ['proficiency bonus', 'proficiency', 'prof bonus', 'proficient', '+2', '+3', '+4', '+5', '+6'],
  },

  // ─── Damage ────────────────────────────────────────────────────────────────
  {
    id: 'zero-hp',
    question: 'What happens at 0 HP?',
    shortAnswer: 'You fall unconscious and start making death saving throws at the start of each turn.',
    fullExplanation: `When a creature drops to 0 hit points:

1. You fall unconscious (the Unconscious condition).
2. You drop whatever you are holding and fall prone.
3. At the start of each of your turns, you make a death saving throw.
4. You are stable if you roll 3 successes before 3 failures.
5. You die if you accumulate 3 failures.

Special cases:
- Massive damage: If remaining damage after reaching 0 HP equals or exceeds your hit point maximum, you die instantly.
- Healing at 0 HP: Any healing brings you back to consciousness with the healed amount as your current HP. Death saves reset.
- Taking damage at 0 HP: Each hit counts as a death save failure. Critical hits from within 5 feet count as 2 failures.
- Stable: If you stabilize (3 successes or Spare the Dying), you remain unconscious but stop making saves. After 1d4 hours you regain 1 HP.`,
    category: 'damage',
    contextTriggers: ['0 HP', 'zero hit points', 'knocked out', 'unconscious', 'drop to 0', 'dying', 'fall unconscious'],
  },
  {
    id: 'death-saves',
    question: 'How do death saves work?',
    shortAnswer: 'Roll d20 at the start of your turn: 10+ is a success, 9 or below is a failure. 3 successes = stable, 3 failures = death.',
    fullExplanation: `Death saving throws determine whether a character at 0 HP stabilizes or dies.

How they work:
1. At the start of each of your turns while at 0 HP, roll a d20.
2. A result of 10 or higher is a success.
3. A result of 9 or lower is a failure.
4. Three successes: You become stable (unconscious but no longer dying).
5. Three failures: Your character dies.

Special rolls:
- Natural 20: You regain 1 hit point immediately (conscious, death saves reset).
- Natural 1: Counts as two failures.

Modifiers: Death saves are NOT ability checks — you typically do not add any modifiers unless a specific feature says so (like the Paladin's Aura of Protection).

Other ways to affect death saves:
- Taking damage while at 0 HP: Each hit is an automatic failure. Crits from within 5 ft = 2 failures.
- Any healing: Resets death saves and restores consciousness.
- Spare the Dying cantrip: Stabilizes without healing.
- Medicine check (DC 10): Stabilizes the creature.`,
    category: 'damage',
    contextTriggers: ['death save', 'death saving throw', 'dying', 'stabilize', 'stable', 'natural 20 death', 'fail death'],
  },
  {
    id: 'healing',
    question: 'How does healing work?',
    shortAnswer: 'Healing restores HP up to your maximum. It cannot exceed max HP. Healing from 0 HP makes you conscious again.',
    fullExplanation: `Healing in D&D restores lost hit points.

Key rules:
1. Healing can never raise your current HP above your hit point maximum.
2. If you are at 0 HP and receive healing, you regain consciousness with HP equal to the amount healed. Death saves reset immediately.
3. Healing has no effect on dead creatures (unless the spell specifically says it can, like Revivify).

Sources of healing:
- Spells: Cure Wounds, Healing Word, Mass Healing Word, Heal, etc.
- Potions: Potion of Healing (2d4+2), Greater (4d4+4), Superior (8d4+8), Supreme (10d4+20).
- Class features: Lay on Hands (Paladin), Second Wind (Fighter), Hit Dice during short rest.
- Short rest: Spend Hit Dice (your class die + CON mod per die).
- Long rest: Regain all HP and half your spent Hit Dice (minimum 1).

Important: Most healing spells require an action or bonus action, and many have a range of touch or 60 feet.`,
    category: 'damage',
    contextTriggers: ['healing', 'heal', 'cure', 'restore HP', 'hit points', 'potion', 'lay on hands', 'hit dice'],
  },
  {
    id: 'temporary-hp',
    question: 'What is temporary HP?',
    shortAnswer: 'Extra buffer HP that absorbs damage first. Does not stack (use highest). Cannot be healed. Lasts until depleted or rest.',
    fullExplanation: `Temporary hit points are a buffer of extra HP that absorbs damage before your actual HP.

Key rules:
1. Temp HP absorbs damage first, then remaining damage comes from your actual HP.
2. Temp HP does NOT stack. If you receive temp HP while you already have some, choose the higher value (don't add them).
3. Temp HP cannot be restored by healing — they aren't real hit points.
4. Temp HP last until they are depleted or you finish a long rest (unless a duration specifies otherwise).
5. Temp HP can exist even at full HP — they sit "on top" of your maximum.

Common sources:
- Heroism spell (Paladin/Bard): Gain temp HP equal to spellcasting mod each turn.
- Armor of Agathys (Warlock): Gain 5 temp HP per spell level.
- Inspiring Leader feat: Grant temp HP to party after a speech.
- False Life spell: 1d4+4 temp HP.
- Fiendish Vigor invocation (Warlock): At-will False Life.`,
    category: 'damage',
    contextTriggers: ['temporary HP', 'temp HP', 'temporary hit points', 'buffer', 'does not stack', 'absorb damage'],
  },

  // ─── Conditions ────────────────────────────────────────────────────────────
  {
    id: 'conditions',
    question: 'How do conditions work?',
    shortAnswer: 'Conditions impose specific mechanical effects. They last until cured, dispelled, or their duration ends.',
    fullExplanation: `Conditions are status effects that alter a creature's capabilities. Here are the most common:

Blinded: Cannot see. Auto-fail checks requiring sight. Attack rolls against you have advantage. Your attacks have disadvantage.

Charmed: Cannot attack or target the charmer with harmful abilities. The charmer has advantage on social checks against you.

Frightened: Disadvantage on ability checks and attack rolls while you can see the source. Cannot willingly move closer to the source.

Grappled: Speed becomes 0. Ends if grappler is incapacitated or you are moved out of reach.

Incapacitated: Cannot take actions or reactions.

Invisible: Impossible to see without special sense. Attacks against you have disadvantage. Your attacks have advantage.

Paralyzed: Incapacitated, cannot move or speak. Auto-fail STR and DEX saves. Attacks have advantage. Hits within 5 ft are crits.

Poisoned: Disadvantage on attack rolls and ability checks.

Prone: Disadvantage on attack rolls. Melee attacks against you have advantage, ranged attacks have disadvantage. Standing costs half movement.

Restrained: Speed 0. Attacks against you have advantage. Your attacks have disadvantage. Disadvantage on DEX saves.

Stunned: Incapacitated, cannot move, can only speak falteringly. Auto-fail STR and DEX saves. Attacks against you have advantage.

Unconscious: Incapacitated, cannot move or speak, unaware. Drop held items, fall prone. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5 ft are crits.`,
    category: 'conditions',
    contextTriggers: ['condition', 'blinded', 'charmed', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'status effect'],
  },
  {
    id: 'grappling',
    question: 'How does grappling work?',
    shortAnswer: 'Use an attack to grab: your Athletics vs. their Athletics or Acrobatics. Success sets their speed to 0.',
    fullExplanation: `Grappling is a special melee attack that restrains a creature's movement.

To initiate a grapple:
1. You must have a free hand.
2. Use one of your attacks (part of the Attack action) to attempt a grapple.
3. Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics) — target chooses.
4. On success, the target gains the Grappled condition (speed = 0).

While grappling:
- The grappled creature's speed is 0.
- You can drag or carry the grappled creature, but your speed is halved (unless the creature is two or more sizes smaller).
- You can attack normally with your other hand.
- The grapple does NOT give advantage on attacks (unless you also shove them prone).

Ending a grapple:
- The grappled creature uses its action to escape: Athletics or Acrobatics vs. your Athletics.
- The grappler is incapacitated.
- The grappler lets go (free).
- The creatures are forced apart (Thunderwave, etc.).

Combo: Grapple + Shove Prone = target has 0 speed and cannot stand up, giving you advantage on melee attacks.`,
    category: 'conditions',
    contextTriggers: ['grapple', 'grappling', 'grab', 'grappled', 'athletics', 'restrain', 'shove'],
  },
  {
    id: 'cover',
    question: 'How does cover work?',
    shortAnswer: 'Half cover: +2 AC/DEX saves. Three-quarters cover: +5 AC/DEX saves. Total cover: Cannot be targeted directly.',
    fullExplanation: `Cover provides protection by physically blocking attacks and area effects.

Three levels of cover:

Half Cover (+2 AC, +2 DEX saves):
- A low wall, large piece of furniture, another creature, or narrow tree trunk.
- About half the target's body is blocked.

Three-Quarters Cover (+5 AC, +5 DEX saves):
- A portcullis, arrow slit, or thick tree trunk.
- About three-quarters of the target is blocked.

Total Cover (cannot be targeted):
- Completely concealed behind a wall or obstacle.
- Cannot be targeted directly by attacks or spells (unless the spell can go around corners).
- Area effects still may reach behind total cover if they specify they spread around corners.

Important notes:
- Cover is relative to the attacker's position. You might have cover from one enemy but not another.
- Other creatures can provide half cover.
- You can crouch behind half cover to potentially gain three-quarters cover (DM discretion).
- The Shield spell effectively simulates partial cover (+5 AC).`,
    category: 'conditions',
    contextTriggers: ['cover', 'half cover', 'three-quarters cover', 'total cover', 'AC bonus', 'obstacle', 'protection'],
  },

  // ─── Action Economy ────────────────────────────────────────────────────────
  {
    id: 'action-types',
    question: 'What are the action types in combat?',
    shortAnswer: 'Each turn: 1 Action + 1 Bonus Action + 1 Reaction + Movement. Free interactions (open door, draw weapon) also available.',
    fullExplanation: `On each turn in combat, you have the following resources:

Action (1 per turn): Your main activity.
- Attack: Make weapon attack(s) or unarmed strikes.
- Cast a Spell: Cast a spell with a casting time of "1 Action."
- Dash: Double your movement for the turn.
- Disengage: Your movement doesn't provoke opportunity attacks.
- Dodge: Attacks against you have disadvantage; advantage on DEX saves.
- Help: Give an ally advantage on their next check or attack.
- Hide: Make a Stealth check to become hidden.
- Ready: Prepare an action to trigger on a specific condition (uses your reaction).
- Use an Object: Interact with a complex object or use an item.

Bonus Action (1 per turn): Only if a spell, feature, or ability grants one.
- Cannot be exchanged for a regular action.
- Examples: Two-weapon fighting second attack, Healing Word, Cunning Action (Rogue), Rage (Barbarian).

Reaction (1 per round, resets at your turn start):
- Opportunity attack, Shield spell, Counterspell, Absorb Elements.
- Only usable when triggered by a specific event.

Movement: Move up to your speed. Can be split before/after actions.

Free Object Interaction (1 per turn): Open a door, draw/sheathe a weapon, pick up an item.`,
    category: 'action_economy',
    contextTriggers: ['action', 'bonus action', 'reaction', 'movement', 'turn', 'action economy', 'combat turn', 'what can I do'],
  },
  {
    id: 'bonus-actions',
    question: 'How do bonus actions work?',
    shortAnswer: 'You get one per turn, but only if a feature or spell explicitly grants one. Cannot replace an action.',
    fullExplanation: `A bonus action is a swift additional activity on your turn.

Key rules:
1. You only have a bonus action if a class feature, spell, or ability says you can do something "as a bonus action."
2. You get at most one bonus action per turn.
3. A bonus action CANNOT be used as a regular action (you cannot "downgrade" it).
4. You choose when during your turn to take it (before, between, or after other activities) unless the timing is specified.
5. If something prevents you from taking actions (like the Incapacitated condition), you also cannot take bonus actions.

Common bonus actions:
- Two-Weapon Fighting: Make an off-hand attack (light weapons).
- Cunning Action (Rogue): Dash, Disengage, or Hide.
- Healing Word / Misty Step / Spiritual Weapon: Bonus action spells.
- Rage (Barbarian): Enter rage.
- Flurry of Blows (Monk): Additional unarmed strikes.
- Commanding a summoned creature.
- Shield Master feat: Shove after Attack action.

Important: If you cast a spell as a bonus action, you can only cast a cantrip with your action (no full leveled spells).`,
    category: 'action_economy',
    contextTriggers: ['bonus action', 'bonus', 'swift action', 'off-hand', 'two-weapon', 'cunning action', 'healing word'],
  },
  {
    id: 'reactions',
    question: 'How do reactions work?',
    shortAnswer: 'One per round (resets at your turn start). Triggered by a specific event. Common: opportunity attack, Shield, Counterspell.',
    fullExplanation: `A reaction is a special response to a triggering event that happens on any creature's turn.

Key rules:
1. You get one reaction per round (resets at the start of your turn).
2. A reaction can occur on your turn or someone else's turn.
3. Each reaction has a specific trigger that must occur before you can use it.
4. You can choose NOT to use a reaction even if its trigger occurs.
5. If you are surprised at the start of combat, you cannot take reactions until after your first turn.

Common reactions:
- Opportunity Attack: Enemy leaves your reach without Disengaging.
- Shield (spell): +5 AC until your next turn start, triggered by being hit.
- Counterspell: Triggered when you see a creature casting a spell within 60 ft.
- Absorb Elements: Triggered when you take elemental damage.
- Hellish Rebuke: Triggered when you take damage.
- Uncanny Dodge (Rogue): Halve damage from one attack you can see.
- Parry (Battle Master): Reduce melee damage taken.
- Sentinel feat attack: Triggered when enemy attacks someone else in your reach.

The Ready action also uses your reaction to execute the prepared activity.`,
    category: 'action_economy',
    contextTriggers: ['reaction', 'reactions', 'shield spell', 'counterspell', 'opportunity attack', 'trigger', 'per round'],
  },
  {
    id: 'help-action',
    question: 'What is the Help action?',
    shortAnswer: 'Give one ally advantage on their next ability check or attack roll against a target within 5 ft of you.',
    fullExplanation: `The Help action lets you assist another creature in their task.

Two uses:

1. Help with an ability check:
   - You assist one creature with a task.
   - That creature gains advantage on the next ability check it makes for that task.
   - You must be able to reasonably assist (DM discretion).
   - Must be made before the start of your next turn.

2. Help with an attack:
   - You distract a target within 5 feet of you.
   - The next attack roll by one of your allies against that target has advantage.
   - Must be made before the start of your next turn.
   - You must be within 5 feet of the target you are distracting.

Important notes:
- Help uses your action for the turn.
- The advantage only applies to the very next relevant roll, then it is used up.
- Some features improve the Help action (Mastermind Rogue can do it at 30 ft range as a bonus action).
- Familiars (from Find Familiar) can take the Help action, giving advantage without using your action.`,
    category: 'action_economy',
    contextTriggers: ['help action', 'help', 'assist', 'aid', 'give advantage', 'ally advantage'],
  },
  {
    id: 'dodge-action',
    question: 'How does Dodge action work?',
    shortAnswer: 'Until your next turn, attacks against you have disadvantage and you have advantage on DEX saves. Ends if incapacitated or speed drops to 0.',
    fullExplanation: `The Dodge action focuses your attention entirely on avoiding attacks.

Effects (until the start of your next turn):
1. Any attack roll against you has disadvantage, as long as you can see the attacker.
2. You have advantage on Dexterity saving throws.

Ends early if:
- You are incapacitated.
- Your speed drops to 0.

When to use Dodge:
- You are surrounded and cannot escape — Dodge reduces incoming damage more than one attack would.
- You are concentrating on a critical spell and need to avoid hits.
- Waiting for allies to arrive or holding a position.
- You have already used all your other useful options.

Tactical note: Dodge is often underused! If a tanky character doesn't have a good target to attack, Dodging can be more valuable than swinging at a heavily armored foe. Combined with a high AC, it makes you extremely hard to hit.`,
    category: 'action_economy',
    contextTriggers: ['dodge', 'dodge action', 'avoid attacks', 'disadvantage on attacks', 'DEX save advantage'],
  },

  // ─── Spellcasting ──────────────────────────────────────────────────────────
  {
    id: 'concentration',
    question: 'How does concentration work?',
    shortAnswer: 'Only one concentration spell at a time. Take damage = CON save (DC 10 or half damage, whichever is higher) or lose it.',
    fullExplanation: `Concentration is a mechanic that limits how many ongoing spells you can maintain.

Rules:
1. You can only concentrate on ONE spell at a time.
2. Casting a new concentration spell ends the previous one immediately.
3. You can end concentration voluntarily at any time (no action required).
4. Concentration is broken if you are incapacitated or killed.

Concentration checks (Constitution saving throws):
- Triggered each time you take damage while concentrating.
- DC = 10 or half the damage taken, whichever is HIGHER.
- If you take damage from multiple sources, make a separate save for each.
- War Caster feat grants advantage on these saves.
- Proficiency in CON saves helps significantly.

Tips for maintaining concentration:
- Take the Dodge action to reduce hits.
- Stay behind cover.
- Use features that reduce damage (Shield, Absorb Elements).
- Position away from enemies.
- War Caster feat and Resilient (CON) are top-tier for casters.

Common concentration spells: Bless, Haste, Hold Person, Spirit Guardians, Wall of Fire, Hypnotic Pattern.`,
    category: 'spellcasting',
    contextTriggers: ['concentration', 'concentrate', 'concentration check', 'maintain spell', 'CON save', 'war caster', 'lose concentration'],
  },
  {
    id: 'spell-slots',
    question: 'How do spell slots work?',
    shortAnswer: 'Spell slots are your fuel for casting. Each non-cantrip spell costs one slot of its level or higher. Slots return on long rest.',
    fullExplanation: `Spell slots represent your magical energy available for casting spells.

How they work:
1. Each spell has a level (1st through 9th). Cantrips (0th level) don't use slots.
2. To cast a spell, you expend one spell slot of the spell's level or higher.
3. Casting a spell at a higher level often increases its effect (e.g., more damage dice).
4. Used slots are restored after a long rest (8 hours).

Class-specific rules:
- Full casters (Wizard, Cleric, Druid, Sorcerer, Bard): Get slots up to 9th level.
- Half casters (Paladin, Ranger): Get slots up to 5th level.
- Warlocks: Have fewer slots (1-4) but recover them on short rests. Their slots are always at their highest level.
- Multiclass: Slot progression is calculated using combined half/full caster levels.

Important notes:
- Spell slots are NOT tied to specific spells. A 3rd-level slot can cast any 3rd-level (or lower) spell you know/have prepared.
- You have a limited number of slots per day — resource management is key.
- Arcane Recovery (Wizard) and Font of Magic (Sorcerer) can restore some slots.`,
    category: 'spellcasting',
    contextTriggers: ['spell slot', 'spell slots', 'slot', 'expend', 'cast spell', 'higher level', 'long rest', 'warlock slots'],
  },
  {
    id: 'spellcasting-general',
    question: 'How does spellcasting work?',
    shortAnswer: 'Know or prepare spells, expend a slot to cast, use your spellcasting ability for attack/DC. Cantrips are free.',
    fullExplanation: `Spellcasting is the system by which magical characters cast spells.

Key components:

1. Spellcasting Ability: Determines your spell attack bonus and save DC.
   - Wizard: Intelligence
   - Cleric/Druid/Ranger: Wisdom
   - Sorcerer/Bard/Paladin/Warlock: Charisma
   - Spell Save DC = 8 + proficiency bonus + spellcasting ability modifier
   - Spell Attack Bonus = proficiency bonus + spellcasting ability modifier

2. Spell Components:
   - Verbal (V): Must be able to speak.
   - Somatic (S): Must have a free hand (or use a focus/component pouch).
   - Material (M): Need the listed material or a component pouch/arcane focus (unless the material has a gold cost or is consumed).

3. Casting Time:
   - 1 Action: Most common.
   - Bonus Action: Quick spells (Healing Word, Misty Step). Limits your action to cantrips only.
   - Reaction: Triggered by events (Shield, Counterspell).
   - Ritual: Cast without a slot by adding 10 minutes to casting time.

4. Range, Area, Duration: Each spell specifies these. Read them carefully.

5. Cantrips: Free to cast, no slot needed, scale with character level (not class level).`,
    category: 'spellcasting',
    contextTriggers: ['spellcasting', 'cast a spell', 'spell components', 'verbal', 'somatic', 'material', 'casting', 'arcane focus'],
  },
  {
    id: 'spell-save-dc',
    question: 'What is spell save DC?',
    shortAnswer: '8 + proficiency bonus + spellcasting ability modifier. This is the number enemies must beat on their saving throw.',
    fullExplanation: `Spell Save DC (Difficulty Class) is the target number enemies must meet or beat on their saving throw to resist your spells.

Formula: 8 + Proficiency Bonus + Spellcasting Ability Modifier

Example: A level 5 Wizard with 18 Intelligence:
- Proficiency bonus: +3
- Intelligence modifier: +4
- Spell Save DC = 8 + 3 + 4 = 15

What it means: When you cast Fireball and an enemy must make a DEX save, they need to roll 15 or higher (including their modifiers) to take only half damage.

How to increase your DC:
- Level up (proficiency bonus increases).
- Increase your spellcasting ability score (ASI or magic items).
- Rare magic items (Robe of the Archmagi, Tome of Clear Thought, etc.).
- Ioun stones that boost your ability score.

Important: Your DC is the same for ALL your spells. A 1st-level spell and a 9th-level spell use the same DC.

Related: Spell Attack Bonus = Proficiency + Spellcasting Mod (used for attack roll spells like Fire Bolt, Guiding Bolt).`,
    category: 'spellcasting',
    contextTriggers: ['spell save DC', 'save DC', 'difficulty class', 'spell DC', 'spell attack', 'attack bonus', 'spellcasting modifier'],
  },
  {
    id: 'prepared-spells',
    question: 'How do prepared spells work?',
    shortAnswer: 'After a long rest, choose spells from your class list equal to ability mod + class level (varies by class). Can change daily.',
    fullExplanation: `Prepared spells represent the magic you have readied for the day.

How preparation works:
1. After a long rest, you choose which spells to prepare from your available list.
2. The number you can prepare = spellcasting ability modifier + class level (varies by class).
3. You can change your prepared spells after each long rest.
4. Cantrips are always available and don't count against your prepared limit.

By class:
- Cleric/Druid: Prepare from your ENTIRE class spell list. Mod + class level spells.
- Paladin: Prepare from the Paladin list. CHA mod + half Paladin level (rounded down).
- Wizard: Prepare from spells WRITTEN IN YOUR SPELLBOOK. INT mod + Wizard level.
- Sorcerer/Bard/Warlock/Ranger: Do NOT prepare spells. They "know" a fixed number of spells and can swap one per long rest (2024 rules).

Key differences:
- Prepared casters are more flexible day-to-day but must plan ahead.
- Known casters are more consistent but less adaptable.
- All prepared spells can be cast with any available slot of the appropriate level.

Tip: Always prepare at least one utility spell, one healing spell (if available), and situational spells based on expected encounters.`,
    category: 'spellcasting',
    contextTriggers: ['prepared spells', 'prepare', 'preparation', 'known spells', 'change spells', 'long rest spells', 'spell list'],
  },
]

/**
 * Search the mechanics reference by matching a query string against questions,
 * short answers, and context triggers.
 */
export function searchMechanics(query: string, category?: MechanicsCategory): MechanicsEntry[] {
  let entries = MECHANICS_REFERENCE

  if (category) {
    entries = entries.filter(e => e.category === category)
  }

  if (!query.trim()) return entries

  const q = query.toLowerCase().trim()
  const terms = q.split(/\s+/)

  return entries.filter(entry => {
    const searchableText = [
      entry.question,
      entry.shortAnswer,
      ...entry.contextTriggers,
    ]
      .join(' ')
      .toLowerCase()

    // All terms must match somewhere
    return terms.every(term => searchableText.includes(term))
  })
}
