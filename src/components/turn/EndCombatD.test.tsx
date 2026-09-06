import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement, ReactNode } from 'react'
import { EndCombatD, EndCombatDoor } from './EndCombatD'
import { TurnVerbs } from './TurnRail'

/* ============================================================================
   SLICE R7 — THE SECOND TAP, REBUILT IN D.

   Measured on Marcus's own export, 2026-09-05 (`_diag-endcombat.mjs`): one tap
   on «End combat» took `inCombat true -> false` and `round 3 -> 1` and rewrote
   `codex-combat-<id>`, with nothing asked. The old deck's button only ARMED —
   `EndCombatConfirm` was the thing that ended the fight — and that component
   still exists, still passes its four tests, and is mounted nowhere. The D
   phase moved the verb to `TurnVerbs` and wired the irreversible call straight
   to the first tap. This restores the guard, in D.

   ── WHY THERE IS AN `EndCombatDoor` THAT THE DESIGN DID NOT NAME ───────────
   03-program-design.md put the armed/unarmed branch inside `TurnVerbs`. That
   branch is the whole mechanism, and `TurnVerbs` calls `useDiceDock` — a
   `useContext` — so it cannot be invoked outside a renderer, and this repo has
   no jsdom. Left there, the one destructive control in the tab would be pinned
   only by the SHAPE of its markup: no test could press it. `renderToStaticMarkup`
   emits no handlers, so "the first tap arms and does not end" would have been
   unprovable in this suite, which is exactly the claim that must not rot.

   So the branch lives in a hook-free component of its own. `EndCombatDoor(props)`
   is then an ordinary function returning an element tree, `press()` below walks
   that tree and calls the real `onClick`, and the claim is tested rather than
   inferred. `TurnVerbs` renders it and keeps the props the design specified.

   ── WHAT IS RED, AND WHY ───────────────────────────────────────────────────
   Every test here is red against the R6 build for the substantive reason, not
   merely because the import is missing: `TurnVerbs` had no `endArmed`,
   `onArmEndCombat` or `onCancelEndCombat`, and its button's `onClick` WAS
   `onEndCombat`. Test 11 is the one guard rather than a new claim — it pins the
   fallback that keeps `TurnRail.test.tsx` and the read-only design-shoot card
   (which supply no arm handler) meaning what they meant.
   ========================================================================== */

const noop = () => {}

/** Tags removed, NOTHING put in their place — what `textContent` reports.
 *  Finding AY's lesson, carried over from `EndCombat.test.tsx`: a stripper that
 *  substitutes a space is more generous than the DOM, and an assertion about
 *  glued words would pass over the fault. */
const domText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim()

/** Every element in a returned tree, parents before children.
 *
 *  This is the substitute for a DOM, and it is honest about being one: it walks
 *  only what the component itself returned, so it cannot see through a nested
 *  function component. That is why the armed-side presses go at `EndCombatD`
 *  directly rather than at `EndCombatDoor` — the door returns `<EndCombatD/>`
 *  unrendered, and pressing something React has not called yet would be
 *  pressing a plan, not a button. */
function flatten(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number')
    return out
  if (Array.isArray(node)) {
    for (const n of node) flatten(n as ReactNode, out)
    return out
  }
  const el = node as ReactElement
  if (typeof el !== 'object' || !('props' in el)) return out
  out.push(el)
  flatten((el.props as { children?: ReactNode }).children, out)
  return out
}

/** Find the control by its ACCESSIBLE NAME and fire its real handler.
 *
 *  By name and never by class: `.rbtn.end` is worn by BOTH «End combat» and
 *  «Start Combat», and asking for the class instead of the name is precisely
 *  the mistake that made a working exclusivity look like a regression on
 *  2026-09-05. The name is the claim. */
function press(tree: ReactNode, label: string): void {
  const hit = flatten(tree).find(
    el => (el.props as { 'aria-label'?: string })['aria-label'] === label,
  )
  if (!hit) throw new Error(`no control named "${label}" in this tree`)
  const onClick = (hit.props as { onClick?: () => void }).onClick
  if (!onClick) throw new Error(`the control named "${label}" has no onClick`)
  onClick()
}

describe('slice R7 — the first tap arms, and does not end the fight', () => {
  it('1. an unarmed press calls onArm, and never the irreversible handler', () => {
    /* THE WHOLE SLICE, in one assertion pair. `combat.endEncounter` finalises
       the damage log and calls `forgetCombat`, which removes the stored fight
       from disk. It must not be reachable in one gesture. */
    const onArm = vi.fn()
    const onConfirm = vi.fn()
    press(
      EndCombatDoor({ armed: false, onArm, onCancel: noop, onConfirm }),
      'End combat',
    )
    expect(onArm).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('2. nothing irreversible is mounted before that tap', () => {
    const html = renderToStaticMarkup(
      <EndCombatDoor armed={false} onArm={noop} onCancel={noop} onConfirm={noop} />,
    )
    expect(html).not.toContain('End combat confirmation')
    expect(html).not.toContain('aria-label="End combat — confirm"')
    expect(domText(html)).not.toContain('End the encounter?')
  })

  it('7. the arming button is GONE while armed — the row never offers two', () => {
    /* Two live controls both reading "End combat" is one control as far as a
       screen reader is concerned, and a coin toss as far as a thumb is. */
    const armed = renderToStaticMarkup(
      <EndCombatDoor armed onArm={noop} onCancel={noop} onConfirm={noop} />,
    )
    expect(armed).not.toContain('aria-label="End combat"')
    expect(armed).toContain('aria-label="End combat — confirm"')
  })
})

describe('slice R7 — the strip says what it will cost before it costs it', () => {
  const html = renderToStaticMarkup(<EndCombatD onKeepGoing={noop} onConfirm={noop} />)
  const text = domText(html)

  it('3. armed, a named confirmation group appears', () => {
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="End combat confirmation"')
  })

  it('4. it names the cost, not «are you sure»', () => {
    /* A confirm that only asks "are you sure?" moves the decision without
       informing it. Each of these is a real effect of `handleEndCombat`. The
       sentence is carried over verbatim from `EndCombatConfirm` because it was
       already right, and it is already pinned by that component's own tests. */
    expect(text).toContain('End the encounter?')
    expect(text).toContain('damage log is saved')
    expect(text).toContain('round counter')
    expect(text).toContain('concentration')
    expect(text).toContain('spent economy')
    expect(text).not.toContain('Are you sure')
  })

  it('5. two doors, named apart', () => {
    expect(html).toContain('aria-label="Keep fighting"')
    expect(html).toContain('aria-label="End combat — confirm"')
    expect(text).toContain('Keep going')
    expect(text).toContain('End combat')
  })

  it('6. the way OUT is first — the safe door is the one under the thumb', () => {
    expect(html.indexOf('aria-label="Keep fighting"')).toBeLessThan(
      html.indexOf('aria-label="End combat — confirm"'),
    )
  })

  it('8. both doors are thumb-sized — .rbtn is the 48px floor', () => {
    /* V-5b: `.dturn .rbtn` sets `min-height: var(--d-touch-goal)` AND a 48px
       min-width. Asserting the class is asserting the rule, in the one place
       the rule is written. */
    expect((html.match(/class="rbtn\b/g) ?? []).length).toBe(2)
    expect(text).not.toContain('…')
    expect(text).not.toContain('...')
  })

  it('10. it is D, and not a Tailwind strip smuggled back in', () => {
    /* The ruling was REBUILD, not remount. `EndCombatConfirm` paints
       `red-500/40`, `text-forge-1` and `rounded-xl`, none of which exist in
       this design system — a copy-paste would look wrong beside every other
       control on the card and would not answer the contrast floor below. */
    expect(html).not.toContain('red-500')
    expect(html).not.toContain('text-forge')
    expect(html).not.toContain('rounded-xl')
    expect(html).not.toContain('min-h-[44px]')
  })

  it('presses the doors it drew — Keep going cancels, the second door ends it', () => {
    const onKeepGoing = vi.fn()
    const onConfirm = vi.fn()
    const tree = EndCombatD({ onKeepGoing, onConfirm })

    press(tree, 'Keep fighting')
    expect(onKeepGoing).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    press(tree, 'End combat — confirm')
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onKeepGoing).toHaveBeenCalledTimes(1)
  })
})

describe('slice R7 — the flag is a prop, and the verb row still obeys the old law', () => {
  it('9. armed is ignored out of combat — a stale flag cannot paint a confirm', () => {
    /* `endArmed` lives in `TurnLive` and is cleared there. Test 9 makes a flag
       that survives the end of a fight HARMLESS TO LOOK AT rather than merely
       unlikely: out of combat the only true next thing is to start one. */
    const html = renderToStaticMarkup(
      <TurnVerbs
        inCombat={false}
        endArmed
        onStartCombat={noop}
        onEndCombat={noop}
        onArmEndCombat={noop}
        onCancelEndCombat={noop}
      />,
    )
    expect(domText(html)).toContain('Start Combat')
    expect(html).not.toContain('End combat confirmation')
    expect(html).not.toContain('aria-label="End combat')
  })

  it('9b. in combat and unarmed, the row offers the arming verb and no strip', () => {
    const html = renderToStaticMarkup(
      <TurnVerbs
        inCombat
        endArmed={false}
        onStartCombat={noop}
        onEndCombat={noop}
        onArmEndCombat={noop}
        onCancelEndCombat={noop}
      />,
    )
    expect(html).toContain('aria-label="End combat"')
    expect(domText(html)).not.toContain('Start Combat')
    expect(html).not.toContain('End combat confirmation')
  })

  it('9c. in combat and armed, the strip replaces the verb in place', () => {
    const html = renderToStaticMarkup(
      <TurnVerbs
        inCombat
        endArmed
        onLookup={noop}
        onReset={noop}
        onEndCombat={noop}
        onArmEndCombat={noop}
        onCancelEndCombat={noop}
      />,
    )
    expect(html).toContain('aria-label="End combat confirmation"')
    expect(html).not.toContain('aria-label="End combat"')
    /* IN PLACE, not instead of the row: Look up and Reset survive the arming,
       so the confirm cannot be mistaken for a modal that took the screen. */
    expect(domText(html)).toContain('Look up')
    expect(domText(html)).toContain('Reset')
  })

  it('11. the old caller still works — no arm handler falls back to direct wiring', () => {
    /* `TurnRail.test.tsx` and the read-only design-shoot card supply neither
       `endArmed` nor `onArmEndCombat`. Without this fallback the button would
       stop rendering for them and those renders would quietly change meaning.
       It is also the least confident decision in the design (§3.2): a caller
       who FORGETS the arm handler silently gets one-tap ending back, so
       `TurnLive` — the only caller that can end a real fight — is pinned by
       `prove-sliceR7.mjs` in the browser, not by this fallback. */
    const onConfirm = vi.fn()
    press(EndCombatDoor({ onConfirm }), 'End combat')
    expect(onConfirm).toHaveBeenCalledTimes(1)

    const html = renderToStaticMarkup(<TurnVerbs inCombat onEndCombat={noop} />)
    expect(html).toContain('aria-label="End combat"')
    expect(domText(html)).toContain('End combat')
  })
})
