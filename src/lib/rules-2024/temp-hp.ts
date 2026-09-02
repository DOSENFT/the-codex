// ---------------------------------------------------------------------------
// Temporary Hit Points — the 2024 replacement rule, and canon's HEARTH-04
// ---------------------------------------------------------------------------
//
// THE RULE, and note that it is not the one the app's own comment claimed.
// `setTempHP`'s doc read "replaces, doesn't stack per 2024 rules", which is
// half right and the wrong half. 2024 temp HP does not stack — but the rule is
// not "the new pool wins". It is that YOU CHOOSE: keep the pool you have, or
// take the new one. A blind assignment picks for the player, always the same
// way, and picks wrong every time the incoming pool is smaller.
//
// Canon's HEARTH-04 is the same rule with a name on it. Nix's cloak "lasts
// until the Temporary Hit Points are depleted", so ANY other source of temp HP
// — Heroism, Inspiring Leader, a Chef's treat, Orc Adrenaline Rush — replaces
// the cloak's pool and by the feature's own wording ends the cloak. Canon rates
// it HIGH and asks for one thing:
//
//     "MANDATORY WARNING. If the cloak is active and the player gains
//      Temporary Hit Points from another source, the app must prompt."
//
// THE LAW OF THIS FILE: it decides, it never applies. Nothing here returns a
// modified character and nothing here prompts — a pure function cannot prompt,
// and a setter that silently refuses is worse than one that silently accepts.
// This module answers "would accepting this destroy something?", and the two
// surfaces that can ask a human (the HP tracker's temp field and the option
// detail sheet's Spend button) do the asking. One decision, two askers.
//
// WHY THAT SPLIT IS THE WHOLE DESIGN. Slice 10a pinned VAL-06 as VIOLATED and
// recorded why the fix could not be a one-line guard inside `setTempHP`: even a
// correct prompt has to know WHICH pool it is about to destroy, and nothing in
// the model recorded where a pool came from. That gap is closed by
// `Character.tempHPSource`, and this file is what reads it.
//
// SHAPE, NEVER A NAME. Nothing here mentions the cloak. The warning fires on
// any replacement of any live pool, because the 2024 rule is general and canon's
// erratum is one instance of it. When the app happens to know the source it says
// so; when the pool was typed in by hand it says the honest thing instead. That
// is the same discipline `trigger.ts` applies to errata triggers, and it means
// Heroism replacing Inspiring Leader warns exactly as loudly as anything
// replacing the cloak.
//
// Table Truth slice 10d.

import type { Character } from '../character'
import type { CanonFeature } from '../canon/types'
import { featureByName } from '../canon/lookup'
import { featureFacts, type FeatureContext } from '../canon/feature'

export interface TempHPReplacement {
  /** The pool that would be destroyed. Always > 0 — there is no replacement to
   *  warn about when there is nothing to lose. */
  losing: number
  /** What granted the doomed pool, when the app knows. NULL means it was typed
   *  in by hand and the app genuinely does not know; the caller must say so
   *  rather than guessing, because naming the wrong feature is worse than
   *  naming none. */
  source: string | null
  /** The pool being offered in its place. */
  incoming: number
  /** Accepting would leave the player with strictly fewer temporary hit points.
   *
   *  ADVISORY, and deliberately not a veto: a smaller pool from a source with a
   *  better duration is a real choice a player is allowed to make, and 2024
   *  gives them that choice on purpose. This exists so the warning can lead with
   *  the sharper sentence when the trade is plainly bad. */
  smaller: boolean
}

/** What accepting `incoming` temporary hit points would cost, or null when it
 *  costs nothing.
 *
 *  Null in three cases, and each is a case where a prompt would be noise:
 *  there is no live pool to lose; the incoming amount is not a real grant; or
 *  the two are the same number from the same source, which is a re-application
 *  rather than a replacement. */
export function tempHPReplacement(
  character: Character,
  incoming: number,
  incomingSource: string | null = null,
): TempHPReplacement | null {
  const losing = character.tempHP
  if (losing <= 0) return null
  if (!Number.isFinite(incoming) || incoming <= 0) return null

  const source = character.tempHPSource ?? null

  // Re-taking the same thing that granted the pool you are standing in is not a
  // replacement worth a prompt — it is the cloak being refreshed by the cloak.
  // Requires BOTH a known source and an equal amount: two different features
  // that happen to grant 11 are still a replacement, and a cloak refreshed at a
  // higher level is a real decision.
  if (source !== null && incomingSource !== null && source === incomingSource && incoming === losing) {
    return null
  }

  return { losing, source, incoming, smaller: incoming < losing }
}

/** The sentence to put in front of the player, given what would be lost.
 *
 *  Lives here rather than in a component because BOTH surfaces that can ask
 *  must ask the same question — a warning that is worded one way on the HP
 *  tracker and another way on the detail sheet is two rules as far as the
 *  player is concerned. Returns the body only; each surface owns its own
 *  buttons, because "Apply" and "Spend" are genuinely different verbs.
 *
 *  The source clause is what canon's erratum actually asked for. With a known
 *  source this reads the way HEARTH-04 wrote it — naming the thing that is
 *  about to end — and with an unknown one it says so plainly instead of
 *  inventing a culprit. */
export function replacementWarning(r: TempHPReplacement): string {
  const pool = r.source
    ? `your ${r.source} pool (${r.losing})`
    : `the ${r.losing} temporary hit points you already have`
  const verdict = r.smaller
    ? `Accepting ${r.incoming} replaces ${pool} — you would end up with fewer.`
    : `Accepting ${r.incoming} replaces ${pool}.`
  return `${verdict} Temporary hit points do not stack in 2024: you keep one pool or the other, never both.`
}

/* ── WHO GRANTED IT — the road he actually walks ─────────────────────────────
 *
 * Held Reaction slice 4. Slice 3 opened the ENGINE road: take the cloak from its
 * reaction row and the composer sizes the pool, the reducer writes the source,
 * and the retaliation arms. That road works and is proved. It is also not the
 * road Marcus walks. His words, item 9: *"i most often use my physical dice to
 * roll at the table and prefer physical dice"* — and a player who rolls his own
 * dice types his own numbers. He taps **Temp HP**, types 10, and presses Apply.
 *
 * Down that road the app has an amount and no source, and `activeRetaliation`
 * needs a source: `tempHPSource` is the whole of how it knows the cloak is up.
 * So the honest fix is not to infer one. It is to ASK — Marcus's own ruling,
 * given at Gate 2 and given for the case where there is exactly ONE candidate:
 * ask anyway. One candidate is still a guess when the app is the one making it,
 * and this file's entire reason for existing is that naming the wrong feature is
 * worse than naming none.
 *
 * These two functions supply the question's options. They do not ask it — the
 * law at the top of this file holds: it decides, it never applies, and it
 * certainly never prompts. */

/** The temporary hit points canon says this feature grants THIS character, or
 *  undefined when canon states no such number.
 *
 *  ONE READER FOR ONE FACT. `compose.ts` calls this to SIZE the grant when the
 *  cloak is taken from its row, and `tempHPGrantors` calls it to decide whether
 *  a feature is worth offering as a source. Two readers of `mechanics.tempHP`
 *  would eventually disagree, and the way they would disagree is the app
 *  offering Marcus a source that then arms nothing — a question whose answer
 *  does not work, which is worse than not asking.
 *
 *  Resolved against `ctx`, never read off canon's `atLevel7` snapshot: the app
 *  COMPUTES the scaling. `featureFacts` renders "10 temp HP"; the number is the
 *  leading integer, and a value that stayed a formula is dropped whole rather
 *  than guessed at. */
export function grantedTempHP(
  feature: CanonFeature | undefined,
  ctx: FeatureContext,
): number | undefined {
  const fact = featureFacts(feature, ctx).find(
    f => f.key === 'tempHP' && f.shape === 'computed',
  )
  if (!fact) return undefined
  const amount = Number.parseInt(fact.value, 10)
  return Number.isFinite(amount) && amount > 0 ? amount : undefined
}

/** The features on this character that canon says grant temporary hit points —
 *  the picker's whole option list, in the sheet's own order.
 *
 *  NOT A FREE-TEXT FIELD, and that is the point. Every string this returns is a
 *  name `featureByName` just resolved, which is the same call `activeRetaliation`
 *  makes on the way back out:
 *
 *      tempHPGrantors → he picks "Hearthfire Manifest"
 *        → setTempHP(character, 10, "Hearthfire Manifest")
 *          → activeRetaliation → featureByName("Hearthfire Manifest") → the die
 *
 *  So the round trip cannot lose the answer he gave. A typed source could, and
 *  would do it silently.
 *
 *  WHAT IT DOES NOT PROMISE. A grantor is not the same thing as a retaliation:
 *  Inspiring Leader grants temp HP and carries no die, and it belongs on this
 *  list anyway, because HEARTH-04's replacement warning needs to be able to NAME
 *  the pool it is about to destroy no matter what granted it. Arming is a
 *  consequence some sources have; being nameable is what all of them have.
 *
 *  EMPTY IS AN ANSWER. A character canon knows nothing about gets no question at
 *  all, and the temp entry behaves exactly as it did before this slice. */
export function tempHPGrantors(character: Character, ctx: FeatureContext): string[] {
  const seen = new Set<string>()
  const grantors: string[] = []
  for (const feature of character.features ?? []) {
    const name = feature.name?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (grantedTempHP(featureByName(name), ctx) === undefined) continue
    grantors.push(name)
  }
  return grantors
}
