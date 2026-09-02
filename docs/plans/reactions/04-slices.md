# Slices: Held Reaction

Build order. Each ends in a state Marcus can see on the combat tab, and each is
proved against **his real exported sheet**, never the `nix.ts` fixture — the
fixture carries `feats: []` and is the reason a prior session recorded a finding
it had not measured.

The running headline number, checked at every slice:

```
reactions his combat tab offers him:  1 today  →  4 rows / 3 reactions
```

---

## Slice 1 — tracer bullet: the cloak becomes a Reaction — **DONE 2026-08-30**

`faces.ts` (`facesOf`, `sentencesOf`, `costsNamedIn`) + the overlay carries
`canonFaces` + the composer emits one option per face. Nothing else.

**Visible after this slice:** Hearthfire Manifest appears in the reactions band on
the combat tab, for the first time, with canon's own sentence as its trigger — and
it *also* still appears where it appears today, because the base option is kept.
Band goes **1 → 2 rows**.

**Proved by:** `faces.test.ts` whole; `measure-before.mjs` re-run showing the
cloak's slot moving `action → reaction`; a screenshot of the band.

**Micro-revert:** restore `found.size > 1 → undefined`'s consequence by dropping
`canonFaces` from the overlay. The band must go back to 1 row.

---

## Slice 2 — Sentinel becomes playable — **DONE 2026-08-30**

The silence rule in `effectSentencesOf`, its `{sentences, from}` return, the
`wordsFrom` marker, and the overlay attributing a canon-worded row.

**Visible after this slice:** two Sentinel rows on the combat tab with two
different triggers — including the one that is **not on his sheet at all** —
each marked as canon's words rather than his. Band goes **2 → 4 rows**. This is
the slice that answers *"sentinal has to be playable."*

**Proved by:** `feats.test.ts` extended, including the homebrew case where the
sheet still wins; `measure-before.mjs` showing `featReactionOptions 0 → 2`.

**Micro-revert:** put `own.length > 0` back. Sentinel's rows must vanish.

---

## Slice 3 — the retaliation arms, by the engine road — **DONE 2026-08-30**

Untie `tempHPGrantOf` from `resourcePoolId`, pinned by the two assertions that
disagree (Gate 3, least-confident decision 1). **Both passed.** The gate was not
load-bearing, so Gate 2 stayed closed — but it could not merely be *deleted*
either: it was replaced by canon's own priced face, because his one feature
composes as three rows and a bare deletion grants on all three. See
`00-status.md` § Slice 3.

**Visible after this slice:** take the cloak from its reaction row → temp HP
appears on the HP tracker → log damage taken → **the retaliation prompt appears**,
offering 1d10 Fire. The first time that component has ever received data.

**Proved by:** the compose cases including `resourcePools: []`; an end-to-end
`retaliation` case on his real sheet; a screenshot of the prompt.

**Micro-revert:** restore the `resourcePoolId` gate. The prompt must not appear.

---

## Slice 4 — the road he actually walks — **DONE 2026-08-30**

`tempHPGrantors` + `TempHPSource.tsx` + the temp-entry change in `HPTracker.tsx`
and `StatsBar.tsx`. Marcus's ruling: **ask, never infer** — even with one candidate.

`grantedTempHP` came out of `compose.ts` at the same time, so canon's `tempHP`
fact has ONE reader: the function that sizes the grant is the function that
decides what to offer. See `00-status.md` § Slice 4.

**Visible after this slice:** typing temp HP by hand offers "what granted this?"
with his canon-backed sources and **Don't know** selected by default. Picking the
cloak arms the retaliation; leaving it alone does not.

**Proved by:** both halves — chosen source arms it, "Don't know" does not. The
second is the one that proves the app is not guessing. `prove-slice4.mjs` checks
F1 · F · G · E, all PASS, typing **7** rather than canon's 10 so no pass can be
inherited from slice 3's engine road.

**Micro-revert:** drop the source argument at the call site. Arming must stop.
**It did** — `FAIL F · NO OFFER`, with F1, G and E still green. A second
falsification ran the design Marcus rejected (`tempSource ?? grantors[0]`) and
failed **G alone**, which is the check written to catch exactly that.

---

## Slice 5 — the DM's number — **DONE 2026-08-31**

The tally end to end: roll or type the retaliation, it accumulates, undo puts it
back.

**The prediction above was half wrong, and measuring is what caught it.** This
slice was written expecting no new code — the reducer accumulates, `revert`
restores a whole snapshot, and `retaliation.test.ts` already proved that undoing
the FIRST of three leaves the other two intact. `measure-slice5.mjs` measured the
screen instead of trusting that, and found the standing `+1d10` control painted,
the tally painted, and **no Undo button anywhere in the document**. `undoLast`
was reachable only from `TurnScreenD`, behind the `D_PREVIEW` flag, on a screen
Marcus has never opened. The engine could take back a mistyped 17; the table
could not. Slice 1's law again, in a third dress: *a thing that models the app
after the repair cannot show the fault* — here the model was `04-slices.md`
itself.

So slice 5 shipped the door: `undoEntry` on `CombatApi`, an Undo beside the
tally, and one gate deciding whether to offer it. See `00-status.md` § Slice 5.

**Visible after this slice:** "16 Fire over 3 hits" on the combat tab — canon's
`HEARTH-05` answered — *and a correction beside it naming the exact hit it would
remove.*

**Proved by:** `prove-slice5.mjs`, checks T1 · T2 · T3 · T4 · T5 · N · E, all
PASS. Three recorded (7, 4, 10 → 21 over 3), one undone (→ 11 over 2, and the
other two intact), one more recorded (→ 16 over 3) — the total moving **both
ways** on screen, every number read by geometry off a painted leaf.

**Micro-revert:** drop `onUndo` at the `ReactionsBandLive` call site. **It did** —
`FAIL T3 · no undo on the row`, T4 `nothing to press`, and T5 giving away the
whole story at `TOTAL 26 Fire over 4 hits`, the accumulation running straight
through an undo that never happened. A second falsification removed the honesty
gate and failed **N alone**.

---

## Slice 6 — the phase proof

`prove-reactions.mjs` run whole — checks **A–H**, including H, a clean console —
on one tree, one build, one 390×844 viewport. Whole repo suite, `tsc -b --noEmit`,
`npm run build`, served-bundle hash confirmed equal to fresh `dist/`.
`00-status.md` compacted so a fresh session could continue from the docs alone.

**Visible after this slice:** nothing new. This is the slice that says the five
before it are true at the same time.

### Closed 2026-08-31 — and it was six, not five

Slice 6's first act was to measure instead of to trust this plan, and the
measurement reopened Gate 3: checks **A** and **D** in `03-program-design.md`
were both wrong about the app. Restated, **D caught a live fault** — canon's own
sentences printed under a "your own" tag on both Sentinel detail sheets. Marcus
ruled *fix it now*, which added an unplanned **slice 5b** between 5 and 6.

That is this plan being wrong for the third time in one phase, in the same way
each time: **a thing that models the app after the repair cannot show the
fault.** Slice 1 it was `nix.ts`, slice 5 it was this file, slice 6 it was
`03-program-design.md`. Three of six slices re-scoped by a measurement that
contradicted a document. **Measure first is a standing rule now, not this
phase's quirk** — it belongs in HANDOFF §4.

Result: S · A–H all green on one tree, one build, one viewport, with the served
bundle hash-matched to `dist/`. Falsified at both ends — slice 5b's line takes
down **D alone**; slice 2's silence rule takes down **A, B, C and D** and puts
the band back to 2 rows. Full narrative, numbers and screenshots in
`00-status.md` § "Slice 6".

---

## Not in these six, on purpose

- **The "Your Turn" consolidation** (items 5, 6, 10, 11) — layout, and next.
- **The damage log** (item 9) — related at the seam, its own problem.
- **Channel Divinity as a resource.** His sheet has `resourcePools: []`. The cloak
  is offered and works; its cost is not spent against a pool that does not exist.
  Logged, never silently defaulted.
- **The single-cost prose feature** that still falls to the `'action'` default —
  Gate 3, least-confident decision 2. A surviving instance of this phase's own
  fault, left in because closing it means touching the byte-pinned file.
- **Editing his stored sheet.** Report, never correct. His blob must be
  byte-identical at the end of the phase, and slice 6 checks it.
