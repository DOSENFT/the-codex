# The Marks — art direction

One glyph per ability. Read `src/lib/canon/marks.ts` first; this file is only
about how the SVG itself is drawn.

## The one requirement

**It has to survive 34 pixels on a phone in a lit room.** That is the size in the
combat row list, and that is where Marcus is scanning when it matters. A mark
that only works at card size has failed at the job it was asked to do.

Everything below is downstream of that sentence. It is why there are no strokes,
no gradients, no hairlines, no interior detail smaller than ~90 units, and no
glyph made of more than three or four solid shapes.

## Canvas — identical in every file, no exceptions

```svg
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" style="display: block;" viewBox="0 0 2048 2048" width="1024" height="1024" preserveAspectRatio="xMidYMid meet">
<path transform="translate(0,0)" fill="rgb(20,18,15)" d="M 0 0 L 2048 0 L 2048 2048 L 0 2048 L 0 0 z"/>
<!-- glyph paths here -->
</svg>
```

- The dark square is a full-bleed background, not a frame. It is always first.
- The glyph lives inside roughly `260 → 1788` on both axes. Nothing bleeds off.
- `fill` only. No `stroke`, no `stroke-width`, no `opacity`, no `<g>`, no
  `<defs>`, no gradients, no `<circle>`/`<rect>` elements — every drawn shape is
  a `<path>`, because `marks.test.ts` asserts `<path` is present and the rest of
  the pipeline has only ever seen paths.
- No `<metadata>`, no `c2pa`, no comments in shipped files. The test rejects them.
- A "ring" is two subpaths in one `d` with opposite winding, not a stroke.

## Palette — these five values, nothing else

| role | colour | used for |
| --- | --- | --- |
| ember | `rgb(247,110,76)` | fire, the Oath of the Hearth |
| ember-warm | `rgb(232,146,74)` | the cooler half of a two-tone flame |
| bronze | `rgb(197,165,90)` | weapons, strikes, smites |
| bronze-deep | `rgb(164,119,50)` | the shadow half of a two-tone weapon |
| gold | `rgb(232,200,122)` | blessing, warding, sensing, the spoken word |
| gold-deep | `rgb(212,167,74)` | the shadow half of a two-tone gold glyph |
| verdant | `rgb(57,217,138)` | healing, cleansing, keeping someone up |
| void | `rgb(20,18,15)` | the background — and cut-outs inside a glyph |

Two tones maximum per glyph, and only when the second tone separates two forms
that would otherwise merge into one blob at 34px. One tone is the default.

## Weight

- Minimum limb thickness **90 units**. Below that it disappears at 34px.
- Preferred thickness for a primary form: **140–260 units**.
- Gaps between two forms: **at least 70 units**, or fill the gap with `void`.
- Total ink should cover roughly a quarter to a half of the canvas. A glyph that
  covers a tenth reads as a speck; one that covers three-quarters reads as a
  solid square.

## The shape vocabulary

Compose from these. Reusing them is what makes forty-four separate files look
like one set — do not invent a new blade silhouette when `BLADE` exists.

**BLADE** — upright, point up, centred.
```
M 1024 250 L 1120 520 L 1120 1290 L 928 1290 L 928 520 Z
M 790 1290 L 1258 1290 L 1258 1400 L 790 1400 Z
M 976 1400 L 1072 1400 L 1072 1760 L 976 1760 Z
```

**SHIELD** — heater shield, centred.
```
M 1024 250 L 1740 470 C 1740 1180 1450 1610 1024 1800 C 598 1610 308 1180 308 470 Z
```

**RING** — a thick annulus (outer clockwise, inner counter-clockwise).
```
M 1024 300 A 724 724 0 1 1 1023 300 Z M 1024 500 A 524 524 0 1 0 1025 500 Z
```

**DROP** — a teardrop, point up.
```
M 1024 320 C 1300 700 1420 900 1420 1120 C 1420 1340 1243 1520 1024 1520 C 805 1520 628 1340 628 1120 C 628 900 748 700 1024 320 Z
```

**FLAME** — a tongue of fire, taller and leaner than DROP.
```
M 1024 260 C 1230 620 1350 830 1350 1060 C 1350 1300 1204 1470 1024 1470 C 844 1470 698 1300 698 1060 C 698 830 818 620 1024 260 Z
```

**EYE** — a lens with a pupil cut out of it.
```
M 300 1024 C 560 640 800 480 1024 480 C 1248 480 1488 640 1748 1024 C 1488 1408 1248 1568 1024 1568 C 800 1568 560 1408 300 1024 Z
```
(then a `void`-filled circle at 1024,1024 r≈210, and a gold pupil r≈120 — or
simply cut the pupil with a counter-wound subpath.)

**RAY** — a tapered streak, thick at the head, thin at the tail. Head `H`, tail
`T`, perpendicular `p`; head half-width ~80, tail half-width ~20.

**CHEVRON-UP** — an upward arrowhead, for anything that raises or bolsters.
```
M 1024 380 L 1520 900 L 1330 900 L 1330 1120 L 718 1120 L 718 900 L 528 900 Z
```

## The three tests that will reject the file

`src/lib/canon/marks.test.ts`, section 1:

1. Every slug in `TABLE` has a real `.svg` here — and every `.svg` here is in
   `TABLE`. No orphan art, no dangling key.
2. Starts `<svg`, ends `</svg>`, contains `<path`, longer than 300 bytes.
3. Contains no `c2pa` and no `<metadata>`.

## History

The first seventeen marks were generated as raster art and traced to a single
path each, which is why their `d` attributes are long and organic. Everything
from the level-7 prepared set onward is drawn directly as geometry: it is
sharper at 34px, roughly a third the file size, and it does not carry a
provenance blob that has to be stripped.
