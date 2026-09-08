/* THE ADVICE CANON DID NOT WRITE — Combat Open Book slice 9b.
 *
 * ── READ THIS BEFORE ADDING A LINE ──────────────────────────────────────────
 *
 * Every other word on the card came out of a canon file. These did not. This
 * module is the app writing tactical advice in its own voice, and it is the
 * only place in `canon/` that does — which is why it lives in its own file with
 * its own name rather than as a fallback inside `bands.ts`, where it would have
 * looked like one more branch and read like canon within a week.
 *
 * `04-slices.md` set the terms: "That is a different kind of act from everything
 * above, all of which only re-arranges words that already existed or resolves
 * numbers that were already yours. So this slice ships as a diff you read first.
 * Four abilities, three bullets each, and if any of it is wrong or not how you
 * play, it does not go in."
 *
 * TWO OF THE FOUR NEVER NEEDED IT. Slice 9a found canon's own `notes` array on
 * Lay On Hands and Aura of Protection — see `types.ts` on `CanonFeature.notes`.
 * Only the two below have nothing, so only the two below are here. The list did
 * not grow to fill the slice.
 *
 * ── THE LABEL IS THE POINT, AND IT IS NOT DECORATION ────────────────────────
 *
 * Band ③'s subhead has said "Canon's own words, with your numbers filled in."
 * since Table Truth. Pushing these through the same channel would have made the
 * app's own label a lie about the app's own text — the precise failure this
 * project keeps naming as the worst one available. So `CanonBands` carries
 * `tacticsSource`, `EntryDetailPanel` prints a different subhead for 'house',
 * and `bands.test.ts` asserts the two can never disagree. He can always tell
 * whose voice he is reading.
 *
 * ── SOURCING ────────────────────────────────────────────────────────────────
 *
 * The MECHANICS in every line below are read off the two canon records — the
 * costs, the retaliation die, the light radii, the 30-foot leash, the recharge
 * rule, the save DC. What is added is the PRIORITY: which cost actually binds,
 * what to do first, and what you are refusing when you spend. That judgement is
 * the app's, and it is the part that can be wrong.
 *
 * Approved by Marcus in chat, 2026-09-08, on the draft quoted in `00-status.md`.
 * Anything added here later needs the same approval — that is not a convention,
 * it is the condition the slice shipped under.
 *
 * ── SHAPE ───────────────────────────────────────────────────────────────────
 *
 * One string per feature, headings in CAPITALS followed by an em dash, exactly
 * as canon's own `tactics` strings are written — because these go through
 * `splitTactics` like a spell's, and a splitter that had to know which source it
 * was reading would be two splitters. `{level}`, `{CHAmod}` and `{saveDC}` are
 * resolved by `personalise.ts`; a token it cannot answer drops its own sentence
 * and leaves the rest standing.
 */

import { normalizeName } from './lookup'

const HOUSE_NOTES: Readonly<Record<string, string>> = {
  [normalizeName('Channel Divinity')]:
    'TWO USES, AND ONE COMES BACK EARLY — a Short Rest returns one; a Long Rest '
    + 'returns all. Spending down to zero before a short rest is usually right, '
    + 'because a use you never spent is a use that expired. '
    + 'IT IS A MENU, NOT AN ABILITY — Divine Sense and the Hearthfire cloak draw '
    + 'from the same two uses, so committing one is refusing the other in the '
    + 'same moment. '
    + 'THE DC IS YOUR SPELL SAVE DC — {saveDC}, the same number as your spells, '
    + 'so anything that raises one raises both.',

  [normalizeName('Hearthfire Manifest')]:
    'THE SUMMON AND THE CLOAK ARE TWO DIFFERENT PRICES — summoning or dismissing '
    + 'the manifestation is a Bonus Action and costs nothing else. Turning it '
    + 'into the cloak is a Reaction and a use of Channel Divinity. '
    + 'SUMMON IT BEFORE THE FIGHT — the reaction only works if the manifestation '
    + 'is already out, and a Bonus Action spent in round one is a Bonus Action '
    + 'not spent on Divine Smite. '
    + 'IT IS TEMPORARY HIT POINTS THAT HIT BACK — your Paladin level ({level}) '
    + 'plus your Charisma modifier ({CHAmod}), and every melee attack that lands '
    + 'takes 1d10 Fire in retaliation. It lasts until those points are gone, so '
    + 'it is worth more against several small hits than one large one. '
    + 'THE LIGHT IS NOT FREE — bright light for 10 feet and dim for 10 more, and '
    + 'it is extinguished beyond 30 feet from you. It costs you stealth for as '
    + 'long as it is out.',
}

/** The app's own advice on a feature, or null — and null is the normal answer.
 *
 *  Consulted ONLY after `CanonFeature.notes` comes back empty, so canon can
 *  never be overridden by this file: the day a canon package adds notes to
 *  either of these two, canon wins and this entry goes quiet on its own.
 *  `bands.test.ts` pins that precedence rather than trusting the branch order. */
export function houseNoteFor(name: string): string | null {
  return HOUSE_NOTES[normalizeName(name)] ?? null
}

/** The names this file has an opinion about. Exported for the tests, which
 *  assert the count rather than the contents — a fourth entry appearing without
 *  a decision recorded in `00-status.md` should go red. */
export const HOUSE_NOTE_NAMES: readonly string[] = Object.keys(HOUSE_NOTES)
