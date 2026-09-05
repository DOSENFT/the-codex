/* ===========================================================================
   THE TRACER, AS PAINTED — round two, slice 1.

   Round two's whole risk is in the engine, not the prose. The engine claim is:

     a Toybox that already holds round one, and is already MARKED as holding
     it, must still receive round two — appended, once, without disturbing a
     single thing that is already there.

   `seed.test.ts` proves that against objects in memory. It cannot prove the
   second pack reaches the glass on a phone that has been running round one
   for a week, and that phone is the only installation that matters.

   THREE SHEETS, and two of them are supposed to get nothing:

     arrives      Sentinel + a reach glaive → The Sentinel Gate lands on top of
                  an untouched round one
     no-feat      a reach glaive but no Sentinel → the Gate is absent
     short-sword  Sentinel but a five-foot blade → the Gate is absent

   THE LAST TWO ARE THE POINT. The Gate is a combo about holding a lane with a
   reach weapon and punishing whoever crosses it. On a paladin without the feat
   it is a lie; on one with a short sword `{{weaponReach}}` resolves to 5 and
   the card renders PERFECTLY while describing a thing he cannot do. No token
   can see either failure. `needs` is the gate that can, and these two cases are
   the only place it is proved against a real screen.

   HOW `arrives` BUILDS ITS STARTING STATE, and why it is honest. It does not
   hand-write round one into storage — it lets the REAL seeder write the real
   thirty-one entries and the real `hearth-7` marker, then REMOVES round two's
   entries and round two's marker from what the seeder wrote. What is left is
   the store the shipping code produced for round one, which is what Marcus's
   phone has held since he published on 2026-09-03. Only then is the sheet
   upgraded and the page reloaded. Every byte still came from the code path;
   subtraction is how a state from before a feature existed is reached once the
   feature exists.

   SLICE 2 FORCED THAT, and the reason is worth keeping. Slice 1 reached the
   same state by seeding as a paladin who could not earn round two — which
   worked only because round two then held one Sentinel-gated combo and a pack
   that delivers nothing is never marked. Slice 2's three ungated combos deliver
   to every paladin in the gate, so that sheet now gets the marker too, and the
   upgraded sheet met a pack already recorded as done.

   WHICH SURFACED A REAL GAP, and it is a product question rather than a bug in
   this file: A PACK IS APPLIED ONCE PER CHARACTER AND NEVER TOPS UP. A paladin
   who opens the Toybox today without Sentinel has round two marked as
   delivered; if he takes Sentinel at level 8, "The Sentinel Gate" will not
   appear, because the pack is done. The same was already true in round one for
   every weapon combo an archer could not resolve. It does not affect Marcus —
   his sheet carries Sentinel and Graze today, so he earns everything on first
   open, which `prove-r2-slice2.mjs` shows. It is recorded in `00-status.md` as
   a decision for him rather than fixed here.

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

/* Round one, exactly: 14 combos + 12 tactics + 5 persona plays. The literal is
   kept rather than softened to `>=`, for the reason `prove-slice1.mjs` records
   at length — a count that only asserts "something arrived" cannot see a
   double-append, and a double-append is precisely what round two risked by
   giving the same character two packs in one pass. */
const R1_COMBOS = 14
const R1_TACTICS = 12
const R1_PERSONA = 5

/* AND ROUND TWO'S SHARE OF THE OTHER TWO TABS, NAMED. Slice 3 shipped round
   two's first tactic, which made `after.tactics.length === 12` false on all
   three sheets at once — a red that named no card, because a bare count cannot
   say whether a tactic was ADDED or one of round one's was LOST.

   So this is split the way `seed.test.ts` split it: round one's twelve are
   counted, round two's are LISTED. The two claims are then independent, and a
   round-one tactic going missing on the day a round-two one lands can no longer
   hide inside a total that happens to come out right.

   `R2_PERSONA` WAS EMPTY ON PURPOSE AND WAS NEVER A PLACEHOLDER — "round two
   ships no persona plays" was a true, falsifiable claim that caught a play
   authored into the wrong pack file. Slice 6 shipped the six, so the claim it
   makes now is the opposite one and is asserted the same way: by id, in paint
   order, on every sheet below. */
/** SLICE 5 TOOK ROUND TWO'S TACTICS FROM ONE TO EIGHT, and two of the eight
 *  are gated — so this stopped being a constant and became a function of the
 *  sheet, exactly as the combo list already was.
 *
 *  TWO GATES THAT LOOK LIKE ONE, AND THIS FILE IS WHAT CAUGHT THEM APART. The
 *  first draft reused `expectGate` for "Sentinel Is a Prison", on the reasoning
 *  that it needs the same feat "The Sentinel Gate" does. It does not. The COMBO
 *  needs Sentinel *and* a reach weapon, because it is a turn you take with a
 *  ten-foot blade. The TACTIC needs only the FEAT, because where to spend a
 *  Reaction is a decision you make holding anything. On the short-sword sheet
 *  those two answers differ — no Gate, but the tactic still arrives — and this
 *  file went red on exactly that sheet. Hence `expectSentinelFeat`, which is
 *  the honest question the tactic asks.
 *
 *  `expectTwoHanded` IS shared, and that one is genuinely the same question:
 *  "You Are a Glaive" and "Drop the Glaive" both ask whether the weapon in his
 *  hands has the Two-Handed property, and nothing else.
 *
 *  Order is `PACKS` order — authoring order — because the comparison below is
 *  `JSON.stringify`. The two gated cards are written third and fifth, so they
 *  splice into the middle of the list rather than appending to it. */
const r2Tactics = c => [
  'seed:hearth-7-r2:four-prepared-spells',
  'seed:hearth-7-r2:the-doctrine-trick',
  ...(c.expectTwoHanded ? ['seed:hearth-7-r2:glaive-not-sword-and-board'] : []),
  'seed:hearth-7-r2:the-shopping-list',
  ...(c.expectSentinelFeat ? ['seed:hearth-7-r2:sentinel-is-a-prison'] : []),
  'seed:hearth-7-r2:no-save-proficiencies',
  'seed:hearth-7-r2:ask-your-dm',
  'seed:hearth-7-r2:plate-and-the-face',
]
/* THE ONE ROUND-TWO LIST THAT IS NOT A FUNCTION OF THE SHEET. `r2Combos` and
   `r2Tactics` both take the case, because feats and weapon properties decide who
   earns what. None of the six persona plays carries a `needs` and none names a
   weapon: they want a face, a voice and a table, which all three sheets below
   have. So this is a constant, and its being a constant is the assertion — all
   six arriving unchanged on the no-feat and short-sword sheets is the cost of
   the scoped exception in `types.ts` made visible in real browser storage. */
const R2_PERSONA = [
  'seed:hearth-7-r2:fate-wants-something-stupid',
  'seed:hearth-7-r2:ask-scar',
  'seed:hearth-7-r2:the-eyes-you-never-change',
  'seed:hearth-7-r2:while-the-nations-war',
  'seed:hearth-7-r2:when-they-ask-about-the-fire',
  'seed:hearth-7-r2:the-face-that-opens-the-door',
]

/* SLICE 2 GAVE EVERY SHEET BELOW THREE MORE CARDS, AND THAT IS WHY THIS FILE
   STOPPED COUNTING ROUND TWO AND STARTED NAMING IT.

   In slice 1 round two was one gated entry, so "how many round-two combos are
   in storage" was a perfectly sharp question: one for the sheet that earns it,
   zero for the two that do not. Slice 2 shipped three entries gated on nothing,
   which every paladin in the window earns — so the `no-feat` and `short-sword`
   sheets now get three round-two combos each and a count could no longer tell
   "the Gate was correctly refused" from "the Gate arrived and something else
   was dropped".

   The claim these two cases were written to make is unchanged and is stated
   directly instead: the GATE is absent, by id, and the ungated three are
   present, by id. That is what `needs` is for and it is now asserted rather
   than inferred from arithmetic. */
const GATE_ID = 'seed:hearth-7-r2:the-sentinel-gate'
const GATE_NAME = 'The Sentinel Gate'

/** Gated on nothing, so all three sheets earn all six.
 *
 *  SLICE 3 ADDED THE LAST THREE and every one of them needs equipment none of
 *  these fixtures carries — ball bearings, a flask of oil, a shield. That is
 *  the `needs`-versus-`requirements` ruling reaching the glass: gear is
 *  something a player can go and buy, so it is asked for on the card and never
 *  used to delete the card. If any of these three ever stops arriving here,
 *  somebody has gated a combo on a shopping trip. */
const R2_UNGATED = [
  'seed:hearth-7-r2:three-people-stand-up',
  'seed:hearth-7-r2:the-free-crit',
  'seed:hearth-7-r2:through-the-door',
  'seed:hearth-7-r2:bearings-and-the-backward-walk',
  'seed:hearth-7-r2:one-silver-piece-of-fire',
  'seed:hearth-7-r2:the-shield-round',
]

/** SLICE 4'S CARD IS ALSO UNGATED, AND IT STILL COULD NOT GO IN THE LIST ABOVE.
 *  It is the tenth and last entry in the pack, so in `PACKS` order it sorts
 *  BEHIND the gated "Drop the Glaive" — and the expected set below is compared
 *  with `JSON.stringify`, where order is the whole point. Splicing it into
 *  `R2_UNGATED` would have produced a list that is right about which cards
 *  arrive and wrong about the order they arrive in, which is exactly the class
 *  of error these lists exist to catch.
 *
 *  It is unconditional here because all three fixtures in this file carry a
 *  melee weapon. It does name `{{weapon}}` and `{{weaponReach}}` in fields that
 *  kill the card if they cannot resolve — the sheet that proves that refusal is
 *  the archer in `prove-slice2.mjs`, not any sheet here. */
const KILLER_ID = 'seed:hearth-7-r2:the-caster-killer'

/** Slice 3's one gated card. `withReach` gives a fixture Reach AND Two-Handed
 *  together, because Marcus's real glaive has both — so the two sheets that
 *  carry the glaive earn this and the short-sword sheet does not. It is listed
 *  separately from the Gate because the two are refused for different reasons
 *  and a single flag would stop the prover telling them apart. */
const TWO_HANDED_ID = 'seed:hearth-7-r2:drop-the-glaive'

const SENTINEL = { name: 'Sentinel', description: '', isHomebrew: false, effects: [] }

/** The fixture's Hearthbrand is Versatile and five feet. Marcus's real weapon,
 *  The Dawn Guardian, is Two-Handed with Reach — so the reach glaive is the
 *  edit, and the untouched fixture is already the short-sword case. */
const withReach = c => ({
  ...c,
  weapons: c.weapons.map(w =>
    w.attackType === 'melee'
      ? { ...w, properties: [...(w.properties ?? []), 'Reach', 'Two-Handed'] }
      : w),
})

const base = { ...nix, level: 7 }

const CASES = [
  {
    id: 'arrives',
    what: 'a Toybox already holding round one, on a sheet that earns round two',
    /* Seeded as a paladin who cannot earn the Gate, then upgraded. See the
       header: this is how the "before" state is made of real bytes. */
    character: withReach(base),
    before: base,
    expectGate: true,
    expectTwoHanded: true,
    expectSentinelFeat: true,
    expectPacks: ['hearth-7', 'hearth-7-r2'],
  },
  {
    id: 'no-feat',
    what: 'the same glaive, but no Sentinel — the Gate would be a lie',
    character: withReach({ ...base, feats: [] }),
    expectGate: false,
    expectTwoHanded: true,
    /* No feats at all, so the tactic goes too — and it is the only one of the
       three sheets where the combo and the tactic agree by accident. */
    expectSentinelFeat: false,
    /* MARKED NOW, AND IT WAS NOT IN SLICE 1. Round two used to deliver nothing
       to this sheet, so writing a marker would have locked it out of the pack
       forever. It now delivers three, so the marker is a true record of a real
       delivery — and the Gate is still correctly refused inside it, which is
       the finer claim and the one asserted by id below. */
    expectPacks: ['hearth-7', 'hearth-7-r2'],
  },
  {
    id: 'short-sword',
    what: 'Sentinel, but a five-foot blade — the Gate would render and be wrong',
    character: { ...base, feats: [SENTINEL] },
    expectGate: false,
    /* Versatile, not Two-Handed — nothing to drop, so the card is refused. */
    expectTwoHanded: false,
    /* BUT THE FEAT IS ON THE SHEET, so the Sentinel TACTIC arrives even though
       the Sentinel COMBO does not. This is the sheet that proves the two gates
       are two gates, and it is the sheet the first draft got wrong. */
    expectSentinelFeat: true,
    expectPacks: ['hearth-7', 'hearth-7-r2'],
  },
]

/* `arrives` needs the feat on the sheet it is UPGRADED to, not the one it
   starts on. Applied here so the `before` sheet above stays plainly featless. */
CASES[0].character = { ...CASES[0].character, feats: [SENTINEL] }

const openToybox = async page => {
  const opener = page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  await opener.click({ timeout: 15000 })
  await page.waitForTimeout(600)
}

const readStore = (page, id) =>
  page.evaluate(k => {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    const d = JSON.parse(raw)
    return {
      combos: d.combos.map(c => c.id),
      tactics: d.tactics.map(t => t.id),
      personaPlays: d.personaPlays.map(p => p.id),
      seededPacks: d.seededPacks ?? null,
    }
  }, 'codex-toybox-' + id)

const browser = await chromium.launch()
const results = []

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  const id = c.character.id
  const first = c.before ?? c.character

  /* THE GUARD IS LOAD-BEARING AND COST ONE RUN. `addInitScript` re-runs on
     every navigation, reload included — an unconditional write here put the
     PRE-upgrade sheet back before the app ever read it, and the `arrives` case
     reported that round two never arrived while the engine was fine. Writing
     only into an empty slot makes this a seed rather than a fixture. */
  await page.addInitScript(
    ([json, id]) => {
      if (!localStorage.getItem('codex-character-' + id))
        localStorage.setItem('codex-character-' + id, json)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
    },
    [JSON.stringify(first), id],
  )

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await openToybox(page)

  let before = await readStore(page, id)

  if (c.before) {
    /* ROLL THE STORE BACK TO THE DAY BEFORE ROUND TWO EXISTED — added in slice
       2, and it is the difference between this case proving something and
       proving nothing.

       The original trick was to seed as a paladin who could not earn round two
       and then upgrade the sheet. That worked in slice 1 for one reason only:
       round two held a single Sentinel-gated combo, the weak sheet earned
       NOTHING from it, and a pack that delivers nothing is not marked. Slice 2
       shipped three combos gated on nothing. Now the weak sheet earns them, the
       marker IS written, and the upgraded sheet walks into an already-marked
       pack — so the Gate never arrives and this case failed while `seed.ts` was
       entirely correct.

       So the round-one-only state is built by SUBTRACTION instead. The seeder
       still wrote every byte; round two's entries and its marker are then
       removed, which is precisely what "this device was last opened before
       round two existed" means. Nothing is transcribed and nothing is invented
       — strip the r2 prefix and the r2 marker and what remains is the store the
       shipping code produced for round one.

       AND THIS IS NOT A CONVENIENCE. It is Marcus's actual situation: he
       published round one on 2026-09-03 and his phone holds exactly this. The
       upgrade being proved here is the one he is about to perform. */
    await page.evaluate(id => {
      const key = 'codex-toybox-' + id
      const data = JSON.parse(localStorage.getItem(key))
      const roundOne = x => !x.id.startsWith('seed:hearth-7-r2:')
      data.combos = data.combos.filter(roundOne)
      data.tactics = data.tactics.filter(roundOne)
      data.personaPlays = data.personaPlays.filter(roundOne)
      data.seededPacks = (data.seededPacks ?? []).filter(p => p !== 'hearth-7-r2')
      localStorage.setItem(key, JSON.stringify(data))
    }, id)
    before = await readStore(page, id)

    /* The upgrade. The Toybox key is deliberately left alone — that is the
       whole subject: an existing, marked Toybox meeting a new pack. */
    await page.evaluate(
      ([json, id]) => localStorage.setItem('codex-character-' + id, json),
      [JSON.stringify(c.character), id],
    )
    await page.reload({ waitUntil: 'networkidle' })
    await openToybox(page)
  }

  const after = await readStore(page, id)

  /* SCROLL FIRST, AND THIS TOO COST A RUN. The Gate is the fifteenth combo, so
     on a 390×844 phone it lands around y=1369 — off screen, where
     `elementFromPoint` cannot answer and the geometric check reads OCCLUDED for
     a card that is perfectly fine. Scrolling is what a person does; refusing to
     scroll would only prove the card is not in the first screenful, which is
     not a claim anybody made. The occlusion check still has to pass AFTER the
     scroll, so nothing is weakened — the card must be visible, not merely
     present. */
  await page.evaluate(name => {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== name) continue
      el.scrollIntoView({ block: 'center' })
      return
    }
  }, GATE_NAME)
  await page.waitForTimeout(400)

  const painted = await page.evaluate(name => {
    const hits = []
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if ((el.textContent ?? '').trim() !== name) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      hits.push({
        box: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
        topmost: !!top && (el === top || el.contains(top) || top.contains(el)),
      })
    }
    return hits
  }, GATE_NAME)

  const seenPainted = painted.some(p => p.topmost)

  // ── The claims ──
  const combos = after?.combos ?? []
  const r1Combos = combos.filter(x => x.startsWith('seed:hearth-7:'))
  const r2Combos = combos.filter(x => x.startsWith('seed:hearth-7-r2:'))

  const r2 = x => x.startsWith('seed:hearth-7-r2:')
  const tactics = after?.tactics ?? []
  const plays = after?.personaPlays ?? []

  const noDupes = new Set(combos).size === combos.length
  const r1Intact =
    r1Combos.length === R1_COMBOS
    && tactics.filter(x => !r2(x)).length === R1_TACTICS
    && plays.filter(x => !r2(x)).length === R1_PERSONA

  /* Round two's tactics and plays, by id — the other half of the split. */
  const r2ExtrasRight =
    JSON.stringify(tactics.filter(r2)) === JSON.stringify(r2Tactics(c))
    && JSON.stringify(plays.filter(r2)) === JSON.stringify(R2_PERSONA)

  /* Appended, not interleaved. Round one must still be the first fourteen —
     if round two ever lands in the middle, every card Marcus has learned the
     position of moves, which is a worse outcome than not shipping. */
  const appended = combos.slice(0, R1_COMBOS).every(x => x.startsWith('seed:hearth-7:'))

  const gateStored = combos.includes(GATE_ID)
  const packsRight =
    JSON.stringify(after?.seededPacks ?? null) === JSON.stringify(c.expectPacks)

  /* Round two's share, NAMED rather than counted — see the note above
     `R2_UNGATED`. The expected set is the ungated six, plus the Gate for the
     sheets that earn it, plus "Drop the Glaive" for the sheets holding a
     Two-Handed weapon, plus "The Caster Killer", which every armed sheet earns.
     Order is `PACKS` order, which is authoring order: the Gate leads, and the
     last two are last in the order they were written, not in the order their
     gates are checked. */
  const expectR2 = [
    ...(c.expectGate ? [GATE_ID] : []),
    ...R2_UNGATED,
    ...(c.expectTwoHanded ? [TWO_HANDED_ID] : []),
    KILLER_ID,
  ]
  const r2Right = JSON.stringify(r2Combos) === JSON.stringify(expectR2)

  const ok = c.expectGate
    ? seenPainted && gateStored && r2Right && r1Intact && r2ExtrasRight && noDupes && appended && packsRight
    : !seenPainted && !gateStored && r2Right && r1Intact && r2ExtrasRight && noDupes && appended && packsRight

  results.push({
    id: c.id, what: c.what, ok, seenPainted, painted,
    before, after, r1Intact, r2ExtrasRight, noDupes, appended, packsRight, gateStored,
    r2Right, r2Combos,
  })

  await ctx.close()
}

await browser.close()

for (const r of results) {
  console.log(`\n── ${r.id} — ${r.what}`)
  if (r.before) {
    console.log(`   before: ${r.before.combos.length} combos, ${r.before.tactics.length} tactics, ${r.before.personaPlays.length} plays, packs ${JSON.stringify(r.before.seededPacks)}`)
  }
  console.log(`   after:  ${r.after?.combos.length ?? 0} combos, ${r.after?.tactics.length ?? 0} tactics, ${r.after?.personaPlays.length ?? 0} plays, packs ${JSON.stringify(r.after?.seededPacks ?? null)}`)
  console.log(`   "${GATE_NAME}" painted: ${r.seenPainted}  ${r.painted.map(p => p.box + (p.topmost ? ' topmost' : ' OCCLUDED')).join(' | ')}`)
  console.log(`   round two got: ${r.r2Combos.map(id => id.replace('seed:hearth-7-r2:', '')).join(', ') || '(nothing)'}  → ${r.r2Right ? 'exactly right' : 'WRONG SET'}`)
  console.log(`   in storage: ${r.gateStored}   round one intact: ${r.r1Intact}   round two's tactics/plays right: ${r.r2ExtrasRight}   no duplicates: ${r.noDupes}   appended last: ${r.appended}   markers right: ${r.packsRight}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length ? `FAIL — ${failed.map(r => r.id).join(', ')}` : 'PASS — all three sheets'}`)
process.exit(failed.length ? 1 : 0)
