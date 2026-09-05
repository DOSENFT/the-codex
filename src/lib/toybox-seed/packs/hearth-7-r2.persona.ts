import type { SeedPersonaPlay } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7-r2 — PERSONA PLAYS

   SIX, AS OF SLICE 6, and they are the reason this pack is not shareable.

   Round one's persona file is written under the `types.ts` ruling that a pack
   is authored for a KIND of character and not for a person — no Selis, no Fate,
   no Scar, no pendant. That ruling was right for a shareable starter pack and
   `pack-hearth-7.test.ts` still enforces it on round one, name by name.

   Marcus lifted it for THIS pack, in these words, on 2026-09-04: "Use all of
   it." So round two's plays name Selis, Fate, Scar, Rysanna, Khaonn and the
   Hidden Kingdom. That licence is scoped to `hearth-7-r2` and is NOT a repeal —
   it is written into `types.ts` beside the ruling it excepts, and
   `pack-hearth-7-r2.test.ts` asserts the exception is USED. That direction
   matters: a test that merely PERMITTED the names would stay green if a later
   author quietly stripped them back out to match round one.

   THE SIX, in the order they paint:
     1  Fate Wants to Do Something Stupid          the spirit as a character
     2  Ask Scar                                   deferring on purpose
     3  The Eyes You Never Change                  the one lie he cannot drop
     4  While the Nations War                      the Hidden Kingdom
     5  Two Sentences About the Fire               grief that does not stall
     6  The Face That Opens the Door               Shape-Shifter, priced right

   WHERE THE FACTS COME FROM. The backstory, the relationships, the unresolved
   threads and the personality seeds are all read straight off
   `codex-nix-lvl7 (2) (1).json` — they are his own words and are quoted rather
   than invented. Play 4's line "While the nations war for power, we build what
   comes after" is verbatim from `backstory.unresolvedThreads`. Every CHANGELING
   RULE is from `CORRECTIONS.md §15`, which is Marcus-supplied canon, and NOT
   from `changling.txt`, which is a pre-2024 blog scrape that gets the action
   type, the ability score increase and the creature type all wrong. Where a
   play leans on a rule, it names §15 so he can check it.

   AND THE TWO CONSTRAINTS ROUND ONE FOUND ON THE GLASS, still binding:

   NO QUOTATION MARKS IN `keyPhrases`. `ToyboxPanel` wraps each phrase in
   `&ldquo;…&rdquo;` itself, so a phrase carrying its own quotes paints as
   ““like this””.

   `skillCheck` IS A BADGE, NOT A SENTENCE. It renders in the collapsed header
   row beside a 44px star, the play's name and a chevron, on a 390px phone, and
   it does not truncate — every character is taken from the name. 24 is the
   measured ceiling and the test enforces it. Anything needing more words goes
   in `approach`, where there is room.
   ========================================================================== */

export const HEARTH_7_R2_PERSONA: SeedPersonaPlay[] = [
  {
    id: 'seed:hearth-7-r2:fate-wants-something-stupid',
    name: 'Fate Wants to Do Something Stupid',
    situation:
      'A scene with nothing at stake and the table has gone quiet — or a moment '
      + 'where you are about to do the safe, correct, boring thing and everybody '
      + 'already knows you will.',
    approach:
      'Fate is a wildfire spirit that came out of Selis’s burning pendant, and '
      + 'your own sheet calls it impulsive, mischievous and sometimes '
      + 'destructive. Play it as a creature with an appetite, not as a mood ring '
      + 'that glows when you are sad. Give it ONE want at the start of the '
      + 'session — something small and physical, a lit candle, a shiny buckle, '
      + 'an open window — and let it act on that want once, at the worst '
      + 'possible moment, in a way that costs YOU something small. A knocked '
      + 'lamp. A singed contract. A spooked horse. Never a way that costs '
      + 'somebody else something large; that is not the spirit being alive, that '
      + 'is you taking the party’s turn.',
    keyPhrases: [
      'Fate. Fate. Look at me. — Sorry. You were saying.',
      'Ignore it. It does that. It has opinions about doors.',
    ],
    skillCheck: 'No roll — play it',
    annotations: [
      {
        kind: 'warning',
        text:
          'Fate has no stat block. Not in this app, not in any file you have '
          + 'given it. No hit points, no actions, no rule for whether it can be '
          + 'targeted or grabbed or put out. That is fine while it is set '
          + 'dressing and it is a problem the first time it matters, which will '
          + 'be in the middle of a fight. Ask your DM three questions once: can '
          + 'Fate be attacked, can it carry something, and does it act while you '
          + 'are unconscious. Then write the answers on your sheet.',
      },
      {
        kind: 'positioning',
        text:
          'The strongest version is Fate wanting the thing YOU want and are not '
          + 'allowed to say. You hold the line, politely, in your oath voice — '
          + 'and the fire on your shoulder goes for the man’s throat anyway. It '
          + 'says the sentence you swore not to, and you get to apologise for it '
          + 'without taking it back.',
      },
      {
        kind: 'party',
        text:
          '{{bard}} will play with this if you let them, and that is worth more '
          + 'than any line you write for it. A companion the other players talk '
          + 'TO becomes real at the table; one only you narrate stays a prop.',
      },
    ],
    tags: ['roleplay', 'fate', 'companion', 'scene-work'],
  },

  {
    id: 'seed:hearth-7-r2:ask-scar',
    name: 'Ask Scar',
    situation:
      'The oath does not obviously cover the thing in front of you, and you can '
      + 'feel yourself assembling a reason for the answer you already wanted.',
    approach:
      'Stop assembling and hand it to Scar. Your sheet says it plainly: his '
      + 'black-and-white morality is the compass you are not sure you still '
      + 'have. So do not explain the nuance to him — the nuance is the problem. '
      + 'Give him the two options in one plain sentence each, take whatever he '
      + 'says, and do that. It turns a decision you would have agonised over '
      + 'alone into a two-line scene the whole table got to watch, and it is the '
      + 'single fastest way to show who your character is without narrating his '
      + 'interior.',
    keyPhrases: [
      'Scar. Two things. We take the money and go, or we stay and it gets hard. '
      + 'Which one is the good one?',
      'You already know what I am going to say. Say it first, so I have to hear '
      + 'it out loud.',
    ],
    skillCheck: 'No roll — ask Scar',
    annotations: [
      {
        kind: 'warning',
        text:
          'Scar is your DM’s to voice, not yours. Asking is the play; answering '
          + 'for him is you having a conversation with yourself in front of four '
          + 'other people. If your DM does not pick him up, ask the question and '
          + 'then sit in the silence — that is a scene too.',
      },
      {
        kind: 'party',
        text:
          '{{rogue}} recognised Scar’s voice as somebody called Hopscotch, from '
          + 'a past where that person was supposed to be dead. It is an open '
          + 'thread on your own sheet. Asking Scar things in front of {{rogue}} '
          + 'is how that thread gets pulled — decide whether you want it pulled '
          + 'before you ask, not after.',
      },
      {
        kind: 'positioning',
        text:
          'Use it BEFORE you rationalise, not after. Once you have said the '
          + 'clever version out loud, asking Scar reads as looking for '
          + 'permission, and he will give it to you, and you will both be wrong.',
      },
    ],
    tags: ['roleplay', 'scar', 'oath', 'party', 'decision'],
  },

  {
    id: 'seed:hearth-7-r2:the-eyes-you-never-change',
    name: 'The Eyes You Never Change',
    situation:
      'Somebody has looked at your eyes a beat too long. Polished silver, and '
      + 'you never change them — not in any face, not once, not ever.',
    approach:
      'Decide the answer NOW and never improvise it again. Your standing line is '
      + 'that it is a rare half-elf defect, and the thing that catches a liar is '
      + 'never the lie, it is the second telling. Same words, same bored voice, '
      + 'every time — then move the conversation one step forward yourself so '
      + 'they have somewhere else to go. Keep a second answer ready for the one '
      + 'person who does not buy it: not the truth, but something true-shaped '
      + 'and costly. A thing you got from a mother you did not like is both, and '
      + 'it is even true.',
    keyPhrases: [
      'Half-elf thing. Runs in the family. Rysanna had them and I did not much '
      + 'like her either.',
      'You can look. Everyone looks. It is the only interesting thing about a '
      + 'face I did not choose.',
    ],
    skillCheck: 'Deception (untrained)',
    annotations: [
      {
        kind: 'warning',
        text:
          'YOUR SHEET LISTS TWO SKILL PROFICIENCIES — Athletics and Persuasion. '
          + 'Per CORRECTIONS.md §15 the changeling grants two social skills on '
          + 'its own, chosen from Deception, Insight, Intimidation, Performance '
          + 'and Persuasion, and a 2024 background grants two more on top of '
          + 'your class picks. Two is not enough of them. Deception is the skill '
          + 'this play would use and right now it is a flat {{chaMod}} with no '
          + 'proficiency behind it. Count what is on your sheet against what you '
          + 'are owed before the next session.',
      },
      {
        kind: 'warning',
        text:
          'BEING A CHANGELING IS NOT ONLY A DISGUISE, and this is the part every '
          + 'legacy write-up misses. In 2024 you are FEY, not Humanoid '
          + '(CORRECTIONS.md §15). Charm Person and Hold Person do not work on '
          + 'you at all. Protection from Evil and Good, Magic Circle and Hallow '
          + 'do. That is a combat fact hiding inside a social trait, and it is '
          + 'worth telling your DM once, out of character, so it is not '
          + 'discovered in the round it matters.',
      },
      {
        kind: 'positioning',
        text:
          'The eyes are the one true thing on a face you can otherwise build '
          + 'from nothing — your own sheet calls them the one truth you cannot '
          + 'hide. So the play is not hiding them. It is making them boring. A '
          + 'detail you volunteer first stops being a detail anyone investigates.',
      },
    ],
    tags: ['roleplay', 'changeling', 'deception', 'secret'],
  },

  {
    id: 'seed:hearth-7-r2:while-the-nations-war',
    name: 'While the Nations War',
    situation:
      'You have met somebody the world has already thrown away — and they are '
      + 'good at something.',
    approach:
      'This is the only long game written anywhere on your sheet: the Hidden '
      + 'Kingdom, a shadow nation for outcasts and the forgotten. Recruit ONE '
      + 'person per arc and never pitch to a room. The pitch is a job, not an '
      + 'ideology: ask what they are good at, ask what it cost them, and offer a '
      + 'place where the second answer stops mattering. Do not name a kingdom — '
      + 'nobody joins a country that does not exist. They join a person who came '
      + 'back for them.',
    keyPhrases: [
      'While the nations war for power, we build what comes after.',
      'I was called Khaonn until a village decided I was nothing and made a word '
      + 'for it. You have your own version of that word. I am asking what you '
      + 'would be if nobody used it.',
    ],
    skillCheck: 'Persuasion',
    annotations: [
      {
        kind: 'warning',
        text:
          'This sits on your sheet as an unresolved thread and it has never once '
          + 'been on a card, which means it has almost certainly never been in a '
          + 'session. A long game your DM does not know you are playing is not a '
          + 'long game, it is a note. Say it out loud once, out of character, '
          + 'between sessions — that single sentence is what turns it into plot.',
      },
      {
        kind: 'positioning',
        text:
          'Pitch it AFTER they have watched you do something at cost, never '
          + 'before. The oath does the recruiting; the speech only names what '
          + 'they already saw. Pitch first and you are a stranger with a cause, '
          + 'which is the thing outcasts have learned to walk away from.',
      },
      {
        kind: 'party',
        text:
          'Look at who you are already travelling with. {{ranger}} is looking '
          + 'for a father nobody else is looking for, and {{bard}} is a tinker '
          + 'nobody commissioned. Your first recruits are at the table, and none '
          + 'of them have heard the pitch.',
      },
    ],
    tags: ['roleplay', 'hidden-kingdom', 'persuasion', 'long-game'],
  },

  {
    id: 'seed:hearth-7-r2:when-they-ask-about-the-fire',
    /* THE NAME AND THE BADGE TRADE ROOM, AND THE GLASS SETTLED THE TRADE. The
       first draft was "When Someone Asks About the Fire" with a badge reading
       "No roll — two sentences", and `prove-r2-slice6.mjs` measured the name at
       100px into a 60px box: five lines of title in a three-line clamp, on a
       390px phone. The badge does not truncate and the name does, so every one
       of those 23 badge characters was taken out of the title.

       So the technique moved into the NAME, where it is the first thing he
       reads, and the badge shrank to the only part that was ever a skill check.
       "Two sentences" is the play; "No roll" is the answer to what to roll. The
       id did not move — it is a storage key, not a title. */
    name: 'Two Sentences About the Fire',
    situation:
      'Somebody asks where the brand on your palm came from, or why you have '
      + 'gone quiet at a lit field, and the honest answer is a dead friend.',
    approach:
      'Have the two-sentence version ready and lead with it every single time. '
      + 'What you did, what it cost, and then a question that hands the scene '
      + 'back. The long version is real and it is worth playing — but it belongs '
      + 'to one person in a quiet moment, not to a table of five with initiative '
      + 'about to be rolled. The rule is simple enough to hold under pressure: '
      + 'two sentences in a group, as long as you like one to one.',
    keyPhrases: [
      'I set a fire to impress people who were not worth it, and it killed the '
      + 'one person who was. Ask me something else.',
      'Her name was Selis. That is as far as I go tonight.',
    ],
    skillCheck: 'No roll',
    annotations: [
      {
        kind: 'warning',
        text:
          'The twenty-minute version is what costs the table, and it is the '
          + 'version this play exists to prevent. Grief performed at length in a '
          + 'group scene stops being your character and starts being the part of '
          + 'the evening the other four sat through. Two sentences is not you '
          + 'holding back — it is the only version anyone can actually respond '
          + 'to.',
      },
      {
        kind: 'positioning',
        text:
          'The brand on your palm is a prompt anybody can pull, so decide '
          + 'deliberately when it is visible. Gloves on when you do not want the '
          + 'scene; palm open on the table when you do. That is a choice you get '
          + 'to make every session and it costs nothing.',
      },
      {
        kind: 'party',
        text:
          'Pick ONE of them to eventually get the long version — {{wizard}} is '
          + 'the quiet one and asks questions rather than answering them. Grief '
          + 'given to everybody at once is a monologue. Given to one person, at '
          + 'the right moment, it is a relationship, and it is the only thing '
          + 'that pays back the years you have spent not saying it.',
      },
    ],
    tags: ['roleplay', 'selis', 'grief', 'table-manners'],
  },

  {
    id: 'seed:hearth-7-r2:the-face-that-opens-the-door',
    name: 'The Face That Opens the Door',
    situation:
      'A door, a name, a ledger or a room that opens for somebody — just not '
      + 'for a man in plate with a goliath standing behind him.',
    approach:
      'Shape-Shifter is an ACTION, not a Bonus Action, and it can only make you '
      + 'look like another playable species — so spend it around the corner, '
      + 'before anybody is looking, and out of the armour. While shifted you '
      + 'have ADVANTAGE ON CHARISMA CHECKS; with Persuasion proficiency {{prof}} '
      + 'riding on a {{chaMod}} modifier and two dice under it, that is the best '
      + 'social roll anybody at your table can make. Then pick the right face: '
      + 'not an impressive one, a face with a boring reason to already be there.',
    keyPhrases: [
      'I am expected. Check the second page — it will be under a different name, '
      + 'they always do that.',
      'Do not look at me, look at the paperwork. I am the boring part of your '
      + 'evening.',
    ],
    /* ABBREVIATED BECAUSE THE FULL WORD COST THE TITLE FOUR LINES. "Persuasion,
       advantage" measured 146px, which squeezed "The Face That Opens the Door"
       into 81px and clipped it. `adv.` is table shorthand every player at a D&D
       table already reads, and dropping the word entirely was the wrong fix:
       advantage IS this play. Losing it from the badge would leave a card that
       looks like an ordinary Persuasion check. */
    skillCheck: 'Persuasion, adv.',
    annotations: [
      {
        kind: 'warning',
        text:
          'EVERY NUMBER HERE COMES FROM CORRECTIONS.md §15 AND NOT FROM YOUR '
          + 'CHANGELING FILE, which is two editions out of date: it says Bonus '
          + 'Action, it says +2 Charisma from your species, and it says nothing '
          + 'at all about advantage — the trait that makes this play worth '
          + 'having. The 2024 changeling comes from Eberron: Forge of the '
          + 'Artificer, published 2025. Confirm your DM has that book in play '
          + 'before you build a session around this.',
      },
      {
        kind: 'positioning',
        text:
          'Shift out of sight AND out of the plate. Your armour has '
          + 'disadvantage on Stealth and a face that arrives in full plate is a '
          + 'face somebody remembers — which defeats the entire point of having '
          + 'spent an Action on a different one. Change first, walk in second.',
      },
      {
        kind: 'party',
        text:
          'Only Scar and these four know what you are. {{wizard}}, {{rogue}}, '
          + '{{ranger}} and {{bard}} can cover a shift by simply not reacting to '
          + 'it. Anyone else who sees it learns a secret that is Scar’s as much '
          + 'as it is yours, and he does not get a vote in the moment you spend '
          + 'it.',
      },
    ],
    tags: ['roleplay', 'changeling', 'infiltration', 'persuasion', 'social'],
  },
]
