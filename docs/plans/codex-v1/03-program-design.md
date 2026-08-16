# Program Design: The Codex V1.0

Written 2026-08-15 against the real types (`src/lib/character.ts:60–282`, `src/lib/combat-state.ts:1–133`).
No implementation bodies below — signatures only, so a wrong call is a one-line fix.

## The governing instruction for this gate

Marcus, 2026-08-15: *"we are not starting from scratch. I previously had a fully working prototype.
Make that count for something."*

That is not a sentiment, it is a design constraint, and it produces three hard rules:

1. **Every file below is marked `NEW`, `EXTRACT`, or `EXTEND`.** `EXTRACT` means the logic exists and
   works today and is being moved, not rewritten. Counted: **of 14 files, 5 are EXTRACT and 4 are
   EXTEND — two thirds of V1.0's combat brain is code that already runs at Marcus's table.**
2. **Characterization tests are written BEFORE any extraction** and assert what the prototype does
   *today*, bugs included. If an extraction changes an output, the test fails and I have to justify
   the change rather than discover it at the table. This is how a working prototype is made to count:
   it becomes the specification.
3. **Existing helpers are called, not reimplemented.** `spellActionType()` (`combat-state.ts:10`) and
   `featureActionType()` (`combat-state.ts:18`) already classify action economy. `expendSpellSlot()`,
   `useAction()`, `useSlot()`, `nextTurn()` all work. The new code wraps them.

---

---

# ⛔ AMENDMENT 2026-08-16 — the open-world rule

**Gate 3 as first written assumed a closed world of known content. That was wrong, and Marcus's
character is the proof.** Nix is Oath of the Hearth — homebrew — and homebrew is the configuration
this app is actually used in. Under the original design a homebrew weapon mastery would have hit
`coerceMastery() → null` and **silently lost its rider** (it was even listed as Least Confident #4),
and a homebrew resource pool could not be expressed at all.

This amendment supersedes the affected signatures below. It is a correction, not an addition.

## The rule

> **The rules engine never recognises content by name. It reads declared structure.**

Anything Marcus authors — a feature, a spell, a weapon rider, a resource, a condition — must rank,
cost, spend and undo *exactly as* book content does, because to the engine there is no difference.
A name the engine has never seen is not an error condition; it is Tuesday.

Three consequences, and every one of them is **more** capability, not less:

### 1. Masteries are open, and an unknown one keeps its rider

```ts
export type KnownMastery =
  | 'Cleave' | 'Graze' | 'Nick' | 'Push' | 'Sap' | 'Slow' | 'Topple' | 'Vex'

export interface MasteryRider {
  /** The 8 book properties resolve to a KnownMastery. Homebrew keeps its own name. */
  property: KnownMastery | string
  known: boolean
  text: string                 // ALWAYS populated — this is what the table reads
  automatic: boolean
  save?: { ability: 'STR' | 'CON' | 'DEX'; dc: 'weaponAttackDC' }
  expires: 'endOfTargetNextTurn' | 'endOfYourNextTurn' | 'immediate' | 'unspecified'
}

/** SUPERSEDES coerceMastery(). Never returns null, never drops a rider.
 *  Unknown name → { known:false, text: <the author's own words>, expires:'unspecified' }.
 *  The engine cannot automate what it does not understand, but it must still SHOW it. */
export function riderFor(weapon: Weapon): MasteryRider | null   // null only when none declared
```

### 2. Resource pools become generic — the one real hole in the prototype

`PaladinResources` (`character.ts:122–126`) is a fixed three-field shape derived from level alone
(`674–680`). Oath of the Hearth's resources cannot be expressed in it.

```ts
export interface ResourcePool {
  id: string
  name: string                                   // "Hearthfire", "Lay on Hands"
  current: number
  max: number
  unit: 'points' | 'uses' | 'dice'
  recharge: 'shortRest' | 'longRest' | 'dawn' | 'never' | 'manual'
  /** Optional. Homebrew may simply set max by hand — the app must not require a formula. */
  derivedFrom?: { formula: string }
  note?: string
}

// Character gains:  resourcePools?: ResourcePool[]
```

**`paladinResources` is KEPT, not removed** — prime law, and it is live in saved data. An adapter
projects it into two `ResourcePool`s on load and writes back through. Marcus sees one uniform
resources UI; the old field keeps working underneath forever.

### 3. Conditions and ranking must survive names they have never met

```ts
/** SUPERSEDES the original. An unrecognised (homebrew) condition returns a
 *  pass-through effect: no automated mechanics, but PRESENT and displayed.
 *  Silently dropping a condition Marcus is under is the worst failure this app has. */
export function effectsOf(conditionNames: string[]): ConditionEffect[]

export interface CustomCondition {          // authored in the UI, stored on the character
  name: string
  blocks: EconomySlot[]
  yourAttacksHaveDisadvantage: boolean
  attacksAgainstYouHaveAdvantage: boolean
  note: string
}
```

And `rank.ts` scores **only on declared structure** — does it cost an economy slot, does it consume a
resource, does it name a condition Marcus currently has — never on whether the engine recognises the
name. A homebrew feature with `actionType: 'bonusAction'` contends for the bonus action identically
to Divine Smite, because that is what it declared.

## What this changes in the file list

| File | Change |
|---|---|
| `rules-2024/mastery.ts` | `coerceMastery()` deleted before it is written; `riderFor()` never drops |
| `rules-2024/conditions.ts` | pass-through for unknown names; `CustomCondition` support |
| `rules-2024/resources.ts` | **NEW** — `ResourcePool`, the `paladinResources` adapter |
| `turn/rank.ts` | scores on declared structure only |
| `src/components/character/ResourceEditor.tsx` | **NEW** — author a custom pool |
| `src/components/character/ConditionEditor.tsx` | **NEW** — author a custom condition |

**Gate 3 Least Confident #4 is now resolved rather than open:** unrecognised masteries do not lose
their rider, because nothing is recognised by name in the first place.

---

## ⚠ A hazard the types revealed

Spell slots are stored **twice, in two different shapes**:

```ts
Character.spellSlots   : { [level]: { max: number; current: number } }   // character.ts:188
CombatState.spellSlots : Record<number, { used: number; max: number } >   // combat-state.ts:46
```

`current` counts down; `used` counts up. Nothing keeps them in sync, and `createCombatState()`
(53–65) snapshots only `max` at combat start. Two writers, one truth — this is a desync waiting to
happen, and it is exactly the kind of thing that shows up as "the app says I have a slot and I don't"
mid-fight.

**Decision: `Character.spellSlots` is the single source of truth. `CombatState.spellSlots` becomes
derived-only and is never written by the new code.** It stays on the type (removing it would break
saved states) but is recomputed from the character on load. Called out in Least Confident #1.

---

## Files

### `src/lib/rules-2024/` — the rules as data, zero React

| File | | Why here |
|---|---|---|
| `economy.ts` | NEW | Which economy slot a thing wants, and whether it is legal now. Extends the existing `ActionEconomyType` rather than replacing it. |
| `mastery.ts` | NEW | The 8 weapon-mastery riders. `masteryProperty` is declared (`character.ts:96`) and *displayed* (`TurnSummary.tsx:244`) but never acted on — this is the file that makes it mean something. |
| `conditions.ts` | NEW | Condition effects, the Incapacitated cascade, and Bloodied — absent from `src/` entirely. |
| `index.ts` | NEW | Barrel. The rest of the app imports only from here. |

### `src/lib/turn/` — where the 15-second metric lives

| File | | Why here |
|---|---|---|
| `types.ts` | NEW | `TurnOption`, `MutexGroup`, `ComposedTurn`. |
| `compose.ts` | **EXTRACT** | From `TurnSummary.tsx:219–378`. The gather/filter loop already works; it gains relevance, ranking and a return type. |
| `rank.ts` | NEW | The ordering. The genuinely new idea in V1.0. |
| `contention.ts` | NEW | Detects the bonus-action mutex the 2024 rules create. |
| `maths.ts` | **EXTRACT** | The pre-computed to-hit/damage strings. Already assembled inline in `TurnSummary`; becomes a pure formatter. |

### `src/state/` — kills the prop drilling, buys Undo

| File | | Why here |
|---|---|---|
| `combat/events.ts` | NEW | The event union. This *is* the undo history. |
| `combat/reducer.ts` | **EXTRACT** | Wraps the working mutators (`useAction`, `useSlot`, `expendSpellSlot`, `spendLayOnHands`, `spendChannelDivinity`) — it sequences them and records them. It does not reimplement them. |
| `combat/CombatProvider.tsx` | **EXTRACT** | The state currently owned by `CombatHelper.tsx` (incl. handlers at 427–435), lifted into context. |
| `CharacterProvider.tsx` | **EXTEND** | Thin wrapper over `useCharacter()` — **contract unchanged**, all ~20 mutators re-exported verbatim. |

### Changed existing files

| File | | Change |
|---|---|---|
| `src/components/combat/TurnSummary.tsx` | EXTEND | 1,196 → target <400. Composition logic leaves; it becomes a renderer of `ComposedTurn`. |
| `src/components/CombatHelper.tsx` | EXTEND | 1,746 → target <400. State ownership leaves. |
| `src/lib/combat-state.ts` | EXTEND | `InitiativeEntry` gains an optional group. `spellSlots` marked derived. Nothing removed. |
| `src/lib/character.ts` | EXTEND | `species` alias for `race`; `masteryProperty` coercion on load. Nothing renamed. |
| `src/components/ErrorBoundary.tsx` | NEW | One per top-level surface. A Toybox throw must not take combat down. |
| `src/design/tokens.css` | NEW | Direction D's palette, type ramp and elevation tiers. |

---

## Types & signatures

### `rules-2024/economy.ts`

```ts
import type { ActionEconomyType } from '../combat-state'   // reused, not replaced

/** 2024 adds two slots the existing union does not model: movement, and free riders
 *  like Vow of Enmity that ride on the Attack action and cost nothing. */
export type EconomySlot = ActionEconomyType | 'movement' | 'free'

export interface SlotDemand {
  slot: EconomySlot
  /** True for spell-slot spenders. 2024 permits only ONE spell slot per turn,
   *  which is what makes Smite / Misty Step mutually exclusive, not just the
   *  fact that they both want the bonus action. */
  consumesSpellSlot: boolean
}

export function demandOfSpell(spell: Spell): SlotDemand
export function demandOfFeature(feature: ClassFeature): SlotDemand
export function demandOfWeapon(weapon: Weapon): SlotDemand

/** Is this slot still free this turn? Reads CombatState.turnActions. */
export function slotAvailable(combat: CombatState, slot: EconomySlot): boolean

/** Has a spell slot already been spent this turn? The 2024 one-slot rule.
 *
 *  CORRECTED IN SLICE 3. This doc originally read the rule as applying to the
 *  Action and the Bonus Action. An adversarial pass REFUTED that: the printed
 *  text is "on a turn, you can expend only one spell slot to cast a spell" —
 *  the whole turn, every action type. Action Surge does not buy a second
 *  levelled spell, and a levelled Reaction spell on your own turn after you
 *  have spent a slot is illegal. The scope is the round, not the slot.
 *
 *  `LoggedEvent` does not exist until Slice 6, so the shipped signature takes
 *  the structural minimum (`SlotSpendRecord`) that `LoggedEvent` will satisfy. */
export function spellSlotSpentThisTurn(log: readonly SlotSpendRecord[], round: number): boolean
```

### `rules-2024/mastery.ts`

```ts
export type MasteryProperty =
  | 'Cleave' | 'Graze' | 'Nick' | 'Push' | 'Sap' | 'Slow' | 'Topple' | 'Vex'

export interface MasteryRider {
  property: MasteryProperty
  /** Table-ready sentence, e.g. "disadvantage on its next attack". */
  text: string
  /** Sap and Vex just happen. Topple is the only one gated on a save. */
  automatic: boolean
  save?: { ability: 'STR' | 'CON' | 'DEX'; dc: 'weaponAttackDC' }
  /** Sap and Vex expire on DIFFERENT windows — this is the detail that gets
   *  played wrong at the table, so the type carries it.
   *
   *  CORRECTED IN SLICE 3. This doc assumed Sap expired at the end of the
   *  TARGET's next turn. It does not: the printed text is "before the start of
   *  your next turn". Both Sap and Slow are keyed to YOUR turn, so
   *  'endOfTargetNextTurn' describes no mastery in the game and
   *  'startOfYourNextTurn' was missing. Vex's window strictly contains Sap's.
   *  The purpose of the field is vindicated; one of its values was wrong. */
  expires: 'startOfYourNextTurn' | 'endOfYourNextTurn' | 'immediate'

  /** ADDED IN SLICE 3. Vex requires the hit to DEAL DAMAGE and Sap does not —
   *  a second difference between them, independent of expiry. */
  trigger: 'onHit' | 'onHitDealingDamage' | 'onMiss' | 'onLightExtraAttack'
}

export function riderFor(weapon: Weapon): MasteryRider | null

/** masteryProperty is a free-text string on saved characters (character.ts:96).
 *  Coerce at load; unrecognised values return null rather than throwing. */
export function coerceMastery(raw: string | undefined): MasteryProperty | null
```

### `rules-2024/conditions.ts`

```ts
export interface ConditionEffect {
  name: string
  blocks: EconomySlot[]
  yourAttacksHaveDisadvantage: boolean
  attacksAgainstYouHaveAdvantage: boolean
  /** Incapacitated is a composite in 2024 and must cascade. */
  cascades: string[]

  /** EXTENDED IN SLICE 3 (additive — nothing above was removed). The two
   *  booleans above cannot express Invisible, which runs the other way, so it
   *  would have rendered as "no effect". And several conditions are only
   *  conditionally true (Prone's axis is distance; Grappled exempts the
   *  grappler), which a boolean cannot say and `note` can. */
  yourAttacksHaveAdvantage: boolean
  attacksAgainstYouHaveDisadvantage: boolean
  note?: string
  /** False for a name this file has never heard of. Homebrew conditions pass
   *  through with their name intact and no effects invented for them. */
  known: boolean
}

export function effectsOf(conditionNames: string[]): ConditionEffect[]

/** Bloodied is NOT a condition — it is a derived threshold. Absent from src/ today. */
export function bloodiedThreshold(maxHP: number): number            // floor(max / 2)
export function isBloodied(hp: { max: number; current: number }): boolean
/** Edge detection. The reducer gets this for free by comparing before/after. */
export function crossedIntoBloodied(
  before: { max: number; current: number },
  after:  { max: number; current: number },
): boolean
```

### `turn/types.ts`

```ts
export type ActionSource =
  | { kind: 'weapon';   weapon: Weapon }
  | { kind: 'spell';    spell: Spell }
  | { kind: 'feature';  feature: ClassFeature }
  | { kind: 'resource'; pool: 'layOnHands' | 'channelDivinity' }

export interface TurnOption {
  id: string
  name: string
  source: ActionSource
  demand: SlotDemand
  /** Pre-computed and ready to render — no maths at the table.
   *  e.g. "+8 to hit · 1d8+5 slashing · 5 ft" */
  maths: string
  /** The cost chip. e.g. { primary: 'Free' } | { primary: '2nd slot', detail: '1 left' } */
  cost: { primary: string; detail?: string }
  /** The 2024 consequence that is not in the maths line, e.g. Sap. */
  rider?: { mechanic: string; text: string }
  available: boolean
  /** Populated only when available === false. Shown greyed, never hidden —
   *  "you may spend only one spell slot this turn" is information. */
  blockedReason?: string
}

export interface MutexGroup {
  slot: EconomySlot
  options: TurnOption[]
  /** Rendered as the bracket caption, e.g. "One of these — the bonus action". */
  caption: string
  /** Why they are exclusive. Both reasons can apply at once. */
  reason: 'sameEconomySlot' | 'oneSpellSlotPerTurn' | 'both'
}

export interface ComposedTurn {
  ranked: TurnOption[]     // the shortlist, best first
  mutex: MutexGroup[]      // rendered as brackets, not rows
  rest: TurnOption[]       // "also yours" — one tap away, never deleted
  blocked: TurnOption[]    // greyed, with blockedReason
}
```

### `turn/compose.ts` — the extraction

```ts
export interface ComposeInput {
  character: Character
  combat: CombatState
  board: InitiativeEntry[]
  log: LoggedEvent[]
  shortlistSize?: number      // default 5
}

/** PURE. No React, no localStorage, no Date.now(). This is the 15-second metric
 *  and it must be unit-testable without rendering anything.
 *  Preserves TurnSummary.tsx:219-378 exactly:
 *    - prepared spells only
 *    - skip if spell.level > 0 && slot.current <= 0        (280-284)
 *    - skip if feature.level > character.level             (331)
 *    - skip if feature.usesMax != null && usesCurrent <= 0 (333)
 *  and ADDS: condition relevance, ranking, contention, blockedReason. */
export function composeTurn(input: ComposeInput): ComposedTurn
```

### `turn/rank.ts`

```ts
export interface RankFactors {
  free: boolean                 // costs no economy slot          → strongest signal
  slotContested: boolean        // wants a slot others also want  → demoted
  cancelsYourCondition: boolean // e.g. Vow's advantage vs Frightened
  isAttack: boolean             // the default verb
  resourceScarcity: number      // 0..1, how much of the pool remains
}

export function factorsFor(option: TurnOption, input: ComposeInput): RankFactors
export function score(f: RankFactors): number
```

> **Ranking is opinionated and Marcus should challenge it.** Current order of precedence:
> free > action > contested-bonus, with a boost for anything that cancels a condition you
> currently have. That is why the seeded turn ranks Vow of Enmity first.

### `turn/contention.ts`

```ts
/** Groups options that cannot coexist this turn. Two independent causes:
 *  same economy slot, and the 2024 one-spell-slot-per-turn rule. */
export function findContention(options: TurnOption[], combat: CombatState): MutexGroup[]
```

### `state/combat/events.ts`

```ts
export type CombatEvent =
  | { t: 'attack';    weaponId: string; targetId?: string; hit: boolean; damage: number }
  | { t: 'slot';      level: number; delta: number }
  | { t: 'damage';    amount: number; tempFirst: boolean }
  | { t: 'heal';      amount: number }
  | { t: 'condition'; name: string; on: boolean }
  | { t: 'economy';   slot: keyof CombatState['turnActions'] }
  | { t: 'resource';  pool: 'layOnHands' | 'channelDivinity' | 'freeSmite'; delta: number }
  | { t: 'concentration'; spell: string | null }
  | { t: 'turn';      round: number; actorId: string }

/** The inverse is computed AT APPLY TIME and stored, because some inverses are not
 *  derivable from the event alone — clearing concentration has to remember what it
 *  was, and 'damage' has to remember how much landed on tempHP versus HP.
 *  Getting this wrong is how undo develops silent holes. */
export interface LoggedEvent {
  event: CombatEvent
  inverse: CombatEvent
  round: number
}
```

### `state/combat/reducer.ts`

```ts
/** The character travels WITH the combat state because most events touch both
 *  (an attack spends the action AND may spend a slot AND may change HP).
 *  One reducer, one atomic result, one place that can be undone. */
export interface CombatSession {
  character: Character
  combat: CombatState
  log: LoggedEvent[]
  /** Derived, recomputed every reduce. Never persisted. */
  derived: { bloodied: boolean; justCrossedBloodied: boolean }
}

export function reduce(session: CombatSession, event: CombatEvent): CombatSession
export function undo(session: CombatSession): CombatSession
export function canUndo(session: CombatSession): boolean
```

### `state/combat/CombatProvider.tsx`

```ts
export interface CombatContextValue {
  session: CombatSession
  turn: ComposedTurn                 // recomputed on every session change
  dispatch: (e: CombatEvent) => void
  undo: () => void
  canUndo: boolean
}
export function useCombat(): CombatContextValue
export function CombatProvider(props: { character: Character; children: ReactNode }): JSX.Element
```

---

## Call stack

**A. Turn opens**
```
CombatProvider mounts
  loadCombatState(character.id)                       combat-state.ts:120   EXISTING
  reduce(session, {t:'turn', round, actorId})
  composeTurn({character, combat, board, log})        turn/compose.ts
    demandOf*()                        rules-2024/economy.ts
      → spellActionType() / featureActionType()       combat-state.ts:10,18 EXISTING
    effectsOf(character.conditions)    rules-2024/conditions.ts
    riderFor(weapon)                   rules-2024/mastery.ts
    formatMaths()                      turn/maths.ts                        EXTRACTED
    findContention()                   turn/contention.ts
    score()                            turn/rank.ts
  → ComposedTurn
TurnSummary renders it. No logic in the component.
```

**B. Marcus taps "Oathkeeper ×2"**
```
onClick → dispatch({t:'attack', weaponId, hit, damage})
  reduce()
    useAction(combat, 'action')                       combat-state.ts:87    EXISTING
    apply damage to target / HP
    crossedIntoBloodied(before, after)                rules-2024/conditions.ts
    push LoggedEvent{event, inverse}
  effects:
    saveCombatState(character.id, combat)             combat-state.ts:116   EXISTING
    onCharacterUpdate(character)                      useCharacter.ts       EXISTING
  composeTurn() re-runs → the list is the truth of NOW
```

**C. Marcus taps Undo**
```
undo()
  pop LoggedEvent
  reduce(session, logged.inverse)   // NOT re-derived — replayed from the stored inverse
  same two persistence effects
```

---

## Test plan

**Phase 0 — characterization, written FIRST, against the unmodified prototype.**
These pin today's behaviour so the extraction is provably behaviour-preserving. If one fails after
extraction, I stop and justify the difference rather than shipping it.

- `characterizes: today's TurnSummary lists exactly N actions for the seeded Vaelin state`
- `characterizes: a level-2 spell with slot.current === 0 is absent from the list`
- `characterizes: a feature above character.level is absent`
- `characterizes: a feature with usesMax set and usesCurrent === 0 is absent`
- `characterizes: unprepared spells are absent; cantrips appear regardless of slots`
- `characterizes: useAction() marks only the named slot and leaves the others false`
- `characterizes: expendSpellSlot() at 0 remaining is a no-op, not a negative`

**rules-2024/economy**
- `Divine Smite demands the bonus action and consumes a spell slot` *(2024 — it was no-action in 2014)*
- `Lay on Hands demands the bonus action and consumes no spell slot`
- `Vow of Enmity demands 'free'` *(2024 — it was a bonus action in 2014)*
- `slotAvailable() is false for a slot already marked in turnActions`
- `spellSlotSpentThisTurn() is true only for events in the current round`

**rules-2024/mastery**
- `Longsword yields the Sap rider`
- `Sap and Vex are automatic; Topple is the only rider carrying a save`
- `Sap expires at the START of your next turn; Vex at the END of it` *(different windows — corrected in Slice 3)*
- `coerceMastery() returns null for an unrecognised free-text value and does not throw`

**rules-2024/conditions**
- `bloodiedThreshold(76) === 38`
- `isBloodied() is true at exactly the threshold, not one below it`
- `crossedIntoBloodied() fires on the transition and NOT on subsequent damage`
- `Incapacitated cascades to block action, bonus action and reaction`
- `Frightened gives disadvantage but does not block any slot` *(unchanged in 2024)*

**turn/compose**
- `returns at most shortlistSize ranked options; the remainder land in rest, never dropped`
- `Smite, Lay on Hands and Misty Step land in ONE MutexGroup, not three ranked rows`
- `that group's reason is 'both' — same slot AND one-spell-slot-per-turn`
- `Vow of Enmity ranks first when Frightened is active`
- `an unaffordable option appears in blocked with a blockedReason, never silently vanishes`
- `composeTurn is pure: same input twice yields deep-equal output`

**state/combat/reducer**
- `every CombatEvent variant round-trips: reduce then undo restores a deep-equal session`
- `undo of 'damage' that hit tempHP first restores tempHP, not HP` *(the inverse-at-apply-time case)*
- `undo of clearing concentration restores the previous spell name`
- `canUndo is false on a fresh session`
- `the log is cleared by endCombat and cannot grow across encounters`

**Rule from the playbook, restated:** no test may pass against the pre-change code except the Phase-0
characterization tests, which exist precisely to do so.

---

## Least confident decisions

1. **Making `CombatState.spellSlots` derived-only.** It is a real desync hazard (`used` vs `current`,
   two writers), but it is *live data in Marcus's saved states*. Recomputing from the character on
   load is correct in theory and could disagree with what a saved mid-fight state believes. The safe
   alternative is to leave both and reconcile at read time. **This is the one I most want challenged.**
2. **Storing the inverse at apply time rather than deriving it.** Costs memory per event and requires
   every future event to supply an inverse. The dumber alternative is a snapshot per event — larger,
   but impossible to get subtly wrong.
3. **Ranking is a hand-tuned scoring function, not a rules-derived order.** `free > action >
   contested bonus`, boosted by condition-cancelling. It is opinionated and it is the thing most
   likely to feel wrong in play. It is deliberately one small pure file so it is cheap to re-tune.
4. **`masteryProperty` becomes a union.** Required for the rules engine to act on it, but it is a
   breaking type change against saved characters, hence `coerceMastery()` returning null rather than
   throwing. Unrecognised homebrew mastery names will silently lose their rider.
5. **Halving two components (1,746 + 1,196 LOC) is the largest diff in V1.0** and the likeliest place
   to lose a behaviour nobody wrote down. Phase-0 characterization tests plus the existing Playwright
   before/after shots are the mitigation, but they are not a proof.
