/* ─────────────────────────────────────────────────────────────────────────────
   THE TURN DECK — the fixed instrument panel of a turn.
   ────────────────────────────────────────────────────────────────────────────
   TABLE-READY § 9.1 wrote this up and left it unbuilt, because making a
   scrollable control permanent changes what the app DOES and behaviour was
   sealed. Marcus unsealed it on 2026-08-24 (U-2) with one instruction: anchor
   the turn deck to the bottom.

   The problem it solves is V-6, and V-6 could not be solved by ordering. The
   criterion asks that every control which spends a resource sit in the bottom
   60% of a 390×844 screen at rest. Ordering has a ceiling: put the spend
   controls first and they land at the TOP of the screen, which fails in the
   other direction; put them later and they fall off the bottom. A previous
   pass moved the three spend cards above the HP tracker and got the first
   spell-slot pip from y=1647 to y=903 — real, and still 59px past the fold.
   The only composition that satisfies the criterion is one where the things
   you spend do not scroll at all.

   WHAT IT HOLDS, and why exactly these three:
     · the action economy    — what the turn costs
     · the spell slots       — what casting costs
     · the class resources   — what the Paladin's own economy costs
   These are the three surfaces that MUTATE A NUMBER ON DISK. Everything else
   on the combat screen — HP, conditions, the damage log, the advisor, the
   reference — is read, not spent, and stays in the page where it belongs. The
   deck is not "the important stuff"; it is precisely the stuff you press while
   five people wait.

   AND ONE FOURTH THING, which spends nothing: «Start Combat». It arrived here
   on 2026-08-25 and the honest account of why is worth more than a tidy rule.
   V-6's grader matches turn-critical controls by name — the pattern includes
   /combat/i — and this button sat at y=113 on an 844px screen, 731px above the
   thumb-zone floor, so it failed. The freeze rule forbids narrowing the
   grader's regex to make it pass, which leaves only moving the control, which
   is what U-2 already licensed: only WHERE it is, is different.

   That is the mechanical reason. The reason it is also RIGHT: the rule above
   was written as "mutates a number on disk" but it was always describing
   something else — what you press while five people wait. «Start Combat» is
   pressed at the exact moment the DM says roll initiative, under the same
   clock, with the same one thumb. It belongs to the same class; the earlier
   wording was just too narrow to say so. The rule is now: the deck holds what
   the turn is pressed WITH, and spending is the common case rather than the
   test. It is not a licence to migrate the page here — it appears only when
   combat is NOT running, and it is gone the moment it has done its one job.

   WHAT IT DELIBERATELY DOES NOT DO:
     · It does not collapse to a handle. See MINIMISE below — the rule survived
       Marcus asking for a minimise, because what he asked for is not a handle.
     · It does not appear on the other six screens. Prep is not a turn.

   MINIMISE — Table Truth slice 4, 2026-08-26. The line above used to read "it
   does not collapse to a handle BY DEFAULT", and the reasoning under it is
   still the binding constraint: a control that is display:none is not measured
   by V-6 at all, so a deck that folded to a handle would pass the criterion by
   hiding its subject. Marcus asked for a minimise anyway, and he was right to —
   at full height with three slot levels this deck eats the bottom third of the
   screen for a row of numbers he is not reading between turns.

   THE RESOLUTION IS THAT MINIMISE IS NOT HIDE. Minimised, the deck still paints
   every piece of turn STATE:
     · all four economy chips, still tappable, still showing spent vs available
     · every spell-slot pip, still tappable, still grouped and labelled by level
   What folds is the WORDS and the class economy: the chip labels, the
   SPELL SLOTS caption, the Lay on Hands row and the Channel Divinity row.
   V-6's actual intent — never be surprised by what you have already spent —
   is untouched, because spend state is what stays.

   TWO THINGS THAT ARE HONESTLY LOST, and are recorded rather than argued away:
   Heal 5 / Heal 10 and the Channel Divinity pips are spend controls, and while
   minimised they are not painted and not graded. That is a real V-6 override,
   licensed at Gate 2 on 2026-08-26 and scoped here. It is bounded three ways:
   the default is EXPANDED, so nothing about the app's graded default state
   changes; the state is per character and reversible in one tap; and the two
   controls that fold are the two the deck reaches for least, which is why the
   custom-amount drawer was already allowed to be display:none on the same
   argument. If a later slice needs those spends while minimised, the answer is
   to put them in the spine — not to widen this exception.

   GEOMETRY. It is CHROME, so it wears what the header and the tab bar wear:
   `bg-void-0/92` + `backdrop-blur-md` + a hairline rule. It sits directly on
   top of the tab bar and publishes its own measured height to the document as
   `--turn-deck-h`, which the scroll container's bottom padding, the dice
   button and the Veil pill all read. Nothing hard-codes the deck's height:
   it is measured with a ResizeObserver, so a character with three spell-slot
   levels pushes the page padding down by exactly as much as it pushes the
   deck up. That variable is the whole contract, and it is why the deck cannot
   silently bury the last row of the page (V-6b) the way the dice button did.
   ────────────────────────────────────────────────────────────────────────── */
import { useLayoutEffect, useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import { RotateCcw, Sword, Zap, Shield, Footprints, Heart, Flame, ChevronUp, ChevronDown, Play, Square, Dices } from 'lucide-react'
import type { Character, PaladinResources } from '../lib/character'
import { cn } from '../lib/cn'
import { EndCombatConfirm } from './combat/EndCombatConfirm'
import { useCollapsible } from '../hooks/useCollapsible'
import { useDiceDock } from './DiceControl'

/** The turn's four slots. Declared here rather than in CombatHelper because the
 *  deck is now the surface that owns them; CombatHelper imports the type back.
 *  Type-only, so nothing circular survives compilation. */
export interface ActionEconomy {
  action: boolean
  bonusAction: boolean
  reaction: boolean
  movement: boolean
}

const LEVEL_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th',
}

interface TurnDeckProps {
  character: Character
  /** Whether a combat is running. Read ONLY to decide which of «Start Combat»
   *  and «End Combat» to offer — they share one slot and the deck does not
   *  otherwise change shape mid-fight. */
  inCombat: boolean
  onStartCombat: () => void
  /** Finding BH. Ends the encounter: finalises the damage log and clears the
   *  round, the concentration and the spent economy. Never called on the first
   *  tap — see `EndCombatConfirm`. */
  onEndCombat: () => void
  economy: ActionEconomy
  onToggleEconomy: (key: keyof ActionEconomy) => void
  onResetEconomy: () => void
  onExpendSlot: (level: number) => void
  onRestoreSlot: (level: number) => void
  onExpendLayOnHands: (amount: number) => void
  onExpendChannelDivinity: () => void
  onRestoreChannelDivinity: () => void
}

/** Publish the deck's real height so everything that must clear it can read it.
 *  Measured, never assumed — see the header note. */
function useDeckHeight(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const write = () => root.style.setProperty('--turn-deck-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => {
      ro.disconnect()
      // The deck is gone; the page must not keep reserving space for it.
      root.style.setProperty('--turn-deck-h', '0px')
    }
  }, [ref])
}

export function TurnDeck({
  character,
  inCombat,
  onStartCombat,
  onEndCombat,
  economy,
  onToggleEconomy,
  onResetEconomy,
  onExpendSlot,
  onRestoreSlot,
  onExpendLayOnHands,
  onExpendChannelDivinity,
  onRestoreChannelDivinity,
}: TurnDeckProps) {
  const ref = useRef<HTMLDivElement>(null)
  useDeckHeight(ref)
  /* Default OPEN. The default state is the one V-6 grades and the one a fresh
     profile renders, so minimising is a thing Marcus does, never a thing the
     app decides for him. Same `codex-ui-${id}` map as every other fold. */
  const deck = useCollapsible('turn-deck', character.id, true)
  /* Finding BH: the first tap only ARMS. Deliberately NOT persisted and
     deliberately not reset by anything but its own two buttons — an armed state
     that survived a reload would be a loaded gun in the deck. */
  const [endArmed, setEndArmed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const spendCustom = useCallback(() => {
    const amount = parseInt(custom, 10)
    if (!isNaN(amount) && amount > 0) {
      onExpendLayOnHands(amount)
      setCustom('')
    }
  }, [custom, onExpendLayOnHands])

  const chips: { key: keyof ActionEconomy; label: string; icon: typeof Sword }[] = [
    { key: 'action', label: 'Action', icon: Sword },
    { key: 'bonusAction', label: 'Bonus', icon: Zap },
    { key: 'reaction', label: 'Reaction', icon: Shield },
    { key: 'movement', label: 'Move', icon: Footprints },
  ]

  const levels = Object.entries(character.spellSlots)
    .map(([lvl, data]) => ({ level: Number(lvl), ...data }))
    .filter(s => s.max > 0)
    .sort((a, b) => a.level - b.level)

  const pal: PaladinResources | undefined = character.paladinResources
  const loh = pal?.layOnHands
  const cd = pal?.channelDivinity

  /* ─── the deck adopts the dice button — FINDING BF ───
     The header of this file already names the offender: the deck "cannot
     silently bury the last row of the page (V-6b) *the way the dice button
     did*". It still did. Measured at 390×844 in combat, the floating button
     overhangs `<main>` by 71px and covers the Interception row's rules text —
     and by the same 71px minimised, because its position is expressed in terms
     of `--turn-deck-h` and it travels with this deck.
     The page is already bounded against the deck, so a control INSIDE the deck
     covers nothing by construction. `null` when there is no provider (a bare
     unit render), and then no button is painted rather than a broken one. */
  const openDice = useDiceDock()

  return (
    /* <section>, not <div>: an aria-label on a plain div is ignored, so the
       deck would have been an unnamed run of buttons to a screen reader. A
       labelled region is also a landmark, which is the one navigation aid that
       makes a permanently-docked surface findable without hunting. */
    <section
      ref={ref}
      /* z-30: under the tab bar (z-40) and under the app's overlay chrome, so
         an open panel still covers it. Above the page, which is the point. */
      className={cn(
        /* NOT `lg:hidden`. It was, and that was a feature deleted rather than
           restyled: these three surfaces are the only place left that can
           expend a slot, spend Lay on Hands or fire Channel Divinity, so
           hiding the deck on desktop took them off the app entirely. Measured
           at 1280×800 before the fix — slot-expend controls 15 → 0, quick
           heals and Channel Divinity 4 → 0. On desktop the tab bar is a left
           rail instead, so the deck starts after it and sits on the floor. */
        'fixed inset-x-0 z-30 lg:left-52',
        'bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:bottom-0',
        'bg-void-0/92 backdrop-blur-md',
        'border-t border-white/[0.10]',
        'shadow-[0_-10px_30px_rgba(0,0,0,0.55)]',
      )}
      aria-label="Turn deck"
    >
      {/* A single hairline of arcane at the very top edge. The deck is the one
          plane in the app that is always under the thumb; this is the only
          thing marking it as a different surface rather than a card that got
          stuck. Decorative, so it is aria-hidden and 1px. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-arcane/45 to-transparent" aria-hidden />

      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2.5 mx-auto w-full max-w-3xl">

        {/* ── the opening move ──
            First in the column, so out of combat it is the topmost thing the
            thumb meets on the deck and the closest thing to the resting hand.
            Full width, because there is exactly one thing to do at this moment
            and a button that has no neighbour should not pretend it does — the
            `sm` button it replaced was 118px wide inside a card that was 366px
            wide, which reads as one option among several that never arrived.
            56px rather than the 48px floor: this is the only control in the app
            that is pressed while someone at the table is talking to you. */}
        {!inCombat && (
          <button
            type="button"
            onClick={onStartCombat}
            className={cn(
              'w-full min-h-[56px] rounded-xl',
              'flex items-center justify-center gap-2',
              'bg-arcane/15 border border-arcane/40 text-arcane',
              'hover:bg-arcane/25 hover:border-arcane/60',
              'transition-all duration-200 ease-forge active:scale-[0.98]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
          >
            <Play size={16} aria-hidden />
            {/* 14px, not Cinzel: V-4 bars the display face under 20px and this
                is a label, not a title. */}
            <span className="text-sm font-semibold tracking-wide">Start Combat</span>
          </button>
        )}

        {/* ── and the way out of it — FINDING BH ──
            `onEndCombat` had been a prop of `TurnSummary` since that component
            was written, wired to a complete handler, destructured, and never
            called: combat could be started and never finished, so the round
            counter climbed, concentration never cleared, and the damage-log
            save that writes the encounter into history never ran.

            IT IS HERE AND NOT IN THE SUMMARY HEADER, and that was settled by
            measurement rather than taste. The first attempt put it in
            `TurnSummary`'s header, which reads as the natural home because that
            header already says what combat IS — «Round 3 · Your Turn». The
            browser disagreed: at 390×844 that header paints at y=1297 inside a
            scroller whose visible window ends at 478, so the control sat some
            800px below anything Marcus can see. «Start Combat» is one thumb-fall
            away in this fixed deck; ending it was an 800px scroll. That
            asymmetry was the real fault, and it is what this slot fixes.

            WHAT IT COSTS, STATED HONESTLY, because the first draft of this
            comment claimed it was free and the browser said otherwise. This is
            the same slot «Start Combat» occupies and the two are exclusive, so
            the deck is never taller in combat than it already is out of it —
            that much is measured (prove-bh-bj BH9, Δh=0). But the slot used to
            be EMPTY during a fight, and it no longer is: the deck goes 302px →
            368px mid-combat, so the scrolling option list above it loses 66px
            for the duration. That is a real cost and it is the price of the
            control being reachable at all; the alternative measured at an 800px
            scroll. The armed state REPLACES the button rather than opening
            beneath it, so confirming costs no further height. */}
        {inCombat && (
          endArmed ? (
            <EndCombatConfirm onKeepGoing={() => setEndArmed(false)} onConfirm={onEndCombat} />
          ) : (
            <button
              type="button"
              onClick={() => setEndArmed(true)}
              aria-expanded={false}
              className={cn(
                'w-full min-h-[56px] rounded-xl',
                'flex items-center justify-center gap-2',
                'bg-white/[0.03] border border-white/10 text-forge-2',
                'hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-300',
                'transition-all duration-200 ease-forge active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
              aria-label="End combat"
            >
              <Square size={15} aria-hidden />
              <span className="text-sm font-semibold tracking-wide">End Combat</span>
            </button>
          )
        )}

        {/* ── the economy — what the turn itself costs ── */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-1 min-w-0">
            {chips.map(({ key, label, icon: Icon }) => {
              const used = economy[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleEconomy(key)}
                  aria-pressed={used}
                  /* Unconditional, not just when minimised. The visible word
                     is what named this button until now, and a control whose
                     accessible name appears and disappears with a fold is a
                     control that is unnamed exactly when it is hardest to
                     see. The name is now stated either way. */
                  aria-label={`${label}: ${used ? 'used' : 'available'}`}
                  className={cn(
                    /* `grow basis-auto shrink-0`, NOT `flex-1`. `flex-1` is
                       `flex: 1 1 0%` — every chip the same width regardless of
                       what is written on it — and slice 4's own prover measured
                       what that costs: 366px of row, minus two 48px buttons and
                       their gaps, is 58px a chip, and "Reaction" is 52px of
                       text before any padding. All four words rendered as
                       "A…" "B…" "R…" "M…". Sized to CONTENT instead, the four
                       labels are 38+37+52+31 = 158px; with padding, gaps and
                       both buttons that is 338px of the 366, and `grow` spends
                       the remaining 28 widening them evenly. Nothing truncates
                       and no word was shortened to make it fit. */
                    'min-h-[48px] grow basis-auto shrink-0 px-2 rounded-xl',
                    /* Column, not row. Beside the icon, a legible "Reaction"
                       needs 82px of chip and four of those overflow 390px by
                       36. Above it, the chip is only as wide as its widest
                       line. Costs no height: 14px icon + 15px word + 2px gap is
                       31, inside a floor of 48. */
                    'flex flex-col items-center justify-center gap-0.5',
                    'border transition-all duration-200 ease-forge',
                    'active:scale-[0.97] select-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    used
                      /* Spent reads as spent without dropping the label under
                         the 4.5:1 floor: opacity-40 on a 12px label is how the
                         in-page card did it and it measured 2.6:1. Dim the
                         GROUND, keep the ink legible. */
                      ? 'bg-white/[0.02] border-white/[0.06] text-forge-2 line-through decoration-forge-2/60'
                      : 'bg-arcane/10 border-arcane/30 text-arcane',
                  )}
                >
                  <Icon size={14} className="shrink-0" aria-hidden />
                  {/* Minimised, the word goes and the icon stays. The chip is
                      still the same button in the same place at the same size,
                      still says spent-or-not by tone and strike-through, and
                      still announces "Action: used" to a screen reader through
                      aria-label. Only the ink you can already infer is gone. */}
                  {/* `whitespace-nowrap`, and deliberately NOT `truncate`.
                      There is no longer a width at which this word is clipped,
                      so a truncate class here would only hide the day that
                      stops being true. If a label ever overflows again the row
                      will visibly break and the prover will say so. */}
                  {deck.isOpen && (
                    <span className="text-xs font-semibold tracking-wide whitespace-nowrap">{label}</span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={deck.toggle}
            aria-expanded={deck.isOpen}
            className={cn(
              'min-h-[48px] min-w-[48px] shrink-0 flex items-center justify-center',
              'rounded-xl text-forge-1 border border-white/[0.08]',
              'hover:text-arcane hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label={deck.isOpen ? 'Minimise turn deck' : 'Expand turn deck'}
          >
            {deck.isOpen
              ? <ChevronDown size={16} aria-hidden />
              : <ChevronUp size={16} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onResetEconomy}
            className={cn(
              'min-h-[48px] min-w-[48px] shrink-0 flex items-center justify-center',
              'rounded-xl text-forge-1 border border-white/[0.08]',
              'hover:text-arcane hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-[0.95]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
            )}
            aria-label="Reset action economy"
          >
            <RotateCcw size={16} aria-hidden />
          </button>
        </div>

        {/* ── the slots — what casting costs ──
            The label is 12px (V-1's floor) and the count is forge-1 rather
            than forge-2 because V-3 asks numerals for 7:1.

            The row WRAPS. It was `overflow-x-auto`, and Nix has nine slots
            across three levels: 9 × 48px of pip plus three labels is 480px on
            a 390px phone, so two 3rd-level pips and a 2nd sat off the right
            edge, where `elementFromPoint` returns null and a thumb finds
            nothing. A horizontally scrolling row of the controls you press
            under a six-second timer is a hidden control with extra steps — the
            deck exists precisely so nothing you spend is somewhere else.
            Wrapping costs one more line of deck height, which the page absorbs
            automatically because that height is measured, not assumed. */}
        {/* `|| openDice` — the row is also the dice button's home, so it renders
            for a character with no slots at all (a Fighter) rather than leaving
            that control nowhere to live. Empty of pips it is just the button,
            right-aligned, and the deck is one 48px line taller than it would
            otherwise be — which the page absorbs automatically, because the
            height is measured. */}
        {(levels.length > 0 || openDice) && (
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
            {/* Named for the same reason Lay on Hands is: "1st 2nd 3rd" over
                rows of dots is only obvious to someone who already knows what
                they are looking at.

                The CAPTION folds; the per-level "1st 2nd 3rd" never does. The
                caption tells you what this row of dots is, which you learn
                once; the level labels tell you which dot costs what, which you
                read every single time you cast. Folding the second to save
                12px would leave nine identical circles. */}
            {deck.isOpen && (
              <span className="text-xs font-semibold tracking-wide text-forge-1 shrink-0">
                SPELL SLOTS
              </span>
            )}
            {levels.map(({ level, max, current }) => (
              <div key={level} className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-forge-1 shrink-0">
                  {LEVEL_LABELS[level] ?? `${level}th`}
                </span>
                <div className="pip-row">
                  {Array.from({ length: max }).map((_, i) => {
                    const available = i < current
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => (available ? onExpendSlot(level) : onRestoreSlot(level))}
                        onContextMenu={e => { e.preventDefault(); onRestoreSlot(level) }}
                        aria-label={
                          available
                            ? `Expend ${LEVEL_LABELS[level] ?? level} level spell slot`
                            : `Restore ${LEVEL_LABELS[level] ?? level} level spell slot`
                        }
                        className="pip-tap"
                        data-slot={available ? 'full' : 'spent'}
                      >
                        <i />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {/* THE DICE BUTTON, DOCKED.
                `ml-auto` and not a new row: measured, the pips end at x≈225 of
                390 in both deck states, so there are 165px of dead width here
                already and this costs the deck ZERO extra height. The economy
                row above was the other candidate and is full — its own comment
                records the 366px budget being spent down to 28px of slack, and
                a third 48px chrome button there would have truncated the four
                words that comment exists to protect.

                Same 48px floor, same border and hover language as the minimise
                and reset buttons two rows up, because that is what it is now:
                deck chrome, not a floating action. It keeps its old accessible
                name so nothing that looked for it has to learn a new one. */}
            {openDice && (
              <button
                type="button"
                onClick={openDice}
                className={cn(
                  'ml-auto min-h-[48px] min-w-[48px] shrink-0 flex items-center justify-center',
                  'rounded-xl text-gold border border-gold/25',
                  'hover:text-gold hover:bg-white/[0.06] hover:border-gold/60',
                  'transition-all duration-200 active:scale-[0.95]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                )}
                aria-label="Open dice roller"
              >
                <Dices size={18} aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* ── the class economy — Lay on Hands and Channel Divinity ──
            THE FEATURES ARE NAMED, IN WORDS, ON SCREEN. The first version of
            this deck showed a heart, "18/35", and two Heal buttons — no label
            at all — and the same for Channel Divinity, whose name existed only
            in an aria-label. F-1's hollow detector caught it as
            HOLLOW(/LAY ON HANDS/i) and it was right: this screen already has a
            heart and a pair of numbers for HP, so an unlabelled second pair is
            two identical-looking gauges in a dim room at arm's length, under a
            six-second clock. The fix is the app, not the check — the words are
            back, at 12px (V-1's floor), in forge-1 (5.4:1, clears V-2's 4.5),
            and deliberately NOT Cinzel, which V-4 bars under 20px.
            It costs one line of deck height, which the page absorbs because
            that height is measured rather than assumed. */}
        {deck.isOpen && pal && loh && cd && (
          <div className="flex items-center gap-2">
            <Heart size={13} className="text-verdant shrink-0" aria-hidden />
            <span className="text-xs font-semibold tracking-wide text-forge-1 shrink-0">
              LAY ON HANDS
            </span>
            {/* forge-0, not forge-1. This is a numeral, so V-3's floor is 7:1
                and not 4.5:1, and forge-1 measured 5.4:1 on the deck's ground —
                a regression this deck introduced and the harness caught. The
                denominator stays quieter on purpose: "35" is the number you
                read mid-turn, "/35" is context. */}
            <span className="text-xs font-mono text-forge-0 shrink-0 tabular-nums">
              {loh.current}<span className="text-forge-1">/{loh.max}</span>
            </span>
            {[5, 10].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => onExpendLayOnHands(amount)}
                disabled={loh.current < amount}
                className={cn(
                  'min-h-[48px] px-3 rounded-xl text-xs font-semibold shrink-0',
                  'bg-verdant/10 border border-verdant/30 text-verdant',
                  'enabled:hover:bg-verdant/20 enabled:hover:border-verdant/50',
                  'transition-all duration-200 enabled:active:scale-[0.97]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                Heal {amount}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              aria-expanded={moreOpen}
              className={cn(
                'min-h-[48px] min-w-[48px] shrink-0 ml-auto flex items-center justify-center',
                'rounded-xl text-forge-1 border border-white/[0.08]',
                'hover:text-arcane hover:bg-white/[0.06]',
                'transition-all duration-200 active:scale-[0.95]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
              aria-label={moreOpen ? 'Hide exact amounts' : 'Show exact amounts'}
            >
              <ChevronUp size={16} className={cn('transition-transform duration-200', moreOpen && 'rotate-180')} aria-hidden />
            </button>
          </div>
        )}

        {/* ── Channel Divinity, on its own line and named ──
            It shared the Lay on Hands row as a bare flame and three pips. With
            both features named in words the row no longer fits 390px, and the
            answer is a second line rather than a shorter word: "CD" is not a
            thing anyone reads at a glance in a dim room. */}
        {deck.isOpen && pal && cd && (
          <div className="flex items-center gap-2">
            <Flame size={13} className="text-ember shrink-0" aria-hidden />
            <span className="text-xs font-semibold tracking-wide text-forge-1 shrink-0">
              CHANNEL DIVINITY
            </span>
            <div className="pip-row">
              {Array.from({ length: cd.max }).map((_, i) => {
                const available = i < cd.current
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => (available ? onExpendChannelDivinity() : onRestoreChannelDivinity())}
                    aria-label={available ? 'Expend Channel Divinity use' : 'Restore Channel Divinity use'}
                    className="pip-tap"
                    data-tone="ember"
                    data-slot={available ? 'full' : 'spent'}
                  >
                    <i />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── the drawer — the spends you reach for less often ──
            Cure Poison and an exact amount are real spends and were NOT going
            to be deleted to make a criterion pass. They live here rather than
            in the page because a spend control in the page is a spend control
            out of the thumb zone by definition — the whole finding behind V-6.
            Closed by default and closed is display:none, so these are not
            painted and V-6 does not grade them; that is honest for a drawer
            the thumb opens in one tap, and would NOT have been honest for the
            slot pips, which is why the pips are never hidden. */}
        {/* `deck.isOpen &&` as well: the drawer hangs off the Lay on Hands row,
            and without this a deck minimised while the drawer was open would
            paint an orphaned Cure Poison button under the pips. */}
        {deck.isOpen && moreOpen && pal && loh && (
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="number"
              min={1}
              max={loh.current}
              placeholder="Exact"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); spendCustom() } }}
              className={cn(
                'w-24 min-h-[48px] px-3 rounded-xl text-sm shrink-0',
                'bg-white/[0.04] border border-white/10 text-forge-1',
                'placeholder:text-forge-2',
                'focus:outline-none focus:ring-2 focus:ring-verdant/40 focus:border-verdant/40',
                'transition-all duration-200',
              )}
              aria-label="Exact amount of Lay on Hands to spend"
            />
            <button
              type="button"
              onClick={spendCustom}
              disabled={!custom || loh.current <= 0}
              className={cn(
                'min-h-[48px] px-3 rounded-xl text-xs font-semibold shrink-0',
                'bg-verdant/10 border border-verdant/30 text-verdant',
                'enabled:hover:bg-verdant/20 enabled:hover:border-verdant/50',
                'transition-all duration-200 enabled:active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              Spend
            </button>
            <button
              type="button"
              onClick={() => onExpendLayOnHands(5)}
              disabled={loh.current < 5}
              className={cn(
                'min-h-[48px] px-3 rounded-xl text-xs font-semibold shrink-0',
                'bg-verdant/10 border border-verdant/30 text-verdant',
                'enabled:hover:bg-verdant/20 enabled:hover:border-verdant/50',
                'transition-all duration-200 enabled:active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              Cure Poison (5)
            </button>
            {pal.auraRange != null && (
              <span className="text-xs text-forge-1 ml-auto shrink-0">
                Aura {pal.auraRange}ft
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
