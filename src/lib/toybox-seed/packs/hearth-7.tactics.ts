import type { SeedTactic } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7 — TACTICS

   Twelve. Slice 5 wrote the first three; slice 7 wrote nine more. A combo is
   a turn; a tactic is a decision you make before the turn arrives, which is
   why these carry a trigger and an ordered list rather than action blocks.

   `actions` IS LOAD-BEARING, `annotations` IS NOT. A step whose token cannot
   resolve kills the whole tactic; an annotation whose token cannot resolve is
   dropped alone. That is why "your fighting style is {{fightingStyle}}" is an
   annotation on the first tactic and not its fourth step: Marcus has not
   picked a style yet, and a tactic that vanished until he did would be a
   feature quietly withholding its best card.

   THREE OF THE NINE DELIBERATELY NAME THE WEAPON IN A STEP, and so three of
   the twelve are dropped for a character carrying nothing but a bow. That is
   the same ruling `profile.ts` already makes for combos, applied here for the
   first time: a tactic about the ten feet you threaten, about the damage type
   your weapon covers when fire fails, and about the mastery printed on that
   weapon are all tactics ABOUT a melee weapon. Rewriting them to survive
   without one would mean writing them without saying what they are about.
   `seed.test.ts` names the nine survivors, so that ruling cannot drift.

   THE SOURCING WARNINGS ARE NOT DECORATION. Sentinel is on his sheet, Graze
   is printed on his weapon, and Interception is the style he intends to take
   — the rules text of none of the three is in any file he gave us
   (`PALADIN_3.txt:90` names Interception in a recommendation and stops
   there). Those lines are written from general 5e knowledge.
   `pack-hearth-7.test.ts` requires any entry that names Interception,
   Sentinel or Graze to carry a `warning` annotation, so the label cannot be
   dropped by a later edit without a test going red.

   AND ONE PLACE HIS OWN SOURCES CONTRADICT EACH OTHER. `paladin_2.txt:64`
   says a paladin cannot Ritual cast; `CORRECTIONS.md §11` says the 2024 rules
   attach Ritual casting to the spell rather than to the class, so any
   prepared Ritual-tagged spell qualifies. "The Spells That Are Not Turns"
   follows the corrections file, because it is the newer of the two and it is
   the one written to correct the other — and it says on the card that it is
   making that choice, because four free spells a day is too large a claim to
   make silently.
   ========================================================================== */

export const HEARTH_7_TACTICS: SeedTactic[] = [
  {
    id: 'seed:hearth-7:the-reaction-is-only-one',
    name: 'The Reaction Is Only One',
    priority: 'critical',
    category: 'core',
    trigger:
      'Hearthfire is up, an enemy turn is starting, and you have three '
      + 'different things that all want your reaction.',
    actions: [
      'Decide before their turn begins. Deciding during it is how you freeze the table.',
      'Cloak if the attention is on you — {{cloakTempHp}} temp HP eats a hit and '
      + 'answers with 1d10 fire.',
      'Sentinel if an ally is the target — the swing is the smaller half; dropping '
      + 'the attacker’s speed to 0 is what actually saves them.',
      'You get one. Not two. Pick the default now so nobody is waiting on you.',
    ],
    requirements: [
      'Hearthfire Manifest summoned',
      'Channel Divinity unspent',
      'Sentinel',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'Your fighting style is {{fightingStyle}}. If that is Interception, it '
          + 'is a third claimant on the same reaction — it reduces the damage of '
          + 'a hit that has already landed on someone beside you, which is the '
          + 'one of the three that works after the dice are read.',
      },
      {
        kind: 'warning',
        text:
          'Sentinel’s and Interception’s exact wording is not in your source '
          + 'files — those two lines are written from general 5e knowledge, not '
          + 'from your books. Check them once against your book, then delete '
          + 'this warning.',
      },
    ],
    tags: ['reaction', 'sentinel', 'interception', 'hearthfire'],
  },

  {
    id: 'seed:hearth-7:stand-where-the-aura-pays',
    name: 'Stand Where the Aura Pays',
    priority: 'critical',
    category: 'core',
    trigger:
      'Anything is about to force saving throws — a caster is spotted, a trap '
      + 'trips, something inhales.',
    actions: [
      'Aura of Protection is a {{auraRadius}}-foot radius and it is always on. '
      + 'No action, no slot, no concentration.',
      '{{auraBonus}} to every saving throw, for you and everyone standing in it. '
      + 'That is larger than most things you could do with your whole action.',
      'Aura of Solace sits on the same radius: resistance to Fire, Cold and '
      + 'Psychic for everyone inside it.',
      'So against a breath weapon, a fireball or anything that blasts minds, '
      + 'moving one square beats every spell on your list.',
    ],
    requirements: ['Nothing — both auras are always on, and cost nothing'],
    annotations: [
      {
        kind: 'party',
        text:
          '{{wizard}} and {{bard}} are the ones who fail these. If the radius '
          + 'only reaches two people, it reaches those two.',
      },
      {
        kind: 'warning',
        text:
          'Both auras switch off while you are Incapacitated — and being '
          + 'Incapacitated is the same thing that breaks your Concentration. '
          + 'The round you go down, everyone standing near you loses '
          + '{{auraBonus}} at once.',
      },
    ],
    tags: ['aura', 'positioning', 'no-action', 'always-on'],
  },

  {
    id: 'seed:hearth-7:preparing-for-tomorrow',
    name: 'Preparing for Tomorrow',
    /* HIGH RATHER THAN CRITICAL, and that is a departure from the mockup, which
       badged all three of these critical. This one never fires mid-fight; if it
       shares a badge with the two that do, the badge stops meaning anything. */
    priority: 'high',
    category: 'core',
    trigger: 'You finish a long rest. You may swap exactly one prepared spell.',
    actions: [
      'Your four oath spells — Faerie Fire, Burning Hands, Scorching Ray and '
      + 'Warding Bond — are always prepared and do not count against your seven. '
      + 'Neither does Divine Smite, and neither does Find Steed.',
      'So all seven picks are genuinely yours, and you are spending two of them: '
      + 'Bless and Shield of Faith. Five are sitting empty.',
      'Expecting a boss with big saves? Keep Bless and add Compelled Duel — the '
      + 'only real taunt in the game. It makes the fight about you, which is the '
      + 'fight you win.',
      'Expecting a swarm? Burning Hands is already free. Spend the pick on '
      + 'Wrathful Smite instead: a Frightened creature cannot willingly move '
      + 'closer to you, which turns a melee brute into a spectator.',
      'Expecting a long day? Cure Wounds, then Aid — Aid raises the whole '
      + 'party’s maximum for eight hours instead of topping one person up once.',
      'Then read the REQ line on every other card in this Toybox. That list is '
      + 'tomorrow’s seven.',
    ],
    requirements: [
      'A long rest',
      'The REQ line on every other entry in this Toybox',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'One swap per long rest. Five empty picks take five rests to fill, so '
          + 'the order matters — fill the one you would want tonight first.',
      },
      {
        kind: 'warning',
        text:
          'Warding Bond is on the standard Paladin list as well as your oath '
          + 'list, so half of that tier’s grant was already yours. Never spend '
          + 'one of your seven on it.',
      },
      {
        kind: 'party',
        text:
          'No cleric and no druid at this table — {{wizard}}, {{rogue}}, '
          + '{{ranger}} and {{bard}}. On a long day the healing comes from you '
          + 'or it does not come.',
      },
    ],
    tags: ['long-rest', 'preparation', 'index', 'spell-picks'],
  },

  /* ------------------------------------------------------------------ *
   * Slice 7 begins here.                                               *
   * ------------------------------------------------------------------ */

  {
    id: 'seed:hearth-7:the-ten-feet-you-threaten',
    name: 'The Ten Feet You Threaten',
    priority: 'high',
    category: 'control',
    trigger:
      'Something is trying to get past you to reach someone softer, and you '
      + 'are holding {{weapon}}.',
    actions: [
      '{{weapon}} threatens {{weaponReach}} feet. Picture that as a ring around '
      + 'you, not a line in front of you — it is several times the ground a '
      + 'five-foot weapon covers, and every square of it is ground nothing '
      + 'crosses for free.',
      'So stand on the gap, not on the monster. Threatening the route to '
      + 'someone is worth more than standing beside the thing already busy '
      + 'with you.',
      'They leave the ring, you get an Opportunity Attack. Sentinel turns that '
      + 'hit into a full stop: their speed drops to 0 and the move ends where '
      + 'they are, which is beside you rather than beside the squishiest '
      + 'person in the room.',
      'Sentinel also means Disengage is not an escape — they provoke from you '
      + 'anyway. Between the ring and that, the honest options left to them '
      + 'are "go through the paladin" and "give up".',
      'One reaction per round, so one body gets stopped per round. Spend it on '
      + 'the one that is going somewhere, not on the one already in front of you.',
    ],
    requirements: [
      'A melee weapon — {{weapon}}, which threatens {{weaponReach}} feet',
      'Sentinel',
      'Your reaction unspent — read "The Reaction Is Only One" beside this',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Sentinel’s exact wording is not in any file you gave us. The two '
          + 'halves used here — an Opportunity Attack hit drops the target’s '
          + 'speed to 0, and creatures provoke from you even when they '
          + 'Disengage — are written from general 5e knowledge. Check them once '
          + 'against your book, then delete this warning.',
      },
      {
        kind: 'positioning',
        text:
          'The ring moves with you and moving it costs nothing. Every foot you '
          + 'walk re-draws {{weaponReach}} feet of threatened ground, which '
          + 'makes plain movement the cheapest control on your sheet.',
      },
      {
        kind: 'party',
        text:
          '{{rogue}} and {{wizard}} are what the ring is for. Stand between '
          + 'them and the door, not between yourself and the nearest enemy.',
      },
    ],
    tags: ['positioning', 'reach', 'sentinel', 'opportunity-attack', 'control'],
  },

  {
    id: 'seed:hearth-7:concentration-is-the-career-choice',
    name: 'Concentration Is the Career Choice',
    priority: 'critical',
    category: 'control',
    trigger:
      'You are about to cast something with Concentration — or you are '
      + 'holding one and about to take a hit.',
    actions: [
      'One at a time, and the second one silently ends the first. Bless, Faerie '
      + 'Fire, Compelled Duel, Shield of Faith, Protection from Evil and Good '
      + 'and Shining Smite all want the same seat, and the spell already in it '
      + 'never gets a say.',
      'So rank them before initiative, not during it. Bless when the party has '
      + 'more attacks than the enemy does. Faerie Fire when advantage on every '
      + 'attack is worth more than a flat bonus. Compelled Duel when exactly '
      + 'one thing has to come to you. Shield of Faith when the answer is '
      + 'simply that you must not go down.',
      'Every time you take damage you make a Constitution save to hold it: DC '
      + '10, or half the damage taken, whichever is higher. A hit for 30 is a '
      + 'DC 15 save, and that is the one you will fail.',
      'Your own aura pays that save. {{auraBonus}} on every Constitution save '
      + 'you make to keep the spell — you are better at concentrating than your '
      + 'Constitution score says you are.',
      'Which makes the real question never "is this spell good". It is "is this '
      + 'better than the one already in my head, plus the chance I drop it '
      + 'recasting". Usually it is not.',
    ],
    requirements: [
      'Any one of: Bless, Faerie Fire, Compelled Duel, Shield of Faith, '
      + 'Protection from Evil and Good, Shining Smite',
      'A decision made before the fight about which one is your default',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Incapacitated ends Concentration outright — no save, no aura, no '
          + 'appeal. The two worst things that can happen to you arrive in the '
          + 'same sentence, so anything that stuns, paralyses or knocks you out '
          + 'is worth a Luck Point to avoid.',
      },
      {
        kind: 'party',
        text:
          '{{wizard}} and {{bard}} concentrate too. Agree who holds what before '
          + 'the fight or you will spend two turns casting over each other, and '
          + 'the table will not notice until the round it matters.',
      },
      {
        kind: 'positioning',
        text:
          'Resilient (Constitution) or War Caster at your next feat turns this '
          + 'from a coin flip into a habit. Neither is on your sheet today, so '
          + 'today the answer is the aura and a Luck Point.',
      },
    ],
    tags: ['concentration', 'saves', 'bless', 'faerie-fire', 'discipline'],
  },

  {
    id: 'seed:hearth-7:the-death-protocol',
    name: 'The Death Protocol',
    priority: 'critical',
    category: 'survival',
    trigger: 'Someone at this table is at 0 hit points — or past it.',
    actions: [
      'Down, not dead: Lay on Hands, one single point. It is a Bonus Action, '
      + 'one point ends the dying and stands them up, and the death saves stop. '
      + 'Spending five is waste; spending your Action on Cure Wounds is worse.',
      'Three down at once: Aid. One Action, up to three creatures, and it '
      + 'raises their hit point maximum and heals them by the same amount — so '
      + 'all three stand up off one Action. It is the only mass revive you own, '
      + 'and it has to have been prepared this morning.',
      'Dead, and it happened within the minute: Revivify. That is 3rd level and '
      + 'a 300 GP diamond, and it is above your tier — so it is somebody else’s '
      + 'spell and somebody else’s diamond, agreed on before the fight and not '
      + 'after.',
      'Dead, and the minute is gone: put Gentle Repose on the body, cast as a '
      + 'Ritual. Ten minutes, no slot spent, and it costs you nothing but the '
      + 'time.',
      'That is the step nobody remembers, and it is the whole protocol. Time '
      + 'spent under Gentle Repose does not count against the clock on raising '
      + 'them. Recast it before it lapses and a ten-day deadline becomes no '
      + 'deadline at all.',
      'Then get to a Raise Dead at your leisure. They come back at −4 on every '
      + 'D20 test, improving by 1 per long rest. Arriving slowly is still '
      + 'arriving.',
    ],
    requirements: [
      'Lay on Hands with points left in the pool',
      'Gentle Repose prepared — it is a Ritual, so preparing it costs no slot '
      + 'to use',
      'Aid prepared, if you want the three-at-once option',
      'Someone in the party carrying a 300 GP diamond, bought in advance',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Aid takes its 5 points of maximum back when it ends eight hours '
          + 'later. Anyone whose current hit points were only above zero '
          + 'because of Aid goes down the moment it lapses — check the party '
          + 'before the duration runs out, not after.',
      },
      {
        kind: 'party',
        text:
          'No cleric and no druid. {{wizard}}, {{rogue}}, {{ranger}} and '
          + '{{bard}} are all relying on your Bonus Action for this. Say it out '
          + 'loud at the table so nobody spends their Action stabilising '
          + 'someone you were about to stand up.',
      },
      {
        kind: 'warning',
        text:
          'Gentle Repose has to be PREPARED to be Ritual cast — a Ritual is '
          + 'free to cast, not free to know. On the day you expect a fight you '
          + 'might lose, it is worth one of your seven.',
      },
    ],
    tags: ['death', 'lay-on-hands', 'gentle-repose', 'aid', 'ritual', 'revivify'],
  },

  {
    id: 'seed:hearth-7:spend-the-luck-you-are-hoarding-it',
    name: 'Spend the Luck, You Are Hoarding It',
    priority: 'high',
    category: 'survival',
    trigger:
      'A d20 has just been read and it is the wrong number — your attack, your '
      + 'save, or a check the scene turned on.',
    actions: [
      'You have as many Luck Points as your proficiency bonus, which is '
      + '{{prof}} today. They refresh on a long rest, and a point still unspent '
      + 'at the end of the day was a point you did not have.',
      'Spend one to roll a second d20 and use whichever you prefer. You choose '
      + 'AFTER seeing the first die — that is what makes it different from '
      + 'advantage, and better than it, on exactly the rolls that matter.',
      'Do not spend it on a middling attack. Spend it on the Constitution save '
      + 'holding Bless, on the save against being paralysed or stunned, and on '
      + 'the attack you are about to pour a slot into.',
      'The order on a smite turn is: roll, fix the roll with Luck, then decide '
      + 'the smite. Declaring a smite happens after the hit is confirmed, so '
      + 'the point protects the slot instead of the other way round.',
      'The pool is small. Treat it as a handful of chances to refuse a bad die, '
      + 'not as an emergency fund you will feel clever about still holding.',
    ],
    requirements: [
      'Lucky',
      'Luck Points remaining — they come back on a long rest, not a short one',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'The wording used here is the one printed on your own sheet — spend a '
          + 'point, roll an extra d20 on an attack, ability check or save, '
          + 'choose which die to use. Some printings of the 2024 feat describe '
          + 'it as advantage instead. Your sheet is what your table agreed to; '
          + 'confirm it once with your DM and then stop thinking about it.',
      },
      {
        kind: 'positioning',
        text:
          'The best Luck Point of any day is the one that keeps Concentration '
          + 'on Bless. Read "Concentration Is the Career Choice" beside this '
          + 'card — that is where the points go.',
      },
    ],
    tags: ['lucky', 'feat', 'saves', 'resource', 'smite'],
  },

  {
    id: 'seed:hearth-7:when-fire-does-nothing',
    name: 'When Fire Does Nothing',
    priority: 'high',
    category: 'burst',
    trigger:
      'Your damage stopped landing. Something is resistant or immune to fire, '
      + 'and Radiant is not covering the gap.',
    actions: [
      'Look at what you actually deal. Burning Hands, Scorching Ray, the '
      + 'Hearthfire cloak, the manifest, Divine Smite — that is Fire and '
      + 'Radiant, and that is the whole character. Two types.',
      'Fire is the most commonly resisted damage type in the game. The day it '
      + 'goes, most of your list goes with it, and it goes without warning.',
      'The Necrotic answer is Wrathful Smite — same slot, different type, and '
      + 'it Frightens on a failed save on top. Prepare it on any day you expect '
      + 'something that laughs at fire.',
      'The physical answer is the weapon in your hands. {{weapon}} deals '
      + '{{weaponDice}} of its own before any smite is added, and that damage '
      + 'is not fire. Against immunity this is the answer — swing more, cast '
      + 'less.',
      'Carry a thrown weapon. A javelin or a handaxe costs a few coins and is '
      + 'the difference between a turn and no turn when the thing is airborne, '
      + 'across a gap, or standing in a fire you cannot walk into.',
    ],
    requirements: [
      'Wrathful Smite prepared, for the Necrotic day',
      '{{weapon}} — the part of your damage that was never fire',
      'A javelin or a handaxe in your pack. Buy one.',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Elemental Adept (Fire) at a later feat makes your fire ignore '
          + 'RESISTANCE. It does nothing at all about IMMUNITY — a fire '
          + 'elemental is still immune and no feat changes that. Against '
          + 'immunity the answer is always the weapon.',
      },
      {
        kind: 'positioning',
        text:
          'Against something in the air or across a chasm, the thrown weapon is '
          + 'not a fallback, it is your only turn. Nothing else you own reaches.',
      },
      {
        kind: 'party',
        text:
          '{{wizard}} covers the types you do not. Say "fire is doing nothing" '
          + 'out loud on the round you learn it, not the round after.',
      },
    ],
    tags: ['damage-types', 'fire', 'radiant', 'necrotic', 'wrathful-smite', 'thrown'],
  },

  {
    id: 'seed:hearth-7:the-mastery-you-have-is-not-the-one-you-were-told',
    name: 'The Mastery You Have Is Not the One You Were Told',
    priority: 'normal',
    category: 'burst',
    trigger:
      'Your warfare notes told you to take Topple. You looked at your sheet '
      + 'and it says something else.',
    actions: [
      '{{weapon}} has Graze. The doctrine recommends Topple, and Topple is not '
      + 'what you are carrying — so every line of advice built on knocking '
      + 'things prone is advice for a character you are not playing.',
      'Graze: when you MISS with the attack, you still deal damage equal to '
      + 'your Strength modifier — {{strMod}}. Not a hit. Not nothing either.',
      'That changes what a miss costs, not what a hit is worth. Its real value '
      + 'is against high AC: the second swing of your Extra Attack stops being '
      + 'a coin flip you might rather not take and becomes a swing with a floor '
      + 'under it.',
      'It knocks nothing down. Any play on this list that starts with "it is '
      + 'prone" is a play you read as "if somebody else puts it down" — that is '
      + '{{weaponReach}} feet of reach and a friend, not a mastery you have.',
      'And getting Topple means putting {{weapon}} down. Topple lives on the '
      + 'Lance, the Maul and the Trident, none of which reach {{weaponReach}} '
      + 'feet. Your reach is the better half of your character. Keep it.',
    ],
    requirements: [
      '{{weapon}} — the mastery belongs to the weapon, not to you',
      'Nothing else. Graze is passive, costs nothing, and is always on.',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Graze is named on your sheet and defined in none of your files. The '
          + '"damage equal to your Strength modifier on a miss" line is written '
          + 'from general 5e knowledge. Check it once against your book, then '
          + 'delete this warning.',
      },
      {
        kind: 'positioning',
        text:
          'Graze pays best exactly when you were thinking of doing something '
          + 'else with your attack. Against high AC, swing anyway — the miss is '
          + 'no longer free for them.',
      },
    ],
    tags: ['weapon-mastery', 'graze', 'topple', 'correction', 'extra-attack'],
  },

  {
    id: 'seed:hearth-7:ride-the-aura',
    name: 'Ride the Aura',
    priority: 'high',
    category: 'support',
    trigger:
      'The party is spread out, or the fight is starting somewhere you are '
      + 'not standing.',
    actions: [
      'Find Steed is always prepared and costs none of your seven picks. It is '
      + 'one of the free ones, and it is the one nobody casts.',
      'A warhorse moves 60 feet. On foot you carry your {{auraRadius}}-foot '
      + 'aura at 30. Mounted, you carry it at 60 — and the aura is the best '
      + 'thing you own, so doubling how fast it arrives is the strongest thing '
      + 'you can do with movement at this tier.',
      'Its hit points scale off your level, so it is not free to kill — but it '
      + 'is not a wall either. Do not park it in melee and do not expect it to '
      + 'hold a line.',
      'Dismount before anything with an area. A breath weapon that catches both '
      + 'of you is two saving throws, and one of them is a horse.',
      'Then walk. Movement costs no action, no slot and no concentration, and '
      + 'the aura goes where you go. Getting one more body inside the radius '
      + 'beats most spells you were considering casting instead.',
    ],
    requirements: [
      'Find Steed — always prepared, and it costs none of your seven',
      'One 2nd-level slot, spent before the day starts rather than during it',
      'Somewhere to keep a horse. Ask before the dungeon, not at its door.',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'The steed’s fine print — how it acts, whether it attacks, exactly '
          + 'when it takes its turn — is not in the files you gave us, and the '
          + '2024 rules changed it. Cast it once out of combat with your DM '
          + 'watching, write down what you both agree it does, and this card '
          + 'stops being guesswork.',
      },
      {
        kind: 'party',
        text:
          'Mounted, you can reach {{ranger}} or {{rogue}} at the far end of a '
          + 'fight in a single turn. On foot you simply cannot, and the aura '
          + 'they needed arrives a round after the save they failed.',
      },
      {
        kind: 'positioning',
        text:
          'Nothing in this tactic costs an action once the steed exists. '
          + 'Movement is the only free lever you have that gets better the '
          + 'bigger the battlefield is.',
      },
    ],
    tags: ['find-steed', 'movement', 'aura', 'positioning', 'mount'],
  },

  {
    id: 'seed:hearth-7:the-spells-that-are-not-turns',
    name: 'The Spells That Are Not Turns',
    priority: 'normal',
    category: 'support',
    trigger:
      'You are out of initiative — travelling, investigating, negotiating, '
      + 'burying someone, or simply waiting.',
    actions: [
      'Four of your spells are Ritual-tagged: Detect Magic, Detect Poison and '
      + 'Disease, Gentle Repose and Purify Food and Drink. Cast as a Ritual '
      + 'they take ten minutes longer and spend NO slot.',
      'That is four spells you can cast for free, as often as you have ten '
      + 'minutes. If you have been paying slots for them, you have been paying '
      + 'for something that was free.',
      'Zone of Truth does exactly one thing well: it lets an honest creature '
      + 'PROVE they are honest. A liar who makes the save passes for honest, so '
      + 'never read a pass as proof — only a fail is information.',
      'Locate Object finds the thing you have seen, in the place nobody hid it '
      + 'carefully. A sheet of lead ends it. Never build a session on it.',
      'Prayer of Healing takes ten minutes and heals up to five creatures. That '
      + 'is a short rest that also heals — cast it DURING the rest, so you pay '
      + 'the ten minutes once.',
      'Protection from Poison lasts an hour, ends one poison outright, and '
      + 'gives resistance and advantage against the rest. Poison runs the whole '
      + 'range of monsters from rats to dragons; this is a better pick than it '
      + 'looks on the shelf.',
      'Ceremony is a rite, not a tactic — a wedding, a funeral, a coming of '
      + 'age — and it burns 25 GP of powdered silver every time. Prepare it the '
      + 'day the story asks for it and never before.',
      'And Lesser Restoration ends Blinded, Deafened, Paralysed or Poisoned. '
      + 'There is no cleric at this table. If it is not on your list, it is on '
      + 'nobody’s.',
    ],
    requirements: [
      'The Ritual you want PREPARED — a Ritual is free to cast, not free to know',
      'Ten minutes, and nobody shooting at you',
      '25 GP of powdered silver for Ceremony, spent every casting',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'Your two guides disagree here and this card picks a side. One of '
          + 'them says a paladin cannot Ritual cast; your corrections file says '
          + 'the 2024 rules attach Ritual casting to the SPELL rather than the '
          + 'class, so anyone with a Ritual-tagged spell prepared qualifies. '
          + 'This card follows the corrections file, because it is the newer of '
          + 'the two and it was written to correct the other. If your DM rules '
          + 'the older way, all four of these cost slots again — ask once.',
      },
      {
        kind: 'party',
        text:
          'Detect Magic is probably {{wizard}}’s job and Purify Food and Drink '
          + 'is probably nobody’s. Offer the trade: they keep their slot, you '
          + 'cast it as a Ritual for nothing.',
      },
    ],
    tags: [
      'ritual', 'out-of-combat', 'utility', 'preparation', 'zone-of-truth',
      'locate-object',
    ],
  },

  {
    id: 'seed:hearth-7:buy-these-before-the-next-fight',
    name: 'Buy These Before the Next Fight',
    priority: 'normal',
    category: 'support',
    trigger: 'You are in a town, there is a market, and you have coin.',
    actions: [
      'Two platinum rings, 50 GP each. Warding Bond cannot be cast without '
      + 'them — the pair IS the spell. They are not consumed, so it is one '
      + 'purchase, once, forever.',
      'Buy them first, because Warding Bond is on your oath list. Until you own '
      + 'the rings you have been carrying a spell you are physically unable to '
      + 'cast, permanently prepared, taking up nothing and doing nothing.',
      'Holy water, 25 GP a flask, and it is gone when you use it. Your notes '
      + 'list it as a cost per use, not a tool you keep — budget it like '
      + 'ammunition and carry two.',
      'A 300 GP diamond for Revivify. You cannot cast it yet and that is '
      + 'irrelevant: somebody has to be carrying it BEFORE the person dies, and '
      + 'no shop is open at the bottom of a dungeon.',
      'A javelin or a handaxe. A few silver, and the only thing you own that '
      + 'reaches anything you cannot walk to.',
      'Powdered silver, 25 GP, but only on the day Ceremony is going to be '
      + 'prepared. It is spent every casting, so buying it early is buying it '
      + 'twice.',
    ],
    requirements: [
      'Coin, and a settlement with a market',
      'Two platinum rings before Warding Bond is ever cast',
      'A 300 GP diamond in somebody’s pack before anybody needs it',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'These prices come from your own warfare notes, not from a list your '
          + 'DM has agreed to. Treat them as the ORDER to buy things in — rings '
          + 'first, diamond second — rather than as the bill you will be handed.',
      },
      {
        kind: 'party',
        text:
          'The diamond does not have to be yours. {{wizard}} or {{bard}} '
          + 'carrying it is the same outcome and cheaper for you. Decide who, '
          + 'out loud, tonight.',
      },
    ],
    tags: ['shopping', 'components', 'warding-bond', 'revivify', 'consumables'],
  },
]
