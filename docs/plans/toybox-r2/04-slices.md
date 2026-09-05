# Slices: Toybox round two (`hearth-7-r2`)

Seven slices. Every one ends with something on the glass at 390px, and every one is
provable by running it rather than by reading it.

**The rule that governs all seven:** round one's eight provers assert exact counts
(`PACK_COMBOS = 14`) and exact id lists. Every slice that adds an entry moves those
numbers, and every slice updates the literal **to the new true total**. Never to `>=`.
The churn is the point — a count that has to be re-stated each slice is a count somebody
looked at.

---

### Slice 1 — TRACER BULLET: the engine, and exactly one combo

All of the risk, none of the content. The whole engine change from Gate 3 lands here, and
`hearth-7-r2` ships carrying **one entry: The Sentinel Gate**, which is also the entry that
exercises `needs` in both directions.

- `SeedNeeds` on the three types; `weaponProperties` on the profile; `meetsNeeds` in
  `template.ts`; the `needs` strip; `findPacks`; the apply loop; `force: string[]`;
  `ToyboxPanel`'s missing-pack button.
- `packs/hearth-7-r2.ts` + `.combos.ts` with one combo. The other two content files are
  created empty (`[]`) so the pack's shape is real from the start.

**Proved by** a new `prove-r2-slice1.mjs` running three sheets against the built app:

| sheet | must show |
|---|---|
| his real sheet, already seeded with `hearth-7` | 31 old entries still there, **once each**, The Sentinel Gate appended below, `seededPacks: ['hearth-7','hearth-7-r2']` |
| same paladin, **no Sentinel feat** | round one intact, **The Sentinel Gate absent** |
| same paladin, Sentinel but a 5-ft sword | **absent** — the case `{{weaponReach}}` cannot catch |

If slice 1 is green, everything after it is writing.

---

### Slice 2 — the four combos that need no new rules research

Three People Stand Up · The Free Crit · The Second Swing Is Not Wasted · Through the Door.
Each is sourced from `paladin_1.txt` (the PHB chapter) or from a mechanic already proved in
round one.

Ships with the **one-turn test** from Gate 3 — at most one `action`, one `bonus`, one
`reaction` per combo — because the first slice with four combos in it is the first slice
where the rule can actually be broken.

---

### Slice 3 — the equipment combos, and the tactic they depend on

Bearings and the Backward Walk · One Silver Piece of Fire · Drop the Glaive · The Shield
Round, plus **The Shopping List That Is Not Spell Components**, which is the tactic that
makes the other four runnable.

They ship together on purpose. Four combos requiring gear he does not own, with no card
telling him to buy it, is the half-built-feature failure his own guardrails name.

Carries the `warning` annotations Gate 1 recorded as open: the flask of oil's 5 Fire is 2024
PHB equipment that appears in none of his files.

---

### Slice 4 — the last two combos

The Caster Killer · The Sentinel Gate's sibling, **The Shield Round** having moved to slice
3 — so this slice is The Caster Killer plus whichever of the ten is still unwritten after
slices 1–3, and it carries the Searing Smite concentration `warning`.

Ends with **all ten combos on the glass** and the prover's combo literal at its final total.

---

### Slice 5 — the eight tactics

Including the three that are corrections to his sheet rather than plays: the four empty
prepared-spell picks, the missing saving-throw proficiencies, and the doctrine trick that
cannot legally be done.

Ships with the **not-one-turn test** — every tactic has at least two `actions` and none of
them is a numbered action-economy sequence.

---

### Slice 6 — the six persona plays

The backstory slice. Fate · Scar · the eyes · the Hidden Kingdom · the fire · the face.

Ships with **`the backstory is named on purpose`** — the exact inverse of round one's
`names nobody from his backstory` — plus the scoped-exception paragraph in `types.ts`. The
test and the comment land in the same slice as the content they license, so no future
reader finds one without the other.

Also re-asserts the two content constraints that round one found on the glass: `skillCheck`
≤ 24 characters, no quotation marks in `keyPhrases`.

---

### Slice 7 — green everywhere, then ship

- `tsc --noEmit`
- the full vitest suite, including round one's `pack-hearth-7.test.ts` untouched and passing
- `npm run build`
- **all eight round-one provers** and all of round two's, against `vite preview`
- commit by phase on `v1`, push

**The merge to `main` is his.** It fires `.github/workflows/deploy.yml` and publishes to
GitHub Pages, and deploy is 🟡 ASK-FIRST. Slice 7 ends by handing him the command and
saying what it does, exactly as round one's slice 10 did.

---

## Not in scope, and named so it does not creep in

- **Sorting favourites to the top.** Gate 3 flagged it as the change that would most improve
  the deck. He has not asked for it. It is a separate piece of work.
- **Round one's 31 entries.** Untouched. *"Keep them though and build from them."*
- **Any UI change at all.** Round two is content into the cards slice 9 already measured.
- **The four sheet defects** (no saving-throw proficiencies, phantom 3rd-level slots, empty
  `resourcePools`, empty `supplies`). Round two writes **tactics that tell him about them**.
  It does not edit his sheet.
