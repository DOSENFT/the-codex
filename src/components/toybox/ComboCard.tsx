import { Star, Pencil, Trash2, Play, Focus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { ToyboxCombo, ComboBlock } from '../../lib/toybox'

/* ==========================================================================
   COMBO CARD — Expandable strategy combo with numbered action steps
   Toybox sub-component · The Codex main app
   ========================================================================== */

// ─── Constants ───

type BlockType = ComboBlock['type']

const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; text: string }> = {
  action:   { bg: 'bg-red-400/10',   border: 'border-red-400/25',   text: 'text-red-400' },
  bonus:    { bg: 'bg-ember/10',      border: 'border-ember/25',     text: 'text-ember' },
  reaction: { bg: 'bg-arcane/10',     border: 'border-arcane/25',    text: 'text-arcane' },
  movement: { bg: 'bg-verdant/10',    border: 'border-verdant/25',   text: 'text-verdant' },
  free:     { bg: 'bg-white/5',       border: 'border-white/10',     text: 'text-forge-2' },
}

const BLOCK_LABELS: Record<BlockType, string> = {
  action: 'ACTION',
  bonus: 'BONUS',
  reaction: 'REACTION',
  movement: 'MOVEMENT',
  free: 'FREE',
}

/** Known concentration spells -- expand as needed */
const CONCENTRATION_SPELLS = new Set([
  'Bless', 'Bane', 'Hex', "Hunter's Mark", 'Concentration',
  'Hold Person', 'Hold Monster', 'Haste', 'Slow',
  'Spirit Guardians', 'Faerie Fire', 'Entangle',
  'Wall of Fire', 'Darkness', 'Silence', 'Fly',
  'Greater Invisibility', 'Polymorph', 'Banishment',
  'Dominate Person', 'Dominate Monster', 'Hypnotic Pattern',
  'Web', 'Blur', 'Mirror Image', 'Shield of Faith',
  'Flame Sphere', 'Moonbeam', 'Call Lightning',
  'Conjure Animals', 'Conjure Elemental',
])

function isConcentration(sourceName?: string): boolean {
  if (!sourceName) return false
  return CONCENTRATION_SPELLS.has(sourceName)
}

// ─── Props ───

interface ComboCardProps {
  combo: ToyboxCombo
  expanded: boolean
  onToggleExpand: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
  onDeploy: () => void
}

// ─── Sub-components ───

function StepRow({ block, index }: { block: ComboBlock; index: number }) {
  const colors = BLOCK_COLORS[block.type]
  const concentration = block.source === 'spell' && isConcentration(block.sourceName)

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Step number circle */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
          colors.bg,
          colors.text,
        )}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type pill */}
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded',
              'uppercase tracking-wider text-xs font-semibold border',
              colors.bg,
              colors.border,
              colors.text,
            )}
          >
            {BLOCK_LABELS[block.type]}
          </span>

          {/* Block label */}
          <span className="text-forge-0 text-sm font-medium truncate">
            {block.label}
          </span>

          {/* Concentration indicator */}
          {concentration && (
            <span className="inline-flex items-center gap-1 text-arcane" title="Requires Concentration">
              <Focus className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Notes */}
        {block.notes && (
          <p className="mt-0.5 text-forge-2/60 text-xs italic leading-snug">
            {block.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───

export function ComboCard({
  combo,
  expanded,
  onToggleExpand,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDeploy,
}: ComboCardProps) {
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
          aria-label={combo.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              combo.favorite ? 'text-ember fill-ember' : 'text-forge-2/40',
            )}
          />
        </button>

        {/* Name + block count */}
        <div className="flex-1 min-w-0">
          <span className="font-display text-forge-0 font-semibold text-sm truncate block">
            {combo.name}
          </span>
        </div>

        {/* Block count badge */}
        <span className="flex-shrink-0 text-xs text-forge-2 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
          {combo.blocks.length} step{combo.blocks.length !== 1 ? 's' : ''}
        </span>

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

            {/* Numbered steps */}
            {combo.blocks.length > 0 ? (
              <div className="space-y-0.5">
                {combo.blocks.map((block, i) => (
                  <StepRow key={block.id} block={block} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-forge-2/60 text-sm italic">No steps defined</p>
            )}

            {/* Description */}
            {combo.description && (
              <p className="font-display text-forge-1 text-sm italic leading-relaxed">
                {combo.description}
              </p>
            )}

            {/* Tags */}
            {combo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {combo.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={onDeploy}
                aria-label="Deploy combo"
              >
                <Play className="w-4 h-4" />
                Deploy
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                aria-label="Edit combo"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="hover:text-red-400"
                aria-label="Delete combo"
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
