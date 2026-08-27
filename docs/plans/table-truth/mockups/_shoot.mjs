// Shoots every mockup in this folder to a PNG beside it.
//   node docs/plans/table-truth/mockups/_shoot.mjs
// Throwaway, same as the mockups. Not part of the app build.
// Playwright stays a reference tool resolved from the npx cache, never a trunk
// dependency — the app must build on a machine that has never heard of it.
import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const searchPaths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => {
    try { return readdirSync(npxRoot).map((d) => `${npxRoot}/${d}/node_modules`) }
    catch { return [] }
  })(),
]
let chromium
try {
  const entry = req.resolve('playwright', { paths: searchPaths })
  const mod = await import(pathToFileURL(entry).href)
  chromium = mod.chromium ?? mod.default?.chromium
  if (!chromium) throw new Error('resolved playwright but found no chromium export')
} catch {
  console.error('playwright not found. Run:  npx --yes playwright install chromium')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(here).filter((f) => f.endsWith('.html')).sort()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 })

for (const f of files) {
  await page.goto(pathToFileURL(join(here, f)).href)
  await page.waitForTimeout(250)
  const out = join(here, f.replace(/\.html$/, '.png'))
  await page.screenshot({ path: out, fullPage: true })
  const errs = []
  console.log(`  ${f} -> ${out.split(/[\\/]/).pop()}${errs.length ? ' ERRORS' : ''}`)
}

await browser.close()
console.log(`\n${files.length} mockups shot.`)
