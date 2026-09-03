/* ===========================================================================
   THE PERSONA TAB, ON THE GLASS — slice 8 of the Toybox seed.

   The Persona tab is the one tab with NO category chips — `ToyboxPersonaPlay`
   has no `category` field — so the two claims slice 6 and slice 7 made about
   filters do not exist here. What is here instead is the claim the unit tests
   can only approximate: the `skillCheck` badge is a Badge in a flex row beside
   a 44px star, a `truncate` name span and a chevron, and the unit test enforces
   a 24-character budget because 24 is what MEASURED as safe once. This prover
   measures it instead of trusting the number: it reads `scrollWidth` against
   `clientWidth` on each name span at 390px and fails if any name is actually
   clipped. If the budget is wrong, this is what says so.

     all-five     Persona tab, Marcus's sheet
                  → all five names painted, by name. Slice 5 shipped one; four
                    were written in one sitting and never seen rendered.

     badges       the collapsed header row, 390px
                  → every badge painted, and NO NAME CLIPPED. Not horizontally
                    (`scrollWidth` vs `clientWidth`) and not vertically
                    (`scrollHeight` vs `clientHeight`) — the second half is not
                    pedantry, because the fix that removed the horizontal
                    clipping can only reintroduce it as vertical clipping. See
                    below.

                    THE MEASUREMENT FAILED THE FIRST TIME IT WAS TAKEN, on
                    2026-09-03, and the finding was bigger than this slice. All
                    five names were truncated — including "The Paladin Who Asks
                    First", which shipped in slice 5 and had been on Marcus's
                    phone since. The unit test's `skillCheck.length <= 24` was a
                    proxy for a layout claim that had never been true on any tab:
                    `ComboCard`, `TacticCard` and `PersonaPlayCard` all put the
                    name in a `truncate` span, and 21 of 31 names were clipped.

                    Marcus chose the layout fix over renaming the cards, and
                    slice 9 made it: `truncate` → `line-clamp-3` on all three.
                    Short names render exactly as before; long ones wrap to a
                    second line instead of losing their tail. The baselines in
                    `PLAYS` below are now 0, which is the standard rather than a
                    carried defect.

                    WHY THE VERTICAL CHECK EXISTS. A clamp still clips —
                    it clips at N LINES instead of one line's width, and a
                    name needing three lines fails silently in exactly the way
                    the old `truncate` did, with `scrollWidth === clientWidth`
                    the whole time. The horizontal check alone would go green on
                    a name it could not read. So both are asserted.

     house        the same sheet, all three tabs, MEASUREMENT ONLY
                  → how many card names are clipped on Combos, Tactics and
                    Persona, counting both axes. This block has no pass/fail on
                    purpose: it exists so the write-up quotes numbers instead of
                    an inference, and a block that cannot fail must say so
                    rather than pad a green count.

     phrases      each play opened in turn
                  → its key phrases painted, and NO doubled curly quote anywhere
                    on screen. `PersonaPlayCard` wraps each phrase in
                    `&ldquo;…&rdquo;` itself, so a phrase carrying its own
                    quotes paints as ““like this””. That was a real defect found
                    on the glass in slice 5, on the one play that existed; four
                    more have been written by hand since, and the failure is
                    invisible in the source.
                  → the two party notes resolve to real names — {{ranger}} and
                    {{rogue}} paint as Ketza and Ponzi, not as braces.

     orphan-five  the same sheet with `backstory.relationships` emptied
                  → all five still paint, "Never promise safety" survives, and
                    the party note that names two of them is gone with no member
                    named anywhere. Slice 5 proved this rule when one play had
                    one annotation; it now has to hold across nine.

   WHAT IS DELIBERATELY NOT HERE: any assertion that the tab omits Marcus's
   backstory. `pack-hearth-7.test.ts` checks that by name against the resolved
   objects, which is both cheaper and exact; a browser can only say a string is
   not painted, which is also true of a string that is merely below the fold.

   Finding Q still governs: a string counts as painted only when its own leaf
   element has a box with area and is topmost at its own centre, and the leaf is
   scrolled into view first because `elementFromPoint` returns null below the
   fold. See the helper's comment in `prove-slice4.mjs`.

   NOTHING IS SPENT. No AI config is seeded, so no request to any model host is
   made; this feature does not touch that path.
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

const RELATIONSHIPS = [
  { name: 'Rune Willow', relation: 'Party member (Wizard) — quiet, inquisitive.', status: 'alive' },
  { name: 'Ponzi', relation: 'Party member (Rogue) — observant, reserved.', status: 'alive' },
  { name: 'Ketza', relation: 'Party member (Ranger) — young wood elf.', status: 'alive' },
  { name: 'Talon', relation: 'Party member (Bard) — rock gnome tinker.', status: 'alive' },
  { name: 'Scar', relation: 'Goliath. Partner, moral compass. Only person besides the party who knows Nix is a changeling.', status: 'alive' },
]

const sheet = (relationships) => ({
  ...nix,
  level: 7,
  abilityScores: { ...nix.abilityScores, CHA: 16 },
  backstory: {
    origin: '', keyMemories: [], unresolvedThreads: [], personalitySeeds: [],
    relationships,
  },
})

const marcus = sheet(RELATIONSHIPS)
const orphan = sheet([])
const ID = marcus.id

/* The five, in the order `hearth-7.persona.ts` declares them, each with the
   badge that renders beside it and one phrase opening long enough to be unique.
   Typed out rather than imported, deliberately — importing the pack would let a
   rename pass unnoticed on both sides at once.

   Plays 1 and 3 both open a phrase with "You don't have to", which is exactly
   the kind of collision `painted`'s substring match cannot see, so the openings
   below are cut past the point where they diverge.

   `overflow` WAS the carried baseline described in the header: the pixels by
   which the name span exceeded the box it was given, measured at 390px in
   headless Chromium. It is now 0 for all five, and that is not a re-baselining
   — Marcus chose the layout fix on 2026-09-03 and slice 9 made it. The name
   spans on all three card types were `truncate` (nowrap + ellipsis) and are now
   `line-clamp-3`, so a long name wraps instead of losing its tail. Zero is the
   standard again, the way it should always have been. */
const PLAYS = [
  {
    name: 'The Paladin Who Asks First',
    badge: 'Persuasion',
    phrase: 'You don’t have to let us in.',
    overflow: 0,
  },
  {
    name: 'The Work Before the Ask',
    badge: 'Work first, then ask',
    phrase: 'Your woodpile is low and I have arms.',
    overflow: 0,
  },
  {
    name: 'Gather Them In',
    badge: 'No roll — just do it',
    phrase: 'You don’t have to tell me anything tonight.',
    overflow: 0,
  },
  {
    name: 'Standing Between',
    badge: 'Intimidation',
    phrase: 'I’m not going to move.',
    overflow: 0,
  },
  {
    name: 'When the Oath Says No',
    badge: 'No roll — party talk',
    phrase: 'I won’t do it that way.',
    overflow: 0,
  },
]

const SLACK = 2   // sub-pixel text metrics; anything past this is a real change

const browser = await chromium.launch()

// ── helpers (identical to prove-slice7.mjs; see its comments) ──

const painted = (page, needle) => page.evaluate(needle => {
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    if (!(el.textContent ?? '').trim().includes(needle)) continue
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue
    return true
  }
  return false
}, needle)

/** THE MEASUREMENT THE UNIT TEST CANNOT MAKE. A clipped name does not break the
 *  row — it silently loses its tail, and the card still looks fine to a
 *  screenshot. The only honest signal is the element's own overflow, on BOTH
 *  axes: `truncate` overflowed horizontally, any `line-clamp-N` overflows
 *  vertically, and a check that watches one axis goes green on the other. That
 *  is not hypothetical — clamp-2 was measured green horizontally while two
 *  names were still losing their third line, and clamp-3 is what fixed it. One
 *  pixel of slack for sub-pixel text metrics; anything past that is a name he
 *  cannot read. */
const nameFit = (page, name) => page.evaluate(name => {
  for (const el of document.querySelectorAll('span.font-display')) {
    if ((el.textContent ?? '').trim() !== name) continue
    el.scrollIntoView({ block: 'center' })
    return {
      client: Math.round(el.clientWidth),
      scroll: Math.round(el.scrollWidth),
      clientH: Math.round(el.clientHeight),
      scrollH: Math.round(el.scrollHeight),
      truncated: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
    }
  }
  return null
}, name)

/** `&ldquo;` doubled. Reads rendered text, not source, which is the point:
 *  the doubling only exists after the card has wrapped the phrase. */
const doubledQuotes = page => page.evaluate(() => {
  const t = document.body.innerText
  return t.includes('““') || t.includes('””')
})

async function newPage(character) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.addInitScript(
    ([json, id]) => {
      localStorage.setItem('codex-character-' + id, json)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
    },
    [JSON.stringify(character), ID],
  )
  return { ctx, page }
}

async function openToybox(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
    .click({ timeout: 15000 })
  await page.waitForTimeout(600)
}

const tab = async (page, label) => {
  await page.locator(`button:has-text("${label}")`).first().click({ timeout: 10000 })
  await page.waitForTimeout(400)
}

/* `expandedId` is a single value — opening one card closes the last. So each
   card is opened and closed again rather than left open, so that "painted"
   never means "painted on the card before this one". */
const toggle = async (page, name) => {
  await page.locator(`button[aria-expanded]:has-text("${name}")`).first()
    .click({ timeout: 10000 })
  await page.waitForTimeout(400)
}

const results = []
const record = (id, what, ok, lines) => results.push({ id, what, ok, lines })

// ── CASE 1: all five reach the tab ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Persona')

  const names = {}
  for (const p of PLAYS) names[p.name] = await painted(page, p.name)

  const missing = Object.entries(names).filter(([, v]) => !v).map(([k]) => k)
  record('all-five', 'every play slice 8 wrote is on the Persona tab', missing.length === 0, [
    ...PLAYS.map(p => `${p.name.padEnd(30)} ${names[p.name]}`),
    `missing: ${missing.length ? missing.join(', ') : 'none'}`,
  ])
  await ctx.close()
}

// ── CASE 2: the badge fits, and takes no part of the name with it ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Persona')

  const lines = []
  let ok = true
  for (const p of PLAYS) {
    const badge = await painted(page, p.badge)
    const fit = await nameFit(page, p.name)
    const over = fit ? Math.max(0, fit.scroll - fit.client, fit.scrollH - fit.clientH) : null
    const worse = over === null || over > p.overflow + SLACK
    if (!badge || worse) ok = false
    lines.push(`${p.name.padEnd(30)} badge ${String(badge).padEnd(6)} `
      + (fit
        ? `${String(fit.scroll).padStart(3)}×${String(fit.scrollH).padStart(2)}px in `
          + `${String(fit.client).padStart(3)}×${String(fit.clientH).padStart(2)}px  `
          + `over ${String(over).padStart(2)}px (budget ${p.overflow}px)`
        : 'NAME SPAN NOT FOUND'))
  }
  record('badges', 'every badge paints and no name is clipped on either axis', ok, lines)
  await ctx.close()
}

// ── CASE 3: the phrases, the quotes, and the two party tokens ──
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)
  await tab(page, 'Persona')

  const lines = []
  let ok = true
  for (const p of PLAYS) {
    await toggle(page, p.name)
    const phrase = await painted(page, p.phrase)
    const doubled = await doubledQuotes(page)
    const brace = await painted(page, '{{')
    if (!phrase || doubled || brace) ok = false
    lines.push(`${p.name.padEnd(30)} phrase ${String(phrase).padEnd(6)} `
      + `doubled-quote ${String(doubled).padEnd(6)} unresolved-brace ${brace}`)

    /* The only two plays that spend a party token. {{ranger}} and {{rogue}} are
       Ketza and Ponzi on this sheet; a card that painted "the ranger" would
       pass every unit test in the folder and still be the wrong card. */
    if (p.name === 'Gather Them In') {
      const ketza = await painted(page, 'Ketza')
      const ponzi = await painted(page, 'Ponzi')
      if (!ketza || !ponzi) ok = false
      lines.push(`${''.padEnd(30)} {{ranger}} → Ketza ${ketza},  {{rogue}} → Ponzi ${ponzi}`)
    }
    if (p.name === 'When the Oath Says No') {
      const plan = await painted(page, 'Ponzi’s plan')
      if (!plan) ok = false
      lines.push(`${''.padEnd(30)} {{rogue}}’s plan → "Ponzi’s plan" ${plan}`)
    }

    await toggle(page, p.name)
  }
  record('phrases', 'every play speaks, in one pair of quotes, with its tokens spent', ok, lines)
  await ctx.close()
}

// ── CASE 4: no party → the four new plays obey the same rule ──
{
  const { ctx, page } = await newPage(orphan)
  await openToybox(page)
  await tab(page, 'Persona')

  const present = {}
  for (const p of PLAYS) present[p.name] = await painted(page, p.name)
  const allPresent = Object.values(present).every(Boolean)

  /* "Gather Them In" is the sharpest card for this: two annotations, of which
     exactly one names party members. The other must survive. */
  await toggle(page, 'Gather Them In')
  const warning = await painted(page, 'Never promise safety')
  const partyLine = await painted(page, 'will want to move on')
  const named = {}
  for (const n of ['Rune Willow', 'Ponzi', 'Ketza', 'Talon']) {
    named[n] = await painted(page, n)
  }
  const anyNamed = Object.values(named).some(Boolean)

  const ok = allPresent && warning && !partyLine && !anyNamed
  record('orphan-five', 'five keep, and only the party note goes', ok, [
    `all five painted:     ${allPresent}`,
    ...Object.entries(present).filter(([, v]) => !v).map(([k]) => `   MISSING: ${k}`),
    `"Never promise safety": ${warning}`,
    `party note:           ${partyLine}  (must be false)`,
    ...Object.entries(named).map(([k, v]) => `${k.padEnd(21)} ${v}  (must be false)`),
  ])
  await ctx.close()
}

// ── MEASUREMENT ONLY: how far the clipping goes beyond this tab ──
/* No assertion. The `badges` case already carries the persona numbers; this
   exists so the write-up can say "9 of 14 combo names" instead of "probably
   the other tabs too". A block that cannot fail is not proof of anything and
   is labelled so in the output. */
const survey = []
{
  const { ctx, page } = await newPage(marcus)
  await openToybox(page)

  for (const label of ['Combos', 'Tactics', 'Persona']) {
    await tab(page, label)
    const counts = await page.evaluate(() => {
      let total = 0, clipped = 0, worst = 0, worstName = ''
      for (const el of document.querySelectorAll('span.font-display')) {
        if (el.children.length) continue
        const text = (el.textContent ?? '').trim()
        if (!text) continue
        total++
        const over = Math.max(el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight)
        if (over > 1) {
          clipped++
          if (over > worst) { worst = over; worstName = text }
        }
      }
      return { total, clipped, worst, worstName }
    })
    survey.push(`${label.padEnd(8)} ${String(counts.clipped).padStart(2)} of `
      + `${String(counts.total).padStart(2)} names clipped; worst ${counts.worst}px — ${counts.worstName}`)
  }

  /* THE OTHER `truncate`, MEASURED RATHER THAN ASSUMED. `ComboCard.tsx:98` puts
     a `truncate` on each step's block label inside the EXPANDED card, and the
     name survey above never sees it — it only walks `span.font-display`, and a
     collapsed card has no steps in the DOM at all. It would have been easy to
     call it "the same defect" and change it on the strength of the word
     `truncate` alone. It is not the same shape: the label sits in a
     `flex-wrap` row beside a short type pill, so it has most of the card width,
     and the labels the pack writes are short. This expands every combo and
     measures. Whatever the number is, it is reported, not fixed here — a fix
     nobody measured is how the first one survived four slices. */
  await tab(page, 'Combos')
  /* `button[aria-expanded]` IS NOT A TOYBOX SELECTOR. The first attempt clicked
     every collapsed one on the page and the survey came back reading the turn
     rail — `Action 3 ready`, `Bonus 1 ready` — and the header stat strip, `Nix`
     and `Save DC`, with zero block labels and the Toybox no longer open. The
     rail sits behind the panel and answers to the same attribute. Combo headers
     are identified by shape instead: an `aria-expanded` button holding a
     `span.font-display` name AND a trailing "N steps" badge. Clicked in-page
     rather than through Playwright so an overlay cannot silently redirect the
     click to whatever is underneath it, which is what happened the first time. */
  const comboCount = await page.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')]
    .filter(b => b.querySelector('span.font-display') && /\d+ steps?$/.test((b.textContent ?? '').trim()))
    .length)

  /* ONE AT A TIME, BECAUSE THE LIST IS SINGLE-EXPAND. Clicking all fourteen
     headers in one pass reported "3 block labels across 14 expanded combos" —
     fourteen clicks, one card open, three steps measured, and a sentence that
     read like coverage. The tab keeps at most one card open, so the survey has
     to open each, measure it, and move on. */
  const labels = { total: 0, clipped: 0, worst: 0, worstName: '' }
  for (let i = 0; i < comboCount; i++) {
    await page.evaluate(n => {
      [...document.querySelectorAll('button[aria-expanded]')]
        .filter(b => b.querySelector('span.font-display') && /\d+ steps?$/.test((b.textContent ?? '').trim()))
        [n]?.click()
    }, i)
    await page.waitForTimeout(250)
    const one = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('span.truncate.font-medium')) {
        const text = (el.textContent ?? '').trim()
        if (!text) continue
        el.scrollIntoView({ block: 'center' })
        out.push({ text, over: el.scrollWidth - el.clientWidth })
      }
      return out
    })
    for (const { text, over } of one) {
      labels.total++
      if (over > 1) {
        labels.clipped++
        if (over > labels.worst) { labels.worst = over; labels.worstName = text }
      }
    }
  }
  survey.push(`Steps    ${String(labels.clipped).padStart(2)} of `
    + `${String(labels.total).padStart(2)} block labels clipped across ${comboCount} combos, opened one`
    + ` by one (ComboCard.tsx:98); worst ${labels.worst}px — ${labels.worstName}`)

  await ctx.close()
}

await browser.close()

for (const r of results) {
  console.log(`\n── ${r.id} — ${r.what}`)
  for (const line of r.lines) console.log(`   ${line}`)
  console.log(`   ${r.ok ? 'PASS' : 'FAIL'}`)
}

console.log('\n── house — MEASUREMENT ONLY, no pass/fail: clipping across the whole Toybox')
for (const line of survey) console.log(`   ${line}`)
console.log('   (this block cannot fail; it is here to make the write-up factual)')

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length ? `FAIL — ${failed.map(r => r.id).join(', ')}` : `PASS — all ${results.length} cases`}`)
process.exit(failed.length ? 1 : 0)
