import type { CampaignData, PartyMember, CampaignNPC, SessionNote } from './character'
import { generateId, saveOrAnnounce } from './character'

const CAMPAIGN_PREFIX = 'codex-campaign-'

export function createDefaultCampaign(): CampaignData {
  return {
    id: generateId(),
    name: '',
    setting: '',
    worldDetails: '',
    currentQuest: '',
    partyMembers: [],
    notableNPCs: [],
    sessionNotes: [],
  }
}

export function saveCampaign(campaign: CampaignData): void {
  saveOrAnnounce(CAMPAIGN_PREFIX + campaign.id, JSON.stringify(campaign))
}

export function loadCampaign(id: string): CampaignData | null {
  const raw = localStorage.getItem(CAMPAIGN_PREFIX + id)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CampaignData
  } catch {
    return null
  }
}

export function deleteCampaign(id: string): void {
  localStorage.removeItem(CAMPAIGN_PREFIX + id)
}

/* ── What the editor should show when it opens ───────────────────────────────
   Pure on purpose, with the load already done by the caller. This decision
   used to live inside `CampaignEditor`'s mount effect, which meant the one
   branch that matters could not be reached by a test — this repo has no jsdom,
   so anything behind a `useEffect` is behind a wall.

   The branch that matters is the middle one. A character carrying a
   `campaignId` that resolves to NOTHING is a character whose world has already
   been lost; the editor cannot undo that, but it decides whether the loss is
   recoverable. Minting a fresh id and repointing the character — which is what
   it did until 2026-09-10 — makes it permanent, because the campaign that
   turns up later under the ORIGINAL id can never be found again. That is
   precisely how Marcus's Vault import disappeared twice over: the server build
   was too old to store the campaign the file carried, and then opening this
   editor repointed him away from the very id the file had just set.

   Reusing the id makes the empty campaign a placeholder at the address the
   character already knows, so importing the file again lands on top of it.
   `repoint` is only true when there was no id to keep. */
export function campaignToShow(
  campaignId: string | undefined,
  loaded: CampaignData | null,
): { campaign: CampaignData; repoint: boolean } {
  if (loaded) return { campaign: loaded, repoint: false }
  if (campaignId) return { campaign: { ...createDefaultCampaign(), id: campaignId }, repoint: false }
  return { campaign: createDefaultCampaign(), repoint: true }
}

// ---------------------------------------------------------------------------
// Reading a campaign off a file that is not ours
// ---------------------------------------------------------------------------

/* WHY THIS EXISTS, 2026-09-10.
 *
 * The character export wrote `campaignId` and nothing else. The campaign itself
 * lives under a SEPARATE localStorage key — `codex-campaign-<id>` — which no
 * export has ever touched. So every move to a new device carried an id that
 * pointed at a key that was not there, `loadCampaign` returned null, and the
 * party, the world, the quest and every session note were gone.
 *
 * Silently. That is the part that makes it a bug rather than a limitation:
 * nothing on screen says "the campaign this character belongs to did not come
 * with it". The Engage card just shows its empty state, which is exactly what
 * it shows for a character who never had a party — and Marcus, looking at a
 * freshly-imported Nix, reasonably read that as the app losing his campaign
 * information rather than never having been asked to bring it.
 *
 * `loadCampaign` above can stay a bare `JSON.parse`: it reads a key this app
 * wrote. Anything arriving from a FILE gets normalised instead, for the reason
 * `import-character.ts` states at length — a cast is not a check, and this app
 * has already white-screened once on an exported field it merely believed. */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

/** Objects only. A string in `partyMembers` reaches `${p.name}` as undefined
 *  and renders a nameless row with a live delete button beside it. */
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? (v.filter(x => x !== null && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[])
    : []

/** A campaign out of an untrusted file, or null if there is no campaign in it.
 *
 *  Null and an EMPTY campaign are different answers and the callers depend on
 *  the difference: null means the file predates this format and the device's
 *  own campaign must be left alone, while an empty one means the file genuinely
 *  carries a blank campaign and is entitled to overwrite. Defaulting null to
 *  `createDefaultCampaign()` here would quietly wipe a campaign on every import
 *  of an older export — the same class of damage this function was written to
 *  stop, arriving from the other direction. */
export function normalizeCampaign(raw: unknown): CampaignData | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Record<string, unknown>

  return {
    // An id is what the character's `campaignId` has to match. A file with no
    // id is not a broken file — it is re-homed, and the caller re-points the
    // character at the new id rather than dropping the campaign on the floor.
    id: str(c.id) || generateId(),
    name: str(c.name),
    setting: str(c.setting),
    worldDetails: str(c.worldDetails),
    currentQuest: str(c.currentQuest),
    partyMembers: objects(c.partyMembers).map(p => ({
      name: str(p.name, 'Unnamed'),
      class: str(p.class),
      race: str(p.race),
      personality: str(p.personality),
      relationshipToPC: str(p.relationshipToPC),
    })) as PartyMember[],
    notableNPCs: objects(c.notableNPCs).map(n => ({
      name: str(n.name, 'Unnamed'),
      role: str(n.role),
      notes: str(n.notes),
    })) as CampaignNPC[],
    /* Ids are how a note is deleted (`filter(s => s.id !== id)` in the editor).
       Two notes sharing a missing id delete each other; a note with no id at
       all cannot be deleted at any price. Minted here rather than trusted. */
    sessionNotes: objects(c.sessionNotes).map(s => ({
      id: str(s.id) || generateId(),
      date: str(s.date),
      summary: str(s.summary),
    })) as SessionNote[],
  }
}

/** Format campaign data for injection into AI system prompts */
export function campaignContext(campaign: CampaignData): string {
  let ctx = `\n\nCAMPAIGN CONTEXT:`
  if (campaign.name) ctx += `\n  Campaign: ${campaign.name}`
  if (campaign.setting) ctx += `\n  Setting: ${campaign.setting}`
  if (campaign.worldDetails) ctx += `\n  World: ${campaign.worldDetails}`
  if (campaign.currentQuest) ctx += `\n  Current Quest: ${campaign.currentQuest}`

  if (campaign.partyMembers.length > 0) {
    ctx += `\n  Party Members:`
    campaign.partyMembers.forEach(p => {
      ctx += `\n    - ${p.name} (${p.race} ${p.class}): ${p.personality}. Relationship: ${p.relationshipToPC}`
    })
  }

  if (campaign.notableNPCs.length > 0) {
    ctx += `\n  Notable NPCs:`
    campaign.notableNPCs.forEach(n => {
      ctx += `\n    - ${n.name} (${n.role}): ${n.notes}`
    })
  }

  if (campaign.sessionNotes.length > 0) {
    const recent = campaign.sessionNotes.slice(0, 5)
    ctx += `\n  Recent Sessions:`
    recent.forEach(s => {
      ctx += `\n    - [${s.date}] ${s.summary}`
    })
  }

  return ctx
}
