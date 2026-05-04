import type { CampaignData } from './character'
import { generateId } from './character'

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
  localStorage.setItem(CAMPAIGN_PREFIX + campaign.id, JSON.stringify(campaign))
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
