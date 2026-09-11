import { describe, it } from 'vitest'
import { markFor } from '../src/lib/canon/marks'
import { NIX } from '../src/lib/turn/fixtures/nix'
describe('gap', () => { it('lists', () => {
  const sp = (NIX.spells ?? [])
  console.log('SPELLS ON FIXTURE:', sp.length)
  for (const s of sp) console.log([s.prepared ? 'PREP' : '    ', s.level, s.name, markFor(s.name) ? 'HAS-MARK' : '>>> NO MARK'].join(' | '))
}) })
