/* When can I use this? — the one question a reaction has to answer.
 *
 * A Reaction that does not state its trigger is not a rule, it is a hope. The
 * 2024 rules require every Reaction to name the thing that lets you take it,
 * and canon's own errata pass says so about Nix's cloak in as many words. So
 * this module has exactly one job: find the trigger, or say plainly that there
 * isn't one.
 *
 * ── WHERE A TRIGGER MAY COME FROM, IN ORDER ─────────────────────────────────
 *   declared — the sheet's own detail leads with a "When …" clause. Opportunity
 *              Attack already does. It is used verbatim and REMOVED from the
 *              body, so the row never says the same sentence twice.
 *   canon    — a STRUCTURED field: `CanonSpell.trigger`, or a `mechanics` entry
 *              whose value opens "When"/"If". Structured, not prose.
 *   unstated — nothing above found one.
 *
 * ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────────
 * It will not read the paragraph. Hearthfire Manifest's `rawText` contains the
 * sentence "When you are hit by a melee attack, the creature takes 1d10 Fire
 * damage in retaliation" — which is the trigger for the RETALIATION, not for
 * the cloak. A prose scraper would lift it, and Marcus would arrive at a table
 * believing he can only cloak up after already being hit. Canon's own fix for
 * this gap is "require the player to record a chosen trigger with DM approval".
 * That is a decision, and a decision belongs to Marcus (slice 8), not to a
 * regular expression. Until he makes it the row says so out loud.
 *
 * Table Truth slice 6. */

import type { CanonFeature, CanonSpell } from '../canon/types'
import type { TurnOption } from './types'

export type TriggerSource = 'declared' | 'canon' | 'unstated'

export interface TriggerReading {
  /** The trigger clause as written by whoever wrote it. Null when nobody did —
   *  and null is a finding the row is required to show, not an empty string to
   *  paint over. */
  when: string | null
  source: TriggerSource
  /** `option.detail` with the declared trigger segment removed. Identical to
   *  `option.detail` in every other case. */
  body: string
}

const SEP = ' · '

/** A trigger clause, by shape: it opens with "When" or "If". Nothing else about
 *  the sentence is inspected — this recognises a GRAMMAR, not a feature. */
const TRIGGER_LEAD = /^(?:when|if)\b/i

function segments(detail: string): string[] {
  return detail
    .split(SEP)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** The first `mechanics` value that is written as a trigger.
 *
 *  Canon does not have a `trigger` field on features, so the shape is the only
 *  handle there is. If a future canon package adds `cloakTrigger: "When you
 *  take damage"`, this finds it the day it lands, with no edit here. */
function canonFeatureTrigger(feature: CanonFeature | undefined): string | null {
  const mechanics = feature?.mechanics
  if (!mechanics) return null
  for (const value of Object.values(mechanics)) {
    if (typeof value !== 'string') continue
    const text = value.trim()
    if (TRIGGER_LEAD.test(text)) return text
  }
  return null
}

export function triggerFor(
  option: Pick<TurnOption, 'detail'>,
  canon?: { feature?: CanonFeature; spell?: CanonSpell }
): TriggerReading {
  const parts = segments(option.detail ?? '')

  if (parts.length > 0 && TRIGGER_LEAD.test(parts[0])) {
    return {
      when: parts[0],
      source: 'declared',
      // Everything after the trigger is the body. When the trigger was the ONLY
      // segment the body is empty, which is honest: the row states when, and
      // the sheet had nothing else to add.
      body: parts.slice(1).join(SEP),
    }
  }

  const body = parts.join(SEP)

  const spellTrigger = canon?.spell?.trigger?.trim()
  if (spellTrigger) return { when: spellTrigger, source: 'canon', body }

  const featureTrigger = canonFeatureTrigger(canon?.feature)
  if (featureTrigger) return { when: featureTrigger, source: 'canon', body }

  return { when: null, source: 'unstated', body }
}

/** Split a trigger clause into the word that introduces it and the rest.
 *
 *  The row prints "WHEN" as a label, and the first browser run of this slice
 *  measured the result: «WHEN When a creature you can see leaves your reach».
 *  The label and the clause were saying the same word twice.
 *
 *  So the label becomes the clause's OWN lead word — "WHEN" or "IF" — and the
 *  clause keeps everything after it. No words are added and none are dropped;
 *  they are only split across two pieces of type. That distinction matters:
 *  "when" and "if" are different conditions, and quietly relabelling an "if" as
 *  a "when" would be the app editing a rule to fit its own layout. */
export function splitTriggerLead(when: string): { lead: string; rest: string } {
  const match = /^(when|if)\b[,:]?\s+/i.exec(when)
  const rest = match ? when.slice(match[0].length) : ''
  // A clause that is nothing BUT its lead word keeps the generic label and its
  // own text, rather than becoming a label with nothing beside it.
  if (!match || rest.length === 0) return { lead: 'WHEN', rest: when }
  return { lead: match[1].toUpperCase(), rest }
}
