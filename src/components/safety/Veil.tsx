/* ============================================================================
   The veil — the one control in this app that is always there
   ----------------------------------------------------------------------------
   WHERE THIS MOUNTS IS THE WHOLE DESIGN. It is a sibling of <App/> in main.tsx,
   not a child of Layout, because App returns early three separate times — while
   the character is loading, when there is no character yet and setup is on
   screen, and behind ?d=1 for the new turn view. Anything living inside Layout
   is absent on all three. "Always available" has to mean *always*, including on
   the screens that are not the app proper, so the veil sits above the app
   rather than inside it.

   IT TAKES NO PROPS AND READS NO SETTINGS. There is nothing to pass it and
   nothing that could be passed to make it go away. It never consults the
   covenant, or the character, or a preference — a control that asks permission
   to exist is a control that is off on the night it is needed. This is the
   Slice 12 promise stated as code: the escape hatch cannot be switched off,
   because there is no switch.

   IT WRITES NOTHING DOWN. No count, no timestamp, no combat-log line, no
   "veiled" event on the reducer. Nobody has to explain afterwards, and there is
   no artefact for anyone to read later. If you are looking for the persistence
   call in this file: there isn't one, and that absence is load-bearing.

   IT IS NOT DISMISSED BY ACCIDENT. No Escape key, no click on the backdrop, no
   timer. Both of those are the standard way to close a modal and both are
   wrong here — a veil that a stray keypress or a fumbled tap can lift is a
   veil that lifts at exactly the wrong moment. The only way back is the one
   button that says so, and pressing one extra button costs nothing.
   ========================================================================== */
import { useState, useRef, useEffect, useCallback } from 'react'
import { EyeOff } from 'lucide-react'
import '../../design/tokens.css'
import './safety-d.css'

export function Veil() {
  const [veiled, setVeiled] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  const raise = useCallback(() => setVeiled(true), [])
  const lower = useCallback(() => setVeiled(false), [])

  useEffect(() => {
    if (!veiled) {
      // Focus comes home, so the keyboard is not stranded where the scene was.
      buttonRef.current?.focus({ preventScroll: true })
      return
    }
    // The only interactive thing on screen takes focus, and the page underneath
    // stops scrolling — a veiled table should not be able to move.
    backRef.current?.focus({ preventScroll: true })
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    /* FOCUS CANNOT LEAVE. Found by the proof, not by reading: tapping the
       backdrop blurred the button, and from there Tab walked straight into the
       app underneath — the veiled scene covering it visually while a keyboard
       or a screen reader carried on through the fight. `aria-modal` tells
       assistive tech the rest is inert; it does not make it so. There is
       exactly one thing to focus in here, so the trap is one line: anything
       that takes focus outside the scene gives it straight back. */
    const inScene = (node: unknown) =>
      node instanceof Node && !!sceneRef.current?.contains(node)

    // Tab, or anything else that moves focus TO a real element.
    const keepFocus = (e: FocusEvent) => {
      if (!inScene(e.target)) backRef.current?.focus({ preventScroll: true })
    }
    /* And the case the first fix missed, which is the one that actually
       happens: a tap on the backdrop is a tap on nothing focusable, so focus
       falls to <body> and no `focusin` fires at all. Only the LEAVING is
       observable. The refocus is deferred by a tick because a browser will not
       honour a focus() call made while it is still tearing the old one down. */
    const catchFall = (e: FocusEvent) => {
      if (!inScene(e.relatedTarget)) {
        setTimeout(() => { if (sceneRef.current) backRef.current?.focus({ preventScroll: true }) }, 0)
      }
    }
    document.addEventListener('focusin', keepFocus)
    document.addEventListener('focusout', catchFall)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('focusin', keepFocus)
      document.removeEventListener('focusout', catchFall)
    }
  }, [veiled])

  if (veiled) {
    return (
      <div ref={sceneRef} className="veil-scene" role="dialog" aria-modal="true" aria-label="The scene is veiled">
        <h2 className="vtitle">The scene is veiled</h2>
        <p className="vbody">
          We move past this one. Nothing more needs to be said about it, now or later.
        </p>
        <button ref={backRef} type="button" className="vback" onClick={lower}>
          Return to the table
        </button>
        <p className="vquiet">Nothing about this was recorded.</p>
      </div>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="veil-btn"
      onClick={raise}
      aria-label="Veil this scene"
      data-veil-control="always"
    >
      <EyeOff size={16} aria-hidden="true" />
      Veil
    </button>
  )
}
