/* ===========================================================================
   THE SWALLOWED ERROR, AS PAINTED — proof for the Toybox AI repair.

   The unit tests prove `aiErrorMessage`. The source scan proves ToyboxPanel
   calls it. NEITHER proves the sentence reaches the glass, and finding BM is
   explicit that a correct function the app does not paint is a half-built
   feature running as if done. This drives the real app in a real Chrome and
   reads what a person would actually see.

   NOTHING IS SPENT. Every request to the model host is intercepted and
   answered locally, so the key is never used and no quota is touched — which
   is also the only way to force the exact failure on demand. Two cases:

     chatty   200 with prose where JSON was required  → the model's own words
     retired  404 naming its replacement model        → the replacement's name

   Both were previously painted as "AI suggestion failed. Check your AI
   settings and try again." — advice that is wrong in both cases.

   Finding Q: claims about the screen are geometric. The error is located by
   its own element's box, checked for area, and confirmed topmost at its own
   centre via elementFromPoint. `textContent` proves the model, not the screen.
   ========================================================================= */
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { loadNix } from '../codex-v1/reference/nix-seed.mjs'

const BASE = process.argv[2] ?? 'http://localhost:4321'

/* Playwright is not a dependency of this repo; it lives wherever npx last put
   it. Resolved the same way every other probe in these plan folders does it —
   see sheet-truth/_probe-phase-close.mjs:33. */
const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'
const paths = [
  process.cwd(),
  'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`) } catch { return [] } })(),
]
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href)
const chromium = pw.chromium ?? pw.default?.chromium

const CASES = [
  {
    id: 'chatty',
    what: 'the model answered, in prose, where JSON was required',
    fulfil: {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Sure! Here are some combo ideas for your paladin:" }] } }],
      }),
    },
    mustContain: 'Sure! Here are some combo ideas',
    mustNotContain: 'Check your AI settings',
  },
  {
    id: 'retired',
    what: 'the model was retired, and the 404 body names its replacement',
    fulfil: {
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 404,
          message:
            'models/gemini-2.0-flash is not found for API version v1beta. Please update your code to use models/gemini-2.5-flash instead.',
        },
      }),
    },
    mustContain: 'gemini-2.5-flash',
    mustNotContain: 'Check your AI settings',
  },
]

const browser = await chromium.launch()
const results = []

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  // Every call to the model host is answered here. The key never leaves.
  let intercepted = 0
  await page.route('**://generativelanguage.googleapis.com/**', async route => {
    const url = route.request().url()
    // The model LIST is a different question from the model CALL; answering it
    // lets resolveGeminiModel settle so the failure under test is the one the
    // case is about, rather than an earlier one about discovery.
    if (url.includes('/models?') || /\/models$/.test(url.split('?')[0])) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [{ name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] }],
        }),
      })
    }
    intercepted++
    return route.fulfill(c.fulfil)
  })

  const seed = await loadNix()
  const id = seed.id
  await page.addInitScript(
    ([seedJson, id]) => {
      localStorage.setItem('codex-character-' + id, seedJson)
      localStorage.setItem('codex-active-id', id)
      localStorage.setItem('codex-roster', JSON.stringify([{ id, name: 'Nix' }]))
      localStorage.setItem(
        'codex-ai-config',
        JSON.stringify({
          provider: 'gemini',
          geminiApiKey: 'PROBE-KEY-NEVER-SENT',
          geminiModel: 'gemini-2.0-flash',
          fallbackEnabled: false,
        }),
      )
    },
    [JSON.stringify(seed), id],
  )

  await page.goto(BASE, { waitUntil: 'networkidle' })

  // Open the Toybox. Located by accessible name, not by nth-child.
  const opener = page.locator('[aria-label*="Toybox" i], button:has-text("Toybox")').first()
  await opener.click({ timeout: 15000 })
  await page.waitForTimeout(400)

  /* Red is not rare on this screen — the Damage buttons are red, and they are
     already painted before anything is asked of the model. So the set of red
     strings is snapshotted BEFORE the click, and the wait is for a red string
     that was not there before. Waiting on `.text-red-400` itself passed
     instantly against a Damage button and read the panel before the answer
     came back: the `chatty` case survived that only because a 200 fails its
     JSON parse immediately, while `retired` costs a model-list round trip
     first. The probe was reporting its own impatience as the app's silence. */
  const before = await page.evaluate(() =>
    [...document.querySelectorAll('.text-red-400')].map(el => (el.textContent ?? '').trim()),
  )

  // The AI suggest control.
  const suggest = page.locator('button:has-text("AI Suggest"), button:has-text("Suggest")').first()
  await suggest.click({ timeout: 15000 })

  await page
    .waitForFunction(
      seen => [...document.querySelectorAll('.text-red-400')].some(el => !seen.includes((el.textContent ?? '').trim())),
      before,
      { timeout: 15000 },
    )
    .catch(() => {})

  /* The geometric read. A string is only "painted" if its own element has a
     box with area and is the topmost thing at its own centre. */
  const painted = await page.evaluate(seen => {
    const out = []
    for (const el of document.querySelectorAll('.text-red-400')) {
      if (seen.includes((el.textContent ?? '').trim())) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const top = document.elementFromPoint(cx, cy)
      out.push({
        text: (el.textContent ?? '').trim(),
        box: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
        topmost: !!top && (el === top || el.contains(top) || top.contains(el)),
      })
    }
    return out
  }, before)

  const all = painted.map(p => p.text).join(' ⏎ ')
  const visible = painted.filter(p => p.topmost)
  results.push({
    case: c.id,
    what: c.what,
    intercepted,
    painted: visible,
    hasSignal: all.includes(c.mustContain),
    hasGeneric: all.includes(c.mustNotContain),
  })

  await page.screenshot({ path: `docs/plans/toybox-ai/shots/ai-error-${c.id}.png`, fullPage: false })
  await ctx.close()
}

await browser.close()

console.log('\n=== TOYBOX AI ERROR, AS PAINTED ===\n')
let ok = true
for (const r of results) {
  console.log(`[${r.case}] ${r.what}`)
  console.log(`  model calls intercepted : ${r.intercepted} (nothing left this machine)`)
  for (const p of r.painted) console.log(`  painted  : "${p.text}"  [${p.box}] topmost=${p.topmost}`)
  console.log(`  names the real fault    : ${r.hasSignal ? 'YES' : 'NO'}`)
  console.log(`  still blames Settings   : ${r.hasGeneric ? 'YES' : 'no'}`)
  console.log()
  if (!r.hasSignal || r.hasGeneric) ok = false
}
console.log(ok ? 'ALL CASES: the app names the fault.' : 'FAILED: a case is still swallowing.')
process.exit(ok ? 0 : 1)
