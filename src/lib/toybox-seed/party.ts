import type { Character } from '../character'

/* ==========================================================================
   WHO ELSE IS STANDING THERE — reading the party out of free text

   THE SOURCE IS NOT A LIST OF PARTY MEMBERS. `CampaignData.partyMembers` is
   the typed field this should read, and it is not reachable: the character
   holds only a `campaignId`, and `ToyboxPanel` has no campaign in scope at
   all. So the party comes from `backstory.relationships`, where the relation
   is a sentence a human wrote:

     "Party member (Wizard) — quiet, inquisitive, knowledge-hungry."
     "…goliath. Partner, moral compass. Only person besides the party who
      knows Nix is a changeling."

   The second is Scar, and Scar is not in the party. He is also the exact
   reason this parse must be strict rather than clever: his relation contains
   the word "party". A rule that matched on that alone would put him in the
   line of battle, and a play that says "call it out to Scar" is worse than
   no play at all.

   THE RULE, THEREFORE: a relation qualifies only when it contains a class
   name IN PARENTHESES **and** the word "party" appears before that
   parenthesis. Scar's mention of the party comes two sentences later and
   names no class; he fails both halves. A cousin described as "(Baker)"
   fails the first. A "Rival (Wizard) who hunts him" fails the second.

   WHEN IN DOUBT, RETURN NOTHING. An unresolved role drops the annotation that
   needed it — see `template.ts`. That is the designed outcome, not a
   degradation: Gate 1's stated failure mode is content that could belong to
   somebody else's character.
   ========================================================================== */

export const PARTY_ROLES = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
] as const

export type PartyRole = (typeof PARTY_ROLES)[number]

const ROLES = new Set<string>(PARTY_ROLES)

/** The first parenthesised group, lowercased — or null when there isn't one. */
function parenthesised(text: string): { role: string; before: string } | null {
  const match = /\(([^)]+)\)/.exec(text)
  if (!match) return null
  return { role: match[1].trim().toLowerCase(), before: text.slice(0, match.index).toLowerCase() }
}

/** The party, by role. Roles nobody fills are simply absent.
 *
 *  First match wins. A second bard does not overwrite the first — not because
 *  the first is more important, but because overwriting would make the answer
 *  depend on the order of a list nobody thinks of as ordered. */
export function resolveParty(character: Character): Partial<Record<PartyRole, string>> {
  const out: Partial<Record<PartyRole, string>> = {}
  for (const rel of character.backstory?.relationships ?? []) {
    const name = (rel.name ?? '').trim()
    if (!name) continue
    const found = parenthesised(rel.relation ?? '')
    if (!found) continue
    if (!ROLES.has(found.role)) continue
    if (!found.before.includes('party')) continue
    const role = found.role as PartyRole
    if (out[role]) continue
    out[role] = name
  }
  return out
}
