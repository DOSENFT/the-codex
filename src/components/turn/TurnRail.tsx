import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { useDiceDock } from '../DiceControl'
import { EndCombatDoor } from './EndCombatD'
import type { SpellSlotLine, TurnResource } from '../../lib/turn/types'

/** One thing a single use of a pool can buy. Shape only — the rail does not
 *  know these are Channel Divinity options; `TurnLive` hands them over from
 *  `channelDivinityOptions()` in src/lib. */
export interface PoolChoice {
  id: string
  name: string
  actionLabel: string
  summary: string
  facts?: string
  detail?: string
  sourceLabel?: string
  /** Set when the choice grants temporary HP (the flaming cloak). */
  grantsTempHP?: number
}

/** How a choice's Use was paid. 'took' = the turn engine recorded it (and Undo
 *  must go through the engine's undo); 'refused' = the engine said no, nothing
 *  was spent; null = not the engine's to handle, so spend one from the pool. */
export type ChoiceUseResult = 'took' | 'refused' | null

/* ============================================================================
   TurnRail — the card's one strip of chrome, and the thing that finally makes
   the numbers on it pressable.
   ----------------------------------------------------------------------------
   THIS REPLACES `TurnScreenD`'s read-only `.res` strip; it does not sit beside
   it. Slices 1-6 painted `turn.spellSlots` and `turn.resources` as text in
   colC. If the rail were added alongside, his slots would be on screen twice —
   which is item 4 and item 10's fault (one number, three places) rebuilt in the
   very phase that exists to remove it. `TurnScreenD` renders `{rail}` INSTEAD
   of that section, so the count is one either way.

   NO RULES LOGIC HERE EITHER. The rail is handed lines and pools and calls
   back with (level) or (poolId, amount). It does not know that Lay on Hands is
   a paladin's, that Channel Divinity comes back on a short rest, or that a 3rd
   level slot is one Nix should not yet have. Every one of those answers was
   made in src/lib/, and the two callers below hand this component the result.

   SHAPE, NEVER NAME. A pool is drawn as pips or as a counter with spend
   buttons according to its `unit`, not according to what it is called. A
   homebrew "Wrath Dice" pool with unit 'uses' gets the same instrument Channel
   Divinity gets, on the day his sheet grows one, without this file changing.
   ========================================================================== */

/** "1st", "2nd", "3rd". A copy, deliberately: `TurnDeck` owns the original and
 *  slice 8 deletes that file. Importing from a corpse to save nine entries is
 *  how a deletion turns into a refactor. */
const LEVEL_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th',
}

/** The spend sizes offered for a pool measured in POINTS.
 *
 *  Lay on Hands is the only such pool on any sheet this app has seen, and the
 *  deck offered 5 and 10 for it. 1 is added because the deck's third control —
 *  an "Exact" number field behind a drawer — is not coming to the rail, and a
 *  pool you can only spend in fives is a pool you cannot spend correctly. */
const POINT_STEPS = [1, 5, 10] as const

export interface TurnVerbsProps {
  onLookup?: () => void
  onReset?: () => void
  inCombat: boolean
  onStartCombat?: () => void
  /** THE CONFIRM, not the first tap — when `onArmEndCombat` is supplied. Slice
   *  R7: this used to be the button's own `onClick`, which made ending a fight
   *  a one-gesture, undoable-by-nobody act. */
  onEndCombat?: () => void
  /** Is the confirm showing? A PROP, not state.
   *
   *  Same law as `bandsOpen`: `TurnScreenD` holds no state, and `TurnVerbs`
   *  reaches the screen through the opaque `verbs` seam — private state here
   *  would put the one destructive control in this tab outside the only
   *  component allowed to own state. It also has to be cleared when the fight
   *  ends by some other route, and only `TurnLive` can see that happen. */
  endArmed?: boolean
  /** The first tap. Absent => the button falls back to the old direct wiring. */
  onArmEndCombat?: () => void
  onCancelEndCombat?: () => void
}

/* ============================================================================
   TurnVerbs — Look up · Reset · End combat. Extracted from the rail in slice 7
   and NOT copied: there is one of this row, and it is here.
   ----------------------------------------------------------------------------
   WHY IT LEFT THE PINNED STRIP. V-6 is *turn-critical **spend** controls are
   always visible*. These three spend nothing. Looking a rule up, resetting the
   economy at the top of a turn and ending the whole combat are not things he
   is surprised to have already done — which is V-6's stated intent. The four
   action-economy slots ARE, and measurement said they were the only such
   control scrolling off the screen. So the two swapped places; the pinned strip
   did not grow.

   Its cost was 48px of a 310px permanent frame on an 844px phone, and slice 7's
   ruling was to spend that on the list instead. The row is now the first thing
   in the scroller, so it is still one gesture away from the top of the tab.
   ========================================================================== */
export function TurnVerbs({
  onLookup,
  onReset,
  inCombat,
  onStartCombat,
  onEndCombat,
  endArmed,
  onArmEndCombat,
  onCancelEndCombat,
}: TurnVerbsProps) {
  /* Same seam as the rail's: null provider, no button, rather than a dead one.
     No `DiceControl` provider wraps the D path today, so this renders nothing —
     ruled 2026-08-31 to stay that way, because he rolls physical dice at the
     table (his item 9). Recorded so slice 8 does not read the absence as a
     regression it should close. */
  const openDice = useDiceDock()

  return (
    <div className="rverbs">
      {openDice && (
        <button type="button" className="rbtn" onClick={openDice} aria-label="Open dice roller">
          Roll
        </button>
      )}
      {onLookup && (
        <button type="button" className="rbtn" onClick={onLookup}>
          Look up
        </button>
      )}
      {onReset && (
        <button type="button" className="rbtn" onClick={onReset} aria-label="Reset action economy">
          Reset
        </button>
      )}
      {/* ONE SLOT, TWO VERBS, and never both. Out of combat the only true
          next thing is to start one; in combat it is to end it. A screen
          offering both would be offering one control for something that
          cannot happen. Either handler may be absent — the read-only card
          the design shoot measures supplies neither. */}
      {inCombat
        ? onEndCombat && (
            /* TWO TAPS, BECAUSE ENDING IS NOT UNDOABLE. The branch itself lives
               in `EndCombatD.tsx` and not here: this component calls
               `useDiceDock`, so it cannot be invoked outside a renderer, and
               with no jsdom in this repo that would leave the one irreversible
               control provable only by the shape of its markup. See that file's
               header. `endArmed` is read ONLY inside this in-combat branch, so a
               flag left set when the fight ends cannot paint a confirm for a
               fight that is not running. */
            <EndCombatDoor
              armed={endArmed}
              onArm={onArmEndCombat}
              onCancel={onCancelEndCombat}
              onConfirm={onEndCombat}
            />
          )
        : onStartCombat && (
            <button type="button" className="rbtn end" onClick={onStartCombat}>
              Start Combat
            </button>
          )}
    </div>
  )
}

export interface TurnRailProps {
  spellSlots: SpellSlotLine[]
  /** Lay on Hands · Channel Divinity, when the sheet carries them — and
   *  anything else `poolsOf` resolves. Empty is a normal state, not an error:
   *  his own export has no `paladinResources` key, so this arrives short. */
  resources: TurnResource[]
  onExpendSlot?: (level: number) => void
  onRestoreSlot?: (level: number) => void
  /** Negative amounts restore. One verb, because "spend −1" and "restore 1" are
   *  the same write to the same clamped setter, and two props would be two
   *  chances to clamp them differently. */
  onSpendResource?: (poolId: string, amount: number) => void
  /** What one use of a pool can buy, keyed by pool id. When a pool has
   *  choices, tapping a FULL pip opens a short list instead of spending
   *  blind (Marcus, 2026-11-12: "if I press the channel divinity buttons, it
   *  can come up with a quick list of things I can use the channel divinity
   *  for"). A spent pip still restores in one tap. Absent or empty → the pip
   *  spends directly, exactly as before. */
  poolChoices?: Readonly<Record<string, readonly PoolChoice[]>>
  /** Optional: lets the screen pay for a choice through the turn engine (the
   *  cloak's temp HP). Return null to fall back to a plain pool spend. */
  onUseChoice?: (poolId: string, choice: PoolChoice) => ChoiceUseResult
  /** Undo for a choice the engine took. */
  onUndoChoice?: () => void
}

/* ============================================================================
   PoolChoicePanel — the list a full pip opens.
   ----------------------------------------------------------------------------
   Inline, under the pools, not a modal: it pushes the list down rather than
   covering the card, so the HP and the round stay readable while he picks.
   Every spend goes through the SAME `onSpendResource` the pip uses, so the
   count can never disagree with the pips beside it. Undo is the same verb with
   a negative amount. Exported so its markup can be tested without a renderer.
   ========================================================================== */
export interface PoolChoicePanelProps {
  pool: TurnResource
  choices: readonly PoolChoice[]
  /** Name of what was just paid for; null while choosing. '' = "just one". */
  used: string | null
  onUse: (choice: PoolChoice) => void
  onSpendPlain: () => void
  onUndo: () => void
  onClose: () => void
  panelRef?: Ref<HTMLDivElement>
}

export function PoolChoicePanel({
  pool,
  choices,
  used,
  onUse,
  onSpendPlain,
  onUndo,
  onClose,
  panelRef,
}: PoolChoicePanelProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }
  const left = `${pool.current} of ${pool.max} left`
  return (
    <div
      ref={panelRef}
      className="rchoice"
      role="group"
      aria-label={`${pool.name} options`}
      onKeyDown={onKeyDown}
    >
      {used !== null ? (
        <div className="rchoice-done">
          <p className="rchoice-msg" role="status">
            <b>{used || `1 ${pool.name}`}</b> — {left}
          </p>
          <div className="rchoice-doors">
            <button type="button" className="rbtn" onClick={onUndo} aria-label={`Undo — give the ${pool.name} use back`}>
              Undo
            </button>
            <button type="button" className="rbtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rchoice-head">
            <span className="k">Spend 1 {pool.name} on</span>
            <span className={`v${pool.current === 0 ? ' spent' : ''}`}>{pool.current}/{pool.max}</span>
          </div>
          <ul className="rchoice-list">
            {choices.map(choice => (
              <li key={choice.id} className="rchoice-item">
                <div className="rchoice-text">
                  <div className="rchoice-top">
                    <span className="rchoice-name">{choice.name}</span>
                    <span className="rchoice-chip">{choice.actionLabel}</span>
                  </div>
                  {choice.facts && <div className="rchoice-facts">{choice.facts}</div>}
                  <p className="rchoice-sum">{choice.summary}</p>
                </div>
                <button
                  type="button"
                  className="rbtn rchoice-use"
                  onClick={() => onUse(choice)}
                  disabled={pool.current < 1}
                  aria-label={`Use ${choice.name} — spends 1 ${pool.name}`}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
          <div className="rchoice-doors">
            <button
              type="button"
              className="rbtn"
              onClick={onSpendPlain}
              disabled={pool.current < 1}
              aria-label={`Just spend 1 ${pool.name}`}
            >
              Just spend one
            </button>
            <button type="button" className="rbtn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function TurnRail({
  spellSlots,
  resources,
  onExpendSlot,
  onRestoreSlot,
  onSpendResource,
  poolChoices,
  onUseChoice,
  onUndoChoice,
}: TurnRailProps) {
  /* Pools split by the ONE thing that decides how they are drawn. `points` is a
     quantity you spend some of; everything else is a countable use, and a use
     is a pip. Read once and named, so the two loops below cannot disagree. */
  const counters = resources.filter(r => r.unit === 'points')
  const uses = resources.filter(r => r.unit !== 'points')

  /* The open choice list, if any. Local, not lifted: it is a transient view of
     a pool, it spends only through `onSpendResource`, and a reload closing it
     loses nothing. */
  const [menu, setMenu] = useState<{ poolId: string; used: string | null; viaEngine?: boolean } | null>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const menuPool = menu ? uses.find(r => r.id === menu.poolId) : undefined
  const menuChoices = menu ? poolChoices?.[menu.poolId] ?? [] : []
  const menuOpen = !!(menu && menuPool && menuChoices.length > 0)

  // Focus follows the panel: first control on open, the message's first door
  // after a spend. Close hands focus back to the pip that opened it.
  useEffect(() => {
    if (!menuOpen) return
    panelRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
  }, [menuOpen, menu?.used])

  const closeMenu = () => {
    setMenu(null)
    openerRef.current?.focus()
  }
  const spendFromMenu = (choice: PoolChoice) => {
    if (!menu) return
    const result = onUseChoice?.(menu.poolId, choice) ?? null
    // Refused: the engine has already said why on screen; nothing was spent,
    // so the list stays open and "Just spend one" is still there.
    if (result === 'refused') return
    if (result === null) onSpendResource?.(menu.poolId, 1)
    setMenu({ poolId: menu.poolId, used: choice.name, viaEngine: result === 'took' })
  }
  const spendPlain = () => {
    if (!menu) return
    onSpendResource?.(menu.poolId, 1)
    setMenu({ poolId: menu.poolId, used: '' })
  }
  const undoFromMenu = () => {
    if (!menu) return
    if (menu.viaEngine && onUndoChoice) onUndoChoice()
    else onSpendResource?.(menu.poolId, -1)
    setMenu({ poolId: menu.poolId, used: null })
  }

  return (
    <section className="rail" aria-label="Turn controls">
      {/* THE VERBS ARE NOT HERE ANY MORE. Slice 7 moved Look up · Reset ·
          End combat out to `TurnVerbs` above, at the top of the scroller,
          because none of them spends anything and V-6 only pins what does.
          Their 48px went to the four action-economy slots, which measurement
          found scrolling off the screen. Do not put them back beside the
          slots without re-reading 04-slices.md §"Slice 7, re-steered" — the
          strip has no room for both and that is the point of the trade. */}

      {/* ── the slots ──────────────────────────────────────────────────────
          `spellSlotsOf` drops every tier whose max is 0, and the rail does not
          check that and must not: it paints the lines it is given.

          THIS COMMENT USED TO SAY a level 7 paladin gets 1st and 2nd and NOT a
          3rd row, "the empty 3rd row item 4 is about". Measured 2026-08-31 on
          his own export: there are THREE rows, because his stored sheet really
          carries `3rd ×2`. That is not the bug it sounds like — the app reports
          his sheet and never corrects it, and it already says so in the errata
          notice at the top of the tab (see 00-status.md §"Not a bug — item 4").
          The old wording would have sent someone hunting for a fault that is a
          ruling. A comment that is confidently wrong about what the screen
          shows is worse than no comment. */}
      {spellSlots.length > 0 && (
        <div className="rslots">
          {spellSlots.map(s => (
            <div key={s.level} className="slotrow">
              <em>{LEVEL_LABELS[s.level] ?? `${s.level}th`}</em>
              <div className="pip-row">
                {Array.from({ length: s.max }).map((_, i) => {
                  const available = i < s.current
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => (available ? onExpendSlot?.(s.level) : onRestoreSlot?.(s.level))}
                      /* Right-click restores wherever a left-click spends, so a
                         mis-tap on the last full pip is one gesture to undo
                         rather than a hunt for the spent one next to it. */
                      onContextMenu={e => {
                        e.preventDefault()
                        onRestoreSlot?.(s.level)
                      }}
                      disabled={available ? !onExpendSlot : !onRestoreSlot}
                      aria-label={
                        available
                          ? `Expend ${LEVEL_LABELS[s.level] ?? s.level} level spell slot`
                          : `Restore ${LEVEL_LABELS[s.level] ?? s.level} level spell slot`
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
        </div>
      )}

      {/* ── the pools ──────────────────────────────────────────────────────
          NAMED, IN WORDS. The deck shipped a heart, "18/35" and two buttons
          with no label at all, and F-1's hollow detector was right to call it:
          this card already has a pair of numbers for hit points, so a second
          unlabelled pair is two identical gauges at arm's length under a six
          second clock.

          Unlike `.res`, nothing here is filtered out for being priced on a
          mutex face. That filter was correct while this strip was a read-out
          whose only job was to carry what nothing else carried; it is wrong now
          that the strip is where the pool is SPENT. A cost printed on an option
          and a counter you can press are not the same thing twice. */}
      {(counters.length > 0 || uses.length > 0) && (
        <div className="rpools">
          {counters.map(r => (
            <div key={r.id} className="rpool">
              <span className="k">{r.name}</span>
              <span className={`v${r.current === 0 ? ' spent' : ''}`}>
                {r.current}/{r.max}
              </span>
              {POINT_STEPS.filter(amount => amount <= r.max).map(amount => (
                <button
                  key={amount}
                  type="button"
                  className="rbtn spend"
                  onClick={() => onSpendResource?.(r.id, amount)}
                  disabled={!onSpendResource || r.current < amount}
                  aria-label={`Spend ${amount} ${r.name}`}
                >
                  −{amount}
                </button>
              ))}
            </div>
          ))}
          {uses.map(r => {
            const choices = poolChoices?.[r.id] ?? []
            const hasChoices = choices.length > 0
            const isOpen = menuOpen && menu?.poolId === r.id
            return (
              <div key={r.id} className="rpool">
                <span className="k">{r.name}</span>
                <div className="pip-row">
                  {Array.from({ length: r.max }).map((_, i) => {
                    const available = i < r.current
                    const opensMenu = available && hasChoices
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={e => {
                          if (opensMenu) {
                            openerRef.current = e.currentTarget
                            setMenu(isOpen && menu?.used === null ? null : { poolId: r.id, used: null })
                            return
                          }
                          onSpendResource?.(r.id, available ? 1 : -1)
                        }}
                        disabled={!onSpendResource}
                        aria-label={
                          opensMenu
                            ? `Use ${r.name}: choose what to spend it on`
                            : available
                              ? `Expend ${r.name} use`
                              : `Restore ${r.name} use`
                        }
                        {...(opensMenu ? { 'aria-expanded': isOpen } : {})}
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
            )
          })}
        </div>
      )}

      {menuOpen && menuPool && menu && (
        <PoolChoicePanel
          panelRef={panelRef}
          pool={menuPool}
          choices={menuChoices}
          used={menu.used}
          onUse={spendFromMenu}
          onSpendPlain={spendPlain}
          onUndo={undoFromMenu}
          onClose={closeMenu}
        />
      )}
    </section>
  )
}

export default TurnRail
