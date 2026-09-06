import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Character } from '../../lib/character'
import { expendSpellSlot, restoreSpellSlot } from '../../lib/character'
import { findPool, setPoolCurrent } from '../../lib/rules-2024/resources'
import { CombatProvider, useCombat } from './CombatProvider'
import { TurnScreenD } from './TurnScreenD'
import { TurnRail, TurnVerbs } from './TurnRail'
import { QuickLookup } from '../combat/QuickLookup'
import { OptionDetailSheetLive } from '../combat/OptionDetailSheetLive'
import { RetaliationCapture } from '../combat/RetaliationCapture'
import { SheetRuleFlags } from '../combat/SheetRuleFlags'
import { BAND_ORDER, type BandSlot } from '../../lib/turn/bands'
import { useCollapsible } from '../../hooks/useCollapsible'
import { VitalsControls } from './VitalsControls'
import { FightingStyleGap } from './FightingStyleGap'
import { ContentionNote, groupForSlot } from './ContentionNote'
import { AttackTally, SwingAgain, midAttack } from './AttackTally'
import { isWeaponAttack } from '../../lib/rules-2024/attacks'
import type { TurnOption } from '../../lib/turn/types'
import { featureByName } from '../../lib/canon/lookup'
import { featureContextOf } from '../../lib/turn/overlay'
import { retaliationOf, tallyOf } from '../../lib/turn/retaliation'
import { loadRulings, saveRulings, setRuling, type ErratumRulings, type RulingStatus } from '../../lib/errata-rulings'
import { CombatExtras } from '../CombatHelper'
import { shouldAskFightingStyle, toggleFightingStyle } from '../../lib/prepare/fighting-style'
import type { CanonFeat } from '../../lib/canon/types'

/* ============================================================================
   TurnLive — the join, and deliberately the smallest file in the slice.
   ----------------------------------------------------------------------------
   TurnScreenD stays presentational and CombatProvider stays headless. This is
   the only place that knows they belong together, which is what keeps the
   screen shootable in isolation and the reducer testable without a DOM.
   ========================================================================== */

/** Which bands are expanded, persisted per character in `codex-ui-<id>` — the
 *  same store, and the same hook, every other fold on this tab already uses.
 *
 *  FOUR CALLS, WRITTEN OUT. A hook inside a loop is only safe while the loop's
 *  length can never change, and nothing in the code says BAND_ORDER's must not.
 *  Four lines is a cheap price for that never being able to become a bug.
 *
 *  All four default OPEN. The fault this phase exists to remove is that things
 *  Marcus owns were behind a fold he had to find; shipping the bands collapsed
 *  would rebuild that fault with better typography. */
function useBandFolds(characterId: string) {
  const folds: Record<BandSlot, ReturnType<typeof useCollapsible>> = {
    action: useCollapsible('band:action', characterId, true),
    bonusAction: useCollapsible('band:bonusAction', characterId, true),
    reaction: useCollapsible('band:reaction', characterId, true),
    movement: useCollapsible('band:movement', characterId, true),
    // The fifth band appears only if the engine ever prices something at
    // nothing (see bands.ts). It gets a fold like the rest so that it is not a
    // special case on the screen the day it does appear.
    free: useCollapsible('band:free', characterId, true),
  }
  const open: Record<string, boolean> = {}
  for (const slot of [...BAND_ORDER, 'free' as BandSlot]) open[slot] = folds[slot].isOpen
  return { open, toggle: (slot: BandSlot) => folds[slot]?.toggle() }
}

function Screen({
  character,
  onCharacterUpdate,
  onOpenDiceRoller,
}: {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}) {
  const combat = useCombat()
  const bands = useBandFolds(character.id)
  /* The look-up panel is mounted HERE and not by the rail, because a component
     whose whole job is chrome should not own a modal. `CombatHelper` holds it
     exactly this way for the legacy tab (`CombatHelper.tsx:1048,1504`). */
  const [lookupOpen, setLookupOpen] = useState(false)

  /* ── SLICE 5: THE ROW OPENS, THE SHEET SPENDS ───────────────────────────
     Which option is open is state HERE and not in `TurnScreenD`, for the same
     reason the look-up panel is: the screen is presentational and must stay
     renderable by `renderToStaticMarkup` with no provider under it. Null is
     the closed state — there is no second boolean beside it that could
     disagree. `CombatHelper` holds the identical pair (`:1040`). */
  const [openOption, setOpenOption] = useState<TurnOption | null>(null)

  /* ── SLICE R7: IS THE END-COMBAT CONFIRM SHOWING? ───────────────────────
     Here rather than in `TurnVerbs` for the same law that made `bandsOpen` a
     prop: `TurnScreenD` holds no state, and the verb row reaches it through the
     opaque `verbs` seam. Giving the one destructive control in this tab private
     state would put it outside the only component allowed to own any. It also
     has to be cleared when the fight ends by any other route, and this is the
     only place that can see that happen — which is what the effect below is. */
  const [endArmed, setEndArmed] = useState(false)

  /* The DM's answers to canon's twelve rules problems, read once per character.
     The SAME map the Rules flags band writes, so a ruling recorded on the
     legacy tab is the ruling this tab's sheet reports — one fact, one store.
     Read in an effect rather than in a `useState` initialiser because this
     component renders in the node suite, where there is no `localStorage`. */
  const [rulings, setRulings] = useState<ErratumRulings>({})
  useEffect(() => setRulings(loadRulings(character.id)), [character.id])

  /* Least-confident decision 3 in the R7 design, answered rather than left
     open. `EndCombatDoor` only reads `armed` inside the in-combat branch, so a
     stale flag is already harmless to LOOK at — but it would still be set the
     next time a fight starts, and he would meet an armed confirm he never
     asked for. Anything that leaves combat clears it, including routes this
     slice does not know about: the condition is the fight, not the button. */
  useEffect(() => {
    if (!combat.inCombat) setEndArmed(false)
  }, [combat.inCombat])

  /* ── THE WRITER CAME UP HERE IN 8b, AND HAD TO ──────────────────────────
     This function was `handleRule` in `CombatHelper`, beside a second
     `loadRulings` of its own. That was defensible while the errata band and
     this screen were two tabs. They are one tab now — `CombatExtras` renders
     inside D's scroller — so two readers of `codex-errata-${id}` in one paint
     is precisely finding-10b's shape: the band would record a ruling into its
     copy and the option sheet, three hundred pixels above, would keep
     reporting the old one until something forced it to re-read.

     So the store is read once, here, and handed DOWN to both — the sheet as
     `rulings`, the band as `rulings` + `onRule`. One fact, one store, one
     reader.

     `next` is computed OUTSIDE the state updater on purpose: an updater is a
     function React is entitled to call twice, and a double call here would be
     a double write of the same bytes — harmless today, and exactly the shape
     of the bug that is not harmless later. */
  const handleRule = useCallback(
    (erratumId: string, status: RulingStatus, dmWording?: string) => {
      const next = setRuling(rulings, erratumId, status, dmWording, new Date())
      setRulings(next)
      saveRulings(character.id, next)
    },
    [rulings, character.id]
  )

  /* ── SLICE 5: ITEM 7, UNDER THE ROW IT BELONGS TO ────────────────────────
     "i dont think the hearthfire manifest reaction (retaliation with fire
     damage) is working?"

     It works — `VitalsControls` has offered it since slice 3 — but only after
     he logs damage AND only while the cloak is up, so on every turn he took a
     hit with the cloak down there was nothing on screen saying the feature
     existed. That is indistinguishable from broken. This is the standing half:
     the button lives on the reaction's own row, always, whether or not the
     cloak is up and whether or not anything prompted him.

     BY SHAPE, NEVER BY NAME. Nothing here says "Hearthfire Manifest". A row
     gets the control when canon marks one of its facts `free` and `dice` —
     `retaliationOf`'s two conditions — so Opportunity Attack's `1d8+4` gets
     nothing (its die is the price of the hit, not a free rider), and a
     homebrew feature that grows such a fact tomorrow gets the button with no
     code change. The lookup is memoised on the ONE thing that can change the
     answer: which character's sheet is loaded. */
  const retaliations = useMemo(() => {
    const ctx = featureContextOf(character)
    const cache = new Map<string, ReturnType<typeof retaliationOf>>()
    return (name: string) => {
      if (!cache.has(name)) cache.set(name, retaliationOf(featureByName(name), ctx))
      return cache.get(name) ?? null
    }
  }, [character])

  /* THE LAST ENTRY, AND ONLY IF IT IS A RETALIATION. `undoLast` undoes the
     last entry of ANY kind, so a generic Undo beside the fire total would take
     back a spell slot while appearing to take back a hit. Decided by event
     SHAPE and never by searching the label for the word — see
     `ReactionsBandLive`, which reaches the same answer the same way. */
  const undoable = combat.undoEntry?.event.type === 'retaliate' ? combat.undoEntry : null

  const rowExtra = (option: TurnOption) => {
    /* ── SLICE R6: THE SECOND SWING, OFFERED ON THE ROW THAT TAKES IT ───────
       "It also doesnt allow me to take my two mele attacks."

       R5 made it allow him and told him nothing: the weapon row mid-Attack is
       byte-identical to the weapon row before he swung, so the one row he needs
       is the only one on the screen that has not changed. This is the sentence
       that changes it.

       `isWeaponAttack` is the SAME predicate the reducer prices the spend with
       (`reduce.ts`, via `rules-2024/attacks.ts`), so the row that offers a
       second swing is exactly the row the reducer will accept. Deciding it here
       from `option.kind` and the slot by hand would be a second definition of
       "weapon attack", and the two would eventually disagree about a homebrew
       reaction attack — which is precisely the case the predicate exists for.

       `midAttack` IS ASKED HERE, BEFORE THE NODE IS BUILT, and that is
       load-bearing. `Act` chooses between two different markups on the
       truthiness of `extra` (`TurnRow.tsx:105`), and an element that renders
       null is still a truthy element — handing over `<SwingAgain/>`
       unconditionally would put a permanent empty box with a hairline under
       every weapon attack in the app, on every turn. `AttackTally.test.tsx`
       holds that fault as a test so it cannot be tidied back in. */
    if (isWeaponAttack(option) && midAttack(combat.turn.attack)) {
      return <SwingAgain attack={combat.turn.attack} />
    }

    /* THE REACTION ROW, AND ONLY THE REACTION ROW — measured, not assumed.
       Probing NIX's fourteen options for a free die returned TWO: the bonus
       action "Hearthfire Manifest", which puts the cloak up, and the reaction
       "Flaming Cloak", which is the cloak burning whoever hit him. They share
       one canon feature, so `retaliationOf` says yes to both and the button
       would have painted twice — one thing in two places, which is item 6's
       fault rebuilt inside the fix for item 7.

       The gate is a SHAPE and not a name. A retaliation fires on the world
       doing something to you; the thing it costs is your Reaction. Spending
       the bonus action deals no fire damage at all, so a capture on that row
       would be wrong on the merits before it was ever a duplicate.
       `reactionRows` filters on this exact predicate before asking the same
       question (reactions.ts:192), so the two surfaces agree by construction
       rather than by coincidence. */
    if (option.cost.slot !== 'reaction') return null
    const die = retaliations(option.name)
    if (!die) return null
    return (
      <RetaliationCapture
        die={die}
        offer="button"
        onRecord={combat.retaliate}
        tally={tallyOf(combat.combat)}
        refusal={combat.refusal}
        onUndo={undoable ? combat.undoLast : undefined}
        undoLabel={undoable?.label ?? null}
      />
    )
  }

  /* ── SLICE 6: THE QUESTION NOBODY EVER ASKED (item 8) ────────────────────
     "in the combat tab, it doesnt seem to have all of my available reactions
     available. I should have the hearthfire manifest, sentinal, and
     interception."

     MEASURED FIRST. `prove-slice6.mjs` seeded his real export twice — once as
     he exports it, once with Interception written exactly as `fightingStyleFeat`
     writes it — and the Reaction band went from four painted rows to five, with
     Interception's own trigger text, with nothing else on the screen changing.
     So the engine, the picker and the write path were all already whole. The
     only missing piece was the ASKING.

     WHETHER TO ASK IS A FACT ABOUT THE SHEET, so it is decided in
     `prepare/fighting-style.ts` beside every other rule about styles — three
     gates: does his class grant the choice, has he reached it, has he answered
     it. Nothing here decides what a Fighting Style IS. Memoised on the one
     thing that can change the answer, because the first gate walks the whole
     catalogue. */
  const askForStyle = useMemo(() => shouldAskFightingStyle(character), [character])

  /* THE ONE WRITER, HANDED DOWN. Byte-for-byte what `GrimoirePage` does with
     the same pick (`:245-247`) — because it IS the same pick, and a second way
     to record a style is a second thing that can record it differently. */
  const handlePickStyle = (style: CanonFeat) =>
    onCharacterUpdate(toggleFightingStyle(character, style))

  /* THE REACTION BAND, AND ONLY IT. Interception costs a Reaction; a note about
     a missing reaction hanging under Action would be furniture. */
  const bandNote = (slot: BandSlot) =>
    slot === 'reaction' && askForStyle ? (
      <FightingStyleGap character={character} onPick={handlePickStyle} />
    ) : null

  /* THE CONTENTION SENTENCE — slice R3, and the last of the bracket.
     Returns null for every band with no live contention, which on Nix's sheet
     is three of the four. `groupForSlot` and the wording both live beside the
     rule that computes `reason`; this line only says WHERE. */
  const contention = (slot: BandSlot) => (
    <ContentionNote group={groupForSlot(combat.turn.mutex, slot)} />
  )

  /* THE ATTACK TALLY — slice R6, and the half of it that survives collapsing the
     band. Extra Attack is a rule about the ACTION, so no other band is asked:
     a "1 of 2 used" hanging under Bonus would be furniture at best and a wrong
     rule at worst. `AttackTally` returns null for everyone whose Attack action
     contains one swing, which is most characters and every martial below level
     5, so their header is what it was before this slice to the byte. */
  const headNote = (slot: BandSlot) =>
    slot === 'action' ? <AttackTally attack={combat.turn.attack} /> : null

  /* ── THE RAIL'S WRITES ──────────────────────────────────────────────────
     Slots and pools are the CHARACTER's, so they go through `onCharacterUpdate`
     — `useCharacter`'s `setCharacter`, the sheet's one and only writer. The
     economy is the ENCOUNTER's, so it goes through `updateCombat`. Getting
     that boundary wrong is how a sheet ends up with two writers, which is the
     bug class V0.9 spent a year on.

     These are the deck's manual override, not the reducer's spend path: a row
     tapped in the list goes through `combat.take` and is undoable, while a pip
     pressed here is Marcus correcting the count by hand — the same thing the
     deck's pips have always been, and the reason they answer to right-click. */
  const handleExpendSlot = (level: number) => onCharacterUpdate(expendSpellSlot(character, level))
  const handleRestoreSlot = (level: number) => onCharacterUpdate(restoreSpellSlot(character, level))
  const handleSpendResource = (poolId: string, amount: number) => {
    const pool = findPool(character, poolId)
    /* A pool that is gone is not an error and not a throw — the sheet may have
       been edited in another tab between paint and press. `setPoolCurrent`
       clamps to [0, max] and returns the character unchanged when there is
       nothing to write, so a negative `amount` restores by the same one path
       that spends. */
    if (!pool) return
    onCharacterUpdate(setPoolCurrent(character, poolId, pool.current - amount))
  }
  const handleReset = () =>
    combat.updateCombat(prev => ({
      ...prev,
      turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
    }))

  /* THE FOUR SLOTS, BY HAND — slice 8d-1, and the same override as the pips
     above rather than a fifth kind of write. It goes through `updateCombat` and
     NOT through `combat.take`, deliberately: `take` is the reducer, and the
     reducer can refuse. Refusing is right for a row — the app knows Divine
     Smite needs a slot and can say so — but it is wrong here, because the whole
     reason this control exists is the things the app has NO row for. Marcus
     shoved someone. His action is gone. An app that argues with him about that
     is an app he stops opening at the table. */
  const handleToggleEconomy = (key: 'action' | 'bonusAction' | 'reaction' | 'movement') =>
    combat.updateCombat(prev => ({
      ...prev,
      turnActions: { ...prev.turnActions, [key]: !prev.turnActions[key] },
    }))

  return (
    <>
    <TurnScreenD
      turn={combat.turn}
      /* THE PRESS OPENS; THE SHEET SPENDS. This was `onTake={combat.take}`
         until slice 5, which meant one tap on "Divine Smite" burned a 2nd
         level slot with nothing on screen first saying what it cost or what it
         did. The deck never behaved that way and the legacy tab never has
         either — both open `OptionDetailSheet` — so D was the odd one out, and
         it was the one Marcus is meant to keep. Putting `combat.take` back on
         this line is this slice's declared revert. */
      onOpen={setOpenOption}
      /* ITEM 7. Returns null for all but the reactions canon gives a free die;
         see `rowExtra` above for why that is a shape and not a name. */
      rowExtra={rowExtra}
      /* ITEM 8. Returns null for every band but Reaction, and null for that one
         too the moment he has answered. Delete this one line and the bands are
         exactly what slice 5 shipped — this slice's declared revert. */
      bandNote={bandNote}
      /* SLICE R3. Returns null for every band with no live contention. Delete
         this one line and the claim is back to living only on the rows — which
         is this slice's declared revert. */
      contention={contention}
      /* SLICE R6. Returns null for every band but Action, and null for that one
         too on any sheet whose Attack action contains one swing. Delete this one
         line and the held action is invisible again — which is this slice's
         declared revert. */
      headNote={headNote}
      onToggleEconomy={handleToggleEconomy}
      onEndTurn={combat.endTurn}
      onBeginTurn={combat.beginTurn}
      onUndo={combat.undoLast}
      undoLabel={combat.undoLabel}
      refusal={combat.refusal}
      onDismissRefusal={combat.dismissRefusal}
      /* THE BANDS, and the whole of this slice's wiring. Delete this one line
         and the screen falls back to the flat "Your turn / Everything else"
         list, unchanged — which is this slice's pre-declared revert. */
      bandsOpen={bands.open}
      onToggleBand={bands.toggle}
      /* HIS BODY — slice 3, and the whole of its wiring. Delete this one line
         and the card is read-only again, exactly as it was.

         `combat.retaliate` is handed over here rather than in slice 5 because
         the tracker ALREADY owns the behaviour item 7 describes — "when I have
         hearthfire manifest up, and i input damage i just took into the damage
         feature, it will pop up with a retaliation option". Passing it now is
         what makes that true on this screen; slice 5 adds the second entry
         point, on the reaction's own row. */
      vitalsControls={
        <VitalsControls
          character={character}
          onCharacterUpdate={onCharacterUpdate}
          onRetaliate={combat.retaliate}
          refusal={combat.refusal}
        />
      }
      /* THE RAIL — slice 4, and the whole of its wiring. Delete this one prop
         and the read-only `.res` strip comes back in colC, unchanged, because
         `TurnScreenD` renders one or the other and never both. That is this
         slice's declared revert.

         `startEncounter` / `endEncounter` close finding BH: they have existed
         on `CombatApi` since table-truth and until this line nothing had ever
         called either of them. */
      rail={
        <>
          <TurnRail
            spellSlots={combat.turn.spellSlots}
            resources={combat.turn.resources}
            onExpendSlot={handleExpendSlot}
            onRestoreSlot={handleRestoreSlot}
            onSpendResource={handleSpendResource}
          />
          {/* ── THE SHEET-VS-2024 FLAG — slice 9, and the whole of its wiring ──
              A label belongs ON the thing it labels. `TurnRail` paints the nine
              spell-slot dots; this flag exists to say those dots disagree with
              the 2024 table. Until this line it lived in the extras block, and
              measured on his export at 390×844 the notice and the dots were
              **2,430px apart** (`_diag9.mjs`) — a complaint about spell slots
              filed four screens from the spell slots.

              It is EXTRACTED from `VitalsBand`, not copied: that band now
              renders five numbers and nothing else, so one disagreement is
              still reported by exactly one surface. Two would be item 6 rebuilt
              by the slice meant to close it.

              `onCharacterUpdate` is the same write path `VitalsBand` was handed
              — the door is unchanged, only its address is.

              Revert: delete this element and put the flags block back in
              `VitalsBand` (see that file's header). */}
          <SheetRuleFlags character={character} onAdopt={onCharacterUpdate} />
        </>
      }
      /* THE VERBS — slice 7. The SAME row slice 4 shipped, moved out of the
         pinned strip and into the scroller, because none of these three spends
         anything and V-6 only pins what does. It is a separate prop rather than
         a flag on `TurnRail` so that "where this row lives" is one line at one
         call site: delete it and the verbs are gone from the screen, move it
         back into `rail` and they are beside the pips again. */
      verbs={
        <TurnVerbs
          onLookup={() => setLookupOpen(true)}
          onReset={handleReset}
          inCombat={combat.inCombat}
          onStartCombat={combat.startEncounter}
          /* SLICE R7 — TWO TAPS, BECAUSE ENDING IS NOT UNDOABLE. This prop used
             to be the button's own `onClick`. Measured on his export
             2026-09-05, one tap took `inCombat true -> false` and `round 3 ->
             1` and rewrote `codex-combat-<id>` with nothing asked. It is now
             reached only by the confirm strip's second door, and it clears the
             flag on the way through so the strip is never left armed. */
          endArmed={endArmed}
          onArmEndCombat={() => setEndArmed(true)}
          onCancelEndCombat={() => setEndArmed(false)}
          onEndCombat={() => {
            setEndArmed(false)
            combat.endEncounter()
          }}
        />
      }
      /* ── THE REST OF THE SESSION — slice 8b, and the whole of item 6 ───────
         `CombatExtras` is what is left of the combat tab after D took over the
         turn: the damage log, the AI advisor, rest, persona, the basic-actions
         reference, the errata band, concentration. It is passed as an OPAQUE
         `ReactNode` and rendered inside `.body`, D's only scroller, below the
         list.

         WHY INSIDE THE SCROLLER AND NOT BESIDE IT. `TurnScreenD` is
         `height: 100dvh` with `.body` as the one thing that scrolls. Anything
         mounted as a sibling would be below the fold of a page that does not
         have a fold — unreachable, not merely awkward. That is not a
         preference this slice made; it is what D's layout leaves available,
         which is why 00-status records it as "forced, not chosen".

         It gets `rulings` and `onRule` rather than reading the store itself —
         see `handleRule` above for why that is the difference between one
         answer and two. */
      extras={
        <CombatExtras
          character={character}
          onCharacterUpdate={onCharacterUpdate}
          onOpenDiceRoller={onOpenDiceRoller}
          rulings={rulings}
          onRule={handleRule}
        />
      }
    />
    {/* MOUNTED BESIDE THE SCREEN, NOT INSIDE IT — the same seat `QuickLookup`
        has, and for the same reason: `TurnScreenD` is presentational and a
        component that renders a portal into `document.body` is not. It is the
        SAME wrapper the legacy tab mounts (`CombatHelper.tsx`), imported
        rather than copied, so the two tabs cannot drift on what a spend
        does. */}
    {/* `onRollDice` on both of these is new in 8b, and it is not a feature —
        it is a feature that stops being lost. The legacy tab handed
        `onOpenDiceRoller` to both overlays; this tab mounted them without it,
        so until now every "roll this" affordance inside a detail sheet or a
        look-up was dead on D. Restoring it is what makes 8b a move rather than
        a trade. */}
    <OptionDetailSheetLive
      option={openOption}
      character={character}
      onClose={() => setOpenOption(null)}
      onRollDice={onOpenDiceRoller}
      rulings={rulings}
    />
    <QuickLookup
      isOpen={lookupOpen}
      onClose={() => setLookupOpen(false)}
      character={character}
      onRollDice={onOpenDiceRoller}
    />
    </>
  )
}

export interface TurnLiveProps {
  character: Character
  /** useCharacter's `setCharacter`. The sheet's one and only writer. */
  onCharacterUpdate: (character: Character) => void
  /** Opens the app-level dice roller with a notation pre-filled. Threaded from
   *  `App` through to the extras, the detail sheet and the look-up panel — the
   *  three surfaces that offer "roll this". */
  onOpenDiceRoller?: (prefill: { notation: string; label: string }) => void
}

export function TurnLive({ character, onCharacterUpdate, onOpenDiceRoller }: TurnLiveProps) {
  return (
    // `key` and not an effect: switching characters REMOUNTS the provider so
    // it re-reads that character's own encounter from storage. An effect that
    // watched the id would, for one render, hold Nix's spent slots over
    // somebody else's sheet — and that render is the one that persists.
    //
    // THIS IS NOW THE ONLY `CombatProvider` ON THE COMBAT TAB. It was one of
    // four until 8b — this one, plus `CombatHelper`'s own wrapper, plus the two
    // the preview branch mounted — and four providers is four `useState`
    // copies of `codex-combat-${id}` over one disk key. Slice 8c pins the count
    // at one as a test rather than leaving it as a property of today's tree.
    <CombatProvider key={character.id} character={character} onCharacterUpdate={onCharacterUpdate}>
      <Screen
        character={character}
        onCharacterUpdate={onCharacterUpdate}
        onOpenDiceRoller={onOpenDiceRoller}
      />
    </CombatProvider>
  )
}

export default TurnLive
