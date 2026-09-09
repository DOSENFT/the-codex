/* The bank — real beats, on the device, that need no network.
 *
 * ── WHY THIS FILE IS DATA AND NOT A FEATURE FLAG ────────────────────────────
 * Marcus's answer when asked how the AI should behave: *"Keep it live, but make
 * it never fail visibly."* `lib/ai.ts` now retries a 503 (commit be55b6c), which
 * covers a spike. It does not cover a dead phone signal at a friend's house, a
 * key that expired, or a model that answers with something unusable — and at a
 * table every one of those is the same event: he taps, and nothing comes.
 *
 * A spinner that resolves into an apology is worse than no button. So the app
 * keeps a bank of complete, genuinely usable beats and fills the card from it,
 * silently and instantly, whenever live cannot deliver. He sees a card. He
 * always sees a card.
 *
 * ── THE RULE EVERY ENTRY BELOW OBEYS ────────────────────────────────────────
 * NOTHING HERE NAMES A CHARACTER, A CAMPAIGN OR A WORLD. A banked beat has to
 * work at a campfire, in a throne room and in the back of a cart, which means it
 * can only lean on structure — offer, heighten, button — and never on content.
 * `bank.test.ts` greps for proper nouns and fails if one appears.
 *
 * These are drawn from the actual grammar of long-form improv: make an offer
 * that cannot be refused, ask a question so small it cannot be failed, take the
 * answer completely seriously, and always leave with a button. That grammar is
 * the reason a generic beat still lands. */

import type { Beat, BeatDirection, BeatMove } from './beat'
import type { BeatIntent } from './types'

export interface BankedBeat {
  bankId: string
  /** Who the beat wants. `person` gets a name substituted in; `dm` and `room`
   *  are aimed at the table itself and never carry one. */
  aimKind: 'person' | 'dm' | 'room'
  useWhen: string
  moves: BeatMove[]
  goal: string
  followUp: string
  directions: BeatDirection[]
  out: string
}

/* ─── pull-in ────────────────────────────────────────────────────────────────
   The most important intent in the file, because it is the one he described
   himself with: "I'm the social engine". Every entry hands the other person a
   question so small they cannot fail it. */

const PULL_IN: readonly BankedBeat[] = [
  {
    bankId: 'pull-in/one-object',
    aimKind: 'person',
    useWhen: 'Someone has been quiet for a while, or has never played before, and an open floor would be the cruellest thing you could hand them.',
    moves: [
      { kind: 'do', text: 'Make room physically first — shift your seat, push something toward them, hand them a thing. You are not asking permission; you are already including them.' },
      { kind: 'say', text: '"You have got the look of someone who left in a hurry."' },
      { kind: 'ask', text: '"What did you take with you that you did not need?"' },
    ],
    goal: 'Give them a question with exactly one correct-sized answer: an object. Nobody can fail to name an object, and the moment they name one, they have invented backstory they will defend for the rest of the campaign.',
    followUp: 'Take whatever they name completely seriously. Repeat it back once, out loud. Then ask who gave it to them. Two questions in, they are playing.',
    directions: [
      { label: 'Warmer', text: 'Answer it yourself, and go first with something unheroic. Trade for trade.' },
      { label: 'Darker', text: 'The object was stolen. Do not flinch — ask who is still looking for it.' },
      { label: 'Wider', text: 'Turn it on the circle: everyone names one thing they would run back into a fire for.' },
    ],
    out: 'Answer your own question, laugh at your answer, and pass the moment to the person on their other side. They are off the hook and nobody noticed.',
  },
  {
    bankId: 'pull-in/expert-witness',
    aimKind: 'person',
    useWhen: 'A new player is watching rather than playing, and needs a reason to speak that is about competence instead of confidence.',
    moves: [
      { kind: 'do', text: 'Turn your whole body toward them. Not your head — your body. The table follows your shoulders.' },
      { kind: 'say', text: '"You have seen more of these than I have. I am not being polite."' },
      { kind: 'ask', text: '"What am I missing?"' },
    ],
    goal: 'Hand them authority instead of a spotlight. Being asked for an opinion is easy; being asked to perform is not. This is the single fastest way to make a nervous player feel like their character matters.',
    followUp: 'Whatever they say, act on it immediately and visibly. Change what you were about to do because of their answer. That is the moment they realise they are actually playing.',
    directions: [
      { label: 'Escalate', text: 'Follow their advice into something dangerous. Now you are in it together.' },
      { label: 'Complicate', text: 'You disagree, and say so with respect. Disagreement between allies is free drama.' },
      { label: 'Bond', text: 'Ask where they learned it. Backstory, volunteered.' },
    ],
    out: '"Then we do it your way." Move on. They got a win either way.',
  },
  {
    bankId: 'pull-in/hand-them-the-thing',
    aimKind: 'person',
    useWhen: 'The scene has a physical object in it and someone at the table has not touched the story in twenty minutes.',
    moves: [
      { kind: 'do', text: 'Physically hand them something — a map, a cup, a weapon, a letter. Put it in their hands before you speak.' },
      { kind: 'say', text: '"Hold this. I do not trust myself with it right now."' },
    ],
    goal: 'An object in your hands is a reason to speak. It converts "say something interesting" — which is paralysing — into "react to this thing", which is easy.',
    followUp: 'Watch what they do with it and narrate their care or their carelessness back to them. Give their smallest choice weight.',
    directions: [
      { label: 'Trust', text: 'Explain why them, specifically. Make it a real reason.' },
      { label: 'Tension', text: 'Ask for it back too quickly. Something changed and you will not say what.' },
      { label: 'Wider', text: 'The DM now has to decide what the object does. You just gave them a plot.' },
    ],
    out: 'Take it back with a joke about your own paranoia. The bit closes itself.',
  },
]

/* ─── open-scene ─────────────────────────────────────────────────────────── */

const OPEN_SCENE: readonly BankedBeat[] = [
  {
    bankId: 'open-scene/one-rule',
    aimKind: 'room',
    useWhen: 'Downtime, a camp, a fire, a long ride — the group is together, nothing is attacking, and everyone is waiting for someone to start.',
    moves: [
      { kind: 'do', text: 'Stop doing whatever busywork you are doing. Set it down where everyone can see you set it down.' },
      { kind: 'say', text: '"Before we sleep. One rule for tonight: nobody lies. Starting with me."' },
    ],
    goal: 'The most reliable opener in improv: declare a format, then be the first to obey it. It gives every player permission and a shape, and it costs them nothing to join.',
    followUp: 'Go first and go small. A real, unheroic admission in one sentence — not a monologue. Then look at exactly one person and wait. The silence is the invitation; do not fill it.',
    directions: [
      { label: 'Escalate', text: 'Say out loud that each truth has to be bigger than the last one.' },
      { label: 'Complicate', text: 'Someone lies anyway and you know it. Say nothing. Remember it.' },
      { label: 'Bond', text: 'Two truths rhyme. Name the rhyme out loud — that is a party forming.' },
    ],
    out: '"...and the rule expires at dawn." Pick your work back up. The scene closes itself.',
  },
  {
    bankId: 'open-scene/what-are-we-not-saying',
    aimKind: 'room',
    useWhen: 'Right after something went badly, and the group has moved on too fast.',
    moves: [
      { kind: 'do', text: 'Sit down. Deliberately. Make it clear you are not going anywhere for a minute.' },
      { kind: 'say', text: '"We are all being very calm about what happened back there."' },
    ],
    goal: 'Name the avoidance instead of the event. A group will always take an invitation to discuss the thing they are not discussing — and it puts the emotional beat where the plot beat was.',
    followUp: 'Do not offer your own opinion first here. Let the silence go one beat past comfortable. Whoever breaks it has just told you what their character cares about.',
    directions: [
      { label: 'Blame', text: 'Someone points at someone. Do not defuse it immediately — let it sit.' },
      { label: 'Grief', text: 'It was not anger, it was fear. Say so and be the first to be scared.' },
      { label: 'Resolve', text: 'Turn it into a promise the party makes out loud. Promises are plot.' },
    ],
    out: '"Or we ride on and never mention it. That works too." Stand up. Nobody has to take it.',
  },
  {
    bankId: 'open-scene/first-watch',
    aimKind: 'person',
    useWhen: 'Night, camp, a watch rotation — the classic two-hander that the table almost always skips past.',
    moves: [
      { kind: 'do', text: 'Take the watch nobody wanted, then wake one specific person early to sit with you.' },
      { kind: 'say', text: '"You do not have to talk. I just did not want to be the only one awake."' },
    ],
    goal: 'Two-person scenes are where campaigns actually get their relationships. This one gives the other player an explicit permission to say nothing, which paradoxically is what makes them talk.',
    followUp: 'Talk about something small and physical first — the cold, the fire, a sound. Never open on the big question. The big question arrives on its own about four lines in.',
    directions: [
      { label: 'Confession', text: 'One of you says the thing you would not say in daylight.' },
      { label: 'Interrupt', text: 'Something in the dark. The moment is stolen and now it is precious.' },
      { label: 'Habit', text: 'Agree to do this again tomorrow. You have just invented a ritual.' },
    ],
    out: '"Go back to sleep. I have got it." Let them off. The offer stands for another night.',
  },
]

/* ─── react ──────────────────────────────────────────────────────────────── */

const REACT: readonly BankedBeat[] = [
  {
    bankId: 'react/body-first',
    aimKind: 'dm',
    useWhen: 'Something just arrived, the table has gone quiet, and you have about four seconds before someone calls for initiative and the roleplay window closes for the night.',
    moves: [
      { kind: 'do', text: 'Move your body before you decide anything. Step in front of the smallest person near you. It is a reflex, not a choice, and reflexes are characterisation.' },
      { kind: 'say', text: '"Behind me. Now. Talk to me when it is over."' },
      { kind: 'ask', text: 'To the DM: "What do I smell before I see them?"' },
    ],
    goal: 'Claim the first four seconds. Whoever moves first in a surprise sets the emotional tone of the whole encounter, and asking the DM for one sense detail makes them improvise texture instead of numbers.',
    followUp: 'Whatever detail the DM invents, use the exact word they used in your next line. They will remember that you listened, and they will give you more next time.',
    directions: [
      { label: 'Into combat', text: 'You already have position and a protected ally. Roll clean.' },
      { label: 'Into a scene', text: 'Whoever you shielded owes you a look afterwards. Collect it.' },
      { label: 'Into a mistake', text: 'It was not an ambush. You drew steel on a friend. Better.' },
    ],
    out: 'Hold the stance one beat too long, then: "...huh." Let the table laugh. A misread played straight is a character trait.',
  },
  {
    bankId: 'react/take-it-personally',
    aimKind: 'dm',
    useWhen: 'Someone has just insulted, dismissed or threatened the party, and the obvious move is a comeback.',
    moves: [
      { kind: 'do', text: 'Do not answer immediately. Finish what you were doing first — slowly, completely — and only then look up.' },
      { kind: 'say', text: '"Say the last part again. I want to be sure I heard it."' },
    ],
    goal: 'Delay is the strongest reaction in the room. A comeback trades one line for one line; a pause makes the whole table wait on you and hands the other character the job of escalating or backing down.',
    followUp: 'Whatever they do next, do not match their volume. Come in quieter than them. The gap does the work.',
    directions: [
      { label: 'Escalate', text: 'They repeat it. Now it is a scene and everyone is watching.' },
      { label: 'Deflate', text: 'They soften. Let them. Mercy is a flex.' },
      { label: 'Redirect', text: 'Answer to the room instead of to them. Play to the audience in the fiction.' },
    ],
    out: '"...I misheard. Carry on." Return to what you were doing. The threat you did not make is still in the room.',
  },
  {
    bankId: 'react/name-the-feeling',
    aimKind: 'room',
    useWhen: 'A revelation just landed and the table is doing exposition instead of feeling anything.',
    moves: [
      { kind: 'do', text: 'React physically before anyone gets to the logistics — sit down, put a hand out, step back.' },
      { kind: 'say', text: '"Give me a second. That is not a small thing you just said."' },
    ],
    goal: 'Stop the table from processing a story beat as a puzzle. One character insisting the moment is big is what makes it big for everyone.',
    followUp: 'Ask the person who delivered it how long they have known. Duration is what turns information into betrayal, relief or grief.',
    directions: [
      { label: 'Hurt', text: 'They should have told you sooner. Say it without raising your voice.' },
      { label: 'Protect', text: 'Immediately ask who else knows and who is now in danger.' },
      { label: 'Believe', text: 'Take it entirely on faith, out loud. Trust is the rarest move at a table.' },
    ],
    out: '"Right. Later." Move to the practical thing. The beat is banked and you can spend it whenever you want.',
  },
]

/* ─── raise ──────────────────────────────────────────────────────────────── */

const RAISE: readonly BankedBeat[] = [
  {
    bankId: 'raise/make-it-cost',
    aimKind: 'room',
    useWhen: 'The plan is agreed, everyone is comfortable, and the scene is about to end without anything being at risk.',
    moves: [
      { kind: 'do', text: 'Put something of yours on the table — literally. An object, a promise, a name.' },
      { kind: 'say', text: '"If I am wrong about this, I will hand it over and I will not argue. Say it back to me so it counts."' },
    ],
    goal: 'Stakes are not danger; stakes are something specific that a named character loses. Volunteering your own is the fastest way to create them and the only way that never feels like the DM punishing the party.',
    followUp: 'Get one other person to stake something too. Two stakes is a story; one stake is a mood.',
    directions: [
      { label: 'Heighten', text: 'Someone raises you. Let them win the exchange.' },
      { label: 'Fracture', text: 'Someone refuses to stake anything. That refusal is now the scene.' },
      { label: 'Bind', text: 'Make it a formal oath. Oaths are load-bearing in this game.' },
    ],
    out: '"...or we just do not get it wrong." Pocket the thing. The offer was still heard.',
  },
  {
    bankId: 'raise/deadline',
    aimKind: 'dm',
    useWhen: 'The party is debating and has been for real-world minutes. Nothing is wrong; nothing is moving either.',
    moves: [
      { kind: 'do', text: 'Stand up mid-discussion and start getting ready to go.' },
      { kind: 'say', text: '"I am leaving at first light with or without a plan. I would rather it was with."' },
      { kind: 'ask', text: 'To the DM: "What is happening out there while we argue?"' },
    ],
    goal: 'Convert an open debate into a countdown. A deadline invented by a player is worth three invented by the DM, because nobody can accuse it of being railroading.',
    followUp: 'Mean it. If they are still arguing at first light, go. A threat you carry out once is a threat you never have to repeat.',
    directions: [
      { label: 'Split', text: 'Half the party comes. Split parties are the best scenes in the game.' },
      { label: 'Rally', text: 'It snaps them into a decision. Take none of the credit.' },
      { label: 'Backfire', text: 'They let you go alone. Now you are in a story about consequence.' },
    ],
    out: '"Fine — one more hour." Sit back down. You bought the table a clock either way.',
  },
  {
    bankId: 'raise/say-the-quiet-thing',
    aimKind: 'person',
    useWhen: 'Two characters have an unspoken tension and the campaign keeps stepping around it.',
    moves: [
      { kind: 'do', text: 'Get close enough that this is a two-person conversation happening in front of witnesses.' },
      { kind: 'say', text: '"I am going to say it once, badly, and then we never have to do this again."' },
    ],
    goal: 'Announcing that you are about to be honest gives both players a frame and a way out, which is what makes it safe enough to actually be honest. This is scene-work, not confrontation.',
    followUp: 'Say the smaller true thing rather than the biggest one. Small honesty is believable; big honesty sounds like a speech.',
    directions: [
      { label: 'Repair', text: 'They meet you. The relationship changes for good.' },
      { label: 'Refuse', text: 'They will not engage. Let that be an answer and let it hurt.' },
      { label: 'Detonate', text: 'It comes out worse than you meant. Play the damage, do not undo it.' },
    ],
    out: '"That is all. Forget I did that." Step back. Everyone gets to pretend it did not happen.',
  },
]

/* ─── land ───────────────────────────────────────────────────────────────── */

const LAND: readonly BankedBeat[] = [
  {
    bankId: 'land/the-button',
    aimKind: 'room',
    useWhen: 'A scene has peaked and is now going on two minutes too long, which is where most good table moments go to die.',
    moves: [
      { kind: 'do', text: 'Do the physical thing that ends scenes: stand, sheathe, close, turn away.' },
      { kind: 'say', text: 'One short line that repeats a word from earlier in the scene, then stop talking entirely.' },
    ],
    goal: 'A button is a callback plus an exit. Ending a scene deliberately is the single most valuable and least practised skill at a table, and the person who does it is the person everyone remembers as good at this.',
    followUp: 'Do not explain the callback. If one person catches it, that is the correct number of people.',
    directions: [
      { label: 'Silence', text: 'Nobody speaks after it. Let the DM cut the scene.' },
      { label: 'Echo', text: 'Someone else repeats the word back. Now it is the party\'s word.' },
      { label: 'Undercut', text: 'Immediately trip over something. Puncture your own exit on purpose.' },
    ],
    out: 'If nobody caught it, just keep walking. A button that misses costs nothing.',
  },
  {
    bankId: 'land/give-it-away',
    aimKind: 'person',
    useWhen: 'You just had the big moment, the table is looking at you, and you can feel the spotlight sticking.',
    moves: [
      { kind: 'do', text: 'Turn to whoever helped you least visibly and put the moment on them.' },
      { kind: 'say', text: '"That was not me. Tell them what you did."' },
    ],
    goal: 'Hand the win to another player. This is what the best table players do and it is why people want to play with them — and it makes your character look larger, not smaller.',
    followUp: 'Then be quiet for a full minute. Let them have it entirely. Resist adding one more detail.',
    directions: [
      { label: 'Spotlight', text: 'They tell it and it becomes their moment. Perfect.' },
      { label: 'Deflect', text: 'They hand it back. Refuse it again, once, and mean it.' },
      { label: 'Ritual', text: 'Do this every time. It becomes who your character is.' },
    ],
    out: 'If they will not take it, finish the story yourself in one sentence and credit them in it anyway.',
  },
  {
    bankId: 'land/mark-it',
    aimKind: 'room',
    useWhen: 'The end of a night, or the end of a chapter, and it would otherwise finish on logistics and snack cleanup.',
    moves: [
      { kind: 'do', text: 'Do something small and ceremonial that the fiction can hold: pour one out, carve a mark, set a stone.' },
      { kind: 'say', text: '"So we remember what it cost. Somebody say the name."' },
    ],
    goal: 'Ritual is what makes a session feel experiential instead of procedural. It costs thirty seconds, requires nothing from the DM, and it is the thing people bring up two years later.',
    followUp: 'Say the first name yourself so nobody has to go first. Then wait — every other player will add one.',
    directions: [
      { label: 'Repeat', text: 'Do it again next time. Rituals compound.' },
      { label: 'Break', text: 'One session, deliberately do not. Everyone will notice.' },
      { label: 'Inherit', text: 'A new player is taught the ritual. That is a campaign with a history.' },
    ],
    out: 'If it feels too solemn for the table tonight, make the last line a joke about your own sincerity and pack up.',
  },
]

const BANK: Record<BeatIntent, readonly BankedBeat[]> = {
  'pull-in': PULL_IN,
  'open-scene': OPEN_SCENE,
  react: REACT,
  raise: RAISE,
  land: LAND,
  // A custom ask that fails live gets the widest, least situation-bound set.
  // Guessing at his sentence with a specific beat is worse than giving him one
  // that works anywhere.
  custom: [...OPEN_SCENE, ...PULL_IN],
}

export function bankFor(intent: BeatIntent): readonly BankedBeat[] {
  return BANK[intent] ?? BANK.custom
}

/** Walk the bank rather than sample it.
 *
 *  Deterministic given `nth`, so a test can assert what comes back and so ↻
 *  moves forward instead of rolling the same entry twice in a row. `avoidId`
 *  is the belt to that braces: if the caller already showed an entry, skip it
 *  even if the arithmetic lands there. */
export function pickBanked(intent: BeatIntent, nth: number, avoidId?: string): BankedBeat {
  const list = bankFor(intent)
  const n = list.length
  const start = ((Math.trunc(nth) % n) + n) % n
  for (let i = 0; i < n; i++) {
    const candidate = list[(start + i) % n]
    if (!avoidId || candidate.bankId !== avoidId || n === 1) return candidate
  }
  return list[start]
}

/** A banked entry, aimed and dated into a real `Beat`. */
export function bankedToBeat(
  banked: BankedBeat,
  intent: BeatIntent,
  aimName: string | null,
  aimNote: string | null,
  id: string,
): Beat {
  return {
    id,
    intent,
    aim: banked.aimKind === 'dm' ? 'the DM'
      : banked.aimKind === 'person' ? (aimName || 'anyone at the table')
        : 'the circle',
    aimNote: banked.aimKind === 'person' ? aimNote : null,
    useWhen: banked.useWhen,
    moves: banked.moves,
    goal: banked.goal,
    followUp: banked.followUp,
    directions: banked.directions,
    out: banked.out,
    source: 'bank',
  }
}
