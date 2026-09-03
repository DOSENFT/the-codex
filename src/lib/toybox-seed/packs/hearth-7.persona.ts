import type { SeedPersonaPlay } from '../types'

/* ==========================================================================
   PACK CONTENT: hearth-7 — PERSONA PLAYS

   Five. Slice 5 shipped one and said the rest waited on Marcus; slice 8 is
   the answer, and it is written against the ONE source that is legitimately
   his and not Nix's: the three tenets of the oath, from
   `paladin_oath_of_the_hearth.txt` lines 19-23.

     Tend the hearth with holy effort.
     Gather to the hearth those in need of warmth and rest.
     Guard the hearth with the flame within and the flame without.

   ONE PLAY PER TENET, PLUS TWO. The two are the situations a paladin of this
   oath actually loses at the table: getting through a door that will not open
   for four armed strangers (slice 5's play), and disagreeing with your own
   party without stalling the session for twenty minutes.

   WHY NOTHING HERE IS ABOUT NIX. This pack is authored for a KIND of
   character, not a person — that ruling is in `types.ts` and it binds this
   file hardest, because a voice is the thing most tempting to write from the
   sheet in front of you. His backstory is extraordinary and none of it is
   in a play: no Selis, no Fate, no pendant, no fire in the field. A play
   that named them would be dead content for every other paladin and, worse,
   would put words about his dead friend in a card he did not write. The
   tenets are shared; the grief is his.

   ONE NAME IS THE DOCUMENTED EXCEPTION: Scar, once, in the warning on the
   first play — because the sentence that warning makes is that the secret is
   his too, and it cannot be made without him. It is a WARNING, which says why
   a play is ABSENT, not a play that trades on him. `pack-hearth-7.test.ts`
   skips Scar in its backstory-name sweep for exactly that reason and pins the
   changeling mention to that one annotation. This paragraph exists because
   the header used to read "no Scar" while the file said otherwise, and a
   comment that contradicts its own code is worse than no comment.

   AND NOTHING HERE SPENDS THE CHANGELING, STILL. His changeling file is two
   editions stale (`CORRECTIONS.md §15`: Fey rather than Humanoid, no species
   ASI, advantage on Charisma checks while shape-shifted), so any play built
   on shape-shifting would be built on wrong rules — and the secret is Scar's
   and the party's as much as it is Nix's, which is a table decision and not a
   content decision. The warning on the first play says so out loud rather
   than leaving the absence to be noticed, and `pack-hearth-7.test.ts` requires
   the word to appear ONLY in that warning: never in a situation, an approach,
   a phrase or a tag.

   NO QUOTATION MARKS IN `keyPhrases`. `PersonaPlayCard` wraps each phrase in
   `&ldquo;…&rdquo;` itself, so a phrase carrying its own quotes paints as
   ““like this””. That was a real defect, found on the glass in slice 5.

   AND `skillCheck` IS A BADGE, NOT A SENTENCE. It renders in the collapsed
   header row beside a 44px star, the play's name and a chevron, on a 390px
   phone, and it does not truncate — every character is taken from the name.
   24 is the measured ceiling and the test enforces it. Anything that needs
   more words goes in `approach`, where there is room.
   ========================================================================== */

export const HEARTH_7_PERSONA: SeedPersonaPlay[] = [
  {
    id: 'seed:hearth-7:the-paladin-who-asks-first',
    name: 'The Paladin Who Asks First',
    situation:
      'A door, a gate, a guard — someone who will not open for four armed '
      + 'strangers, and the party is already looking at you.',
    approach:
      'You are proficient in Persuasion and your Charisma is {{chaMod}}, so '
      + 'proficiency {{prof}} rides on top of it — nobody else at the table is '
      + 'better equipped for this roll. Lead with the oath, not the face. The '
      + 'hearth is a promise of shelter, so offer it before you ask for anything.',
    /* NO QUOTATION MARKS IN THESE STRINGS. `PersonaPlayCard` wraps each phrase
       in `&ldquo;…&rdquo;` itself, so a phrase that carries its own quotes
       paints as ““like this””. */
    keyPhrases: [
      'You don’t have to let us in. Tell me what you need kept out, and I’ll '
      + 'stand out here and keep it out.',
      'I’m not asking you to trust four people. Trust one, and I’ll answer for '
      + 'the rest.',
    ],
    /* ONE WORD, AND THAT IS A SIZE DECISION. This renders as a Badge in the
       card's collapsed header row, beside a 44px star, the play's name and a
       chevron. On a 390px phone every character here is taken from the name,
       and the badge does not truncate — so the numbers live in `approach`,
       where there is room to say what they mean. */
    skillCheck: 'Persuasion',
    annotations: [
      {
        kind: 'warning',
        text:
          'Nothing here spends the changeling. Your source file on changelings '
          + 'is two editions out of date, and the secret is Scar’s and the '
          + 'party’s as much as it is yours — so no play has been written that '
          + 'trades on it. Say the word if you want this tab to go there.',
      },
    ],
    tags: ['social', 'persuasion', 'oath-forward'],
  },

  /* ------------------------------------------------------------------ *
   * Slice 8 begins here. One per tenet, then the party one.            *
   * ------------------------------------------------------------------ */

  {
    /* TENET 1 — "Tend the hearth with holy effort." */
    id: 'seed:hearth-7:the-work-before-the-ask',
    name: 'The Work Before the Ask',
    situation:
      'You need something from people who owe you nothing — a village, an '
      + 'innkeeper, a steward who has already decided about you — and you have '
      + 'no coin, no title and no leverage.',
    approach:
      'Your oath finds the holiness in the labour, so do the labour, and do it '
      + 'where they can see it. Split the wood. Mend the fence. Take the watch '
      + 'nobody wanted. Then ask, once, plainly. It turns a check you might '
      + 'fail into one your DM is looking for a reason to let you pass — and it '
      + 'costs a scene rather than a spell slot.',
    keyPhrases: [
      'Your woodpile is low and I have arms. Point me at it, and we can talk '
      + 'after.',
      'I’m not asking you to like us. I’m asking you to let us be useful first, '
      + 'and judge us second.',
    ],
    skillCheck: 'Work first, then ask',
    annotations: [
      {
        kind: 'positioning',
        text:
          'This is the tenet, not a trick. Do the work even when the ask '
          + 'fails — the tenet says tend the hearth, and it does not say tend '
          + 'it in exchange for something.',
      },
      {
        kind: 'warning',
        text:
          'It costs table time, and table time is the one resource the party '
          + 'shares. Say it in a sentence and let the DM decide how long it '
          + 'took. Narrating an afternoon of chores is how a good play becomes '
          + 'the part of the session everyone waited through.',
      },
    ],
    tags: ['social', 'tenet', 'tend', 'labour', 'oath-forward'],
  },

  {
    /* TENET 2 — "Gather to the hearth those in need of warmth and rest." */
    id: 'seed:hearth-7:gather-them-in',
    name: 'Gather Them In',
    situation:
      'Frightened people. Survivors, refugees, a child, somebody who has just '
      + 'watched their home stop being one — and the party has somewhere to be.',
    approach:
      'This is the tenet you swore, so it is not a detour and it is not '
      + 'optional. Do not open with what happened; open with tonight. Warmth, '
      + 'food, a wall, a name. Then promise exactly one specific next thing — '
      + 'small enough that they can believe it, and small enough that you will '
      + 'actually do it.',
    keyPhrases: [
      'You don’t have to tell me anything tonight. Sit. Eat. It’ll still be '
      + 'true in the morning.',
      'I can get you as far as the next town. That’s what I have. Do you want '
      + 'it?',
    ],
    skillCheck: 'No roll — just do it',
    annotations: [
      {
        kind: 'warning',
        text:
          'Never promise safety. You cannot deliver it and the oath does not '
          + 'ask you to — it asks you to gather them and to guard them, which '
          + 'are things you can actually do tonight. A promise you break is '
          + 'worse than a promise you never made.',
      },
      {
        kind: 'party',
        text:
          '{{ranger}} and {{rogue}} will want to move on, and they are not '
          + 'wrong to. Say out loud that this is the oath rather than a side '
          + 'quest, so nobody spends the next hour thinking you have lost the '
          + 'thread of the job.',
      },
    ],
    tags: ['social', 'tenet', 'gather', 'shelter', 'oath-forward'],
  },

  {
    /* TENET 3 — "Guard the hearth with the flame within and the flame
       without." The tenet that is not a spell. */
    id: 'seed:hearth-7:standing-between',
    name: 'Standing Between',
    situation:
      'Somebody is about to hurt somebody who cannot stop them — a bully, a '
      + 'captain, a collector, a crowd — and talking has run out.',
    approach:
      'Do not threaten. Describe. Step physically between them and the person, '
      + 'and say what happens next in the flattest voice you own. Your DM reads '
      + 'your position before your sentence, so move first and speak second. '
      + 'Half of this play is where you are standing.',
    keyPhrases: [
      'I’m not going to move. You get to decide what that costs you.',
      'Go home. There’s nothing here for you tonight, and I’m the reason.',
    ],
    skillCheck: 'Intimidation',
    annotations: [
      {
        kind: 'positioning',
        text:
          'The step comes before the line. A paladin who says this from behind '
          + 'somebody else is making a threat; one who says it from in front of '
          + 'the person is stating a fact, and DMs hear the difference.',
      },
      {
        kind: 'warning',
        text:
          'Intimidation is a Charisma check and you may not be proficient in '
          + 'it — check your sheet before you lean on this. The play is still '
          + 'worth running on a failed roll, because failing it leaves you '
          + 'exactly where the oath wanted you: in the way.',
      },
    ],
    tags: ['social', 'tenet', 'guard', 'intimidation', 'positioning'],
  },

  {
    /* NOT A TENET — the situation the tenets create. This is the play that
       decides whether a paladin is fun to sit next to. */
    id: 'seed:hearth-7:when-the-oath-says-no',
    name: 'When the Oath Says No',
    situation:
      'The party’s plan needs somebody left behind, something burned, or '
      + 'something taken from people who have nothing. You swore not to.',
    approach:
      'Do not moralise and do not veto. Say the tenet once, plainly, and offer '
      + 'in the same breath the version that costs YOU instead of them — you '
      + 'are the one with the aura, the healing pool and the body that goes '
      + 'first. That turns an objection into a plan, which is the only form of '
      + 'objection a table forgives.',
    keyPhrases: [
      'I won’t do it that way. Here’s the way I will do it, and I’ll go first.',
      'I’m not telling you what to do. I’m telling you where I’ll be standing.',
    ],
    skillCheck: 'No roll — party talk',
    annotations: [
      {
        kind: 'warning',
        text:
          'This is the play most likely to stall a session. One exchange, with '
          + 'the alternative offered in the same breath, and then let it go. An '
          + 'oath argued for twenty minutes is an evening nobody enjoyed, and '
          + 'the oath does not ask you to win the argument.',
      },
      {
        kind: 'party',
        text:
          'It is usually {{rogue}}’s plan, and {{rogue}} is usually right about '
          + 'the job. Keep the objection about the plan and never about the '
          + 'person, or you will be having the same conversation every session.',
      },
    ],
    tags: ['social', 'oath', 'party', 'conflict', 'table-manners'],
  },
]
