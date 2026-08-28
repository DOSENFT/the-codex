/* Feats reach the turn engine.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * Marcus sent his real character sheet on 2026-08-27 and said, of the combat
 * screen: "I have Sentinel and interception". The app showed neither. Measured,
 * the cause was not a ranking bug or a missing row — it was that
 * **`character.feats` was read by NOTHING**: zero references across
 * `src/lib/turn/` and `src/lib/canon/`. `options.ts` built the turn out of
 * weapons, spells and features, and a feat could not become an option no matter
 * what it said. That is finding AT with two names on it.
 *
 * It matters because both of his are REACTIONS, and a reaction you forget you
 * have is a reaction you never take. Canon's own note on Interception: at
 * Proficiency Bonus +3 it averages "about 8.5 damage prevented per round", for
 * free, every round.
 *
 * ── THE RULE THIS FILE IS BUILT ON ──────────────────────────────────────────
 * **Recognise SHAPE, never a name.** The open-world rule, and here it has teeth,
 * because the tempting implementation is four lines long and matches "Sentinel"
 * and "Interception". That version works for exactly two feats and silently
 * fails for the other 74 in canon, for every homebrew feat Marcus ever writes,
 * and for every feat published after today.
 *
 * The handle is 2024's own cost phrasing. The rules define a Reaction as
 * something you *take*, and every feat that costs one says so in the effect
 * sentence itself: "you can take a Reaction to reduce that damage", "you can
 * take an Opportunity Attack against it". So the shape is the COST PHRASE, and
 * a feat is a reaction because of what it costs — which is what a reaction IS.
 *
 * ── ONE ROW PER EFFECT, NOT PER FEAT ────────────────────────────────────────
 * Sentinel carries two reaction effects with two DIFFERENT triggers (a creature
 * Disengages; a creature attacks someone other than you) and one passive rider
 * (Speed 0 on an Opportunity Attack hit). Marcus's question was "what does it do
 * and when can I use it" — collapsing two triggers into one row answers the
 * second half wrongly, and dropping one loses a reaction he owns. So each
 * reaction-shaped effect becomes its own option, and the passive rider becomes
 * none, because it costs nothing and is not a thing you choose to do.
 *
 * ── NO NEW TRIGGER CODE ─────────────────────────────────────────────────────
 * `triggerFor` already lifts a leading "When…"/"If…" clause off the FIRST
 * segment of an option's detail and leaves the remainder as the body. Canon
 * writes feat effects trigger-first. So this module's whole job at the end is to
 * cut each sentence at its own trigger boundary and hand the two halves over as
 * `mechanicsLine` and `effectsLine` — the row, the detail sheet, the "WHEN"
 * label and `whenSource: 'declared'` all follow with nothing else written.
 *
 * ── WHERE THIS PLUGS IN, AND WHY NOT THE OBVIOUS PLACE ──────────────────────
 * The obvious place is `options.ts`, beside the weapons/spells/features loops —
 * and slice 10e wired it there first, ran the suite, and was told no by a test
 * written four slices earlier. `options.ts` is pinned BYTE-IDENTICAL to the
 * code that shipped inside TurnSummary.tsx (overlay.test.ts case 15), because
 * its whole value is being an exact characterization record of the V0.9 screen.
 * Slice 6 hit the same wall synthesising the Opportunity Attack and wrote the
 * ruling down at compose.ts:389 — "the composer is the layer that is allowed to
 * know about the action economy, so it is the layer that gets to know about
 * reactions". This module follows that ruling rather than overturning it, and
 * the reward is that Opportunity Attack and these rows now arrive by the same
 * road.
 *
 * These are still `ActionOption`s: `compose.ts` splices them into the sheet's
 * reaction bucket BEFORE the canon overlay runs, so they inherit the overlay,
 * ranking, contention, the reactions band, the detail sheet and 10c's spend
 * without a line of new wiring in any of them.
 *
 * Table Truth slice 10e.
 */
import type { Character, CharacterFeat } from '../character'
import { featByName } from '../canon/lookup'
import type { CanonFeat } from '../canon/types'
import type { ActionOption } from './options'

/** 2024's cost phrasing for a Reaction, in the forms canon actually writes.
 *
 *  Deliberately NOT a match on the bare word "Reaction". Plenty of feats mention
 *  reactions without costing one, and a feat that takes a reaction away from
 *  somebody else is not a reaction you can take. The VERB is what carries the
 *  cost, so the verb is what is matched. */
const REACTION_COST =
  /\b(?:take|takes|taking|use|uses|using|spend|spends|expend|expends)\s+(?:a|an|your|its|their|one)\s+(?:reaction|opportunity\s+attack)\b|\bas\s+a\s+reaction\b/i

/** …and the shapes that mention a Reaction while COSTING you nothing.
 *
 *  Checked after the cost phrase and able to veto it, because English puts the
 *  negation before the verb: "the target can't take a Reaction until…" matches
 *  REACTION_COST on its tail. Without this veto, a feat that DENIES reactions
 *  gets offered as one — the app inviting Marcus to spend a reaction on taking
 *  reactions away.
 *
 *  The verb list mirrors REACTION_COST's, GERUNDS INCLUDED, and that is not
 *  tidiness — it is a bug this slice's own tests caught. "This prevents the
 *  target from TAKING a Reaction" matched the cost phrase (which already knew
 *  about "taking") and slipped past a veto that only knew about "take". The two
 *  lists have to move together or the veto is narrower than the thing it vetoes. */
const NOT_YOURS =
  /\b(?:can(?:no|')?t|cannot|unable to|prevents?|prevented|denies?|no longer)\b[^.]*\b(?:take|takes|taking|use|uses|using|spend|spends|spending|expend|expends|expending)\s+(?:a|an|your|its|their|one)\s+(?:reaction|opportunity\s+attack)\b/i

/** Does this sentence describe something that costs YOU a Reaction? */
export function isReactionShaped(effect: string): boolean {
  if (!effect) return false
  if (NOT_YOURS.test(effect)) return false
  return REACTION_COST.test(effect)
}

/** The sentences to read a feat's reactions out of.
 *
 *  THE SHEET WINS WHEN IT HAS WORDS. This is the open-world rule's other half
 *  and it is not politeness: a homebrew feat named "Sentinel" that does
 *  something else entirely must keep its own text, or the app hands Marcus the
 *  published feat's rules under his own feat's name — confident, and wrong.
 *
 *  Canon fills a SILENCE, never overrides. Marcus's stored feats came through an
 *  importer that took whatever his export gave it, so `effects: []` beside a
 *  one-line description is the common case — and that case is exactly where
 *  canon's full text is the difference between a usable row and a blank one. */
export function effectSentencesOf(feat: CharacterFeat, canon?: CanonFeat): string[] {
  const own = (feat.effects ?? []).map(e => e.trim()).filter(Boolean)
  if (own.length > 0) return own

  /* The description is a fallback for the fallback: some importers put the whole
     feat in one paragraph. Split on sentence ends so a trigger clause can still
     be found — a paragraph handed over whole would bury the trigger of every
     sentence after the first. Only used if it actually yields a reaction; a
     flavour paragraph must not shut canon out. */
  const described = (feat.description ?? '').trim()
  if (described) {
    const sentences = described
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(Boolean)
    if (sentences.some(isReactionShaped)) return sentences
  }

  return (canon?.effects ?? []).map(e => e.trim()).filter(Boolean)
}

/** Cut a trigger-first sentence into its trigger and everything else.
 *
 *  Canon writes "When X, you can take a Reaction to Y." — one leading
 *  subordinate clause, one comma, the effect. The split is on that comma and
 *  ONLY on a sentence that opens with a trigger word; anything else comes back
 *  whole, with an empty trigger, and reads out downstream as `unstated`.
 *
 *  No words are added and none are dropped — the two halves rejoin to the
 *  original. That is pinned in the tests, because a splitter that quietly eats a
 *  clause is a splitter that edits a rule. */
export function splitTrigger(sentence: string): { trigger: string; effect: string } {
  const text = sentence.trim()
  if (!/^(?:when|if)\b/i.test(text)) return { trigger: '', effect: text }

  /* The LAST comma before the cost phrase, not the first. "When a creature you
     can see hits another creature within 5 feet of you with an attack, you can
     take a Reaction…" has one comma; but a trigger carrying its own aside —
     "When a creature, ally or enemy, moves past you, you can…" — has three, and
     cutting at the first would leave "ally or enemy, moves past you" reading as
     the effect. */
  const cost = REACTION_COST.exec(text)
  const limit = cost ? cost.index : text.length
  const head = text.slice(0, limit)
  const comma = head.lastIndexOf(', ')
  if (comma <= 0) return { trigger: '', effect: text }

  return {
    trigger: text.slice(0, comma),
    effect: text.slice(comma + 2).trim(),
  }
}

/** Every reaction a character's feats give them, as sheet-layer options.
 *
 *  Built at the `ActionOption` layer on purpose, not as finished `TurnOption`s:
 *  that is the one seam every other source already passes through, so these rows
 *  inherit the canon overlay, ranking, contention, the reactions band, the
 *  detail sheet and 10c's spend without a line of new wiring in any of them. */
export function featReactionOptions(character: Character): ActionOption[] {
  const out: ActionOption[] = []

  for (const feat of character.feats ?? []) {
    if (!feat?.name) continue
    const canon = featByName(feat.name)
    const sentences = effectSentencesOf(feat, canon)

    for (const sentence of sentences) {
      if (!isReactionShaped(sentence)) continue
      const { trigger, effect } = splitTrigger(sentence)
      out.push({
        name: feat.name,
        type: 'feature',
        actionEconomy: 'reaction',
        summary: effect || sentence,
        /* The trigger goes in `mechanicsLine` because that is the FIRST segment
           of the composed detail, and first is where `triggerFor` looks. This is
           the whole of the integration. */
        mechanicsLine: trigger,
        effectsLine: effect || sentence,
        strategicTip: feat.tacticalNote || undefined,
      })
    }
  }

  return out
}
