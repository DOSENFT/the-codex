/* ============================================================================
   A LOST CAMPAIGN MUST NOT BECOME AN UNRECOVERABLE ONE.

   Marcus, 2026-09-10, having imported a file with his whole party in it: "i
   imported it but it doesnt seemed to have done anything". Two failures were
   stacked underneath that sentence, and the second one is the one this file
   exists to stop happening again.

     1. The build on the server was older than the code that reads a campaign
        out of a file, so the campaign was ignored on the way in. Recoverable —
        deploy, import again.

     2. Then he opened the campaign editor. It found a `campaignId` pointing at
        a campaign that was not there, minted a FRESH id, and rewrote the
        character to point at it. Not recoverable, because the file's own id —
        `vault-driftwood-kin` — was now an address nothing referred to. Every
        future import of that same file would land somewhere the app no longer
        looked.

   The rule: keep the id you were given. An empty campaign at the right address
   is a placeholder that the next import overwrites. An empty campaign at a NEW
   address is a wall built in front of the data.

   `campaignToShow` was extracted out of the mount effect specifically so this
   could be asserted — the repo has no jsdom, so a decision left inside
   `useEffect` is a decision no test can see. That extraction is the point of
   the test as much as the branches are.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { campaignToShow, createDefaultCampaign } from './campaign'
import type { CampaignData } from './character'

const STORED: CampaignData = {
  id: 'vault-driftwood-kin',
  name: 'Driftwood Kin',
  setting: '',
  worldDetails: 'A drowned coast that remembers.',
  currentQuest: 'Eight souls swear the Grand Rebirth.',
  partyMembers: [{ name: 'Ponzi', class: 'Rogue', race: 'Tiefling', personality: '', relationshipToPC: '' }],
  notableNPCs: [],
  sessionNotes: [],
}

describe('campaignToShow — the campaign is there', () => {
  it('shows what was stored and leaves the character alone', () => {
    const { campaign, repoint } = campaignToShow('vault-driftwood-kin', STORED)
    expect(campaign).toBe(STORED)
    expect(repoint).toBe(false)
  })
})

describe('campaignToShow — the id resolves to nothing', () => {
  /* THE ONE THAT MATTERS. Everything else in this file is scaffolding for it. */
  it('keeps the id the character is carrying instead of minting a new one', () => {
    const { campaign } = campaignToShow('vault-driftwood-kin', null)
    expect(campaign.id).toBe('vault-driftwood-kin')
  })

  it('does not ask the caller to repoint the character', () => {
    /* The repoint is the irreversible half. Even with the right id kept, a
       `repoint: true` here would send the caller off to write the character on
       mount for no reason — and a character write on mount is how a stale tab
       once erased another tab's spends (A-19). */
    expect(campaignToShow('vault-driftwood-kin', null).repoint).toBe(false)
  })

  it('hands back a genuinely empty campaign, not a half-built one', () => {
    /* It is a placeholder. If it arrived carrying invented content, the next
       import would merge into fiction rather than replace a blank. */
    const { campaign } = campaignToShow('vault-driftwood-kin', null)
    expect(campaign.partyMembers).toEqual([])
    expect(campaign.notableNPCs).toEqual([])
    expect(campaign.sessionNotes).toEqual([])
    expect(campaign.name).toBe('')
  })

  it('survives a re-import landing on top of it', () => {
    /* The whole point, spelled out: placeholder first, real campaign second,
       and the character never had to move. */
    const placeholder = campaignToShow('vault-driftwood-kin', null).campaign
    expect(placeholder.partyMembers).toHaveLength(0)

    const afterImport = campaignToShow('vault-driftwood-kin', STORED).campaign
    expect(afterImport.id).toBe(placeholder.id)
    expect(afterImport.partyMembers.map(p => p.name)).toEqual(['Ponzi'])
  })
})

describe('campaignToShow — there is no id at all', () => {
  it('mints one and says so, because a new character has to start somewhere', () => {
    const { campaign, repoint } = campaignToShow(undefined, null)
    expect(campaign.id).toBeTruthy()
    expect(repoint).toBe(true)
  })

  it('mints a DIFFERENT id each time', () => {
    /* Two fresh characters sharing an id would share a party, and the second
       one to be edited would overwrite the first. */
    const a = campaignToShow(undefined, null).campaign.id
    const b = campaignToShow(undefined, null).campaign.id
    expect(a).not.toBe(b)
  })

  it('treats the empty string as no id rather than as an address', () => {
    /* `''` is what a hand-edited or half-written file leaves behind, and
       `codex-campaign-` with nothing after it is a key every such character
       would collide on. */
    const { campaign, repoint } = campaignToShow('', null)
    expect(campaign.id).toBeTruthy()
    expect(repoint).toBe(true)
  })

  it('still shows a stored campaign if one is somehow handed to it', () => {
    expect(campaignToShow(undefined, STORED).campaign).toBe(STORED)
  })
})

describe('createDefaultCampaign — the shape the placeholder is built from', () => {
  it('is empty in every field a person could mistake for data', () => {
    const c = createDefaultCampaign()
    expect(c.name).toBe('')
    expect(c.setting).toBe('')
    expect(c.worldDetails).toBe('')
    expect(c.currentQuest).toBe('')
    expect(c.partyMembers).toEqual([])
  })
})
