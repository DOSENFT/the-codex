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
/* The five resource-spend helpers this list used to open with —
   `expendLayOnHands`, `expendChannelDivinity`, `expendSpellSlot`,
   `restoreSpellSlot` and the `PaladinResources` type — went with `TurnDeck` in
   slice 8b. They were imported for the deck's twelve props and nothing else;
   spending is D's resource rail now, through the reducer, which is the whole
   point of one provider. `shortRest`/`longRest` stay: Rest Management is a
   survivor and it is down here. */
import { type Character, shortRest, longRest } from '../lib/character'
/* `saveCombatState`, `loadCombatState` and `clearCombatState` are no longer
   imported here, and the absence is the slice: this file has stopped being a
   writer of `codex-combat-${id}`. `CombatProvider` owns all three now. If a
   future edit reaches for one of them in this file, the import it has to add
   back is the review flag. */
/* `startCombat`, `endCombat` and `nextTurn` are gone from this list as of 8b —
   all three were the deck's buttons, and the deck is not remounted. Starting,
   ending and advancing a fight are D's pinned strip, through the reducer.
   `createCombatState` survives for exactly one caller: a long rest, which must
   clear a stale fight off the sheet it is rewriting. */
import {
  createCombatState,
  setConcentration as setCombatConcentration,
} from '../lib/combat-state'
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
import { DamageTracker } from './DamageTracker'
import { ConditionReminder } from './ConditionReminder'
import { VitalsBand } from './combat/VitalsBand'
/* EIGHT IMPORTS LEFT THIS BLOCK IN SLICE 8b, and the list is the slice:
   `HPTracker`, `TurnSummary`, `QuickLookup`, `OptionDetailSheetLive`,
   `TurnOptionRow`, `ReactionsBand`, `ContentionBand` and `tallyOf`, plus the
   `TurnOption` type they passed around. Every one of them is a surface
   `TurnScreenD` now paints, or a helper only those surfaces called.

   THE COMPILER WOULD NOT HAVE CAUGHT ANY OF THEM. `noUnusedLocals` is false in
   tsconfig — it is what let 697 lines of unreachable ActionMenu sit here
   through slice 9 without a warning — so a dead import in this file is removed
   deliberately or not at all. That is why they are enumerated rather than
   trimmed until the build goes quiet. */
import { ErrataBand } from './combat/ErrataBand'
import { liveErrata, laterErrata } from '../lib/canon/errata'
/* Reading and writing rulings moved up to `TurnLive` with the store itself —
   only the two TYPES are needed here now, to name the props. */
import type { ErratumRulings, RulingStatus } from '../lib/errata-rulings'
import { useCombat } from './turn/CombatProvider'
import { useCollapsible } from '../hooks/useCollapsible'
import { type CombatLog, type DamageEntry, createCombatLog, logDamage as logDamageEntry, endCombatLog, saveDamageLogs, loadDamageLogs } from '../lib/damage-log'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/* `rulings` and `onRule` are props now, not local state. `TurnLive` owns the
   erratum ruling store because BOTH halves of the combat tab need it — the
   option rows on `TurnScreenD` and the errata band down here — and two copies
   of a localStorage-backed store is exactly the "answered twice" failure item 6
   is about. */
interface CombatExtrasProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
  rulings: ErratumRulings
  onRule: (erratumId: string, status: RulingStatus, dmWording?: string) => void
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

/* ── THREE LOCAL COMPONENTS LEFT THIS FILE HERE — slice 8b ─────────────────
 *
 * `YourTurnList`, `ReactionsBandLive` and `ContentionBandLive` stood in this
 * gap. All three are deleted rather than moved, because `TurnScreenD` already
 * paints what each of them painted, and paints it better:
 *
 *   YourTurnList       → D's `.list`, which shows ALL of the turn in four
 *                        labelled bands. This one was a top five with a footer
 *                        counting what it was hiding — and that footer is the
 *                        exact sentence item 5 quoted back at us.
 *   ReactionsBandLive  → D's Reaction band, with item 7's retaliation capture
 *                        on the row itself instead of in a band of its own.
 *   ContentionBandLive → D paints `turn.mutex` as bracket faces inline, so a
 *                        contended option appears where its slot is spent
 *                        rather than inside an «Everything else» drawer.
 *
 * Their `useCombat()` reads are why this is more than tidiness: each was a
 * separate consumer composing its own view of one turn, on one screen. The
 * engine has a single reader now.
 *
 * `ErrataBandLive` below survives because nothing on D duplicates it — errata
 * are a fact about the SHEET, not about the turn, and they read the same
 * whether or not a fight is running.
 */

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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/* THE SHELL IS GONE, AND ITS ABSENCE IS THE SLICE. Your-Turn slice 8b.
 *
 * `export function CombatHelper(props)` wrapped this component in a
 * `CombatProvider` of its own, because for as long as this file was a tab it
 * was the only thing mounting the engine. It is no longer a tab. `TurnLive`
 * mounts the provider — with the same `key={character.id}`, for the same
 * reason — and this component renders INSIDE it, as `TurnScreenD`'s `extras`.
 *
 * WHY THAT MATTERS AND IS NOT BOOKKEEPING. Two providers is two `useState`
 * copies of `codex-combat-${id}`, two reducers, two undo logs, and one disk
 * key. That is finding-10b's fault — the deck spending through one snapshot
 * while the ranked list composed from another — rebuilt one level up, and it
 * would have been rebuilt by the act of mounting both surfaces on one tab.
 * The count of `CombatProvider` mounts on the combat tab is now ONE, and slice
 * 8c pins that as a test rather than a hope.
 *
 * `character.id` no longer keys anything here because there is nothing left to
 * key: the state this component holds is the damage log, and the effect below
 * is what rebinds it.
 */
export function CombatExtras({
  character,
  onCharacterUpdate,
  onOpenDiceRoller,
  rulings,
  onRule,
}: CombatExtrasProps) {
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
  const { combat: combatState, updateCombat, forgetCombat } = useCombat()

  // Damage tracking
  const [currentDamageLog, setCurrentDamageLog] = useState<CombatLog | null>(
    combatState.inCombat ? createCombatLog() : null
  )

  /* ── THE DAMAGE LOG NOW FOLLOWS THE ENCOUNTER, NOT A BUTTON. Slice 8b. ──
     Marcus's item 9 is "Damage log doesnt seem to actually log the damage ive
     taken", so silently losing the archive during a consolidation is the one
     forbidden outcome of this slice.

     It was lost by construction until this effect. `handleStartCombat` opened a
     log and `handleEndCombat` archived it, and both were the DECK's handlers —
     the deck is gone from this tab and D's own Start/End combat call
     `combat.startEncounter` / `combat.endEncounter`, which go through the
     reducer and know nothing about a damage log. Wiring those two buttons to
     also call these two handlers was the other candidate and is worse: there
     are three ways into `inCombat` (the verb row, an Undo of either, and a
     reconcile on load), and a fix that names one of them fixes one of them.

     SO IT WATCHES THE FACT, NOT THE TAP. `inCombat` is the encounter's own
     truth, read off the provider; every route in or out of a fight moves it,
     including Undo. The previous value is a ref rather than state because
     nothing renders differently for it and a second render per fight is a
     second chance for the archive to run twice.

     THE ARCHIVE IS COMPUTED OUTSIDE THE STATE UPDATER, for the reason
     `handleRule` gives above and `CombatProvider`'s note 2 gives at length: an
     updater is a function React is entitled to call twice, and this one writes
     to disk. */
  const wasInCombat = useRef(combatState.inCombat)
  useEffect(() => {
    const now = combatState.inCombat
    if (now === wasInCombat.current) return
    wasInCombat.current = now
    if (now) {
      setCurrentDamageLog(createCombatLog())
      return
    }
    if (currentDamageLog && currentDamageLog.entries.length > 0) {
      const finished = endCombatLog(currentDamageLog)
      const history = loadDamageLogs(character.id)
      saveDamageLogs(character.id, [...history, finished])
    }
    setCurrentDamageLog(null)
  }, [combatState.inCombat, currentDamageLog, character.id])

  // Collapsible section hooks.
  // Action economy, spell slots and class resources no longer have one: those
  // three are the rail's and the pinned strip's, on the screen above this one,
  // where being collapsible would defeat the point — V-6 exists so a spend is
  // always reachable.
  const concentrationSection = useCollapsible('combat-concentration', character.id, true)
  const aiAdvisorSection = useCollapsible('combat-ai-advisor', character.id, false)
  const damageLogSection = useCollapsible('combat-damage-log', character.id, false)
  const actionsRefSection = useCollapsible('combat-actions-ref', character.id, false)
  const restSection = useCollapsible('combat-rest', character.id, false)

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

  /* ── THE SPEND HANDLERS ARE GONE — Your-Turn slice 8b ────────────────────
     `handleStartCombat`, `handleEndCombat`, `handleNextTurn`, `toggleEconomy`,
     `resetEconomy`, `handleExpendSlot`, `handleRestoreSlot`,
     `handleExpendLayOnHands`, `handleExpendChannelDivinity` and
     `handleRestoreChannelDivinity` were all here, and every one of them was a
     prop of `TurnDeck`. The deck was the second "Your turn" module — item 6 —
     and the screen above this one now owns all ten answers: the four economy
     dots, the rail's slot pips and pool counters, the verb row's Start/End
     combat, and End turn.

     THEY ARE NOT REBUILT, THEY ARE REPLACED BY BETTER ONES, and the difference
     is worth stating once. The deck's `handleEndCombat` called `forgetCombat`,
     which REMOVES `codex-combat-${id}` from disk — irreversible, which is why
     it needed the two-tap `EndCombatConfirm` in front of it. D's End combat
     dispatches `{type:'endCombat'}` through the reducer (reduce.ts:459), which
     writes a log entry carrying a full snapshot, so the same tap is undoable
     from the Undo button in the pinned strip. The confirm strip is not carried
     across because the thing it was protecting against no longer happens.

     `handleEndCombat` also archived the damage log. That half IS carried
     across, and it is the effect above rather than a handler — see its note. */

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
    <section className="flex flex-col gap-4" aria-label="The rest of the session">
      {/* ── WHAT THIS COMPONENT IS NOW, AND WHAT IT STOPPED BEING ───────────
             Until slice 8b this was the combat tab. It is now the tail of one:
             `TurnScreenD` renders it as `extras`, inside its scroller, below
             the option list. The label above changed with the job — "Combat
             Helper" named a tab, and there is one tab.

             EIGHT SURFACES LEFT IN THIS RENDER AND ARE NOT COMING BACK, every
             one of them because the screen above answers the same question
             better and item 6 is explicitly about not answering it twice:

               YourTurnList        → `.list`, which paints ALL of it in four
                                     labelled bands instead of a top five with
                                     a footer counting what it is hiding.
               ReactionsBandLive   → the Reaction band, with item 7's
                                     retaliation capture on the row itself.
               ContentionBandLive  → `turn.mutex`, painted as bracket faces.
               TurnSummary         → the header's Round counter, the four
                                     economy dots and End turn.
               HPTracker           → `vitalsControls` inside `.vitals` — item
                                     10, the colour-changing bar, damage/heal/
                                     temp and the conditions fold, under the
                                     one place his hit points are stated.
               QuickLookup         → mounted by `TurnLive`, opened by the verb
                                     row's "Look up".
               OptionDetailSheet   → mounted by `TurnLive`, opened by a row.
               TurnDeck            → the rail and the pinned strip.

             THE FILES ARE STILL ON DISK. Deleting them is slice 8c, alone, in
             its own commit, because deletion is the irreversible half and
             because 🟡 ASK-FIRST covers it. What this slice removes is RENDERS:
             after this commit the combat tab paints one "Your turn" module and
             nothing is pinned to the bottom of the viewport except D's own
             strip. That is item 6, and it is measurable today rather than after
             the deletions land. */}

      {/* ── Table Truth slice 2 — the vitals band ──
             Save DC, initiative and proficiency were absent from this surface
             entirely; AC and spell attack existed only in the unmounted
             combat/StatsBar.tsx. First thing in the extras because it is the
             set of numbers a turn is made of, and because V-3 wants them read
             at 60cm rather than hunted for. It derives, it renders, and it
             persists nothing.

             THE SHEET-VS-2024 FLAG USED TO HANG OFF THIS ELEMENT — slice 9
             moved it to `combat/SheetRuleFlags`, mounted in D's rail. It is a
             MOVE, not a copy: the flag is entirely about the nine spell-slot
             dots, and measured on his export those dots sat 2,430px up the tab
             from this band (`_diag9.mjs`). `onAdopt` is gone from here because
             the prop is gone from the band, not because the write was dropped —
             `TurnLive` hands the same `onCharacterUpdate` to the flag's new
             home.

             AC IS ON THIS BAND AND ALSO IN D's VITALS ROW. Measured, recorded
             at 8b's close-out, and deliberately NOT quietly fixed here: taking
             a number off a band is a visual change, and "we cannot lose the
             features of the other modules. Nor the visuals" is his standing
             instruction. It is one of the two survivors' overlaps and it is
             his call, not this slice's. */}
      <VitalsBand character={character} />

      {/* Condition Reminder Banner.
          NOT the same surface as the conditions dropdown item 10 asked for —
          that is `VitalsControls`, on the screen above, where conditions are
          SET. This banner states what each condition he already has actually
          does to him, which nothing on the turn screen says. */}
      {character.conditions.length > 0 && (
        <ConditionReminder character={character} onOpenDiceRoller={onOpenDiceRoller} />
      )}

      {/* ── Collapsible: Concentration (only when NOT in combat — the turn screen carries it during combat) ── */}
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
      <ErrataBandLive character={character} rulings={rulings} onRule={onRule} />

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

      {/* ── THE THREE OVERLAYS THAT USED TO END THIS RENDER — slice 8b ────────
             `QuickLookup` and `OptionDetailSheetLive` are both mounted by
             `TurnLive` now, one level up. They are single instances that answer
             a question asked from EITHER half of the tab — the verb row's "Look
             up" and a tap on any option row, both of which live on the screen
             above — so they belong to the parent that owns both halves, not to
             the tail. Mounting them here as well would produce two of each.

             `TurnDeck` is not remounted anywhere. It was the second "Your turn"
             module and the strip pinned to the bottom of the viewport, and item
             6 says so in as many words: "this could just go away." Its two
             capabilities that Marcus named are on the screen above — spell slots
             in the resource rail, End turn / End combat in D's own 44px pinned
             strip. That is what takes the provider count on this tab from four
             to one. */}
    </section>
  )
}
