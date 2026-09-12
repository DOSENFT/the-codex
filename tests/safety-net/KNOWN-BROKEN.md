# Known broken — found while building the safety net, deliberately not pinned

The safety net only pins things that work. A test written against broken
behaviour turns a bug into a requirement, and then nobody can fix it without a
test going red. So anything below is written down here instead.

Each entry says **what was actually observed**, on the untouched code, on
2026-09-11 — not what the code looks like it should do. Where a claim comes from
reading the source rather than from driving the app, it says so.

---

## 1. Making a character from scratch — works, but cannot be relied on

**Observed.** Welcome → *Create New Character* → all eleven steps → *Forge
Character*. The wizard itself is fine: Name, Class, Subclass, Race, Identity,
Level, Spell Save DC, Spell Attack, Armor Class, Hit Points, AI Connection. The
button then says **"Forging…"** and stays that way for a long time. On the run
that was watched it was still saying "Forging…" when the last step was reached,
and had finished by the time it was looked at again 35 seconds later — producing
a working character (Barbarian, Path of the Berserker, Aasimar, level 5, 45/45,
AC 16, with class features). An earlier attempt was given up on at 30 seconds
because nothing had happened yet.

**Why it is not pinned.** Forging calls a live AI provider over the network.
How long it takes, whether it answers at all, and what it sends back are outside
this repo. A check that waits on it would go red on a bad signal and green on a
good one, which is worse than no check — it would train you to ignore red.

**And a real bug inside it.** The wizard never asks for ability scores, and
`src/components/CharacterSetup.tsx:452` hard-codes every one of them:

    abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }

*(read in the source)*. So every character made this way is born with a +0 in
everything — wrong attack bonuses, wrong saves, wrong skill checks. Pinning the
flow would mean pinning that. **Importing a file is the path that works**, and
that is the one the safety net protects.

## 2. "Switch Character" does nothing with only one character

**Observed in the source**, `src/components/Settings.tsx:1129` and `:1140`. The
button toggles `showSwitcher`, but the panel it toggles is behind
`showSwitcher && roster.length > 1`. With one character in the roster — which is
the normal case — tapping it produces no visible response at all. Not a crash;
just a dead button. It would come alive with a second character, but a check
that needs two imported characters to prove a button works is pinning the
workaround, not the feature.

## 3. Level Up raises the level without raising hit points

From the feature inventory (`.codex-owner/notes/inventory.md`), not re-driven
here. Levelling increments the number but does not recompute maximum hit points,
so the sheet ends up internally inconsistent. Not pinned: the correct behaviour
is not currently implemented, so there is nothing true to write down.

## 4. Persona Quick Reference and the spaced flashcards read fields nothing writes

From the inventory. These screens read `physicalTics`, `sceneInstincts` and
`quietTexture`, while the only persona fields ever written are `colorTraits` and
`coreTraits`. The screens therefore render empty. Not pinned — an assertion that
they are empty would cement the bug.

## 5. Academy XP is only wired up for quizzes

From the inventory. Other Academy activities complete without awarding
anything. Not pinned for the same reason.

## 6. Things a headless browser cannot judge

Not broken as far as anyone knows — just not checkable this way, so their
absence from the safety net is not a verdict on them:

- **Voice / microphone** flows — need real audio input and a permission grant.
- **Printing** — the output is a print dialog, which is outside the page.
- **Anything AI-backed** — dialogue, backstory, the roleplay coach, "Test
  Connection". These depend on a network call to a third party. (Note that
  *Test Connection* reports success in cases where a later real request still
  fails, so a green there does not mean forging will work.)

---

**If you fix one of these,** delete its entry here and add a check to
`flows.mjs` in the same change. That is how the net grows: a bug is fixed once,
and then it is fixed forever.
