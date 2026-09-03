import type { SeedCombo } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7 — COMBOS

   Fourteen. Slice 5 wrote the first three from the mockup; slice 6 wrote the
   other eleven to cover the Paladin's 1st- and 2nd-level spells, prepared or
   not, which is the scope Marcus asked for in his own words: *"executable for
   the spells that are unlocked for me now, all level 1 and level 2 spells,
   even if I do not have them prepared… so I know what kind of combos and
   tactics require what abilities and spells."*

   SOURCES, per claim. `paladin_1.txt` for the class table, Lay on Hands,
   Paladin's Smite and Faithful Steed. `paladin_2.txt` for the 1st- and
   2nd-level spell list and what each spell is for. `paladin_oath_of_the_hearth
   .txt` for the oath spells, the Hearthfire cloak and Aura of Solace.
   `CORRECTIONS.md` for the 2024 rules that differ from 2014 — one slot per
   turn, Divine Smite as a Bonus Action spell, Lesser Restoration as a Bonus
   Action, Incapacitated breaking Concentration. `WARFARE-DOCTRINE.md` for the
   doctrine — the opening round, the Concentration menu, smite discipline, the
   damage-type gap, the healing order and the death protocol. `HEARTH-ERRATA.md`
   for Damage Relocation, the temp-HP trap and the Warding Bond duplication.

   WHERE THE DICE COME FROM, AND THE ONE HONEST GAP. Marcus's files say what
   each spell is FOR; they are guides and errata, not a spellbook. The exact
   dice and areas — 3d6 in a 15-foot cone, three rays of 2d6, +1d4 on a hit —
   are 2024 PHB constants written from general knowledge, the same way the
   spell names themselves are. They are not flagged per-card, because a warning
   on all fourteen cards is a warning on none. The three rules that ARE flagged
   per-card — Interception, Sentinel and Graze — are flagged because his files
   NAME them and then never define them, which is a different and more
   dangerous kind of gap: it reads as sourced when it is not.

   THREE RULES THIS FILE OBEYS AND THE COMPILER CANNOT ENFORCE.

   1. NO DERIVED NUMBER IS WRITTEN DOWN. `{{cloakTempHp}}`, never "10". Spell
      constants — 3d8, a 20-foot cube, a 60-foot range — are not derived and
      are written plainly, because they are the same for every character who
      casts the spell. `WARFARE-DOCTRINE.md` is written against Charisma 18 and
      every CHA-derived number in it is therefore wrong for this character;
      tokens are why quoting it is safe.

   2. NO PARTY TOKEN EVER APPEARS ANYWHERE INSIDE A BLOCK, AND NONE IN `tags`.
      Every field of a block is load-bearing — `label`, `sourceName` AND
      `notes` — so a `{{wizard}}` in a block note drops the whole combo for a
      character with no party, exactly as it would in the label. Party names
      live in `annotations` and nowhere else. `prove-slice4.mjs` and
      `prove-slice5.mjs` both assert this on the glass.

   3. EVERY COMBO CARRIES ITS REQUIREMENTS, and they are written to be read
      backwards. The tactic "Preparing for Tomorrow" tells Marcus to build
      tomorrow's seven prepared spells by reading the REQ line off these cards.
      That instruction is a lie the moment one card has nothing to read, so
      `../pack-hearth-7.test.ts` requires all fourteen to carry one.

   WHAT THIS FILE DELIBERATELY DOES NOT COVER. Nine 1st- and 2nd-level spells
   make no turn: the four rituals (Detect Magic, Detect Poison and Disease,
   Gentle Repose, Purify Food and Drink), Zone of Truth, Locate Object, Prayer
   of Healing, Protection from Poison and Ceremony. A combo is a turn, so they
   are not combos. Slice 7 owns them in the preparation tactic. Find Steed is
   also absent here — Faithful Steed makes it free and its whole value is
   movement doctrine, which is a tactic and not a turn.
   ========================================================================== */

export const HEARTH_7_COMBOS: SeedCombo[] = [
  {
    id: 'seed:hearth-7:hearth-wall',
    name: 'Hearth Wall',
    description:
      'The turn you take when a charge is coming and the casters are behind you. '
      + 'Spends no spell slot at all — so next turn’s smite is still live.',
    category: 'defensive',
    blocks: [
      {
        id: 'seed:hearth-7:hearth-wall:1',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes: 'Summon it before anything is in reach. Costs no spell slot.',
      },
      {
        id: 'seed:hearth-7:hearth-wall:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes: 'Reach {{weaponReach}} ft: you threaten the lane without standing in it.',
      },
      {
        id: 'seed:hearth-7:hearth-wall:3',
        type: 'reaction',
        label: 'Channel Divinity → flaming cloak',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          '{{cloakTempHp}} temp HP (level {{level}} + Charisma {{chaMod}}). '
          + 'Anyone hitting you in melee takes 1d10 fire.',
      },
    ],
    requirements: ['Hearthfire Manifest', 'Channel Divinity'],
    annotations: [
      {
        kind: 'positioning',
        text:
          'Stand so the {{auraRadius}}-ft aura covers {{wizard}} and {{bard}}. '
          + 'Your reach means you can body-block the lane from a square behind '
          + 'the front rather than in it.',
      },
      {
        /* Deliberately the FIRST warning in the pack, and it is a rules
           warning rather than a sourcing one: temp HP not stacking is the
           single most common way this exact combo gets wasted at the table. */
        kind: 'warning',
        text:
          'Temporary hit points never stack. If you are already carrying any, '
          + 'the cloak’s {{cloakTempHp}} replaces nothing and the Channel '
          + 'Divinity is spent for the retaliation alone.',
      },
    ],
    tags: ['hearthfire', 'no-slot', 'front-line'],
  },

  {
    id: 'seed:hearth-7:one-slot-spent-right',
    name: 'One Slot, Spent Right',
    description:
      'The 2024 rule you will get wrong at the table: Divine Smite is a spell, '
      + 'and you may spend only one spell slot per turn. This is the most damage '
      + 'that rule allows.',
    category: 'burst',
    blocks: [
      {
        id: 'seed:hearth-7:one-slot-spent-right:1',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Swing, and look at the roll before you decide anything. Extra Attack '
          + 'gives you both swings whether or not you smite.',
      },
      {
        id: 'seed:hearth-7:one-slot-spent-right:2',
        type: 'bonus',
        label: 'Divine Smite — 2nd-level slot',
        source: 'spell',
        sourceName: 'Divine Smite',
        notes:
          '3d8 radiant, and +1d8 more against an Undead or a Fiend. Cast after '
          + 'the hit lands, never before — that is the whole advantage it has '
          + 'over the pre-cast smites. On a critical hit the dice double, so '
          + 'smite without hesitating.',
      },
    ],
    requirements: [
      'Divine Smite — always prepared, costs none of your seven picks',
      'A spell slot you have not already spent this turn',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'One slot per turn. Casting Divine Smite means you cannot also cast '
          + 'Bless, Shield of Faith or anything else with a slot this turn, and '
          + 'you cannot smite twice.',
      },
      {
        kind: 'warning',
        text:
          'Divine Smite costs your Bonus Action now. So does summoning the '
          + 'Hearthfire, so does Lay on Hands, so does Compelled Duel. Summon '
          + 'the manifest on a round you are not smiting.',
      },
      {
        /* The one legal way out of the law the two warnings above describe, and
           the reason it is a positioning note rather than a fourth block: it is
           a decision about WHICH TURN to take, not a step in this one. */
        kind: 'positioning',
        text:
          'Once per long rest, Paladin’s Smite lets you cast Divine Smite '
          + 'without expending a slot — and the law restricts expending. So one '
          + 'turn a day you may cast a slotted spell with your Action and smite '
          + 'for free with your Bonus Action. Save that turn for the thing that '
          + 'has to die.',
      },
      {
        kind: 'positioning',
        text:
          'Sequencing, with two swings: take the first. If it crits, smite it '
          + 'now. If it only hits, hold — take the second, and if THAT crits, '
          + 'smite that one instead. You get one smite either way, so let the '
          + 'dice choose which hit carries it.',
      },
    ],
    tags: ['smite', 'burst', 'one-slot-law', 'undead'],
  },

  {
    id: 'seed:hearth-7:faerie-fire-opening',
    name: 'Faerie Fire Opening',
    description:
      'Round one, before anyone is set. You trade your own damage for everyone '
      + 'else’s, and it is not close.',
    category: 'aoe',
    blocks: [
      {
        id: 'seed:hearth-7:faerie-fire-opening:1',
        type: 'action',
        label: 'Faerie Fire — 1st-level slot',
        source: 'spell',
        sourceName: 'Faerie Fire',
        notes:
          '20-foot cube, out to 60 feet. Dexterity save against DC {{saveDC}}. '
          + 'Everything that fails is outlined: attacks against it have advantage '
          + 'for a minute, and it cannot benefit from being invisible or hidden.',
      },
      {
        id: 'seed:hearth-7:faerie-fire-opening:2',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          'Free press: Faerie Fire uses your Action and not your Bonus Action. '
          + 'Never waste the bonus on a round you are not smiting.',
      },
      {
        id: 'seed:hearth-7:faerie-fire-opening:3',
        type: 'movement',
        label: 'Advance to {{weaponReach}} ft of the lit cluster',
        source: 'custom',
        notes:
          'Reach lets you arrive threatening without ending your move inside '
          + 'theirs.',
      },
    ],
    requirements: [
      'Faerie Fire — oath spell, always prepared',
      'A 1st-level spell slot',
      'Your Concentration free',
    ],
    annotations: [
      {
        kind: 'party',
        text:
          'Say it out loud before you cast. {{rogue}}’s Sneak Attack becomes '
          + 'automatic and {{ranger}} shoots with advantage for the whole minute. '
          + 'Two of them hitting is worth more than your 3d8.',
      },
      {
        kind: 'warning',
        text:
          'Faerie Fire is Concentration. While it is up you are not holding '
          + 'Bless or Shield of Faith, and a hit on you can end it.',
      },
      {
        kind: 'positioning',
        text:
          'It targets Dexterity — the save the heavy brutes fail, and the '
          + 'opposite profile to every smite spell you own. Aim it at armour, '
          + 'not at skirmishers.',
      },
    ],
    tags: ['opener', 'oath-spell', 'concentration', 'advantage'],
  },

  /* ──────────────────────────────────────────────────────────────────────
     SLICE 6 — the other eleven.
     ────────────────────────────────────────────────────────────────────── */

  {
    id: 'seed:hearth-7:the-cone-at-the-door',
    name: 'The Cone at the Door',
    description:
      'Three or more of them already inside your reach. The one turn where '
      + 'standing in the middle of a crowd is the correct thing to have done.',
    category: 'aoe',
    blocks: [
      {
        id: 'seed:hearth-7:the-cone-at-the-door:1',
        type: 'action',
        label: 'Burning Hands — 1st-level slot',
        source: 'spell',
        sourceName: 'Burning Hands',
        notes:
          '15-foot cone from your own hands. 3d6 fire, Dexterity save against '
          + 'DC {{saveDC}} for half. The cone starts at you, so everything it '
          + 'catches is already close enough to hit you back.',
      },
      {
        id: 'seed:hearth-7:the-cone-at-the-door:2',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          'Burning Hands takes your Action only. The bonus is still yours, and '
          + 'you are about to be surrounded — which is the cloak’s best moment.',
      },
    ],
    requirements: [
      'Burning Hands — oath spell, always prepared, costs none of your seven picks',
      'A 1st-level spell slot',
      'Three or more of them within 15 feet of you, in one arc',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Fire is the most commonly resisted damage type in the game — devils, '
          + 'fire giants, red dragons, salamanders, most demons. Against those, '
          + 'this card and half your subclass do nothing. Ask before you cast.',
      },
      {
        kind: 'positioning',
        text:
          'You are the only one at this table who can afford to be in the middle '
          + 'of them: heavy armour, a d10 hit die, and Aura of Solace halving '
          + 'the fire that comes back. Read the cone as a reward for the '
          + 'position, not a reason to take it.',
      },
      {
        kind: 'party',
        text:
          '{{wizard}} does area damage better than you do. Cast this on the '
          + 'round you are already standing in the crowd, not on the round '
          + '{{wizard}} was about to.',
      },
    ],
    tags: ['burning-hands', 'oath-spell', 'aoe', 'fire'],
  },

  {
    id: 'seed:hearth-7:nothing-in-reach',
    name: 'Nothing In Reach',
    description:
      'The round your whole kit fails: they are thirty feet away and you cannot '
      + 'close. A Paladin’s structural weakness, and this is the answer to it.',
    category: 'burst',
    blocks: [
      {
        id: 'seed:hearth-7:nothing-in-reach:1',
        type: 'action',
        label: 'Scorching Ray — 2nd-level slot',
        source: 'spell',
        sourceName: 'Scorching Ray',
        notes:
          'Three rays. Each is its own spell attack at {{spellAttack}}, each '
          + '2d6 fire. Put all three into one target or split them — decide '
          + 'after you see how the first lands.',
      },
      {
        id: 'seed:hearth-7:nothing-in-reach:2',
        type: 'movement',
        label: 'Close anyway',
        source: 'custom',
        notes:
          'Cast, then move. The rays do not need you to stand still, and every '
          + 'foot you cover is a foot you do not have to cover next round.',
      },
      {
        id: 'seed:hearth-7:nothing-in-reach:3',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          'The manifest is extinguished if it ends up more than 30 feet from '
          + 'you, so summon it on the round you are chasing, not before.',
      },
    ],
    requirements: [
      'Scorching Ray — oath spell, always prepared, costs none of your seven picks',
      'A 2nd-level spell slot',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'Three separate attack rolls means this is the only offensive spell '
          + 'you own that no saving throw can shrug off. Against something with '
          + 'a monstrous Dexterity save and poor AC, it beats Burning Hands and '
          + 'Faerie Fire both.',
      },
      {
        kind: 'warning',
        text:
          'Fire again. Between this, Burning Hands and the cloak, almost your '
          + 'whole ranged game is one damage type — and it is the one most '
          + 'often resisted. Carry a javelin or a handaxe as the answer that '
          + 'always works.',
      },
    ],
    tags: ['scorching-ray', 'oath-spell', 'ranged', 'fire'],
  },

  {
    id: 'seed:hearth-7:make-it-about-you',
    name: 'Make It About You',
    description:
      'One big enemy that is going to hurt your party. The only real taunt in '
      + 'the game, and it turns the fight into the one you win.',
    category: 'defensive',
    blocks: [
      {
        id: 'seed:hearth-7:make-it-about-you:1',
        type: 'bonus',
        label: 'Compelled Duel — 1st-level slot',
        source: 'spell',
        sourceName: 'Compelled Duel',
        notes:
          'Wisdom save against DC {{saveDC}}. On a failure it has disadvantage '
          + 'on every attack that is not against you, and it cannot willingly '
          + 'move away from you. Concentration, one minute.',
      },
      {
        id: 'seed:hearth-7:make-it-about-you:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'The duel ends the moment you attack anyone else, so there is nothing '
          + 'else to spend the action on. Hit the thing you claimed.',
      },
      {
        id: 'seed:hearth-7:make-it-about-you:3',
        type: 'movement',
        label: 'Walk backward',
        source: 'custom',
        notes:
          'It must follow you or break the compulsion’s movement clause. This '
          + 'is how you physically drag a boss off a downed ally and into the '
          + 'party’s kill zone.',
      },
    ],
    requirements: [
      'Compelled Duel — one of your seven prepared picks',
      'A 1st-level spell slot',
      'Your Concentration free',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Say it at the table: "I have taken the boss, somebody handle the '
          + 'adds." You have just promised not to attack anything else, and a '
          + 'party that does not hear you will assume you are still available.',
      },
      {
        kind: 'party',
        text:
          'This is what buys {{rogue}} and {{ranger}} a whole fight of free '
          + 'shooting, and it is what stops the boss walking past you to '
          + '{{wizard}}. It is worth more than any damage you would have dealt.',
      },
      {
        kind: 'warning',
        text:
          'Bonus Action AND a slot. So the round you duel is a round you do not '
          + 'smite — and it is Concentration, so it is also a round you are not '
          + 'holding Bless or Faerie Fire.',
      },
      {
        kind: 'positioning',
        text:
          'Command is the cheaper cousin: one word, one Wisdom save, one wasted '
          + 'enemy turn — Approach, Drop, Flee, Grovel or Halt. It is not '
          + 'Concentration. Prepare it when the fights are short and the duel '
          + 'is too slow to matter.',
      },
    ],
    tags: ['compelled-duel', 'taunt', 'defender', 'concentration'],
  },

  {
    id: 'seed:hearth-7:bless-before-the-door',
    name: 'Bless Before the Door',
    description:
      'The fight you expect to be long. You deal less damage this round and '
      + 'more every round after it — decide which fight you are in before '
      + 'initiative, not during it.',
    category: 'sustained',
    blocks: [
      {
        id: 'seed:hearth-7:bless-before-the-door:1',
        type: 'action',
        label: 'Bless — 1st-level slot',
        source: 'spell',
        sourceName: 'Bless',
        notes:
          'Three creatures, one minute, Concentration. Each of them adds 1d4 to '
          + 'every attack roll and every saving throw. Not once — every one, for '
          + 'the whole minute.',
      },
      {
        id: 'seed:hearth-7:bless-before-the-door:2',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes: 'Bless takes the Action. The bonus is free, so spend it.',
      },
      {
        id: 'seed:hearth-7:bless-before-the-door:3',
        type: 'movement',
        label: 'Take the doorway',
        source: 'custom',
        notes:
          'A {{auraRadius}}-foot aura in a corridor covers everyone behind you. '
          + 'In an open field it covers whoever remembered to stand close.',
      },
    ],
    requirements: [
      'Bless — one of the two picks you are currently spending',
      'A 1st-level spell slot',
      'Your Concentration free',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'It stacks with the aura, and that is the whole reason it is worth an '
          + 'Action. {{auraBonus}} from standing near you plus 1d4 from Bless is '
          + 'the largest single swing you can put on somebody else’s save.',
      },
      {
        kind: 'party',
        text:
          'Three creatures only — you and two others. Pick the two who are '
          + 'about to roll the most dice: usually {{ranger}} and whoever is in '
          + 'melee with you.',
      },
      {
        kind: 'warning',
        text:
          'Costs your Action and your slot, so no smite this round. A paladin '
          + 'who buffs in round one is betting the fight lasts four rounds. If '
          + 'it lasts two, you were wrong and you should have smited.',
      },
    ],
    tags: ['bless', 'concentration', 'buff', 'opener'],
  },

  {
    id: 'seed:hearth-7:the-slot-that-lasts-a-minute',
    name: 'The Slot That Lasts a Minute',
    description:
      'Divine Favor is the answer to "I have a slot and the fight is not over." '
      + 'Four hits with it running equals a 1st-level smite, and it does not '
      + 'ask for your Concentration.',
    category: 'sustained',
    blocks: [
      {
        id: 'seed:hearth-7:the-slot-that-lasts-a-minute:1',
        type: 'bonus',
        label: 'Divine Favor — 1st-level slot',
        source: 'spell',
        sourceName: 'Divine Favor',
        notes:
          '1d4 radiant on every weapon hit for one minute. No Concentration, '
          + 'so it runs underneath whatever else you are holding.',
      },
      {
        id: 'seed:hearth-7:the-slot-that-lasts-a-minute:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Both swings carry it, and so does every swing for the next ten '
          + 'rounds. With Extra Attack that is the whole point.',
      },
    ],
    requirements: [
      'Divine Favor — one of your seven prepared picks',
      'A 1st-level spell slot',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'The maths against Divine Smite: four hits with Divine Favor is as '
          + 'much damage as one 1st-level smite, and you have two swings a '
          + 'round. So from round two onward it is ahead, and it stays ahead '
          + 'for a full minute.',
      },
      {
        kind: 'warning',
        text:
          'Bonus Action to cast, so the round you start it is a round you do '
          + 'not smite and do not summon the manifest. Start it in round one, '
          + 'or do not start it at all.',
      },
      {
        kind: 'positioning',
        text:
          'It is not Concentration — which makes it the one buff you can run '
          + 'while holding Bless, Faerie Fire or a duel. Nothing else on your '
          + '1st-level list can say that.',
      },
    ],
    tags: ['divine-favor', 'no-concentration', 'sustained', 'long-fight'],
  },

  {
    id: 'seed:hearth-7:wearing-the-attention',
    name: 'Wearing the Attention',
    description:
      'The fight where YOU are what dies. Everything here is about making the '
      + 'next twenty attack rolls miss.',
    category: 'defensive',
    blocks: [
      {
        id: 'seed:hearth-7:wearing-the-attention:1',
        type: 'bonus',
        label: 'Shield of Faith — 1st-level slot',
        source: 'spell',
        sourceName: 'Shield of Faith',
        notes:
          '+2 AC for ten minutes, Concentration. Ten minutes is long enough to '
          + 'cast it in the corridor before you open the door — do that, and it '
          + 'costs you nothing on the round that matters.',
      },
      {
        id: 'seed:hearth-7:wearing-the-attention:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes: 'Nothing clever. You are the wall; walls also hit.',
      },
      {
        id: 'seed:hearth-7:wearing-the-attention:3',
        type: 'reaction',
        label: 'Channel Divinity → flaming cloak',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          '{{cloakTempHp}} temp HP on top of the AC, and 1d10 fire back at '
          + 'anything that connects in melee.',
      },
    ],
    requirements: [
      'Shield of Faith — one of the two picks you are currently spending',
      'A 1st-level spell slot',
      'Your Concentration free',
      'Hearthfire Manifest summoned, and a Channel Divinity use unspent',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'Against a single Fiend, Undead or Fey, swap Shield of Faith for '
          + 'Protection from Evil and Good: that creature attacks you with '
          + 'disadvantage and cannot charm, frighten or possess you. Same slot, '
          + 'same Concentration, much bigger effect against the right target.',
      },
      {
        kind: 'warning',
        text:
          'Protection from Evil and Good consumes a flask of holy water worth '
          + '25 GP every single cast, and no spellcasting focus substitutes for '
          + 'it. Buy several or the card is decoration.',
      },
      {
        kind: 'warning',
        text:
          'Heroism would be a natural third layer and you must not take it '
          + 'while cloaked. Its temporary hit points REPLACE the cloak’s — they '
          + 'never add — and by the cloak’s own wording that ends the cloak. '
          + 'The same is true of any temp HP from anyone else.',
      },
      {
        kind: 'warning',
        text:
          'Concentration on Shield of Faith means every hit you take is a '
          + 'Constitution save at DC 10, or half the damage taken, whichever is '
          + 'higher. Being the target and holding Concentration are in tension; '
          + 'this card is the version where you accept that.',
      },
    ],
    tags: ['shield-of-faith', 'concentration', 'defensive', 'tank'],
  },

  {
    id: 'seed:hearth-7:damage-relocation',
    name: 'Damage Relocation',
    description:
      'Your oath, rendered as arithmetic. Somebody fragile takes half, you take '
      + 'the other half — and your own aura may halve your half again.',
    category: 'defensive',
    blocks: [
      {
        id: 'seed:hearth-7:damage-relocation:1',
        type: 'action',
        label: 'Warding Bond — 2nd-level slot',
        source: 'spell',
        sourceName: 'Warding Bond',
        notes:
          'One hour, no Concentration. They gain +1 AC, +1 to every save, and '
          + 'Resistance to all damage. Every time they take damage, you take '
          + 'the same amount — and because of the Resistance, "the same amount" '
          + 'is already the halved figure.',
      },
      {
        id: 'seed:hearth-7:damage-relocation:2',
        type: 'bonus',
        label: 'Manifest the Hearthfire',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          'You are about to start absorbing somebody else’s damage. Have the '
          + 'cloak ready before that starts, not after.',
      },
    ],
    requirements: [
      'Warding Bond — an oath spell AND on the standard Paladin list; never spend a pick on it',
      'A 2nd-level spell slot',
      'A pair of platinum rings worth 50 GP each — worn, not consumed. Buy them.',
      'The bonded ally staying within 60 feet of you',
    ],
    annotations: [
      {
        kind: 'party',
        text:
          'Cast it on {{wizard}}. Lowest hit points, highest value, and the '
          + 'creature the enemy most wants to reach — which is the same list '
          + 'three times over.',
      },
      {
        kind: 'positioning',
        text:
          'The stack worth confirming with your DM: if transferred damage keeps '
          + 'its type, then Aura of Solace halves your half again for Fire, '
          + 'Cold and Psychic. A 20-point fire hit becomes 10 to them and 5 to '
          + 'you. That ruling is the load-bearing assumption of this card — ask '
          + 'once, out of combat.',
      },
      {
        kind: 'warning',
        text:
          'You now take damage on other people’s turns. If you are holding '
          + 'Concentration on anything, this is a stream of Constitution saves '
          + 'you did not previously have to make.',
      },
      {
        kind: 'warning',
        text:
          'The bond does not care that you are unconscious. Watch your own hit '
          + 'points as if they were two people’s, because they are.',
      },
    ],
    tags: ['warding-bond', 'oath-spell', 'no-concentration', 'protect'],
  },

  {
    id: 'seed:hearth-7:the-smites-that-are-not-damage',
    name: 'The Smites That Aren’t Damage',
    description:
      'Four spells that all trade Divine Smite’s numbers for a condition. In a '
      + 'party with any melee at all, the condition is worth more.',
    category: 'burst',
    blocks: [
      {
        id: 'seed:hearth-7:the-smites-that-are-not-damage:1',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes: 'Same as always: swing first, decide second.',
      },
      {
        id: 'seed:hearth-7:the-smites-that-are-not-damage:2',
        type: 'bonus',
        label: 'A smite that is not Divine Smite',
        source: 'spell',
        sourceName: 'Thunderous · Wrathful · Searing · Shining Smite',
        notes:
          'Thunderous — about 2 less damage to push it 10 feet and knock it '
          + 'Prone. Wrathful — least damage, best debuff: Frightened, and a '
          + 'Frightened creature cannot willingly move closer to you. Searing — '
          + 'burns again at the start of each of its turns. Shining — it sheds '
          + 'light and cannot be hidden or invisible.',
      },
    ],
    requirements: [
      'One of Thunderous, Wrathful, Searing or Shining Smite prepared — each costs one of your seven picks',
      'A spell slot you have not already spent this turn',
      'A hit to attach it to',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'Thunderous Smite plus the Push weapon mastery is 20 feet of forced '
          + 'movement AND Prone. A creature with 30 feet of speed spends half '
          + 'its movement standing up and still cannot reach you. You have '
          + 'deleted its turn without dealing damage for it.',
      },
      {
        kind: 'positioning',
        text:
          'Wrathful Smite deals Necrotic, and that matters more than its '
          + 'damage. Almost your entire kit is Fire and Radiant; against '
          + 'something that resists both, this is the only smite on your list '
          + 'that still lands.',
      },
      {
        kind: 'positioning',
        text:
          'Searing Smite against an enemy caster: it burns again at the start '
          + 'of every one of that creature’s turns, and every instance is a '
          + 'fresh Concentration save. One casting can strip three separate '
          + 'spells off a wizard.',
      },
      {
        kind: 'warning',
        text:
          'These are pre-cast smites, so you are spending the slot on a hit you '
          + 'have already made rather than on damage you have already seen. '
          + 'Divine Smite is still the efficient one; these are for when the '
          + 'condition is worth more than the dice.',
      },
    ],
    tags: ['smite', 'control', 'prone', 'frightened'],
  },

  {
    id: 'seed:hearth-7:pick-them-up',
    name: 'Pick Them Up',
    description:
      'Somebody is at 0. One point of Lay on Hands restores an entire turn to '
      + 'your side, which is the highest-value healing in the game.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7:pick-them-up:1',
        type: 'bonus',
        label: 'Lay on Hands — 1 point',
        source: 'feature',
        sourceName: 'Lay on Hands',
        notes:
          'One point. Not twenty. They are conscious, they are back in '
          + 'initiative, and it cost you no spell slot at all. Your pool is '
          + 'five times your level and it refills on a long rest.',
      },
      {
        id: 'seed:hearth-7:pick-them-up:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'The whole reason this is the right healing: it takes the Bonus '
          + 'Action, so your Action is untouched. You revive somebody and still '
          + 'take a full turn.',
      },
      {
        id: 'seed:hearth-7:pick-them-up:3',
        type: 'movement',
        label: 'Get to them, and stand over them',
        source: 'custom',
        notes:
          'Lay on Hands needs a touch. Once you are there, they are inside the '
          + '{{auraRadius}}-ft aura for the death saves as well.',
      },
    ],
    requirements: [
      'Lay on Hands — a class feature, always available, no preparation needed',
      'Points left in the pool',
      'Being able to reach them',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Do not dump twenty points into somebody who is still standing. One '
          + 'point can raise three unconscious allies over three turns; twenty '
          + 'points buys a conscious one two more hits.',
      },
      {
        kind: 'positioning',
        text:
          'Three of them down at once: cast Aid instead. It raises current AND '
          + 'maximum hit points for three creatures, so one Action revives all '
          + 'three — and the other seven hours and fifty-nine minutes of it are '
          + 'free party hit points on top.',
      },
      {
        kind: 'warning',
        text:
          'Cure Wounds costs your whole Action plus a slot for comparable '
          + 'healing. That is two attacks and a smite you gave up. Lay on Hands '
          + 'first, every time — prepare Cure Wounds only when the pool is dry.',
      },
      {
        kind: 'positioning',
        text:
          'Five points of the pool also removes the Poisoned condition, and '
          + 'that costs no slot. Check the pool before you reach for Lesser '
          + 'Restoration.',
      },
    ],
    tags: ['lay-on-hands', 'no-slot', 'rescue', 'aid'],
  },

  {
    id: 'seed:hearth-7:the-bonus-action-rescue',
    name: 'The Bonus-Action Rescue',
    description:
      'Lesser Restoration was an Action in 2014 and is a Bonus Action in 2024. '
      + 'That one change turns it from a utility spell into a mid-fight rescue '
      + 'you can fire without giving up your turn.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7:the-bonus-action-rescue:1',
        type: 'bonus',
        label: 'Lesser Restoration — 2nd-level slot',
        source: 'spell',
        sourceName: 'Lesser Restoration',
        notes:
          'Touch. Ends one disease, or one of Blinded, Deafened, Paralyzed or '
          + 'Poisoned. Bonus Action in 2024 — most tables and most apps still '
          + 'have it as an Action, so expect to point at the book once.',
      },
      {
        id: 'seed:hearth-7:the-bonus-action-rescue:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Still yours. That is the entire argument for preparing this spell '
          + 'rather than something flashier.',
      },
    ],
    requirements: [
      'Lesser Restoration — one of your seven prepared picks',
      'A 2nd-level spell slot',
      'Being able to touch them',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Until level 14 this is your only answer to a Paralyzed ally — and a '
          + 'Paralyzed ally is being automatically critically hit by everything '
          + 'standing next to them. This is not a nice-to-have; it is the '
          + 'difference between a bad round and a dead friend.',
      },
      {
        kind: 'positioning',
        text:
          'Poisoned does not need this. Five points of Lay on Hands removes it '
          + 'and costs you no slot at all. Save the slot for the condition the '
          + 'pool cannot touch.',
      },
      {
        kind: 'party',
        text:
          'No cleric and no druid at this table. If {{wizard}}, {{rogue}}, '
          + '{{ranger}} or {{bard}} gets Paralyzed and you did not prepare '
          + 'this, nobody prepared it.',
      },
    ],
    tags: ['lesser-restoration', 'bonus-action', 'rescue', '2024-change'],
  },

  {
    id: 'seed:hearth-7:before-the-door-opens',
    name: 'Before the Door Opens',
    description:
      'The minute you spend in the corridor. Nothing here costs you a combat '
      + 'turn, and all of it is still running when the fight starts.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7:before-the-door-opens:1',
        type: 'action',
        label: 'Magic Weapon — 2nd-level slot',
        source: 'spell',
        sourceName: 'Magic Weapon',
        notes:
          'One hour, no Concentration. +1 to attack and damage, and the weapon '
          + 'counts as magical — which is what gets you through the Resistance '
          + 'that half of everything has to non-magical hits.',
      },
      {
        id: 'seed:hearth-7:before-the-door-opens:2',
        type: 'free',
        label: 'Say it out loud: "stand within ten feet of me"',
        source: 'custom',
        notes:
          'Costs nothing, and it is the single most valuable sentence you say '
          + 'all session. Every foot of spread outside the aura is a save made '
          + 'at +0 instead of {{auraBonus}}, and damage taken at full instead '
          + 'of half.',
      },
      {
        id: 'seed:hearth-7:before-the-door-opens:3',
        type: 'movement',
        label: 'Take the doorway first',
        source: 'custom',
        notes:
          'Pick the square before anyone is looking at you. A {{auraRadius}}-ft '
          + 'aura in a chokepoint covers the whole party; the same aura in the '
          + 'open covers whoever guessed right.',
      },
    ],
    requirements: [
      'Magic Weapon — one of your seven prepared picks',
      'A 2nd-level spell slot',
      'A minute before the fight, and a party who will listen',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'If your game hands out magic weapons, Magic Weapon is a pick you '
          + 'never needed. Check what {{weapon}} already is before you spend '
          + 'one of your seven on this.',
      },
      {
        kind: 'party',
        text:
          'Say it to {{wizard}}, {{rogue}}, {{ranger}} and {{bard}} before '
          + 'initiative. Parties spread out on instinct, and the instinct is '
          + 'wrong at this table specifically — Aura of Solace is what makes '
          + 'clustering safe against the area damage that punishes it.',
      },
      {
        kind: 'positioning',
        text:
          'Shield of Faith also lasts ten minutes. If you know the door is '
          + 'coming, cast it here too — but only one of the two, because Shield '
          + 'of Faith is Concentration and Magic Weapon is not.',
      },
    ],
    tags: ['magic-weapon', 'pre-fight', 'positioning', 'no-concentration'],
  },
]
