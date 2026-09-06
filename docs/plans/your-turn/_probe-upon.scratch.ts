/* Slice 8d-2, measurement before design. What text does an always-active aura
   actually have, and where does the fuller version live? Throwaway — it asserts
   nothing, it prints. Lives here rather than in `src/` so a stray `vitest run`
   never picks it up. */
import { it } from 'vitest'
import { composeTurn } from '../../../src/lib/turn/compose'
import { NIX } from '../../../src/lib/turn/fixtures/nix'
import { featureByName } from '../../../src/lib/canon/lookup'

it('what the auras say, and what they could say', () => {
  const t = composeTurn({ character: NIX, combat: null })
  for (const u of t.upon) {
    const canon = featureByName(u.name)
    const sheet = (NIX.features ?? []).find(f => f.name === u.name)
    console.log('--------', u.name, '| tone', u.tone, '| known', u.known)
    console.log('  text  :', JSON.stringify(u.text))
    console.log('  canon :', canon ? JSON.stringify(String(canon.rawText).slice(0, 300)) : 'NONE')
    console.log('  sheet :', sheet ? JSON.stringify(String(sheet.description).slice(0, 300)) : 'NONE')
  }
})
