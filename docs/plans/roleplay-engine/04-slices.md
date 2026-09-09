# Slices: The Roleplay Engine

Build order is chosen so that **the night is safe as early as possible**. Slice 2
is the one that has to land before the session; everything after it is depth.

- **Slice 1 — tracer bullet.** `Beat` type + `normaliseBeat` + a three-entry bank
  + `requestBeat` that always returns from the bank. `BeatCard` renders it.
  Wired into the cockpit behind one button. No AI at all. It runs, he can see a
  full beat on screen, and it cannot fail.
- **Slice 2 — live beats.** `SYSTEM_PROMPTS.improvBeat`, the real AI path, and
  the fallback to slice 1's bank on any failure. The screenshots' bug becomes
  structurally impossible.
- **Slice 3 — the table.** `TableState`, `SceneBar`, roster entry, `TableCard`
  with the spotlight tracker and the nudge. Beats become aimable by name.
- **Slice 4 — the impulse grid, rebuilt.** Every situation button produces a full
  beat through the same engine. "Ambush!" gains a *use it when*, directions and
  an out.
- **Slice 5 — the page has a spine.** Zone order, the AskBar as the doorway,
  everything else demoted below. The "disorganized" complaint.
- **Slice 6 — the bank gets deep.** 5+ professional beats per intent, written
  against real improv structure (offer / heighten / button), so an outage at 9pm
  is indistinguishable from a good night.
