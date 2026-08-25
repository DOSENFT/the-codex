# At the table

One page. Everything you need to do before the session, and the short list of
things that will surprise you during it.

`TABLE-READY.md` is the proof — 60 criteria, what passed, what didn't, and why.
This is the part you actually use.

---

## 1. Get it on the phone (five minutes, do it before session day)

**The app lives at → https://dosenft.github.io/the-codex/**

Open that in your phone's browser, then install it to the home screen. Do this;
don't just bookmark it. Installed, it opens full-screen with no address bar,
and — this is the part that matters at a table — **it works with no signal at
all.**

- **iPhone / Safari:** tap the Share box (square with the arrow) → scroll →
  **Add to Home Screen** → Add.
  *Safari only.* Chrome on iOS cannot install a PWA; the option isn't there.
- **Android / Chrome:** tap ⋮ → **Install app** (or "Add to Home screen").

Now open it **from the home-screen icon** once, while you still have signal.
That first run is what fills the offline cache. Sixteen files, checked: after
it, the app boots and shows your sheet with the network completely dead.

## 2. Get Nix into it

The app starts empty. Your character comes from an export file.

The one to use is **`codex-nix-lvl7 (1).json`** — the full sheet. (You also
have `codex-nix-lvl7.json`, which is a thinner earlier export. It loads fine,
it just has less in it.) It is in your Downloads folder on the desktop, so:
email or AirDrop it to yourself, or put it in iCloud/Drive, so the phone can
reach it.

Then, in the app: **⚙ Settings → Import → pick the file.**

**Check one number before you trust it.** Open **PLAY → Combat** and confirm
you see **67/67** hit points and **LAY ON HANDS 35/35**. If those two are
right, the import took.

### Do this too: export a fresh copy from the phone

Once Nix is in and looks right, go **⚙ Settings → Export**. That saves a copy
*from the phone*, which is your backup. It's two taps and it works offline.
Do it again after a session if anything important changed.

---

## 3. Things that will surprise you

Not bugs I hid — these are the open items from `TABLE-READY.md § 9`, in the
words you'd want at the table rather than the words a grader would use.

**There is no undo.** If you spend a slot by accident, nothing takes it back in
one tap. You fix it the long way: use the same control to set the number back
where it was. Worth knowing *before* it happens with five people waiting.
(§ 9.2 · criterion S-4, reported UNPROVEN because there is nothing to grade.)

**Cold start is about three seconds.** Not when you switch tabs — those are
under 400ms — but the very first open after the phone has killed the app in
the background. If the DM is coming to you next, wake it early. The cause is
known and named (`sw.js:132`, § 9.8) and the fix rewrites the one file that
survives a bad deploy, which is not a thing to change the week of a session.

**The turn shortlist under-ranks your protective spells.** Warding Bond and Aid
get pushed down the list with the reason *"You are at full health"*, because
the ranker matches the words "hit points" in their description and reads them
as healing. Trust yourself over the shortlist on those two. (§ 9.14(d).)

**The import notice is worded wrong, and it fires every time.** It says
*"older export, with no weapons and equipment"* on every single import of your
real save, because `weapons` and `equipment` are genuinely empty in that file.
It is not telling you something went wrong. (§ 9.14(e).)

**Two tabs open at once is safe but can look stale.** If you have the app open
in two places, the second one won't silently overwrite the first — the stale
write is refused and reconciled, and it tells you. But until you try to write,
the older tab can still be *displaying* a number that's no longer true.
(§ 9.14(c).) At the table: one tab.

---

## 4. If something goes wrong mid-session

**The app looks broken / stuck on an old version.** Add `?sw=off` to the URL:

```
https://dosenft.github.io/the-codex/?sw=off
```

That tears out the offline worker and every cache it holds, and loads fresh
from the network. Your character is untouched — it lives in the browser's
storage, not the cache. Turn it back on later with `?sw=on`.

This is proven against a *deliberately poisoned* cache with the origin dead
(criterion N-4), which is the exact scenario where a normal reload doesn't
help.

**The screen goes somewhere you don't want anyone to see.** The **Veil** is on
every screen, in both modes. One tap covers it.

**Something ate the sheet.** Import the export file again. Re-importing your
own file is safe now — it keeps what you've spent this session rather than
rolling it back to the file's numbers (that was the R-10 failure; it's fixed
and graded green). Your Downloads backup is the floor you can always fall to.

---

## 5. What's actually proven

From the run of record — the whole harness, one build, no cherry-picking:

- **Your file loads on all 7 screens**, and so does every hostile variant of it
  I could construct (84 renders + 119 wrong-type renders, zero faults).
- **It survives the network being dead**, a poisoned cache, a full disk, a
  second tab, a 12MB junk file, and a binary renamed `.json`.
- **Nothing on screen is under 12px, under 4.5:1 contrast, or under a 44px
  touch target** — and turn controls are 48px. Measured off the painted
  pixels, at 390×844, not off the stylesheet.
- **Four hours of play doesn't degrade it**: 200 actions, 0% heap growth, zero
  net DOM nodes, and action 200 is as fast as action 10.

And what is *not* — seven red rows, and none of them is something that bites you
at the table:

- **S-1**, the three-second cold start. You'll feel this one. Wake it early.
- **S-3**, one spend in thirty took 136ms against a 100ms bar. The other
  twenty-nine were 40ms.
- **V-6, V-6b, V-6c** — reach and occlusion. § 9.15 has all three located and
  measured; none of them is a control you cannot get to.
- **V-9 and V-10** — these two went red on the last day and they are red
  because the *graders* broke, not the app. V-9's grader started counting the
  whole page as chrome when the layout changed; all 22 of its findings scroll
  freely and none of them is the tab bar, the Veil or the dice button. V-10's
  grader can't see a gradient, so it read the gold buttons as black-on-black at
  1.04:1 — photographed off the actual screen they are **8.61:1**. Both are
  written up in § 9.16, and I left both graders alone rather than fix a grader
  on the day I needed its verdict.

That last one is worth a sentence, because it's the whole posture of this
project: the honest version of "it's fine" is a red row with the evidence next
to it, not a green row I talked myself into.
