/* ===========================================================================
   SIX PERSONA PLAYS, AND THE PACK STOPS BEING SHAREABLE — round two, slice 6.

   Slice 6 filled the third tab. None of the six is gated: a persona play wants
   a face, a voice and a table, not a feat and a polearm, so all six arrive for
   every paladin the pack matches. What makes them round two's rather than round
   one's is the SCOPED EXCEPTION recorded in `types.ts` — Marcus said "Use all of
   it" on 2026-09-04, so these plays name Selis, Fate, Scar, Rysanna, Khaonn and
   the Hidden Kingdom, which round one's own test forbids by name.

   THE UNIT TESTS ALREADY HOLD THE DATA HALF of that: the names are present, the
   changeling is spent, every play has something licensed to be about. What no
   unit test can reach is whether any of it SURVIVED TO THE GLASS, and this tab
   has three ways to lose text silently that the other two do not:

   1. THE SKILL-CHECK BADGE STEALS FROM THE NAME. `ToyboxPanel.tsx:1568` paints
      `skillCheck` as a `<Badge variant="eldritch">` in the collapsed header,
      beside a 44px star, the name and a chevron, on a 390px phone — and the
      badge does NOT truncate while the name IS `line-clamp-3`. So every
      character of the badge is taken out of the name's three lines. Round one
      found this by putting a long one on the glass; this file measures both at
      once, per card, and 24 characters is the ceiling the unit test enforces
      because this file is where the number came from.

   2. `resolveNotes` DROPS ONE ANNOTATION AT A TIME. An annotation whose tokens
      will not resolve is removed silently, and the play ships anyway looking
      complete. Every one of these six carries three notes — a rule he can check
      or a warning about the table — so the count is stated per card. Eighteen in
      total, and a short count fails the run. `{{wizard}}` and its three siblings
      only ever appear in annotations, which is exactly why the annotations are
      the part most likely to go missing.

   3. THE KEY PHRASES ARE QUOTED BY THE COMPONENT. `ToyboxPanel.tsx:1612` wraps
      each phrase in `&ldquo;…&rdquo;` itself, so a phrase carrying its own
      quotes paints as ““like this””. The unit test forbids the quote marks in
      the data; this file looks for the doubled glyph on the rendered card, which
      is the defect the rule exists to prevent rather than a proxy for it.

   AND THE DISTINCTION, A THIRD TIME. Slice 5 proved a tactic offers no Deploy
   button and no action-economy pills. A persona play is not a turn either, and
   it is checked here for the same two things with the same two detectors — the
   `aria-label`, and any button whose text says "Deploy" — because a card that
   offered to spend his Action on a conversation would be the exact confusion
   Marcus asked to have cleared up.

   AND THE NAMES THEMSELVES, ON THE GLASS. Each card states one proper noun it
   must paint. That is the licence being exercised where he can see it, not
   merely permitted in a type file.

   AND IT ONLY SEES A FRESH BUILD. `vite preview` serves `dist/`, so a run made
   straight after editing a pack reports the OLD strings and looks like the edit
   did nothing. Run `npm run build` first.

   THE SHEET IS HIS, duplicated rather than imported for the reason the other
   provers duplicate it: these are standalone scripts a future session may run
   one of in isolation. Note what is NOT load-bearing here — Two-Handed and
   Sentinel earn nothing on this tab. That is the point of the constant list.

   Finding Q, inherited: a string counts as painted only when its own element
   has a box with area and is the topmost thing at its own centre.

   NOTHING IS SPENT. No AI config is seeded; this feature does not touch that
   path.
   ========================================================================= */
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'

const BASE = process.argv[2] ?? 'http://localhost:4321'

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })(),
]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium

const nix = await loadNix()

const DAWN_GUARDIAN = {
  ...nix.weapons.find(w => w.attackType === 'melee'),
  name: 'The Dawn Guardian',
  damageDice: '1d10',
  damageType: 'Slashing',
  properties: ['Two-Handed', 'Reach', 'Graze'],
  range: '10 ft',
  magical: true,
}

const FEAT = name => ({ name, description: '', isHomebrew: false, effects: [] })

/* THE PARTY, AND THE REASON IT IS WRITTEN OUT HERE INSTEAD OF INHERITED.

   `nix-seed.mjs` has NO `backstory` KEY AT ALL — not an empty one, an absent
   one. Every prover in this folder from slice 2 onward has therefore been
   driving a paladin with no relationships, and `resolveParty` correctly returns
   nothing for him. That was invisible until this file, because `resolveNotes`
   drops an unresolvable annotation ONE AT A TIME and ships the play looking
   whole: the first run of this prover found five of the six cards painting two
   notes where three were authored, and the missing one was the `party` note
   every time.

   That is the designed behaviour and it is right — a note that would say "call
   it out to {{wizard}}" on a sheet with no wizard is a note about nobody. What
   was wrong was the SHEET. Marcus's own `codex-nix-lvl7 (2) (1).json` names
   four party members and this run is supposed to show what HE sees, so the four
   are copied in verbatim, relation strings and all.

   THE RELATION STRINGS ARE THE DATA, not decoration. `party.ts` parses them:
   a relation qualifies only when a class name appears in parentheses AND the
   word "party" appears before that parenthesis. Scar is in this list precisely
   because he is the case that rule was written against — his relation contains
   the word "party" and no parenthesised class, so he must NOT be recruited into
   the line of battle. Shortening these strings would quietly delete that test. */
const RELATIONSHIPS = [
  {
    name: 'Scar',
    relation:
      'Found and saved a brain-damaged goliath. Partner, moral compass, grounding '
      + 'force. Unwavering loyalty. Only person besides the party who knows Nix is '
      + 'a changeling.',
    status: 'alive',
  },
  {
    name: 'Rune Willow',
    relation: 'Party member (Wizard) — quiet, inquisitive, knowledge-hungry. A calming presence.',
    status: 'alive',
  },
  {
    name: 'Ponzi',
    relation:
      'Party member (Rogue) — observant, reserved. Recognized Scar\'s voice as '
      + 'someone named \'Hopscotch\' from his past.',
    status: 'alive',
  },
  {
    name: 'Ketza',
    relation: 'Party member (Ranger) — young wood elf. Searching for her missing father in the Drinkswood.',
    status: 'alive',
  },
  {
    name: 'Talon',
    relation: 'Party member (Bard) — rock gnome with cowboy aesthetic, tinker. Doug\'s character.',
    status: 'alive',
  },
]

/** The four names the tokens must become. Checked on the glass below, because
 *  "the note survived" and "the token resolved to a person" are two different
 *  claims and only the second one is worth having. */
const PARTY_NAMES = ['Rune Willow', 'Ponzi', 'Ketza', 'Talon']

const MARCUS = {
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, STR: 18, CHA: 16 },
  feats: [FEAT('Sentinel'), FEAT('Lucky')],
  weapons: [DAWN_GUARDIAN, ...nix.weapons.filter(w => w.attackType !== 'melee')],
  backstory: {
    ...(nix.backstory ?? {}),
    relationships: RELATIONSHIPS,
  },
}

/* The five words a COMBO paints beside each of its steps. None may appear as an
   element's whole text anywhere inside a persona card. */
const PILL_WORDS = ['ACTION', 'BONUS', 'REACTION', 'MOVEMENT', 'FREE']

/* ALL SIX, IN PACK ORDER, WHICH IS CARD ORDER.

   `badge` is the exact `skillCheck` string, compared rather than measured for
   length, because the length ceiling is a consequence and the string is the
   claim. `names` is the proper noun the licence bought for that card. `party`
   is the party members the `{{…}}` tokens must have become — an empty list
   where the card has no party note, which is a claim in its own right.

   TWO OF THESE SIX WERE RENAMED BY THIS FILE. Card 5 was "When Someone Asks
   About the Fire" behind a 153px badge and clipped to five lines inside a
   three-line clamp; card 6 sat behind "Persuasion, advantage" at 146px and
   clipped to four. The unit test's 24-character ceiling is NECESSARY AND NOT
   SUFFICIENT, and that is worth saying plainly: both offending badges were
   under 24 characters. What clips a name is the badge's WIDTH beside that
   name's LENGTH, and only a browser knows either. The ceiling stays in the unit
   test because it is cheap and catches the gross case; this file is what
   catches the real one. */
const EXPECTED = [
  {
    slug: 'fate-wants-something-stupid',
    name: 'Fate Wants to Do Something Stupid',
    badge: 'No roll — play it',
    notes: 3,
    tags: 4,
    names: 'Selis',
    party: ['Talon'],
  },
  {
    slug: 'ask-scar',
    name: 'Ask Scar',
    badge: 'No roll — ask Scar',
    notes: 3,
    tags: 5,
    names: 'Scar',
    party: ['Ponzi'],
  },
  {
    slug: 'the-eyes-you-never-change',
    name: 'The Eyes You Never Change',
    badge: 'Deception (untrained)',
    notes: 3,
    tags: 4,
    names: 'Rysanna',
    /* The only card with no party note, and deliberately so: what his eyes give
       away is his business and nobody else's. An empty list here is the claim
       that the other five are not simply the party token appearing everywhere. */
    party: [],
  },
  {
    slug: 'while-the-nations-war',
    name: 'While the Nations War',
    badge: 'Persuasion',
    notes: 3,
    tags: 4,
    names: 'Khaonn',
    party: ['Ketza', 'Talon'],
  },
  {
    slug: 'when-they-ask-about-the-fire',
    name: 'Two Sentences About the Fire',
    badge: 'No roll',
    notes: 3,
    tags: 4,
    names: 'Selis',
    party: ['Rune Willow'],
  },
  {
    slug: 'the-face-that-opens-the-door',
    name: 'The Face That Opens the Door',
    badge: 'Persuasion, adv.',
    notes: 3,
    tags: 5,
    names: 'Shape-Shifter',
    party: ['Rune Willow', 'Ponzi', 'Ketza', 'Talon'],
  },
]

/** Eighteen. Written as the sum so that one card losing a note while another
 *  gains one still fails the per-card check above AND this one. */
const WANT_NOTES = EXPECTED.reduce((n, c) => n + c.notes, 0)

/* THE THREE CARDS THAT CARRY A RULE HE CAN CHECK, held on the glass. Two of
   them overrule `changling.txt`, which is a pre-2024 scrape two editions stale,
   so both have to name the document that replaces it — a card that says "your
   file is wrong" without saying which page to read instead is a card he cannot
   act on. The third quotes his own sheet back to him verbatim. */
const MUST_SAY = {
  'The Eyes You Never Change': ['CORRECTIONS.md', 'FEY', 'Hold Person', 'Magic Circle'],
  'The Face That Opens the Door': [
    'CORRECTIONS.md', 'Forge of the Artificer', 'is an ACTION', 'advantage on Charisma',
  ],
  'While the Nations War': ['While the nations war for power, we build what comes after'],
}
const says = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase())

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

const id = MARCUS.id
await page.addInitScript(
  ([json, id]) => {
    localStorage.setItem('codex-character-' + id, json)
    localStorage.setItem('codex-active-id', id)
    localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
  },
  [JSON.stringify(MARCUS), id],
)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  .click({ timeout: 15000 })
await page.waitForTimeout(600)

/* THE TAB PRESS, two to the right of where the Toybox opens. Reported on its own
   line, because a failed press makes every card below report "not painted" —
   true, but for the wrong reason. */
const switched = await page.evaluate(() => {
  for (const b of document.querySelectorAll('button')) {
    if ((b.textContent ?? '').trim() === 'Persona') { b.click(); return true }
  }
  return false
})
await page.waitForTimeout(500)

const stored = await page.evaluate(k => {
  const raw = localStorage.getItem(k)
  if (!raw) return { plays: [], all: 0 }
  const box = JSON.parse(raw)
  return {
    plays: box.personaPlays.map(p => p.id).filter(x => x.startsWith('seed:hearth-7-r2:')),
    all: box.personaPlays.length,
  }
}, 'codex-toybox-' + id)

const STORED_EXPECTED = EXPECTED.map(c => 'seed:hearth-7-r2:' + c.slug)
const storedRight = JSON.stringify(stored.plays) === JSON.stringify(STORED_EXPECTED)

/** Finding Q. */
const paintedTopmost = async text => {
  await page.evaluate(t => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== t) continue
      el.scrollIntoView({ block: 'center' })
      return
    }
  }, text)
  await page.waitForTimeout(250)
  return page.evaluate(t => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== t) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (top && (el === top || el.contains(top) || top.contains(el))) {
        return { box: `${Math.round(r.width)}x${Math.round(r.height)}`, ok: true }
      }
    }
    return { box: null, ok: false }
  }, text)
}

const openCard = async name => {
  const opened = await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if (!(b.textContent ?? '').includes(t)) continue
      if (b.getAttribute('aria-expanded') === 'false') b.click()
      return true
    }
    return false
  }, name)
  await page.waitForTimeout(350)
  return opened
}

const closeCard = async name => {
  await page.evaluate(t => {
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t) && b.getAttribute('aria-expanded') === 'true') b.click()
    }
  }, name)
  await page.waitForTimeout(200)
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL SIX
// ─────────────────────────────────────────────────────────────────────────────

const results = []

for (const want of EXPECTED) {
  const paint = await paintedTopmost(want.name)
  const opened = await openCard(want.name)

  const read = await page.evaluate(([t, pillWords]) => {
    let card = null
    for (const b of document.querySelectorAll('button[aria-expanded]')) {
      if ((b.textContent ?? '').includes(t)) { card = b.parentElement; break }
    }
    if (!card) return null
    const header = card.querySelector('button[aria-expanded]')

    /* The name is `line-clamp-3`. Measured, never counted — the badge beside it
       is what decides how much room three lines actually holds. */
    let nameClipped = null
    let nameBox = null
    for (const el of header.querySelectorAll('span.font-display')) {
      if ((el.textContent ?? '').trim() !== t) continue
      nameBox = `${Math.round(el.getBoundingClientRect().width)}x${el.clientHeight}`
      if (el.scrollHeight > el.clientHeight + 1) {
        nameClipped = { need: el.scrollHeight, got: el.clientHeight }
      }
    }

    /* The badge: read off the HEADER, because `skillCheck` strings like
       "Persuasion" are ordinary words that also appear in the body prose. It is
       the one leaf in the header that is neither the name nor an icon. */
    let badge = null
    let badgeWidth = 0
    for (const el of header.querySelectorAll('*')) {
      if (el.children.length) continue
      const s = (el.textContent ?? '').trim()
      if (!s || s === t) continue
      badge = s
      badgeWidth = Math.round(el.getBoundingClientRect().width)
    }

    /* The four labelled sections. Read by their own uppercase heading rather
       than by position, so a re-order of the card body does not read as a loss. */
    const labelled = {}
    for (const p of card.querySelectorAll('p')) {
      const s = (p.textContent ?? '').trim()
      if (['Situation', 'Approach', 'Key Phrases'].includes(s)) {
        labelled[s] = (p.nextElementSibling?.textContent ?? '').trim()
      }
    }

    /* Each key phrase is its own italic `<p>` with a left border. Counted, and
       then checked for the doubled quote the component's own `&ldquo;` produces
       when the phrase brought quotes of its own. */
    const phrases = [...card.querySelectorAll('p.italic')].map(p => (p.textContent ?? '').trim())

    /* An annotation is a `<p>` carrying an `sr-only` kind label — that span is
       the only thing that distinguishes a note from any other paragraph, and it
       is also the accessible name a screen reader gets. */
    const notes = [...card.querySelectorAll('p')].filter(p => p.querySelector('span.sr-only'))
    const noteKinds = notes
      .map(p => (p.querySelector('span.sr-only')?.textContent ?? '').replace(':', '').trim())

    /* Tags are the neutral badges at the foot of the card. Counted off the last
       flex-wrap row so the eldritch header badge is not swept in with them. */
    const tagRow = [...card.querySelectorAll('div.flex-wrap')].pop()
    const tags = tagRow ? [...tagRow.children].map(el => (el.textContent ?? '').trim()) : []

    /* THE DISTINCTION, TWICE — same two detectors slice 5 proved on a real
       combo card, so a green here is a real absence and not a blind selector. */
    const deployLabelled = !!card.querySelector('button[aria-label="Deploy combo"]')
    const deployWorded = [...card.querySelectorAll('button')]
      .some(b => /deploy/i.test(b.textContent ?? ''))

    const pills = []
    for (const el of card.querySelectorAll('*')) {
      if (el.children.length) continue
      const s = (el.textContent ?? '').trim()
      if (pillWords.includes(s)) pills.push(s)
    }

    const text = card.textContent ?? ''

    return {
      nameClipped,
      nameBox,
      badge,
      badgeWidth,
      situation: labelled.Situation ?? '',
      approach: labelled.Approach ?? '',
      phrases,
      notes: notes.length,
      noteKinds,
      tags,
      deployLabelled,
      deployWorded,
      pills,
      edit: !!card.querySelector('button[aria-label="Edit persona play"]'),
      del: !!card.querySelector('button[aria-label="Delete persona play"]'),
      braces: text.includes('{{'),
      doubled: /““|””/.test(text),
      text,
    }
  }, [want.name, PILL_WORDS])

  const mustSay = MUST_SAY[want.name] ?? []
  const missing = read ? mustSay.filter(s => !says(read.text, s)) : mustSay

  /* Every phrase is quoted BY THE COMPONENT, so a correctly authored one opens
     with a left double quote and never with two. */
  const quotedRight = !!read
    && read.phrases.length >= 2
    && read.phrases.every(p => p.startsWith('“') && p.endsWith('”'))

  /* Both halves, because either alone is worthless. A missing name means the
     token did not resolve; a name that should not be there means the card is
     talking to somebody it was not written for. */
  const partyMissing = read ? want.party.filter(n => !read.text.includes(n)) : want.party
  const partyExtra = read
    ? PARTY_NAMES.filter(n => !want.party.includes(n) && read.text.includes(n))
    : []

  results.push({
    name: want.name,
    painted: paint.ok,
    box: paint.box,
    opened,
    nameBox: read?.nameBox ?? null,
    nameClipped: read?.nameClipped ?? null,
    badge: read?.badge ?? null,
    badgeRight: read?.badge === want.badge,
    badgeWidth: read?.badgeWidth ?? 0,
    hasBody: !!read && read.situation.length > 20 && read.approach.length > 20,
    phrases: read?.phrases.length ?? 0,
    quotedRight,
    doubled: read?.doubled ?? false,
    notes: read?.notes ?? 0,
    noteKinds: read?.noteKinds ?? [],
    notesRight: read?.notes === want.notes,
    tags: read?.tags.length ?? 0,
    tagsRight: read?.tags.length === want.tags,
    licensed: !!read && says(read.text, want.names),
    licensedName: want.names,
    wantParty: want.party,
    partyMissing,
    partyExtra,
    deploy: !!(read?.deployLabelled || read?.deployWorded),
    pills: read?.pills ?? [],
    edit: read?.edit ?? false,
    del: read?.del ?? false,
    braces: read?.braces ?? false,
    missing,
    ok:
      paint.ok
      && opened
      && !read?.nameClipped
      && read?.badge === want.badge
      && (read?.badge.length ?? 99) <= 24
      && !!read && read.situation.length > 20 && read.approach.length > 20
      && quotedRight
      && !read.doubled
      && read.notes === want.notes
      && read.tags.length === want.tags
      && says(read.text, want.names)
      && partyMissing.length === 0
      && partyExtra.length === 0
      && !read.deployLabelled
      && !read.deployWorded
      && read.pills.length === 0
      && read.edit
      && read.del
      && !read.braces
      && missing.length === 0,
  })

  await closeCard(want.name)
}

await ctx.close()
await browser.close()

// ─── Report ───

const totalNotes = results.reduce((n, r) => n + r.notes, 0)

console.log(`\n── tab: ${switched ? 'switched to Persona' : 'FAIL — never found the Persona tab'}`)

console.log(`\n── storage: round two's six, in pack order — none of them gated`)
console.log(`   ${stored.plays.map(x => x.replace('seed:hearth-7-r2:', '')).join(', ') || '(none)'}`)
console.log(`   round one still present alongside them: ${stored.all - stored.plays.length} plays`)
console.log(`   ${storedRight ? 'PASS' : 'FAIL — wrong set or wrong order'}`)

for (const r of results) {
  console.log(`\n── ${r.name}`)
  console.log(`   painted: ${r.painted} ${r.box ?? ''}   opened: ${r.opened}   braces: ${r.braces} (must be false)`)
  console.log(`   badge: "${r.badge ?? '(none)'}" ${r.badge?.length ?? 0} chars, ${r.badgeWidth}px ${r.badgeRight ? '' : '← WRONG'}`)
  console.log(`   name box: ${r.nameBox ?? '(none)'}${r.nameClipped ? ` ← CLIPPED: needs ${r.nameClipped.need}px, given ${r.nameClipped.got}px` : ''}`)
  console.log(`   situation + approach painted: ${r.hasBody}   ${r.phrases} key phrases, quoted once each: ${r.quotedRight}   doubled quotes: ${r.doubled} (must be false)`)
  console.log(`   ${r.notes} notes (${r.noteKinds.join(' · ') || 'none'}) ${r.notesRight ? '' : '← WRONG'}   ${r.tags} tags ${r.tagsRight ? '' : '← WRONG'}`)
  console.log(`   names "${r.licensedName}" on the card: ${r.licensed} (the licence, exercised)`)
  console.log(`   party tokens → ${r.wantParty.join(', ') || '(none, on purpose)'}${r.partyMissing.length ? ` ← MISSING ${r.partyMissing.join(', ')}` : ''}${r.partyExtra.length ? ` ← UNWANTED ${r.partyExtra.join(', ')}` : ''}`)
  console.log(`   Deploy offered: ${r.deploy} (must be false)   action-economy pills: ${r.pills.join(' · ') || 'none'} (must be none)`)
  console.log(`   Edit: ${r.edit}   Delete: ${r.del}`)
  if (r.missing.length) console.log(`   MISSING FROM THE CARD: ${r.missing.map(s => `"${s}"`).join(', ')}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

console.log(`\n── the whole tab: ${totalNotes} of ${WANT_NOTES} annotations painted across ${results.length} plays`)
console.log(`   ${totalNotes === WANT_NOTES ? 'PASS — resolveNotes dropped nothing' : 'FAIL — notes went missing, which is exactly how they go missing'}`)

const failed = results.filter(r => !r.ok)
const allOk = switched && storedRight && failed.length === 0 && totalNotes === WANT_NOTES
console.log(
  `\n${allOk
    ? 'PASS — six persona plays painted, every one of them about somebody he knows'
    : `FAIL — ${[
      ...(switched ? [] : ['tab']),
      ...(storedRight ? [] : ['storage']),
      ...failed.map(r => r.name),
      ...(totalNotes === WANT_NOTES ? [] : ['annotation count']),
    ].join(', ')}`}`,
)
process.exit(allOk ? 0 : 1)
