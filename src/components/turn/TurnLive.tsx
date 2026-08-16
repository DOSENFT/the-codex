import type { Character } from '../../lib/character'
import { CombatProvider, useCombat } from './CombatProvider'
import { TurnScreenD } from './TurnScreenD'

/* ============================================================================
   TurnLive — the join, and deliberately the smallest file in the slice.
   ----------------------------------------------------------------------------
   TurnScreenD stays presentational and CombatProvider stays headless. This is
   the only place that knows they belong together, which is what keeps the
   screen shootable in isolation and the reducer testable without a DOM.
   ========================================================================== */

function Screen() {
  const combat = useCombat()
  return (
    <TurnScreenD
      turn={combat.turn}
      onTake={combat.take}
      onEndTurn={combat.endTurn}
      onUndo={combat.undoLast}
      undoLabel={combat.undoLabel}
      refusal={combat.refusal}
      onDismissRefusal={combat.dismissRefusal}
    />
  )
}

export interface TurnLiveProps {
  character: Character
  /** useCharacter's `setCharacter`. The sheet's one and only writer. */
  onCharacterUpdate: (character: Character) => void
}

export function TurnLive({ character, onCharacterUpdate }: TurnLiveProps) {
  return (
    // `key` and not an effect: switching characters REMOUNTS the provider so
    // it re-reads that character's own encounter from storage. An effect that
    // watched the id would, for one render, hold Nix's spent slots over
    // somebody else's sheet — and that render is the one that persists.
    <CombatProvider key={character.id} character={character} onCharacterUpdate={onCharacterUpdate}>
      <Screen />
    </CombatProvider>
  )
}

export default TurnLive
