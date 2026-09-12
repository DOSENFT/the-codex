# The safety net

This folder is here to answer one question, in about a minute and a half, with
no judgement required from you:

> **Does the app still do the things it does today?**

You do not need to read any code to use it. Run one command, read the list of
green and red lines, and that is the whole skill.

---

## Running it

```
npm run test:safety
```

That is it. It starts the app on its own private port, opens a real browser at
phone size, and plays through the app the way you would — importing a character,
starting a fight, casting a spell, taking a hit, ending the turn. Then it shuts
everything down.

You do **not** need to have `npm run dev` running. If you happen to already have
the app running somewhere and want to use that instead:

```
CODEX_SAFETY_URL=http://localhost:5173/the-codex/ npm run test:safety
```

The two halves can also be run on their own, if you want a faster answer:

```
npx vitest run tests/safety-net          # the saved-file check, about a second
node tests/safety-net/run-flows.mjs      # the browser flows, about a minute
```

`npm test` — the 2000-odd existing tests — still works exactly as before and is
untouched by any of this.

---

## What you will see

One line per thing that was checked, in the order a person would do them:

```
PASS  import a character file  (15 checks, 9.7s)
PASS  starting combat  (7 checks, 2.8s)
...
ALL PASS — 15 flows, 97 checks, nothing broken.
```

If something has stopped working, that line turns into `FAIL`, and underneath it
you get the actual disagreement in plain words:

```
FAIL  taking damage  (1 of 2 checks failed, 4.4s)
       - one damage comes off
         expected "2 of 67, bloodied"
         but got  "3 of 67, bloodied"
       what this protects: Logging a hit. If this breaks, the number you are
       playing off is wrong from the first round of the night.
```

Three things to notice there: **which flow** broke, **what the app should have
shown versus what it actually showed**, and **why it matters at the table**.

---

## What each check protects

| Check | What breaks in real life if it goes red |
|---|---|
| import a character file | A new phone or a cleared browser means no character at all |
| the same character after closing and reopening the app | Work done in one session is lost by the next |
| starting combat | No round counter, no turn economy — the app is a read-only sheet |
| casting a spell spends the slot | You cast spells you do not have |
| undoing the last thing you did | A mis-tap costs a spell slot with no way back |
| attacking twice with Extra Attack | You lose half your damage every round and never notice |
| options you cannot afford are blocked and say why | The turn economy stops meaning anything |
| ending your turn | Rounds never advance; reactions are never there when they matter |
| taking damage | The number you are playing off is wrong from round one |
| dropping to zero brings up death saves | No way to track the three-and-three that decides whether you live |
| healing | Healing at the table is not reflected on the sheet |
| temporary hit points | Temp HP either heals you or vanishes |
| the bloodied warning | You find out you are bloodied by dying |
| picking a reaction you were missing | You play the whole campaign without a feature you already own |
| ending combat, with a chance to change your mind | One stray tap wipes the round counter mid-fight |
| **the saved file still opens** (5 separate checks) | A character file saved yesterday no longer loads, or loads with different numbers on it |

---

## Something went red. Now what?

**Do not change the test to make it pass.** The test is a record of what the app
did on 2026-09-11, verified by hand. If it disagrees with the app now, one of
two things is true, and it is worth a minute to work out which.

**1. You broke something.** Much the most likely. The failure line names the
flow and shows the old value next to the new one. Undo your last change, run
`npm run test:safety` again, and see it go green — that confirms it, and tells
you exactly which change to look at.

**2. You changed it on purpose.** Maybe hit points really should display
differently now. In that case the test is out of date and *should* be updated —
but do it deliberately, as its own edit, in the same commit as the change that
caused it. Open `flows.mjs`, find the check by the sentence in the failure
message, and change the expected value. Never delete a check to silence it; if a
feature genuinely goes away, delete the whole flow and say so in the commit
message.

**3. It failed but the app seems fine when you try it by hand.** Occasionally a
check can fail because the browser was slower than usual. Run it again. If it
passes the second time and fails the third, that is a real problem worth
chasing — an intermittent failure at the table is still a failure at the table.

If the whole thing refuses to start, the message will say why. The usual causes
are port 5199 already being in use (set `CODEX_SAFETY_PORT` to something else)
or Playwright not being on the machine (running `npx playwright@latest --version`
once puts it in the cache where this expects to find it).

---

## What is in here

| File | What it is |
|---|---|
| `flows.mjs` | The fifteen things a person does, written as checks. This is the file to read if you want to know what is protected. |
| `run-flows.mjs` | Starts the app, runs the flows, prints the PASS/FAIL lines. |
| `browser.mjs` | The plumbing — opening a browser, reading the hit-point bar. No assertions live here. |
| `saved-data.test.ts` | The saved-file check. Loads a real character file through the app's own loading code. |
| `fixtures/nix-lvl7.json` | A frozen copy of a real save, from 2026-09-11. **Do not edit it** — its whole value is that it never changes. |
| `KNOWN-BROKEN.md` | Things found broken while building this, and deliberately not pinned. Read this before assuming a gap is an oversight. |

Nothing in this folder touches `src/`. The safety net cannot change how the app
behaves; it can only tell you that it has.
