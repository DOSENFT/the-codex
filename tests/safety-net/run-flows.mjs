#!/usr/bin/env node
/* ============================================================================
   THE RUNNER — starts the app, walks every flow in `flows.mjs`, and says
   plainly which ones still work.

   It owns its own dev server on a port nothing else uses, so running the
   safety net never depends on you having remembered to start one, and never
   collides with the server you are already working in. If you DO want it to
   use a server you have running, set CODEX_SAFETY_URL and it will.

   Output is one line per flow. Anything that fails prints what it expected and
   what it actually got, in the words of the check. The process exits non-zero
   if a single check anywhere failed, so this is safe to put in front of a
   commit or a deploy.
   ========================================================================== */

import { spawn } from 'node:child_process'
import { env, execPath, exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { loadChromium, newContext, openApp } from './browser.mjs'
import { flows } from './flows.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PORT = Number(env.CODEX_SAFETY_PORT ?? 5199)
const EXTERNAL = env.CODEX_SAFETY_URL ?? null
const BASE = EXTERNAL ?? `http://localhost:${PORT}/the-codex/`

const show = v => (typeof v === 'string' ? JSON.stringify(v) : (JSON.stringify(v) ?? String(v)))

/* -- the dev server -------------------------------------------------------- */

async function reachable(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    return res.ok
  } catch {
    return false
  }
}

async function startServer() {
  if (EXTERNAL) {
    if (!(await reachable(BASE))) {
      throw new Error(`CODEX_SAFETY_URL is set to ${BASE} but nothing is answering there.`)
    }
    console.log(`using the server already running at ${BASE}`)
    return null
  }

  const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(vite)) throw new Error(`Vite is not installed — ${vite} does not exist. Run npm install.`)

  const child = spawn(execPath, [vite, '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const noise = []
  child.stdout.on('data', d => noise.push(String(d)))
  child.stderr.on('data', d => noise.push(String(d)))

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`the dev server quit before it was ready:\n${noise.join('')}`)
    }
    if (await reachable(BASE)) {
      console.log(`dev server up on ${BASE}`)
      return child
    }
    await new Promise(r => setTimeout(r, 400))
  }
  child.kill()
  throw new Error(`the dev server never came up on ${BASE}:\n${noise.join('')}`)
}

/* -- running one flow ------------------------------------------------------ */

function recorder() {
  const failures = []
  let count = 0
  const api = {
    is(label, actual, expected) {
      count++
      if (!isDeepStrictEqual(actual, expected)) {
        failures.push(`${label}\n         expected ${show(expected)}\n         but got  ${show(actual)}`)
      }
    },
    has(label, haystack, needle) {
      count++
      if (typeof haystack !== 'string' || !haystack.includes(needle)) {
        failures.push(
          `${label}\n         expected to find ${show(needle)}\n         in ${show(String(haystack).slice(0, 400))}`,
        )
      }
    },
  }
  return { api, failures, counted: () => count }
}

async function runFlow(flow, { browser, seed, onSeed }) {
  const { api, failures, counted } = recorder()
  const contexts = []

  const open = async override => {
    const ctx = await newContext(browser, { seed: override ?? null })
    contexts.push(ctx)
    return openApp(ctx, BASE)
  }

  const t = {
    ...api,
    browser,
    baseUrl: BASE,
    seed,
    open,
    setSeed: onSeed,
    page: null,
  }

  try {
    if (flow.seeded !== false && !seed) {
      throw new Error(
        'this check needs a character, and the import check — which provides one — did not finish.',
      )
    }
    t.page = await open(flow.seeded === false ? null : seed)
    await flow.run(t)
    if (t.page.crashes?.length) {
      failures.push(`the page threw an error while this ran\n         ${t.page.crashes[0].slice(0, 300)}`)
    }
  } catch (err) {
    failures.push(`the flow could not be completed\n         ${String(err?.message ?? err).split('\n')[0]}`)
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => {})
  }

  return { failures, checks: counted() }
}

/* -- the run --------------------------------------------------------------- */

let server = null
let browser = null
let failedFlows = 0
let totalChecks = 0

try {
  server = await startServer()
  const chromium = await loadChromium()
  browser = await chromium.launch()

  console.log('')
  console.log(`safety net — ${flows.length} flows, driving the real app at ${BASE}`)
  console.log('')

  let seed = null
  for (const flow of flows) {
    const started = Date.now()
    const { failures, checks } = await runFlow(flow, {
      browser,
      seed,
      onSeed: s => {
        seed = s
      },
    })
    totalChecks += checks
    const secs = ((Date.now() - started) / 1000).toFixed(1)
    if (failures.length === 0) {
      console.log(`PASS  ${flow.name}  (${checks} checks, ${secs}s)`)
    } else {
      failedFlows++
      console.log(`FAIL  ${flow.name}  (${failures.length} of ${checks} checks failed, ${secs}s)`)
      for (const f of failures) console.log(`       - ${f}`)
      console.log(`       what this protects: ${flow.protects}`)
    }
  }

  console.log('')
  console.log(
    failedFlows === 0
      ? `ALL PASS — ${flows.length} flows, ${totalChecks} checks, nothing broken.`
      : `FAILED — ${failedFlows} of ${flows.length} flows broke (${totalChecks} checks run). See tests/safety-net/README.md.`,
  )
  console.log('')
} catch (err) {
  console.error('')
  console.error(`the safety net could not run at all: ${err?.message ?? err}`)
  console.error('')
  failedFlows = failedFlows || 1
} finally {
  if (browser) await browser.close().catch(() => {})
  if (server) server.kill()
}

exit(failedFlows === 0 ? 0 : 1)
