/* ============================================================================
   THE VAULT → THE CODEX.  A file, not an endpoint.
   ==========================================================================

   The Vault (https://dosenft.github.io/dwk-vault/, source at
   ~/vault-audio/dwk-vault) is the Driftwood Kin session archive: sixteen-plus
   recorded sessions, each with a transcript-derived recap, the party roster as
   it stood that night, an entity list, and open threads with timecodes into
   the audio.

   The Codex has a `CampaignData` shaped almost exactly like the useful half of
   that, and — until now — empty, because `docs/plans/codex-v1/00-status.md`
   froze those fields in deference to the Vault. Deferring to a system nobody
   ever wired up is how you end up with an Engage card that offers Marcus
   nobody to talk to.

   ── THE DIVIDING TEST, and why this runs one way only ──────────────────────
   If the fact would still be true with the campaign deleted, it belongs to the
   Codex. If it only exists because a session happened, it belongs to the Vault.

   Nix's spell save DC is Codex. "Scar was knocked out at Dawson's vault" is
   Vault. This script carries the SECOND kind across, and never the reverse:
   the Vault is the record of what happened and the Codex must not be able to
   edit history. So there is no write-back, no sync, and no shared store — the
   coupling is one JSON file, moved by hand.

   ── WHY NOT AN HTTP ENDPOINT ───────────────────────────────────────────────
   `docs/external/vault-boundary.md` specifies a `GET /briefing/...` and it is
   still the right eventual shape. It is not the right FIRST shape: the Codex's
   hardest constraint is that it works in a basement with no signal, so a live
   fetch is a feature that is absent exactly when the table is sitting down.
   A file works offline by construction and needs no server to exist.

   ── USAGE ──────────────────────────────────────────────────────────────────
     node scripts/vault-import.mjs --probe
         Report what is in the Vault. Changes nothing.

     node scripts/vault-import.mjs --out campaign.json
         Write the campaign on its own.

     node scripts/vault-import.mjs --character <exported.json> --out merged.json
         Write an exported character file with the campaign folded in, ready to
         import on the phone through Settings → Import. This is the intended
         path: it rides the export/import route rather than adding a new one.

   Flags: --vault <dir>  (default ~/vault-audio/dwk-vault)
          --pc <name>     the character whose Codex this is (default Nix)
   ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}
const has = name => argv.includes(name)

const VAULT = flag('--vault', join(homedir(), 'vault-audio', 'dwk-vault'))
const OUT = flag('--out')
const CHARACTER_FILE = flag('--character')
const PC = flag('--pc', 'Nix')

/* Notta transcribes the PC's name as "Nyx" throughout; Marcus confirmed on
   2026-09-09 that it is the same person and the drift is the transcriber's,
   not a second character. Without this the import would hand him a party
   containing himself under a misspelling — and then offer him the chance to
   roleplay a conversation with it. */
/** "Talon (Rock Gnome — trap-setter)" → "Talon". The name is always first;
 *  everything after the first delimiter is commentary. */
const leadName = s => String(s ?? '').split(/[(—–\-/,|]/)[0].trim()

/** Every spelling that means one person, keyed by lowercased lead name. */
const SPELLINGS = new Map([
  ['nyx', 'Nix'], ['nix', 'Nix'], ['kayon', 'Nix'],
  ['rune', 'Runewillow'], ['rune willow', 'Runewillow'], ['runewillow', 'Runewillow'],
  ['runewillo', 'Runewillow'], ['broomwillow', 'Runewillow'], ['runewill', 'Runewillow'],
  ['ponzi', 'Ponzi'], ['ponsey', 'Ponzi'], ['pontus', 'Ponzi'], ['asher', 'Ponzi'],
  ['talon', 'Talon'], ['talent', 'Talon'], ['talendir', 'Talon'],
  ['scar', 'Scar'],
  ['ketsa', 'Ketsa'], ['ketza', 'Ketsa'],
])
const whoIs = s => SPELLINGS.get(leadName(s).toLowerCase()) ?? null

/** A name as the Codex should store it.
 *
 *  Known people collapse to one spelling. Everything else is returned WHOLE
 *  and untouched — `leadName` is consulted only to look a person up, never to
 *  rename a stranger, or "Dakar the Farsighted" would be filed as "Dakar" and
 *  an item called "Half-Moon Blade" would lose its name to the hyphen. */
const canonical = raw => {
  const s = String(raw ?? '').trim()
  return whoIs(s) ?? s
}

// ---------------------------------------------------------------------------
// Reading SESSIONS out of a 784 KB single-file app
// ---------------------------------------------------------------------------

/* The Vault has no build and no data file — it is one `index.html` with the
   corpus inlined as `const SESSIONS=[...]`. Bracket-matched rather than
   regex-matched: the recaps contain brackets, quotes and escaped quotes, and
   a lazy `\[.*\]` stops at the first `]` inside the first recap. String state
   is tracked so a `]` inside prose cannot close the array. */
function extractSessions(html) {
  const decl = html.indexOf('const SESSIONS=')
  if (decl === -1) throw new Error('No `const SESSIONS=` in the Vault index.html — has it been rebuilt?')
  const start = html.indexOf('[', decl)

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (escaped) { escaped = false; continue }
    if (inString) {
      if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    else if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) return JSON.parse(html.slice(start, i + 1))
    }
  }
  throw new Error('SESSIONS array never closes — the Vault file is truncated.')
}

/* "05/28/2026 19:17" → "2026-05-28". The Codex stores an ISO date because
   `campaignContext` prints it raw into an AI prompt and a US-ordered date is
   ambiguous to a reader that has not been told which convention it is. */
function isoDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s ?? ''))
  if (!m) return String(s ?? '').slice(0, 10)
  return `${m[3]}-${m[1]}-${m[2]}`
}

const sessions = extractSessions(readFileSync(join(VAULT, 'index.html'), 'utf8'))
/* Newest first, which is the order the Codex's own editor keeps and the order
   `campaignContext` assumes when it takes `.slice(0, 5)` as "recent". */
sessions.sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)))

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

if (has('--probe')) {
  const kinds = {}
  const party = {}
  const names = {}
  for (const s of sessions) {
    for (const e of s.entities ?? []) {
      kinds[e.kind ?? '(none)'] = (kinds[e.kind ?? '(none)'] ?? 0) + 1
      const n = canonical(e.name)
      names[n] = names[n] ?? { kind: e.kind, seen: 0 }
      names[n].seen++
    }
    for (const p of s.party ?? []) {
      const n = canonical(p)
      party[n] = (party[n] ?? 0) + 1
    }
  }
  console.log(`sessions      ${sessions.length}`)
  console.log(`date range    ${isoDate(sessions[sessions.length - 1].date)} → ${isoDate(sessions[0].date)}`)
  console.log(`entity kinds  ${JSON.stringify(kinds)}`)
  console.log(`party tallies ${JSON.stringify(party)}`)
  console.log(`threads       ${sessions.reduce((n, s) => n + (s.threads?.length ?? 0), 0)}`)
  console.log(`\ntop 30 entities by appearances:`)
  Object.entries(names)
    .sort((a, b) => b[1].seen - a[1].seen)
    .slice(0, 30)
    .forEach(([n, v]) => console.log(`  ${String(v.seen).padStart(3)}  ${(v.kind ?? '?').padEnd(10)} ${n}`))
  process.exit(0)
}

// ---------------------------------------------------------------------------
// The mapping
// ---------------------------------------------------------------------------

/* The most recent note the Vault wrote about a name. Most recent rather than
   longest or first, because these notes are cumulative — session 14 knows what
   session 8 knew plus what happened since — and the newest is the one that
   describes who the person is NOW. */
function latestNotes() {
  const notes = new Map()
  // Oldest → newest so later sessions overwrite earlier ones.
  for (let i = sessions.length - 1; i >= 0; i--) {
    for (const e of sessions[i].entities ?? []) {
      const name = canonical(e.name)
      if (!name) continue
      const prev = notes.get(name)
      notes.set(name, {
        name,
        kind: e.kind ?? prev?.kind ?? 'unknown',
        note: (e.note ?? '').trim() || prev?.note || '',
        seen: (prev?.seen ?? 0) + 1,
      })
    }
  }
  return notes
}

const notes = latestNotes()

/* ── Who was at the table ────────────────────────────────────────────────────
   TWO sources, because each has exactly what the other lacks.

   `session.party` is free text a transcriber typed, and across sixteen
   sessions the same five people are written forty-eight different ways:
   "Ponzi", "Ponzi (Rogue/Tiefling)", "Ponzi — Rogue, widower (wife Rose…)",
   "Ponsey / Talon". Deduplicating that list gives a party of forty-eight.

   `entities[kind === 'pc']` is the Vault's own resolved list and is already
   canonical — Nix, Ponzi, Talon, Runewillow, Scar. So the ROSTER comes from
   the entities.

   But the free text is where the class and the species actually live; nothing
   in the entity notes says "Rock Gnome". So the roster is filled in FROM the
   party strings, matched back by leading name. Reading a word the Vault wrote
   is not the same as guessing one — the line this holds is that nothing gets
   into the Codex that no session says. */

/* Canon's own words, matched case-insensitively as whole words. A list is used
   rather than "the word after the dash" because the transcriber's word order
   is not stable, and a positional guess would confidently mislabel. */
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin',
  'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const SPECIES = ['Changeling', 'Tiefling', 'Half-Elf', 'Rock Gnome', 'Gnome', 'Dragonborn',
  'Goliath', 'Half-Orc', 'Halfling', 'Aasimar', 'Genasi', 'Dwarf', 'Elf', 'Human', 'Orc']

/** The term from `terms` that `lines` state MOST OFTEN, or '' if none do.
 *
 *  Most-often rather than first-found, and the difference is not cosmetic: one
 *  session describes Ponzi as a "Rogue/Paladin hybrid", and a first-match scan
 *  over an alphabetical class list returned Paladin — from a single passing
 *  mention, against a dozen sessions that say Rogue. It then wrote that into
 *  the Codex as fact.
 *
 *  Ties break toward the earlier term, which is why SPECIES lists "Rock Gnome"
 *  before "Gnome" and "Half-Elf" before "Elf": the general word is a substring
 *  of the specific one, so both always match the same number of times, and the
 *  more specific reading is the one that is actually true. */
const mostStated = (lines, terms) => {
  let best = ''
  let bestCount = 0
  for (const term of terms) {
    const re = new RegExp(`\\b${term.replace('-', '[- ]?')}\\b`, 'gi')
    const count = lines.reduce((n, l) => n + (String(l).match(re)?.length ?? 0), 0)
    if (count > bestCount) { bestCount = count; best = term }
  }
  return best
}

/** The Vault's prose, with the PC called by his name.
 *
 *  Notta hears "Nix" as "Nyx" and writes it that way inside the note bodies as
 *  well as the rosters — "felt through Nyx's connection". Those bodies are
 *  printed verbatim into the system prompt of every AI call the Codex makes,
 *  so leaving them alone means every roleplay prompt refers to Marcus's own
 *  character by a name he does not use. The rosters were already collapsed by
 *  `canonical`; this is the same correction, one layer in. */
const PROSE_FIXES = [...SPELLINGS.entries()]
  .filter(([spelling, person]) => person === PC && spelling.toLowerCase() !== PC.toLowerCase())
  .map(([spelling]) => new RegExp(`\\b${spelling}\\b`, 'gi'))

const retell = s => PROSE_FIXES.reduce((text, re) => text.replace(re, PC), String(s ?? ''))

/* The roster: PCs the Vault resolved, minus the player's own character. He is
   the character this Codex IS, and listing him among the party is what would
   offer Marcus the chance to roleplay a conversation with himself. */
const partyNames = [...notes.values()]
  .filter(e => e.kind === 'pc')
  .filter(e => e.name.toLowerCase() !== PC.toLowerCase())
  .sort((a, b) => b.seen - a.seen)
  .map(e => e.name)

/** Every free-text party string that refers to this person. */
const descriptionsOf = name =>
  sessions.flatMap(s => (s.party ?? []).filter(p => whoIs(p) === name))

const sessionsWith = name =>
  sessions.filter(s => (s.party ?? []).some(p => whoIs(p) === name)).length

/* ── The transcript's own class guess, removed from the prose ────────────────
   Vault notes open with the shorthand the transcriber wrote down — "Rogue/
   Tiefling.", "Bard/Arcane.", "Cleric/Bard." — and it contradicts the `class`
   and `race` columns beside it often enough to matter. Runewillow's prefix
   says Bard; fifteen sessions of party text say Wizard, which is what
   `mostStated` returns and what the column shows. Two different answers on one
   row, and the row is what Marcus reads at the table.

   The columns win, because they are counted over every session rather than
   copied from whichever one was transcribed first. The prefix is dropped
   rather than kept-and-flagged: this text is also pasted verbatim into the
   system prompt of every AI call, so a contradiction left in it is not a note
   to the reader, it is an instruction to the model to be wrong. What remains
   is what the prefix was in front of — the things the character actually did. */
const CLASS_PREFIX = /^[A-Z][a-z]+\s*\/\s*[A-Z][a-z]+\.\s*/

const partyMembers = partyNames.map(name => {
  const said = descriptionsOf(name)
  return {
    name,
    class: mostStated(said, CLASSES),
    race: mostStated(said, SPECIES),
    personality: retell(notes.get(name)?.note ?? '').replace(CLASS_PREFIX, ''),
    /* Counted from the roster rather than asserted, so it stays true as the
       Vault grows. This is the field the Engage card reads when it builds a
       prompt, so a sentence is more use here than a number would be. */
    relationshipToPC: `Driftwood Kin — at the table with ${PC} for ${sessionsWith(name)} of ${sessions.length} recorded sessions.`,
  }
})

/* ── People you can talk to, and everything else ─────────────────────────────
   The Vault files nine kinds of entity and the first pass treated all of them
   as NPCs, which put "Veins of Yavanna" (an item) and "Cauberos" (a nation)
   into a list the Engage card offers as people to start a conversation with.

   So they split by whether the thing has AGENCY. `npc`, `deity` and `creature`
   can be spoken to. A place, a nation, an item, an asterum and a faction
   cannot — those are the world, and the Codex has a field for the world.

   Faction is the judgement call and it goes with the world: "The Arcanists"
   is a body Marcus negotiates WITH, but the roleplay prompt needs a voice, and
   a faction does not have one. If he wants to talk to the Arcanists he talks
   to Dakar, who is on the other list. */
const CAN_SPEAK = new Set(['npc', 'deity', 'creature'])
const PARTY_SET = new Set([...partyNames.map(n => n.toLowerCase()), PC.toLowerCase()])

const known = [...notes.values()]
  .filter(e => e.note && !PARTY_SET.has(e.name.toLowerCase()))
  /* Mentions, descending. A name that recurs across a dozen sessions is
     someone the table knows; a name that appears once is someone they met in
     a corridor, and the corridor is what the Vault is for. */
  .sort((a, b) => b.seen - a.seen)

/* ── Having agency is not the same as being someone ──────────────────────────
   The kind split above is right and still not enough. `creature` carries both
   Vesh — the fungal entity that speaks to Nix, unambiguously a character — and
   "giant badgers", which is a stat block the party killed in a corridor. Both
   have agency. Only one can be talked to, and the Engage card offers this list
   as people to open a conversation with.

   Two rules, and neither is clever, because clever misfires on data I have not
   seen yet and every misfire either loses a real character or offers Marcus a
   chat with a rug:

     lowercase initial   the Vault capitalises names and leaves descriptions in
                         lower case, so "giant badgers" identifies itself.

     a reviewed list     the rest, named one at a time, having read the note. A
                         regex for "monster" would have to guess at "The Wound"
                         and "Mycanoid Radix"; I read them instead.

   Nothing is discarded — a demoted entry moves to the world glossary, which is
   where a hostile fungus and a haunted rug belong anyway, and the move is
   printed at the end. Marcus can promote anything back in the campaign editor
   in one tap, which is the right place for a judgement call about his own
   table to be overridden. */
const NOT_A_PERSON = new Set([
  'Parrytons',                   // a people, not a person — plural throughout
  'Priests',                     // an unnamed group at the temple
  'Animated Rug of Smothering',  // a stat block, fought in the keep
  'Woe-Born Flame Skull',        // ditto
  'The Wound',                   // a place/phenomenon, per its own note
])
const isPerson = e =>
  /^[A-Z]/.test(e.name) && !NOT_A_PERSON.has(e.name)

const speakers = known.filter(e => e.kind !== 'pc' && CAN_SPEAK.has(e.kind))
const demoted = speakers.filter(e => !isPerson(e))

const npcRanked = speakers.filter(isPerson)
const worldRanked = [...known.filter(e => e.kind !== 'pc' && !CAN_SPEAK.has(e.kind)), ...demoted]
  .sort((a, b) => b.seen - a.seen)

/* ── Why these caps are small ───────────────────────────────────────────────
   `campaignContext` prints EVERY notable NPC into the system prompt of every
   AI call the app makes. It is not a display list, it is a per-request token
   cost, paid on a phone, on a hotspot, in a basement. Two hundred and forty
   entities would be roughly 30 KB of prompt in front of every question.

   Thirty is what a person can scroll and pick from, and the thirty most-
   mentioned are the ones with any chance of being picked. The drop is printed
   at the end rather than swallowed — a silent truncation reads as "the Vault
   only had thirty", which is a lie the number itself would tell. */
const NPC_CAP = 30
const WORLD_CAP = 30

/* The Vault is transcribed from spoken play, so a handful of names carry the
   transcriber's working-out with them: "Lady Shaelra (S-H-A-E-L-R-A)",
   "Algovan (Alvgan)", "Sylvari Kallis (Silvari Callis)". That parenthesis is a
   note to whoever was typing, and it is being rendered as part of the person's
   name in a list Marcus picks from and a prompt the model reads. Only trailing
   parentheses go, and only from the NAME — the note keeps its own text, so the
   alternate spelling is still searchable one field away. */
const properName = s => s.replace(/\s*\([^)]*\)\s*$/, '').trim() || s

const notableNPCs = npcRanked.slice(0, NPC_CAP).map(e => ({
  name: properName(e.name),
  role: e.kind,
  notes: retell(e.note),
}))

/* The editor itself caps at 20 (`[note, ...sessionNotes].slice(0, 20)`), so
   importing more would be importing something the next edit silently drops.
   Capped here, out loud, rather than there, in silence. */
const NOTE_CAP = 20
const sessionNotes = sessions.slice(0, NOTE_CAP).map((s, i) => ({
  id: `vault-${s.slug ?? i}`,
  date: isoDate(s.date),
  /* logline over recap: `campaignContext` prints the five most recent notes
     straight into an AI system prompt, and five full recaps is several
     thousand tokens of prompt before the question is even asked. The logline
     is the Vault's own one-sentence version. */
  summary: retell([s.subtitle, s.logline].filter(Boolean).join(' — ') || (s.title ?? 'Session')),
}))

const latest = sessions[0]

/* The world, as a glossary. `worldDetails` is one free-text field that goes
   into the AI prompt verbatim, so it is written as lines a language model and
   a person can both read, and each note is clipped — the Vault's notes run to
   paragraphs and this field is a reference card, not the archive. The archive
   is one tab away and has the audio. */
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const worldDetails = worldRanked.length
  ? [
      `The Driftwood Kin's world, as the Vault has it across ${sessions.length} recorded sessions.`,
      `Fuller entries — and the audio — live in the Vault: https://dosenft.github.io/dwk-vault/`,
      '',
      ...worldRanked.slice(0, WORLD_CAP).map(e => `${properName(e.name)} (${e.kind}) — ${clip(retell(e.note), 180)}`),
    ].join('\n')
  : ''

const campaign = {
  /* Stable, so re-running this replaces the campaign rather than growing a
     second one beside it. `normalizeCampaign` keeps an id it is given. */
  id: 'vault-driftwood-kin',
  name: 'Driftwood Kin',
  /* Left blank: the Vault has no field for it, and there is no sentence in
     sixteen sessions that says "the setting is X". A confident guess assembled
     out of place mentions would be the one thing in this campaign that no
     session supports, in the app whose whole job is being right at the table.
     It is one line for Marcus to write, once, in the campaign editor. */
  setting: '',
  worldDetails,
  currentQuest: latest?.logline ?? '',
  partyMembers,
  notableNPCs,
  sessionNotes,
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

let payload = campaign
if (CHARACTER_FILE) {
  const character = JSON.parse(readFileSync(CHARACTER_FILE, 'utf8'))
  if (!character?.name) throw new Error(`${CHARACTER_FILE} has no character in it.`)
  // The same envelope `lib/export-character.ts` writes, so this file imports
  // through the ordinary Settings → Import route with no special case.
  payload = { ...character, campaignId: campaign.id, campaign }
}

const text = JSON.stringify(payload, null, 2)
if (OUT) writeFileSync(OUT, text)

console.error(
  [
    `Vault      ${VAULT}`,
    `sessions   ${sessions.length} read, ${sessionNotes.length} carried` +
      (sessions.length > NOTE_CAP ? `  (DROPPED ${sessions.length - NOTE_CAP} — the campaign editor caps notes at ${NOTE_CAP})` : ''),
    `party      ${partyMembers.length}: ${partyMembers.map(p => p.name).join(', ') || '(none)'}`,
    `NPCs       ${notableNPCs.length} carried` +
      (npcRanked.length > NPC_CAP ? `  (DROPPED ${npcRanked.length - NPC_CAP} below the ${NPC_CAP} most-mentioned)` : ''),
    `           demoted to the world: ${demoted.map(e => e.name).join(', ') || '(none)'}`,
    `world      ${Math.min(worldRanked.length, WORLD_CAP)} places/factions/items carried` +
      (worldRanked.length > WORLD_CAP ? `  (DROPPED ${worldRanked.length - WORLD_CAP})` : ''),
    `quest      ${clip(campaign.currentQuest, 90)}`,
    CHARACTER_FILE ? `character  ${CHARACTER_FILE} (campaign folded in)` : `character  none — campaign only`,
    OUT ? `written    ${OUT}` : `written    nothing (no --out); JSON on stdout`,
    ``,
    `Everything dropped is still in the Vault — this is a reference card, not a`,
    `replacement archive. \`setting\` is blank because no session states one.`,
  ].join('\n'),
)

if (!OUT) console.log(text)
