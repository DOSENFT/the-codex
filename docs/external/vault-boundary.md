# The Codex ↔ The Vault boundary

**Status:** decided by Marcus, 2026-08-17, while the Codex was at Slice 14 and the Vault was at
Gate 1. Written to be read by whoever designs the Vault's Gate 2 architecture.

**This document is the contract.** It exists because two products were about to grow two copies of
"who's trying to kill me," and a campaign whose memory lives in two places fails the Vault's own
success test — a player who cold-opens it and has to ask which copy is right has already lost the
ten minutes.

---

## The two products, in one line each

**The Codex** is the character-and-combat tool. It runs at the table, on a phone and an iPad, and it
must work with no network at all. It answers *what can I do right now, and what does it cost.*

**The Vault** is campaign memory. Audio, transcript and AI chronicle per session, assembled into one
page per NPC, faction, quest and open thread, with every fact linked to the second it happened. It
answers *what has happened, and what do I owe whom.*

## The dividing test

> **If the fact would still be true with the campaign deleted, it belongs to the Codex.**
> **If it only exists because a session happened, it belongs to the Vault.**

| Fact | Owner |
|---|---|
| Nix has three 2nd-level slots, one spent | Codex |
| Nix's Divine Smite costs a slot and a bonus action | Codex |
| Marcus's veil signal, and the group's lines | Codex *(safety is table-local and must never need a fetch)* |
| Nix promised the toll-keeper a favour in session 12 | **Vault** |
| The toll-keeper is hostile; Sister Vane is owed | **Vault** |
| The Night Hag's true name, and who heard it | **Vault** |
| What the party decided to do about the ferry | **Vault** |

## What this means for the Codex, concretely

The Codex has campaign fields today: `campaign.notableNPCs`, `campaign.partyMembers`,
`campaign.currentQuest`, `campaign.sessionNotes` (20 hand-typed summaries), and a
`codex-session-log-*` of self-rated roleplay moments.

**They keep working exactly as they do now.** The Codex's prime law is that nothing Marcus already
uses may degrade, and there is real typing in those fields. Nothing is deleted, nothing is disabled.

**They stop growing.** No new campaign features are built in the Codex. They are now a local
scratchpad that the Vault supersedes. When the feed below exists, they become the offline fallback
for a Vault that cannot be reached.

**The Codex will not build a chronicle.** Slice 14 originally scoped "print chronicle + character
record." The chronicle half is cancelled and handed to the Vault; a printed, offline,
un-searchable, un-timestamped session log would be a strictly worse second copy. Slice 14 builds the
character record only — the thing you want on paper when the iPad dies.

---

## The feed: Vault → Codex

Marcus's requirement, verbatim: *"We must build a powerfully easy and effective way for the Vault to
feed data into Codex without overloading either."*

Six constraints. The first three are non-negotiable; they protect properties the Codex has already
proved and is not allowed to lose.

**1. One direction. The Vault writes, the Codex reads.**
Two-way sync between an offline-first table app and a wiki is a merge-conflict engine. The Codex
must never be able to lose a character edit to a sync, and the Vault must never receive a fact whose
provenance is "somebody typed it on a phone at the table." The Codex is a **read-only consumer** of
Vault facts. If Marcus corrects a Vault fact, he corrects it in the Vault.

**2. The Codex must stay fully usable with the Vault unreachable.**
This rule is already proved for the AI layer (Slice 11: kill the model, combat is unaffected) and
the feed inherits it unchanged. No combat action, no character edit and no safety control may ever
await a Vault response. The briefing is decoration on a tool that works without it.

**3. Pull, never push. The Vault need not know the Codex exists.**
The Codex asks for a briefing when it wants one. No webhooks, no callbacks, no registration. This
keeps the Vault's architecture free of a client it would otherwise have to support.

**4. A briefing, not a database. This is the "without overloading either" half.**
The Codex must not ingest 24 sessions of transcript into a phone's local storage. What a player
needs *at the table* is small and current:

> **who is here · what did I promise · who wants me dead**

Which is the Vault's own ten-minute cold-open test, scoped to one character. Suggest a hard size cap
on the payload — kilobytes, not megabytes — and let depth live behind links.

**5. Every fact carries its citation.**
The Vault timestamps every line to the second. That is the expensive, valuable thing, and the feed
must not throw it away. Each fact in the briefing should carry a deep link back to the moment it
came from, so a tap in the Codex opens the Vault at that second. A briefing fact with no citation is
a rumour.

**6. Facts are typed and few.**
A small closed set of fact kinds the Codex knows how to render — a person and their standing toward
me, a debt or promise in either direction, an open thread, a warning. Resist a general-purpose
schema; the Codex only needs to *display* these, and a wide schema becomes a rendering obligation.

### A shape to design against, not a specification

```
GET  <vault>/briefing/<campaign>/<character>     → a bounded briefing document

{
  "character": "Nix",
  "asOfSession": 24,
  "standing": [
    { "who": "Toll-keeper of Marrow Ford", "toward": "hostile",
      "because": "the ferry bargain, refused",
      "cite": { "session": 12, "at": "01:47:22" } }
  ],
  "promises": [
    { "direction": "owed-by-me", "to": "Sister Vane", "what": "a name, when asked",
      "cite": { "session": 19, "at": "00:31:08" } }
  ],
  "threads": [
    { "what": "The Night Hag knows Nix's true name", "state": "open",
      "cite": { "session": 22, "at": "02:05:41" } }
  ]
}
```

Three lists, every entry cited, whole document small enough to cache. The Codex renders it, caches
the last one it got, shows it stale-but-labelled when offline, and never writes to it.

---

## What Cowork should take from this into Gate 2

1. The Vault owns campaign memory outright. Do not design around the Codex holding any of it.
2. Design **one read endpoint** for the Codex — a per-character briefing, bounded, cited, cacheable.
   It is a projection of pages the Vault is building anyway, not a new subsystem.
3. Do not design an import path *from* the Codex. There is nothing there worth ingesting that the
   transcripts do not already contain better.
4. Assume the consumer is offline half the time and on a phone at a dark table.

## What the Codex owes back

Nothing structural — but the boundary is recorded in the Codex's own plan
(`docs/plans/codex-v1/00-status.md`) so no future slice reopens it, and the Codex's campaign fields
are frozen as of this date. Consuming the briefing is **not** in the V1.0 slice plan; it is post-V1
work that cannot start until the Vault has a Gate 2 architecture to consume.
