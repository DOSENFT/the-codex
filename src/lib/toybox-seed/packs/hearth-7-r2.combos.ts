import type { SeedCombo } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7-r2 — COMBOS

   SLICE 1 SHIPPED ONE, and it was the tracer bullet on purpose. "The Sentinel
   Gate" is the only entry in the slate that exercises `needs` in both
   directions at once — it is a lie for a paladin without Sentinel, and a
   different lie for a paladin whose weapon does not reach — so proving it
   appears for his sheet and is ABSENT for the other two proved the whole
   engine change. Slice 2 adds four more.

   ALL TEN ARE NOW HERE. Slice 4 closed the slate:
     1  The Sentinel Gate                 slice 1   defensive  needs Sentinel + Reach
     2  Three People Stand Up             slice 2   utility
     3  The Free Crit                     slice 2   burst
     4  The Second Swing Is Not Wasted    slice 2   sustained  needs Graze
     5  Through the Door                  slice 2   utility
     6  Bearings and the Backward Walk    slice 3   utility
     7  One Silver Piece of Fire          slice 3   burst
     8  The Shield Round                  slice 3   defensive
     9  Drop the Glaive                   slice 3   utility    needs Two-Handed
    10  The Caster Killer                 slice 4   sustained

   THE ORDER OF THIS LIST IS THE ORDER OF THE ARRAY IS THE ORDER OF THE CARDS
   ON HIS SCREEN. `PACKS` order decides it, round one stays above, and round two
   appends below. Three entries carry a `needs` gate and the other seven reach
   every paladin in the window — the gates are on facts about who a character
   permanently IS, never on equipment, which is the ruling slice 3 made and
   `pack-hearth-7-r2.test.ts` enforces.

   ---------------------------------------------------------------------------
   WHAT SLICE 2 IS FOR: the four that needed no new rules research, meaning
   every mechanic below was read out of a file Marcus supplied rather than out
   of the model's memory. Where a claim could NOT be sourced from his files it
   carries a `warning` saying so, which is the pattern round one set for
   Sentinel and Interception. The three unsourced claims in this slice are
   Graze (in NO file he gave the app, only as a property string on his own
   weapon), the Divine Smite spell's own stat block, and the exact wording of
   the Lucky feat.

   AND ONE CORRECTION TO GATE 1, made while writing "Through the Door". The
   product doc's one-line summary said Divine Sense "is a Bonus Action lasting
   10 minutes… nobody uses it". `paladin_1.txt:109-116` is clear that in 2024 it
   is a CHANNEL DIVINITY OPTION, and at level 7 there are only two of those —
   the same two the Hearthfire cloak spends. Nobody uses it because it costs
   half your armour, which is a far better card than the one Gate 1 described.
   The doc has been corrected; the slate has not changed.

   ---------------------------------------------------------------------------
   A `label` IS ONE LINE. PUT THE PROSE IN `notes`. Slice 2 authored five step
   labels as sentences and every one of them was CUT OFF on Marcus's phone —
   found by `docs/plans/toybox-r2/prove-r2-slice2.mjs`, not by any unit test,
   because the string is perfect in memory and the loss happens in CSS at a
   width no unit test has. `ComboCard.tsx:98` paints a label with `truncate`:
   one line, ellipsis, no wrap. About 287 pixels at 390px. Its `notes` below it
   are a plain `<p>` that wraps as far as it likes.

   So the split is: the label names the ACTION, the notes carry the ARGUMENT.
   That is the convention round one already followed — 36 labels, not one of
   them clipped — and slice 2 was the first content to drift off it.

   DO NOT ENFORCE THIS WITH A CHARACTER COUNT. It was measured, and the count
   is a liar: a 46-character label fit while a 44-character one did not, because
   `—` and `×` are wide and `{{weapon}}` resolves to a name whose length is the
   player's choice ("Hearthbrand" is 11, "The Dawn Guardian" is 17). The only
   honest check is the geometric one in the prover, and slices 3 and 4 add six
   more combos to this file — their provers must carry the same measurement.

   THEY DID, AND THE SLATE IS CLOSED CLEAN. `prove-r2-slice3.mjs` measured slice
   3's twelve step labels and `prove-r2-slice4.mjs` measures all THIRTY of round
   two's, on the sheet that earns every card: none clipped. Both provers also
   count the labels they measured and fail if that count is short, because a
   measurement that silently finds nothing to measure looks exactly like a
   measurement that finds nothing wrong — which is how this convention would
   quietly rot the next time somebody wraps a step row in another element.
   ========================================================================== */

export const HEARTH_7_R2_COMBOS: SeedCombo[] = [
  {
    id: 'seed:hearth-7-r2:the-sentinel-gate',
    name: 'The Sentinel Gate',
    description:
      'The turn you stop being a damage dealer and become a door. You are not '
      + 'blocking a creature — you are blocking a ROUTE, and the route is the only '
      + 'way to the people standing behind you.',
    category: 'defensive',
    /* THE ONLY ENTRY IN THIS PACK THAT NEEDS BOTH KINDS OF FACT, which is why
       slice 1 is built around it. Without Sentinel the reaction does nothing
       the card claims. Without a Reach property `{{weaponReach}}` answers 5 —
       a real number, resolved cleanly — and the combo would paint "Reach 5 ft"
       and read as an odd card rather than an absent one. No token can catch
       that; only this can. */
    needs: { feats: ['Sentinel'], weaponProperties: ['Reach'] },
    blocks: [
      {
        id: 'seed:hearth-7-r2:the-sentinel-gate:1',
        type: 'movement',
        label: 'Take the gap, not the enemy',
        source: 'custom',
        notes:
          'Stand so the {{weaponReach}} feet in front of you is the only lane to the '
          + 'back line. You are choosing a doorway, a bridge, a corridor mouth — '
          + 'geometry, not a target. If there are two lanes this turn does not work.',
      },
      {
        id: 'seed:hearth-7-r2:the-sentinel-gate:2',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Reach {{weaponReach}} ft, {{weaponDice}} + {{strMod}}. Hit whatever is '
          + 'already in the lane — but this is not the point of the turn. The point '
          + 'is that your Reaction is still unspent when their turn starts.',
      },
      {
        id: 'seed:hearth-7-r2:the-sentinel-gate:3',
        type: 'reaction',
        label: 'Opportunity Attack — Speed becomes 0',
        source: 'feature',
        sourceName: 'Sentinel',
        notes:
          'Spend it on the thing running PAST you, never the thing already next to '
          + 'you. On a hit it does not get knocked back and it is not stunned — it '
          + 'simply stops, in the open, next to nobody, with its whole turn spent.',
      },
    ],
    tags: ['control', 'positioning', 'reaction', 'sentinel', 'reach'],
    requirements: [
      'Sentinel',
      'A reach weapon — {{weapon}}',
      'Your Reaction unspent',
      'A lane worth holding: one way through, and your party behind it',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'CHECK THE WORDING WITH YOUR DM. Sentinel’s "they cannot Disengage past '
          + 'you" clause is written for creatures within 5 feet. Your reach is '
          + '{{weaponReach}}. So something at the far edge CAN step away clean — but '
          + 'the moment it closes to 5 ft to get at your casters, the trap shuts. '
          + 'Sentinel is named in your files and never defined in them, so this is '
          + 'read from the 2024 feat and not from anything you gave the app.',
      },
      {
        kind: 'positioning',
        text:
          'The failure mode is standing in the lane instead of beside its mouth. At '
          + '{{weaponReach}} ft you can hold a doorway from outside it, which keeps '
          + 'you out of the funnel everything else is pointed down.',
      },
      {
        kind: 'party',
        text:
          'Tell {{wizard}} and {{bard}} which side of you is safe before the round '
          + 'starts. A gate nobody knows about is just you standing in a corridor.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     2 — THREE PEOPLE STAND UP

     The whole card is one sentence from `paladin_2.txt:83`: "Targets current
     hit points and hit point maximum both increase, so allies at 0 hit points
     are healed". Three targets, 30 feet, one Action, one 2nd-level slot. It is
     the largest thing a level 7 Paladin can do to a losing fight and it is on
     a spell everybody files under "buff".

     NO `needs`. Aid is a Paladin spell any character this pack reaches can
     prepare, and preparing it is a choice rather than a permanent fact — see
     the note on `SeedNeeds` in `types.ts`. The requirement line is what carries
     "you have to have picked it", which is exactly what requirements are for.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:three-people-stand-up',
    name: 'Three People Stand Up',
    description:
      'The turn that un-loses a fight. Aid raises current hit points, not just '
      + 'the maximum — so three friends bleeding out on the floor all stand up at '
      + '5, conscious, in initiative, with their death saves wiped. One Action. '
      + 'One second-level slot. Three turns handed back to your side.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7-r2:three-people-stand-up:1',
        type: 'movement',
        label: 'Get all three inside 30 feet of you',
        source: 'custom',
        notes:
          'The range is measured from you to each of them separately, so the shape '
          + 'you want is a 30-foot circle with you at the centre and three bodies '
          + 'inside it. Move BEFORE you cast. If only two are in range this is the '
          + 'wrong spell and Lay on Hands is the right one.',
      },
      {
        id: 'seed:hearth-7-r2:three-people-stand-up:2',
        type: 'action',
        label: 'Cast Aid at 2nd level on all three',
        source: 'spell',
        sourceName: 'Aid',
        notes:
          'Each target’s hit point maximum AND current hit points go up by 5 for 8 '
          + 'hours. A creature at 0 is no longer at 0, which means it is no longer '
          + 'Unconscious, no longer Dying, and its failed death saves are wiped. '
          + 'They act on their own initiative this round if it has not passed yet.',
      },
      {
        id: 'seed:hearth-7-r2:three-people-stand-up:3',
        type: 'free',
        label: 'Tell them what 5 hit points means',
        source: 'custom',
        notes:
          'Speaking is free. Say it out loud: you are up, you are at 5, and the next '
          + 'hit puts you straight back down. Three people standing up and charging '
          + 'is how this becomes three people on the floor again a round later.',
      },
    ],
    tags: ['rescue', 'support', 'action-economy', 'aid', 'downed'],
    requirements: [
      'Aid prepared',
      'A 2nd-level spell slot',
      'Three allies down, or nearly down, within 30 feet of you',
      'Your Action — this is the whole turn',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'IT LASTS 8 HOURS, AND THAT IS A TRAP LATER. `paladin_2.txt` says it '
          + 'plainly: if the spell ends while someone is below 5 hit points, they '
          + 'drop to 0 and fall Unconscious. So the person you saved at noon can '
          + 'fall over at eight in the evening in the middle of a conversation. '
          + 'Track when you cast it.',
      },
      {
        kind: 'warning',
        text:
          'YOU CANNOT DO IT TWICE IN THE SAME FIGHT. A spell does not stack with '
          + 'itself — re-casting Aid at the same level on the same people does '
          + 'nothing. The second cast has to be at a higher level, and at {{level}} '
          + 'you do not have one. This is a once-per-fight button.',
      },
      {
        kind: 'warning',
        text:
          'Aid’s stat block is not in any file you gave the app; this is read from '
          + 'the 2024 spell and confirmed against `paladin_2.txt`, which is a '
          + 'strategy column rather than a rulebook. Check the range and the '
          + 'target count with your DM once, calmly, before the round where it '
          + 'matters. Everyone at the table will be relieved you did.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     3 — THE FREE CRIT

     `paladin_1.txt:105-107`, verbatim: "Level 2: Paladin's Smite. You always
     have the Divine Smite spell prepared. You can cast it without expending a
     spell slot, but you must finish a Long Rest before you can cast it this way
     again."

     The surprise is not the free cast — it is the ORDER. Divine Smite is cast
     after a hit lands, so you see the d20 before you decide. Everyone spends
     the free one on the first hit of the day. It is worth double on a crit, and
     crits are the one thing you cannot plan, so the correct play is to carry it
     and stay patient.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-free-crit',
    name: 'The Free Crit',
    description:
      'You get one Divine Smite a day that costs no slot. Almost everybody burns '
      + 'it on the first hit of the first fight. Carry it instead — because you '
      + 'decide AFTER you see the die, and a critical hit doubles every smite die '
      + 'you roll. The free one becomes the biggest hit of the day for nothing.',
    category: 'burst',
    blocks: [
      {
        id: 'seed:hearth-7-r2:the-free-crit:1',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          '{{weaponDice}} + {{strMod}} per hit at {{weaponReach}} ft. Declare '
          + 'NOTHING before you roll. This is the entire trick: you are allowed to '
          + 'know the result of the attack before you spend anything on it.',
      },
      {
        id: 'seed:hearth-7-r2:the-free-crit:2',
        type: 'bonus',
        label: 'A 20 came up — free Divine Smite',
        source: 'feature',
        sourceName: 'Paladin’s Smite',
        notes:
          'Once per Long Rest you cast Divine Smite without spending a slot. On a '
          + 'critical hit the attack’s damage dice are rolled twice, and the smite '
          + 'dice are part of that damage. The free cast is the one to spend here '
          + 'because the slot version will still be there afterwards.',
      },
      {
        id: 'seed:hearth-7-r2:the-free-crit:3',
        type: 'free',
        label: 'No crit? Then it keeps.',
        source: 'custom',
        notes:
          'The discipline is the card. A smite on a normal hit is a perfectly good '
          + 'turn and it is also how the free cast gets wasted every single day. It '
          + 'costs nothing to still have it in the third fight.',
      },
    ],
    tags: ['burst', 'smite', 'free', 'patience', 'critical'],
    requirements: [
      'Paladin’s Smite unspent since your last Long Rest',
      'A melee attack that HIT this turn — the spell needs the hit first',
      'Your Bonus Action',
    ],
    annotations: [
      {
        kind: 'positioning',
        text:
          'If Lucky is on your sheet, this is what it is for. Spending a luck point '
          + 'for advantage on a swing roughly doubles your chance of a 20, and '
          + 'advantage is the only way you get to hunt a crit on purpose. Lucky is '
          + 'described in your files only as "grant advantage on important d20 '
          + 'tests" — the point totals are not, so check them on your sheet.',
      },
      {
        kind: 'warning',
        text:
          'LONG rest, not short. Your Channel Divinity comes back after a short '
          + 'rest; this does not. If the party stops for an hour, you get the cloak '
          + 'back and you do NOT get this back.',
      },
      {
        kind: 'warning',
        text:
          'The Divine Smite spell’s own stat block — its damage dice, and the extra '
          + 'die against Fiends and Undead — is in none of the files you gave the '
          + 'app. `paladin_1.txt` confirms the free cast and nothing else. Read the '
          + 'numbers off your own sheet rather than off this card.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     4 — THE SECOND SWING IS NOT WASTED

     GATED ON `Graze`, and the gate is exact rather than approximate: Marcus's
     own export lists "Graze" in `weapons[0].properties`, alongside Two-Handed
     and Reach. So this card is present for a weapon that actually carries the
     mastery and absent otherwise, with no guessing from Two-Handed (a greataxe
     is two-handed and has Cleave, not Graze).

     It is the only combo in the slate whose surprise is a DECISION rather than
     a sequence, which is what made it worth checking against the Gate 1 line.
     It stays a combo: it is one turn, it has numbered steps, and it ends with
     damage on a specific creature.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-second-swing',
    name: 'The Second Swing Is Not Wasted',
    description:
      'Graze means a MISS still deals your Strength modifier in damage. Which '
      + 'means against the armoured thing everyone else is avoiding, your floor is '
      + 'never zero — and the whole calculation about who is worth attacking '
      + 'quietly inverts. You are the one who should be hitting the tank.',
    category: 'sustained',
    needs: { weaponProperties: ['Graze'] },
    blocks: [
      {
        id: 'seed:hearth-7-r2:the-second-swing:1',
        type: 'action',
        label: 'Attack ×2 — {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          '{{weaponDice}} + {{strMod}} on a hit at {{weaponReach}} ft. The second '
          + 'attack is the one people talk themselves out of against high armour. '
          + 'It is the one that is never worth zero.',
      },
      {
        id: 'seed:hearth-7-r2:the-second-swing:2',
        type: 'free',
        label: 'Missed — say "Graze" and deal {{strMod}} anyway',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Same damage type as the weapon. It is not a rider you have to remember '
          + 'to activate and it is not a roll — it is a flat number the moment the '
          + 'attack misses. Two misses in a turn is still {{strMod}} twice.',
      },
      {
        id: 'seed:hearth-7-r2:the-second-swing:3',
        type: 'movement',
        label: 'Do not walk away to find something softer',
        source: 'custom',
        notes:
          'This is where the turn is actually won or lost. Everyone else at the '
          + 'table is right to peel off the armoured one. You are not, because your '
          + 'bad turn against it still lands guaranteed damage — and every round '
          + 'you stand there is a round it is swinging at plate armour instead of '
          + 'at somebody in a robe.',
      },
    ],
    tags: ['sustained', 'graze', 'target-priority', 'floor', 'attrition'],
    requirements: [
      'A weapon with the Graze mastery — {{weapon}}',
      'Your Action, and both attacks',
      'A target whose armour is beating you',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'GRAZE IS IN NONE OF YOUR FILES. The 2024 weapon mastery table is not in '
          + 'anything you gave the app — the word appears only as a property you '
          + 'typed onto {{weapon}} yourself. Everything above is read from the 2024 '
          + 'mastery, including the part that matters most: the damage is your '
          + 'ability modifier and it is NOT increased by anything except raising '
          + 'that modifier. No smite, no Radiant Strikes, no rider.',
      },
      {
        kind: 'warning',
        text:
          'It also does not fire on a miss caused by something other than the roll '
          + '— a target that is out of reach, or an attack you never made. Anything '
          + 'that trades away one of your two attacks trades away a guaranteed '
          + '{{strMod}} with it, which is worth remembering before you accept a '
          + 'deal that "only" costs one swing.',
      },
      {
        kind: 'positioning',
        text:
          'At {{weaponReach}} ft you can be the one standing in front of the heavy '
          + 'thing without anybody else having to be. Tell {{rogue}} and {{ranger}} '
          + 'to spend their turns on the soft targets you are deliberately ignoring.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     5 — THROUGH THE DOOR

     THE GATE 1 CORRECTION LIVES HERE. `paladin_1.txt:109-116`: Divine Sense is
     a Channel Divinity effect, and line 112 says a level 7 Paladin has two
     uses, regaining ONE on a short rest and all on a long rest. The Hearth's
     flaming cloak (`paladin_oath_of_the_hearth.txt:46-54`) is a Reaction that
     spends the same currency.

     That is the card. Not "a free sense nobody uses" — a sense that costs half
     your armour for the fight, which is why nobody uses it, and which makes
     WHEN to spend it the whole decision.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:through-the-door',
    name: 'Through the Door',
    description:
      'Ten minutes of knowing where every Fiend and Undead within 60 feet is — '
      + 'and what type it is — without opening anything. The text asks for range, '
      + 'not line of sight. The reason nobody uses it is that it spends a Channel '
      + 'Divinity, and your flaming cloak spends the same two.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7-r2:through-the-door:1',
        type: 'bonus',
        label: 'Divine Sense — spend one Channel Divinity',
        source: 'feature',
        sourceName: 'Channel Divinity',
        notes:
          'For 10 minutes, or until you are Incapacitated, you know the location '
          + 'and the creature type of every Celestial, Fiend and Undead within 60 '
          + 'feet. In the same radius you detect consecrated or desecrated ground '
          + 'and objects. Ten minutes is roughly a hundred rounds — this is not a '
          + 'combat button, it is a scouting one.',
      },
      {
        id: 'seed:hearth-7-r2:through-the-door:2',
        type: 'movement',
        label: 'Walk the outside wall — keep moving',
        source: 'custom',
        notes:
          'The sense is a 60-foot sphere centred on you and it moves when you do. '
          + 'Walking the length of a corridor sweeps every room off it. Standing '
          + 'still at a doorway reads one room and tells you nothing about what is '
          + 'coming up behind you.',
      },
      {
        id: 'seed:hearth-7-r2:through-the-door:3',
        type: 'free',
        label: 'Report the empty result too',
        source: 'custom',
        notes:
          'A clean sweep is information. "No Fiend, no Undead within sixty feet" '
          + 'means whatever is behind that door is a person, a beast or a machine — '
          + 'which changes what the party prepares and which of your spells is '
          + 'worth a slot.',
      },
    ],
    tags: ['scouting', 'channel-divinity', 'information', 'utility', 'exploration'],
    requirements: [
      'One use of Channel Divinity',
      'Ten minutes you can afford to spend',
      'A wall, a door or a floor you would rather not open blind',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE COST IS THE CARD. At level {{level}} you have two Channel Divinity '
          + 'uses and your Hearthfire cloak spends the same two. Scouting with this '
          + 'before a fight means one cloak in that fight instead of two — one lot '
          + 'of {{cloakTempHp}} temporary hit points, not two. You get exactly one '
          + 'use back on a short rest, so the honest question is whether the party '
          + 'is going to stop for an hour before this matters.',
      },
      {
        kind: 'warning',
        text:
          'IT SEES THREE CREATURE TYPES AND NOTHING ELSE. Celestials, Fiends, '
          + 'Undead. Bandits, cultists, beasts, constructs, dragons and every '
          + 'humanoid alive are invisible to it. "Nothing there" is a much weaker '
          + 'sentence than it sounds and it has got people killed.',
      },
      {
        kind: 'positioning',
        text:
          'The consecrated-and-desecrated half is the part nobody reads. It finds '
          + 'the room a ritual happened in, the ground something was buried under, '
          + 'and the altar behind the wall — with no creature present at all. Tell '
          + '{{rogue}} what you found before they start checking for traps.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     6 — BEARINGS AND THE BACKWARD WALK

     GATE 1 DESCRIBED A SPELL THAT DOES NOT EXIST, and this combo is built on
     the real one instead. `01-product.md` row 3 said Compelled Duel "drags the
     boss across" the bearings. It does not drag anything. The 2024 spell makes
     the target attack everyone-but-you at Disadvantage and stops it moving MORE
     than 30 feet away from you — it never moves the creature an inch. Nothing
     in any file Marcus supplied gives the spell's text; `WARFARE-DOCTRINE.md:53`
     calls it "the only real taunt in the game" and leaves the mechanics out,
     which is how the wrong version got into the product doc.

     THE CARD IS BETTER FOR THE CORRECTION. What actually walks a boss into ball
     bearings is not a leash, it is arithmetic: it wants to reach YOU, it is bad
     at attacking anyone else, and you have put a 10-foot square of loose metal
     in the only path. Spreading them is a Utilize action, so this turn throws
     away both glaive swings — that is the whole surprise, and it is a real
     choice rather than a free rider on a normal turn.

     Ball bearings appear in NO file he gave the app. The DC 10, the 10-foot
     square and the 2 gp all carry a `warning` saying so.

     AND IT NAMES NO WEAPON, deliberately. The first draft's note read "no
     attacks this turn, no {{weapon}}, nothing" — true, and it cost the card its
     audience: a load-bearing token that cannot resolve drops the whole entry, so
     naming the glaive on the one turn the glaive is NOT used would have hidden
     this card from every paladin who does not carry a melee weapon. The rule the
     pack now follows twice (here and in The Shield Round): name `{{weapon}}`
     only when the weapon is the point.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:bearings-and-the-backward-walk',
    name: 'Bearings and the Backward Walk',
    description:
      'A turn where you deal no damage at all and it is the strongest thing on '
      + 'the table. You are not fighting the boss — you are making the floor '
      + 'between you and it cost something, and then refusing to stand still.',
    category: 'utility',
    blocks: [
      {
        id: 'seed:hearth-7-r2:bearings-and-the-backward-walk:1',
        type: 'action',
        label: 'Utilize — spread the ball bearings',
        source: 'item',
        sourceName: 'Ball bearings',
        notes:
          'A 10-foot square, laid in the ONE path between it and you. This is '
          + 'your whole Action: no attacks this turn, no damage, nothing. You '
          + 'are buying the next two rounds with this one.',
      },
      {
        id: 'seed:hearth-7-r2:bearings-and-the-backward-walk:2',
        type: 'bonus',
        label: 'Compelled Duel — you are the only target',
        source: 'spell',
        sourceName: 'Compelled Duel',
        notes:
          'Wisdom save against DC {{saveDC}}. On a failure everything it swings '
          + 'at anyone else is at Disadvantage, and it cannot willingly get more '
          + 'than 30 feet from you. It does NOT drag it toward you — it makes '
          + 'coming after you the only move worth making.',
      },
      {
        id: 'seed:hearth-7-r2:bearings-and-the-backward-walk:3',
        type: 'movement',
        label: 'Walk backward — the bearings between you',
        source: 'custom',
        notes:
          'Backward, so you never enter your own square — the bearings do not '
          + 'care whose they are. Stay inside 30 feet or the spell has nothing to '
          + 'hold. Now it has to cross to reach you, and crossing is the trap.',
      },
    ],
    tags: ['control', 'terrain', 'positioning', 'compelled-duel', 'equipment'],
    requirements: [
      'A bag of ball bearings — 2 gp, and you own none',
      'Compelled Duel prepared',
      'A 1st-level slot, and Concentration free',
      'One path between it and you. Two paths and this is just litter',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'PRONE AT REACH IS A PENALTY, NOT A PRIZE — and your own files have '
          + 'this backwards. `HEARTH-ERRATA.md` and `WARFARE-DOCTRINE.md` both '
          + 'say Prone means your next attack has Advantage. The 2024 condition '
          + 'says Advantage only if you are within 5 FEET; from farther away it '
          + 'is Disadvantage. Your reach is {{weaponReach}}. So when it goes down '
          + 'in the bearings, the turn that follows is a turn you step IN to five '
          + 'feet — which is the opposite of everything else a reach weapon wants, '
          + 'and it is the reason this card exists.',
      },
      {
        kind: 'warning',
        text:
          'NONE OF THE EQUIPMENT NUMBERS ARE FROM YOUR FILES. Ball bearings do '
          + 'not appear in a single document you gave the app. The 10-foot '
          + 'square, the DC 10 Dexterity save, the Prone result and the 2 gp price '
          + 'are read from the 2024 equipment list. Check them once, then delete '
          + 'this warning.',
      },
      {
        kind: 'positioning',
        text:
          'The spell ends if you attack anybody else, so this is a commitment for '
          + 'the whole minute, not for this turn. Say the boss’s name out loud '
          + 'before you cast, and mean it.',
      },
      {
        kind: 'party',
        text:
          'This turn hands {{wizard}} and {{rogue}} a stationary target that is '
          + 'bad at hitting them and cannot leave. Tell them the adds are theirs '
          + 'now, because the adds are the one thing you have given up.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     7 — ONE SILVER PIECE OF FIRE

     THE PRODUCT DOC PAIRED THE OIL WITH BURNING HANDS AND THAT IS TWO TURNS.
     Throwing the flask is an attack, and Burning Hands is an Action — they
     cannot both happen on one turn, and a combo is one turn. So the igniter
     here is Searing Smite, which is a BONUS action taken after a melee hit, and
     the whole thing collapses into a single turn:

       swing 1 of the Attack action is the flask · swing 2 is the glaive ·
       the glaive hit pays for Searing Smite · Searing Smite is fire ·
       fire is what the oil was waiting for.

     Burning Hands is still the right answer when more than one thing is oiled,
     and the notes say so — but that is next turn, and next turn is a tactic.

     BURNING HANDS IS SOURCED; THE OIL IS NOT. `paladin_oath_of_the_hearth.txt:32`
     grants Faerie Fire and Burning Hands as always-prepared oath spells at
     paladin level 3, so it is his by his own file. The flask of oil's 5 Fire is
     2024 equipment and appears in nothing he supplied — `warning`.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:one-silver-piece-of-fire',
    name: 'One Silver Piece of Fire',
    description:
      'The cheapest thing in your pack does more work than the magic sword. A '
      + 'flask of oil costs one silver piece, and your entire subclass is a '
      + 'machine for setting things on fire.',
    category: 'burst',
    blocks: [
      {
        id: 'seed:hearth-7-r2:one-silver-piece-of-fire:1',
        type: 'action',
        label: 'Attack ×2 — flask, then {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'The first swing is the flask, thrown — an improvised weapon attack, '
          + '20 feet. Hold {{weapon}} one-handed to throw, then take it in both '
          + 'hands for the second swing, which is {{weaponDice}} + {{strMod}} at '
          + '{{weaponReach}} ft. Drawing the flask is your free object '
          + 'interaction, so draw it before you need it.',
      },
      {
        id: 'seed:hearth-7-r2:one-silver-piece-of-fire:2',
        type: 'bonus',
        label: 'Searing Smite — the match',
        source: 'spell',
        sourceName: 'Searing Smite',
        notes:
          'Cast after the second swing HITS. It is fire, and fire is the only '
          + 'thing the oil is waiting for: the target takes the smite dice, plus '
          + 'the oil’s extra 5 Fire, plus Searing Smite’s burn at the start of '
          + 'every one of its turns until it puts itself out.',
      },
      {
        id: 'seed:hearth-7-r2:one-silver-piece-of-fire:3',
        type: 'free',
        label: 'Say the word oiled out loud',
        source: 'custom',
        notes:
          'Everyone at the table who can deal fire damage now has a better turn '
          + 'than they had a second ago. The oil rewards the NEXT fire too, not '
          + 'only yours.',
      },
    ],
    tags: ['fire', 'equipment', 'burst', 'searing-smite', 'oil'],
    requirements: [
      'A flask of oil — 1 sp, and you carry none',
      'Searing Smite prepared, and a 1st-level slot',
      'A free hand to throw with',
      'Your Bonus Action unspent',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE OIL RULE IS NOT IN ANY FILE YOU GAVE THE APP. The flask, the 20-'
          + 'foot throw, the covered condition and the extra 5 Fire are read from '
          + 'the 2024 equipment list, not from your books. Burning Hands, by '
          + 'contrast, IS yours in writing — your oath grants it always-prepared '
          + 'at paladin level 3. Check the oil once with your DM.',
      },
      {
        kind: 'warning',
        text:
          'MISSING WITH THE FLASK COSTS YOU HALF THE TURN, and improvised weapons '
          + 'are not something you are proficient with — so that throw is at '
          + '{{strMod}} without your {{prof}} proficiency bonus. Against high '
          + 'armour, throw at the ground beside it and ask your DM to treat the '
          + 'splash as cover instead; against a big slow target, just throw.',
      },
      {
        kind: 'positioning',
        text:
          'When two or more things are oiled, stop doing this and cast Burning '
          + 'Hands instead — a 15-foot cone, and every oiled creature in it eats '
          + 'the extra 5 Fire on top of the cone damage. That is the version worth '
          + 'setting up over two rounds.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     8 — THE SHIELD ROUND

     MARCUS ASKED FOR THIS ONE IN HIS OWN WORDS, at Gate 1: "I have plate mail
     which is ac 18 without a shield… should the circumstance arise or the
     tactic be need for a shield, I may switch to shield for tanker build for a
     moment or something." The card is that sentence made runnable.

     IT DELIBERATELY DEALS NO DAMAGE, which makes it the second no-damage combo
     in this pack and that is not an accident — Gate 1's quality bar is that a
     combo must contain a surprise, and "the best turn available is one where
     you never roll to hit" is the surprise round two was missing.

     NO `{{weapon}}` ANYWHERE, on purpose. The whole point is the turn he is NOT
     holding the glaive in two hands, so naming it would be wrong as well as
     costing the card for an archer.

     The Action cost of donning a shield is 2024 equipment rules and is in none
     of his files — `warning`.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-shield-round',
    name: 'The Shield Round',
    description:
      'The turn you stop being a glaive. You spend the whole Action putting a '
      + 'shield on, roll no attacks at all, and walk away from it at AC 20 with '
      + 'fire on your skin. Some rounds the win condition is that nobody died.',
    category: 'defensive',
    blocks: [
      {
        id: 'seed:hearth-7-r2:the-shield-round:1',
        type: 'action',
        label: 'Don the shield — AC 18 becomes 20',
        source: 'item',
        sourceName: 'Shield',
        notes:
          'Strapping a shield on is the entire Action. You get no attacks. Say '
          + 'it out loud as you do it, because from the outside it looks like you '
          + 'wasted a turn and it is the opposite.',
      },
      {
        id: 'seed:hearth-7-r2:the-shield-round:2',
        type: 'bonus',
        label: 'Hearthfire Manifest — the cloak',
        source: 'feature',
        sourceName: 'Hearthfire Manifest',
        notes:
          '{{cloakTempHp}} temporary hit points, and 1d10 fire back into anything '
          + 'that hits you in melee. Stacked on AC 20 this is the most expensive '
          + 'thing on the board to punch, which is the entire proposal.',
      },
      {
        id: 'seed:hearth-7-r2:the-shield-round:3',
        type: 'movement',
        label: 'Stand in front of whoever is bleeding',
        source: 'custom',
        notes:
          'AC does nothing for a person it is not standing in front of. Move '
          + 'onto the square between the thing and the ally it wants, and keep '
          + 'your {{auraRadius}}-ft aura over as many of them as it reaches.',
      },
    ],
    tags: ['defensive', 'tank', 'shield', 'hearthfire', 'equipment'],
    requirements: [
      'A shield, carried and not stowed',
      'A one-handed weapon for afterwards — you own none',
      'Channel Divinity unspent',
      'A reason: someone is about to die and it should be you instead',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE ACTION COST IS THE WHOLE DECISION AND IT IS NOT IN YOUR FILES. '
          + 'That donning a shield takes an Action rather than being free is read '
          + 'from the 2024 equipment rules; no document you supplied says it. If '
          + 'your DM rules it free, this stops being a combo and becomes a thing '
          + 'you just do — ask once, because the answer changes the card.',
      },
      {
        kind: 'warning',
        text:
          'YOU CANNOT GO BACK FOR FREE. The glaive is two-handed, so the shield '
          + 'and the glaive are mutually exclusive for as long as it is on — and '
          + 'taking it off is another Action. Without a one-handed weapon in your '
          + 'pack you spend the following rounds shoving and grappling, which is '
          + 'sometimes right and never a plan.',
      },
      {
        kind: 'positioning',
        text:
          'This is the round to take when the enemy has already chosen its '
          + 'target and that target is not you. You are not adding damage — you '
          + 'are changing who is standing where, and AC 20 makes changing its '
          + 'mind expensive.',
      },
      {
        kind: 'party',
        text:
          'Say it to {{wizard}} and {{bard}} plainly: no damage from me this '
          + 'round. A defender who goes quiet reads as a defender who is losing, '
          + 'and the back line plays worse for it.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     9 — DROP THE GLAIVE

     THE ONLY OTHER `needs` ENTRY IN THE PACK, and it is a genuine one rather
     than a demonstration. The card is about giving up a two-handed weapon to
     free a hand. A paladin already carrying a one-handed sword HAS a free hand,
     so for them the whole premise is nonsense and the right answer is for the
     card not to exist — which is exactly what `needs.weaponProperties` is for.

     THE RULES ARE MARCUS'S OWN, and this is the best-sourced card in the pack.
     `CORRECTIONS.md` section 6 is his file and it is unambiguous: Grapple is a
     saving throw, not a contested check; the DC is 8 + Strength modifier +
     Proficiency Bonus; the target picks Strength or Dexterity; and Grapple is
     an option of the Unarmed Strike WITHIN the Attack action. Nothing here is
     read from the model's memory except the free-hand requirement and the
     half-speed drag, both of which are annotated.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:drop-the-glaive',
    name: 'Drop the Glaive',
    description:
      'The desperate one. Your best weapon hits the floor on purpose, because '
      + 'the thing standing over your unconscious friend does not need to be '
      + 'killed — it needs to be MOVED, and hands do that better than blades.',
    category: 'utility',
    /* A one-handed paladin has a free hand already and does not need to drop
       anything. The card is only true for a two-handed weapon. */
    needs: { weaponProperties: ['Two-Handed'] },
    blocks: [
      {
        id: 'seed:hearth-7-r2:drop-the-glaive:1',
        type: 'free',
        label: 'Drop {{weapon}}',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Dropping costs nothing at all — not your Action, not your object '
          + 'interaction. It lands in your space and it is still there next turn. '
          + 'This is the cheapest part of the turn and the part that feels worst.',
      },
      {
        id: 'seed:hearth-7-r2:drop-the-glaive:2',
        type: 'action',
        label: 'Attack ×2 — Grapple, then strike',
        source: 'custom',
        notes:
          'Unarmed Strikes. Make the first one the Grapple option: it saves with '
          + 'Strength or Dexterity, its choice, against DC 8 + {{strMod}} + '
          + '{{prof}}. Spend the second on the Damage option for 1 + {{strMod}} '
          + 'bludgeoning — or on a second Grapple attempt if the first missed.',
      },
      {
        id: 'seed:hearth-7-r2:drop-the-glaive:3',
        type: 'movement',
        label: 'Drag it off your friend',
        source: 'custom',
        notes:
          'Your Speed is halved while dragging, so this is fifteen feet, not '
          + 'thirty — and fifteen feet is enough to put your body between it and '
          + 'the person on the floor. That was the whole objective.',
      },
    ],
    tags: ['grapple', 'rescue', 'control', 'desperate', 'positioning'],
    requirements: [
      'A free hand — which is why {{weapon}} goes on the floor',
      'Something worth more than a round of damage: a downed ally, a doorway',
      'Strength {{strMod}} and the nerve to roll no attack rolls',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE GRAPPLE MATH IS FROM YOUR OWN CORRECTIONS FILE, not from general '
          + 'memory — section 6, in your words: a saving throw rather than an '
          + 'opposed Athletics check, and the target picks which of Strength or '
          + 'Dexterity it saves with. The DC itself is on the step above. Two '
          + 'things here are NOT in your files and should be checked once: that '
          + 'Grapple needs a free hand, and that dragging halves your Speed.',
      },
      {
        kind: 'warning',
        text:
          'SIZE IS THE FIRST QUESTION, NOT THE DC. You cannot grapple anything '
          + 'more than one size larger than you. Against an ogre this is a legal '
          + 'and reasonable play; against a giant it is not a play at all, and the '
          + 'card will not tell you which one is in front of you.',
      },
      {
        kind: 'positioning',
        text:
          'Picking {{weapon}} back up next turn is your one free object '
          + 'interaction — so next turn you can hold it AND attack, but you '
          + 'cannot also drink a potion. Plan the turn after this one before you '
          + 'commit to this one.',
      },
      {
        kind: 'party',
        text:
          'Shout it at {{bard}} before you move: you are about to open a lane to '
          + 'the body on the floor, and somebody who is not you has to be running '
          + 'down it while you are busy holding the thing that put them there.',
      },
    ],
  },

  /* ------------------------------------------------------------------------
     10 — THE CASTER KILLER

     THE LAST OF THE TEN, AND THE ONLY ONE WHOSE PAYOFF ARRIVES AFTER THE TURN
     IS OVER. Every other combo in this pack resolves inside its own round. This
     one spends a Bonus Action and a first-level slot to buy a saving throw at
     the start of every one of the enemy's turns for up to a minute — which is
     why its category is `sustained` and why the annotations end by telling him
     to LEAVE. A card that keeps working while he walks away is a different kind
     of object from the other nine, and the pack was missing one.

     THE SURPRISE, WHICH IS ARITHMETIC HE CAN CHECK: the Concentration save is a
     flat DC 10 — 10, or half the damage taken if that is higher. It does not
     scale with his spell save DC and it does not scale with how hard he hits.
     A 3-point burn and a 9-point Divine Smite force the SAME roll. So against a
     spellcaster, the big radiant number is the wrong tool: Divine Smite buys one
     save, Searing Smite buys up to ten. That inversion — "your worst damage
     spell is your best anti-caster spell" — is the thing Gate 1's quality bar
     asks for, and it is the reason this card is not "attack twice and smite".

     `{{weapon}}` AND `{{weaponReach}}` ARE LOAD-BEARING HERE ON PURPOSE, which
     is the rule slice 3 wrote down being applied rather than ignored: name the
     weapon only when the weapon is the point. Here it is the point twice over.
     Searing Smite has to be paid for by a melee hit, so a paladin holding
     nothing cannot run this turn at all and the card is right to be absent for
     them; and the reach is what lets him touch a back-line caster forty feet
     away without standing in the back line. Contrast "The Shield Round", which
     names no weapon because its whole subject is the round he is not holding
     one.

     WHAT IS SOURCED AND WHAT IS NOT — three separate questions, three warnings,
     and this card is the worst-sourced in the pack, which the warnings say
     plainly rather than hide:

       · That Searing Smite is a Paladin spell he should have prepared IS his:
         `paladin_1.txt:83` recommends it by name at level 1.
       · That it burns for 1d6 per spell level at the start of each of the
         target's turns comes from `paladin_2.txt:70` — a third-party opinion
         column, not a stat block. It also mentions a save to end it, which the
         card must not quietly drop.
       · Whether it requires HIS Concentration is genuinely unresolved. Gate 1
         logged it as open question 2. `WARFARE-DOCTRINE.md:97` says it does not,
         and that file is already known to be wrong about Prone, so its word is
         not enough. If it IS Concentration, this combo cannot be run alongside
         Bless or Compelled Duel and every hit he takes threatens to end it —
         which changes the turn completely. It is asked, not answered.

     The Concentration rule itself — damage forces a Constitution save, DC 10 or
     half the damage — is core 2024 rules and is in none of his files either. It
     is carried in the same warning as the DC, because the DC is the part that
     changes his decision.
     ---------------------------------------------------------------------- */
  {
    id: 'seed:hearth-7-r2:the-caster-killer',
    name: 'The Caster Killer',
    description:
      'You do not have to kill a spellcaster. You have to make it roll one '
      + 'saving throw too many — and one first-level slot buys you a roll at the '
      + 'start of every one of its turns for a minute.',
    /* `sustained`, and it is the only one in the pack. The other nine are over
       when the turn is over; this one is still burning three rounds later. */
    category: 'sustained',
    blocks: [
      {
        id: 'seed:hearth-7-r2:the-caster-killer:1',
        type: 'movement',
        label: 'Close to {{weaponReach}} ft — no further',
        source: 'custom',
        notes:
          'You are not diving the back line, you are delivering one match. '
          + 'Thirty feet of movement plus {{weaponReach}} of reach touches '
          + 'something forty feet away while you are still standing short of the '
          + 'bodies guarding it. Where you end up matters far less than usual, '
          + 'because what you are about to leave behind does not need you.',
      },
      {
        id: 'seed:hearth-7-r2:the-caster-killer:2',
        type: 'action',
        label: 'Attack ×2 — hit the caster',
        source: 'weapon',
        sourceName: '{{weapon}}',
        notes:
          'Both swings at the caster, and you are not trying to drop it. You '
          + 'need ONE hit to pay for the Bonus Action below — and every point of '
          + 'damage you land on it, on either swing, forces a Concentration save '
          + 'the moment it lands. Two swings is two saves before the fire is even '
          + 'lit.',
      },
      {
        id: 'seed:hearth-7-r2:the-caster-killer:3',
        type: 'bonus',
        label: 'Searing Smite, not Divine Smite',
        source: 'spell',
        sourceName: 'Searing Smite',
        notes:
          'Cast it the instant a swing HITS. Divine Smite is the bigger number '
          + 'and the worse answer: it forces exactly one save, and then it is '
          + 'gone. Searing Smite sets the target alight and burns it at the start '
          + 'of every one of its turns for up to a minute — and every one of those '
          + 'burns is another save against its own spell.',
      },
    ],
    tags: ['anti-caster', 'searing-smite', 'concentration', 'fire', 'sustained'],
    requirements: [
      'Searing Smite prepared, and a 1st-level slot',
      'An enemy actually concentrating on something worth ending',
      'Your Bonus Action unspent',
      'To be able to touch it — {{weaponReach}} ft of reach and thirty of Speed',
    ],
    annotations: [
      {
        kind: 'warning',
        text:
          'THE CONCENTRATION SAVE IS A FLAT DC 10, NOT YOUR {{saveDC}}. It is 10, '
          + 'or half the damage taken if that is higher — so a 3-point burn and a '
          + '9-point Divine Smite make it roll exactly the same number. Only a hit '
          + 'over twenty damage raises the DC at all. That is the entire reason '
          + 'this card exists: against Concentration you win by making it roll '
          + 'OFTEN, not by hitting HARD. Neither this rule nor its DC is written '
          + 'in any file you gave the app — check it once, and then trust it.',
      },
      {
        kind: 'warning',
        text:
          'IS SEARING SMITE CONCENTRATION? YOUR OWN FILES SAY NO AND CANNOT PROVE '
          + 'IT. WARFARE-DOCTRINE.md line 97 says it is not, and that is the same '
          + 'file that gets Prone backwards, so it is not enough on its own. This '
          + 'is not a footnote: if the spell DOES take your Concentration, you '
          + 'cannot run this alongside Bless or Compelled Duel, and every hit you '
          + 'take threatens to put your own fire out. Ask your DM once, before you '
          + 'build a round on it.',
      },
      {
        kind: 'warning',
        text:
          'THE BURN NUMBERS COME FROM A COLUMN, NOT A STAT BLOCK. paladin_2.txt '
          + 'says 1d6 of Fire per spell level immediately and again at the start '
          + 'of each of the target’s turns for up to a minute — and it also '
          + 'mentions a saving throw the target can make, which would end the fire '
          + 'early. That file is somebody’s opinion piece. The spell that IS yours '
          + 'in writing is Searing Smite itself: paladin_1.txt line 83 recommends '
          + 'it to you by name at level 1. Read the last part off your own sheet.',
      },
      {
        kind: 'positioning',
        text:
          'IF YOUR WEAPON HAS GRAZE, THIS IS THE PART NOBODY EXPECTS. Graze deals '
          + 'your Strength modifier on a MISS, and damage is damage — it forces '
          + 'the Concentration save just the same. A miss cannot pay for the smite, '
          + 'because a miss is not a hit. But it can still break the spell. '
          + 'Against a caster, your bad rolls stop being bad rolls.',
      },
      {
        kind: 'party',
        text:
          'Tell {{wizard}} in one sentence: it is burning, and it is saving '
          + 'against its own spell every round. A second source of damage in the '
          + 'same round is a second save, and one damage cantrip is often what '
          + 'actually strips the shield. Then say the other half out loud — the '
          + 'fire does not need you standing next to it, so you are free to go and '
          + 'be a wall somewhere else.',
      },
    ],
  },
]
