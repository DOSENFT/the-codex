# Slices: Toybox seed

Ten, in build order. Each ends working, testable, and visible in the app.

**Slice 0 — the three sheet fixes.** Not code: three buttons already shipped, pressed by
Marcus in his own browser. Delivered as instructions alongside slice 1.

**Slice 1 — tracer bullet.** One hardcoded combo, no templates and no gate beyond
class/subclass, travelling the whole path — `loadToybox` → `seedToybox` → `persist` →
Combos tab. It says almost nothing useful and it is on screen.

**Slice 2 — real numbers.** `buildProfile`, `resolveParty`, the token table and
`resolveText` replace the hardcoded strings; that same combo now states +3, 10 and
"Rune Willow" because the sheet says so, and states +4 and 12 for a CHA 18 Paladin 8.

**Slice 3 — seed once, and never resurrect.** The `seededPacks` marker, the level window,
and the forced re-seed behind a second button in the empty state.

**Slice 4 — the cards learn two new rows.** Requirements and annotations render on
`ComboCard`, `TacticCard` and `PersonaPlayCard` — including the fix that stops a
requirement looking exactly like a tag.

**Slice 5 — the checkpoint.** The mockup's own content, real: 3 combos, 3 tactics, 1
persona play, fully rendered in the app. **Stop here and judge volume and voice before
the remaining twenty are written.**

**Slice 6 — combos to full.** Roughly twelve, covering every Paladin 1st- and 2nd-level
spell whether or not prepared, each carrying its requirement.

**Slice 7 — tactics to full.** Roughly ten: reactions, positioning, the aura, resource
discipline, and the long-rest preparation index.

**Slice 8 — persona plays.** Roughly five, oath-forward. No play spends the changeling
secret.

**Slice 9 — the edges.** A Wizard, a Paladin 3, a Paladin 9 and a character with no
resolvable party each get the right nothing — plus the full-pack integrity sweep: no
`{{` survives, ids unique, every entry carries a requirement, and the unsourced three
carry their warnings.

**Slice 10 — ship it.** `tsc`, the full suite, a build, a Playwright prover against
`vite preview`, then commit. Push and deploy only on your say-so.
