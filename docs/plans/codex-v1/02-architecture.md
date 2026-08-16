# Architecture: The Codex V1.0

Written 2026-08-15, after reading the trunk — not against an imagined codebase. Every claim below
carries a file:line. Governing law: `V0.9-CAPABILITY-BASELINE.md` — never reduce capability.

**Shape of the app:** a local-first, single-page React client. **There is no backend and V1.0 does not
add one.** Everything persists to `localStorage`; the only network calls are to an LLM. That is a
feature, not a gap — it is what lets the app work at a table with no internet.

---

## What the recon changed

Two findings moved the design. Both are good news.

**1. The ranked shortlist is not a new subsystem — it is an extraction.** `TurnSummary.tsx:219–378`
already filters by legality and affordability: prepared-only spells, skip if `slot.current <= 0`
(280–284), skip features above your level or out of uses (331–333). What is missing is *relevance*
(conditions on the board), *ranking*, and *testability* — the logic is 160 lines buried inside a
1,196-line component's `useMemo`. So V1.0 **lifts and completes** it rather than inventing it.
Under the prime law this is the ideal shape of an upgrade.

**2. Combat state is already persisted, per character** (`combat-state.ts:50`, key
`codex-combat-{characterId}`). Undo was assumed to need a new persistence story. It does not — it
needs a *reducer*, and the store to write to already exists.

---

## Fit — what V1.0 touches

| Existing | Today | V1.0 |
|---|---|---|
| `src/hooks/useCharacter.ts` (12–157) | Owns character + roster; ~20 mutators. Consumers get it and prop-drill `character` down 99 components. | **Unchanged in contract.** Wrapped by a provider so consumers stop drilling. Every existing mutator keeps working. |
| `src/lib/character.ts` | Character type (211–282), slot maths, persistence (370–372), legacy migration (485–516). | Additive fields only. `race` gains a `species` alias (2024 naming) — **both retained**, no rename break. |
| `src/lib/combat-state.ts` (29–48) | `CombatState`, `InitiativeEntry`, `useAction`, `nextTurn`. | Becomes the reducer's state shape. `InitiativeEntry` extended, not replaced. |
| `src/components/CombatHelper.tsx` (1,746) | Container; owns combat state, slot handlers (427–435). | Loses the state ownership to the provider. Target: under 400 LOC. |
| `src/components/TurnSummary.tsx` (1,196) | Composes and renders available actions. | Composition logic **extracted to `src/lib/turn/`**; the component becomes a renderer. Target: under 400 LOC. |
| `src/lib/ai.ts` (1–376) | Ollama + Gemini, streaming and non-streaming, auto-fallback. | Genuinely good. Two fixes only (below). Not restructured. |

**Not touched by V1.0:** Academy, Accent Forge, Persona Engine, Dialogue Bank, Toybox, Backstory
Builder. They work. They inherit the design tokens and nothing else.

---

## New modules

```
src/lib/rules-2024/          the rules, as data + pure functions, zero React
  economy.ts                 action/bonus/reaction/move legality; ONE spell slot per turn
  mastery.ts                 the 8 weapon-mastery riders; which are automatic vs. save-gated
  conditions.ts              condition effects; Incapacitated cascade; Bloodied threshold
  index.ts

src/lib/turn/                the 15-second metric lives here
  compose.ts                 composeTurn(): the ranked shortlist
  rank.ts                    the scoring function
  contention.ts              detects the bonus-action mutex
  compose.test.ts

src/state/
  combat/reducer.ts          every mutation is an event
  combat/events.ts           the event union — this IS the undo history
  combat/CombatProvider.tsx  context; kills the prop drilling
  CharacterProvider.tsx      wraps useCharacter unchanged

src/design/                  direction D, as tokens
  tokens.css                 the palette, the type ramp, the elevation tiers
  README.md                  the four rules D exists to enforce

src/components/ErrorBoundary.tsx
```

---

## Endpoints

**None.** No server, no routes. The only HTTP the app makes is to an LLM:

| Call | Purpose |
|---|---|
| `POST {ollamaBase}/api/chat` | Local model, streaming NDJSON (`ai.ts:226`) |
| `POST {ollamaBase}/api/tags` | Reachability probe (used by `game-night.ps1`) |
| `POST {geminiBase}/…:streamGenerateContent` | Cloud fallback, SSE (`ai.ts:274`) |

In dev, `/ollama` is proxied to localhost by `vite.config.ts`. At the table, `game-night.ps1` opens a
Cloudflare quick tunnel so the phone reaches both the app and the model over one link.

---

## Data

No database. `localStorage`, these keys:

| Key | Owner | V1.0 |
|---|---|---|
| `codex-roster` | `character.ts:370` | unchanged |
| `codex-active-id` | `character.ts:371` | unchanged |
| `codex-character-{id}` | `character.ts:372` | additive fields only |
| `codex-combat-{characterId}` | `combat-state.ts:50` | **now holds the event log too** |
| `codex-ai-config` | `ai.ts` | unchanged |
| `codex-character` | legacy, migrated once (485–516) | unchanged |
| **`codex-schema-version`** | *new* | there is no versioning today; migration is field-spreading on load (382–413). One integer, written now, so a future migration is possible at all. |

### The event log — how Undo works

```
CombatEvent =
  | { t:'attack',  weaponId, target, hit, damage }
  | { t:'slot',    level, delta }
  | { t:'damage',  amount, tempFirst }
  | { t:'heal',    amount }
  | { t:'condition', name, on }
  | { t:'economy', slotUsed:'action'|'bonus'|'reaction'|'move' }
  | { t:'resource', pool:'layOnHands'|'channelDivinity'|'freeSmite', delta }
  | { t:'turn',    round, actor }
```

Every event is **invertible**, which is the whole design constraint. `undo()` pops the last event and
applies its inverse — no snapshots, no cloning the character on every tap. The log is capped at the
current encounter (cleared by `endCombat`), so it cannot grow without bound.

This log is also what makes **Bloodied** cheap: it is `hp <= floor(max/2)`, not a condition, so it
needs *edge detection* — and edges fall out of a reducer for free (compare before/after on any event
that changes HP). It is currently absent from `src/` entirely.

---

## Flow — turn start to persisted state

```
1  turn begins
      CombatProvider dispatch {t:'turn', round, actor}

2  composeTurn(character, combatState, board)          src/lib/turn/compose.ts   PURE
      a  gather      weapons, prepared spells, features, class resources
      b  legal?      rules-2024/economy.ts + conditions.ts
                     drops: no slot, out of uses, above level, blocked by condition
      c  contended?  rules-2024 → which economy slot each wants
                     Smite + Lay on Hands + Misty Step all want BONUS  →  a mutex group
      d  rank        rank.ts: free > action > contested bonus;
                     an option that cancels a condition you have is boosted
      e  return      { ranked: RankedAction[], mutex: MutexGroup[], rest: Action[] }

3  render            TurnSummary consumes the result. No logic. Direction D's zones.

4  tap
      dispatch {t:'attack'|'slot'|…}
        → reducer      applies, appends to log, recomputes derived (Bloodied edge)
        → persist      saveCombatState()   (existing, combat-state.ts:116)
        → character    onCharacterUpdate() (existing, unchanged)
      composeTurn re-runs. The list is always the truth of *now*.

5  undo               pop, invert, re-persist. Same path in reverse.
```

`composeTurn` is a pure function of (character, combatState, board). That is the point: it is the
15-second metric, and it can be unit-tested without rendering anything.

---

## External

| Thing | Detail |
|---|---|
| **Ollama** | Local model. No key. |
| **Google Gemini** | Cloud fallback. Key is user-entered in Settings, stored in `codex-ai-config`. Never committed, never in an env var in the repo. |
| **GitHub Pages** | `.github/workflows/deploy.yml` — push to `main` builds and deploys. Base path `/the-codex/`. **Every merge to main is a live deploy.** |
| **Cloudflare quick tunnel** | `game-night.ps1`, via `cloudflared.exe`. Ephemeral URL, changes each run. |
| **Google Fonts** | Currently a runtime dependency (`src/fonts/fonts.css` → `fonts.gstatic.com`). **V1.0 self-hosts.** See below. |

### Two fixes in the AI layer — small, and both are correctness

1. **The Ollama base URL is a hardcoded LAN IP** in `src/lib/ai.ts`. In a repo that deploys publicly,
   that is both a broken default for anyone else and a small leak of Marcus's home network layout.
   Replace with: same-origin `/ollama` proxy → `localhost:11434` → user-configured, in that order.
2. **AI must never block combat.** The `useAI` hook surfaces an error state (`ai.ts:52–54`) that can
   gate a surface. V1.0's rule: the turn screen renders fully and stays usable with the model down.
   The AI is an ornament on the combat surface, never a dependency of it.

### Offline — what "installable" actually requires

`vite-plugin-pwa` (manifest + service worker; all three confirmed absent today), **and** self-hosted
fonts. Precaching a shell that then blocks on `fonts.gstatic.com` is not offline. Font files come
into the repo as `.woff2`; `src/fonts/fonts.css` points at them locally.

---

## Testing

There is no test runner, no lint config, and no error boundary anywhere in the trunk — a single
component throw white-screens the app mid-combat. V1.0 adds **Vitest** (already implied by Vite; no
new toolchain) and one `ErrorBoundary` per top-level surface, so a Toybox crash cannot take combat
down. Tests concentrate on `src/lib/rules-2024/` and `src/lib/turn/`, which are pure and are where a
wrong answer costs Marcus a ruling at the table. UI is verified by the Playwright reference scripts
that already exist.

---

## Deliberately NOT in V1.0

Recorded so nothing re-proposes them: a backend · React 19 (its own slice, not a premise) · replacing
localStorage with SQLite-WASM/OPFS (GENESIS's proposal — a rewrite of a working storage layer) ·
splitting the 15 files over 800 LOC beyond the two combat ones · a component library.

---

## Least confident decisions

1. **The event log as the undo mechanism, rather than state snapshots.** Invertible events are
   leaner and give Bloodied edge detection for free, but every future mutation must be written as an
   invertible event or undo silently develops holes. Snapshots are dumber and harder to get wrong.
2. **Enemies stay freeform.** Today an `InitiativeEntry` is a name, an initiative, an optional HP
   *string* and an AC (`combat-state.ts:29–36`) — no monster model. Mobs ("8 goblins, 8 pips") need
   at minimum a count and shared stats. I propose extending the entry with an optional group rather
   than introducing a monster data model, because a stat-block library is a different product.
3. **`masteryProperty` is a free-text string** (`character.ts:96`) and is displayed but never
   consumed (`TurnSummary.tsx:244`). Making it a union of the 8 named properties is what lets the
   rules engine act on it — but it is a breaking type change against saved characters, so it needs a
   load-time coercion.
4. **Two 1,100–1,700-line components get halved.** That is the largest diff in V1.0 and the one most
   likely to lose a behaviour nobody wrote down. Mitigation: the extraction is mechanical and the
   Playwright shots are the before/after evidence.
