import { Star, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { TacticDiagram } from './TacticDiagram'
import type { ToyboxTactic } from '../../lib/toybox'

/* ==========================================================================
   TACTIC CARD — Expandable tactic with optional battlefield diagram
   Toybox sub-component · The Codex main app
   ========================================================================== */

// ─── Constants ───

const PRIORITY_BADGE_VARIANT: Record<ToyboxTactic['priority'], 'ember' | 'neutral'> = {
  critical: 'ember',
  high: 'ember',
  normal: 'neutral',
}

const PRIORITY_LABELS: Record<ToyboxTactic['priority'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  normal: 'NORMAL',
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  survival: 'Survival',
  burst: 'Burst',
  control: 'Control',
  support: 'Support',
}

// ─── Props ───

interface TacticCardProps {
  tactic: ToyboxTactic
  expanded: boolean
  onToggleExpand: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}

// ─── Main Component ───

export function TacticCard({
  tactic,
  expanded,
  onToggleExpand,
  onToggleFavorite,
  onEdit,
  onDelete,
}: TacticCardProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* ── Header Row ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'transition-all duration-200 ease-forge active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
        aria-expanded={expanded}
      >
        {/* Favorite star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg',
            'transition-all duration-200 ease-forge active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
          aria-label={tactic.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              tactic.favorite ? 'text-ember fill-ember' : 'text-forge-2/40',
            )}
          />
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="font-display text-forge-0 font-semibold text-sm truncate block">
            {tactic.name}
          </span>
        </div>

        {/* Priority badge */}
        <Badge variant={PRIORITY_BADGE_VARIANT[tactic.priority]} className="flex-shrink-0">
          {PRIORITY_LABELS[tactic.priority]}
        </Badge>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-forge-2 flex-shrink-0 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 text-forge-2 flex-shrink-0 transition-transform duration-200" />
        )}
      </button>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div className="animate-fade-in">
          <div className="px-4 pb-4 space-y-3">
            {/* Hairline divider */}
            <div className="h-px bg-white/[0.08]" />

            {/* Diagram (if present) */}
            {tactic.diagram && (
              <TacticDiagram diagram={tactic.diagram} className="mb-2" />
            )}

            {/* Trigger */}
            <p className="font-display text-forge-1 text-sm italic leading-relaxed">
              When: {tactic.trigger}
            </p>

            {/* Action steps */}
            {tactic.actions.length > 0 && (
              <ol className="space-y-1.5 pl-1">
                {tactic.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-forge-2 font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-forge-0 text-sm leading-snug">
                      {action}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* Category badge */}
            {tactic.category && (
              <div>
                <Badge variant="neutral">
                  {CATEGORY_LABELS[tactic.category] ?? tactic.category}
                </Badge>
              </div>
            )}

            {/* Requirements */}
            {tactic.requirements && tactic.requirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tactic.requirements.map((req) => (
                  <Badge key={req} variant="neutral">
                    {req}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tags */}
            {tactic.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tactic.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                aria-label="Edit tactic"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="hover:text-red-400"
                aria-label="Delete tactic"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
