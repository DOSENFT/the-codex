/* Slice 3 ground truth. What WORDS does each Hearthfire-derived option carry,
 * on his real export and on the nix.ts fixture, and what does each one pay?
 *
 * Run: npx vite-node docs/plans/reactions/measure-slice3.mjs
 *
 * The question this answers is the one the slice turns on: `tempHPGrantOf` is
 * gated on `cost.resourcePoolId`, and his sheet has `resourcePools: []`, so the
 * gate refuses every option he owns. Untying it needs a replacement that still
 * separates the face that grants from the two that do not — so first, measure
 * which options exist and what each of them actually says.
 */
import { createRequire } from 'node:module'
import { composeTurn } from '../../../src/lib/turn/compose.ts'
import { createCombatState } from '../../../src/lib/combat-state.ts'
import { resolveCharacter } from '../../../src/lib/rules-2024/derive.ts'
import { featureContextOf, overlayCanon } from '../../../src/lib/turn/overlay.ts'
import { categorizeTurnOptions } from '../../../src/lib/turn/options.ts'
import { featureFacts } from '../../../src/lib/canon/feature.ts'
import { featureByName } from '../../../src/lib/canon/lookup.ts'
import { facesOf } from '../../../src/lib/turn/faces.ts'
import { activeRetaliation } from '../../../src/lib/turn/retaliation.ts'
import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'

const require = createRequire(import.meta.url)
const HIS = resolveCharacter(require('c:/Users/marcu/Downloads/codex-nix-lvl7 (2) (1).json'))

const line = (s) => console.log(s)
const hr = (t) => line('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)))

const HEARTH = /hearthfire|cloak|manifest/i

function dump(label, character) {
  hr(label)
  const combat = createCombatState(character)
  const turn = composeTurn({ character, combat })
  const all = [...turn.ranked, ...turn.rest, ...turn.mutex.flatMap((g) => g.faces)]
  const seen = new Set()
  for (const o of all) {
    if (seen.has(o.id) || !HEARTH.test(o.name)) continue
    seen.add(o.id)
    line(`  · ${o.name}`)
    line(`      slot=${o.cost.slot}  pool=${o.cost.resourcePoolId ?? 'NONE'}  grantsTempHP=${o.grantsTempHP ?? 'none'}`)
    line(`      detail: ${JSON.stringify(o.detail)}`)
  }
  line(`  sheet features: ${(character.features ?? []).filter((f) => HEARTH.test(f.name)).map((f) => f.name).join(', ') || 'none'}`)
  for (const f of (character.features ?? []).filter((f) => HEARTH.test(f.name))) {
    line(`      "${f.name}".description = ${JSON.stringify(f.description ?? null)}`)
  }
  line(`  resourcePools: ${JSON.stringify((character.resourcePools ?? []).map((p) => p.id ?? p.name))}`)
  line(`  tempHP=${character.tempHP} source=${JSON.stringify(character.tempHPSource ?? null)}`)
  line(`  activeRetaliation → ${JSON.stringify(activeRetaliation(character, featureContextOf(character)))}`)
}

dump('HIS REAL EXPORT', HIS)
dump('nix.ts FIXTURE', NIX)

hr('the WORDS each SHEET option carries, after the overlay')
for (const [label, character] of [['HIS', HIS], ['NIX', NIX]]) {
  const sheet = categorizeTurnOptions(character, { includeUnaffordable: true })
  for (const bucket of Object.keys(sheet)) {
    for (const raw of sheet[bucket]) {
      if (!HEARTH.test(raw.name)) continue
      const o = overlayCanon(raw, character)
      line(`  ${label} [${bucket}] ${o.name}`)
      line(`      declaredActionType=${JSON.stringify((character.features ?? []).find((f) => f.name === o.name)?.actionType ?? null)}`)
      line(`      canonFaces=${o.canonFaces?.length ?? 0}  canonEconomy=${o.canonEconomy ?? 'none'}`)
      line(`      mechanicsLine=${JSON.stringify(o.mechanicsLine ?? null)}`)
      line(`      effectsLine=${JSON.stringify(o.effectsLine ?? null)}`)
      line(`      summary=${JSON.stringify(o.summary ?? null)}`)
    }
  }
}

hr('canon: the faces, and which one says the words')
const feature = featureByName('Hearthfire Manifest')
for (const face of facesOf(feature)) {
  line(`  [${face.economy}] ${JSON.stringify(face.text)}`)
}
hr('canon: the tempHP fact, resolved against him')
for (const fact of featureFacts(feature, featureContextOf(HIS))) {
  if (fact.key !== 'tempHP') continue
  line(`  ${JSON.stringify(fact)}`)
}
