/* ============================================================================
   THE BROWSER HARNESS — the plumbing, so `flows.mjs` can be read by a human.

   Nothing in here asserts anything. It only knows how to open the real app in
   a real phone-sized browser and how to read the handful of things the checks
   care about: the hit-point bar, the four economy bands, a single option row.

   Two things about this repo that this file has to work around:

     Playwright is not a dependency.  It is not in `node_modules` and it must
     not become a dependency, because installing it would change the lockfile
     and this whole exercise is meant to add no risk to the app. It is resolved
     out of the npx cache instead, with the same preamble the repo already uses
     at `docs/plans/codex-v1/reference/_shot-import.mjs:1-9`.

     The app installs a service worker.  Left alone it serves the previous
     build from cache and a check could pass against yesterday's code. Every
     context sets `codex-sw-off` before the first byte of the page runs.
   ========================================================================== */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync } from 'node:fs'

const req = createRequire(import.meta.url)
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx'

function npxPaths() {
  try {
    return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)
  } catch {
    return []
  }
}

/** Playwright, from wherever this machine actually keeps it. */
export async function loadChromium() {
  const paths = [process.cwd(), ...npxPaths()]
  let resolved
  try {
    resolved = req.resolve('playwright', { paths })
  } catch {
    throw new Error(
      'Playwright could not be found. The safety net drives the real app in a real browser, ' +
        'so it needs Playwright available either in node_modules or in the npx cache at ' +
        `${npxRoot}. Running \`npx playwright@latest --version\` once is enough to put it there.`,
    )
  }
  const pw = await import(pathToFileURL(resolved).href)
  const chromium = pw.chromium ?? pw.default?.chromium
  if (!chromium) throw new Error(`Playwright loaded from ${resolved} but exposed no chromium build.`)
  return chromium
}

/** The phone this app is designed for. Every check runs at this size, because
 *  several of the controls only exist in the narrow layout. */
export const VIEWPORT = { width: 390, height: 844 }

/**
 * A brand-new browser profile with nothing remembered — except whatever `seed`
 * says was in local storage, which is how a check says "pretend the app was
 * closed and opened again".
 */
export async function newContext(browser, { seed = null } = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  })
  await ctx.addInitScript(payload => {
    localStorage.setItem('codex-sw-off', '1')
    if (payload) for (const [k, v] of Object.entries(payload)) localStorage.setItem(k, v)
  }, seed)
  return ctx
}

/** Open the app and wait for it to settle. */
export async function openApp(ctx, baseUrl) {
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)
  const crashes = []
  page.on('pageerror', e => crashes.push(String(e)))
  page.crashes = crashes
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  return page
}

/* -- reading the screen ---------------------------------------------------- */

/** Everything on screen, as a person would read it out. */
export const screenText = async page =>
  (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()

/** "3 of 67" or "3 of 67, bloodied" — the hit-point bar's own words. */
export const hitPoints = page =>
  page.locator('[role=progressbar][aria-label="Hit points"]').first().getAttribute('aria-valuetext')

/**
 * The four economy bands, as numbers rather than as a wall of text.
 * `{ ACTION: { ready: 7, open: true, spent: false, text: '...' }, ... }`
 */
export const bands = page =>
  page.evaluate(() => {
    const out = {}
    document.querySelectorAll('button').forEach(b => {
      const t = (b.innerText || '').replace(/\s+/g, ' ').trim()
      const m = /^(ACTION|BONUS|REACTION|MOVEMENT) (\d+)/.exec(t)
      if (!m) return
      out[m[1]] = {
        ready: Number(m[2]),
        open: /\bOPEN\b/.test(t),
        spent: /\bSPENT\b/.test(t),
        text: t.slice(0, 90),
      }
    })
    return out
  })

/** How many of each band are ready — the short form most checks want. */
export async function readiness(page) {
  const b = await bands(page)
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.ready]))
}

/**
 * One option row on the turn screen, found by the name printed on it.
 *
 * Deliberately structural rather than `hasText`. `hasText` matches against the
 * whole row's text, where the name is glued to its badges — "Blesscompetes" —
 * so a word-boundary match on the name finds nothing. `span.anm` is the row's
 * name and only the row's name.
 */
export const row = (page, name) =>
  page
    .locator('button.act, button.acthit')
    .filter({ has: page.locator('span.anm', { hasText: new RegExp(`^${escapeRe(name)}$`) }) })
    .first()

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Confirm the option the turn screen is currently offering to spend. */
export async function confirmSpend(page) {
  await page.locator('button').filter({ hasText: /^Spend/ }).first().click()
  await page.waitForTimeout(800)
}

/** Pick an option and pay for it. */
export async function useOption(page, name) {
  await row(page, name).click()
  await page.waitForTimeout(450)
  await confirmSpend(page)
}

/** The number pad that damage / healing / temp HP all share. */
export async function applyNumber(page, ariaLabel, value) {
  await page.getByRole('button', { name: ariaLabel }).click()
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: `Set value to ${value}`, exact: true }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.waitForTimeout(800)
}

/* -- reading what was actually written ------------------------------------- */

/** Everything the app has stored, as raw strings — the thing a reload reads. */
export const storage = page => page.evaluate(() => ({ ...localStorage }))

/** The saved encounter — whether combat is running, and what is spent. */
export const combatRecord = page =>
  page.evaluate(() => {
    const id = localStorage.getItem('codex-active-id')
    const raw = id && localStorage.getItem(`codex-combat-${id}`)
    return raw ? JSON.parse(raw) : null
  })

/** The saved character record itself, parsed. */
export const savedCharacter = page =>
  page.evaluate(() => {
    const id = localStorage.getItem('codex-active-id')
    const raw = id && localStorage.getItem(`codex-character-${id}`)
    return raw ? JSON.parse(raw) : null
  })

/** Rewrite the seeded character before the app ever sees it, so a check can
 *  start from a state the app would take an hour of play to reach. */
export function seedWith(seed, mutate) {
  const key = Object.keys(seed).find(k => k.startsWith('codex-character-'))
  if (!key) throw new Error('the seed carries no character record')
  const character = JSON.parse(seed[key])
  mutate(character)
  return { ...seed, [key]: JSON.stringify(character) }
}
