/* SLICE 1 — THE CAPABILITY PINS.
 *
 *   node docs/plans/your-turn/prove-capabilities.mjs            (before)
 *   node docs/plans/your-turn/prove-capabilities.mjs --after    (after)
 *
 * Gate 2's do-not-lose table is the contract slice 8 is graded on. A table in a
 * markdown file cannot fail, so this file is that table turned into something
 * that can. Every pin is taken off the GLASS — painted, reachable, on his real
 * export at 390x844 — never off the model, because a probe reading textContent
 * proves the model and not the screen (Finding Q).
 *
 * THREE KINDS, and the distinction is the whole point:
 *
 *   KEEP    reachable today, must still be reachable after. Red now means the
 *           PROBE is wrong, not the app — investigate, never weaken.
 *   RETIRE  reachable today and deliberately going away. Green now, expected
 *           red after, and named here so its removal is a decision on record
 *           rather than a silence.
 *   ARRIVE  not reachable today and must be after. RED NOW IS THE POINT. These
 *           are the pins that prove this file can fail, which is what makes the
 *           green ones evidence rather than decoration
 *           (HANDOFF s4: a proof that passes on its first run is not evidence
 *           until it has been shown able to fail).
 *
 * `--after` inverts the expectation for ARRIVE and RETIRE. The KEEP pins are
 * byte-identical between the two runs; that is what makes them a pin.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'

const AFTER = process.argv.includes('--after')
const SHEET_PATH = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'
const APP = 'http://[::1]:4321/the-codex/'

const SHEET = JSON.parse(readFileSync(SHEET_PATH, 'utf8'))
const HP = { cur: SHEET.hitPoints?.current, max: SHEET.hitPoints?.max, ac: SHEET.armorClass }
if (HP.cur === undefined || HP.max === undefined) {
  console.error('REFUSING: cannot read his hit points off the sheet.')
  process.exit(2)
}

/* ── the sheets ────────────────────────────────────────────────────────────
 *
 * His own export is the first-class case and is never edited on disk — every
 * variant below is a clone held in memory and seeded into localStorage, so his
 * blob stays byte-identical (vitals.ts's rule: nothing silently edits his
 * sheet).
 *
 * SYNTH is the one this project cannot do without. `paladinResources` is
 * missing from his export, so Lay on Hands and Channel Divinity paint NOTHING
 * on his screen — they are two features he cannot see to miss, and without a
 * sheet that carries them there is no way to check they survived. */
const clone = () => JSON.parse(JSON.stringify(SHEET))
const HIS = clone()
const AT_FULL = (() => { const c = clone(); c.hitPoints.current = c.hitPoints.max; return c })()
const AT_ZERO = (() => { const c = clone(); c.hitPoints.current = 0; return c })()
const SYNTH = (() => {
  const c = clone()
  /* Level 7 Paladin, by the 2024 rules the app already implements:
     `paladinResourcesFor(7)` in rules-2024/pools.ts:145. Written literally here
     rather than imported, because a fixture computed by the code under test
     cannot show that code being wrong. */
  c.paladinResources = {
    layOnHands: { max: 35, current: 35 },
    /* 2, off canon's level-7 row (`src/canon/paladin-progression.json:179`),
       not out of memory. This said 3 — level ELEVEN's number — until slice 4's
       prover caught `applyPoolMaxima` clamping it on the first write. */
    channelDivinity: { max: 2, current: 2 },
    auraRange: 10,
  }
  return c
})()

const IN_COMBAT = {
  inCombat: true, round: 3, yourTurn: true,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: {}, concentrating: null,
}
const OUT_OF_COMBAT = { ...IN_COMBAT, inCombat: false, round: 0 }

const FIXTURES = {
  combat:      { sheet: HIS,     combat: IN_COMBAT,     what: 'his export, round 3, nothing spent' },
  full:        { sheet: AT_FULL, combat: IN_COMBAT,     what: 'his export at full HP' },
  zero:        { sheet: AT_ZERO, combat: IN_COMBAT,     what: 'his export at 0 HP' },
  synth:       { sheet: SYNTH,   combat: IN_COMBAT,     what: 'synthetic sheet WITH paladinResources' },
  outOfCombat: { sheet: HIS,     combat: OUT_OF_COMBAT, what: 'his export, not in combat' },
}

/* ── the pins ──────────────────────────────────────────────────────────────
 *
 * `q` is an expression evaluated IN THE PAGE. It returns a string of evidence
 * when the capability is reachable, or null when it is not. `steps` are
 * expressions returning an element to click first.
 *
 * Helpers are injected by INJECT below. `$b(re)` = a painted, reachable button
 * whose accessible name matches. `$t(re)` = the smallest painted element whose
 * text matches. Both refuse anything under `inert`, `aria-hidden` or
 * `pointer-events: none` — the app's own words for "cannot be reached".
 */
const PINS = [
  // ── the round and the economy ───────────────────────────────────────────
  { id: 'round-counter',      kind: 'KEEP',   fx: 'combat', what: 'the round counter',
    q: `$ev($t(/^Round 3$|^ROUND 3$/i))` },
  { id: 'next-turn',          kind: 'KEEP',   fx: 'combat', what: 'Next turn / End turn',
    q: `$ev($b(/^(next turn|end turn)$/i))` },
  { id: 'chip-action',        kind: 'KEEP',   fx: 'combat', what: 'ACTION chip',
    q: `$ev($b(/^Action: (available|used)$/i))` },
  { id: 'chip-bonus',         kind: 'KEEP',   fx: 'combat', what: 'BONUS chip',
    q: `$ev($b(/^Bonus(\\s*action)?: (available|used)$/i))` },
  { id: 'chip-reaction',      kind: 'KEEP',   fx: 'combat', what: 'REACTION chip',
    q: `$ev($b(/^(Reaction|React): (available|used)$/i))` },
  { id: 'chip-move',          kind: 'KEEP',   fx: 'combat', what: 'MOVE chip',
    q: `$ev($b(/^(Move|Movement): (available|used)$/i))` },
  { id: 'reset-economy',      kind: 'KEEP',   fx: 'combat', what: 'reset action economy',
    q: `$ev($b(/^Reset action economy$/i))` },

  // ── what he can do ──────────────────────────────────────────────────────
  /* RE-POINTED IN 8b, AND SPLIT IN TWO — read this before trusting either half.
     The old query looked for a BUTTON named `Dawn Guardian — details`: the
     legacy always-active list, where every entry was a tap-through to the full
     rules text. D paints the same facts as `<section class="upon">` — a `.k`
     name and a `.t` summary per aura — and those are `<span>`s, not buttons.
     So the capability did not survive whole: WHAT IS ALWAYS ON survived, TAP IT
     FOR THE FULL TEXT did not. Re-pointing the single pin at the new markup
     would have turned a half-loss green, so the half that was lost gets a pin
     of its own and stays red until Marcus rules on it. */
  { id: 'auras-always-active', kind: 'KEEP',  fx: 'combat', what: 'always-active auras, named',
    q: `(() => { const named = $all('.upon .tag').filter(t => {
                   const k = t.querySelector('.k'), d = t.querySelector('.t')
                   return k && d && $label(k).length > 2 && $label(d).length > 12 })
                 return named.length ? named.length + '× e.g. ' + $label(named[0].querySelector('.k')) : null })()` },
  /* RE-POINTED IN 8d-2, AND DELIBERATELY MADE HARDER. The 8b version counted
     elements — `.upon button, [role="button"], a` — which asks "is there
     something to tap", a question about SHAPE that any of three implementations
     could answer and none of them would prove. It also could not have gone
     green for `<details>`, whose control is a `<summary>`, so re-pointing it at
     a fourth selector would just have been moving the goalposts to wherever the
     new code landed.

     So it stops asking about shape. It CLICKS, and then demands the thing the
     capability is actually for: text that is longer than the line already on
     screen and does not end in the "..." that `featureSummary` appends. That is
     implementation-blind — a button, a dialog or a disclosure all pass it — and
     it is the only form of this pin that would have caught the real fault,
     which was never a missing element. It was a missing sentence. */
  { id: 'aura-details-tap',   kind: 'KEEP',   fx: 'combat', what: 'an always-active aura opens its full text',
    steps: [`$all('.upon summary, .upon button, .upon [role="button"], .upon a')[0]`],
    q: `(() => { const line = $all('.upon .t').map($own).find(t => /\\.\\.\\.$/.test(t)) || ''
                 const full = $all('.upon .full, .upon [role="dialog"]').map($label)
                                .find(t => t.length > line.length && !/\\.\\.\\.$/.test(t))
                 return full ? full.slice(-46) : null })()` },
  /* RE-POINTED IN 8b. The old query counted buttons whose accessible name ENDED
     `— details`, the legacy row's suffix. D names its rows for the option
     itself, so the NAME can no longer carry the proof — but the BEHAVIOUR can,
     and the behaviour is what the pin was always about. This clicks a real row
     and demands a real dialog, which is a stricter test than a string was. */
  { id: 'row-opens-details',  kind: 'KEEP',   fx: 'combat', what: 'a row opens full details',
    steps: [`$all('.dturn .body button').find(b => /Divine Smite/.test($label(b)))`],
    q: `(() => { const d = $all('[role="dialog"]')[0]
                 return d ? 'dialog: ' + (d.getAttribute('aria-label') || '').slice(0, 30) : null })()` },
  /* Split after the first run. The app paints `2d8 Radiant · +1d8 Fiend/Undead`
     on a row and paints NO `+7 to hit` anywhere — the to-hit is on `?d=1` only.
     One pin covering both would have been half-red for a reason no one could
     read off the result. */
  { id: 'dice-on-row',        kind: 'KEEP',   fx: 'combat', what: 'dice notation on the option row',
    q: `(() => { const hits = $all('*').map($own).filter(t => t && t.length < 40 && /\\d+d\\d+/.test(t))
                 return hits.length ? hits.length + '× e.g. ' + hits[0] : null })()` },
  /* RE-POINTED IN 8b, and the anchoring is the whole story. `^\+\d+ to hit$`
     demanded an element whose ENTIRE own-text was the to-hit and nothing else —
     true of the `?d=1` preview, where it had a span to itself. On the mounted
     screen the to-hit opens the row's detail line and the rest of the attack
     follows it in the same span:

       <span class="det">+7 to hit (STR +4 + prof) · 1d10+4 Slashing · 10 ft · …

     which is the arrival this pin was written to catch, reading BETTER than the
     shape it was written against. Still anchored at the START, so a to-hit
     buried mid-sentence in prose somewhere else on the page cannot satisfy it,
     and still scoped to the row's own detail span. */
  { id: 'to-hit-on-row',      kind: 'ARRIVE', fx: 'combat', what: 'the to-hit on the option row',
    q: `(() => { const hit = $all('.det').filter(e => /^\\+\\d+ to hit\\b/i.test($own(e)))
                 return hit.length ? hit.length + '× ' + $own(hit[0]).slice(0, 34) : null })()` },
  /* RE-POINTED IN 8b: the control is named `Look up` on D. Same capability,
     shorter name — verified by opening it on the glass, not by assuming. */
  { id: 'quick-lookup',       kind: 'KEEP',   fx: 'combat', what: 'quick look-up',
    q: `$ev($b(/^(Quick lookup|Look up)$/i))` },
  /* RE-POINTED IN 8d-3 — THE ROUTE CHANGED, THE CLAIM DID NOT, and the
     difference matters. The old step reached the control by a Tailwind class on
     an expanded row of `TurnSummary` (`span.text-xs.font-semibold.text-forge-0`),
     which was already the fragile way to do it and became an impossible one:
     `TurnSummary` is mounted nowhere now, so there is no row to expand. The
     capability moved to the detail sheet, so the pin walks the route he walks —
     open a real option, press the control — instead of matching furniture.

     WHAT IS DEMANDED IS STRICTER THAN BEFORE. The old query stopped at finding
     a button named `Edit strategic tip`; a button that opened nothing would have
     satisfied it. This one presses that button and then requires an actual
     editor behind it — a `textarea` inside the dialog AND a Save beside it — so
     the pin fails if the control is a dead end. The NAME is unchanged and is
     still the byte-for-byte V0.9 string, because that is the part of the pin
     that is the capability rather than the route to it. */
  { id: 'action-notes',       kind: 'KEEP',   fx: 'combat', what: 'notes he can write on an action',
    steps: [`$all('.dturn .body button').find(b => /Divine Smite/.test($label(b)))`,
            `$b(/^Edit strategic tip$/i)`],
    q: `(() => { const box  = $all('[role="dialog"] textarea')[0]
                 const save = $all('[role="dialog"] button').find(b => /^Save$/i.test($label(b)))
                 return box && save ? 'editor: ' + $label(box) : null })()` },

  // ── his body ────────────────────────────────────────────────────────────
  { id: 'hp-value',           kind: 'KEEP',   fx: 'combat', what: 'his hit points, painted',
    q: `$ev($b(/^3 of 67 hit points$/i) || $t(/^3\\s*\\/\\s*67$/))` },
  { id: 'hp-colour-hurt',     kind: 'KEEP',   fx: 'combat', what: 'the HP colour at 3/67',
    q: `$hpFill()` },
  { id: 'hp-colour-full',     kind: 'KEEP',   fx: 'full',   what: 'the HP colour at 67/67',
    q: `$hpFill()` },
  /* MEASURED, not assumed: today's combat tab paints the string "blood"
     NOWHERE — the diagnostic swept every painted element for it and found
     none. Gate 2's table put Bloodied under "already there", which was true of
     `?d=1` and never true of the app he actually opens. So it ARRIVES. */
  { id: 'bloodied',           kind: 'ARRIVE', fx: 'combat', what: 'the Bloodied marker',
    q: `$ev($t(/^Bloodied$|^Bloodied at \\d+$/i))` },
  { id: 'armour-class',       kind: 'KEEP',   fx: 'combat', what: 'armour class',
    q: `$ev($t(/^AC[: ]*18$|^18$/) && $all('*').find(e => /AC/.test($own(e))) )
        || $ev($t(/AC[: ]*18/))` },
  { id: 'damage-control',     kind: 'KEEP',   fx: 'combat', what: 'damage',
    q: `$ev($b(/^Apply damage$/i))` },
  { id: 'heal-control',       kind: 'KEEP',   fx: 'combat', what: 'heal',
    q: `$ev($b(/^Apply healing$/i))` },
  { id: 'temphp-control',     kind: 'KEEP',   fx: 'combat', what: 'temp hit points',
    q: `$ev($b(/^Set temporary hit points$/i))` },
  { id: 'temphp-source',      kind: 'KEEP',   fx: 'combat', what: 'the temp-HP SOURCE question',
    steps: [`$b(/^Set temporary hit points$/i)`],
    q: `$ev($t(/What granted these temporary hit points\\?/i) ||
             $all('*').find(e => /What granted these temporary hit points/i.test(e.getAttribute('aria-label') || '')))` },
  { id: 'death-saves',        kind: 'KEEP',   fx: 'zero',   what: 'death saves at 0 HP',
    q: `$ev($t(/^Death Saves$/i))` },
  /* Three things wrong with the first version of this pin, and the third is a
     finding rather than a probe bug:
       1. it is headed "Active Conditions", not "Conditions";
       2. it ships COLLAPSED (`aria-expanded="false"`, reading "… / None"), so
          it has to be opened before the grid exists to be counted;
       3. the buttons behind it carry NO aria-label — their accessible name is
          the condition's own word — and they are HPTracker's own grid.
          `combat/ConditionsGrid.tsx` has ZERO consumers. Nothing has ever
          rendered it. See the note in 03-program-design.md. */
  { id: 'conditions',         kind: 'KEEP',   fx: 'combat', what: 'the conditions dropdown',
    steps: [`$b(/^Active Conditions/i)`],
    q: `(() => { const re = /^(Blinded|Charmed|Deafened|Frightened|Grappled|Incapacitated|Invisible|Paralyzed|Petrified|Poisoned|Prone|Restrained|Stunned|Unconscious|Exhaustion)/i
                 const n = $all('button').filter(b => re.test($label(b))).length
                 return n > 1 ? n + ' condition buttons behind the disclosure' : null })()` },

  // ── the deck's own controls ─────────────────────────────────────────────
  { id: 'spell-slot-pips',    kind: 'KEEP',   fx: 'combat', what: 'spell-slot pips, tappable',
    q: `(() => { const n = $all('button').filter(b =>
           /slot \\d+: (expend|restore)|^(Expend|Restore) level \\d+ spell slot$|^(Expend|Restore) \\d(st|nd|rd|th) level spell slot$/i.test($label(b))).length
                 return n ? n + ' slot buttons' : null })()` },
  { id: 'dice-roller',        kind: 'KEEP',   fx: 'combat', what: 'the dice roller',
    q: `$ev($b(/^Open dice roller$/i))` },
  { id: 'end-combat',         kind: 'KEEP',   fx: 'combat', what: 'end combat',
    q: `$ev($b(/^End combat$/i))` },
  /* ── three the first run reclassified for me ────────────────────────────
     All three were written as ARRIVE on Gate 2's reading of the code, and all
     three came up GREEN on the pre-change build, which means they were never
     absences — they were things I had not looked for on the glass. Moved to
     KEEP, where a pin that is already true belongs, and the architecture doc
     is corrected to match. This is the whole reason ARRIVE pins are run
     BEFORE: an ARRIVE that is already green is a claim about the app that
     nobody checked. */
  { id: 'ready-count',        kind: 'KEEP',   fx: 'combat', what: 'the count of what is ready',
    q: `$ev($t(/^\\d+ ready$/i))` },
  { id: 'start-combat',       kind: 'KEEP',   fx: 'outOfCombat', what: 'start combat, out of combat',
    q: `$ev($b(/^(start combat|begin combat)$/i))` },
  { id: 'no-round-zero',      kind: 'KEEP',   fx: 'outOfCombat', what: 'out of combat never says "Round 0"',
    q: `(() => { const bad = $all('*').some(e => /^round 0$/i.test($own(e)))
                 return bad ? null : 'no "Round 0" anywhere' })()` },
  { id: 'minimise',           kind: 'RETIRE', fx: 'combat', what: 'minimise the deck',
    q: `$ev($b(/^(Minimise|Expand) turn deck$/i))` },

  // ── the reaction he thinks is broken (item 7) ───────────────────────────
  { id: 'retaliation-offer',  kind: 'KEEP',   fx: 'combat', what: 'the retaliation capture',
    q: `$ev($b(/^Record 1d10 Fire retaliation$/i))` },
  { id: 'retaliation-tally',  kind: 'KEEP',   fx: 'combat', what: 'the retaliation tally',
    q: `$ev($t(/^none yet$/i) || $t(/^TOTAL .*/i))` },
  { id: 'retaliation-undo',   kind: 'KEEP',   fx: 'combat', what: 'undo a recorded retaliation',
    steps: [`$b(/^Record 1d10 Fire retaliation$/i)`, `$b(/^Add$/)`],
    q: `$ev($b(/^Undo /i))` },

  // ── the two he cannot see to miss ───────────────────────────────────────
  { id: 'lay-on-hands',       kind: 'KEEP',   fx: 'synth',  what: 'Lay on Hands spend controls',
    q: `$ev($t(/^LAY ON HANDS$/i))` },
  { id: 'channel-divinity',   kind: 'KEEP',   fx: 'synth',  what: 'Channel Divinity uses',
    q: `$ev($t(/^CHANNEL DIVINITY$/i))` },
  { id: 'no-paladin-crash',   kind: 'KEEP',   fx: 'combat', what: 'NO paladinResources: nothing paints, nothing throws',
    q: `(() => { const loh = $t(/^LAY ON HANDS$/i)
                 return loh ? null : 'absent and no page error — the other half' })()` },

  // ── ARRIVE: red now, and that is the evidence this file can fail ────────
  { id: 'one-your-turn',      kind: 'ARRIVE', fx: 'combat', what: 'exactly ONE box headed "Your turn"',
    q: `(() => { const n = $all('*').filter(e => /^your turn$/i.test($own(e))).length
                 return n === 1 ? 'exactly 1' : null })()` },
  /* RESTATED IN 8b BY A RULING, NOT TO DODGE A RED — the distinction matters,
     so here is the whole of it.

     Written at Gate 3, this pin meant "one place on the glass", because 8b's
     plan was to suppress the app header on the combat tab. On 2026-09-01 Marcus
     ruled the header STAYS: suppressing it would have stranded Play/Prep,
     Settings, Toybox, the character sheet and the roster switcher on the app's
     default tab, which is a worse loss than a repeated number. The header shows
     `3/67` on every tab in session mode. So "exactly one on the glass" is not a
     bar this app can clear any more — it is a bar the product no longer wants
     cleared, and a pin that can never go green teaches nothing.

     The criterion it becomes is the one his complaint actually named: he said
     the app "displays my hit points in like 3 different locations." Two of
     those three were inside the combat surface — D's vitals AND CombatHelper's
     Hit Points card. This asserts ONE inside the scroller and TWO on the page,
     so the app header is allowed exactly once and a third place anywhere still
     fails. Strictly stronger than counting the scroller alone. */
  { id: 'hp-painted-once',    kind: 'ARRIVE', fx: 'combat', what: 'HP once in the surface, once in the app header',
    q: `(() => { const all = $hpPlaces()
                 const m = $scroller(); if (!m) return null
                 const r = m.getBoundingClientRect()
                 const inside = $hpPlacesWithin(r)
                 return inside === 1 && all === 2 ? '1 in the surface, 2 on the page' : null })()` },
  { id: 'four-bands',         kind: 'ARRIVE', fx: 'combat', what: 'the four named bands',
    q: `(() => { const want = ['ACTION','BONUS','REACTION','MOVEMENT']
                 const got = want.filter(w => $all('*').some(e => $own(e).toUpperCase() === w))
                 return got.length === 4 ? got.join(' ') : null })()` },
  /* ── RE-POINTED IN SLICE 9, AND RENAMED SO THE CHANGE CANNOT BE MISSED ────
     It was `one-screen`, and it read:

         const s = m.scrollHeight / m.clientHeight;  s <= 1.05

     — the length of the WHOLE TAB. That is not the success metric. Read
     `01-product.md` §Success metric: the number is "the four things one turn
     needs, in pixels, from the top of the first to the bottom of the last,
     divided by the height of the window he reads through." A tab that is long
     because it also carries a damage log, a rest tracker and a persona editor
     fails the old pin while passing the actual metric, and the two numbers were
     never within sight of each other: at slice 9's start the whole tab was 5.89
     screens and the span of one turn was 0.88.

     MARCUS'S RULING OF 2026-09-02, unprompted, at the top of the slice:
       "I don't need 'absolutely no scrolling'. I'm find with having to scroll,
        it makes it feel like there's a good amount of value and feature in the
        app. We simply were aiming to consolidate the dublicated types of
        features and box just like we discussed."

     That confirms the metric and corrects its TARGET: 0 became ≤ 2. The 2 is
     not invented here — it is Gate 1's own approved sentence, that the worst
     case is "796px, about 75px over, so the movement band and the rail sit one
     flick below", i.e. one screen plus at most one flick. Gate 1 was set back
     to in progress for that one number and re-approved by the ruling itself.

     THE RULE BELOW IS THE ONE `_diag9.mjs` APPLIED TO BOTH BUILDS, which is why
     a before-number exists at all: 2,082px / 5.02 screens, computed by the same
     function over the rows in `_baseline-before.txt`.

     `kinds < 4` IS A GUARD ON THE INSTRUMENT, NOT ON THE APP. If the anchors
     stop matching — a label reworded, a band renamed — every row disappears and
     the span collapses to a very green 0. An instrument that finds nothing must
     report red, not a pass. */
  { id: 'one-turn-span',      kind: 'ARRIVE', fx: 'combat', what: 'one turn spans ≤ 2 screens (01-product success metric)',
    q: `(() => { const s = $turnSpan(); if (!s) return null
                 if (s.kinds < 4) return null
                 return s.screens <= 2
                   ? s.px + 'px / ' + s.screens + ' screens · ' + s.kinds + ' things · ' + s.from + ' → ' + s.to
                   : null })()` },
]

/* ── the page-side helpers ─────────────────────────────────────────────── */
const INJECT = () => {
  const painted = el => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const reachable = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.hasAttribute && p.hasAttribute('inert')) return false
      if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return false
      if (getComputedStyle(p).pointerEvents === 'none') return false
    }
    return true
  }
  window.$all = (sel = '*') =>
    [...document.querySelectorAll(sel)].filter(e => painted(e) && reachable(e))
  /* Own text = direct child text nodes only. A leaf-walker cannot see
     `<p><span>WHEN</span> bare text</p>` and reported every working trigger as
     missing in phase 4. That lesson, applied. */
  window.$own = el =>
    [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
  window.$label = el =>
    (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()
  window.$b = re => window.$all('button').find(b => re.test(window.$label(b))) || null
  window.$t = re => {
    const hits = window.$all('*').filter(e => {
      const own = window.$own(e)
      return own && re.test(own)
    })
    /* the smallest match — an ancestor whose text merely CONTAINS the phrase is
       not the thing on screen */
    return hits.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0] || null
  }
  window.$ev = el => (el ? window.$label(el).slice(0, 58) : null)
  window.$scroller = () => {
    let m = null
    for (const el of window.$all('*')) {
      if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue
      if (el.scrollHeight <= el.clientHeight + 40) continue
      if (!m || el.scrollHeight > m.scrollHeight) m = el
    }
    return m
  }
  /* HP places: the same hunt measure-today.mjs uses, so the two instruments
     cannot disagree about what "three places" means. */
  /* `within` added in 8b for `hp-painted-once`, which after Marcus's ruling on
     the app header has to count the surface and the page separately. Passing no
     rect keeps the original behaviour byte-for-byte, so every other caller —
     and measure-today's matching hunt — is untouched. */
  window.$hpPlaces = (within = null) => {
    const re = /\b(\d+)\s*(?:\/|of)\s*(\d+)\b/
    const seen = new Set()
    for (const el of window.$all('*')) {
      const own = window.$own(el)
      const all = (el.textContent || '').replace(/\s+/g, ' ').trim()
      const m = re.exec(own) || (all.length < 14 ? re.exec(all) : null)
      if (!m) continue
      if (m[2] !== String(window.__maxHp)) continue
      const r = el.getBoundingClientRect()
      if (within && (r.top < within.top - 1 || r.bottom > within.bottom + 1)) continue
      seen.add(Math.round(r.top) + ':' + Math.round(r.left))
    }
    return seen.size
  }
  window.$hpPlacesWithin = rect => window.$hpPlaces(rect)
  /* The fill is a GRADIENT — `backgroundColor` on it is `rgba(0,0,0,0)` and
     the colour lives in `backgroundImage`. Reading only backgroundColor
     reported the colour-change feature as missing on both a hurt sheet and a
     full one: a probe that can see neither case, which is worse than one that
     sees only the broken one. */
  window.$hpFill = () => {
    const bar = window.$all('*').find(e => /^Hit points$/i.test(e.getAttribute('aria-label') || ''))
    if (!bar) return null
    for (const e of bar.querySelectorAll('*')) {
      const s = getComputedStyle(e)
      if (e.getBoundingClientRect().width <= 0) continue
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        const stops = s.backgroundImage.match(/oklch\([^)]*\)|rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi)
        if (stops) return 'gradient ' + stops.slice(0, 2).join(' → ')
      }
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') return 'solid ' + s.backgroundColor
    }
    return null
  }
  /* ── THE SUCCESS METRIC, AS CODE — slice 9 ────────────────────────────────
     Lifted from `_diag9.mjs`, which applied it to the recorded before-rows and
     the live after-build so the two numbers are comparable. Kept here so the
     metric outlives the throwaway diag.

     ONE ANCHOR PER THING, AND IT IS THE ONE HE REACHES FIRST. The metric names
     four THINGS, not every instance of them. A thing painted twice does not
     cost twice — he uses whichever copy arrives first — so a kind's
     representative is a free instance if it has one, else its topmost. That is
     what stops the before-build's second economy strip from lengthening its own
     span, which would have flattered this build.

     FREE = he never travels to it: outside the scroller, or under a fixed or
     sticky ancestor BELOW the scroller.

     ⚠ THE ANCESTOR WALK MUST STOP AT THE SCROLLER. `Layout` renders
     `<main class="fixed …">`, so every element inside has a fixed ancestor; a
     walk to `document.body` reports every anchor free and the span as zero.
     `_diag9.mjs`'s first run did exactly that. */
  window.$turnSpan = () => {
    const main = window.$scroller()
    if (!main) return null
    const mr = main.getBoundingClientRect()
    const pageY = el => Math.round(el.getBoundingClientRect().top - mr.top + main.scrollTop)
    const isFree = el => {
      if (!main.contains(el)) return true
      for (let p = el; p && p !== main; p = p.parentElement) {
        if (/fixed|sticky/.test(getComputedStyle(p).position)) return true
      }
      return false
    }
    const ANCHOR = [
      [/— details$/, 'pick'],
      /* The four band headings, not the rows: D's rows carry no aria-label —
         the row's accessible name IS the option — and `.det` is furniture. The
         headings are this phase's own promise and they are where the list
         becomes pickable. Rows echo their band in a cost label, so this matches
         more than four elements; harmless, since only the topmost of a kind
         survives. */
      [/^(action|bonus|reaction|movement)$/i, 'pick'],
      [/^(action|bonus|reaction|react|move|movement): (used|available)$/i, 'econ'],
      [/^(apply damage|apply healing|set temporary hit points)$/i, 'hp-control'],
      /* NOT `end combat` — that ends the FIGHT. The metric's verb is "end the
         turn", and including the other one charged this build 8px for a button
         answering a different question. */
      [/^(end turn|next turn)$/i, 'end'],
      [/^round \d+\b/i, 'round'],
    ]
    const hp = window.__curHp + '/' + window.__maxHp
    const hpRe = new RegExp('\\b' + window.__curHp + '\\s*(?:/|of)\\s*' + window.__maxHp + '\\b')
    const rows = []
    for (const el of window.$all('button, h1, h2, h3, h4, span, p, div')) {
      const t = window.$label(el)
      if (!t || t.length > 60) continue
      let kind = (ANCHOR.find(a => a[0].test(t)) || [])[1]
      if (!kind && hpRe.test(t) && t.replace(/\s/g, '').length <= hp.length + 14) kind = 'hp-number'
      if (!kind) continue
      const r = el.getBoundingClientRect()
      if (r.height < 12) continue
      // A button and its inner span are one anchor: keep the outermost.
      if (rows.some(a => a.el.contains(el))) continue
      rows.push({ el, kind, label: t.slice(0, 34), top: pageY(el), h: Math.round(r.height), free: isFree(el) })
    }
    const kinds = new Map()
    for (const r of rows) {
      const cur = kinds.get(r.kind)
      if (!cur) { kinds.set(r.kind, r); continue }
      if (cur.free) continue
      if (r.free || r.top < cur.top) kinds.set(r.kind, r)
    }
    const paid = [...kinds.values()].filter(r => !r.free)
    const win = main.clientHeight
    if (!paid.length) {
      return { px: 0, screens: 0, kinds: kinds.size, window: win, from: 'everything is free', to: 'nothing to travel to' }
    }
    const top = Math.min(...paid.map(r => r.top))
    const bottom = Math.max(...paid.map(r => r.top + r.h))
    return {
      px: bottom - top,
      screens: +((bottom - top) / win).toFixed(2),
      kinds: kinds.size,
      window: win,
      from: paid.find(r => r.top === top).label + '@' + top,
      to: paid.find(r => r.top + r.h === bottom).label + '@' + bottom,
    }
  }
}

/* ── the run ───────────────────────────────────────────────────────────── */
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium
const browser = await chromium.launch()

const seed = ([id, s, c, maxHp]) => {
  localStorage.setItem('codex-character-' + id, s)
  localStorage.setItem('codex-active-id', id)
  localStorage.setItem('codex-combat-' + id, c)
  const p = JSON.parse(s)
  localStorage.setItem('codex-roster', JSON.stringify([
    { id, name: p.name, class: p.class, subclass: p.subclass, level: p.level, updatedAt: '2026-08-31T00:00:00.000Z' },
  ]))
  window.__maxHp = maxHp
  /* Slice 9: `$turnSpan` needs the CURRENT hit points too, to recognise "3 / 67"
     as a thing one turn needs. Read off the sheet being seeded rather than
     passed in, so it cannot drift from `maxHp`'s source. */
  window.__curHp = p.hitPoints.current
}

const results = []
const pageErrors = {}

for (const [fxName, fx] of Object.entries(FIXTURES)) {
  const mine = PINS.filter(p => p.fx === fxName)
  if (!mine.length) continue

  for (const pin of mine) {
    /* A FRESH CONTEXT PER PIN. Pins with `steps` change the screen — a temp-HP
       field left open, a retaliation added — and a later pin reading that
       screen would be reading the wreckage of an earlier one. This is slower
       and it is the only way the pins stay independent. */
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce',
    })
    await ctx.addInitScript(seed, [fx.sheet.id, JSON.stringify(fx.sheet), JSON.stringify(fx.combat), fx.sheet.hitPoints.max])
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)))
    await page.goto(APP, { waitUntil: 'load' })
    await page.waitForTimeout(1700)
    await page.evaluate(INJECT)

    let evidence = null
    let note = ''
    try {
      for (const step of pin.steps ?? []) {
        const ok = await page.evaluate(`(() => { const el = ${step}; if (!el) return false; el.click(); return true })()`)
        if (!ok) { note = 'step failed: ' + step.slice(0, 40); break }
        await page.waitForTimeout(450)
        await page.evaluate(INJECT)
      }
      if (!note) evidence = await page.evaluate(pin.q)
    } catch (e) {
      note = 'threw: ' + String(e.message).slice(0, 90)
    }
    if (errs.length) pageErrors[pin.id] = errs

    const found = evidence != null && evidence !== false
    const wantGreen =
      pin.kind === 'KEEP' ? true :
      pin.kind === 'RETIRE' ? !AFTER :
      /* ARRIVE */ AFTER
    results.push({ ...pin, found, evidence, note, wantGreen, ok: found === wantGreen })
    await ctx.close()
  }
}
await browser.close()

/* ── the report ────────────────────────────────────────────────────────── */
const mark = r => (r.ok ? '  ok  ' : r.found ? ' FOUND' : '  RED ')
console.log('\nCAPABILITY PINS — ' + (AFTER ? 'AFTER' : 'BEFORE') + ' the change')
console.log('Nix, HP ' + HP.cur + '/' + HP.max + ', AC ' + HP.ac + ' · 390×844 · ' + PINS.length + ' pins\n')

for (const kind of ['KEEP', 'RETIRE', 'ARRIVE']) {
  const rows = results.filter(r => r.kind === kind)
  if (!rows.length) continue
  const legend =
    kind === 'KEEP' ? 'must be green in BOTH runs' :
    kind === 'RETIRE' ? 'green before, expected red after' :
    'RED BEFORE is the point — green only after'
  console.log('── ' + kind + ' — ' + legend + ' ' + '─'.repeat(Math.max(0, 34 - legend.length)))
  for (const r of rows) {
    console.log(
      mark(r) + '  ' + r.id.padEnd(22) + r.what.padEnd(48) +
      (r.evidence != null ? String(r.evidence).slice(0, 46) : r.note || '—'),
    )
  }
  console.log('')
}

/* The colour-change claim is the only one no single pin can make. "The colour
   it already changes to" is a RELATION between two sheets, and two pins that
   each merely find A colour would both be green on an app that painted the
   same green at 3 HP and at 67. Asserted across the pair, both halves. */
const hurt = results.find(r => r.id === 'hp-colour-hurt')
const full = results.find(r => r.id === 'hp-colour-full')
const colourChanges = hurt?.evidence && full?.evidence && hurt.evidence !== full.evidence
console.log('HP COLOUR: 3/67 → ' + (hurt?.evidence ?? 'not found'))
console.log('           67/67 → ' + (full?.evidence ?? 'not found'))
console.log('           ' + (colourChanges ? 'DIFFERENT — the colour really changes' : '*** SAME — the colour does not change ***'))
console.log('')

const keepRed = results.filter(r => r.kind === 'KEEP' && !r.ok)
const arriveGreen = results.filter(r => r.kind === 'ARRIVE' && !r.ok)
const arriveRed = results.filter(r => r.kind === 'ARRIVE' && !r.found)

console.log('KEEP green:   ' + results.filter(r => r.kind === 'KEEP' && r.ok).length + '/' + results.filter(r => r.kind === 'KEEP').length)
console.log('ARRIVE red:   ' + arriveRed.length + '/' + results.filter(r => r.kind === 'ARRIVE').length +
  (AFTER ? '' : '   ← this file has been shown able to fail'))
if (Object.keys(pageErrors).length) {
  console.log('\nPAGE ERRORS:')
  for (const [id, e] of Object.entries(pageErrors)) console.log('  ' + id + ': ' + e.join(' | '))
} else {
  console.log('PAGE ERRORS: none')
}

if (keepRed.length) {
  console.log('\nKEEP pins red — the app or the probe is wrong, and it must be found out which:')
  for (const r of keepRed) console.log('  ' + r.id + ' — ' + (r.note || 'not found on the glass'))
}
if (arriveGreen.length && !AFTER) {
  console.log('\nARRIVE pins already green before the change — the pin is not pinning anything:')
  for (const r of arriveGreen) console.log('  ' + r.id + ' — ' + r.evidence)
}

process.exit(keepRed.length || arriveGreen.length || !colourChanges ? 1 : 0)
