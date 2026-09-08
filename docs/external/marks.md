# The marks — how the ability glyphs were made

`public/marks/*.svg`, seventeen of them, mapped to ability names by
`src/lib/canon/marks.ts`. Combat Open Book slice 7, 2026-09-08.

**This file exists so the eighteenth mark matches the first seventeen.** The art
was generated once, by hand, through a tool that is not in this repo and is not
called at runtime — so without a written record the only way to add one is to
guess, and a guessed mark is a mark that looks wrong next to the others.

**The app never calls an image API.** It reads files that are committed. Nothing
below is a runtime dependency; it is a procedure a human runs.

---

## What they are for

Marcus's ask, verbatim:

> "make good looking, memorable icons/images per spell so it's super easy for me
> to see the spell and know what I'm looking at at a glance. This will
> psychologically help memorize and know my spells naturally."

That is a **finding aid, not decoration**, and it sets every rule below. The mark
is rendered at **34 CSS pixels** in the Combat row list — that is where he is
scanning when it matters, and anything that only reads at card size has failed at
the job it was given.

---

## The generator

| | |
|---|---|
| Tool | Command Claude MCP, `generate_image` / `generate_image_batch` |
| Model | `recraft_v4_1` |
| `model_type` | **`vector`** — returns real SVG, not a raster |
| `colors` | one hex string, e.g. `["#d4a74a"]` |
| `background_color` | `"#100f0c"` |
| Cost | 2.5 credits per image |

`colors` and `background_color` take **hex strings**. An `{rgb: [...]}` object is
rejected with a 422 — that mistake was made here, so it is written down.

### Why vector, and what changed because of it

The Gate 4 plan said "96×96 WebP, ≈6KB each, 120KB total". `vector` mode returns
**SVG**, so the set is 17 files at ~2.8KB average, **48KB total** — smaller,
resolution-independent, and with no `@2x` problem on a retina phone. The plan's
number is superseded, and the direction of the change is the good one.

---

## The prompt formula

Every mark used this shape. The only variable is the SUBJECT sentence.

```
Bold solid filled silhouette icon, app icon style: <SUBJECT>.
ONE chunky solid filled shape, no outline stroke, no thin lines, no hairlines,
no detail lines, no text. Solid <COLOUR WORD> shape centered on a plain dark
background, filling about 80 percent of the square.
Must read instantly as a pure black-and-white silhouette at 34 pixels.
```

The real one, as sent for `shield-of-faith`:

```
Bold solid filled silhouette icon, app icon style: a thick solid ARCH — a heavy
domed archway barrier standing on two short solid legs, like a protective vault
dome. ONE chunky solid filled shape, no outline stroke, no thin lines, no
hairlines, no detail lines, no text. Solid gold shape centered on a plain dark
background, filling about 80 percent of the square. Must read instantly as a
pure black-and-white silhouette at 34 pixels.
```

### Why the prompt shouts about strokes — this was measured, not assumed

A first pilot (4 marks, 10 credits) asked for "thick strokes" and an outline
style. Recraft's `vector` mode drew **hairlines** anyway. At 72px they were
elegant; at 34px the glaive and the shield were grey noise with no readable
silhouette. A second pilot of the same four shapes changed only the prompt to the
filled-silhouette formula above and was legible at 34px immediately.

Twenty credits to learn that before committing to twenty marks. **Run the same
A/B before changing the formula.** The judgement is made at 34px, in the dark
theme, beside the marks it must not be confused with — `_pilot` scratch pages
were used for this and deliberately not kept.

---

## The palette — colour carries the KIND

Colour is a second axis of recognition, so it is assigned by what the ability
does, not by what looks nice. Tokens are the app's own.

| Kind | Colour | Marks |
|---|---|---|
| Weapon strike | bronze `#8b7355` | hearthbrand, javelin, opportunity-attack |
| Divine / radiant | cream `#f0e6d3` | divine-smite, channel-divinity, misty-step |
| Fire | ember `#e8924a` / ember-lit `#f5b183` | sacred-flame, flaming-cloak, hearthfire-manifest |
| Healing & bonds | verdant `#39d98a` | cure-wounds, lay-on-hands, warding-bond |
| Blessing & defence | arcane gold `#d4a74a` | bless, shield-of-faith, interception, sentinel, divine-sense |

---

## The rules a new mark must pass

1. **Readable at 34px.** One shape. If you have to squint, regenerate.
2. **No silhouette collision.** Check the new mark against the whole set at 34px
   before accepting it. This is the failure mode that actually happened:
   `shield-of-faith` first came back a plain gold hexagon and `sentinel` is a
   gold hexagon with a bar — two gold hexagons at row size means he has to read
   the text, which is the exact cost the marks were built to remove.
   `shield-of-faith` was regenerated as an arch, a silhouette nothing else uses.
3. **No semantic collision either.** `flaming-cloak` first came back a
   mountain/volcano, too close to `hearthfire-manifest`'s house. Regenerated as a
   ring of fire.
4. **Colour by kind**, from the table above.
5. **Strip the provenance blob** (below) before committing.
6. **Add the key to `marks.ts` and let the tests judge it.**
   `marks.test.ts` asserts every slug is a file, every file is reachable, no key
   is a name the composer never emits, and every name the composer DOES emit has
   a mark. A name added to the table that the app never produces will fail.

---

## The strip step — do not skip it

Every generated file ships ~4KB of base64 C2PA provenance. Left in, the set is
**107KB instead of 48KB**, and 60KB of base64 lands in the precache and in every
git diff that ever touches art. `marks.test.ts` asserts no `c2pa` and no
`<metadata>` survives, so a skipped strip is a red test rather than a silent
2× file.

```js
s = s.replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
     .replace(/\sxmlns:c2pa="[^"]*"/g, '')
     .replace(/preserveAspectRatio="none"/g, 'preserveAspectRatio="xMidYMid meet"')
```

The third replacement is not cosmetic: `preserveAspectRatio="none"` makes the
glyph stretch to whatever box it is given, and the row box (34×34) and the
generated viewBox are not always the same ratio.

---

## Where the names came from — measured, not listed

The Gate 1 mockup proposed twenty ability names. Run against the real composer,
that list was wrong **in both directions**: twelve of its entries (Heroism,
Command, Searing Smite, Compelled Duel, Thunderous Smite, Abjure Foes, Dispel
Magic, Aura of Protection, Aura of Solace, Summon Celestial…) are names the app
never emits for his sheet, and five names it does emit were missing. It also had
`Lay On Hands` where the composer says `Lay on Hands`, and no idea that the
composer writes `Opportunity Attack — Hearthbrand` with an em dash.

So the table is **the composer's own output**, plus his two feats (Sentinel,
Interception, which are on his real sheet but not in the NIX fixture). To add
marks for a new kit, run `composeTurn` and read the names off it — do not type
them from a character sheet.

---

## Precache

`vite.config.ts` adds `public/marks/*` to the service worker precache. This is
the **one exception** to that plugin's "public/ is not precached" rule, and the
reasoning is in a comment there: the rule is a size argument about 88MB of
backgrounds, and 48KB of finding aids inverts both halves of it.
