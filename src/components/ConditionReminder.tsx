import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Dice5 } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character } from '../lib/character'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConditionReminderProps {
  character: Character
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

/* ------------------------------------------------------------------ */
/*  Condition Data                                                     */
/* ------------------------------------------------------------------ */

const CONDITION_EFFECTS: Record<string, { summary: string; reminder?: string }> = {
  'Blinded': { summary: "Can't see. Auto-fail sight checks. Attacks have disadvantage, attacks against have advantage.", reminder: 'Disadvantage on attacks' },
  'Charmed': { summary: "Can't attack charmer. Charmer has advantage on social checks.", reminder: 'Cannot attack source' },
  'Deafened': { summary: "Can't hear. Auto-fail hearing checks." },
  'Frightened': { summary: "Disadvantage on checks/attacks while source is visible. Can't willingly move closer.", reminder: 'Disadvantage while source visible' },
  'Grappled': { summary: "Speed is 0. Ends if grappler is incapacitated or effect moves you out of reach.", reminder: 'Speed 0' },
  'Incapacitated': { summary: "Can't take actions or reactions.", reminder: 'No actions or reactions' },
  'Invisible': { summary: "Impossible to see without magic. Advantage on attacks, attacks against have disadvantage.", reminder: 'Advantage on attacks' },
  'Paralyzed': { summary: "Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage, hits within 5ft are crits.", reminder: 'Auto-fail STR/DEX, 5ft hits = crit' },
  'Petrified': { summary: "Turned to stone. Incapacitated, unaware. Resistance to all damage. Auto-fail STR/DEX saves." },
  'Poisoned': { summary: "Disadvantage on attack rolls and ability checks.", reminder: 'Disadvantage on attacks & checks' },
  'Prone': { summary: "Disadvantage on attacks. Melee within 5ft has advantage, ranged has disadvantage. Costs half movement to stand.", reminder: 'Half movement to stand' },
  'Restrained': { summary: "Speed 0. Attacks have disadvantage. Attacks against have advantage. Disadvantage on DEX saves.", reminder: 'Disadvantage on attacks & DEX saves' },
  'Stunned': { summary: "Incapacitated, can't move, speak only falteringly. Auto-fail STR/DEX saves. Attacks against have advantage.", reminder: 'Auto-fail STR/DEX' },
  'Unconscious': { summary: "Incapacitated, drops prone, auto-fail STR/DEX saves. Attacks have advantage, 5ft hits are crits.", reminder: 'Auto-crit in 5ft' },
  'Exhaustion': { summary: "Subtract exhaustion level from all d20 rolls. Speed reduced. At 10 levels: death.", reminder: 'Subtract level from d20s' },
  'Concentration': { summary: "Maintaining a spell. CON save when taking damage (DC 10 or half damage, whichever higher).", reminder: 'CON save on damage (DC 10 or half)' },
}

/** Determine badge variant based on condition severity */
function getConditionVariant(condition: string): 'ember' | 'arcane' | 'eldritch' | 'neutral' {
  const dangerous = ['Paralyzed', 'Stunned', 'Unconscious', 'Petrified', 'Exhaustion']
  const debuff = ['Blinded', 'Frightened', 'Poisoned', 'Restrained', 'Grappled', 'Prone', 'Incapacitated', 'Charmed', 'Deafened']
  const beneficial = ['Invisible', 'Concentration']

  if (dangerous.includes(condition)) return 'ember'
  if (beneficial.includes(condition)) return 'arcane'
  if (debuff.includes(condition)) return 'eldritch'
  return 'neutral'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Persistent floating banner rendered at the top of the Combat tab when
 * the character has active conditions. Compact by default (badge strip),
 * expandable to show full mechanical effects and actionable reminders.
 */
export function ConditionReminder({ character, onOpenDiceRoller }: ConditionReminderProps) {
  const [expanded, setExpanded] = useState(false)

  if (character.conditions.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 ease-forge overflow-hidden ornate-border',
        'border-ember/20 bg-gradient-to-r from-ember/5 via-transparent to-ember/5',
        expanded ? 'p-4' : 'p-3',
      )}
      role="alert"
      aria-label="Active conditions reminder"
    >
      {/* ─── Compact Badge Strip ─── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 min-h-[44px]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          'active:scale-[0.98] transition-transform duration-200',
        )}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse condition details' : 'Expand condition details'}
      >
        <AlertTriangle size={14} className="text-ember shrink-0 animate-pulse" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {character.conditions.map((condition) => (
            <Badge
              key={condition}
              variant={getConditionVariant(condition)}
              className="text-[11px] px-2 py-0.5"
            >
              {condition}
            </Badge>
          ))}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-forge-2 shrink-0" aria-hidden />
        ) : (
          <ChevronDown size={16} className="text-forge-2 shrink-0" aria-hidden />
        )}
      </button>

      {/* ─── Expanded Details ─── */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gold/15 flex flex-col gap-2.5 animate-fade-in">
          {character.conditions.map((condition) => {
            const data = CONDITION_EFFECTS[condition]
            if (!data) {
              return (
                <div key={condition} className="flex items-start gap-2">
                  <Badge variant="neutral" className="text-[11px] shrink-0 mt-0.5">
                    {condition}
                  </Badge>
                  <span className="text-xs text-forge-2 italic">No data available</span>
                </div>
              )
            }

            return (
              <div key={condition} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getConditionVariant(condition)}
                    className="text-[11px] shrink-0"
                  >
                    {condition}
                  </Badge>
                  {data.reminder && (
                    <span className="text-[11px] font-medium text-ember/90">
                      {data.reminder}
                    </span>
                  )}
                </div>
                <p className="text-xs text-forge-2 leading-relaxed pl-1">
                  {data.summary}
                </p>
                {/* Quick dice button for Concentration saves */}
                {condition === 'Concentration' && onOpenDiceRoller && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDiceRoller({ notation: '1d20', label: 'Concentration Save' })
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 self-start mt-1 px-2.5 py-1.5',
                      'min-h-[44px] rounded-lg border border-arcane/20 bg-arcane/5',
                      'text-xs text-arcane font-medium',
                      'hover:bg-arcane/10 hover:border-arcane/30',
                      'transition-all duration-200 ease-forge',
                      'active:scale-[0.95]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                    )}
                  >
                    <Dice5 size={12} aria-hidden />
                    Roll CON Save
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
