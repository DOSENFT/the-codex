import type { SeedTactic } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7-r2 — TACTICS

   EIGHT, AS OF SLICE 5. The file existed empty from slice 1 so the pack's
   shape was real from the first commit: three content files and a meta file,
   exactly as `hearth-7` is arranged, so nobody reading the seeder had to
   wonder whether round two was missing a tab or simply had not written it yet.

   AN EMPTY ARRAY WAS SAFE HERE. `seedToybox` guards on all three being empty
   TOGETHER — a pack that delivers nothing at all is not marked as delivered —
   and slice 1 shipped one combo, so the pack delivered.

   A TACTIC IS NOT A COMBO, and this file is where the distinction Marcus asked
   for is easiest to see. No `blocks`, no action-economy pills, no Deploy
   button, no one-turn rule. A `trigger` that says WHEN, and an ordered
   `actions` list of decisions — untyped on purpose, because none of them is an
   Action or a Bonus Action. Not one of the eight fits in a turn, and the test
   that says so (`not-one-turn`) ships in this slice alongside them.

   THE EIGHT, in the order they are written below, which is the order they
   paint:
     1  Five Prepared Spells You Are Not Using           CRITICAL   slice 5
     2  Your Doctrine's Best Trick Does Not Work                    slice 5
     3  You Are a Glaive, Not a Sword and Board                     slice 5
     4  The Shopping List That Is Not Spell Components              slice 3
     5  Sentinel Is a Prison, Not a Damage Feat                     slice 5
     6  Your Sheet Has No Saving Throw Proficiencies     CRITICAL   slice 5
     7  Ask Your DM These Five Questions                            slice 5
     8  Your Plate Cannot Sneak, but Your Face Can                  slice 5

   Slice 3 shipped #4 early, with the equipment combos, because four combos
   that need gear he does not own and no card telling him to buy it is the
   half-built feature his own guardrails name. The other seven land here.

   TWO OF THE EIGHT ARE GATED, and both for the same reason round two gates
   combos: they write perfectly for a paladin they are wrong about. #3 is an
   argument about a Two-Handed weapon and #5 is an argument about a feat, and
   either one read by someone without them is a lie that reads as true. They
   also name `{{weapon}}` / `{{weaponReach}}` in load-bearing fields, so they
   drop twice over for a character with no melee weapon. The other six are
   token-clean and reach every paladin in the window.

   WHERE THE FACTS COME FROM, because three of these cards contradict a
   document Marcus supplied and one contradicts his own sheet:
     · `paladin_1.txt` (the 2024 Paladin chapter) and
       `paladin_oath_of_the_hearth.txt` are primary and are trusted.
     · `CORRECTIONS.md` is Marcus-supplied canon and is trusted; §1, §2 and §5
       are load-bearing for cards 1 and 2.
     · `WARFARE-DOCTRINE.md` is a derived document with at least one known
       error in it. Card 2 exists because of a line in it. It is named on the
       card rather than silently overruled.
     · `paladin_2.txt` and `PALADIN_3.txt` are opinion columns. Where a card
       leans on one — the Divine Favor arithmetic, Polearm Master — the card
       says which, in a `warning`.
     · His own sheet, `codex-nix-lvl7.json`, is the source for the two
       CRITICALs: `savingThrowProficiencies` is `[]`, and only two of his seven
       prepared-spell picks are spent.
   ========================================================================== */

export const HEARTH_7_R2_TACTICS: SeedTactic[] = [
  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:four-prepared-spells',
    /* FIVE, NOT FOUR. `01-product.md` row 1 was written from a count of the
       spells on his list and said four. His sheet says otherwise: `Cure Wounds`
       is there with `prepared: false`, so it occupies no pick, and the empty
       picks number five. A card named for a count is only as good as the count,
       so the name moved with the arithmetic and the product doc records both.

       THE ID DID NOT MOVE. `...:four-prepared-spells` is a storage key, not a
       title. Renaming a key is how one card becomes two on a sheet that already
       holds the old one, and it buys nothing a reader can see. */
    name: 'Five Prepared Spells You Are Not Using',
    priority: 'critical',
    category: 'core',
    trigger:
      'Any long rest — or right now, before the next session, with your spell '
      + 'list open in this app.',
    actions: [
      'Find the Prepared Spells column on the Paladin table — seven at levels 7 '
      + 'and 8, six below that. Then find what does NOT come out of it. Faerie '
      + 'Fire, Burning Hands, Scorching Ray and Warding Bond are oath spells: '
      + 'always prepared, never counted. Divine Smite and Find Steed are the '
      + 'same. Not one of those six costs you a pick.',
      'So your seven are spent on exactly two spells: Bless and Shield of Faith. '
      + 'Cure Wounds is sitting on your list unprepared, which costs you nothing '
      + 'and gives you nothing. FIVE PICKS ARE EMPTY, and they have been empty '
      + 'since level 5.',
      'And both spells you do have need Concentration, which you can only hold '
      + 'one of. So every fight you choose Bless or Shield of Faith and then '
      + 'have no second lever for the rest of it. Four of the five below need no '
      + 'Concentration at all.',
      'SEARING SMITE, 1st. The Paladin chapter itself recommends it as one of '
      + 'your first two spells and you never took it. It is also the entire '
      + 'engine of "The Caster Killer" on your combos tab — that card does not '
      + 'work without this spell on your list.',
      'AID, 2nd. Three creatures, eight hours, no Concentration — and it raises '
      + 'CURRENT hit points as well as the maximum, so an ally at 0 stands up. '
      + 'That is all of "Three People Stand Up" on your combos tab. Without Aid '
      + 'prepared, that card is fiction too.',
      'LESSER RESTORATION, 2nd. It became a BONUS ACTION in 2024, and until '
      + 'level 14 it is the only answer a Paladin has to a Paralyzed friend. '
      + 'Bonus Action means you free them and still take the Attack action in '
      + 'the same turn.',
      'DIVINE FAVOR, 1st. Bonus Action, no Concentration, 1d4 radiant on every '
      + 'hit for a full minute. With Extra Attack that is two extra dice a round '
      + 'for ten rounds off one 1st-level slot, and it never argues with Bless '
      + 'the way a second Concentration spell would.',
      'COMMAND, 1st. One word, one Wisdom save against your {{saveDC}}, no '
      + 'Concentration and no attack roll. "Approach" walks a caster into your '
      + 'reach where Sentinel lives; "Halt" stops a charge in the open. You have '
      + 'never owned a control spell. This is one.',
    ],
    tags: ['spells', 'preparation', 'long-rest', 'concentration', 'sheet-gap'],
    requirements: [
      'A long rest, or a DM willing to let you re-prepare now',
      'The spell list in this app, so the change is saved somewhere you will see it',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE SWAP RULE IS THE ONE THING TO CHECK BEFORE YOU DO ALL FIVE AT '
          + 'ONCE. paladin_1.txt gives two separate rules: when the table’s '
          + 'number increases you "choose additional spells… until the number of '
          + 'spells on your list matches the number on the table", and '
          + 'separately, on a long rest you may REPLACE one. Filling an empty '
          + 'pick is the first rule, not the second — so on the plain reading '
          + 'you fill all five. What is not written anywhere is what happens '
          + 'when you fill them two levels late. Ask once and take the answer.',
      },
      {
        kind: 'warning',
        text:
          'THE DIVINE FAVOR ARITHMETIC IS FROM AN OPINION COLUMN, NOT A RULE. '
          + 'paladin_2.txt argues that four hits with Divine Favor running match '
          + 'a 1st-level Divine Smite, and that it is the better use of the slot '
          + 'in a long fight. The spell text is rules; the comparison is a '
          + 'reviewer’s. It is a good argument. It is not canon.',
      },
      {
        kind: 'positioning',
        text:
          'WARDING BOND IS HALF YOUR LEVEL 5 OATH GRANT AND IT WAS ALREADY '
          + 'YOURS. It is on the standard Paladin list, so the oath gave you a '
          + 'spell you could have prepared anyway. That is not something you can '
          + 'fix on your sheet, but it IS something to raise with your DM — '
          + 'Heat Metal or Flaming Sphere would suit a Hearth paladin and would '
          + 'actually be a grant.',
      },
      {
        kind: 'party',
        text:
          'Tell {{wizard}} you are taking Command before you cast it the first '
          + 'time. "Approach" and "Flee" move a creature on ITS turn, into or '
          + 'out of areas somebody else has already planned around — and the '
          + 'person whose plan it wrecks is usually the one holding the fireball.',
      },
      {
        kind: 'party',
        text:
          'Lesser Restoration is the one to tell {{rogue}} and {{ranger}} about. '
          + 'The party stops carrying its own answer to Paralyzed the moment '
          + 'somebody knows you have one, and a Paralyzed ally next to an enemy '
          + 'is auto-critting until somebody fixes it.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-doctrine-trick',
    name: 'Your Doctrine’s Best Trick Does Not Work',
    priority: 'high',
    category: 'core',
    trigger:
      'You are about to open a fight by casting a spell with your Action, and '
      + 'you were planning to Smite in the same turn.',
    actions: [
      'The line you are thinking of: cast a slotted spell with your Action, '
      + 'then free-cast Divine Smite with your Bonus Action, because the free '
      + 'cast expends no slot. It is written down. It does not work.',
      'It is not the slot rule that stops it. 2024 says you may expend only ONE '
      + 'spell slot on a turn, and Paladin’s Smite spends none — so as far as '
      + 'slots are concerned the turn is legal. That much of the doctrine is '
      + 'right, and it is the part everyone gets wrong.',
      'What stops it is the casting time. Divine Smite in 2024 reads: "Bonus '
      + 'Action, taken immediately after hitting a target with a Melee weapon '
      + 'or an Unarmed Strike." If your Action was a spell, you did not hit '
      + 'anything. There is no trigger, so there is no spell to cast.',
      'So the order is fixed, and it is not a preference. ATTACK FIRST. The '
      + 'Bonus Action is the second half of a swing that already landed — never '
      + 'the opening move of a turn.',
      'The turn the doctrine actually wanted is one you already have: Attack '
      + 'action, hit, free-cast Divine Smite off that hit. No slot at all, once '
      + 'per long rest. Spend it on a CRIT and it doubles every Smite die — '
      + 'that is "The Free Crit" on your combos tab.',
      'And remember what else wants that Bonus Action: Lay on Hands, Shield of '
      + 'Faith, Compelled Duel, Lesser Restoration, and summoning your '
      + 'Hearthfire Manifest. You get one per turn, always. A round you Smite is '
      + 'a round you did none of those.',
    ],
    tags: ['action-economy', 'divine-smite', 'corrections', 'sequencing', 'menace'],
    requirements: [
      'Nothing to buy and nothing to prepare — this is a decision about turn order',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'WHICH FILE SAYS WHAT, BECAUSE THIS CARD OVERRULES ONE OF YOURS. '
          + 'WARFARE-DOCTRINE.md line 57 is where the Action-spell-plus-Bonus-'
          + 'Smite turn is written down, and that is the same file that gets '
          + 'Prone backwards. CORRECTIONS.md §1 is the slot rule and §2 is the '
          + 'casting time, and CORRECTIONS.md is the file you marked as canon. '
          + 'Where they disagree, this card follows CORRECTIONS.md.',
      },
      {
        kind: 'warning',
        text:
          'EVEN CORRECTIONS.md OVERSTATES IT SLIGHTLY, and you should know that '
          + 'before you quote it at the table. §1 says you can cast a slotted '
          + 'spell AND free-cast Divine Smite on one turn. As a statement about '
          + 'slots that is true. It still needs two casting windows — and at '
          + 'level {{level}} both of those spells want your Bonus Action or your '
          + 'Action, and you have one of each. The rule permits the turn; your '
          + 'action economy does not hand it to you yet.',
      },
      {
        kind: 'positioning',
        text:
          'THE HONEST VERSION OF THE TRICK IS TWO TURNS, NOT ONE. Turn one: '
          + 'Bonus Action Searing Smite off a hit, one slot spent, and it burns '
          + 'for a minute without you. Turn two: hit again and free-cast Divine '
          + 'Smite, no slot. Across two rounds you have spent one slot and '
          + 'landed two Smites. That is the play the doctrine was reaching for.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:glaive-not-sword-and-board',
    name: 'You Are a Glaive, Not a Sword and Board',
    priority: 'high',
    category: 'core',
    needs: { weaponProperties: ['Two-Handed'] },
    trigger:
      'Any time you are reading paladin advice, picking a feat, or deciding '
      + 'where to stand — and it assumes you are holding a shield.',
    actions: [
      'Your armour is Plate. AC 18, and that number does not include a shield. '
      + 'Almost every paladin guide you will ever read assumes 16 plus a shield '
      + 'to reach 18. You are already there with both hands free.',
      'A shield would take you to 20 — and strapping it on costs an Action, and '
      + 'you cannot hold {{weapon}} while it is on your arm. That is a turn and '
      + 'your damage, spent. "The Shield Round" on your combos tab is that turn '
      + 'on purpose. It is a choice, not a default.',
      'Reach {{weaponReach}} feet moves where "the front" is. Stand one square '
      + 'BEHIND the line your party expects you to hold. You still threaten '
      + 'everything you would have threatened; the things you threaten no longer '
      + 'threaten you back.',
      'Two hands is also why Graze is printed on your weapon. A miss still deals '
      + '{{strMod}} damage — a floor under every attack roll. Nothing a shield '
      + 'gives you is worth a build that turns that off.',
      'The feat that finishes this is Polearm Master at level 8, not a shield. '
      + 'Its Opportunity Attack fires when a creature ENTERS your reach — the '
      + 'exact mirror of Sentinel, which fires when one tries to leave.',
      'Which means at level 8 the {{weaponReach}} feet in front of you is taxed '
      + 'in both directions and nothing crosses it free. Decide that now: it '
      + 'changes what you buy, what you prepare, and where you stand.',
    ],
    tags: ['positioning', 'armour', 'feats', 'reach', 'build'],
    requirements: [
      'Plate armour, or any armour that reaches 18 without a shield',
      'A Two-Handed weapon you intend to keep using',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE POLEARM MASTER RECOMMENDATION IS AN OPINION COLUMN, NOT A RULE. '
          + 'PALADIN_3.txt line 222 rates it for a paladin and warns that your '
          + 'Bonus Action is usually already spoken for, so you may rarely get '
          + 'the butt-end strike. The Opportunity Attack half is the half that '
          + 'matters here, and that is the half nothing competes with.',
      },
      {
        kind: 'positioning',
        text:
          'YOU OWN A SHIELD ALREADY — it is on your equipment list. So the '
          + 'shield round costs you nothing but the Action, and the thing you '
          + 'are actually missing is a one-handed weapon to hold in the other '
          + 'hand. That is on the shopping list, and it is fifteen gold.',
      },
      {
        kind: 'party',
        text:
          'Say this to {{ranger}} and {{rogue}} once, out loud: the front line '
          + 'is ten feet further forward than you are. People instinctively line '
          + 'up level with the tank, and standing level with a glaive puts them '
          + 'inside the ring you are supposed to be holding for them.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-shopping-list',
    name: 'The Shopping List That Is Not Spell Components',
    priority: 'high',
    category: 'support',
    trigger:
      'You are in a town, between sessions, or anywhere with a shop — and your '
      + 'supplies list on this app is completely empty.',
    actions: [
      'Ball bearings, 2 gp. The bag is one Action to spread and it is the whole '
      + 'of "Bearings and the Backward Walk". Buy two bags.',
      'Five flasks of oil, 1 sp each — five silver total. Throwing one is an '
      + 'attack, and your subclass sets things on fire for a living.',
      'Caltrops, 1 gp. Same job as the bearings but it hurts and slows instead '
      + 'of knocking down. Different answer for a thing that cannot be knocked down.',
      'Fifty feet of hempen rope, 1 gp. Half the grapples you will ever want end '
      + 'with the thing tied to something, and you cannot improvise rope.',
      'A one-handed weapon you can afford to be mediocre with — a longsword at '
      + '15 gp. It is not for damage. It is the hand you need free on a shield round.',
      'Total under 20 gp. Then open the supplies list in this app and type them '
      + 'in, because a card cannot see your backpack.',
    ],
    tags: ['equipment', 'shopping', 'preparation', 'downtime', 'unlocks-cards'],
    requirements: [
      'Access to a shop, or a DM willing to say you had these all along',
      'About 20 gp',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'EVERY PRICE HERE IS UNSOURCED. Not one of the files you gave this app '
          + 'contains an equipment table — no bearings, no caltrops, no oil, no '
          + 'prices. These are read from the 2024 equipment list out of general '
          + 'knowledge. Check them against your DM’s book once, then delete this '
          + 'warning. The one thing that is from your own sheet is that your '
          + 'supplies list is empty.',
      },
      {
        kind: 'warning',
        text:
          'THE SHIELD IS THE PURCHASE YOU MAY ALREADY HAVE MADE. "The Shield '
          + 'Round" assumes a shield in your pack; this list assumes a one-handed '
          + 'weapon to hold in the other hand. If you own neither, that card is '
          + 'advice about a turn you cannot take yet.',
      },
      {
        kind: 'positioning',
        text:
          'THIS IS THE OTHER HALF OF "Buy These Before the Next Fight". That '
          + 'card is components — the platinum rings, the diamond, the holy '
          + 'water — and every line of it costs more than everything here put '
          + 'together. This one is the twenty gold of ordinary junk that turns '
          + 'four of your cards from reading material into turns.',
      },
      {
        kind: 'positioning',
        text:
          'Bearings and caltrops are not the same card. Bearings knock a thing '
          + 'down and cost it nothing but a save; caltrops cut its feet and cut '
          + 'its Speed in half until it heals. Against something that cannot be '
          + 'knocked prone — an ooze, a swarm, a thing already crawling — the '
          + 'caltrops are the only one of the two that does anything.',
      },
      {
        kind: 'party',
        text:
          'Tell {{rogue}} before you spread either one. Difficult terrain in a '
          + 'corridor is a wall you built across your own party, and the person '
          + 'most likely to want to run through that corridor is not you.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:sentinel-is-a-prison',
    name: 'Sentinel Is a Prison, Not a Damage Feat',
    priority: 'high',
    category: 'control',
    needs: { feats: ['Sentinel'] },
    trigger:
      'Something moves on an enemy’s turn and the table looks at you, because '
      + 'you have a Reaction and everyone knows it.',
    actions: [
      'You have ONE Reaction per round. Sentinel does not give you a second '
      + 'one. It changes what the one is worth, and only if you spend it on the '
      + 'right creature.',
      'Never spend it on the thing already standing next to you. That creature '
      + 'is exactly where you want it. Hitting it for {{weaponDice}} changes '
      + 'nothing about the shape of the fight, and now your Reaction is gone.',
      'Spend it on the thing walking PAST you toward the back line. On a hit, '
      + 'Sentinel sets its Speed to 0 for the rest of the turn — it stops in the '
      + 'open, {{weaponReach}} feet from you, next to nobody, with its whole '
      + 'turn thrown away.',
      'Disengage does not save it. Sentinel makes creatures provoke from you '
      + 'even when they take the Disengage action, and Disengage is the first '
      + 'thing any trained enemy does to get around a front line.',
      'So the question at the table is never "can I hit it". It is "is this one '
      + 'LEAVING". If it is not leaving, hold the Reaction and say nothing.',
      'Holding it keeps two other things alive: turning your Hearthfire '
      + 'Manifest into the cloak is a Reaction, and so is Interception once you '
      + 'have picked a Fighting Style. Three claims, one Reaction, and the first '
      + 'one you spend is the one you spend.',
    ],
    tags: ['reaction', 'sentinel', 'control', 'positioning', 'menace'],
    requirements: [
      'The Sentinel feat',
      'A melee weapon in hand — an Opportunity Attack is a weapon attack',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'THE PRISON IS BUILT WITH YOUR FEET, NOT YOUR REACTION. Stand so '
          + 'there is exactly ONE lane past you: a doorway, a bridge, the gap '
          + 'between a wagon and a wall. Sentinel punishes the creature that '
          + 'takes the lane; geometry is what makes it the only lane. In an open '
          + 'field the feat is a die roll. In a corridor it is a wall.',
      },
      {
        kind: 'warning',
        text:
          'SPEED 0 IS NOT THE RESTRAINED CONDITION AND IT IS NOT PRONE. It ends '
          + 'when that creature’s turn ends. It still gets its Action, it can '
          + 'still attack anything already in its reach, and next turn it walks '
          + 'again. What you have bought is one wasted turn and a creature '
          + 'standing alone in the open — which is the whole point.',
      },
      {
        kind: 'party',
        text:
          'This works best when somebody is worth running past, so tell '
          + '{{wizard}} and {{bard}} to stand BEHIND you rather than beside you. '
          + 'A back line spread out level with you gives an enemy three lanes '
          + 'and no reason to take yours.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:no-save-proficiencies',
    name: 'Your Sheet Has No Saving Throw Proficiencies',
    priority: 'critical',
    category: 'survival',
    trigger:
      'Before the next session — open your character sheet in this app and look '
      + 'at the saving throw line.',
    actions: [
      'Paladins are proficient in WISDOM and CHARISMA saving throws. It is in '
      + 'the first paragraph of the class. Your sheet lists none at all.',
      'That is +{{prof}} missing from every Wisdom save and every Charisma save '
      + 'you roll, and those are the two saves that decide whether you are still '
      + 'in the fight.',
      'Wisdom saves are the ones that take you off the board and point you at '
      + 'your friends: Hold Person, Fear, Confusion, Dominate, Banishment. You '
      + 'are the one with 18 Strength standing in front of everybody. Losing you '
      + 'is not losing a turn, it is losing the wall and gaining an enemy.',
      'It is worse than one missing number, because Aura of Protection already '
      + 'adds your Charisma modifier to the same rolls. Your aura is paying '
      + '{{auraBonus}}. The proficiency you are missing is a second bonus that '
      + 'should be stacking on top of it, on exactly the saves the aura was '
      + 'built to cover.',
      'Fix it in the app, not at the table. Until it is fixed, every save this '
      + 'app rolls or advises for you is low by {{prof}} — and so is every piece '
      + 'of advice it gives about who should be standing in your aura.',
      'Then look at Constitution, and leave it alone. It is NOT proficient and '
      + 'it should not be. But it is the save you will roll most often, for '
      + 'Concentration, and the only thing helping it is your own aura — which '
      + 'is the argument for Resilient (Constitution) later, and the argument '
      + 'for not holding Concentration you do not need.',
    ],
    tags: ['saving-throws', 'sheet-gap', 'survival', 'aura', 'critical-fix'],
    requirements: [
      'Two minutes with the character sheet in this app',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'WHERE THIS COMES FROM, SO YOU CAN CHECK IT IN ONE PLACE. '
          + 'paladin_1.txt line 12, the 2024 Paladin class table: "Saving Throw '
          + 'Proficiencies — Wisdom and Charisma." Your sheet’s '
          + 'savingThrowProficiencies is an empty list. This is not a rules '
          + 'reading; it is a field that was never filled in.',
      },
      {
        kind: 'positioning',
        text:
          'THE AURA IS TEN FEET, AND THIS IS THE CARD THAT MAKES IT MATTER. '
          + '{{auraRadius}} feet of everyone rolling saves with your Charisma '
          + 'added. Once your own proficiency is on the sheet, you become the '
          + 'best save in the party by a distance — which means you should be '
          + 'the one who steps into the cone, reads the rune, or touches the '
          + 'thing nobody wants to touch.',
      },
      {
        kind: 'party',
        text:
          'Everyone standing in the aura is affected by getting this wrong too. '
          + 'Tell {{wizard}}, {{rogue}}, {{ranger}} and {{bard}} what the real '
          + 'number is, because they are making positioning decisions off it '
          + 'whether they say so or not.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:ask-your-dm',
    name: 'Ask Your DM These Five Questions',
    priority: 'high',
    category: 'support',
    trigger:
      'Before the next session, in a text message if you like — not in the '
      + 'middle of a turn with five people waiting.',
    actions: [
      'What IS Radiant Swing? It sits on my sheet with a damage type of Radiant '
      + 'and four fragments of text. It is in none of the books, none of the '
      + 'guides and nothing in my subclass. Is it the weapon, the oath, or '
      + 'something you handed me?',
      '"Skip 1 attack = light" — skip which attack, and do I still get the other '
      + 'one? I have Extra Attack. If Radiant Swing costs one of the two that is '
      + 'a trade; if it replaces the whole Attack action it is a different '
      + 'feature entirely, and I would play it differently.',
      '"DC = 15" — is that a fixed 15 forever, or is it meant to be my spell '
      + 'save DC? Mine is {{saveDC}} and it grows with Charisma. A hard number '
      + 'that never moves is unusual, and if it was meant to be my DC then the '
      + 'number on my sheet is already wrong.',
      '"Miss = half damage" — half of what, and how does it sit with Graze, '
      + 'which already pays {{strMod}} on a miss? Do they stack, does the better '
      + 'one apply, or does Radiant Swing replace it?',
      '"Dawn / Dusk = +1d6 fire" — is that the in-world time of day, and who is '
      + 'tracking it? If it is clock time in the fiction then somebody has to '
      + 'say out loud when it is dawn, and that somebody is probably me.',
      'Write the answers into this app the same evening. A ruling nobody '
      + 'recorded gets re-litigated four sessions later, and it will be during a '
      + 'boss fight.',
    ],
    tags: ['radiant-swing', 'open-questions', 'dm', 'homebrew', 'preparation'],
    requirements: [
      'Your DM, and five minutes that are not during combat',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'NOBODY INVENTED AN ANSWER FOR YOU, AND THAT IS DELIBERATE. You were '
          + 'asked what Radiant Swing does and you said you were not sure. So no '
          + 'combo in this Toybox is built on it, and there is no card telling '
          + 'you how to use it. Guessing would have produced a confident card '
          + 'about a feature that may not exist the way it is written.',
      },
      {
        kind: 'warning',
        text:
          'TWO MORE WORTH ASKING WHILE YOU HAVE HIS ATTENTION. Is Searing Smite '
          + 'Concentration in 2024? WARFARE-DOCTRINE.md line 97 says no, and '
          + 'that is the same file that gets Prone backwards. And: does Graze '
          + 'damage on a miss force the target to make a Concentration save? '
          + 'Damage forces one, and Graze is damage — but a DM may rule that a '
          + 'miss does not. That second answer is worth a whole card.',
      },
      {
        kind: 'positioning',
        text:
          'ASK ABOUT THE PREPARED-SPELL PICKS IN THE SAME MESSAGE. Whether you '
          + 'can fill five empty prepared slots at once, or one per long rest, '
          + 'changes what you can do for the next month of sessions. It is the '
          + 'sixth question and the only reason it is not on the list is that '
          + 'the list is named for five.',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:plate-and-the-face',
    /* NAMED SHORT BECAUSE THE CARD HEADER CLIPS. `TacticCard.tsx:105` paints
       the name `line-clamp-3` — three lines and then an ellipsis eats the rest.
       The first draft, "Plate Has Disadvantage on Stealth, and You Are the
       Infiltrator", measured 80px into a 60px box on a 390px phone and lost its
       second half, which was the half that mattered. Measured, not counted:
       `prove-r2-slice5.mjs` is what found it. */
    name: 'Your Plate Cannot Sneak, but Your Face Can',
    priority: 'normal',
    category: 'support',
    trigger:
      'The party decides to get in quietly, or to talk its way in, and somebody '
      + 'looks at the changeling.',
    actions: [
      'Decide before you leave which one you are tonight: the FACE or the WALL. '
      + 'You cannot be both in the same building, and the decision is made an '
      + 'hour before the door, not at it.',
      'Shape-Shifter is an Action and it changes your body — appearance, voice, '
      + 'height, weight, Medium or Small. It does not change your clothes and it '
      + 'does not change your armour. A guard who sees a new face over the same '
      + 'plate has not forgotten you. He has learned what your armour looks like.',
      'Plate gives Disadvantage on Stealth. So do not roll it. If the plan '
      + 'needs a Stealth check you are the wrong person for the plan, and '
      + 'volunteering puts the party’s worst modifier on its most important roll.',
      'Out of the plate you are AC 10 — worse than the wizard. It takes five '
      + 'minutes to get out of and ten to get back into. There is no version of '
      + 'this where you take the armour off because a fight started.',
      'So use the face for the DOOR, never the corridor. Walk in as somebody who '
      + 'is SUPPOSED to be wearing armour: a guard, a courier, a hired sword, an '
      + 'inspector. Persuasion is your proficiency. Stealth is not. Play to the '
      + 'one you have.',
      'And buy a change of clothes and a disguise kit for each face you plan to '
      + 'use twice. The shift is free; the costume is not, and the costume is '
      + 'the half people actually notice.',
    ],
    tags: ['stealth', 'social', 'changeling', 'infiltration', 'armour'],
    requirements: [
      'Shape-Shifter, or any at-will way to change your appearance',
      'Somewhere private to change armour, and an hour you can spare',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE SHAPE-SHIFTER TEXT HERE IS FROM A BLOG SCRAPE, NOT A BOOK. '
          + 'changling.txt is the only changeling source you supplied and it '
          + 'reads as pre-2024 commentary. The three things this card leans on — '
          + 'that the shift is an Action, that it does not change equipment, and '
          + 'that you keep your own abilities — are the parts every version '
          + 'agrees on. Check the exact wording against your DM’s book before '
          + 'you bet a session on it.',
      },
      {
        kind: 'positioning',
        text:
          'THE EYES ARE THE ONE THING THAT DOES NOT CHANGE. Polished silver, '
          + 'through every face you wear. You have been calling it a rare '
          + 'half-elf defect and it has held so far. Decide NOW what you say the '
          + 'first time somebody sees the same eyes on two different faces, '
          + 'because you will not think of anything good in the moment.',
      },
      {
        kind: 'party',
        text:
          'Agree a signal with {{rogue}} before you shift, and agree it every '
          + 'single time. The person most likely to knife you in a dark corridor '
          + 'is the party member who is very good at noticing that the guard '
          + 'walking towards him is not a guard.',
      },
    ],
  },
]
