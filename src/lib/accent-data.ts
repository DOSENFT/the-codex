export interface AccentGuide {
  id: string
  name: string
  description: string
  rules: { rule: string; example: string }[]
  phrases: string[]
  tips: string[]
  rhythm: string
}

export const ACCENT_GUIDES: AccentGuide[] = [
  {
    id: 'dwarven',
    name: 'Dwarven (Scottish)',
    description: 'Gruff, rolling Rs, clipped consonants. Think Gimli meets a Highland warrior.',
    rules: [
      { rule: 'Roll your Rs heavily', example: '"Rrright then, let\'s get to worrk"' },
      { rule: 'Replace "to" with "tae"', example: '"I\'m goin\' tae the forge"' },
      { rule: 'Use "aye" instead of "yes"', example: '"Aye, that\'ll do"' },
      { rule: 'Drop the "g" in "-ing" words', example: '"I\'m thinkin\' about hammerin\'"' },
      { rule: 'Clipped, punchy sentences', example: '"Stone holds. Always has."' },
      { rule: 'Replace "not" with "nae"', example: '"I\'ll nae stand for it"' },
    ],
    phrases: [
      'By Moradin\'s beard, what manner of beast is that?',
      'Aye, the ale\'s good, but it\'s nae as good as home.',
      'Ye think ye can outdrink a dwarf? Rrrridiculous.',
      'The stone remembers what flesh forgets.',
      'I\'ll nae be leavin\' without me axe.',
    ],
    tips: [
      'Lower your pitch slightly — dwarves speak from the chest',
      'Keep sentences short and declarative',
      'Add weight to consonants, especially T, K, and D',
    ],
    rhythm: 'Steady, marching cadence. Short sentences with heavy emphasis on key words. Pauses before important declarations.',
  },
  {
    id: 'elvish',
    name: 'Elvish (Welsh/Ethereal)',
    description: 'Melodic, flowing vowels, soft consonants. Timeless and slightly distant.',
    rules: [
      { rule: 'Elongate vowels slightly', example: '"The liiight of the mooon..."' },
      { rule: 'Soften hard consonants', example: '"Gently" not "GENT-ly"' },
      { rule: 'Use formal/archaic phrasing', example: '"It would seem" instead of "I think"' },
      { rule: 'Speak slightly slower than normal', example: 'Let each word breathe' },
      { rule: 'Raise pitch slightly at end of phrases', example: 'Musical, questioning lilt' },
      { rule: 'Avoid contractions', example: '"I will not" instead of "I won\'t"' },
    ],
    phrases: [
      'The trees whisper of what was, and what shall yet be.',
      'I have watched centuries turn, and still this beauty moves me.',
      'Your haste blinds you to what patience would reveal.',
      'The stars remember your name, even if you have forgotten.',
      'There is grace in stillness that motion cannot achieve.',
    ],
    tips: [
      'Think of your voice as a flowing river — smooth transitions',
      'Breathe between phrases for a contemplative feel',
      'Use your upper register without going falsetto',
    ],
    rhythm: 'Flowing, almost musical. Longer sentences that build and resolve like waves. No rush.',
  },
  {
    id: 'orcish',
    name: 'Orcish (Guttural)',
    description: 'Deep, guttural, emphasis on hard consonants. Raw power in every word.',
    rules: [
      { rule: 'Drop to your lowest comfortable pitch', example: 'Speak from the gut, not the throat' },
      { rule: 'Emphasize hard consonants: K, G, T, D', example: '"KILL" not "kill"' },
      { rule: 'Shorten vowels aggressively', example: '"Strng" instead of "Strong"' },
      { rule: 'Use simple, direct sentences', example: '"Fight now. Talk later."' },
      { rule: 'Growl slightly on emphasized words', example: '"I will CRUSH them"' },
      { rule: 'Replace complex words with simpler ones', example: '"Break" not "dismantle"' },
    ],
    phrases: [
      'Gruumsh sees all. Gruumsh judges all.',
      'Words are weak. Axe is strong.',
      'You talk. I fight. We see who wins.',
      'Blood calls to blood. I answer.',
      'The weak hide behind walls. I AM the wall.',
    ],
    tips: [
      'Clench your jaw slightly while speaking',
      'Breathe audibly between short phrases',
      'Let emotion drive volume — anger = louder, not faster',
    ],
    rhythm: 'Staccato bursts. Short, punchy phrases with aggressive pauses. Like war drums.',
  },
  {
    id: 'noble',
    name: 'Noble (RP English)',
    description: 'Crisp received pronunciation, measured delivery, effortless authority.',
    rules: [
      { rule: 'Elongate vowels precisely', example: '"Rahther" not "Rather"' },
      { rule: 'Crisp T sounds (never dropped)', example: '"WaTer" not "Wa\'er"' },
      { rule: 'Non-rhotic: drop R after vowels', example: '"Fah" not "Far"' },
      { rule: 'Use formal vocabulary naturally', example: '"Indeed" instead of "Yeah"' },
      { rule: 'Measured pace — never rush', example: 'Every word has its place' },
      { rule: 'Slight condescension baked in', example: '"How... quaint."' },
    ],
    phrases: [
      'I dare say, this establishment has seen better days.',
      'One does not simply *demand* an audience with me.',
      'How positively dreadful. Do carry on, though.',
      'The affairs of commoners are... not my concern.',
      'I shall consider your proposal. Eventually.',
    ],
    tips: [
      'Keep your chin slightly elevated — it changes the voice',
      'Speak as though every word costs gold',
      'Pauses convey power — use them',
    ],
    rhythm: 'Deliberate and measured. Long, structured sentences with strategic pauses. Never hurried.',
  },
  {
    id: 'pirate',
    name: 'Pirate (West Country)',
    description: 'Swashbuckling, rolling Rs, dropped Hs, playful menace.',
    rules: [
      { rule: 'Roll your Rs (softer than Dwarven)', example: '"Arrr, the sea calls"' },
      { rule: 'Drop H sounds', example: '"\'ere" not "here"' },
      { rule: 'Replace "my" with "me"', example: '"Where\'s me rum?"' },
      { rule: 'Add nautical vocabulary', example: '"Avast!", "Landlubber", "Scallywag"' },
      { rule: 'Use "be" instead of "is/am"', example: '"I be the captain \'ere"' },
      { rule: 'End sentences with emphasis words', example: '"...savvy?", "...aye?"' },
    ],
    phrases: [
      'The sea don\'t care about yer fancy titles, savvy?',
      'Every storm I\'ve survived made me stronger, aye.',
      'There be treasure \'ere, I can smell it in me bones.',
      'Ye\'ll walk the plank for that, ye scurvy dog!',
      'Wind in the sails and gold in the hold — that be livin\'.',
    ],
    tips: [
      'Speak with a smile — pirates enjoy themselves',
      'Lean into the performance — bigger is better',
      'Vary between threatening and jovial rapidly',
    ],
    rhythm: 'Swinging, sea-shanty cadence. Playful ups and downs. Sentences that roll like waves.',
  },
  {
    id: 'fey',
    name: 'Fey (Ethereal/Whimsical)',
    description: 'Airy, playful, unpredictable. Singsong quality with sudden shifts.',
    rules: [
      { rule: 'Speak in a higher, lighter register', example: 'Airy and delicate' },
      { rule: 'Elongate S sounds slightly', example: '"Yesss, how delightful"' },
      { rule: 'Use riddles and double meanings', example: '"The answer is never the question"' },
      { rule: 'Shift tone mid-sentence unexpectedly', example: '"How lovely— DON\'T touch that."' },
      { rule: 'Giggle or hum between thoughts', example: '"Hmm, curious, very curious..."' },
      { rule: 'Never give a straight answer', example: '"Perhaps. Perhaps not. Perhaps both."' },
    ],
    phrases: [
      'Names have power, little mortal. I shall not give you mine so easily.',
      'Time? Time is a river that flows in circles here.',
      'You amuse me. That is either very good or very, very bad for you.',
      'The flowers here sing at midnight. Don\'t listen. Or do. It matters not.',
      'A bargain, you say? Oh, how delicious. Tell me more...',
    ],
    tips: [
      'Think of a mischievous child with centuries of wisdom',
      'Let your voice dance — high to low within a sentence',
      'Smile while speaking for the right vocal quality',
    ],
    rhythm: 'Musical and unpredictable. Singsong patterns that break without warning. Playful pauses.',
  },
]
