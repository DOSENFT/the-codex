/* The shapes shared across `lib/rp`, in one file so nothing imports in a circle.
 *
 * `beat.ts` needs a `BeatRequest` to normalise against; `engine.ts` needs a
 * `Beat` to return; `bank.ts` needs an intent to key on. Any two of those
 * importing each other directly is a cycle, and a cycle in a module Vite
 * tree-shakes is a bug that only appears in the production bundle. */

import type { Character } from '../character'

/** What he is trying to do this second. Deliberately five verbs and not eight
 *  nouns: at a table he knows what he WANTS (pull someone in, raise it, land
 *  it), not what genre of line he needs. */
export type BeatIntent = 'pull-in' | 'open-scene' | 'react' | 'raise' | 'land' | 'custom'

export const BEAT_INTENTS: readonly BeatIntent[] =
  ['pull-in', 'open-scene', 'react', 'raise', 'land', 'custom'] as const

export const INTENT_LABEL: Record<BeatIntent, string> = {
  'pull-in': 'Pull someone in',
  'open-scene': 'Start the scene',
  react: 'React',
  raise: 'Raise the stakes',
  land: 'Land the moment',
  custom: 'My own',
}

/** One human at the table.
 *
 *  `isNew` is not decoration. Two people at tonight's session have never played
 *  before, and the single most useful thing this app can do is make sure the
 *  app knows that when it writes them a question. */
export interface TableMember {
  id: string
  name: string
  isNew: boolean
  /** Epoch ms. `null` means they have not had the spotlight this session at
   *  all, which is a different and more urgent fact than "a long time ago". */
  lastSpotlightAt: number | null
  beatsAimed: number
}

export interface TableState {
  /** "The campfire". Free text; it is a prompt input, not an enum. */
  scene: string
  /** "first night after the ridge · nobody's said the thing yet" */
  mood: string
  members: TableMember[]
}

export interface BeatRequest {
  character: Character
  table: TableState
  intent: BeatIntent
  /** Who it is pointed at. `null` means the room. */
  aimAt: TableMember | null
  /** What he typed into "what do I do right now?". */
  custom?: string
  /** Bumped on every ↻ so the bank walks its entries instead of repeating.
   *  An integer rather than `Math.random` so the picker stays pure and the
   *  test can assert what comes back. */
  nth?: number
}
