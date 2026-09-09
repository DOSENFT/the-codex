/* THE MARKS — one glyph per ability in the combat kit.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Marcus's ask, verbatim: "make good looking, memorable icons/images per spell
 * so it's super easy for me to see the spell and know what I'm looking at at a
 * glance. This will psychologically help memorize and know my spells naturally."
 *
 * That is a FINDING AID, not decoration, and it sets the whole spec. The mark
 * has to survive 34 pixels on a phone in a lit room, because 34px in the row
 * list is where he is scanning when it matters. Anything that only works at
 * card size has failed at the job it was asked to do.
 *
 * ── A TABLE, NOT A COMPONENT ────────────────────────────────────────────────
 * Deliberately data with a pure function over it, so it is testable without a
 * DOM and assertable for coverage. `marks.test.ts` walks every slug in here and
 * requires a real file on disk — the test that catches a typo'd slug shipping
 * as an invisible hole rather than a visible error.
 *
 * ── THE OPEN-WORLD RULE, AGAIN ──────────────────────────────────────────────
 * A name that is not in this table renders NO mark and NO empty box. Not a
 * placeholder, not a question mark, not a reserved gap. A homebrew ability must
 * not look second class next to a published one, and a missing mark must
 * degrade to exactly the row the app shows today.
 *
 * ── WHY `markFor(name)` AND NOT `TurnOption.markSlug` ───────────────────────
 * The Gate 3 plan put a `markSlug` field on `TurnOption`, set by the composer.
 * Changed here, on purpose. `TurnOption` is a COMBAT type, and the Grimoire —
 * which is the other half of this whole feature — does not have one. Putting
 * the mapping on the option would mean the Grimoire needs a second path to the
 * same answer, which is precisely the two-surfaces-drift that `bands.ts:9-16`
 * was written to prevent. A pure function over a name is ONE answer that both
 * screens call, and it costs no change to `types.ts` or the composer.
 *
 * Combat Open Book slice 7.
 */

/** Where the files live, relative to the app's base path. */
const DIR = 'marks/'

/** Ability name (normalised) → file slug under `public/marks/`.
 *
 *  ── THESE KEYS WERE MEASURED, NOT LISTED ───────────────────────────────────
 *  The Gate 1 mockup proposed twenty names. Run against the real composer, that
 *  list was wrong in both directions: twelve of its entries (Heroism, Command,
 *  Searing Smite, Compelled Duel, Thunderous Smite, Abjure Foes, Dispel Magic,
 *  Aura of Protection, Aura of Solace, Summon Celestial…) are names the app
 *  never emits for his sheet, and five names it does emit were missing.
 *
 *  So this table is the composer's own output, plus his two feats. Adding a
 *  name that the app never produces is not harmless — it is a mark nobody ever
 *  sees, and a coverage number that lies about how much of the screen is
 *  covered. */
const TABLE: Readonly<Record<string, string>> = {
  // ── strike: bronze weapon, gold divine ───────────────────────────────────
  hearthbrand: 'hearthbrand',
  javelin: 'javelin',
  'opportunity attack': 'opportunity-attack',
  'divine smite': 'divine-smite',
  'sacred flame': 'sacred-flame',

  // ── sustain: verdant keeps someone up ────────────────────────────────────
  'cure wounds': 'cure-wounds',
  'lay on hands': 'lay-on-hands',
  'warding bond': 'warding-bond',

  // ── defence and blessing: arcane gold ────────────────────────────────────
  bless: 'bless',
  'shield of faith': 'shield-of-faith',
  interception: 'interception',
  sentinel: 'sentinel',
  'divine sense': 'divine-sense',
  'channel divinity': 'channel-divinity',

  // ── his oath, and movement ───────────────────────────────────────────────
  'hearthfire manifest': 'hearthfire-manifest',
  'flaming cloak': 'flaming-cloak',
  'misty step': 'misty-step',

  /* ── THE PREPARED SET ──────────────────────────────────────────────────────
     Everything above this line is a COMBAT row: a thing the turn composer
     emits, which is what slice 7 measured itself against. Everything below is
     a GRIMOIRE row — a spell he can prepare at level 7 but that never becomes
     a turn option, and therefore never appeared in that measurement at all.

     Marcus's ask, verbatim: "do the spell art for the remaining ones that I
     have already prepared." Measured rather than guessed: `spells.json` holds
     41 entries with `castableAtLevel7 && !lockedForMarcus`, of which the
     seventeen above covered six. These are the other thirty-five minus the
     eight Blessed Warrior cantrip OPTIONS — he picked two of those nine and
     Sacred Flame is one; drawing the seven he did not pick would be seven
     marks nobody ever sees, which is the exact thing the phantom-key test
     below exists to forbid.

     Deliberately NOT here: everything at spell level 3+. He is a level 7
     paladin with 2nd-level slots, `castableAtLevel7` is false for all of it,
     and it cannot appear in his prepared list until he levels. Fireball is the
     `markFor` null test case precisely because of this.

     Drawn as geometry rather than traced from raster art — see
     `public/marks/STYLE.md` for the palette, the weight floors and the shape
     vocabulary that keeps forty-four files looking like one set. */

  // ── fire: the Oath of the Hearth ─────────────────────────────────────────
  'burning hands': 'burning-hands',
  'scorching ray': 'scorching-ray',
  'searing orb': 'searing-orb',
  'searing smite': 'searing-smite',
  'faerie fire': 'faerie-fire',

  // ── the blade, and what is added to it ───────────────────────────────────
  'compelled duel': 'compelled-duel',
  'divine favor': 'divine-favor',
  'magic weapon': 'magic-weapon',
  'shining smite': 'shining-smite',
  'thunderous smite': 'thunderous-smite',
  'wrathful smite': 'wrathful-smite',

  // ── verdant keeps someone up ─────────────────────────────────────────────
  aid: 'aid',
  'lesser restoration': 'lesser-restoration',
  'prayer of healing': 'prayer-of-healing',
  'protection from poison': 'protection-from-poison',
  'purify food and drink': 'purify-food-and-drink',
  'detect poison and disease': 'detect-poison-and-disease',

  // ── sensing, and truth ───────────────────────────────────────────────────
  'detect evil and good': 'detect-evil-and-good',
  'detect magic': 'detect-magic',
  'locate object': 'locate-object',
  'zone of truth': 'zone-of-truth',
  'gentle repose': 'gentle-repose',

  // ── the word, the ward, and the bond ─────────────────────────────────────
  command: 'command',
  heroism: 'heroism',
  'protection from evil and good': 'protection-from-evil-and-good',
  wardaway: 'wardaway',
  'find steed': 'find-steed',
}

/** The separators the app itself puts between an ability and its instance.
 *
 *  MEASURED, not guessed. The composer emits `Opportunity Attack — Hearthbrand`
 *  (the weapon it would be made with) and `Channel Divinity: Sacred Weapon`
 *  (which of the options it is). A table keyed on whole names would miss both,
 *  and would miss them SILENTLY — the row simply renders no mark, which looks
 *  identical to "this ability has no mark yet".
 *
 *  The em dash is the real character `—`, not a hyphen. Kept as an explicit
 *  list rather than a regex on any punctuation, because a broad split would
 *  turn `Shield of Faith` into `Shield` the first time canon writes a colon
 *  into a name. */
const QUALIFIERS = [' — ', ' – ', ': ']

/** Lowercase, trimmed, inner whitespace collapsed.
 *
 *  Case matters here in practice, not in theory: the composer says
 *  `Lay on Hands` and the Gate 1 mockup said `Lay On Hands`. One of those was
 *  going to be typed into this table by hand. */
function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * The mark for an ability, or `null` if it has none.
 *
 * `null` is a first-class answer and the common one — the Grimoire's long tail
 * is text-only by design, and every caller must render nothing rather than
 * reserve space.
 */
export function markFor(name: string): string | null {
  const key = normalise(name)
  if (TABLE[key]) return TABLE[key]!

  /* An instance of a known ability. Only the HEAD is retried, and only when a
     qualifier the app actually writes is present — so `Sentinel Shield`, which
     carries no qualifier, stays a miss. Widening this into "match any prefix"
     is how `reachFor`'s near-miss bug would arrive here. */
  for (const sep of QUALIFIERS) {
    const at = key.indexOf(sep)
    if (at > 0) {
      const head = key.slice(0, at)
      if (TABLE[head]) return TABLE[head]!
    }
  }
  return null
}

/** The URL for a mark, base path included, or `null`. */
export function markUrl(name: string, base = '/'): string | null {
  const slug = markFor(name)
  return slug ? `${base}${DIR}${slug}.svg` : null
}

/** Every slug in the table, for the test that checks each one is a real file. */
export function allMarkSlugs(): string[] {
  return [...new Set(Object.values(TABLE))].sort()
}

/** Every key in the table, so a test can assert what is covered. */
export function allMarkKeys(): string[] {
  return Object.keys(TABLE).sort()
}
