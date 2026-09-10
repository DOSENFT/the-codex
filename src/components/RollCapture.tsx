import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Minus, Plus, X } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { SPRING_SETTLE, SHEET_EXIT } from '../lib/motion-utils'
import { useInertWhenClosed } from '../hooks/useInertWhenClosed'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { GlassCard } from './ui/GlassCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { formatRollNotation } from '../lib/dice'
import type { DieType, AdvantageState } from '../lib/dice'
import { attackBonus, abilityModifier, savingThrowBonus } from '../lib/character'
import type { Character, Weapon, AbilityKey } from '../lib/character'
import { ALL_ABILITIES, ABILITY_NAMES } from '../lib/dnd-rules'

/* ─────────────────────────────────────────────────────────────────────────────
 * RollCapture — was `DiceRoller`, and the rename is the whole point.
 *
 * Marcus rolls physical dice. Every time, without exception. The old component
 * shipped a three.js stage that tumbled a GPU-rendered d20 he has never once
 * watched — 230 KB gzipped, 31% of the app's total JavaScript, for an
 * impression of an object already sitting on the table in front of him.
 *
 * So the model inverted. He owns the randomness; the app owns the arithmetic.
 * A d20 is an excellent random number generator and a terrible calculator, and
 * the calculator is the half that goes wrong under a clock — the app already
 * knows his attack bonus is +8, so asking him to add 8 to a 14 in his head,
 * mid-fight, is the app declining to do the one part it is better at.
 *
 * What that leaves is genuinely most of this file. Die type, quantity,
 * modifier, advantage, the character presets — all of those describe WHAT to
 * roll, which is exactly the right thing for an app to say to someone holding
 * dice. Only the button that pretended to roll them is gone, replaced by a box
 * that takes the number his die actually showed.
 *
 * DELETED WITH IT, and not coming back quietly: `secureDie`, `rollDice`,
 * `RollResult`, `DiceStage.tsx`, `DiceAnimation.tsx`, `three`,
 * `@react-three/fiber`. Nothing downstream consumed a roll result — no damage
 * application, no HP, no slot spend read it — which is what made the removal
 * safe rather than merely desirable.
 * ────────────────────────────────────────────────────────────────────────── */

/* ─── Types ─── */

interface RollCaptureProps {
  isOpen: boolean
  onClose: () => void
  character?: Character
  prefill?: { notation: string; label: string } | null
}

/** One roll, already made with real dice, written down.
 *
 *  `faces` is what the dice showed and `total` is what it comes to; the two are
 *  stored side by side rather than one derived on read, because the arithmetic
 *  is the service this panel provides and a stored answer is one that can be
 *  checked against the dice still lying on the table. */
interface Capture {
  id: number
  dieType: DieType
  quantity: number
  modifier: number
  advantage: AdvantageState
  /** One entry normally. Two on a d20 with advantage or disadvantage, because
   *  that is the one case where a hand genuinely reads two dice separately
   *  instead of scooping up a fistful and reading the sum. */
  faces: number[]
  /** The face that counts — higher on advantage, lower on disadvantage. Equal
   *  to `faces[0]` in every other case. */
  kept: number
  total: number
  label: string | null
}

/* ─── Constants ─── */

const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20, 100]

const DIE_LABELS: Record<DieType, string> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
  100: 'd100',
}

const MAX_QUANTITY = 10
const MIN_QUANTITY = 1
const MAX_MODIFIER = 20
const MIN_MODIFIER = -20
const MAX_HISTORY = 5

interface QuickPreset {
  label: string
  dieType: DieType
  quantity: number
  modifier: number
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: 'd20', dieType: 20, quantity: 1, modifier: 0 },
  { label: '1d8', dieType: 8, quantity: 1, modifier: 0 },
  { label: '2d6', dieType: 6, quantity: 2, modifier: 0 },
]

/* ─── Roll arithmetic (no randomness anywhere in this file) ─── */

/** The lowest and highest a set of dice can physically show.
 *
 *  This exists to refuse a typo before it becomes a wrong number on the DM's
 *  side of the table. 2d8 cannot be 19. A box that accepts 19 is a box that
 *  will eventually cost a fight, and the cost lands minutes later when nobody
 *  can reconstruct where it came from.
 *
 *  The modifier is deliberately OUTSIDE this range: you type the dice, the app
 *  adds the bonus. Folding the modifier in would mean the one number he enters
 *  is the one number he had to do mental arithmetic on first. */
export function faceRange(dieType: DieType, quantity: number): [number, number] {
  return [quantity, quantity * dieType]
}

/** How many number boxes this roll needs. See `Capture.faces`. */
export function boxCount(dieType: DieType, advantage: AdvantageState): number {
  return dieType === 20 && advantage !== 'normal' ? 2 : 1
}

/** The face that counts, once both d20s are in. */
export function keptFace(faces: number[], advantage: AdvantageState): number {
  if (faces.length < 2) return faces[0]
  return advantage === 'disadvantage' ? Math.min(...faces) : Math.max(...faces)
}

/* ─── Sub-Components ─── */

function DragHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1" aria-hidden>
      <div className="w-10 h-1 rounded-full bg-forge-2/40" />
    </div>
  )
}

function DieButton({
  die,
  selected,
  onSelect,
}: {
  die: DieType
  selected: boolean
  onSelect: (die: DieType) => void
}) {
  return (
    <button
      type="button"
      aria-label={`Select ${DIE_LABELS[die]}`}
      aria-pressed={selected}
      onClick={() => onSelect(die)}
      className={cn(
        'min-h-[44px] min-w-[44px] w-[44px] h-[44px] rounded-full',
        'font-mono text-sm font-semibold',
        'transition-all duration-200 ease-forge',
        'active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        selected
          ? 'bg-arcane/20 text-arcane border-2 border-gold shadow-[0_0_12px_-2px_rgba(197,165,90,0.25)] ornate-border'
          : 'bg-gold/[0.04] text-forge-1 border border-bronze/25 hover:bg-gold/[0.08] hover:text-forge-0',
      )}
    >
      {DIE_LABELS[die]}
    </button>
  )
}

function StepperControl({
  label,
  value,
  min,
  max,
  onChange,
  formatValue,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}) {
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-forge-1 select-none">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
            'bg-gold/[0.04] border border-bronze/25 text-forge-1',
            'transition-all duration-200 ease-forge',
            'enabled:hover:bg-gold/[0.08] enabled:hover:text-forge-0',
            'enabled:active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <Minus size={18} aria-hidden />
        </button>

        <span
          className="min-w-[3rem] text-center font-mono text-lg font-semibold text-forge-0 select-none"
          aria-live="polite"
        >
          {displayValue}
        </span>

        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn(
            'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
            'bg-gold/[0.04] border border-bronze/25 text-forge-1',
            'transition-all duration-200 ease-forge',
            'enabled:hover:bg-gold/[0.08] enabled:hover:text-forge-0',
            'enabled:active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function AdvantageToggle({
  value,
  onChange,
}: {
  value: AdvantageState
  onChange: (v: AdvantageState) => void
}) {
  const options: { state: AdvantageState; label: string }[] = [
    { state: 'normal', label: 'Normal' },
    { state: 'advantage', label: 'Advantage' },
    { state: 'disadvantage', label: 'Disadvantage' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-forge-1 select-none">Roll Mode</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Advantage mode">
        {options.map(({ state, label }) => {
          const isActive = value === state
          return (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => onChange(state)}
              className={cn(
                'flex-1 min-h-[44px] px-2 rounded-xl',
                'text-xs font-semibold',
                'transition-all duration-200 ease-forge',
                'active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                isActive && state === 'normal' &&
                  'bg-gold/15 text-gold border border-gold/40 shadow-[0_0_12px_-2px_rgba(197,165,90,0.25)]',
                isActive && state === 'advantage' &&
                  'bg-verdant/20 text-verdant border border-verdant/40 shadow-[0_0_12px_-2px_rgba(57,217,138,0.25)]',
                isActive && state === 'disadvantage' &&
                  'bg-red-400/20 text-red-400 border border-red-400/40 shadow-[0_0_12px_-2px_rgba(248,113,113,0.25)]',
                !isActive &&
                  'bg-gold/[0.04] text-forge-2 border border-bronze/25 hover:bg-gold/[0.06] hover:text-forge-1',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── The capture strip ─── */

/** `you rolled [ 14 ] +8 → 22`.
 *
 *  SPLIT OUT AND EXPORTED SO IT CAN BE PROVED, for the reason
 *  `RetaliationCapture` gives about its own confirm strip: this repo has no
 *  jsdom, component claims are made with `renderToStaticMarkup`, and a strip
 *  that only appears after typing would otherwise be the one part of this
 *  panel the unit suite could never see. It is also the part that carries the
 *  arithmetic, which is the entire product. */
export function CaptureStrip({
  dieType,
  quantity,
  modifier,
  advantage,
  faces,
  onFaceChange,
  onCommit,
  firstFaceRef,
}: {
  dieType: DieType
  quantity: number
  modifier: number
  advantage: AdvantageState
  /** Raw text, one per box — never numbers. A half-typed "1" on the way to
   *  "14" is a valid thing to be holding, and a number type cannot hold it. */
  faces: string[]
  onFaceChange: (index: number, value: string) => void
  onCommit: () => void
  firstFaceRef?: React.Ref<HTMLInputElement>
}) {
  const [lo, hi] = faceRange(dieType, quantity)
  const boxes = boxCount(dieType, advantage)

  const parsed = faces.slice(0, boxes).map(f => Number.parseInt(f, 10))
  const allEntered = parsed.length === boxes && parsed.every(n => Number.isFinite(n))
  const inRange = allEntered && parsed.every(n => n >= lo && n <= hi)

  const kept = inRange ? keptFace(parsed, advantage) : null
  const total = kept === null ? null : kept + modifier

  /* The refusal names the range rather than saying "invalid", because the
     number that is wrong is sitting in front of him and the useful sentence is
     the one that tells him which of the two — the dice or the typing — to look
     at again. */
  const refusal =
    allEntered && !inRange
      ? `${formatRollNotation(quantity, dieType, 0)} can only show ${lo}–${hi}.`
      : null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gold/30 bg-void-2/60 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-forge-2">
          you rolled
        </span>

        {Array.from({ length: boxes }, (_, i) => (
          <input
            key={`face-${i}`}
            ref={i === 0 ? firstFaceRef : undefined}
            type="text"
            inputMode="numeric"
            value={faces[i] ?? ''}
            onChange={event => onFaceChange(i, event.target.value)}
            aria-label={
              boxes === 2
                ? `${advantage === 'advantage' ? 'Advantage' : 'Disadvantage'} d20, die ${i + 1} of 2`
                : `The number your ${formatRollNotation(quantity, dieType, 0)} showed`
            }
            className="min-h-[48px] w-16 rounded-lg border border-gold/40 bg-void-1 px-2 text-center font-mono text-lg text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          />
        ))}

        {modifier !== 0 && (
          <span className="font-mono text-lg text-ember tabular-nums">
            {modifier > 0 ? `+${modifier}` : modifier}
          </span>
        )}

        {total !== null && (
          <>
            <span className="text-forge-2" aria-hidden>=</span>
            <output
              className="font-display text-3xl font-bold tabular-nums text-gold"
              aria-label={`Total ${total}`}
            >
              {total}
            </output>
          </>
        )}

        <Button
          variant="primary"
          size="md"
          className="ml-auto"
          onClick={onCommit}
          disabled={total === null}
          aria-label="Write this roll down"
        >
          Log it
        </Button>
      </div>

      {/* Which d20 the app is going to use, said out loud before he commits —
          a silent choice between two numbers he can both see is the kind of
          thing that erodes trust in every other number on the screen. */}
      {boxes === 2 && kept !== null && (
        <p className="text-xs text-forge-2">
          Taking the {advantage === 'advantage' ? 'higher' : 'lower'}: <span className="font-mono text-forge-0">{kept}</span>
        </p>
      )}

      {refusal && (
        <p role="status" className="text-xs leading-snug text-ember">
          {refusal}
        </p>
      )}
    </div>
  )
}

/* ─── Result & history ─── */

function CaptureResult({ capture }: { capture: Capture }) {
  const single = capture.dieType === 20 && capture.quantity === 1
  const isNat20 = single && capture.kept === 20
  const isNat1 = single && capture.kept === 1

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      {capture.label && (
        <Badge variant="arcane" className="text-sm px-3 py-1">
          {capture.label}
        </Badge>
      )}

      <div
        className={cn(
          'stat-frame font-display text-5xl font-bold tabular-nums px-6 py-2',
          isNat20 && 'text-verdant drop-shadow-[0_0_16px_rgba(57,217,138,0.6)]',
          isNat1 && 'text-red-400 drop-shadow-[0_0_16px_rgba(248,113,113,0.6)]',
          !isNat20 && !isNat1 && 'text-forge-0',
        )}
        aria-live="polite"
        aria-label={`Total ${capture.total}`}
      >
        {capture.total}
      </div>

      {isNat20 && (
        <Badge variant="verdant" className="text-xs">
          Natural 20!
        </Badge>
      )}
      {isNat1 && (
        <Badge variant="neutral" className="border-red-400/40 bg-red-400/15 text-red-400 text-xs">
          Natural 1
        </Badge>
      )}

      {/* The working, shown. Kept faces lit, the discarded d20 struck through —
          the same treatment the old roller gave its own dropped die, and it
          means more here because these are numbers he can look down and check
          against the table. */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {capture.faces.map((value, i) => {
          const dropped = capture.faces.length > 1 && value !== capture.kept
          return (
            <span
              key={`face-${i}`}
              className={cn(
                'inline-flex items-center justify-center min-w-[44px] h-8 px-2',
                'rounded-lg font-mono text-sm font-semibold',
                dropped && 'bg-gold/[0.03] text-forge-2/60 border border-bronze/15 line-through',
                !dropped && 'bg-arcane/10 text-arcane border border-arcane/20',
              )}
              aria-label={dropped ? `Dropped die: ${value}` : undefined}
            >
              {value}
            </span>
          )
        })}

        {capture.modifier !== 0 && (
          <span className="stat-frame inline-flex items-center h-8 px-2 font-mono text-sm font-semibold text-ember">
            {capture.modifier > 0 ? `+${capture.modifier}` : capture.modifier}
          </span>
        )}
      </div>

      <span className="text-xs text-forge-2 font-mono">
        {formatRollNotation(capture.quantity, capture.dieType, capture.modifier)}
        {capture.advantage === 'advantage' && ' (adv)'}
        {capture.advantage === 'disadvantage' && ' (disadv)'}
      </span>
    </div>
  )
}

function HistoryCard({ capture }: { capture: Capture }) {
  const notation = formatRollNotation(capture.quantity, capture.dieType, capture.modifier)

  return (
    <div className="combat-card flex items-center justify-between px-3 py-2 rounded-lg">
      <span className="font-mono text-xs text-forge-2">
        {capture.label ? `${capture.label} · ` : ''}
        {notation}
        {capture.advantage === 'advantage' && ' adv'}
        {capture.advantage === 'disadvantage' && ' dis'}
      </span>
      <span className="font-mono text-sm font-bold text-forge-0">= {capture.total}</span>
    </div>
  )
}

/* ─── Collapsible Section ─── */

function DisclosureSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 rounded-lg',
          'text-sm font-semibold text-forge-1',
          'transition-all duration-200 ease-forge',
          'hover:bg-gold/[0.04] hover:text-forge-0',
          'active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        )}
      >
        {isOpen ? (
          <ChevronDown size={16} aria-hidden className="text-forge-2" />
        ) : (
          <ChevronRight size={16} aria-hidden className="text-forge-2" />
        )}
        {title}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 pl-1 pt-1 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Character Presets Section ─── */

/** His numbers, as buttons. Tapping one no longer rolls anything — it sets up
 *  the capture strip with the right die and the right bonus already filled in,
 *  so the only thing left for him to supply is the thing only the table knows.
 *
 *  This section survived the removal intact and gets MORE useful without the
 *  roller, not less: `attackBonus`, `savingThrowBonus` and `weaponDamageMod`
 *  were always the honest part of this panel, and they were previously in
 *  service of a fake die. */
function CharacterPresets({
  character,
  onPick,
}: {
  character: Character
  onPick: (
    dieType: DieType,
    quantity: number,
    modifier: number,
    advantage: AdvantageState,
    label: string,
  ) => void
}) {
  /** Parse damage dice string like "2d8" into { quantity, dieType } */
  function parseDamageDice(dice: string): { quantity: number; dieType: DieType } | null {
    const match = dice.match(/^(\d+)d(\d+)$/)
    if (!match) return null
    const quantity = parseInt(match[1], 10)
    const sides = parseInt(match[2], 10)
    if ([4, 6, 8, 10, 12, 20, 100].includes(sides)) {
      return { quantity, dieType: sides as DieType }
    }
    return null
  }

  /** Calculate damage modifier for a weapon */
  function weaponDamageMod(weapon: Weapon): number {
    const mod = abilityModifier(character.abilityScores[weapon.abilityMod])
    const bonus = weapon.bonusDamage ?? 0
    return mod + bonus
  }

  const presetButtonClass = cn(
    'min-h-[44px] px-3 py-2 rounded-xl',
    'text-xs font-semibold text-left',
    'transition-all duration-200 ease-forge',
    'active:scale-95',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
  )

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-forge-1 select-none">
        Character Presets
      </span>

      {/* Attacks */}
      <DisclosureSection title="Attacks">
        <div className="flex flex-wrap gap-2">
          {character.weapons.map((weapon) => {
            const bonus = attackBonus(character, weapon)
            return (
              <button
                key={`attack-${weapon.name}`}
                type="button"
                onClick={() => onPick(20, 1, bonus, 'normal', weapon.name)}
                className={cn(
                  presetButtonClass,
                  'bg-arcane/10 text-arcane border border-arcane/25',
                  'hover:bg-arcane/20 hover:border-arcane/40',
                )}
                aria-label={`Attack with ${weapon.name}: d20 + ${bonus}`}
              >
                <span className="block">{weapon.name}</span>
                <span className="block text-xs text-arcane/70 font-mono">
                  d20{bonus >= 0 ? `+${bonus}` : bonus}
                </span>
              </button>
            )
          })}

          {/* Spell Attack */}
          <button
            type="button"
            onClick={() => onPick(20, 1, character.spellAttackBonus, 'normal', 'Spell Attack')}
            className={cn(
              presetButtonClass,
              'bg-eldritch/10 text-eldritch-lit border border-eldritch/25',
              'hover:bg-eldritch/20 hover:border-eldritch/40',
            )}
            aria-label={`Spell Attack: d20 + ${character.spellAttackBonus}`}
          >
            <span className="block">Spell Attack</span>
            <span className="block text-xs text-eldritch-lit font-mono">
              d20{character.spellAttackBonus >= 0 ? `+${character.spellAttackBonus}` : character.spellAttackBonus}
            </span>
          </button>
        </div>
      </DisclosureSection>

      {/* Saving Throws */}
      <DisclosureSection title="Saving Throws">
        <div className="grid grid-cols-3 gap-2">
          {ALL_ABILITIES.map((ability: AbilityKey) => {
            const bonus = savingThrowBonus(character, ability)
            const isProficient = character.savingThrowProficiencies.includes(ability)
            return (
              <button
                key={`save-${ability}`}
                type="button"
                onClick={() => onPick(20, 1, bonus, 'normal', `${ABILITY_NAMES[ability]} Save`)}
                className={cn(
                  presetButtonClass,
                  'text-center',
                  isProficient
                    ? 'bg-verdant/10 text-verdant border border-verdant/25 hover:bg-verdant/20 hover:border-verdant/40'
                    : 'bg-gold/[0.04] text-forge-1 border border-bronze/25 hover:bg-gold/[0.08] hover:text-forge-0',
                )}
                aria-label={`${ABILITY_NAMES[ability]} saving throw: d20 + ${bonus}`}
              >
                <span className="block">{ability}</span>
                <span className={cn(
                  'block text-xs font-mono',
                  isProficient ? 'text-verdant/70' : 'text-forge-2',
                )}>
                  {bonus >= 0 ? `+${bonus}` : bonus}
                </span>
              </button>
            )
          })}
        </div>
      </DisclosureSection>

      {/* Damage */}
      {character.weapons.length > 0 && (
        <DisclosureSection title="Damage">
          <div className="flex flex-wrap gap-2">
            {character.weapons.map((weapon) => {
              const parsed = parseDamageDice(weapon.damageDice)
              if (!parsed) return null
              const damageMod = weaponDamageMod(weapon)
              return (
                <button
                  key={`damage-${weapon.name}`}
                  type="button"
                  onClick={() =>
                    onPick(parsed.dieType, parsed.quantity, damageMod, 'normal', `${weapon.name} damage`)
                  }
                  className={cn(
                    presetButtonClass,
                    'bg-ember/10 text-ember border border-ember/25',
                    'hover:bg-ember/20 hover:border-ember/40',
                  )}
                  aria-label={`${weapon.name} damage: ${weapon.damageDice} + ${damageMod}`}
                >
                  <span className="block">{weapon.name}</span>
                  <span className="block text-xs text-ember/70 font-mono">
                    {weapon.damageDice}{damageMod >= 0 ? `+${damageMod}` : damageMod} {weapon.damageType}
                  </span>
                </button>
              )
            })}
          </div>
        </DisclosureSection>
      )}
    </div>
  )
}

/* ─── Main Component ─── */

/**
 * RollCapture — slide-up panel for writing down a roll you already made.
 *
 * Die type, quantity, modifier and advantage describe what to reach for; the
 * character presets fill all four from the sheet. The capture strip takes the
 * number the dice showed and adds the bonus the app already knows.
 *
 * The parent (`Layout.tsx`) controls visibility via `isOpen` and provides
 * `onClose`. All roll state is internal.
 */
export function RollCapture({ isOpen, onClose, character, prefill }: RollCaptureProps) {
  /* ── Roll shape ── */
  const [dieType, setDieType] = useState<DieType>(20)
  const [quantity, setQuantity] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [advantage, setAdvantage] = useState<AdvantageState>('normal')
  const [label, setLabel] = useState<string | null>(null)

  /* ── What the dice showed ── */
  const [faces, setFaces] = useState<string[]>([''])
  const [lastCapture, setLastCapture] = useState<Capture | null>(null)
  const [history, setHistory] = useState<Capture[]>([])

  const captureIdRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const firstFaceRef = useRef<HTMLInputElement>(null)

  /** Any change to the SHAPE of the roll invalidates the faces — they described
   *  a different roll. Silently keeping "14" while the die switches from d20 to
   *  d6 would produce a number that passes every check and means nothing. */
  const reshape = useCallback(
    (next: {
      dieType?: DieType
      quantity?: number
      modifier?: number
      advantage?: AdvantageState
      label?: string | null
    }) => {
      if (next.dieType !== undefined) setDieType(next.dieType)
      if (next.quantity !== undefined) setQuantity(next.quantity)
      if (next.modifier !== undefined) setModifier(next.modifier)
      if (next.advantage !== undefined) setAdvantage(next.advantage)
      if (next.label !== undefined) setLabel(next.label)
      setFaces([''])
    },
    [],
  )

  /* ── Prefill Handler ── */
  useEffect(() => {
    if (!isOpen || !prefill) {
      if (!isOpen) setLabel(null)
      return
    }

    // Parse notation like "d20+6", "2d8+4", "1d10-1", "d20", "2d6"
    const match = prefill.notation.match(/^(\d*)d(\d+)([+-]\d+)?$/)
    if (!match) return

    const qty = match[1] ? parseInt(match[1], 10) : 1
    const sides = parseInt(match[2], 10)
    const mod = match[3] ? parseInt(match[3], 10) : 0

    const validDice: DieType[] = [4, 6, 8, 10, 12, 20, 100]
    if (validDice.includes(sides as DieType)) {
      reshape({
        dieType: sides as DieType,
        quantity: qty,
        modifier: mod,
        advantage: 'normal',
        label: prefill.label,
      })

      /* Focus the number box, NOT a button. He arrived here holding dice that
         have already stopped moving; the next thing he does is type. */
      requestAnimationFrame(() => {
        firstFaceRef.current?.focus()
      })
    }
  }, [isOpen, prefill, reshape])

  /* ── Focus Trap ── */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        panelRef.current?.focus()
      })
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Trap focus within panel
  useEffect(() => {
    if (!isOpen) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  /* ── Closed means closed (Slice 15) ── */
  // Mounted-and-slid-off-screen, so its controls stay tabbable without this.
  useInertWhenClosed(panelRef, isOpen)

  /* ── Escape Key ── */
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  /* ── Face entry ── */
  const handleFaceChange = useCallback((index: number, value: string) => {
    setFaces(prev => {
      const next = [...prev]
      while (next.length <= index) next.push('')
      next[index] = value
      return next
    })
  }, [])

  /* ── Commit ── */
  const handleCommit = useCallback(() => {
    const boxes = boxCount(dieType, advantage)
    const [lo, hi] = faceRange(dieType, quantity)
    const parsed = faces.slice(0, boxes).map(f => Number.parseInt(f, 10))

    if (parsed.length !== boxes) return
    if (!parsed.every(n => Number.isFinite(n) && n >= lo && n <= hi)) return

    const kept = keptFace(parsed, advantage)
    captureIdRef.current += 1

    const capture: Capture = {
      id: captureIdRef.current,
      dieType,
      quantity,
      modifier,
      advantage,
      faces: parsed,
      kept,
      total: kept + modifier,
      label,
    }

    setLastCapture(capture)
    setHistory(prev => [capture, ...prev].slice(0, MAX_HISTORY))
    setFaces([''])
  }, [dieType, quantity, modifier, advantage, faces, label])

  /* ── Quick Preset Handler ── */
  const handleQuickPreset = useCallback(
    (preset: QuickPreset) => {
      reshape({
        dieType: preset.dieType,
        quantity: preset.quantity,
        modifier: preset.modifier,
        advantage: 'normal',
        label: null,
      })
    },
    [reshape],
  )

  /* ── Die Type Change Handler ── */
  const handleDieTypeChange = useCallback(
    (die: DieType) => {
      // Advantage is a d20 concept. Leaving it set on a d8 would put a second
      // number box on a roll that has no second die.
      reshape({ dieType: die, advantage: die === 20 ? undefined : 'normal', label: null })
    },
    [reshape],
  )

  /* ── Render ── */

  // Body scroll lock when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-forge',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panel ── */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Roll capture"
        tabIndex={-1}
        initial={false}
        animate={isOpen ? { y: 0 } : { y: '100%' }}
        transition={isOpen ? SPRING_SETTLE : SHEET_EXIT}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[90dvh] overflow-y-auto overscroll-contain',
          'glass-card rounded-t-2xl border-b-0',
          'outline-none',
          !isOpen && 'pointer-events-none',
        )}
      >
        <DragHandle />

        {/* Close button */}
        <div className="flex justify-end px-4 pb-1">
          <button
            type="button"
            aria-label="Close roll capture"
            onClick={onClose}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl',
              'text-forge-2 hover:text-forge-0 hover:bg-gold/[0.06]',
              'transition-all duration-200 ease-forge',
              'active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-6 safe-bottom flex flex-col gap-5">
          <OrnateHeader>Your Roll</OrnateHeader>

          {/* ── The capture strip, first thing under the header ──
              It is the reason the panel opens. Everything below it is the
              setup for it, and setup does not go above the thing it sets up. */}
          <div className="flex flex-col gap-1.5">
            {label && (
              <Badge variant="arcane" className="self-start text-sm px-3 py-1">
                {label}
              </Badge>
            )}
            <CaptureStrip
              dieType={dieType}
              quantity={quantity}
              modifier={modifier}
              advantage={advantage}
              faces={faces}
              onFaceChange={handleFaceChange}
              onCommit={handleCommit}
              firstFaceRef={firstFaceRef}
            />
          </div>

          {/* ── Last logged roll ── */}
          {lastCapture && (
            <GlassCard className="animate-slide-up">
              <CaptureResult capture={lastCapture} />
            </GlassCard>
          )}

          {/* ── Quick shapes ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1 select-none">Quick Set</span>
            <div className="flex gap-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={`Set up ${preset.label}`}
                  onClick={() => handleQuickPreset(preset)}
                  className={cn(
                    'flex-1 min-h-[44px] px-3 rounded-xl',
                    'font-mono text-sm font-semibold',
                    'bg-eldritch/10 text-eldritch-lit border border-eldritch/25',
                    'transition-all duration-200 ease-forge',
                    'hover:bg-eldritch/20 hover:border-eldritch/40',
                    'active:scale-95',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Character Presets (only when character is provided) ── */}
          {character && (
            <CharacterPresets
              character={character}
              onPick={(d, q, m, a, name) =>
                reshape({ dieType: d, quantity: q, modifier: m, advantage: a, label: name })
              }
            />
          )}

          {/* ── Die Type Selector ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1 select-none">Die Type</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {DIE_TYPES.map((die) => (
                <DieButton
                  key={die}
                  die={die}
                  selected={dieType === die}
                  onSelect={handleDieTypeChange}
                />
              ))}
            </div>
          </div>

          {/* ── Quantity & Modifier Row ── */}
          <div className="grid grid-cols-2 gap-4">
            <StepperControl
              label="Number of dice"
              value={quantity}
              min={MIN_QUANTITY}
              max={MAX_QUANTITY}
              onChange={(v) => reshape({ quantity: v })}
            />
            <StepperControl
              label="Modifier"
              value={modifier}
              min={MIN_MODIFIER}
              max={MAX_MODIFIER}
              onChange={(v) => reshape({ modifier: v })}
              formatValue={(v) => (v >= 0 ? `+${v}` : `${v}`)}
            />
          </div>

          {/* ── Advantage/Disadvantage Toggle (d20 only) ── */}
          {dieType === 20 && (
            <div className="animate-fade-in">
              <AdvantageToggle
                value={advantage}
                onChange={(v) => reshape({ advantage: v })}
              />
            </div>
          )}

          {/* ── History ── */}
          {history.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-forge-2 select-none">
                Recent Rolls
              </span>
              <div className="flex flex-col gap-1">
                {history.map((capture) => (
                  <HistoryCard key={capture.id} capture={capture} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
