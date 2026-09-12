# ref/SOURCES.md — capture manifest

All captures made with Playwright/Chromium on **2026-09-11**.
Desktop captures are 1280×800 (some 1280×1000); files ending `-mobile` are 390×844.
Everything here is a **public marketing page, public store listing, public pricing page,
public support/help article, or public blog post**. Nothing behind a login was captured;
where a product's real working UI is login-gated, that is stated in the "job illustrated"
column and the marketing/store image stands in for it. That substitution is the labelled
source, not a claim about the live product.

Files that 404'd, hit a Cloudflare bot wall, or redirected to an unrelated page were
deleted rather than kept as evidence. Those failures are listed at the bottom.

| File | Exact URL | Fetched | Job it illustrates | Source type |
|---|---|---|---|---|
| `dndbeyond-home.png` | https://www.dndbeyond.com/ | 2026-09-11 | D&D Beyond's own framing of the "official digital toolset" job | Official marketing page |
| `dndbeyond-player-app-page.png` | https://www.dndbeyond.com/player-app | 2026-09-11 | The best version of the **player-at-the-table** job DDB markets today: "Roll dice, create & manage characters… from the palm of your hand". Note: no in-person, roleplay, voice or improv copy anywhere on this page | Official marketing page |
| `dndbeyond-appstore-listing.png` | https://apps.apple.com/us/app/d-d-beyond-player-tools/id1501810129 | 2026-09-11 | Apple rating + the app's own feature list (character sheet, dice roller, offline library) | Official store listing |
| `dndbeyond-appstore-listing-mobile.png` | https://apps.apple.com/us/app/d-d-beyond-player-tools/id1501810129 | 2026-09-11 | Same, at the phone viewport that actually matters at a table | Official store listing |
| `dndbeyond-playstore-listing.png` | https://play.google.com/store/apps/details?id=com.fandom.playercompanion&hl=en_US&gl=US | 2026-09-11 | Google Play rating (4.6★, 130K reviews, 5M+ downloads) and full description | Official store listing |
| `dndbeyond-subscribe-pricing.png` | https://www.dndbeyond.com/en/subscribe | 2026-09-11 | Hero/Master subscription pricing and the Master-tier content-sharing pitch (DM buys, players consume) | Official pricing page |
| `dndbeyond-support-pricing.png` | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747225116820-Subscriptions-Pricing | 2026-09-11 | The exact price table: Hero $2.99/$14.99/$25.99, Master $5.99/$29.99/$54.99 | Official support article |
| `sigil-sunset-faq.png` | https://dndbeyond-support.wizards.com/hc/en-us/articles/42550438974868-Sigil-Sunset-FAQ | 2026-09-11 | Primary source for the Sigil cancellation — WotC's own words on why the 3D VTT died | Official support article |
| `roll20-home.png` | https://roll20.net/ | 2026-09-11 | Roll20's framing of the online-VTT job it actually competes on | Official marketing page |
| `roll20-retiring-mobile-app.png` | https://blog.roll20.net/posts/were-retiring-the-roll20-mobile-app-to-build-something-better-heres-why/ | 2026-09-11 | The single most important competitive fact in this file: Roll20 killed its companion app (Feb 18 2026) and said "the current experience sucks" | Official company blog |
| `roll20-characters-mobile.png` | https://roll20.net/characters | 2026-09-11 | Roll20's replacement for the app — a mobile *browser* sheet | Official marketing page |
| `roll20-characters-mobile-mobile.png` | https://roll20.net/characters | 2026-09-11 | Same at 390×844: what a Roll20 player now gets at a physical table | Official marketing page |
| `foundryvtt-home.png` | https://foundryvtt.com/ | 2026-09-11 | Foundry's positioning: "A Self-Hosted & Modern Roleplaying Platform" — desktop/online only | Official marketing page |
| `foundryvtt-purchase.png` | https://foundryvtt.com/purchase/ | 2026-09-11 | The $50 one-time-purchase, perpetual-licence model (the anti-subscription datapoint) | Official pricing page |
| `foundryvtt-faq-licensing.png` | https://foundryvtt.com/article/faq/ | 2026-09-11 | "only one person (the host) needs to purchase a Foundry license for their group" — DM-concentration evidence | Official docs |
| `worldanvil-home.png` | https://www.worldanvil.com/ | 2026-09-11 | World Anvil's worldbuilding-wiki job | Official marketing page |
| `worldanvil-pricing.png` | https://www.worldanvil.com/pricing | 2026-09-11 | Master $4.50/mo, Grandmaster $8.25/mo, Sage $25.00/mo (billed annually, excl. VAT) | Official pricing page |
| `demiplane-home.png` | https://app.demiplane.com/home | 2026-09-11 | Demiplane Nexus positioning (non-D&D licensed systems: Pathfinder, Vampire, Daggerheart etc.) | Official marketing page |
| `demiplane-pricing-blog.png` | https://www.demiplane.com/blog/subscription-benefits | 2026-09-11 | "<$5.00 a month" + share content with up to 24 people — again one payer, many riders | Official company blog |
| `everweave-playstore.png` | https://play.google.com/store/apps/details?id=com.endgame.everweave | 2026-09-11 | **2.1★ / 1.37K reviews / 500K+ downloads** — the AI-DM app with scale and a collapsing rating | Official store listing |
| `everweave-appstore.png` | https://apps.apple.com/us/app/everweave/id6747261740 | 2026-09-11 | Apple side of the same app (4.3★, 8.5K ratings) — the platform split matters | Official store listing |
| `everweave-appstore-mobile.png` | https://apps.apple.com/us/app/everweave/id6747261740 | 2026-09-11 | Everweave's screenshots at phone size: a solo text RPG, not a table companion | Official store listing |
| `fightclub5e-appstore.png` | https://apps.apple.com/us/app/fight-club-5th-edition/id901057473 | 2026-09-11 | The long-tail winner nobody names: 4.7★, 3.9K ratings, offline, one-time $2.99 | Official store listing |
| `fifthedition-charsheet-appstore.png` | https://apps.apple.com/us/app/fifth-edition-character-sheet/id967650851 | 2026-09-11 | Second long-tail offline sheet, 4.3K ratings, one-time ~$2.99 | Official store listing |
| `fifthedition-charsheet-appstore-mobile.png` | https://apps.apple.com/us/app/fifth-edition-character-sheet/id967650851 | 2026-09-11 | Phone view of the same | Official store listing |
| `characterkeep-playstore.png` | https://play.google.com/store/apps/details?id=com.putnoczki.CharacterKeep&hl=en_US | 2026-09-11 | "No data collected", offline, lifetime unlock — the no-account/offline niche, 4.2★ / 2.33K reviews / 100K+ downloads | Official store listing |
| `owlbear-rodeo-home.png` | https://www.owlbear.rodeo/ | 2026-09-11 | The indie VTT that competes on simplicity | Official marketing page |
| `owlbear-rodeo-pricing.png` | https://www.owlbear.rodeo/pricing | 2026-09-11 | Free / $3.33 / $6.66 per month — and the tier copy literally says "Perfect for DMs…", explicit DM-pays design | Official pricing page |
| `legendkeeper-pricing.png` | https://www.legendkeeper.com/pricing/ | 2026-09-11 | Indie campaign-wiki pricing: Pro $7.50/mo annual ($9 monthly) | Official pricing page |
| `alchemyrpg-home.png` | https://alchemyrpg.com/ | 2026-09-11 | Adjacent "immersive tabletop" product positioning | Official marketing page |

## Part C evidence captures (claim-checking)

These are the pages the five claims in `notes/field.md` PART C stand on. Same rules: all public,
all fetched 2026-09-11, all 1280×1000 desktop. Where a page returned 403 to a plain fetch
(GeekWire, CNBC, `help.drivethrurpg.com`) it was loaded in headless Chromium instead — that is
noted in the source-type column.

| File | Exact URL | Fetched | Job / claim it evidences | Source type |
|---|---|---|---|---|
| `geekwire-dnd-2023.png` | https://www.geekwire.com/2023/dungeons-dragons-in-2023-wizards-of-the-coast-reveals-planescape-revival-and-more/ | 2026-09-11 | **Claim 1** — WotC's May 2023 press-summit player data, incl. "60% are 'hybrid' players, who switch between playing the game physically or online". Shows the 60% is real but means something other than the claim | Press report of a first-party WotC briefing (403 to plain fetch; headless capture) |
| `dndbeyond-roadmap-2223-midyear.png` | https://www.dndbeyond.com/posts/2223-mid-year-update-d-d-beyonds-2026-development | 2026-09-11 | **Claim 2** — the Aug 18 2026 roadmap promising a player app "focused on making in-person play simpler and more approachable… likely early 2027", and containing zero roleplay features | Official company post |
| `dndbeyond-roadmap-2026.png` | https://www.dndbeyond.com/posts/2132-d-d-beyonds-2026-development-roadmap | 2026-09-11 | **Claim 2** — the original 2026 roadmap, checked for roleplay/voice/improv commitments; none present | Official company post |
| `dndbeyond-forum-manual-dice-request.png` | https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/d-d-beyond-mobile-app-feedback/145658-request-physical-manual-dice-rolls | 2026-09-11 | Part A — the long-standing, unimplemented request to enter physical dice rolls in the DDB app: the clearest user-voiced in-person gap | Official company forum |
| `dndbeyond-forum-offline-access.png` | https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/d-d-beyond-mobile-app-feedback/177353-offline-access-really-needs-to-improve-mobile | 2026-09-11 | Part A — users reporting the app's offline behaviour as inadequate at a real table | Official company forum |
| `rascal-sigil-ignoble-death.png` | https://www.rascal.news/sigil-suffered-a-slow-ignoble-death/ | 2026-09-11 | **Claim 3** — source of both quoted phrases ("the video-game-ification of D&D"; leadership "never quite seemed to grasp exactly what people love about playing tabletop games") | Trade press |
| `ennies-ai-policy.png` | https://ennie-awards.com/revised-policy-on-generative-ai-usage/ | 2026-09-11 | **Claim 4A** — the Jan 26 2025 total ban on generative-AI content from the 2025-2026 submission cycle | Official awards-body policy |
| `drivethrurpg-content-guidelines.png` | https://help.drivethrurpg.com/hc/en-us/articles/12723312467095-General-Content-Guidelines | 2026-09-11 | **Claim 4B** — the operative storefront rules: AI *text* banned outright, AI art banned as standalone/VTT-asset products, Creation Method disclosure mandatory (updated March 19 2026) | Official storefront policy (403 to plain fetch; headless capture) |
| `drivethrurpg-ai-policy.png` | https://help.drivethrurpg.com/hc/en-us/articles/26794784634007-Managing-AI-Generated-Content-and-DriveThru-Policy | 2026-09-11 | **Claim 4B** — the buyer-side "Show AI Content → OFF" switch and the Storytellers Vault total ban (updated May 12 2026) | Official storefront policy (403 to plain fetch; headless capture) |
| `kickstarter-ai-guidelines.png` | https://updates.kickstarter.com/kickstarter-project-guidelines-for-ai-generated-content-and-ai-technology/ | 2026-09-11 | **Claim 4C** — the disclosure-and-consent regime, effective August 29 2023 | Official platform policy |
| `wotc-generative-ai-faq.png` | https://dnd-support.wizards.com/hc/en-us/articles/26243094975252-Generative-AI-art-FAQ | 2026-09-11 | **Claim 4D** — WotC's own written policy ("we require artists, writers, and creatives… to refrain from using AI generative tools") plus the Voight.ai detection pilot | Official support article |
| `magic-genai-update.png` | https://magic.wizards.com/en/news/announcements/an-update-on-generative-ai-tools-and-magic | 2026-09-11 | **Claim 4D** — WotC's Jan 7 2024 admission that "a series of recent marketing images may have included elements of generative AI" | Official company announcement |
| `dexerto-rapoza-quits.png` | https://www.dexerto.com/magic-the-gathering/mtg-and-dd-artist-dave-rapoza-quits-amid-wizards-ai-controversy-2463656/ | 2026-09-11 | **Claim 4E** — Dave Rapoza (MTG/D&D artist since 2007) quitting WotC on Jan 8 2024 over the AI marketing image | Trade press (his original post was on Twitter/X, which is not fetchable here) |
| `geekwire-mtg-arena-union.png` | https://www.geekwire.com/2026/magic-the-gathering-arena-development-team-announces-its-successfully-unionized/ | 2026-09-11 | **Claim 4F** — Jun 24 2026 unionisation of the MTG Arena team; union goals include "addressing Hasbro's mandates of required AI usage" | Trade press (403 to plain fetch; headless capture) |
| `wargamer-mtg-arena-union.png` | https://www.wargamer.com/magic-the-gathering/mtg-arena-workers-union-vote | 2026-09-11 | **Claim 4F** — the NLRB count: 79 for, 16 against, out of 102 eligible voters, finalised June 23 2026 | Trade press reporting the NLRB file |
| `cwa-wotc-union.png` | https://cwa-union.org/news/releases/wizards-coast-developers-form-union-cwa | 2026-09-11 | **Claim 4F** — the union's own side: name (United Wizards of the Coast–CWA) and the demand for "guardrails over generative AI usage". No vote count on this page | Official union press release |
| `foundryvtt-ai-policy.png` | https://foundryvtt.com/article/ai-policy/ | 2026-09-11 | **Claim 4G** — "Prepared content must be human-made", the "Zero AI" tag, and the carve-out that "Improvised content may be AI-generated… at runtime in direct response to end-user prompts" | Official platform policy |
| `cnbc-dnd-undermonetized.png` | https://www.cnbc.com/2023/01/13/hasbro-delays-new-dungeons-dragons-licensing-rules.html | 2026-09-11 | **PART D** — the single best willingness-to-pay source: WotC President Cynthia Williams telling investors the brand is "really under-monetized" and that the vast majority of D&D purchases come from DMs, who are only 20% of the user base | Press report of a first-party investor briefing (403 to plain fetch; headless capture) |

## Capture attempts that failed (recorded, not kept)

| URL | Result |
|---|---|
| https://roll20.net/buy-a-plan | HTTP 404 |
| https://app.roll20.net/why-subscribe-to-roll20 | Cloudflare bot wall ("Performing security verification") — both WebFetch and Playwright |
| https://wiki.roll20.net/Subscription | Cloudflare bot wall / HTTP 403 |
| https://help.roll20.net/hc/en-us/articles/... | HTTP 403 to WebFetch |
| https://apps.apple.com/us/app/roll20-character-sheets/id1541218329 | HTTP 404 — consistent with the app being delisted in Feb 2026 |
| https://www.dndbeyond.com/maps · /maps-vtt · /maps-vtt-beta | HTTP 404 — no public marketing page found for Maps at these paths |
| https://app.demiplane.com/pricing | HTTP 502 |
| https://app.kanka.io/pricing · /en/pricing | HTTP 404 |
| https://shardtabletop.com/pricing | HTTP 404 |
| https://alchemyrpg.com/pricing | HTTP 404 |
| https://store.steampowered.com/app/2986970/Sigil/ | Redirected to the Steam storefront — Sigil is not a Steam title; the official WotC Sunset FAQ was captured instead |
| https://play.google.com/store/apps/details?id=com.demiplane.nexus · https://apps.apple.com/us/app/demiplane/id6479376073 | HTTP 404 both — **Demiplane has no native mobile app.** Its own forums carry standing user requests for one. Relevant to Claim 5 |
| https://play.google.com/store/apps/details?id=net.roll20.charactersheets | HTTP 404 — the Android side of the Roll20 companion app is delisted too, matching the Feb 2026 retirement announcement |
| https://newsroom.hasbro.com/news-releases/.../hasbro-reports-fourth-quarter-and-full-year-2025-financial-results · .../third-quarter-2025 | `net::ERR_HTTP2_PROTOCOL_ERROR` in headless Chromium; the static-file PDF timed out at 60s. Hasbro's FY2025 **Form 10-K on sec.gov was fetched successfully instead** and is cited in PART D |
| https://twitter.com/... (Dave Rapoza's original resignation post) | Twitter/X is not fetchable to this agent. The quote in Claim 4E is therefore cited to Dexerto's contemporaneous report, and labelled as such |
| https://www.reddit.com/... (all) | Blocked to this user agent at both WebSearch and WebFetch. **No Reddit content was captured or cited anywhere in this research.** Community sentiment in `notes/field.md` is sourced from fetchable primary equivalents instead: D&D Beyond's own forums and public app-store reviews |
