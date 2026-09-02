/* The question nothing has ever asked him: which Fighting Style did you take?
 *
 * Open Book slice 6. Marcus: "Interception is indeed a fighting style. That
 * should be placed somewhere in app so i can read details, and also in combat."
 *
 * ── WHY IT LIVES INSIDE THE FIGHTING STYLE ROW ──────────────────────────────
 *
 * Not on a settings screen, not on the character page — inside the *Fighting
 * Style* class-feature card in the Grimoire, under the three bands that explain
 * what a Fighting Style IS. The choice and the explanation of the choice are one
 * tap apart because they are one thing. Gate 1's guardrail is that "what does
 * this cost me" stays two taps away, and this adds nothing above band 1: the
 * picker is rendered below the bands, where the row's buttons already are.
 *
 * ── ELEVEN ROWS, ONE OF THEM PRESSED ────────────────────────────────────────
 *
 * Not a `<select>`. Marcus asked, of the whole app, for "a very apparent and
 * masterful orginization visually", and a dropdown hides ten options behind a
 * chevron in order to save a hundred pixels on a screen he is already scrolling.
 * Eleven rows, each showing what the style DOES in canon's own words, is the
 * form that answers "which should I take" rather than merely recording an answer
 * he arrived at somewhere else.
 *
 * Canon's Paladin advice is shown on the styles that have it — 6 of the 11 —
 * and simply absent on the other 5. `paladinNote` is `null` there, which is
 * canon saying nothing rather than canon being missing, and an empty advice box
 * would say the opposite.
 *
 * ── THE CHOSEN ONE IS PRESSABLE ─────────────────────────────────────────────
 *
 * Pressing the chosen style un-chooses it. He might have mis-tapped, and a
 * choice that cannot be undone is a choice that has to be right first time on a
 * phone at a table. `toggleFightingStyle` owns that rule; this component owns
 * none of it. */

import { Check, Dot, Swords } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fightingStyles, currentFightingStyle } from '../../lib/prepare/fighting-style'
import { normalizeName } from '../../lib/canon/lookup'
import type { CanonFeat } from '../../lib/canon/types'
import type { Character } from '../../lib/character'

export interface FightingStylePickerProps {
  character: Character
  /** The page owns the write; this owns the press. */
  onPick: (style: CanonFeat) => void
  /** True when the *Fighting Style* row is still locked — he is below level 2.
   *  Passed in rather than computed, because `build.ts` already computed it and
   *  a second copy of a lock is a second lock that can disagree. */
  locked?: boolean
}

export function FightingStylePicker({ character, onPick, locked = false }: FightingStylePickerProps) {
  const styles = fightingStyles()
  const chosen = currentFightingStyle(character)
  const chosenKey = chosen ? normalizeName(chosen.name) : null

  return (
    <div
      data-fighting-style-picker
      data-chosen={chosen ? chosen.name : undefined}
      className="w-full border-t border-bronze/20 px-3 py-3 flex flex-col gap-2"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-forge-2">
        <Swords size={12} aria-hidden />
        {chosen ? 'Your fighting style' : 'Pick your fighting style'}
      </p>

      {/* Said out loud rather than left as an empty state. A Paladin has one of
          these from level 2 and Marcus has been playing without the app knowing
          which — the sentence that explains why his combat tab is short a
          reaction belongs where the fix is. */}
      {!chosen && !locked && (
        <p className="text-[11px] leading-relaxed text-forge-1">
          You chose one of these at level 2 and this app has never been told which.
          Pick it and it becomes usable everywhere — including as a Reaction on your
          combat tab, if it is one.
        </p>
      )}

      {locked && (
        <p className="text-[11px] leading-relaxed text-forge-2">
          You choose a Fighting Style at Paladin level 2.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {styles.map(style => {
          const isChosen = chosenKey !== null && normalizeName(style.name) === chosenKey
          const effects = (style.effects ?? []).filter(Boolean)
          return (
            <button
              key={style.name}
              type="button"
              data-style-option={style.name}
              data-style-chosen={isChosen ? 'yes' : undefined}
              disabled={locked}
              aria-pressed={isChosen}
              onClick={() => onPick(style as CanonFeat)}
              className={cn(
                'w-full rounded-lg border px-2.5 py-2 text-left transition-all duration-200 ease-forge',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                locked && 'opacity-50',
                !locked && 'active:scale-[0.99]',
                isChosen
                  ? 'border-verdant/50 bg-verdant/[0.08]'
                  : 'border-white/8 bg-white/[0.02]',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="shrink-0 text-verdant">
                  {isChosen ? <Check size={13} aria-hidden /> : <Dot size={13} className="text-forge-2" aria-hidden />}
                </span>
                <span className={cn('text-xs font-semibold', isChosen ? 'text-verdant' : 'text-forge-0')}>
                  {style.name}
                </span>
              </span>

              {/* Canon's rules text, every sentence of it. This is the same array
                  `fightingStyleFeat` copies onto the sheet, so what he reads here
                  is exactly what the combat tab will read out later. */}
              {effects.map(effect => (
                <span key={effect} className="mt-1 block text-[11px] leading-relaxed text-forge-1">
                  {effect}
                </span>
              ))}

              {/* Absent, not empty, on the five canon says nothing about. */}
              {typeof style.paladinNote === 'string' && style.paladinNote.trim() !== '' && (
                <span className="mt-1.5 block text-[10px] leading-relaxed text-gold/85">
                  {style.paladinNote}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
