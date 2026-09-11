import { describe, it } from 'vitest'
import { markFor } from '../src/lib/canon/marks'
import spells from '../src/canon/spells.json'
describe('gap2', () => { it('lists', () => {
  const arr: any[] = (spells as any)
  const av = arr.filter(x => x.castableAtLevel7 && !x.lockedForMarcus)
  const un = av.filter(x => !markFor(x.name))
  console.log('CASTABLE', av.length, 'UNMARKED', un.length)
  for (const x of un) console.log([x.level, x.name, x.school, x.alwaysPrepared ? 'ALWAYS' : x.availability].join(' | '))
  console.log('--- ALSO: unmarked spells NOT castable at 7 ---')
  for (const x of arr.filter(x => !x.castableAtLevel7 && !markFor(x.name))) console.log([x.level, x.name, x.availability].join(' | '))
}) })
