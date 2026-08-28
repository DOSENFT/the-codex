# The derived-number audit

Marcus asked for this before anything changes: *"I sweep the whole sheet for any
value that is stored but should be computed — AC, initiative, HP max, Lay on Hands
pool, spell slots — and report what I find before changing anything."*

Nothing has been changed. This is the report.

---

## The headline

There is already a **complete, authoritative, per-level table** in the repo:
`src/canon/paladin-progression.json`, marked `"ruleset": "D&D 2024 (5.5e) Player's
Handbook"`, 20 level entries, each carrying:

```json
{ "level": 7, "proficiencyBonus": 3, "channelDivinityUses": 2, "preparedSpells": 7,
  "spellSlots": { "1": 4, "2": 3, "3": 0, "4": 0, "5": 0 },
  "layOnHandsPool": 35, "highestSpellLevel": 2 }
```

plus, at the top level, the two formulas as prose:

```json
"spellSaveDC": "8 + Proficiency Bonus + Charisma modifier",
"spellAttackModifier": "Proficiency Bonus + Charisma modifier"
```

**Production code reads exactly one thing out of this file: the class-feature
descriptions** (`src/canon/index.ts:17,56`). The `levels[]` array — every number
above — is loaded into the bundle and never consulted. Every one of those numbers is
*also* stored, separately, on the character, where it goes stale.

That is the whole shape of the bug in one sentence: **the app ships the right answers
and reads the wrong copy.**

---

## A: DERIVABLE — stored today, can go stale

| Field | Rule | Table/helper already in repo | Stale-detector exists? |
|---|---|---|---|
| `spellSaveDC` | 8 + prof + CHA mod | `computeSpellSaveDC()` `character.ts:376` | ✅ `vitals.ts:178` |
| `spellAttackBonus` | prof + CHA mod | `computeSpellAttackBonus()` `character.ts:383` | ✅ `vitals.ts:191` |
| `proficiencyBonus` | 2 + ⌊(level−1)/4⌋ | `proficiencyForLevel()` `vitals.ts:84` **and** `levels[].proficiencyBonus` **and** an inline third copy at `Settings.tsx:353` | ✅ `vitals.ts:162` |
| `spellSlots[n].max` | class + level table | `HALF_CASTER_SLOTS` `dnd-data.ts:74` **and** `levels[].spellSlots` | ✅ `vitals.ts:131` |
| `maxPreparedSpells` | class + level table | `levels[].preparedSpells` (**never read**) | ❌ none |
| `paladinResources.layOnHands.max` | 5 × level | `computePaladinResources()` `character.ts:1275` **and** `levels[].layOnHandsPool` | ❌ none |
| `paladinResources.channelDivinity.max` | 2, then 3 at level 11 | `computePaladinResources()` `character.ts:1276` **and** `levels[].channelDivinityUses` | ❌ none |
| `paladinResources.auraRange` | 10 ft, 30 ft at level 18 | `computePaladinResources()` `character.ts:1277` | ❌ none |

Three of these have **two or three independent implementations of the same formula**
(proficiency has three). They currently agree. Nothing makes them agree.

## B: GENUINELY STORED — no rule in the repo can derive these, and that is correct

| Field | Why it must stay stored |
|---|---|
| `armorClass` | Depends on armour, shield, magic items and DM rulings. The app models no equipment. Nix's 18 cannot be computed from anything on the sheet. |
| `hitPoints.max` | Depends on hit dice actually rolled at each level (or a chosen average) plus CON. `hitDie: "d10"` is in canon; **which numbers he rolled is not, and never will be.** |
| `hitPoints.current`, `tempHP`, `tempHPSource` | Live play state. Not derived from anything. |
| `weapons[].bonusToHit`, `bonusToDamage` | Magic-item bonuses the app does not inventory. |
| `resourcePools[].max` | Homebrew pools Marcus authored. There is no rule; he *is* the rule. |
| `initiativeMod` | Already derived every render (`vitals.ts:58`). Not stored anywhere. **This one is already right.** |

---

## Every edit path that should recompute, and what each one currently does

| Where | What it writes | What it forgets |
|---|---|---|
| `CharacterPage.tsx:208` `handleScoreConfirm` — Prep tab, tap a score | `abilityScores` | save DC, spell attack, prepared-spell count. **This is the one Marcus hit.** |
| `CharacterSheet.tsx:30-37` — same edit, different screen | `abilityScores` | identical omission |
| `Settings.tsx:348` `handleLevelUp` | `level`, `proficiencyBonus` | spell slots, Lay on Hands pool, Channel Divinity uses, aura range, prepared-spell count, save DC, spell attack |
| `Settings.tsx:361` `handleUpgradeCharacter` | `paladinResources` only | everything else |
| JSON import — `import-character.ts:29-88`, `Settings.tsx:266`, `CharacterSetup.tsx:150` | every field verbatim | **recomputes nothing.** A file with wrong numbers imports its wrong numbers. |
| `longRest()` `character.ts:1119` / `shortRest()` `character.ts:1163` | `current` values only | never revisits any `max` |

**A latent one worth naming:** `CharacterFeat.abilityIncrease` exists on the type
(`character.ts:223`) and the feat form collects it (`CharacterPage.tsx:322`), but
**nothing in the codebase ever applies it to `abilityScores`.** A feat that grants +1
CHA is recorded and ignored. Not in scope; recorded so it is not rediscovered as a
mystery later.

---

## What the app already knows and shows anyway

`VitalsBand.tsx:58-98` renders *"Your sheet and the 2024 rules disagree on N things"*
with the sheet value and the rule value side by side, and the standing line:

> *"Nothing has been changed. The app does not know which of these is right for your
> table — that is yours and your DM's call."*

The re-run probe confirms that banner fires on the seeded CHA-16 sheet. So today the
Play tab tells him the numbers disagree **and then paints the wrong one in the biggest
type on the screen** — `Save DC 15` in hero colour, directly above the warning.

That was a deliberate decision, recorded at `vitals.ts:38-41`: *"not a number to
quietly swap at the table — he has been playing with this one."* Gate 1 answer #1
reverses it. The reversal is correct *because the premise changed*: that comment
assumed the stored value might encode something real the app couldn't see. For the
three CHA-derived numbers it does not — it encodes a Charisma he no longer has.

---

## Recommended scope, for Gate 1 to confirm

**In:** the three he named (save DC, spell attack, proficiency) plus the four that
have tables but no detector (prepared-spell count, Lay on Hands pool, Channel Divinity
uses, aura range). All seven have an existing rule and no legitimate exception.

**Out:** AC, HP max, weapon magic bonuses, homebrew pools. These are class B — the app
would be inventing numbers it has no right to.

**The open question for Gate 2:** spell slots are class A *by rule*, but Marcus's sheet
carries slots his level does not grant, and that has been flagged as a disagreement for
some time without him correcting it. Auto-computing them would silently delete
resources he may be playing with by DM ruling. Slots may need to stay reported-not-
corrected even though everything around them stops being stored.
