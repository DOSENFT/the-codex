/* ============================================================================
   GeminiModelPicker.test.ts — the sentence that made Gemini look bad
   ----------------------------------------------------------------------------
   Marcus, 2026-09-09: "gemini just sucks. Not even worth having on it tbh."

   He was on Automatic, and Automatic's description said "The newest one your
   key can reach". `rankGeminiModels` sorts by TIER before version — flash,
   flash-lite, other flash, then pro — so Automatic picks an older FLASH over a
   newer PRO, always. The ranking is right (flash carries the generous free
   quota, so it is the one still answering at 9pm); the sentence describing it
   was wrong, and the cost of that wrong sentence was him judging Gemini by the
   cheapest model Google offers without ever knowing Pro was one tap away.

   These tests hold the copy to the code. Change the ranking and the copy has
   to move with it, or this goes red.
   ========================================================================== */
import { describe, it, expect } from 'vitest'
import { rankGeminiModels } from '../lib/ai'
import { AUTOMATIC } from './GeminiModelPicker'

describe('Automatic — the copy says what the ranking actually does', () => {
  it('prefers an older flash to a newer pro', () => {
    // THE FACT THE OLD COPY DENIED. 1.1 beats 9.9 here, on purpose.
    //
    // Both ids are fictional, and that is a rule rather than a flourish: the
    // suite has a guard (`22 — no model id is compiled into this app`) that
    // fails if any real, retired id appears anywhere under src/. It caught the
    // first draft of this very line.
    expect(rankGeminiModels(['gemini-9.9-pro', 'gemini-1.1-flash'])[0]).toBe('gemini-1.1-flash')
  })

  it('does not claim to pick the newest thing available', () => {
    expect(AUTOMATIC.description.toLowerCase()).not.toContain('newest')
  })

  it('names the trade it is making and the way out of it', () => {
    // Quota is the reason for the default; Pro is the answer to "this is
    // weak". A person reading one line has to be able to get to both.
    expect(AUTOMATIC.description.toLowerCase()).toContain('quota')
    expect(AUTOMATIC.description).toContain('Pro')
  })

  it('is still the empty id, which is what "ask every time" is stored as', () => {
    // If this ever gains an id, the app ships a model name again — the exact
    // thing that 404'd every AI feature when Google retired one.
    expect(AUTOMATIC.id).toBe('')
  })
})
