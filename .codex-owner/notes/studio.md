# The Studio — what the owner has written down about turning this into a business

Research note. Written 2026-09-11. Read-only pass.
Every statement cites a file that was opened. Where no number exists, this note says
"none found" rather than supplying one.

---

## 0. What "The Studio" turns out to be — and the naming trap

Searching for "The Studio" finds **two different things that share a name**, and keeping
them apart is the precondition for everything below.

**(a) "Ash & Archive: The Studio"** — a DM-facing training and world-building SaaS, with
a built landing page, a written roadmap, a pricing table, and a formal evaluation that
told the owner not to build it. Circa Feb–May 2026.

**(b) "the studio" as a verb inside the Codex** — a law about *when* the product is
allowed to be ambitious, not a product:

> "At the table the product is a fast, quiet instrument. Between sessions it is a
> studio. That split already exists in the code as PLAY and PREP; it becomes the
> governing law of the company."
> — `C:\Users\marcu\Documents\Powerhouse\projects\the-codex\acquisition\THE-ACQUISITION.html:~221` (§VII, Law two)

Sense (a) is the business plan. Sense (b) is the Codex's operating philosophy. The
acquisition memo of 2026-09-11 fuses them by demoting (a) to second place behind the
Codex — see §4.

---

## 1. What The Studio is, in the owner's own words

### 1.1 The product identity

> `<title>Ash & Archive: The Studio | Where Dungeon Masters Are Forged</title>`
> — `C:\Users\marcu\Documents\Powerhouse\extreme-skills-package\React Forge\index.html:16`

> `<meta name="description" content="Ash & Archive: The Studio - Elite DM training and world-building. Where Dungeon Masters are forged." />`
> — `...\React Forge\index.html:7`

> "**Ash & Archive: The Studio** is a revolutionary D&D DM training and world-building
> application designed to transform novice Dungeon Masters into elite-level storytellers
> through professional training methodologies borrowed from the world's finest drama
> schools."
> — `C:\Users\marcu\Documents\Powerhouse\extreme-skills-package\React Forge\README.md:28`

> "**Ash** — The forge, fire, creation, transformation
> **Archive** — The canon, the lore, accumulated wisdom
> **The Studio** — A professional creative space where masters train and create"
> — `...\React Forge\README.md:32-34`

### 1.2 The commercial thesis

> "**Wedge:** Ash & Archive is the first serious **DM Operating System** that combines
> elite world/campaign tooling with **provable skill progression**. Competing tools help
> you store notes; Ash & Archive helps you **perform better at the table** and prove it."
> — `C:\Users\marcu\Documents\Powerhouse\extreme-skills-package\React Forge Instructions\Session\Ash & Archive- The Studio — Authoritative Feature Roadmap_Build Plan idea #1.txt:5`

> "For ambitious Dungeon Masters and tabletop organizations, Ash & Archive is the
> secure, performance-first, accessibility-compliant platform that turns campaign prep
> and DM craft into measurable mastery through canon governance + rigorous assessment."
> — same file, `:8`

> "Your strongest positioning is 'The Operating System for Elite Dungeon Masters'—not
> just tools, but a complete performance cockpit that improves session quality, prep
> speed, and creative confidence."
> — `...\React Forge Instructions\Session\Strategic Product Direction to justify $49+mo and much more.txt:2`

Moat, as claimed:

> "**Kernel 1: Canon Governance Engine** (graph + consistency + lineage) · **Kernel 2:
> Assessment Engine** (evidence + rubric + grading + remediation) … These two kernels
> are expensive to replicate and power every pillar."
> — Roadmap txt `:20-23`

### 1.3 The four pillars

`...\React Forge\README.md:40-53` — World Building Engine; Campaign Building; DM Training
Academy ("techniques from RADA, Juilliard, and Carnegie Mellon adapted for Dungeon
Masters", `:47`); The Toy Method ("reusable building blocks (Toys) for NPCs, locations,
encounters, and lore", `:50`); World Anvil Integration ("Seamless two-way sync", `:53`).

### 1.4 The build state

> "**Phase 1 COMPLETE:** Landing page with 11 sections, responsive design
> (360px-1440px+), WCAG 2.2 AA accessibility, animation system
> **Phases 2-5 NOT BUILT:** Authentication/dashboard, world building engine, training
> academy, 'Toy Method' system with community sharing and AI assistance"
> — `C:\Users\marcu\Documents\Powerhouse\notebooklm-upload\04-ASH-AND-ARCHIVE-EVALUATION.md:8-9`

Confirmed on disk: `...\React Forge\src\components\landing\` contains exactly eleven
section components (Hero, PainPoints, FourPillars, TrainingPhilosophy,
WorldAnvilIntegration, Transformation, Pricing, Testimonials, FAQ, FinalCTA, Footer)
plus `InteractiveCTA`. A `src/components/dashboard/` tree exists but every panel imports
from `data/mockDashboardData` (`CampaignHub.tsx:3`, `SessionNexus/index.tsx:4`,
`TheForge.tsx:1`, `ToyDock.tsx:3`, `WorldPulse.tsx:2`) — it is a mock, not a product.

License, per the evaluation: `"**License:** Proprietary (all rights reserved)"`
(`04-ASH-AND-ARCHIVE-EVALUATION.md:12`).

---

## 2. What it plans to sell, to whom, at what price

**Prices exist. Four separate, mutually inconsistent schemes are written down.**

### Scheme A — the shipped landing page (three monthly tiers)

`C:\Users\marcu\Documents\Powerhouse\extreme-skills-package\React Forge\src\components\landing\Pricing.tsx`

| Tier | Price | Positioning | Cite |
|---|---:|---|---|
| **Ember** | **$9/month** | "Perfect for new DMs ready to start their journey." | `Pricing.tsx:5-9` |
| **Forge** (recommended) | **$24/month** | "For serious DMs committed to excellence." | `Pricing.tsx:31-35,53` |
| **Archive** | **$49/month** | "For professional DMs and worldbuilding masters." | `Pricing.tsx:56-60` |

All three CTAs read `'Start Free Trial'` (`Pricing.tsx:27,52,77`). Archive includes
"1-on-1 coaching sessions", "White-label exports", "API access", "Founding member
status" (`Pricing.tsx:67-74`) — i.e. human labour and an API, neither of which exists.

### Scheme B — the authoritative roadmap (three tiers, 3–8× higher)

`...\Session\Ash & Archive- The Studio — Authoritative Feature Roadmap_Build Plan idea #1.txt:435-439`

| Tier | Price | Who it is for |
|---|---:|---|
| Solo Pro | **$49/mo** | paid GMs, serious hobbyists |
| Studio Team | **$149/mo** (up to 5) | co-DM teams, creator studios |
| Academy/Org | **$399+/mo** | schools, guilds, org programs |

Justified at `:10-16` ("Why a pro DM pays $49+/month" — Time / Quality / Skill /
Credibility / Reliability ROI) and at `:247` ("## 6) INNOVATION LAYER (Feels worth
$49+/mo)") in the Delivery Blueprint v2.

### Scheme C — the evaluation's validation price

> "Marcus validates demand by pre-selling founding member spots to DMs ($9.99/month)"
> — `notebooklm-upload\04-ASH-AND-ARCHIVE-EVALUATION.md:99`; repeated at `:143`
> ("pre-sell 50 founding member spots at $9.99/month")

### Scheme D — the acquisition memo, 2026-09-11 (a different business entirely)

`C:\Users\marcu\Documents\Powerhouse\projects\the-codex\acquisition\THE-ACQUISITION.html`

| Line item | Price | Cite |
|---|---:|---|
| **Codex licence** | **$39 once** | `THE-ACQUISITION.html:772` |
| **Vault** | **$36/yr per table** | `THE-ACQUISITION.html:773` |

with the reasoning stated explicitly:

> "**Two: we charge once for the thing that costs nothing to run, and monthly only for
> the thing with a server bill.** The Codex has no backend … Charging rent for that
> would be dishonest and, per the Foundry evidence, commercially wrong. So the Codex is
> bought, once, like a book … The Vault genuinely costs money to run — Supabase, audio
> storage, bandwidth — so the Vault is the only thing with a subscription"
> — `THE-ACQUISITION.html:762`

And the customer changes:

> "**One: we sell to the player, not the GM.** Every incumbent monetises the Dungeon
> Master … We are the only product in the quadrant whose customer is the player."
> — `THE-ACQUISITION.html:761`

### Who, summarised

- Landing page + roadmap: **Dungeon Masters** — new (Ember), serious (Forge),
  professional (Archive); plus teams and "schools, guilds, org programs" (Roadmap
  `:439`).
- Acquisition memo: **the player, not the DM** (`THE-ACQUISITION.html:761`).

These are not the same customer.

---

## 3. Revenue and user numbers actually recorded

### 3.1 Actual revenue: **zero, stated outright**

> "you cannot double a profit that is currently zero. **Both assets are free, neither has
> ever taken a payment**, and any deck that draws you a 2× on this P&L is charting
> nothing."
> — `THE-ACQUISITION.html:747`

### 3.2 Actual users: **none found**

No file opened records a signup, an install count, a beta user, a paying customer, an
MRR or an ARR for Ash & Archive, the Codex or the Vault. The only user-side count
anywhere is repo social proof: `"**Repo Stats:** 1 star, 0 forks, 4 commits — very early
stage"` (`04-ASH-AND-ARCHIVE-EVALUATION.md:11`). The Vault's GitHub record
independently returns `"stargazers_count": 1`. **Real user figures: none found.**

### 3.3 Targets and models (labelled as such, not as results)

From `THE-ACQUISITION.html:772-782` — presented as **"A model, not a forecast"**
(`:782`):

| | Year 1 | Year 2 |
|---|---:|---:|
| Codex licences @ $39 once | 1,000 | 2,400 |
| Vault tables @ $36/yr | 150 | 500 |
| Licence revenue | **$39,000** | **$93,600** |
| Subscription revenue | **$5,400** | **$18,000** |
| **Total** | **$44,400** | **$111,600** |
| Marginal cost per licence | ≈ $0 | ≈ $0 |

The memo disarms its own table in the next paragraph: *"1,000 licences is a target I am
choosing to be held to, not a projection from conversion data we do not have … I am not
going to pretend a view-to-licence rate I cannot measure."* (`:782`).

From `MASTER-STRATEGY.md:220-227`, a week-by-week revenue trajectory across four
projects. Ash & Archive's column is **$0 through week 16** and **$50–200 at week 24** —
the smallest number in the table, by design.

From the Roadmap txt: a retention target `"90-day retention (Solo Pro) | >= 65%"`
(`:458`) and a kill criterion `"**Unit economics fail:** gross margin < 70% at 500 paid
seats."` (`:475`). 500 seats is a threshold, not a count.

### 3.4 Market figures quoted (external, not owned)

`04-ASH-AND-ARCHIVE-EVALUATION.md:24-28` — US/Canada hobby game revenue ~$2.9 bn (2023);
1,200+ TTRPG Kickstarters raising $85 m+ in 2023; 44% of players use VTTs; 27% demand
AI-enhanced NPCs.

`THE-ACQUISITION.html:753` — D&D Beyond's top tier is **$5.99/mo**, entry **$2.99**, and
the memo calls this *"the actual ceiling"*: *"The category leader, owned by Hasbro, with
30M accounts, cannot charge more than coffee money."* Companion figures in §XI: D&D as a
business is $270–350 M/yr; the median Foundry user owns **$0** of premium content; **no
TTRPG digital tool has ever raised $1 M** in crowdfunding.

`THE-ACQUISITION.html:543` — Everweave: ~860,000 Android installs, 2.12/5 and falling.

`THE-ACQUISITION.html:609` — "Roughly 8 million cumulative YouTube views" on
being-bad-at-roleplay content, explicitly discounted at `:782` ("views are not people").

---

## 4. What `acquisition/THE-ACQUISITION.html` is, and what it claims

**What it is.** An 80 KB, self-contained, print-to-A4 HTML document dated today,
written in the first person as an **acquisition memorandum from a hypothetical buyer who
has just bought both repositories**:

> "Acquisition memorandum · 11 September 2026 · Confidential to the buyer … What I would
> actually do, having bought both" — `THE-ACQUISITION.html:~403-409` (masthead)

> "I have read every line of the two things I just bought, and I am not going to open
> with what they could be. I am going to open with what they *are* — including the part
> where the single feature the product was staked on has never been written, and the part
> where the last serious evaluation of this venture scored it 17 out of 35 and said no."
> — `THE-ACQUISITION.html:410`

It is **not just a document** — it ships a working implementation. §VIII embeds
`acquisition/sigils.js` (9,054 bytes) and renders the nine Spell Slot Sigils live in the
page, as a rebuttal to its own criticism:

> "The Spell Slot Sigils have been specified since the beginning and have never existed.
> Here they are, working, to the letter of the spec" — `THE-ACQUISITION.html:652`

**Structure:** I Assets · II What is real · III What is vapor · IV The critique ·
V The Everweave question · VI The position · VII The thesis (three laws) · VIII The proof
(live sigils) · IX What ships (3 releases + "Beyond · the studio") · X The bars ·
XI The number · XII Verdict.

**Its central claim about the two repos:**

> "The Codex knows everything about one character and forgets the campaign. The Vault
> remembers the campaign and knows nothing about the character. They were built by the
> same hand for the same table and **there is not one line of integration between them.**
> That gap is not a defect — it is the product, and nobody has built it."
> — `THE-ACQUISITION.html:523`

**Its verdict:** "Buy it. Then finish the one thing you wrote down and never built."
(§XII, `:~797`), overturning the 17/35 score on the grounds that *"That was a correct
assessment of a landing page. It is not an assessment of what exists now."*
(`THE-ACQUISITION.html:798`).

### Spot-check of its self-reported metrics

The memo says *"Every figure on this page is traceable to a file in the two
repositories"* (`:~365` in rendered order). Checked against the working tree:

| Claim | Verified? |
|---|---|
| "107,584 lines in src/" (`:~416`) | **Exact.** `find src -name '*.ts' -o -name '*.tsx' \| xargs wc -l` → `107584 total` |
| "551 `useState`, no store" (`:~497`) | **Exact.** 551 occurrences in `src/` |
| "1,010,039 bytes · single file" for the Vault (`:447`) | **Exact.** `dwk-vault\index.html` is 1,010,039 bytes |
| "18 backdrop-blur violations" (`:~500`) | **Off by one.** 19 occurrences in `src/` |
| "142 components" (`:~417`) | **Off by two.** 140 `.tsx` under `src/components/` |
| "No `SpellSlotSigils.tsx`" (`:~496`) | **Confirmed.** No match anywhere in `src/` |
| "README describes a dead design system … still says 'Arcane Glass'" (`:~502`) | **Confirmed.** `the-codex\README.md:326` — `Custom dark fantasy aesthetic ("Arcane Glass"):` |
| **"52MB binary committed to the repo — cloudflared.exe"** (`:496`) | **FALSE.** `git ls-files cloudflared.exe` → *"did not match any file(s) known to git"*; `git check-ignore -v` → `.gitignore:13:cloudflared.exe`; `git log --all --diff-filter=A -- '*cloudflared*'` returns nothing. The file is 54,116,816 bytes on disk and **has never been in version control.** The memo grades this "Critical" and Release 1 budgets four weeks partly to "[get] cloudflared.exe out of history" (`:~259`) — work that does not need doing. |

So the document is unusually checkable and mostly right, and it contains at least one
Critical finding that does not survive the check it invites.

---

## 5. How the Codex and the Vault fit into The Studio

### As the Studio documents have it (Feb–May 2026): the Codex *is* Ash & Archive

`C:\Users\marcu\Documents\Powerhouse\ASH_AND_ARCHIVE_CODEX_BRIEF.md` is a design brief
for "**Ash & Archive Codex**" (`:25`) whose candidate source tree is named as:

> "- `C:\Users\marcu\Documents\Ash & Archive`
> - `C:\Users\marcu\Documents\Powerhouse\projects\the-codex`" — `:29-30`

with status:

> "**Status:** Existing build that the owner has classified as 'trash — needs to become
> multi-figure worthy'" — `ASH_AND_ARCHIVE_CODEX_BRIEF.md:26`

The Codex's own files still carry that lineage: `the-codex\CLAUDE-DESIGN-PROMPT.md:7`
calls the app *"the flagship product of the Ash & Archive platform"*, `:333` specifies
the About screen as *"The Codex v3.0 — Part of Ash & Archive"*, and
`the-codex\STACK_DELTA.md:44` reserves `src/assets/brand/` for *"The Codex wordmark SVG,
Ash & Archive identity"*. **The Vault does not appear in any Studio document** —
`ASH_AND_ARCHIVE_CODEX_BRIEF.md`, `04-ASH-AND-ARCHIVE-EVALUATION.md`, the Roadmap txt and
the Delivery Blueprint contain no mention of it. The Vault post-dates them (created
2026-08-17 per its GitHub record).

### As the acquisition memo has it (2026-09-11): the Studio is demoted to product two

> "**Ash & Archive becomes the house, not a fifth project.** The studio's landing page is
> built and Phases 2–5 never were. Good. They should not be — the DM Training Academy,
> the Toy Method and the world-building engine are the *second* product, sold to the
> person who already bought the first one. The Codex proved the training thesis works on
> a player. Ash & Archive sells the same thesis to the DM, on top of a codebase that
> already shipped, with a customer list that already exists. **That is the sequence that
> turns 17/35 into a business; building the studio first is the sequence that scored
> 17/35.**"
> — `THE-ACQUISITION.html:715-716`

Roles under that plan (`THE-ACQUISITION.html:~256-265`, §IX):

- **Codex** — "owns the week and the table"; sold once at $39; the performance layer
  (Persona, Dialogue Bank, Accent Coach, improv drills) becomes the front of the product
  in Release 3.
- **Vault** — "owns what the table leaves behind"; the only subscription ($36/yr per
  table); and its append-only log is repurposed as the Codex's session spine in Release
  2 — *"Undo is a compensating row, exactly as the Vault already does it"*.
- **Ash & Archive** — product two, sold to the DM, after the player has already paid.

---

## 6. Where the three contradict each other

Each contradiction below cites both sides.

### 6.1 Price: four schemes, 0×–16× apart

| Source | Model |
|---|---|
| `React Forge\src\components\landing\Pricing.tsx:5-9,31-35,56-60` | $9 / $24 / $49 **per month** |
| Roadmap txt `:435-439` | $49 / $149 / $399+ **per month** |
| `04-ASH-AND-ARCHIVE-EVALUATION.md:99` | $9.99/month founding-member pre-sale |
| `MASTER-STRATEGY.md:204` | "Ember tier ($9/mo) live" as the Phase-4 exit criterion |
| `THE-ACQUISITION.html:762,772-773` | **$39 once** (Codex) + $36/yr per table (Vault); a subscription on the Codex would be *"dishonest"* |

The landing page's $49 tier is the roadmap's *entry* tier. And the memo does not merely
price differently — it argues the monthly model itself is wrong for the flagship. A
live page currently offers three monthly plans the current strategy says should not
exist.

### 6.2 Customer: the DM versus the player

- Studio: `Roadmap txt:8` — "For ambitious Dungeon Masters and tabletop organizations".
- Memo: `THE-ACQUISITION.html:761` — "**we sell to the player, not the GM.** Every
  incumbent monetises the Dungeon Master … We are the only product in the quadrant whose
  customer is the player."

The Codex code sides with the memo without having been asked to: the entire campaign
import is scoped to one PC, defaulting to Nix (`the-codex\scripts\vault-import.mjs:68`),
and deliberately removes the player's own character from the party so he is not offered a
conversation with himself (`vault-import.mjs:276-284`). There is no DM-side surface in
the Codex at all.

### 6.3 "The Studio's landing page is built" versus what the landing page says

`THE-ACQUISITION.html:716` treats the built landing page as an asset. But that page:

- carries **five fabricated testimonials with invented named people** — "Marcus Chen,
  Forever DM, 15 years"; "Sarah Blackwood, Campaign Writer"; "James Thornton"; "Elena
  Rodriguez"; "David Kim, Professional DM" — including the claim *"My prep time dropped
  60% and session quality went up"* (`React Forge\src\components\landing\Testimonials.tsx:3-38`),
  for a product with zero users (§3.2);
- offers `'Start Free Trial'` on all three tiers (`Pricing.tsx:27,52,77`) for phases
  `04-ASH-AND-ARCHIVE-EVALUATION.md:9` records as **NOT BUILT**;
- sells "World Anvil integration" (`Pricing.tsx:45`) and "API access" (`Pricing.tsx:71`)
  that do not exist.

Against the Codex's own stated house style: *"The honest version of 'it's fine' is a red
row with the evidence next to it, not a green row I talked myself into."*
(`AT-THE-TABLE.md`, quoted at `THE-ACQUISITION.html:~438`), and the memo's own rule
that where a claim is a vendor statement rather than a measurement, the page must say so
(`:~369`). The Studio's shipped marketing violates the standard the Codex's own
documents make the point of the company.

### 6.4 "We never lead with AI" versus what the Studio sells

- Memo, §VII: *"**We never lead with AI. Not once.** The ENNIEs ban it, DriveThruRPG
  bans it, Kickstarter requires disclosure … We sell the outcome — you will be good at
  the table on Friday — and the machinery stays where machinery belongs: under the hood,
  offline-capable, optional, and never named in the pitch."*
  (`THE-ACQUISITION.html:~230-233`), with a hard bar of **"Times 'AI' appears in
  customer-facing copy: 0"** (`:~291-292`).
- Studio: Phase 5 is *"'Toy Method' system with community sharing and **AI assistance**"*
  (`04-ASH-AND-ARCHIVE-EVALUATION.md:9`), and the Roadmap's Phase 2 features include an
  *"AI copilot"*. The evaluation's own competitor list is an AI-tool list
  (`04-ASH-AND-ARCHIVE-EVALUATION.md:31-39`) and it positions Ash & Archive *within*
  that set.

### 6.5 The 17/35 verdict: overturned on a premise, and the premise is only half-dead

- Evaluation: **17/35, below the >20 GO threshold**
  (`04-ASH-AND-ARCHIVE-EVALUATION.md:52-60`), scoring Build Speed 2/5 because *"the
  actual PRODUCT (Phases 2-5) hasn't been built … this could take 6-12 months before
  there's anything to sell"* (`:66`), and Revenue Clarity 2/5 because *"How does it make
  money? SaaS subscription? What price? $9.99/month? $19.99/month?"* (`:68`).
- Memo: *"That premise is now factually obsolete — the product shipped and is installed
  on a phone."* (`THE-ACQUISITION.html:~157`), and *"That was a correct assessment of a
  landing page. It is not an assessment of what exists now."* (`:798`).

The rebuttal is valid for **the Codex**, which did ship. It is **not** valid for Ash &
Archive, whose Phases 2–5 are still unbuilt — the memo concedes exactly this two sections
earlier (*"The studio's landing page is built and Phases 2–5 never were"*, `:716`). So
the 17/35 is overturned using a different product's evidence than the one it scored.

### 6.6 Sequencing: Ash & Archive is last, then first, then second

- `MASTER-STRATEGY.md:21` — `Phase 4: ASH & ARCHIVE (Week 17+) → Passion project with funding`;
  `:168-169` — *"**Why last:** Most work needed, niche audience, but the one you love
  most."* Prerequisite: *"Revenue from Northwynd + GradeGuard covering your costs"*
  (`:172-174`). Phase-4 recommendation is to build the **Campaign Builder** first
  (`MASTER-STRATEGY.md:185`).
- `04-ASH-AND-ARCHIVE-EVALUATION.md:91` — *"As Atlas Holdings' FIRST revenue stream: NO
  (Score: 17/35)"*; `:103-105` — a passion project that *"should not be funded by
  Atlas"*.
- `ASH_AND_ARCHIVE_CODEX_BRIEF.md:3` — *"Status: Live engagement. No rehearsal. The bar
  is multi-figure professional."* — i.e. the thing being treated as first.
- `THE-ACQUISITION.html:716` — product **two**, after the Codex.

Four documents, four positions on where it sits in the queue. Note also that
`MASTER-STRATEGY.md` Phase 4 Step 2 prescribes *"Add Supabase (or similar) for auth +
database … Add Zustand for state management"* (`:177-182`) — a backend and a store — while
the acquisition memo's entire margin argument rests on the Codex having **no backend**
(`THE-ACQUISITION.html:762`) and its Sigil post-mortem on *"Sigil needed servers…; we
have no backend and a marginal cost per user of approximately zero"* (`:~172`).

### 6.7 "There is not one line of integration between them" — false as written

- Memo: *"They were built by the same hand for the same table and **there is not one line
  of integration between them.**"* — `THE-ACQUISITION.html:523`
- Codex: `scripts\vault-import.mjs` is 499 lines whose whole purpose is to read the
  Vault's `index.html` and emit a Codex campaign (`vault-import.mjs:1-48`), dated
  2026-09-09 (`:71`) — two days before the memo. `docs\external\vault-boundary.md` is a
  144-line signed contract between the two products. `src\lib\campaign-show.test.ts:35`
  holds `'vault-driftwood-kin'` as a test fixture.

The defensible version of the claim is *"the integration is one hand-run script that is
in no npm script and is invoked by nobody"* — `package.json:6-13` lists `dev`, `build`,
`preview`, `test`, `test:watch`, `budget` and nothing else. The memo overstates the gap
it is selling.

### 6.8 The Vault is the plan's spine and is absent from the plan's documents

`THE-ACQUISITION.html:~262` makes the Vault's append-only log the Codex's session spine
in Release 2 and the answer to the missing-undo defect. Yet no Studio document mentions
the Vault at all (§5), and `MASTER-STRATEGY.md:220-227` has no column for it. The Studio
paperwork describes a business in which the load-bearing asset does not appear.

### 6.9 Where the Codex's own docs contradict the plan built on them

`docs\plans\codex-v1\00-status.md:27-29` still marks `campaign.notableNPCs`,
`partyMembers`, `currentQuest`, `sessionNotes` **FROZEN**, and `:34-36` places the
Vault→Codex feed in post-V1. `scripts\vault-import.mjs:11-15` overrules that in writing
(*"Deferring to a system nobody ever wired up is how you end up with an Engage card that
offers Marcus nobody to talk to"*), and `THE-ACQUISITION.html` schedules the integration
as Release 2 of 3. Neither `00-status.md` nor `vault-boundary.md` has been amended. A
reader arriving at the Codex's plan is still told the opposite of the current strategy.

---

## 7. Money and users, one line each

- **Revenue to date:** $0. Stated: `THE-ACQUISITION.html:747`.
- **Paying customers to date:** none. *"neither has ever taken a payment"*, same line.
- **Users / installs / signups:** **none found** in any file opened. The only real
  audience number on record is 1 GitHub star on each repo
  (`04-ASH-AND-ARCHIVE-EVALUATION.md:11`; GitHub API for `DOSENFT/dwk-vault`).
- **Prices named:** $9 / $24 / $49 per month (`Pricing.tsx`); $49 / $149 / $399+ per
  month (Roadmap `:435-439`); $9.99/month founding member
  (`04-ASH-AND-ARCHIVE-EVALUATION.md:99`); $39 once + $36/yr per table
  (`THE-ACQUISITION.html:772-773`).
- **Projections (labelled as models, not results):** $44,400 year one / $111,600 year two
  (`THE-ACQUISITION.html:772-782`); $50–200/month at week 24 (`MASTER-STRATEGY.md:225`).

---

*Sources opened for this note: `the-codex\acquisition\THE-ACQUISITION.html`,
`the-codex\{README.md, index.html, package.json, CLAUDE-DESIGN-PROMPT.md,
STACK_DELTA.md, docs\plans\codex-v1\00-status.md, docs\external\vault-boundary.md,
scripts\vault-import.mjs, src\lib\campaign-show.test.ts}`,
`Powerhouse\{ASH_AND_ARCHIVE_CODEX_BRIEF.md, MASTER-STRATEGY.md,
notebooklm-upload\04-ASH-AND-ARCHIVE-EVALUATION.md}`,
`Powerhouse\extreme-skills-package\React Forge\{index.html, README.md,
src\components\landing\{Pricing.tsx, Testimonials.tsx, Hero.tsx, Footer.tsx}}`,
`Powerhouse\extreme-skills-package\React Forge Instructions\Session\{Ash & Archive- The
Studio — Authoritative Feature Roadmap_Build Plan idea #1.txt, Ash & Archive- The Studio
— Product Delivery Blueprint v2.txt, Strategic Product Direction to justify $49+mo and
much more.txt}`, plus git metadata and the GitHub repo API record.*
