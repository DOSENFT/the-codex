/* When can I use this? — the one question a reaction has to answer.
 *
 * A Reaction that does not state its trigger is not a rule, it is a hope. The
 * 2024 rules require every Reaction to name the thing that lets you take it,
 * and canon's own errata pass says so about Nix's cloak in as many words. So
 * this module has exactly one job: find the trigger, or say plainly that there
 * isn't one.
 *
 * ── WHERE A TRIGGER MAY COME FROM, IN ORDER ─────────────────────────────────
 *   ruled    — Marcus recorded one against a canon erratum, with his DM. Slice
 *              8b. FIRST, and deliberately so: at a table the DM's ruling beats
 *              the sheet's wording and beats canon's suggestion, because the DM
 *              is the authority in the room. It is never silent — the row is
 *              required to name where the clause came from.
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
 * Slice 8b makes it read the decision instead — see `ruledTrigger` below, which
 * still refuses to read the paragraph. The clause has to have been WRITTEN by
 * somebody: by Marcus's DM, or inside canon's own quotation marks.
 *
 * Table Truth slice 6; the `ruled` source added in slice 8b. */

import type { CanonErratum, CanonFeature, CanonSpell } from '../canon/types'
import type { TurnOption } from './types'
import { rulingFor, type ErratumRulings } from '../errata-rulings'

export type TriggerSource = 'ruled' | 'declared' | 'canon' | 'unstated'

export interface TriggerReading {
  /** The trigger clause as written by whoever wrote it. Null when nobody did —
   *  and null is a finding the row is required to show, not an empty string to
   *  paint over. */
  when: string | null
  source: TriggerSource
  /** `option.detail` with the declared trigger segment removed. Identical to
   *  `option.detail` in every other case. */
  body: string
  /** Set only when `source === 'ruled'`: which erratum was answered, and whose
   *  words these are. The row prints this. A trigger that appeared out of
   *  nowhere would be exactly the invented rule slice 6 refused to ship. */
  ruling?: RuledTrigger
}

const SEP = ' · '

/** A trigger clause, by shape: it opens with "When" or "If". Nothing else about
 *  the sentence is inspected — this recognises a GRAMMAR, not a feature.
 *
 *  The `\b` is load-bearing and measured: canon's HEARTH-01 recommends "Whenever
 *  you cast a spell whose name includes Smite, add 1d8 Fire damage". That is a
 *  damage rider, not a trigger, and "Whenever" fails the boundary. Without it
 *  the cloak would inherit a Smite rider as its trigger. */
const TRIGGER_LEAD = /^(?:when|if)\b/i

/** Does this clause READ as a trigger?
 *
 *  Exported so that the shape has exactly one owner. The composer needs the same
 *  question answered when it decides which of a face's sentences leads the row,
 *  and a second copy of this regex somewhere else is a second answer waiting to
 *  drift from this one. Held Reaction slice 1. */
export function readsAsTrigger(clause: string): boolean {
  return TRIGGER_LEAD.test(clause.trim())
}

/** A span inside quotation marks — straight or curly, since canon writes both. */
const QUOTED = /['‘“"]([^'’”"]{4,240})['’”"]/g

export interface RuledTrigger {
  /** The clause itself, as written by whoever wrote it. */
  when: string
  /** The erratum this answers, so the row can point at the record. */
  erratumId: string
  /** `dm` — Marcus typed it. `canon` — he chose canon's printed fix and this is
   *  the clause canon itself put in quotation marks. */
  via: 'dm' | 'canon'
}

/** Canon's own suggested trigger for an erratum, if canon quoted one.
 *
 *  This is the ONE place a clause is taken out of canon's prose, and it is
 *  bounded twice over: the clause must be inside canon's own quotation marks
 *  (canon put it there as text to be adopted verbatim), and it must read as a
 *  trigger. Measured across the whole corpus by `_probe-trigger.mjs`: of the 14
 *  quoted spans in the twelve errata, exactly ONE is trigger-shaped —
 *  HEARTH-03's "when you take damage", which is the gap this is for. The other
 *  thirteen are duration clauses, damage riders and warning text, and every one
 *  of them is correctly rejected. If canon later quotes a second trigger this
 *  finds it with no edit here; if canon rewords this one, the result is
 *  `null` and the row falls back to saying nobody stated a trigger — which is
 *  the honest answer, not a stale one. */
export function canonSuggestedTrigger(erratum: CanonErratum): string | null {
  for (const field of [erratum.recommendedFix, erratum.narrowerAlternative, erratum.appAction]) {
    if (typeof field !== 'string') continue
    for (const match of field.matchAll(QUOTED)) {
      const clause = match[1].trim()
      if (TRIGGER_LEAD.test(clause)) return clause
    }
  }
  return null
}

/** The trigger Marcus's table has settled, if it has settled one.
 *
 *  Which erratum supplies it is decided by SHAPE, never by id. An erratum
 *  contributes a trigger when the operative text READS as one — so answering
 *  HEARTH-04 with "temp HP does not stack, my call" correctly contributes
 *  nothing, because that sentence is not a trigger no matter how firmly the DM
 *  said it. Hardcoding `if (id === 'HEARTH-03')` would have worked today and
 *  been wrong the moment canon grew a thirteenth record.
 *
 *  `unasked` contributes nothing, which is the whole point of slice 8: an
 *  unanswered flag must not quietly become an answer. */
export function ruledTrigger(
  errata: readonly CanonErratum[],
  rulings: ErratumRulings
): RuledTrigger | null {
  for (const erratum of errata) {
    const ruling = rulingFor(rulings, erratum.id)

    if (ruling.status === 'dm') {
      const clause = ruling.dmWording?.trim()
      /* His words are used verbatim or not at all. A DM ruling that is not a
         trigger is still a ruling — it just is not THIS answer, and slice 8's
         band is where it goes on being read. */
      if (clause && TRIGGER_LEAD.test(clause)) {
        return { when: clause, erratumId: erratum.id, via: 'dm' }
      }
      continue
    }

    if (ruling.status === 'canon') {
      const clause = canonSuggestedTrigger(erratum)
      if (clause) return { when: clause, erratumId: erratum.id, via: 'canon' }
    }
  }
  return null
}

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
  canon?: { feature?: CanonFeature; spell?: CanonSpell },
  /** What the table settled, from `ruledTrigger`. Optional, and omitting it
   *  gives back the slice 6 reading byte for byte — every caller that predates
   *  slice 8b keeps working unchanged. */
  ruled?: RuledTrigger | null
): TriggerReading {
  const parts = segments(option.detail ?? '')
  const declared = parts.length > 0 && TRIGGER_LEAD.test(parts[0])

  /* FIRST, above the sheet's own words. A declared trigger the DM has overruled
     is no longer the trigger at Marcus's table, and printing it as though it
     were would be the app telling him a rule his DM replaced.

     The superseded segment is dropped from the body for the same reason the
     `declared` branch drops it: a row showing two different "when"s is a row
     that has to be argued with at the table. The old wording is not lost — it
     is on the sheet and in the detail sheet, which is where a superseded rule
     belongs. */
  if (ruled) {
    return {
      when: ruled.when,
      source: 'ruled',
      body: (declared ? parts.slice(1) : parts).join(SEP),
      ruling: ruled,
    }
  }

  if (declared) {
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
