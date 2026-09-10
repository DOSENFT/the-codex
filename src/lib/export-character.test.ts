/* ============================================================================
   THE WORLD TRAVELS WITH THE CHARACTER.

   Before 2026-09-10 it did not. The export wrote `campaignId` and stopped
   there; the campaign itself sits under a separate localStorage key that no
   export ever touched. Move Nix to the phone and the id arrived pointing at
   nothing — party gone, NPCs gone, quest gone, every session note gone, and
   not one word on screen about it, because an empty Engage card looks the same
   whether you lost a party or never had one.

   Four claims, and each is written so the obvious way of breaking it fails
   here rather than at the table:

     "the file carries the world"   → the party's names are IN the bytes. Assert
                                      on the round-trip alone and an export that
                                      writes `campaign: undefined` still passes,
                                      because the importer would default it.

     "an old file changes nothing"  → the single most dangerous regression in
                                      this change is defaulting a missing
                                      campaign to an empty one. That turns every
                                      re-import of an older export — which is a
                                      REASSURANCE gesture, done when you want to
                                      be sure the session took — into a silent
                                      wipe of the party. null, not {}.

     "the id points at what came"   → a campaign that arrives re-homed gets a
                                      fresh id, and a character still pointing
                                      at the old one is the exact orphaning this
                                      whole change closes, rebuilt by hand.

     "the file is not ours"         → junk in `partyMembers` is dropped rather
                                      than rendered as a nameless row with a
                                      live delete button next to it.

   Pure functions on both sides, so this needs no DOM — which is the point.
   The repo has no jsdom, and the old export lived inside a click handler where
   nothing could reach it.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { characterFileText, characterFileName } from './export-character'
import { parseCharacterFile } from './import-character'
import { normalizeCampaign } from './campaign'
import type { Character, CampaignData } from './character'

const NIX = {
  id: 'char-nix',
  name: 'Nix',
  class: 'Paladin',
  race: 'Tiefling',
  level: 7,
  campaignId: 'camp-driftwood',
} as unknown as Character

const DRIFTWOOD: CampaignData = {
  id: 'camp-driftwood',
  name: 'Driftwood Kin',
  setting: 'Vattenheim',
  worldDetails: 'A drowned coast that remembers.',
  currentQuest: "Dawson's vault",
  partyMembers: [
    { name: 'Scar', class: 'Barbarian', race: 'Goliath', personality: 'Throws hand axes', relationshipToPC: 'Shield-brother' },
    { name: 'Runewillow', class: 'Bard', race: 'Elf', personality: 'Copies giant runes', relationshipToPC: 'Wary' },
  ],
  notableNPCs: [{ name: 'Ulf', role: 'Tender', notes: 'Gave Scar the book of the tender.' }],
  sessionNotes: [{ id: 'note-8', date: '2025-09-12', summary: 'What grows in the Vault.' }],
}

/** What `parseCharacterFile` gives back on the happy path, or a thrown test. */
const parsed = (text: string) => {
  const r = parseCharacterFile(text)
  if (!r.ok) throw new Error(`expected a parse, got: ${r.error}`)
  return r
}

// ---------------------------------------------------------------------------
// The bytes
// ---------------------------------------------------------------------------

describe('characterFileText — the campaign is IN the file', () => {
  it('writes the party into the bytes, not just an id pointing at them', () => {
    const text = characterFileText(NIX, DRIFTWOOD)
    /* On the bytes deliberately. A round-trip assertion alone would pass an
       export that wrote nothing at all, because the importer on the other side
       would happily default what it did not find. */
    expect(text).toContain('Runewillow')
    expect(text).toContain('Vattenheim')
    expect(text).toContain('book of the tender')
  })

  it('writes no campaign key at all when there is no campaign', () => {
    const text = characterFileText(NIX, null)
    expect(JSON.parse(text).campaign).toBeUndefined()
  })

  it('still names the file after the character', () => {
    expect(characterFileName(NIX)).toBe('codex-nix-lvl7.json')
  })
})

// ---------------------------------------------------------------------------
// The round trip
// ---------------------------------------------------------------------------

describe('export → import — the world survives the move', () => {
  it('brings the party, the NPCs, the quest and the notes back', () => {
    const r = parsed(characterFileText(NIX, DRIFTWOOD))
    expect(r.campaign?.partyMembers.map(p => p.name)).toEqual(['Scar', 'Runewillow'])
    expect(r.campaign?.notableNPCs[0].name).toBe('Ulf')
    expect(r.campaign?.currentQuest).toBe("Dawson's vault")
    expect(r.campaign?.sessionNotes[0].summary).toBe('What grows in the Vault.')
  })

  it('leaves the character pointing at the campaign that actually arrived', () => {
    const r = parsed(characterFileText(NIX, DRIFTWOOD))
    expect(r.character.campaignId).toBe(r.campaign?.id)
  })

  it('re-points the character when the campaign is re-homed under a new id', () => {
    /* A campaign with no id of its own gets one minted on the way in. If the
       character kept its old `campaignId`, it would point at a key that does
       not exist — which is the original bug, rebuilt from parts. */
    const homeless = { ...DRIFTWOOD, id: '' }
    const r = parsed(characterFileText(NIX, homeless as CampaignData))
    expect(r.campaign?.id).toBeTruthy()
    expect(r.campaign?.id).not.toBe('camp-driftwood')
    expect(r.character.campaignId).toBe(r.campaign?.id)
  })

  it('does not smuggle the campaign into the character object', () => {
    /* It would be stored, re-exported, and grow a second copy that drifts from
       the real one. There is exactly one campaign, and it lives at its own key. */
    const r = parsed(characterFileText(NIX, DRIFTWOOD))
    expect((r.character as unknown as { campaign?: unknown }).campaign).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The file that says nothing
// ---------------------------------------------------------------------------

describe('an older export is not a statement about the campaign', () => {
  it('reports null — NOT an empty campaign — when the file has no campaign key', () => {
    /* THE ONE THAT MATTERS. Every file Marcus has already exported is this
       file. If a missing campaign defaulted to `createDefaultCampaign()`, then
       re-importing his own save — which he does to reassure himself the
       session took — would write an empty campaign over his party and call it
       success. Damage you cannot see, on the gesture you make when you want to
       be sure nothing was lost. */
    const r = parsed(JSON.stringify({ name: 'Nix', class: 'Paladin', level: 7 }))
    expect(r.campaign).toBeNull()
  })

  it('leaves an older file’s own campaignId untouched', () => {
    const r = parsed(JSON.stringify({ name: 'Nix', campaignId: 'camp-elsewhere' }))
    expect(r.campaign).toBeNull()
    expect(r.character.campaignId).toBe('camp-elsewhere')
  })
})

// ---------------------------------------------------------------------------
// The file is not ours
// ---------------------------------------------------------------------------

describe('normalizeCampaign — a cast is not a check', () => {
  it('is null for the things a file can be instead of a campaign', () => {
    expect(normalizeCampaign(undefined)).toBeNull()
    expect(normalizeCampaign(null)).toBeNull()
    expect(normalizeCampaign('Driftwood Kin')).toBeNull()
    expect(normalizeCampaign([])).toBeNull()
  })

  it('drops a party member that is not an object', () => {
    /* `["Scar"]` is the shape a hand-edited file takes, and `${p.name}` on a
       string is `undefined` — a nameless row in the editor with a working
       delete button beside it. */
    const c = normalizeCampaign({ partyMembers: ['Scar', null, { name: 'Ketsa' }] })
    expect(c?.partyMembers.map(p => p.name)).toEqual(['Ketsa'])
  })

  it('gives every session note an id, so none of them is undeletable', () => {
    /* The editor deletes by `filter(s => s.id !== id)`. Two notes with no id
       delete each other; one with no id cannot be deleted at all. */
    const c = normalizeCampaign({ sessionNotes: [{ summary: 'a' }, { summary: 'b' }] })
    const ids = c?.sessionNotes.map(s => s.id) ?? []
    expect(ids.filter(Boolean)).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('keeps an empty campaign empty rather than inventing one', () => {
    const c = normalizeCampaign({})
    expect(c).not.toBeNull()
    expect(c?.partyMembers).toEqual([])
    expect(c?.name).toBe('')
  })
})
