import { useState, useEffect, useCallback } from 'react'
import { X, Check, Dices, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import type { ToyboxCombo, ComboBlock } from '../../lib/toybox'

/* ==========================================================================
   DEPLOY VIEW — Full-screen overlay for step-by-step combo execution
   Toybox sub-component · The Codex main app
   ========================================================================== */

// ─── Constants ───

const BLOCK_COLORS: Record<ComboBlock['type'], { text: string; bg: string; border: string }> = {
  action:   { text: 'text-red-400',  bg: 'bg-red-400/10',   border: 'border-red-400/25' },
  bonus:    { text: 'text-ember',    bg: 'bg-ember/10',     border: 'border-ember/25' },
  reaction: { text: 'text-arcane',   bg: 'bg-arcane/10',    border: 'border-arcane/25' },
  movement: { text: 'text-verdant',  bg: 'bg-verdant/10',   border: 'border-verdant/25' },
  free:     { text: 'text-forge-2',  bg: 'bg-white/5',      border: 'border-white/10' },
}

const BLOCK_LABELS: Record<ComboBlock['type'], string> = {
  action: 'ACTION',
  bonus: 'BONUS',
  reaction: 'REACTION',
  movement: 'MOVEMENT',
  free: 'FREE',
}

// ─── Props ───

interface DeployViewProps {
  combo: ToyboxCombo
  onClose: () => void
  onOpenDice?: (prefill: { notation: string; label: string }) => void
  onUseSlot?: (level: number) => void
  concentratingOn?: string | null
}

// ─── Main Component ───

export function DeployView({
  combo,
  onClose,
  onOpenDice,
  onUseSlot,
  concentratingOn,
}: DeployViewProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const totalSteps = combo.blocks.length
  const block = combo.blocks[currentStep]
  const colors = block ? BLOCK_COLORS[block.type] : BLOCK_COLORS.free
  const isLastStep = currentStep === totalSteps - 1

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Escape key closes overlay
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  function advanceStep() {
    setCompletedSteps((prev) => new Set([...prev, currentStep]))

    // Auto-spend spell slot for spell-sourced action/bonus blocks
    if (block?.source === 'spell' && (block.type === 'action' || block.type === 'bonus')) {
      onUseSlot?.(1)
    }

    if (isLastStep) {
      handleClose()
      return
    }

    setCurrentStep((s) => s + 1)
  }

  function handleRoll() {
    if (!block || !onOpenDice) return
    const label = block.sourceName ?? block.label
    onOpenDice({
      notation: '1d20',
      label,
    })
  }

  const showRollButton = block && (block.source === 'spell' || block.source === 'weapon')
  const showConcentrationWarning =
    block?.source === 'spell' &&
    concentratingOn != null &&
    concentratingOn.length > 0

  if (!block) return null

  const progressPercent = ((currentStep + (completedSteps.has(currentStep) ? 1 : 0)) / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-[60] bg-void-0/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-forge-0 truncate">
            {combo.name}
          </h2>
          <p className="text-xs text-forge-2 mt-0.5">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg',
            'text-forge-2 hover:text-forge-0 transition-all duration-200 ease-forge',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          )}
          aria-label="Close deploy view"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-arcane/60 rounded-full transition-all duration-300 ease-forge"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Completed steps (compact list) */}
      {completedSteps.size > 0 && (
        <div className="px-4 pb-2 space-y-1 max-h-28 overflow-y-auto">
          {combo.blocks.map((b, i) => {
            if (!completedSteps.has(i)) return null
            const c = BLOCK_COLORS[b.type]
            return (
              <div key={b.id} className="flex items-center gap-2 opacity-50">
                <Check size={14} className="text-verdant shrink-0" />
                <span className={cn('uppercase tracking-wider text-xs', c.text)}>
                  {b.type}
                </span>
                <span className="text-xs text-forge-2 truncate">{b.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Current step — static (no Framer Motion) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="flex flex-col items-center text-center w-full max-w-sm animate-fade-in">
          {/* Step number circle */}
          <div
            className={cn(
              'w-16 h-16 rounded-full border flex items-center justify-center mb-4',
              colors.bg,
              colors.border,
            )}
          >
            <span className={cn('text-2xl font-bold', colors.text)}>
              {currentStep + 1}
            </span>
          </div>

          {/* Block type label pill */}
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full border mb-3',
              'uppercase tracking-wider text-xs font-semibold',
              colors.bg,
              colors.border,
              colors.text,
            )}
          >
            {BLOCK_LABELS[block.type]}
          </span>

          {/* Block label */}
          <h3 className="font-display text-lg font-semibold text-forge-0 mb-2">
            {block.label}
          </h3>

          {/* Source info */}
          {block.sourceName && (
            <p className="text-xs text-forge-2 mb-1">
              Source: {block.sourceName} ({block.source})
            </p>
          )}

          {/* Notes */}
          {block.notes && (
            <p className="text-sm text-forge-2 italic mt-1">{block.notes}</p>
          )}

          {/* Concentration warning */}
          {showConcentrationWarning && (
            <div className="bg-red-400/10 border border-red-400/25 rounded-lg p-3 mt-4 flex items-start gap-2 w-full">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm text-red-400 font-medium">Concentration Conflict</p>
                <p className="text-xs text-forge-2 mt-0.5">
                  Currently concentrating on{' '}
                  <span className="text-forge-1 font-medium">{concentratingOn}</span>.
                  Casting this spell will drop concentration.
                </p>
              </div>
            </div>
          )}

          {/* Spell slot reminder */}
          {block.source === 'spell' && (block.type === 'action' || block.type === 'bonus') && (
            <p className="text-xs text-forge-2 mt-3">
              Advancing will spend a 1st-level spell slot.
            </p>
          )}
        </div>
      </div>

      {/* Remaining step indicators */}
      <div className="flex items-center justify-center gap-2 pb-3">
        {combo.blocks.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-200',
              i === currentStep
                ? 'bg-arcane'
                : completedSteps.has(i)
                  ? 'bg-verdant/50'
                  : 'bg-white/[0.08]',
            )}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-6 pt-2 space-y-3">
        {showRollButton && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleRoll}
            className="w-full bg-ember/10 border-ember/25 text-ember hover:bg-ember/15"
          >
            <Dices size={20} />
            Roll
          </Button>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={advanceStep}
          className="w-full"
        >
          {isLastStep ? (
            <>
              <Check size={20} />
              Complete
            </>
          ) : (
            <>
              Next Step
              <ChevronRight size={20} />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
