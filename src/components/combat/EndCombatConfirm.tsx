/* The confirm strip — finding BH's second tap.
 *
 * TWO TAPS, BECAUSE ENDING IS NOT UNDOABLE. `handleEndCombat` finalises the
 * damage log and calls `forgetCombat`, which removes `codex-combat-${id}` from
 * disk. A single mis-tap mid-fight would take the round, the spent economy and
 * the concentration with it. So the deck's button only ARMS; this strip is what
 * ends the fight, and it says what will happen before it happens.
 *
 * No `window.confirm`: a native modal blocks the page, and this is a control
 * pressed with five people waiting.
 *
 * It states the consequence in the words of the thing that actually happens —
 * the log is saved, the round clears — because a confirm that only asks "are
 * you sure?" moves the decision without informing it.
 *
 * ITS OWN FILE, and exported, for the reason `RetaliationCapture.test.tsx`
 * gives: this repo has no jsdom, so a strip that only exists after a tap is
 * invisible to the node suite. Exporting it lets the words and the two doors be
 * pinned there; the taps that reveal it are driven for real in
 * docs/plans/table-truth/prove-bh-bj.mjs.
 *
 * Table Truth, phase-1 close-out — finding BH. */
import { cn } from '../../lib/cn'

export function EndCombatConfirm({
  onKeepGoing,
  onConfirm,
}: {
  onKeepGoing: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className={cn(
        'w-full rounded-xl px-3 py-2.5',
        'border border-red-500/40 bg-red-500/[0.09]',
        'flex items-center justify-between gap-2',
      )}
      role="group"
      aria-label="End combat confirmation"
    >
      <span className="text-[11px] text-forge-1 leading-snug min-w-0">
        End the encounter? Your damage log is saved to history, and the round
        counter, concentration and spent economy clear.
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onKeepGoing}
          className={cn(
            'min-h-[44px] px-3 rounded-lg text-xs font-medium',
            'text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
            'transition-all duration-200 active:scale-95',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
          aria-label="Keep fighting"
        >
          Keep going
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'min-h-[44px] px-3 rounded-lg text-xs font-semibold',
            'bg-red-500/15 border border-red-500/40 text-red-300',
            'hover:bg-red-500/25 hover:border-red-500/60',
            'transition-all duration-200 active:scale-95',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400',
          )}
          aria-label="End combat — confirm"
        >
          End combat
        </button>
      </div>
    </div>
  )
}
