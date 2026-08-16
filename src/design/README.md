# Direction D — the four rules it exists to enforce

`tokens.css` is direction D reduced to variables. The variables are the easy part; these four
rules are the actual design, and every one of them exists because a measured mockup broke it.

**1. Gold names the mechanic. Cream says the sentence.**
Gold is a highlight. Direction C put gold on body copy and reached 48.7% of the lit ink, which
inverts figure and ground — at that density gold *is* the background and nothing stands out.
D holds gold near 36%. When a rider reads "*Sap* — the target has disadvantage on its next attack
roll", `Sap` is gold and the rest is cream.

**2. Elevation is tone, not shadow.** You cannot shadow into `#0a0a08`. Four background steps
(`--d-e1` … `--d-e3`) carry every layer the UI needs. No `box-shadow` for depth.

**3. Ember is rubric, and it is rationed.** Costs, warnings, the bloodied crossing. Never below
16px — 4.68:1 needs the size to carry it. Pixel audits separate gold from ember by hue
(`(g-b)/chroma >= 0.45` is gold), so "it's all warm tones" is not a defence.

**4. Nothing Cinzel below 20px. Nothing at all below 12px. Nothing tappable below 48px.**
Bad lighting, arm's length, people waiting on you. `reference/shoot-mockups.mjs` counts violations
and direction D shipped with zero on both phone and iPad.

## The one structural rule

**Things that are one statement are one row.** The HP bar and its Bloodied annotation were stacked
until they were measured — 37px of an 844px phone for what was always a single sentence ("here is
the line, here is where Bloodied sits on it"). Merging them is what closed the vertical budget.
Reach for this before shrinking type: a layout that squeezes has already lost.

## Verification

`docs/plans/codex-v1/reference/measure-zones.mjs <file> [w] [h]` — per-zone heights, and an explicit
CLIPPED list for the flex zone. It ends pixel-guessing; use it before arguing about whether
something fits.
