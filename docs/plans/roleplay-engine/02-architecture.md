# Architecture: The Roleplay Engine

## Fit

A new pure-logic module `src/lib/rp/` plus new components under
`src/components/session/`. Nothing outside the Roleplay tab changes.

The existing session components are **kept and demoted, not deleted** —
`PersonaStrip`, `ActionCard` (Recall), `EngageCard`, `SessionTimeline`,
`IdentitySwitcher` all still render. What changes is that `PerformPanel` and
`ImpulseEngine` stop being two separate one-liner generators sitting beside each
other and become two doorways into one engine.

The AI transport is untouched: `lib/ai.ts` already retries transient failures as
of `be55b6c`, and `hooks/useAI.ts` already surfaces loading/error. This feature
adds the layer above it — the one that decides a failure is never *shown*.

## Endpoints

None. The Codex is a client-only app; the only network call is Gemini/Ollama
through `lib/ai.ts`.

## Data

New, in `localStorage`:

- `codex-rp-table-{characterId}` — `TableState`: the scene name, the mood line,
  and the roster of people at the table (name, is-new, spotlight counters).
  Written on every edit and on every beat marked used, so a mid-session reload
  does not lose the roster. **This is the first thing in the app that knows
  other humans exist.**

Existing, reused:

- `codex-session-log-{characterId}` — `SessionRPLog`. Gains nothing structurally;
  `RPMoment.context` carries the aim target so End Session can answer "was every
  player named?".

No schema migration: an absent key means an empty table, which is exactly the
behaviour today.

## Flow

```
AskBar (intent + optional custom text)  ─┐
Impulse grid (situation → intent)       ─┼─→ requestBeat(BeatRequest)
TableCard "Aim a beat →" (sets aimAt)   ─┘        │
                                                  ├─ SYSTEM_PROMPTS.improvBeat(...)
                                                  ├─ queryAIStructured  ── ok ──→ normaliseBeat → Beat{source:'live'}
                                                  └─ any throw / any missing band
                                                          └──────────────→ bankBeat(req) → Beat{source:'bank'}
                                                  │
                                            <BeatCard beat=… />
                                                  │
                                    "Played it" → addMoment + markSpotlight(table, aim)
```

`requestBeat` **never rejects**. That is the architectural statement of his
answer 2 — "keep it live, but make it never fail visibly" — and it is enforced
by a test, not by discipline.

## External

Gemini via `lib/ai.ts` (config key names only: `geminiApiKey`, `geminiModel`,
`provider`, `ollamaUrl`, `ollamaModel`, `fallbackEnabled`). No new third party,
no new env var, no webhook.
