# Status: The Roleplay Engine

- Gate 1 — Product: in progress
- Gate 2 — Architecture: pending
- Gate 3 — Program Design: pending
- Gate 4 — Slice plan: pending

## Slices
_(not yet planned)_

## Notes for a fresh session

Opened 2026-09-07 after Marcus sent five screenshots of the Roleplay tab mid-prep
for a session with a campfire scene and two brand-new players.

**His words, verbatim, because they are the spec:**

> "The AI frustratingly doesn't work consistently as seen in the images. Also the
> role play tab doesn't seem 100% useful as it could be... The codex does a decent
> job at allowing me to type in custom things into 'what would I say', but the AI
> does not work consistently... there just feels like missing things, like I don't
> feel confident that it would carry me and the table into powerfully immersive and
> experiential role-playing naturally... The page also seems decently disorganized.
> Also the impulse module seems OK, but doesn't seem fully built. Like I just tapped
> on 'ambush' but Idk when I'd actually use what it suggested, and it literally is
> just one or two lines."

**His four answers to the design questions (asked and answered before Gate 1):**

1. **Unit of help** — ALL of: a line to say, a question to ask another player, a
   physical beat. Plus: *"everything we do progresses story and role play powerfully
   just like professional improv experts do, it teaches you to become an expert improv
   role player, D&D role player, on par with the likes of Matt Mercer and Critical Role
   and professional improv. Even actions, questions, talking points, etc. And there are
   follow up, goals, etc. Not just one liners or one action. Hooks, powerful."*
2. **AI reliability** — *"Keep it live, but make it never fail visibly."*
3. **Audience** — *"Explicitly the table — I'm the social engine."*
4. **Impulse depth** — *"I don't know, you choose. Professional level improv hooks,
   goals, follow up, directions, etc. Sets up a whole beat."*

## Already landed (prerequisites, not part of this feature)

- `be55b6c` — the 503 retry. His screenshots showed a raw Gemini 503 JSON blob
  pasted into a roleplay card. Only 429 was ever retried. Answer 2 above is
  now *half* satisfied at the transport layer; the other half (a visible
  fallback so a card ALWAYS renders) belongs to this feature.
