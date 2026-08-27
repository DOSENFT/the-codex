/* The app's first bundle budget — Table Truth slice 1, test 27.
 *
 *   npm run budget      (runs a build first)
 *
 * WHY THIS EXISTS. Slice 1 adds 343KB of rules JSON to a PWA that is meant to
 * work in a basement with no signal. The service worker precaches every file in
 * dist/assets, so "it's lazy-loaded" is not an answer here — a lazy chunk is
 * downloaded anyway, just later. The only honest control is a number someone has
 * to look at and consciously raise.
 *
 * WHY NOT chunkSizeWarningLimit. Two chunks (index, DiceStage) were already over
 * Vite's default before canon existed. Raising the limit to accommodate canon
 * would have silenced a pre-existing warning while appearing to add rigour.
 *
 * Exits non-zero when a budget is exceeded, so it can gate a release later. It
 * is NOT wired into `npm test`, because the test suite must run without a build.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets')

/* Budgets are GZIPPED KB — what actually crosses the wire and what actually
 * fills the phone's cache. Each number is the measured value at the time it was
 * set, plus headroom, and each carries the date so a future raise is a visible
 * decision rather than a drift. */
const BUDGETS = [
  { name: 'canon', match: /^canon-.*\.js$/, gzipKb: 70, measured: '51.6KB on 2026-08-26' },
  { name: 'total JS', match: /\.js$/, gzipKb: 700, measured: '635.0KB on 2026-08-26' },
  { name: 'total CSS', match: /\.css$/, gzipKb: 40, measured: '25.2KB on 2026-08-26' },
]

let files
try {
  files = readdirSync(ASSETS)
} catch {
  console.error(`No build found at ${ASSETS}. Run \`npm run build\` first.`)
  process.exit(1)
}

const sizes = new Map()
for (const file of files) {
  const path = join(ASSETS, file)
  if (!statSync(path).isFile()) continue
  sizes.set(file, gzipSync(readFileSync(path)).length)
}

let failed = false
console.log('BUNDLE BUDGET — gzipped, which is what crosses the wire\n')

for (const budget of BUDGETS) {
  const matched = [...sizes].filter(([name]) => budget.match.test(name))
  const total = matched.reduce((sum, [, bytes]) => sum + bytes, 0)
  const kb = total / 1024
  const over = kb > budget.gzipKb
  if (over) failed = true

  console.log(
    `${over ? 'OVER  ' : 'ok    '} ${budget.name.padEnd(10)} ` +
      `${kb.toFixed(1).padStart(7)} KB / ${String(budget.gzipKb).padStart(4)} KB  ` +
      `(${matched.length} file${matched.length === 1 ? '' : 's'}; set from ${budget.measured})`
  )
  if (over) {
    for (const [name, bytes] of matched.sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`         ${(bytes / 1024).toFixed(1).padStart(7)} KB  ${name}`)
    }
  }
}

if (failed) {
  console.error(
    '\nA budget was exceeded. Raising it is allowed — raising it silently is not.\n' +
      'Update the number AND its `measured` note in scripts/bundle-budget.mjs.'
  )
  process.exit(1)
}
console.log('\nAll budgets met.')
