/* Which files did vitest actually collect? Throwaway — written because the run
   count went 65 → 68 for two new files, and "the probe under docs/ is in the
   suite" and "some other file is" are different problems. */
import { readFileSync } from 'node:fs'
const r = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const names = r.testResults.map(t => t.name.split('\\').join('/'))
console.log('TOTAL FILES:', names.length)
console.log('NOT UNDER src/:', names.filter(n => !n.includes('/src/')))
