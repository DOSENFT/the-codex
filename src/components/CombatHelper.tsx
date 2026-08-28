import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Sword,
  Send,
  Loader2,
  Sparkles,
  Moon,
  Sun,
  Focus,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flame,
  User,
} from 'lucide-react'
import { cn } from '../lib/cn'
import {
  expendLayOnHands,
  expendChannelDivinity,
  type Character,
  type PaladinResources,
  expendSpellSlot,
  restoreSpellSlot,
  shortRest,
  longRest,
} from '../lib/character'
/* `saveCombatState`, `loadCombatState` and `clearCombatState` are no longer
   imported here, and the absence is the slice: this file has stopped being a
   writer of `codex-combat-${id}`. `CombatProvider` owns all three now. If a
   future edit reaches for one of them in this file, the import it has to add
   back is the review flag. */
import {
  createCombatState,
  startCombat,
  endCombat,
  nextTurn,
  setConcentration as setCombatConcentration,
} from '../lib/combat-state'
import { TurnDeck, type ActionEconomy } from './TurnDeck'
/* PALADIN_ACTIONS is no longer imported here — slice 9. Its three hardcoded
   names were the Class Actions section, and `composeTurn` prices those same
   three off the sheet with live counts. BASIC_ACTIONS stays: the engine
   composes none of the fourteen, which is why that section survived. */
import { BASIC_ACTIONS } from '../lib/dnd-data'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import { useAI } from '../hooks/useAI'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'
import { HPTracker } from './HPTracker'
import { DamageTracker } from './DamageTracker'
import { ConditionReminder } from './ConditionReminder'
import { TurnSummary } from './combat/TurnSummary'
import { QuickLookup } from './combat/QuickLookup'
import { VitalsBand } from './combat/VitalsBand'
import { TurnOptionRow } from './combat/TurnOptionRow'
import { OptionDetailSheet } from './combat/OptionDetailSheet'
import { optionDetail } from '../lib/turn/detail'
import type { TurnOption } from '../lib/turn/types'
import { ReactionsBand } from './combat/ReactionsBand'
import { tallyOf } from '../lib/turn/retaliation'
import { ContentionBand } from './combat/ContentionBand'
import { ErrataBand } from './combat/ErrataBand'
import { liveErrata, laterErrata } from '../lib/canon/errata'
import {
  loadRulings, saveRulings, setRuling,
  type ErratumRulings, type RulingStatus,
} from '../lib/errata-rulings'
import { CombatProvider, useCombat } from './turn/CombatProvider'
import { useCollapsible } from '../hooks/useCollapsible'
import { type CombatLog, type DamageEntry, createCombatLog, logDamage as logDamageEntry, endCombatLog, saveDamageLogs, loadDamageLogs } from '../lib/damage-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CombatHelperProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

/* The type moved to TurnDeck, which is now the surface that owns these four
   slots — see § 9.1 / U-2. Imported back here because the state still lives in
   CombatHelper and is handed down; nothing else changed about it. */
const INITIAL_ECONOMY: ActionEconomy = {
  action: false,
  bonusAction: false,
  reaction: false,
  movement: false,
}

// Spell-slot level ordinal labels for screen readers
const LEVEL_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th',
  7: '7th',
  8: '8th',
  9: '9th',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse basic markdown-like formatting (bold, line breaks) for AI responses */
function formatAIResponse(text: string): JSX.Element[] {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="text-forge-0 font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={j}>{part}</span>
    })

    return (
      <p key={i} className={cn('leading-relaxed', i > 0 && 'mt-1.5')}>
        {formatted}
      </p>
    )
  })
}

/* `countAvailableSlots` was here. Its only caller was the Class Actions
   section's "3 slots" badge, retired in slice 9 — the same fact now arrives on
   the row as «1st-level slot» straight off the composed option. */

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** 3. Concentration Tracker */
function ConcentrationTracker({
  concentrationSpell,
  availableSpells,
  onSetConcentration,
  onDropConcentration,
}: {
  concentrationSpell: string | null
  availableSpells: Character['spells']
  onSetConcentration: (spellName: string) => void
  onDropConcentration: () => void
}) {
  const concentrationSpells = availableSpells.filter(
    (s) => s.concentration && s.prepared,
  )

  return (
    <GlassCard
      className={cn(
        'p-4 transition-all duration-300',
        concentrationSpell && 'ring-2 ring-ember/40 shadow-[0_0_20px_-4px_rgba(244,181,69,0.2)]',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Focus size={16} className={cn(concentrationSpell ? 'text-ember' : 'text-forge-2')} aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
            Concentration
          </h3>
        </div>

        {concentrationSpell && (
          <button
            onClick={onDropConcentration}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10',
              'transition-all duration-200 active:scale-[0.95]',
            )}
            aria-label="Drop concentration"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {concentrationSpell ? (
        <div className="flex items-center gap-2">
          <Badge variant="ember">{concentrationSpell}</Badge>
          <span className="text-xs text-forge-2">Concentrating</span>
        </div>
      ) : concentrationSpells.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {concentrationSpells.map((spell) => (
            <button
              key={spell.name}
              onClick={() => onSetConcentration(spell.name)}
              className={cn(
                'min-h-[44px] px-3 py-1.5 rounded-lg',
                'bg-white/[0.04] border border-white/10 text-forge-1 text-xs',
                'hover:bg-ember/10 hover:border-ember/30 hover:text-ember',
                'transition-all duration-200 active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              {spell.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-forge-2">No concentration spells prepared</p>
      )}
    </GlassCard>
  )
}

/** 4. AI Combat Advisor */
function AICombatAdvisor({
  character,
  response,
  loading,
  error,
  onQuery,
  onCancel,
  onClear,
}: {
  character: Character
  response: string | null
  loading: boolean
  error: string | null
  onQuery: (message: string) => void
  /** The way out. See the Stop button below — this panel disables its own
   *  input while it waits, so without this there was no way out. */
  onCancel: () => void
  onClear: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const responseRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || loading) return
    onQuery(trimmed)
    setInputValue('')
  }, [inputValue, loading, onQuery])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // Auto-scroll to response when it arrives
  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [response])

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-arcane" aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
            Combat Advisor
          </h3>
        </div>
        {response && (
          <button
            onClick={onClear}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06]',
              'transition-all duration-200 active:scale-[0.95]',
            )}
            aria-label="Clear AI response"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <Input
            placeholder="Surrounded by 3 goblins, what should I do?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            icon={Sword}
          />
        </div>
        {/* While it is thinking, the send button IS the stop button. The panel
            locks its own input during a query, so putting the escape anywhere
            else would mean hunting for it mid-fight — it belongs under the
            thumb that is already there.

            The WORD, not a glyph. This was an ✕ until the first screenshot of
            it, which showed an ✕ sitting four inches below the panel's other
            ✕ — the one that clears a finished answer. Two identical marks that
            do different things, in the one place where the whole point is not
            having to think. "Stop" cannot be misread. */}
        {loading ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            aria-label="Stop the advisor"
            className="shrink-0"
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            aria-label="Send combat question"
            className="shrink-0"
          >
            <Send size={16} />
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !response && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02]">
          <Loader2 size={18} className="animate-spin text-arcane" aria-hidden />
          {/* Status, not a control. There was a second Stop here; two controls
              for one decision is a decision to make, and this row's job is to
              say what is happening. */}
          <p className="text-sm text-forge-2">Analyzing the battlefield&hellip;</p>
        </div>
      )}

      {/* AI response */}
      {response && (
        <div
          ref={responseRef}
          className={cn(
            'glass-card p-4 max-h-64 overflow-y-auto',
            'text-sm text-forge-1 font-body',
            'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
          )}
        >
          {formatAIResponse(response)}
        </div>
      )}
    </GlassCard>
  )
}

/* ============================================================================
   WHAT SURVIVED «ACTIONS REFERENCE» — Table Truth slice 9.

   The panel had three sections. Two of them are retired here because the row
   and the detail sheet say the same things and say them better; the third is
   NOT subsumed, and under the prime law that means it stays.

     Class Actions — RETIRED. It hardcoded three Paladin names and read three
       pools by `if`, so it knew nothing about a fifth class. `composeTurn`
       prices every option off the sheet: `retire.test.ts` pins «15/40 points»,
       «1/2 uses» and «1st-level slot» arriving on the row itself.

     Prepared Spells — RETIRED. Level, range, concentration, damage dice and
       type, casting time and the save DC all reach the detail sheet, each
       pinned by a test in `retire.test.ts`. Exactly one fact was missing — the
       save DC as a NUMBER, which this panel had and the sheet did not — and
       that test went red first and was fixed in `detail.ts` before a line of
       this panel was touched. Also gone with it: a 2px unlabelled dot with a
       `title` for concentration, which on a touch screen is nothing at all.

     Basic Actions — STAYS, and this is the slice's "anything not subsumed
       stays" clause doing real work. Dash, Dodge, Disengage, Help, Hide and
       Ready are on nobody's character sheet — they are rules of the game, and
       `composeTurn` builds the turn out of the sheet, so the engine has no
       source for them. `retire.test.ts` asserts the engine composes none of
       them; when that test goes red this section should go with it.

   TWO THINGS ARE FIXED WHILE IT IS OPEN. The descriptions were `line-clamp-2`
   — CSS truncation, which is finding Q's trap: the text was all there in the
   DOM and unreadable on the glass. They are whole now. And the section says
   out loud that tapping asks the ADVISOR, because every button in this panel
   always did and none of them ever spent anything; with the AI off, a control
   that looks like "do this" and does nothing is the worst thing on the tab.
   ========================================================================= */
function BasicActionsReference({
  onSelectAction,
  loading,
}: {
  onSelectAction: (actionName: string, description: string) => void
  loading: boolean
}) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs leading-snug text-forge-2 mb-3">
        The rules-of-the-game actions anyone can take — they are on no character
        sheet, so they are not in your turn list. Tap one to ask the advisor about it.
      </p>

      {/* ONE COLUMN, NOT TWO. The old grid was `grid-cols-2` and the
          descriptions were clamped to two lines inside it — at 390px that is
          about twenty characters a line, which is why "Dodge" read as a
          fragment. A full sentence needs the width, and fourteen of them in a
          collapsed section cost nothing until it is opened. */}
      <ul className="flex flex-col gap-2">
        {BASIC_ACTIONS.map((action) => (
          <li key={action.name}>
            <button
              onClick={() => onSelectAction(action.name, action.description)}
              disabled={loading}
              aria-label={`${action.name} — ask the advisor`}
              className={cn(
                'w-full min-h-[44px] px-3 py-2.5 rounded-xl text-left',
                'bg-white/[0.03] border border-white/8',
                'enabled:hover:bg-arcane/8 enabled:hover:border-arcane/20',
                'transition-all duration-200 enabled:active:scale-[0.97]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'group',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-forge-0 group-hover:text-arcane transition-colors">
                  {action.name}
                </span>
                <Badge variant={action.type === 'Reaction' ? 'ember' : 'neutral'}>
                  {action.type}
                </Badge>
              </div>
              {/* NO `line-clamp`. This is the whole rule, and the whole rule is
                  the only reason this section survived the slice. */}
              <p className="text-xs text-forge-2 mt-1 leading-snug">{action.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

/** 6. Rest Buttons */
function RestButtons({
  onShortRest,
  onLongRest,
}: {
  onShortRest: () => void
  onLongRest: () => void
}) {
  const [confirmRest, setConfirmRest] = useState<'short' | 'long' | null>(null)

  const handleRest = useCallback(
    (type: 'short' | 'long') => {
      if (confirmRest === type) {
        if (type === 'short') onShortRest()
        else onLongRest()
        setConfirmRest(null)
      } else {
        setConfirmRest(type)
      }
    },
    [confirmRest, onShortRest, onLongRest],
  )

  // Clear confirmation after 3 seconds
  useEffect(() => {
    if (!confirmRest) return
    const timer = setTimeout(() => setConfirmRest(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmRest])

  return (
    <div className="flex gap-3">
      <Button
        variant={confirmRest === 'short' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRest('short')}
        className="flex-1"
      >
        <Moon size={16} aria-hidden />
        {confirmRest === 'short' ? 'Confirm Short Rest?' : 'Short Rest'}
      </Button>

      <Button
        variant={confirmRest === 'long' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRest('long')}
        className="flex-1"
      >
        <Sun size={16} aria-hidden />
        {confirmRest === 'long' ? 'Confirm Long Rest?' : 'Long Rest'}
      </Button>
    </div>
  )
}

/** 7. Persona Card */
function PersonaCard({ persona }: { persona: NonNullable<Character['persona']> }) {
  const [isOpen, setIsOpen] = useState(false)

  // Pick a random catchphrase on mount
  const catchphrase = useMemo(() => {
    if (!persona.catchphrases || persona.catchphrases.length === 0) return null
    return persona.catchphrases[Math.floor(Math.random() * persona.catchphrases.length)]
  }, [persona.catchphrases])

  return (
    <GlassCard className="p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[44px] flex items-center justify-between',
          'transition-all duration-200 active:scale-[0.97]',
        )}
      >
        <div className="flex items-center gap-2">
          <User size={16} className="text-eldritch" aria-hidden />
          <h3 className="text-sm font-semibold text-forge-0 tracking-wide uppercase">
            Character Persona
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-forge-2" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-4">
          {/* Default State */}
          <div>
            <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1">
              Default State
            </span>
            <p className="text-sm text-forge-1 italic">{persona.defaultState}</p>
          </div>

          {/* Physical Tics */}
          {persona.physicalTics.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
                Physical Tics
              </span>
              <div className="flex gap-2 flex-wrap">
                {persona.physicalTics.map((tic, i) => (
                  <span
                    key={i}
                    className={cn(
                      'bg-white/5 text-forge-1 rounded-full px-3 py-1.5',
                      'text-xs select-none cursor-default',
                      'transition-all duration-200 active:scale-[0.95]',
                    )}
                  >
                    {tic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scene Instincts */}
          {persona.sceneInstincts.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1.5">
                Scene Instincts
              </span>
              <ul className="flex flex-col gap-1">
                {persona.sceneInstincts.map((instinct, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-forge-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-2 shrink-0 mt-1.5" />
                    {instinct}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patron */}
          <div>
            <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-1">
              Patron
            </span>
            <p className="text-sm text-ember">
              {persona.patron.name} &mdash; {persona.patron.domains.join(', ')}
            </p>
          </div>

          {/* Catchphrase */}
          {catchphrase && (
            <p className="text-sm text-forge-2 italic">&ldquo;{catchphrase}&rdquo;</p>
          )}

          {/* Voice Notes */}
          {persona.voiceNotes && (
            <p className="text-xs text-forge-2 italic">{persona.voiceNotes}</p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Collapsible Section Wrapper
// ---------------------------------------------------------------------------

function CollapsibleCombatSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  title: string
  icon: typeof Sword
  isOpen: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full min-h-[48px] px-4 py-2.5 rounded-xl',
          'flex items-center justify-between',
          'bg-white/[0.03] border border-white/8',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          isOpen && 'bg-white/[0.05] border-white/12',
        )}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-forge-1" aria-hidden />
          <span className="text-xs font-semibold text-forge-0 uppercase tracking-wider">{title}</span>
          {badge && (
            <Badge variant="ember">{badge}</Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-forge-2" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-forge-2" aria-hidden />
        )}
      </button>
      {isOpen && (
        <div className="mt-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── "YOUR TURN" — the engine's first appearance on the Play tab. Slice 5. ──
 *
 * Everything above this line on the combat screen is either a number Marcus
 * reads or a menu he opens. This is the first surface that answers the actual
 * question — "it is my turn, what can I do RIGHT NOW" — and every row in it
 * came through `composeTurn` → `overlayCanon`, which means the words are
 * canon's where canon has them and Marcus's where it does not.
 *
 * It reads `useCombat()` and nothing else. No props, no state, no writes: the
 * provider it reads from persists only inside its dispatch handler, and this
 * component never dispatches. That is what makes it safe to mount alongside the
 * legacy screen instead of in place of it.
 *
 * IT IS A SHORTLIST, AND IT SAYS SO. `turn.ranked` is the top five uncontended
 * affordable options. The rest of the turn is not here on purpose: reactions
 * are in the band below (slice 6), and the contention brackets — Smite vs Lay
 * on Hands vs Misty Step, one decision with three faces — plus the leftovers
 * are in «Everything else» (slice 9). The footer counts them and now names the
 * band that holds them, so the shortlist never implies it is the whole truth.
 */
function YourTurnList({ onOpen }: { onOpen?: (option: TurnOption) => void }) {
  const { turn } = useCombat()

  /* REACTIONS ARE NOT LISTED HERE ANY MORE — slice 6.
   *
   * Off your turn `rank.ts` scores a reaction +40 and both of Nix's land at the
   * top of `ranked`. They are now also the whole content of the reactions band
   * directly below, and painting the same two rows twice on one screen is worse
   * than painting them nowhere: it makes a player count two Reactions. The band
   * is the one place they live; this list is everything that costs a turn. */
  const ranked = turn.ranked.filter(option => option.cost.slot !== 'reaction')
  const elsewhere =
    turn.rest.filter(o => o.cost.slot !== 'reaction').length +
    turn.mutex.reduce((n, g) => n + g.faces.filter(f => f.cost.slot !== 'reaction').length, 0)

  /* A `section` with a stable label rather than a GlassCard, and a real `ul`
     rather than a stack of divs, because the browser prover has to be able to
     ask the PAINTED page "which rows are these, and how many line boxes did
     each one take" — and slice 4's finding Q is that a proof which reads the
     model instead of the paint is a proof of the model. `glass-card` is the
     same class GlassCard applies, so nothing about the look changes. */
  return (
    <section className="glass-card p-3" aria-label="Your turn options">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-forge-0">
          {/* The caption is the same fact the rest of the screen is composed
              from, not a hardcoded string — off-turn a list of reactions headed
              "Your turn" says exactly the wrong thing. */}
          {turn.yourTurn ? 'Your turn' : 'The moment'}
        </h3>
        <span className="font-mono text-[11px] text-forge-2">{ranked.length} ready</span>
      </div>

      {ranked.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {ranked.map(option => (
            <li key={option.id}>
              <TurnOptionRow option={option} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        /* Off-turn this is the usual state, and it is not a failure — it is the
           rule. Saying so, and pointing at the band that DOES have something in
           it, is the difference between an empty list and a wrong one. */
        <p className="mt-2 text-xs leading-snug text-forge-1">
          {turn.yourTurn
            ? 'Nothing here is both affordable and yours to spend this moment. Everything you own is still in the sections below.'
            : 'It is not your turn — a Reaction is the only thing you can spend. Your reactions are listed just below.'}
        </p>
      )}

      {elsewhere > 0 && (
        /* NAMES THE BAND, as of slice 9. Until this slice the sentence read
           "…are in the sections below", and that was not true: `turn.mutex`
           was counted here and painted nowhere, so the count sent Marcus
           looking for rows that did not exist. Now there is one band holding
           exactly these {elsewhere} options and the sentence points at it by
           its own caption, so the pointer can be followed. */
        <p className="mt-2 text-[11px] leading-snug text-forge-2">
          {elsewhere} more — including anything that contends for the same slot — are under
          «Everything else» below.
        </p>
      )}
    </section>
  )
}

/* The context read for the reactions band. Slice 6.
 *
 * `ReactionsBand` itself takes plain props — no `useCombat`, no `useCollapsible`
 * — so it renders identically under `renderToStaticMarkup` and can be tested
 * without a DOM. This eight-line wrapper is where the hooks live instead.
 *
 * The collapse key joins the map every other section on this tab already uses
 * (`codex-ui-${characterId}`). No new storage key: Marcus asked for fewer things
 * on screen, not for more places a preference can go missing. Default OPEN,
 * because this band is the thing he told us was absent. */
function ReactionsBandLive({
  character,
  onOpen,
  rulings,
}: {
  character: Character
  onOpen?: (option: TurnOption) => void
  /* Slice 8b. Held by `CombatHelperInner` because THREE surfaces now read it —
     the errata band, the detail sheet, and this row's WHEN line — and a ruling
     recorded in one must be the ruling the other two report in the same paint.
     A second `loadRulings` here would be a second source of truth for the same
     answer, and they would disagree the moment one of them re-rendered. */
  rulings: ErratumRulings
}) {
  /* `combat` joins `turn` here in slice 10f, and it is the same object the
     engine composed from — `tallyOf` reads the running total off it, so the
     number beside the button and the number the reducer will add to are one
     value read twice, never two values kept in step. */
  const { turn, combat, retaliate, refusal } = useCombat()
  const section = useCollapsible('combat-reactions', character.id, true)
  return (
    <ReactionsBand
      turn={turn}
      character={character}
      isOpen={section.isOpen}
      onToggle={section.toggle}
      onOpen={onOpen}
      rulings={rulings}
      onRetaliate={retaliate}
      tally={tallyOf(combat)}
      refusal={refusal}
    />
  )
}

/* The context read for the contention band. Slice 9.
 *
 * Same shape and the same reasoning as `ReactionsBandLive` above: the band
 * itself takes plain props so it renders under `renderToStaticMarkup`, and the
 * two hooks live in this wrapper.
 *
 * DEFAULT CLOSED, and that is the one difference from the reactions band. This
 * band is eight rows deep — every levelled spell Nix owns plus both brackets —
 * and Marcus's opening ask was for LESS on screen, not more. Closed it is one
 * line reading "Everything else · 8"; open it is the half of his character that
 * had no row at all before this slice. The collapse joins the same
 * `codex-ui-${characterId}` map every other section on this tab uses. */
function ContentionBandLive({
  character,
  onOpen,
}: {
  character: Character
  onOpen?: (option: TurnOption) => void
}) {
  const { turn } = useCombat()
  const section = useCollapsible('combat-contention', character.id, false)
  return (
    <ContentionBand
      turn={turn}
      isOpen={section.isOpen}
      onToggle={section.toggle}
      onOpen={onOpen}
    />
  )
}

/* The collapse hook for the errata band. Slice 8.
 *
 * Thinner than the two wrappers above because this band reads no combat
 * context at all — errata are a fact about the SHEET, not about the turn, and
 * they say the same thing whether or not a fight is running. So the scoping is
 * computed here from `character.features` and `character.level` and handed down
 * as plain arrays, keeping the band renderable under `renderToStaticMarkup`.
 *
 * DEFAULT CLOSED, for the same reason `ContentionBandLive` is: Marcus's opening
 * ask was for less on screen. Closed it is one line that states the outstanding
 * work — "Rules flags · 6 · 6 unanswered" — and that line is the whole of its
 * cost until he taps it. */
function ErrataBandLive({
  character,
  rulings,
  onRule,
}: {
  character: Character
  rulings: ErratumRulings
  onRule: (erratumId: string, status: RulingStatus, dmWording?: string) => void
}) {
  const section = useCollapsible('combat-errata', character.id, false)
  return (
    <ErrataBand
      live={liveErrata(character.features, character.level)}
      later={laterErrata(character.features, character.level)}
      rulings={rulings}
      isOpen={section.isOpen}
      onToggle={section.toggle}
      onRule={onRule}
    />
  )
}

/* THE DETAIL SHEET, LIVE — Table Truth slice 7.
 *
 * A hooks wrapper for the same reason `ReactionsBandLive` is one: the sheet
 * body is a pure function of its props so it can be rendered — and asserted on
 * — in the node test environment, which has no DOM. The `useCombat()` call
 * lives here instead.
 *
 * IT READS THE SAME COMPOSED TURN THE ROW CAME FROM. `turn.economy` is what
 * makes the one-slot-per-turn box live rather than a general note: the box says
 * "you have already spent your slot" only when this turn's economy says so.
 * Reading a different source here than the row read would let the sheet and the
 * row that opened it disagree about the same turn.
 *
 * IT IS ALSO THE ONLY PLACE ON THE PLAY TAB THAT SPENDS THROUGH THE RULES —
 * slice 10c. Until this slice `CombatApi.take` was finished, tested, and
 * reachable only from `TurnScreenD` behind the `D_PREVIEW` flag, so at a real
 * table Marcus read the option here and then went and darkened the deck chip by
 * hand. Every other writer on this tab goes through `updateCombat`, which is
 * the manual override and applies no rules at all; `take` routes through
 * `reduce`, which refuses an illegal spend and can put it back.
 *
 * WHY THE REFUSAL IS THE PROVIDER'S AND NOT A `useState` HERE. That would be a
 * second model of one fact, which is exactly finding BB, one slice old. It is
 * safe to read the shared one because on this tab nothing else dispatches —
 * this component is the sole caller of `take` — and `close` clears it, so a
 * refusal can never outlive the sheet that produced it. */
function OptionDetailSheetLive({
  option,
  character,
  onClose,
  onRollDice,
  rulings,
}: {
  option: TurnOption | null
  character: Character
  onClose: () => void
  onRollDice?: (prefill: { notation: string; label: string }) => void
  /** Slice 8. The same map the Rules flags band writes, so a ruling recorded
   *  there is the ruling this sheet reports. */
  rulings: ErratumRulings
}) {
  const { turn, take, refusal, dismissRefusal } = useCombat()

  /* Clearing on close is what keeps one shared refusal honest: whichever way
     the sheet goes away — the ✕, the backdrop, Escape — the next option opens
     with nothing carried over from the last one. */
  const close = () => {
    dismissRefusal()
    onClose()
  }

  if (!option) return null

  return (
    <OptionDetailSheet
      isOpen
      detail={optionDetail(option, character, turn.economy)}
      onClose={close}
      onRoll={onRollDice}
      /* CLOSES ON A SPEND, STAYS OPEN ON A REFUSAL. On success the option in
         hand has become a description of something already done, and leaving it
         up invites a second tap on a slot that is gone; on refusal the reason
         has to land on the surface the tap happened on, or it lands nowhere. */
      onSpend={() => {
        if (take(option)) close()
      }}
      refusal={refusal}
      rulings={rulings}
    />
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/* THE SHELL. Table Truth slice 5.
 *
 * `CombatProvider` is the layer that owns the rules engine — `composeTurn`, the
 * reducer, the undo log. Until now nothing on the Play tab mounted it, so the
 * engine that Slices 1-4 built has never once been on screen at the table.
 * This is the wire.
 *
 * IT IS MOUNTED READ-ONLY, AND THAT IS A PROPERTY OF THE PROVIDER, NOT A HOPE.
 * `CombatProvider` persists in exactly one place — inside `commit`, which is
 * reachable only from `dispatch` and `undoLast`. Nothing below dispatches yet.
 * So on this slice the provider reads `codex-combat-${id}`, composes the turn
 * from it, and writes nothing at all; `turn/storage-safety.test.tsx` proves the
 * key is byte-identical across a full render — and that nothing so much as
 * called `setItem` — rather than asserting it in a comment.
 *
 * WHY A SHELL AND NOT A HOOK CALL INSIDE THE BODY. `CombatHelperInner` still
 * owns the legacy write path — the `useState` at the top and the `useEffect`
 * that saves on every change, including on mount. Two writers to one key is the
 * hazard this phase exists to retire, and the retirement happens in slice 10,
 * deliberately, after the read path has been proven at the table. Until then
 * the two are kept in a strict order: the provider's state initialiser runs
 * during the SHELL's render, before the inner component renders and long before
 * its effect fires, so the provider always sees the bytes as they were on
 * arrival. Reversing that order is the one edit that would break this.
 *
 * `key={character.id}` is load-bearing: the provider binds to one character and
 * has no effect watching the id, because the failure mode of getting that wrong
 * is writing Nix's spent slots onto somebody else's sheet.
 */
export function CombatHelper(props: CombatHelperProps) {
  return (
    <CombatProvider
      key={props.character.id}
      character={props.character}
      onCharacterUpdate={props.onCharacterUpdate}
    >
      <CombatHelperInner {...props} />
    </CombatProvider>
  )
}

function CombatHelperInner({ character, onCharacterUpdate, onOpenDiceRoller }: CombatHelperProps) {
  /* ── Combat State — the provider's, not ours. Slice 10b. ──
     This was a `useState<CombatState>` initialised from `loadCombatState`, plus
     an effect that saved it on every change. It was the SECOND copy of a state
     `CombatProvider` was already holding, and having two was not a redundancy:
     the deck spent through this one and the ranked list composed from that one,
     so from the first tap onwards the two halves of the same screen disagreed
     about whether Marcus still had his Action. `prove-slice10b.mjs` caught it
     at 4 options ready → 4 after the spend → 1 after a reload.

     `combatState` is kept as the local name because eleven call sites read it
     and the rename would have buried the change that matters in churn. The
     thing that matters is that it is no longer ours: it arrives from context,
     and every writer on this tab now writes the object the engine reads. */
  const { combat: combatState, updateCombat, forgetCombat, retaliate, refusal } = useCombat()

  /* The option whose detail sheet is open, or null. Slice 7.
     The OPTION itself, not its id: the row already holds the composed option,
     and looking it up again by id would be a second way for one tap to resolve
     to the wrong thing. */
  const [openOption, setOpenOption] = useState<TurnOption | null>(null)

  // Damage tracking
  const [currentDamageLog, setCurrentDamageLog] = useState<CombatLog | null>(
    combatState.inCombat ? createCombatLog() : null
  )

  // Quick lookup panel
  const [lookupOpen, setLookupOpen] = useState(false)

  /* How the table ruled on each of canon's errata. Slice 8.
     Held here rather than inside the band because TWO surfaces read it — the
     Rules flags band and the option detail sheet — and a ruling recorded in one
     that did not appear in the other would be the app disagreeing with itself
     about the same rule, on the same screen.

     READ ON MOUNT, WRITTEN ONLY ON A TAP. The lazy initialiser reads once;
     nothing here writes until `handleRule` fires. That is deliberate and it is
     finding AR's lesson: this tab already writes `codex-combat-*` and
     `codex-character-*` on load, for no reason a player asked for, and slice 10
     owns fixing it. Slice 8 does not add a third. */
  const [rulings, setRulings] = useState<ErratumRulings>(() => loadRulings(character.id))
  useEffect(() => { setRulings(loadRulings(character.id)) }, [character.id])

  const handleRule = useCallback(
    (erratumId: string, status: RulingStatus, dmWording?: string) => {
      /* `next` is computed OUTSIDE the state updater so the write happens once.
         An updater is a function React is entitled to call twice, and a double
         call here would be a double write of the same bytes — harmless today,
         and exactly the shape of the bug that is not harmless later. */
      const next = setRuling(rulings, erratumId, status, dmWording, new Date())
      setRulings(next)
      saveRulings(character.id, next)
    },
    [rulings, character.id]
  )

  // Collapsible section hooks.
  // Action economy, spell slots and class resources no longer have one: those
  // three moved into the fixed TurnDeck (§ 9.1 / U-2), where being collapsible
  // would defeat the point — the deck exists so a spend is always reachable.
  const concentrationSection = useCollapsible('combat-concentration', character.id, true)
  const conditionsSection = useCollapsible('combat-conditions', character.id, false)
  const aiAdvisorSection = useCollapsible('combat-ai-advisor', character.id, false)
  const damageLogSection = useCollapsible('combat-damage-log', character.id, false)
  const actionsRefSection = useCollapsible('combat-actions-ref', character.id, false)
  const restSection = useCollapsible('combat-rest', character.id, false)

  // Derive economy from combatState for the ActionEconomyBar
  const economy: ActionEconomy = combatState.turnActions

  // Concentration state derived from combat state
  const concentrationSpell = combatState.concentrating

  // AI hook
  const { response, loading, error, queryStream, cancel, clearResponse } = useAI()

  /* The `useEffect` that saved `combatState` on every change was here, and its
     removal is half of finding AR. It fired on MOUNT, before Marcus had touched
     anything, so simply opening the Play tab rewrote his encounter — and it
     fired AFTER the render, so on a suspended tab a tap could be on screen and
     absent from disk. Both are gone: `updateCombat` writes inside the handler,
     before the render, and only when something actually changed. */

  // --- Combat lifecycle handlers ---

  const handleStartCombat = useCallback(() => {
    updateCombat(startCombat(character))
    setCurrentDamageLog(createCombatLog())
  }, [character, updateCombat])

  const handleEndCombat = useCallback(() => {
    // Save damage log to history
    if (currentDamageLog && currentDamageLog.entries.length > 0) {
      const finished = endCombatLog(currentDamageLog)
      const history = loadDamageLogs(character.id)
      saveDamageLogs(character.id, [...history, finished])
    }
    setCurrentDamageLog(null)
    /* `forgetCombat`, not "set then clear". The old pair wrote the ended state
       and then removed the key — and because the write was an effect scheduled
       after the render, the removal happened FIRST and the effect put the bytes
       straight back. Ending an encounter did not actually end it on disk. */
    forgetCombat(endCombat(character))
  }, [character, currentDamageLog, forgetCombat])

  const handleNextTurn = useCallback(() => {
    updateCombat((prev) => nextTurn(prev))
  }, [updateCombat])

  // --- Action Economy handlers ---

  const toggleEconomy = useCallback(
    (key: keyof ActionEconomy) => {
      updateCombat((prev) => ({
        ...prev,
        turnActions: { ...prev.turnActions, [key]: !prev.turnActions[key] },
      }))
    },
    [updateCombat],
  )

  const resetEconomy = useCallback(() => {
    updateCombat((prev) => ({
      ...prev,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    }))
  }, [updateCombat])

  /* `applyAction`, `handleUseAction` and the two concentration-switch handlers
     were here. All four took an `ActionChoice`, a type only `ActionMenu`
     produced, and `ActionMenu` could not be opened — so this was the write path
     of a surface no tap could reach. Retired with it in slice 9; the note at
     the mount site says what happened to the concentration warning. */

  // --- Spell Slot handlers ---

  const handleExpendSlot = useCallback(
    (level: number) => {
      const updated = expendSpellSlot(character, level)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleRestoreSlot = useCallback(
    (level: number) => {
      const updated = restoreSpellSlot(character, level)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  // --- Paladin Resource handlers ---

  const handleExpendLayOnHands = useCallback(
    (amount: number) => {
      const updated = expendLayOnHands(character, amount)
      onCharacterUpdate(updated)
    },
    [character, onCharacterUpdate],
  )

  const handleExpendChannelDivinity = useCallback(() => {
    const updated = expendChannelDivinity(character)
    onCharacterUpdate(updated)
  }, [character, onCharacterUpdate])

  const handleRestoreChannelDivinity = useCallback(() => {
    if (!character.paladinResources) return
    const { current, max } = character.paladinResources.channelDivinity
    if (current >= max) return
    onCharacterUpdate({
      ...character,
      paladinResources: {
        ...character.paladinResources,
        channelDivinity: {
          ...character.paladinResources.channelDivinity,
          current: current + 1,
        },
      },
    })
  }, [character, onCharacterUpdate])

  // --- Concentration handlers ---

  const handleSetConcentration = useCallback(
    (spellName: string) => {
      updateCombat((prev) => setCombatConcentration(prev, spellName))
    },
    [updateCombat],
  )

  const handleDropConcentration = useCallback(() => {
    updateCombat((prev) => setCombatConcentration(prev, null))
  }, [updateCombat])

  // --- AI handlers ---

  const handleAIQuery = useCallback(
    (message: string) => {
      const systemPrompt = SYSTEM_PROMPTS.combatAdvisor(character)
      // Streamed — counsel arrives as it's thought, not as a wall after a wait
      queryStream(systemPrompt, message).catch(() => { /* surfaced via useAI error state */ })
    },
    [character, queryStream],
  )

  const handleQuickAction = useCallback(
    (actionName: string, description: string) => {
      const message = `I want to use ${actionName} in combat. ${description} What's the best tactical approach for my character?`
      handleAIQuery(message)
    },
    [handleAIQuery],
  )

  // --- Damage log handler ---

  const handleLogDamage = useCallback(
    (entry: Omit<DamageEntry, 'timestamp'>) => {
      if (!currentDamageLog) return
      const updated = logDamageEntry(currentDamageLog, entry)
      setCurrentDamageLog(updated)
    },
    [currentDamageLog],
  )

  // --- Rest handlers ---

  const handleShortRest = useCallback(() => {
    const updated = shortRest(character)
    onCharacterUpdate(updated)
    updateCombat((prev) => ({
      ...prev,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    }))
  }, [character, onCharacterUpdate, updateCombat])

  const handleLongRest = useCallback(() => {
    const updated = longRest(character)
    onCharacterUpdate(updated)
    forgetCombat(createCombatState(updated))
    clearResponse()
  }, [character, onCharacterUpdate, forgetCombat, clearResponse])

  /* `actionMenuCounts` and `openActionMenu` were here, and both went with the
     panel in slice 9. `openActionMenu` was the ONLY caller of
     `setActionMenuOpen(true)` and had itself no caller, which is the whole of
     why the panel was unreachable. `actionMenuCounts` fed badges on that
     panel's tabs and additionally counted by hand — `+= 6 // Dash, Dodge,
     Disengage…` — options the engine does not compose, so it could not have
     been reused as-is. */

  return (
    <section className="flex flex-col gap-4" aria-label="Combat Helper">
      {/* ── Slice 1's tracer bullet is gone, as slice 1 said it would be ──
             `CanonMatchReport` was a diagnostic strip proving the canon corpus
             had loaded and naming what it did not cover. It has done its job:
             canon now reaches the rows and the detail sheet, so coverage is
             visible where it matters instead of as a banner at the top of the
             tab Marcus opens mid-combat. The component file stays on disk —
             it is a useful thing to mount while working on the corpus. */}

      {/* ── Table Truth slice 2 — the vitals band ──
             Save DC, initiative and proficiency were absent from this surface
             entirely; AC and spell attack existed only in the unmounted
             combat/StatsBar.tsx. First thing on the tab because it is the set
             of numbers a turn is made of, and because V-3 wants them read at
             60cm rather than hunted for. Read-only: derives and renders. */}
      <VitalsBand character={character} />

      {/* ── Table Truth slice 5 — the ranked turn list ──
             The rules engine's first appearance on this tab. Above TurnSummary
             because it answers the question TurnSummary makes you go hunting
             for, and because V-6 wants the thing you read first to be the thing
             you need first. TurnSummary stays exactly where it is: slice 9 is
             where surfaces are retired, and only after what each one uniquely
             does has been pinned as a test. */}
      <YourTurnList onOpen={setOpenOption} />

      {/* ── Table Truth slice 6 — the reactions band ──
             Marcus: the combat tab doesn't show "my reactions (like hearth fire
             manifest and what it does or when i can use it)". Directly below
             the turn list because the two answer opposite halves of the round,
             and a player scanning off-turn should hit this second, not tenth.
             Read-only, like everything else on this tab so far: it derives from
             the same composed turn and writes only its own collapse flag. */}
      <ReactionsBandLive character={character} onOpen={setOpenOption} rulings={rulings} />

      {/* ── Table Truth slice 9 — the contention band ──
             The half of the turn that had no row at all. `YourTurnList` paints
             the top five and the band above paints the reactions; everything
             that spends a slot or a pool lived in `turn.mutex`, which this tab
             read in exactly one place — a footer that COUNTED it. Every
             levelled spell Nix owns was in that count and on no row.

             Third rather than second because the order is a priority order:
             what to do now, then what to watch for, then everything else. It
             is collapsed by default, so the cost of it being here is one line
             until Marcus asks for the rest. */}
      <ContentionBandLive character={character} onOpen={setOpenOption} />

      {/* ── Always visible: TurnSummary (when in combat) ── */}
      {combatState.inCombat && (
        <TurnSummary
          character={character}
          combatState={combatState}
          onNextTurn={handleNextTurn}
          onEndCombat={handleEndCombat}
          onOpenDiceRoller={onOpenDiceRoller}
          onOpenLookup={() => setLookupOpen(true)}
          onCombatStateChange={updateCombat}
          onCharacterUpdate={onCharacterUpdate}
        />
      )}

      {/* ── «Start Combat» is no longer here ──
             It moved into the fixed TurnDeck on 2026-08-25. It was a `sm`
             button alone inside a full-width GlassCard at the top of this
             page — y=113 on an 844px screen — and V-6 asks that turn-critical
             controls sit in the bottom 60%. The behaviour is untouched:
             `handleStartCombat` is the same handler, passed down. Only where
             it is, is different. See TurnDeck.tsx's header for the full note,
             including why a control that spends nothing is allowed there. */}

      {/* Condition Reminder Banner */}
      {character.conditions.length > 0 && (
        <ConditionReminder character={character} onOpenDiceRoller={onOpenDiceRoller} />
      )}

      {/* The Drop Concentration dialog was here. It is retired with the panel
          that was its only trigger — see the note further down. */}

      {/* ── The turn deck ───────────────────────────────────────────────────
           These three surfaces — the economy, the slots, the class resources —
           are what a turn SPENDS, and they are no longer in this scroll at all.
           They are rendered at the bottom of this component as a fixed deck
           pinned above the tab bar (`TurnDeck.tsx`), because ordering them
           within the page could never satisfy V-6: put them first and they land
           at the TOP of the screen, put them later and they fall off the
           bottom. An earlier pass moved them above the HP tracker and got the
           first spell-slot pip from y=1647 to y=903 — real, and still past the
           fold on an 844-tall phone.

           HP, conditions, the damage log, the advisor and the reference stay
           here, in the page, because they are READ rather than spent. That is
           the line the deck is drawn on: it holds what mutates a number on
           disk, and nothing else. § 9.1 / U-2. ── */}

      {/* ── Always visible: HP Tracker ── */}
      <HPTracker
        character={character}
        onCharacterUpdate={onCharacterUpdate}
        /* Slice 10f. The convenience half of the capture: log a hit while the
           cloak is up and the tracker offers the die on the spot. `retaliate`
           comes from the same provider the reactions band's standing button
           uses, so both routes add to one tally. */
        onRetaliate={retaliate}
        refusal={refusal}
      />

      {/* ── Collapsible: Concentration (only when NOT in combat — TurnSummary handles it during combat) ── */}
      {!combatState.inCombat && (
        <CollapsibleCombatSection
          title="Concentration"
          icon={Focus}
          isOpen={concentrationSection.isOpen}
          onToggle={concentrationSection.toggle}
          badge={concentrationSpell || undefined}
        >
          <ConcentrationTracker
            concentrationSpell={concentrationSpell}
            availableSpells={character.spells}
            onSetConcentration={handleSetConcentration}
            onDropConcentration={handleDropConcentration}
          />
        </CollapsibleCombatSection>
      )}

      {/* ── Collapsible: Damage Log ── */}
      <CollapsibleCombatSection
        title="Damage Log"
        icon={Flame}
        isOpen={damageLogSection.isOpen}
        onToggle={damageLogSection.toggle}
      >
        <DamageTracker
          characterId={character.id}
          currentLog={currentDamageLog}
          round={combatState.round}
          onLogDamage={handleLogDamage}
        />
      </CollapsibleCombatSection>

      {/* ── Collapsible: AI Combat Advisor ── */}
      <CollapsibleCombatSection
        title="Combat Advisor"
        icon={Sparkles}
        isOpen={aiAdvisorSection.isOpen}
        onToggle={aiAdvisorSection.toggle}
      >
        <AICombatAdvisor
          character={character}
          response={response}
          loading={loading}
          error={error}
          onQuery={handleAIQuery}
          onCancel={cancel}
          onClear={clearResponse}
        />
      </CollapsibleCombatSection>

      {/* ── Collapsible: the basic actions ──
             Retitled from "Actions Reference", which named a panel that held
             three different things and is now one. The title says what is
             inside it, so it can be skipped without being opened. */}
      <CollapsibleCombatSection
        title="Basic actions — the rules"
        icon={Sword}
        isOpen={actionsRefSection.isOpen}
        onToggle={actionsRefSection.toggle}
      >
        <BasicActionsReference onSelectAction={handleQuickAction} loading={loading} />
      </CollapsibleCombatSection>

      {/* ── Table Truth slice 8 — the rules flags ──
             HERE, and not up with the turn list, on purpose. Slice 9 set the
             order of this tab as a priority order — what to do now, then what
             to watch for, then everything else, then reference — and this is
             reference. Canon's errata are read between sessions and quoted at a
             DM; nothing in them changes what Marcus taps in the next fifteen
             seconds. The two of them that DO bear on a live option (the four on
             Hearthfire Manifest) already reach him through the detail sheet,
             which is where he will be looking at the moment they matter.

             It sits directly after the basic-actions reference because the two
             answer the same kind of question — "what is the actual rule here" —
             and before Rest Management, which is a control rather than a text.

             It writes `codex-errata-${character.id}` and only on a tap. */}
      <ErrataBandLive character={character} rulings={rulings} onRule={handleRule} />

      {/* ── Collapsible: Rest Management ── */}
      <CollapsibleCombatSection
        title="Rest Management"
        icon={Moon}
        isOpen={restSection.isOpen}
        onToggle={restSection.toggle}
      >
        <RestButtons onShortRest={handleShortRest} onLongRest={handleLongRest} />
      </CollapsibleCombatSection>

      {/* 8. Persona Card (conditional) */}
      {character.persona && <PersonaCard persona={character.persona} />}

      {/* ── The «Action» slide-up is gone — Table Truth slice 9 ──
             `ActionMenu` was mounted here for as long as this file has existed,
             and could not be opened for very nearly as long. `setActionMenuOpen(true)`
             occurred in exactly one function, `openActionMenu`, which had no
             caller anywhere in `src`; its only would-be caller, `SmartActionsGrid`,
             is exported and mounted nowhere. `noUnusedLocals: false` in
             tsconfig is why 697 lines of unreachable panel never raised so much
             as a warning.

             So this retirement removes no capability, because there was none to
             remove — the browser prover for this slice clicks every control on a
             fresh Play tab and asserts no «Choose Action» dialog can be made to
             appear. What Marcus described as "action at the very top … drop
             downs … trails off" is TurnSummary, which is still here and is
             slice 10's problem.

             The file itself is not deleted. That is an ask-first call and it is
             asked at this slice's close-out.

             GOING WITH IT: `applyAction`, `handleUseAction` and the Drop
             Concentration dialog, which existed only to serve it. The dialog's
             substance is not lost — `rank.ts` scores a concentration clash −45
             and states "Would drop <spell>" on the row itself, which is the
             warning arriving BEFORE the tap rather than after it. The explicit
             confirm step is not rebuilt here; it is recorded in 00-status.md as
             a capability the app has never actually delivered. */}

      {/* Quick Lookup (slide-up panel) */}
      <QuickLookup
        isOpen={lookupOpen}
        onClose={() => setLookupOpen(false)}
        character={character}
        onRollDice={onOpenDiceRoller}
      />

      {/* 11. The turn deck — fixed, above the tab bar, never scrolls.
             Rendered last so it is the last thing in the stacking context that
             is not an overlay; positioned by `position: fixed`, so where it
             appears in this tree does not affect where it appears on screen. */}
      {/* ── Table Truth slice 7 — the option detail sheet ──
             Mounted once, here, rather than per row: it is one surface that
             shows whichever option was tapped. Rendered before TurnDeck so the
             deck stays the last non-overlay node; the sheet portals to <body>
             regardless, so tree position does not decide what paints on top. */}
      <OptionDetailSheetLive
        option={openOption}
        character={character}
        onClose={() => setOpenOption(null)}
        onRollDice={onOpenDiceRoller}
        rulings={rulings}
      />

      <TurnDeck
        character={character}
        inCombat={combatState.inCombat}
        onStartCombat={handleStartCombat}
        economy={economy}
        onToggleEconomy={toggleEconomy}
        onResetEconomy={resetEconomy}
        onExpendSlot={handleExpendSlot}
        onRestoreSlot={handleRestoreSlot}
        onExpendLayOnHands={handleExpendLayOnHands}
        onExpendChannelDivinity={handleExpendChannelDivinity}
        onRestoreChannelDivinity={handleRestoreChannelDivinity}
      />
    </section>
  )
}
