import { SpellSigil1 } from './SpellSigil1'
import { SpellSigil2 } from './SpellSigil2'
import { SpellSigil3 } from './SpellSigil3'
import { SpellSigil4 } from './SpellSigil4'
import { SpellSigil5 } from './SpellSigil5'
import { SpellSigil6 } from './SpellSigil6'
import { SpellSigil7 } from './SpellSigil7'
import { SpellSigil8 } from './SpellSigil8'
import { SpellSigil9 } from './SpellSigil9'
import type { ComponentType } from 'react'

export const SPELL_SIGILS: Record<number, ComponentType<{ className?: string }>> = {
  1: SpellSigil1,
  2: SpellSigil2,
  3: SpellSigil3,
  4: SpellSigil4,
  5: SpellSigil5,
  6: SpellSigil6,
  7: SpellSigil7,
  8: SpellSigil8,
  9: SpellSigil9,
}
