# The Vault (DOSENFT/dwk-vault) — what it is, what is in it, and what the Codex can use

Research note. Written 2026-09-11. Read-only pass over a fresh clone.
Every statement below cites a file that was opened. Nothing here is from memory.

---

## 0. Provenance of this note — the clone, and the failure

**First clone attempt failed.** Full command and verbatim error:

```
git clone https://github.com/DOSENFT/dwk-vault C:/Users/marcu/Documents/Powerhouse/projects/dwk-vault

Cloning into 'C:/Users/marcu/Documents/Powerhouse/projects/dwk-vault'...
error: RPC failed; curl 56 Recv failure: Connection was reset
error: 4926 bytes of body are still expected
fetch-pack: unexpected disconnect while reading sideband packet
fatal: early EOF
fatal: fetch-pack: invalid index-pack output
```

Cause is almost certainly size: the repo carries 378 MB of MP3 in-tree (see §2), and
the default full-history clone has to stream all of it in one connection.

**Second attempt succeeded** with `--depth 1 -c http.postBuffer=524288000 -c
http.version=HTTP/1.1`. The working tree at
`C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault` is therefore **a shallow
clone — full working tree, one commit of history.** Treat it as read-only. Nothing in
it was modified.

**There is a second, older copy on this machine** at
`C:\Users\marcu\vault-audio\dwk-vault` (same remote — `git remote -v` reports
`origin https://github.com/DOSENFT/dwk-vault.git`). It is stale; see §5.3, where that
staleness is the single most load-bearing fact in this note.

---

## 1. What it is, in plain English

A single-page, offline-capable web archive of one real D&D campaign — the Driftwood
Kin — built out of the recordings of the sessions themselves.

> `<title>The Vault — Driftwood Kin Campaign Archive</title>`
> — `C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\index.html:17`

> `"description": "The Driftwood Kin campaign archive — every session, every moment, every open thread."`
> — `C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\manifest.webmanifest:5`

It is installable as a PWA (`"display": "standalone"`,
`manifest.webmanifest:8`) and ships three HTML surfaces:

| File | Purpose (from its own `<title>`) |
|---|---|
| `index.html:17` | the archive itself |
| `guide.html:5` | `How to use The Vault — a guide` |
| `check.html:4` | `The Vault — can this device play the recordings?` — a device capability probe |

Its architectural thesis is stated in one paragraph:

> "The published page is one file: `dist/index.html`. It is built from five, and it can
> always be taken apart back into those five. That is the whole architecture."
> — `C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\README.md:3-5`

The five are `build/app.html`, `vault/vault-data.js`, `vault/audio.js`, `vault/sync.js`,
`vault/art.js`, compiled by `python3 build.py` (`README.md:7-13`).

The corpus is not hand-authored prose. It is normalised transcript, under a written
spec whose first rule is:

> "**Never invent content.** Every value must be traceable to the source file. If the
> source doesn't say it, the field is `null` or an empty array. A thin honest record
> beats a rich fabricated one. This vault's whole value is that it can be trusted."
> — `C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\dwk-vault-sources\SCHEMA.md:6-9`

and whose second rule is that timecodes are never guessed:

> "If it does not [carry a timecode], `t` must be `null`. NEVER guess, interpolate, or
> estimate a timecode." — `dwk-vault-sources\SCHEMA.md:11-12`

Pipeline, stated by the repo: "raw Notta AI Note (markdown) → `data/SCHEMA.md` →
`data/json/<slug>.json` → `vault/vault-data.js`"
(`dwk-vault-sources\README.md:76-78`).

Its one non-negotiable data property:

> "**The shared log is append-only.** Every change is a new row in `vault_edits`. There
> is no UPDATE policy and no DELETE policy, so the page physically cannot destroy
> campaign history. Undo is a compensating row."
> — `dwk-vault-sources\README.md:47-49` (also `README.md:26-28`)

---

## 2. What is in it — content, code and data, all three

### 2.1 Top-level tree (shallow clone, `.git` excluded)

```
dwk-vault/
├─ .gitattributes                175 B
├─ .gitignore                    718 B
├─ README.md                   2,366 B
├─ robots.txt                      28 B
├─ manifest.webmanifest           637 B
├─ sw.js                        1,583 B
├─ update.ps1                   4,219 B
├─ index.html               1,010,039 B   ← the whole published app + corpus
├─ guide.html                 131,683 B
├─ check.html                  10,047 B
├─ apple-touch-icon.png / icon-192 / icon-512 / icon-maskable-512   (4 PNG, 43,495 B)
├─ sample.mp3               8,841,357 B
├─ audio/                                  5 MP3, 369,385,281 B
│   ├─ s10-vattenheim.mp3        92,312,685
│   ├─ s11-festival-planning.mp3 92,928,429
│   ├─ s12-ponzis-oath.mp3        8,841,357
│   ├─ s13-city-festival.mp3     93,621,069
│   └─ s14-caremall.mp3          81,681,741
└─ dwk-vault-sources/                      the decomposed build inputs + tests
    ├─ build/app               206,067 B   (markup/style/behaviour, extensionless)
    ├─ vault-data.js           406,125 B   the corpus  (`const SESSIONS=[...]`)
    ├─ art.js                  267,895 B   atmosphere plates
    ├─ audio.js                  1,679 B   slug → audio URL map
    ├─ sync.js                     635 B   Supabase endpoint + public key
    ├─ campaign.json             1,666 B   authored roster (see §4.2)
    ├─ kinds.json                  419 B   canonical entity-kind overrides
    ├─ aliases.json              3,554 B   name aliasing
    ├─ build.py / recover.py / check_hosting.py
    ├─ verify*.py (7 files)                the regression suites
    ├─ all.sh
    ├─ README.md               4,150 B
    └─ SCHEMA.md               3,997 B
```

### 2.2 File counts by type and total size

Working tree, `.git` excluded — 40 files, **380,384,001 bytes (≈363 MB)**:

| Ext | Files | Bytes |
|---|---:|---:|
| `.mp3` | 6 | 378,226,638 |
| `.html` | 3 | 1,151,769 |
| `.js` | 5 | 677,917 |
| *(extensionless — `build/app`)* | 1 | 206,067 |
| `.py` | 9 | 55,232 |
| `.png` | 4 | 43,495 |
| `.md` | 3 | 10,513 |
| `.json` | 3 | 5,639 |
| `.ps1` | 1 | 4,219 |
| `.sh` | 1 | 954 |
| `.gitignore` / `.gitattributes` / `.txt` / `.webmanifest` | 4 | 1,558 |

`.git` (shallow, one commit) adds a further 364,342,842 bytes. A *full* clone is
materially larger — that is what killed the first attempt.

**Audio is deliberately in-tree, not in Releases**, and the reason is recorded:

> "GitHub *Releases* serve every asset as application/octet-stream with a
> Content-Disposition: attachment header. Android Chrome sniffs past that; WebKit never
> does — and Chrome on an iPhone is WebKit. Confirmed on a real device (iOS 18.6,
> 2026-08-18): MediaError.code 4"
> — `dwk-vault-sources\audio.js:4-9`; same reasoning in `.gitignore:1-11`

### 2.3 The corpus — the actual data shape

Parsed directly out of `const SESSIONS=[...]` in
`C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\index.html` (declaration at
byte 79,355, inside `<script id="vault-data">`):

| Measure | Count |
|---|---:|
| Sessions | **20** |
| Date range | `08/28/2025` → `05/28/2026` (one session has `date: null`, slug `nighttime-assault-fortress-gates`) |
| Total recorded runtime (`durationSec` summed) | 156,989 s ≈ **43.6 hours** |
| Sessions with `hasTimecodes: true` | 16 of 20 |
| Beats | 455 |
| Beats carrying a real timecode (`t` non-null) | **354** |
| Threads (open questions) | 195 |
| Entity mentions | 509 |
| Distinct entity names | 407 |
| Audio actually hosted | **5 of 20 sessions** (`audio.js:26-32`) |

Entity mentions by kind: `npc` 137 · `item` 113 · `place` 90 · `faction` 70 · `pc` 63 ·
`creature` 27 · `deity` 4 · `asterum` 3 · `nation` 2.

Per-session record shape is fully specified at
`dwk-vault-sources\SCHEMA.md:48-71`: five fixed cards (`changed` / `learned` / `who` /
`cost` / `hanging`, defined at `SCHEMA.md:24-30`), `beats[]`, `threads[]`,
`entities[]`, `gaps[]`, plus `subtitle`, `logline`, `recap`, `party`, `nottaId`, `url`.

So: **all three.** Content (43.6 h of real audio, 455 narrative beats), code (a
hand-built single-file PWA, a Python build/recover pipeline, seven verification
suites), and data (a normalised, timecoded, schema-governed campaign corpus).

---

## 3. What is concretely reusable by the Codex

Ranked by "already proven useful" rather than by ambition.

**3.1 `index.html` → `const SESSIONS=[...]` — the campaign corpus.**
Already consumed. `scripts/vault-import.mjs:111-135` bracket-matches the array out of
the raw HTML (and explains why a regex fails: "the recays contain brackets, quotes and
escaped quotes", `vault-import.mjs:107-110`). This single array is the source for every
Codex campaign field the import fills.

**3.2 `entities[]` → `campaign.notableNPCs` and `campaign.worldDetails`.**
`vault-import.mjs:335` splits on agency — `npc`/`deity`/`creature` can be spoken to;
`place`/`nation`/`item`/`asterum`/`faction` are "the world". Capped at 30 and 30
(`vault-import.mjs:395-396`) because "`campaignContext` prints EVERY notable NPC into
the system prompt of every AI call the app makes" (`vault-import.mjs:386-388`). This is
what feeds the Engage/Roleplay card a real cast instead of an empty list.

**3.3 `party[]` + `entities[kind==='pc']` → `campaign.partyMembers`.**
Roster from the resolved entity list, class/species mined from the free-text party
strings by frequency (`vault-import.mjs:213-320`). Produces name, class, race,
personality and a `relationshipToPC` sentence.

**3.4 `subtitle` + `logline` → `campaign.sessionNotes`.**
Capped at 20 to match the Codex editor's own cap (`vault-import.mjs:416-425`). Logline
is chosen over `recap` explicitly to keep AI prompt tokens down
(`vault-import.mjs:420-423`).

**3.5 `dwk-vault-sources\campaign.json` — authored, authoritative roster. NOT YET USED.**
This is the highest-value unclaimed asset in the repo. It self-describes as:

> `"_note": "Campaign-level truth, authored by Marcus — not derived from Notta. This overrides anything the session notes claim about the party."`
> — `dwk-vault-sources\campaign.json:2`

It carries per-character `cls`, `realName`, and — critically — **`status`**:
`Scar` is `"status": "gone"`, `"note": "Dead. Not really dead."`
(`campaign.json:28-32`); `Ketza` is `"gone"` / `"Went to the Fey. No longer with the
party."` (`campaign.json:33-38`); two `"???"` slots are `"incoming"`
(`campaign.json:39-50`). It also names the five nations (`campaign.json:52-58`) and
supplies `kindLabels`/`kindHelp` — human-readable names for every entity kind
(`campaign.json:59-74`). `vault-import.mjs` never opens this file. See §5.2.

**3.6 `dwk-vault-sources\kinds.json` — canonical kind overrides.**
`"_note": "Canonical kind for named subjects, overriding whatever a session note
guessed. Applied at build time."` (`kinds.json:2`). It fixes exactly the class of
mis-filing that `vault-import.mjs` currently hand-patches with a hard-coded
`NOT_A_PERSON` set (`vault-import.mjs:368-374`).

**3.7 Timecodes — 354 of them, currently discarded.**
`beats[].t` and `threads[].t` are integer seconds, and `audio.js:26-32` maps slug →
playable URL. This is the raw material for the citation/deep-link requirement in
`docs/external/vault-boundary.md:89-94`. The importer carries none of it (§5.4).

**3.8 `threads[]` — 195 open questions with urgency (`u: hi|md|lo`) and timecodes**
(`SCHEMA.md:67`). `vault-import.mjs:175` counts them in `--probe` and then throws them
away. `vault-boundary.md:116-120` names `threads` as one of the three fact kinds the
briefing is supposed to carry.

**3.9 The append-only-log pattern itself.**
Not data — architecture. `README.md:26-28` and `dwk-vault-sources\README.md:47-49`. The
Codex's own acquisition memo nominates this as the fix for the Codex's missing undo
(`acquisition\THE-ACQUISITION.html:452`, and Release 2 at line ~260 of the rendered doc).

---

## 4. Licensing and usage boundaries

**4.1 There is no licence. At all.**
No `LICENSE`, `LICENCE`, `COPYING` or equivalent exists in the repository root.
`https://api.github.com/repos/DOSENFT/dwk-vault` returns `"license": null` and
`"visibility": "public"`, `"allow_forking": true`. Public and forkable is **not** a
grant of rights: with no licence, default copyright applies and the content is
all-rights-reserved. If the Codex ever ships Vault-derived content to a third party,
this needs an explicit licence first. Today it is fine because it is one owner using
his own material.

The repo's GitHub description is narrower than the repo actually is:
`"description": "Audio assets for The Vault (D&D campaign archive)"`.

**4.2 The real boundaries are not legal, they are consent and secrets.**

- *Consent.* `audio/` is 43.6 hours of **real recordings of real named people** at a
  real table (`audio.js:26-32`, `campaign.json:4-51`). Anything that republishes,
  transcribes onward, or feeds this to a third-party model is a consent question about
  five human beings, not a licensing question.
- *A live credential ships in the page — deliberately.*
  `dwk-vault-sources\sync.js:5-8` contains `https://olsoszyirfbqdinczlvc.supabase.co`
  and `sb_publishable_NE6C29qOEufeomhpWMgaGw_64E89SG3`. The file states the intent up
  front: *"The key below is a public, read-and-append-only key — it is meant to ship in
  the page. What it can do is fixed in the database itself: read the change log, add to
  the change log. It cannot change or delete a single row that is already there."*
  (`sync.js:1-4`). This is a defensible design **only** while the RLS policies hold;
  the safety is in Postgres, not in the key. Worth re-verifying before the Vault is
  pointed at anyone outside the table.
- *Third-party pipeline.* Transcription is Notta (`SCHEMA.md:1`, and every session
  carries a `nottaId` + `app.notta.ai` URL, e.g. `dwk-vault-sources\vault-data.js:1`).
  Whatever Notta's terms are, they sit upstream of everything in the corpus.

---

## 5. The Codex↔Vault relationship as it currently IS

Two documents define it, and **they do not agree with each other.**

### 5.1 The contract: `docs/external/vault-boundary.md`

Dated 2026-08-17, "decided by Marcus" (`vault-boundary.md:3`). It calls itself the
contract: *"**This document is the contract.**"* (`vault-boundary.md:6`). It sets the
dividing test (`vault-boundary.md:24-25`), freezes the Codex's campaign fields
(*"**They stop growing.** No new campaign features are built in the Codex."*,
`vault-boundary.md:45-46`), and specifies the feed as **an HTTP endpoint**:

> `GET  <vault>/briefing/<campaign>/<character>     → a bounded briefing document`
> — `vault-boundary.md:103`

with six constraints (`vault-boundary.md:65-98`), of which the ones that matter here
are **#5 "Every fact carries its citation"** (`vault-boundary.md:89-94`, *"A briefing
fact with no citation is a rumour"*) and **#6 "Facts are typed and few"** — the closed
set being `standing` / `promises` / `threads` (`vault-boundary.md:107-121`).

The freeze is mirrored into the Codex's own plan, as the contract requires:
`docs/plans/codex-v1/00-status.md:12` (`## 🔒 SCOPE BOUNDARY`), with
`00-status.md:27-29` marking `campaign.notableNPCs`, `partyMembers`, `currentQuest`,
`sessionNotes` and `codex-session-log-*` **FROZEN**, and `00-status.md:34-36`
classifying the briefing feed as post-V1.

### 5.2 The implementation: `scripts/vault-import.mjs`

Dated by its own content to 2026-09-09 (`vault-import.mjs:71`), i.e. **three weeks
after the contract**, and it opens by overruling it:

> "The Codex has a `CampaignData` shaped almost exactly like the useful half of that,
> and — until now — empty, because `docs/plans/codex-v1/00-status.md` froze those fields
> in deference to the Vault. **Deferring to a system nobody ever wired up is how you end
> up with an Engage card that offers Marcus nobody to talk to.**"
> — `scripts\vault-import.mjs:11-15`

and replaces the endpoint with a file:

> "── WHY NOT AN HTTP ENDPOINT ── `docs/external/vault-boundary.md` specifies a
> `GET /briefing/...` and it is still the right eventual shape. It is not the right
> FIRST shape: the Codex's hardest constraint is that it works in a basement with no
> signal … A file works offline by construction and needs no server to exist."
> — `vault-import.mjs:27-32`

It preserves the one-directional rule faithfully: *"there is no write-back, no sync, and
no shared store — the coupling is one JSON file, moved by hand."*
(`vault-import.mjs:24-25`).

**So the relationship today is: a one-way, manual, file-based import, not the specified
pull endpoint. The contract has not been amended to say so.** `vault-boundary.md` is
still written as though the endpoint is the plan, and `00-status.md:27-29` still says
the fields are frozen while a script exists specifically to fill them.

### 5.3 Is it wired up and working? Partly — and it reads a stale copy.

**Working:**
- `node scripts/vault-import.mjs --probe` runs and produces output. Against the default
  vault path it reports `sessions 16`, `date range 2025-09-12 → 2026-05-28`,
  `threads 120`, and a full entity-kind census.
- The output rides the existing import route: the payload is *"The same envelope
  `lib/export-character.ts` writes, so this file imports through the ordinary Settings →
  Import route with no special case."* (`vault-import.mjs:470-472`).
- The Codex app knows the resulting campaign id. `campaign.id` is hard-set to
  `'vault-driftwood-kin'` (`vault-import.mjs:448`), and that exact string is a fixture
  in `src/lib/campaign-show.test.ts:35,47,56-57,65,71,81,84` — so the repointing
  behaviour around a Vault-imported campaign is under test.

**Not wired up:**
- There is **no npm script**. `package.json:6-13` lists `dev`, `build`, `preview`,
  `test`, `test:watch`, `budget` — no `vault:*` anything. The import is a thing a human
  remembers to type.
- Nothing in `src/` imports, invokes or references `vault-import.mjs`. The only `vault`
  strings in `src/` are the campaign-id fixture above and incidental prose.
- No imported artefact is committed. The coupling exists only when someone runs it.

**The stale-copy problem — this is the important one.**
`vault-import.mjs:65` defaults to `--vault ~/vault-audio/dwk-vault`:

```js
const VAULT = flag('--vault', join(homedir(), 'vault-audio', 'dwk-vault'))
```

That directory exists (`C:\Users\marcu\vault-audio\dwk-vault`) and is a **different,
older snapshot of the same remote**: its `index.html` is 784,176 bytes and contains
**16** sessions; the repository's current `index.html` is 1,010,039 bytes and contains
**20**. So the default invocation silently imports a four-session-old campaign.

A second staleness sits inside the repo itself: the committed source
`dwk-vault-sources\vault-data.js` contains **16** sessions while the built
`index.html` it is supposed to produce contains **20**. The sources are behind the
artefact — which is exactly the failure `dwk-vault-sources\README.md:15-20` ("If the
workspace is ever wiped … `python3 recover.py`") exists to recover from, now present in
the committed state rather than in a lost container.

### 5.4 What the implementation drops that the contract requires

| Contract requirement | Implementation |
|---|---|
| `vault-boundary.md:89-94` — every fact carries a citation (deep link to the second) | **Dropped entirely.** `vault-import.mjs` never reads `beats[].t`, never reads `threads[].t`, and emits no `cite` field. 354 real timecodes are discarded. |
| `vault-boundary.md:107-121` — typed facts: `standing`, `promises`, `threads` | **None of the three exist.** Output is `partyMembers` / `notableNPCs` / `worldDetails` / `sessionNotes` (`vault-import.mjs:444-460`) — the Codex's pre-existing shape, not the briefing shape. |
| `vault-boundary.md:83-84` — "who is here · what did I promise · who wants me dead" | Only "who is here" survives. Promises and hostility live in `threads[]` and `cards.cost`/`cards.hanging`, none of which are read. |
| `vault-boundary.md:45-46` — no new campaign features in the Codex | The script's entire purpose is to populate those fields. |

The size discipline, at least, is honoured: caps of 30/30/20
(`vault-import.mjs:395-396,416`) with every drop printed rather than swallowed
(`vault-import.mjs:478-495`).

---

## 6. Where the Vault contradicts the Codex

### 6.1 The player's own name: `Nyx` vs `Nix`

The Codex importer treats `Nyx` as a transcription error and rewrites it:

> "Notta transcribes the PC's name as 'Nyx' throughout; Marcus confirmed on 2026-09-09
> that it is the same person and the drift is the transcriber's, not a second character."
> — `scripts\vault-import.mjs:70-74`; map at `vault-import.mjs:82` (`['nyx','Nix']`),
> applied to prose at `vault-import.mjs:270-274`

The Vault's own authored, explicitly-overriding roster spells it **Nyx**:

> `{"name": "Nyx", "realName": "Khaonn Lochai", "cls": "Paladin of the Hearth", "status": "active"}`
> — `dwk-vault-sources\campaign.json:6-9`

and `kinds.json:11` pins `"Nyx":"pc"` as canonical. The Vault also carries a real name,
**Khaonn Lochai**, that the Codex has never seen — and `vault-import.mjs:82` maps
`'kayon' → 'Nix'`, which is plainly a transcription of that same real name being
collapsed into the wrong field. Both sides claim to be canonical about the same person.

Same collision on three more names: Vault `"Rune Willow"` (`campaign.json:11`) vs Codex
`'Runewillow'` (`vault-import.mjs:83`); Vault `"Ketza"` (`campaign.json:27`) vs Codex
`'Ketsa'` (`vault-import.mjs:87`); Vault `"Talon"`/`realName: "Tanner"`
(`campaign.json:17-18`) vs the Codex importer, which discards everything after the first
delimiter (`vault-import.mjs:77`) and so can never see a real name at all.

### 6.2 Dead and departed characters arrive as live party members

`campaign.json:28-38` marks Scar `"gone"` ("Dead. Not really dead.") and Ketza `"gone"`
("Went to the Fey. No longer with the party.").

`vault-import.mjs:279-284` builds `partyNames` from *every* entity with `kind === 'pc'`,
ranked by appearance count, with no status filter — and the `--probe` against the local
copy shows `Scar` at 4 appearances, comfortably inside the roster. The emitted
`partyMembers` record (`vault-import.mjs:308-320`) has no status field at all, and
`relationshipToPC` renders as *"Driftwood Kin — at the table with Nix for N of 16
recorded sessions"* — present tense, for a character the Vault says is dead.

The Codex would therefore offer Marcus a roleplay conversation with a departed party
member. That is the same class of error `vault-import.mjs:276-278` was written to
prevent for the PC himself.

### 6.3 The Codex re-derives what the Vault already declares

`vault-import.mjs:234-260` infers class and species statistically (`mostStated`), and
the comment at `vault-import.mjs:292-305` records a real casualty: Runewillow's own note
prefix says *Bard*, fifteen sessions of party text say *Wizard*, so the prefix is
stripped. Meanwhile `campaign.json:12-13` states flatly `"cls": "Bladesinger Wizard"` —
authored, authoritative, and never read. Same for `"Paladin of the Hearth"`
(`campaign.json:8`), which the Codex's twelve-item `CLASSES` list
(`vault-import.mjs:234-235`) can only ever flatten to `Paladin`.

### 6.4 `setting` is blank on both sides

`vault-import.mjs:450-453`: *"Left blank: the Vault has no field for it, and there is no
sentence in sixteen sessions that says 'the setting is X'."* That is correct about
`SESSIONS`, but `campaign.json:52-58` does name the five sovereign nations (Tostra,
Cauberos, Callestus, The Northern Alliance, Vaan) and `campaign.json:71-74` defines what
an Asterum is. The world *is* declared; it is declared in the file the importer does not
open.

### 6.5 The word "Codex" means two different things

The Vault's built page declares its own `const CODEX=` alongside `const CAMPAIGN=`
(both present in `C:\Users\marcu\Documents\Powerhouse\projects\dwk-vault\index.html`;
the re-serialisation routine writes all three at ~byte 991,336). Inside the Vault,
"the Codex" is an in-archive glossary — `dwk-vault-sources\README.md:52-53` lists it
alongside "session text" and "the open questions" as things sitting behind Edit. It is
not the Codex app. Any future integration that keys on the word will collide.

### 6.6 Contradiction of narrative, not of data

`vault-boundary.md:18-20` describes the Vault as *"Audio, transcript and AI chronicle
per session, assembled into **one page per NPC, faction, quest and open thread**"*. The
shipped Vault is **session-first**, not entity-first: `SCHEMA.md:46` writes one JSON file
per session, and entities are an array inside each session
(`SCHEMA.md:68`). Per-name assembly exists only as `tieIndex()`
(`dwk-vault-sources\README.md:33-35`) and per-character pages. The boundary document
describes an architecture one step ahead of what is in the repository.

Related: `vault-boundary.md:3-4` says the Vault is "at Gate 1" and that Cowork is
building it (`00-status.md:14`). The repository as it stands — 20 sessions, 43.6 hours
of audio, seven verification suites, a shipped PWA — is well past a Gate 1 sketch, and
nothing in the Codex's docs has been updated to reflect that.

---

## 7. Shortest list of things worth doing

1. **Repoint the default.** `vault-import.mjs:65` reads a stale 16-session copy.
   Whatever the right default is, it should not be a directory that silently loses four
   sessions.
2. **Read `campaign.json`.** It is the Vault's own stated override
   (`campaign.json:2`) and it fixes §6.1, §6.2, §6.3 and §6.4 in one move — including
   the `status` field that currently lets a dead character into the party.
3. **Decide which document is the contract.** `vault-boundary.md:6` says it is;
   `vault-import.mjs:11-32` has already superseded it in practice. One of the two should
   be amended so the next reader is not told two things.
4. **Carry at least one timecode.** 354 exist; zero are used; `vault-boundary.md:94`
   calls an uncited fact "a rumour".
5. **Rebuild the Vault's committed sources.** `vault-data.js` (16) is behind
   `index.html` (20).
6. **Add a licence** before anything Vault-derived leaves this machine (§4.1).

---

*Sources opened for this note: `dwk-vault/{README.md, index.html, manifest.webmanifest,
guide.html, check.html, .gitignore}`, `dwk-vault/dwk-vault-sources/{README.md,
SCHEMA.md, campaign.json, kinds.json, sync.js, audio.js, vault-data.js}`,
`the-codex/{docs/external/vault-boundary.md, scripts/vault-import.mjs,
docs/plans/codex-v1/00-status.md, package.json, src/lib/campaign-show.test.ts,
acquisition/THE-ACQUISITION.html}`, plus the GitHub repo API record.*
