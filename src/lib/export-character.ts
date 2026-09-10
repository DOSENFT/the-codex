/**
 * Writing a character out to a file — ONE copy of it.
 *
 * There were two, in `Settings.handleExport` and `CharacterPage.handleExport`,
 * byte-identical down to the variable names. That is precisely the shape the
 * import path was in before `import-character.ts` was written, and it failed in
 * precisely the predicted way: `parsed as Character` was wrong in both places
 * at once, and fixing one would have left the other. A duplicated function is
 * not two functions, it is one function with two chances to be out of date.
 *
 * What is NEW here, beyond de-duplication, is that the file now carries the
 * campaign. See `normalizeCampaign` for the full account of what that was
 * costing; the short version is that an export wrote `campaignId` and nothing
 * else, and the campaign lives under a different localStorage key that no
 * export has ever touched, so the world did not travel with the character who
 * lived in it.
 */
import type { Character, CampaignData } from './character'
import { loadCampaign } from './campaign'

/** The character plus the campaign it belongs to. */
export interface CharacterFile extends Character {
  /* OPTIONAL, and it has to stay optional forever: every file Marcus has
     already exported is a file without it, and those must keep importing
     exactly as they do today. `parseCharacterFile` reads its absence as "this
     file has nothing to say about the campaign" rather than as "this file says
     the campaign is empty" — the difference between the two is a wipe. */
  campaign?: CampaignData
}

/** `codex-nix-lvl7.json` — the name the file lands under. */
export function characterFileName(character: Character): string {
  const safeName = character.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  return `codex-${safeName}-lvl${character.level}.json`
}

/** The bytes. Split from the download so it can be tested without a DOM —
 *  this repo has no jsdom, and a function that can only be checked by clicking
 *  is a function that does not get checked. */
export function characterFileText(character: Character, campaign?: CampaignData | null): string {
  const payload: CharacterFile = campaign ? { ...character, campaign } : { ...character }
  return JSON.stringify(payload, null, 2)
}

/** Hand the file to the browser. The only part that needs a document. */
export function downloadCharacterFile(character: Character): void {
  /* Read here rather than taken as an argument so that neither caller can
     forget it — forgetting it is the entire bug this file exists to close, and
     a parameter is a thing that can be omitted. */
  const campaign = character.campaignId ? loadCampaign(character.campaignId) : null
  const blob = new Blob([characterFileText(character, campaign)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = characterFileName(character)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
