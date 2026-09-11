import { NIX } from '../../../src/lib/turn/fixtures/nix.ts'
import { featureFacts } from '../../../src/lib/canon/feature.ts'
import { featureContextOf } from '../../../src/lib/turn/overlay.ts'
import { featureByName } from '../../../src/lib/canon/lookup.ts'
const ctx = featureContextOf(NIX)
console.log('ctx:', JSON.stringify(ctx))
for (const n of ['Flaming Cloak','Hearthfire Manifest']) {
  const f = featureByName(n)
  console.log('\n=== ' + n + ' → canon:', f?.name)
  for (const fact of featureFacts(f, ctx)) {
    console.log('   ', fact.key, '|', fact.shape, '|', JSON.stringify(fact.value), '| raw:', JSON.stringify(fact.raw))
  }
}
