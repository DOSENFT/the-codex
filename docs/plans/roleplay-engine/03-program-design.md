# Program Design: The Roleplay Engine

## Files

| File | Why it lives there |
|---|---|
| `src/lib/rp/beat.ts` | The `Beat` type and `normaliseBeat` — the one place a model's loose JSON becomes a complete card. Pure. |
| `src/lib/rp/bank.ts` | The on-device bank of real professional-improv beats. Data, not logic. This is the half that makes "never fails visibly" true rather than aspirational. |
| `src/lib/rp/table.ts` | `TableState`, load/save, and the spotlight arithmetic (`nextToAim`). Pure except the two storage functions. |
| `src/lib/rp/engine.ts` | `requestBeat` — live, then bank. The only async thing here, and the only function that is contractually forbidden to throw. |
| `src/lib/prompts.ts` | Gains `improvBeat`. Lives with the other prompts because a prompt that drifts from its siblings is a prompt nobody reviews. |
| `src/components/session/BeatCard.tsx` | Renders a `Beat`. Presentational; takes a fully-formed beat and cannot fetch. |
| `src/components/session/SceneBar.tsx` | Zone 1 — the scene, the mood, the roster chips. |
| `src/components/session/AskBar.tsx` | Zone 2 — one input, five intent buttons, one Give-me-the-beat. His "what would I say", promoted to the doorway. |
| `src/components/session/TableCard.tsx` | Zone 4 — the spotlight tracker and the nudge. |
| `src/components/session/SessionCockpit.tsx` | Rewired: zones in order, one beat state, everything else demoted below. |
| `src/components/session/ImpulseEngine.tsx` | Situation grid kept; its output becomes a full `Beat` through the same engine. |

## Types & signatures

```ts
// beat.ts
export type BeatIntent = 'pull-in' | 'open-scene' | 'react' | 'raise' | 'land' | 'custom'
export interface BeatMove { kind: 'say' | 'do' | 'ask'; text: string }
export interface BeatDirection { label: string; text: string }

export interface Beat {
  id: string
  intent: BeatIntent
  aim: string                 // a player's name, 'the DM', or 'the circle'
  aimNote: string | null      // 'first session', 'quiet 22m'
  useWhen: string             // THE answer to "Idk when I'd actually use this"
  moves: BeatMove[]           // 1-3. say / do / ask
  goal: string
  followUp: string            // if they bite
  directions: BeatDirection[] // 2-3 escalations
  out: string                 // the graceful exit
  source: 'live' | 'bank'
}

/** A model's JSON, however loose, into a complete card — or null if there is
 *  not enough there to be worth showing. Never throws. */
export function normaliseBeat(raw: unknown, req: BeatRequest, id: string): Beat | null

// table.ts
export interface TableMember {
  id: string; name: string; isNew: boolean
  lastSpotlightAt: number | null; beatsAimed: number
}
export interface TableState { scene: string; mood: string; members: TableMember[] }

export function loadTable(characterId: string): TableState
export function saveTable(characterId: string, t: TableState): void
export function markSpotlight(t: TableState, memberId: string, now: number): TableState
/** Who most needs the spotlight. New players with nothing aimed at them win
 *  over veterans who have merely been quiet — a veteran chooses their silence. */
export function nextToAim(t: TableState, now: number): TableMember | null
export function quietFor(m: TableMember, now: number): number | null

// bank.ts
export interface BankedBeat extends Omit<Beat, 'id' | 'aim' | 'aimNote' | 'source'> {
  bankId: string
  aimKind: 'person' | 'dm' | 'room'
}
export function bankFor(intent: BeatIntent): readonly BankedBeat[]
/** Deterministic given `avoidId` and `nth`; no Math.random, so it is testable. */
export function pickBanked(intent: BeatIntent, nth: number, avoidId?: string): BankedBeat

// engine.ts
export interface BeatRequest {
  character: Character
  table: TableState
  intent: BeatIntent
  aimAt: TableMember | null
  custom?: string
  nth?: number            // increments on ↻ so the bank does not repeat
}
export type AskFn = (system: string, user: string) => Promise<unknown>
/** NEVER REJECTS. That is the contract, and `engine.test.ts` is where it is
 *  enforced. A thrown error here is a blank card at his table. */
export function requestBeat(req: BeatRequest, ask: AskFn): Promise<Beat>
```

## Call stack

```
SessionCockpit
  ├ loadTable(character.id)                          → TableState
  ├ SceneBar          (edit scene/mood/roster)       → saveTable
  ├ AskBar            onAsk(intent, custom)
  │    └ SessionCockpit.getBeat()
  │         └ requestBeat({character, table, intent, aimAt, custom}, ask)
  │              ├ SYSTEM_PROMPTS.improvBeat(...)
  │              ├ ask(...)          → normaliseBeat  → Beat{source:'live'}
  │              └ catch | null      → pickBanked     → Beat{source:'bank'}
  ├ BeatCard beat
  │    └ onUsed → addMoment(...) + markSpotlight(table, aim) + saveTable
  └ TableCard
       └ "Aim a beat →" → setAimAt(member) → getBeat('pull-in')
```

## Test plan

`src/lib/rp/beat.test.ts`
- fills every band when the model returns only `say` and `do`
- never returns a beat with an empty `goal`, `out` or `useWhen`
- caps `moves` at 3 and `directions` at 3, keeping the first of each
- returns null for a body with nothing usable in it (so the bank takes over)
- accepts the string-array shape a model returns half the time (`directions: ["a","b"]`)

`src/lib/rp/bank.test.ts`
- every intent has at least three banked beats
- every banked beat has all six parts non-empty — a bank entry missing a band is a hole that only appears during an outage
- `pickBanked` does not return `avoidId` when the intent has more than one entry
- no banked beat mentions Nix or any character-specific proper noun

`src/lib/rp/engine.test.ts`
- **the contract:** an `ask` that rejects still resolves, with `source: 'bank'`
- an `ask` that returns garbage still resolves, with `source: 'bank'`
- an `ask` that returns a good beat resolves with `source: 'live'` and does not touch the bank
- an `ask` that hangs is not this module's problem (ai.ts owns the clock) — asserted by there being no timer here

`src/lib/rp/table.test.ts`
- a new player with nothing aimed at them outranks a veteran quiet for an hour
- among new players, the one with fewer beats wins
- `markSpotlight` increments and stamps only the named member
- `quietFor` is null, not 0, for someone who has never been in the spotlight

`src/components/session/BeatCard.test.tsx` (renderToStaticMarkup)
- renders all six band headings for a complete beat
- renders the bank notice when `source === 'bank'` and not when `'live'`
- **renders no error text under any input** — the card has no error state to render

## Least confident decisions

1. **Six bands may be too much to read mid-scene.** Mitigation: the move is
   always first and always largest; everything below it is skimmable. If it
   proves heavy, the fix is collapsing bands 4-6 behind a tap, not cutting them.
2. **The bank is written by me, not by him.** Banked beats are generic by
   necessity, and a generic beat at a specific moment can feel wrong. Accepted
   because a slightly-general real beat beats a red error box every time.
3. **Roster entry is manual.** He types five names once. Anything cleverer is a
   feature he did not ask for on the night he needs this.
4. **`nth` instead of `Math.random`** for bank variety, so the picker is pure and
   testable. Costs a state variable in the cockpit.
5. **Keeping `PerformPanel` as-is** rather than folding it into AskBar this pass.
   It is the part he said already works; breaking it to unify it is the wrong
   trade on the day of a session.
