/* Does this file import anything it no longer uses? tsc will not say, because
   noUnusedLocals is off in this project. Deleting three components by hand is
   exactly when that matters. Self-checking: a name known to be used must be
   reported used, or the probe is lying. */
import fs from 'node:fs'

const p = process.argv[2]
const src = fs.readFileSync(p, 'utf8')
const ms = [...src.matchAll(/^import[\s\S]*?from\s+'[^']+'\r?$/gm)]
const cut = ms.at(-1).index + ms.at(-1)[0].length
const head = src.slice(0, cut)
const body = src.slice(cut)

const names = [...new Set([...head.matchAll(/[{,]\s*([A-Za-z_]\w*)(?=\s*[,}])/g)].map(m => m[1]))]
const used = n => new RegExp(`\\b${n}\\b`).test(body)

// control: if nothing at all reads as used, the probe is broken, not the file
const usedCount = names.filter(used).length
if (usedCount === 0) {
  console.error(`PROBE BROKEN: 0 of ${names.length} imports read as used in a ${body.split('\n').length}-line body`)
  process.exit(2)
}

const dead = names.filter(n => !used(n))
console.log(`${p}\n  ${names.length} named imports · ${usedCount} used`)
console.log(`  unused: ${dead.length ? dead.join(', ') : '(none)'}`)
process.exit(dead.length ? 1 : 0)
