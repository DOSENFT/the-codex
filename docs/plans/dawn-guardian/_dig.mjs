/* Scratch. Pull every mention of the Dawn Guardian (and the things Marcus says
   it does) out of the vault files, with enough context to judge the source. */
import { readFileSync } from 'node:fs'

const DIR = 'C:/Users/marcu/Downloads/'
const FILES = ['TheVault.html', 'index.html', 'index_V1.html', 'index_V2.html', 'vault-edits.json']
const TERMS = [
  'Dawn Guardian',
  'Radiant Swing',
  'dawn and dusk',
  'attunement',
]

for (const f of FILES) {
  let text
  try { text = readFileSync(DIR + f, 'utf8') } catch { console.log(`-- ${f}: unreadable`); continue }
  console.log(`\n${'='.repeat(70)}\n${f}  (${text.length} chars)`)
  for (const term of TERMS) {
    const hits = []
    let i = -1
    const hay = text.toLowerCase()
    const needle = term.toLowerCase()
    while ((i = hay.indexOf(needle, i + 1)) !== -1) hits.push(i)
    console.log(`\n  [${term}] ${hits.length} occurrence(s)`)
    hits.slice(0, 8).forEach((at, n) => {
      const snip = text.slice(Math.max(0, at - 200), at + 700).replace(/\s+/g, ' ')
      console.log(`\n   #${n + 1} ...${snip}...`)
    })
  }
}
